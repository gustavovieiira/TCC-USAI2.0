# USAI em produção

Um servidor (DigitalOcean, Ubuntu 22.04, 2 GB de RAM) roda tudo com Docker Compose. Domínio: `usainet.com.br`.

```
internet ── 80/443 ──> Caddy (HTTPS automático)
                         ├── /api, /uploads, /socket.io ──> backend (Node) ──> MySQL
                         ├── resto ────────────────────────> frontend (nginx com CSP)
                         └── monitor.usainet.com.br ───────> Grafana ──> Prometheus ─┬─> backend /metrics
                                                                                  ├─> node-exporter (o servidor)
                                                                                  └─> cAdvisor (cada contêiner)
```

Só o Caddy abre portas. MySQL, backend, Prometheus, node-exporter, cAdvisor e `/metrics` ficam na rede interna do Docker.

## Entrega automática (CD)

`.github/workflows/deploy.yml`: quando o CI passa na `main`, o GitHub Actions monta as imagens do backend e do front,
publica em `ghcr.io/gustavovieiira/usai-*` (tag do commit e `latest`), envia esta pasta para `/opt/usai/infra` no servidor
e roda `docker compose up -d --wait`. O serviço `migrar` aplica as migrações do banco antes de o backend subir.

Segredos do repositório (Settings > Secrets and variables > Actions): `DEPLOY_HOST`, `DEPLOY_USER` (`deploy`),
`DEPLOY_SSH_KEY` (chave privada só do CI) e `DEPLOY_KNOWN_HOSTS` (impressão digital do servidor).

## Primeira vez no servidor

1. DNS no Registro.br: registros `A` de `usainet.com.br`, `www` e `monitor` para o IP do servidor.
2. Docker instalado, usuário `deploy` no grupo `docker`, pasta `/opt/usai` dele, firewall com 22, 80 e 443.
3. `/opt/usai/infra/producao/.env` criado a partir de `.env.example` (segredos aleatórios, nunca no Git).
4. Um deploy (merge na `main` ou Actions > Deploy > Run workflow).

## Operação

```bash
cd /opt/usai/infra/producao
docker compose ps                      # situação
docker compose logs -f backend         # logs
docker compose up -d                   # reaplica
# Voltar uma versão: troque USAI_TAG no .env pelo commit anterior e rode `docker compose up -d`.
```

## Monitoramento (Grafana em https://monitor.usainet.com.br)

Quatro painéis em português, todos com um texto de ajuda no topo e uma descrição ("i") em cada gráfico (o que mede, o que é normal e
o que fazer quando fica amarelo ou vermelho). Abrem na **Visão geral**; o menu "Painéis da USAI" leva aos outros.

| Painel | Para que serve |
|---|---|
| **Visão geral** | Tela de abertura: está no ar? o servidor aguenta? há erros? |
| **Servidor (infraestrutura)** | CPU, carga, memória, swap, disco (e previsão de espaço), I/O, rede e mortes por falta de memória |
| **Contêineres** | Memória (em % do teto), CPU, rede, reinícios e tempo ligado de cada parte do sistema |
| **API (backend)** | Requisições, erros 5xx, velocidade (p50, p95, p99), acessos negados (401/403), bloqueios (429) e saúde do Node.js |

Os dados vêm de `prometheus.yml` (esta pasta): o backend, o **node-exporter** (lê o `/proc` e o `/sys` da máquina) e o **cAdvisor**
(lê os cgroups e o Docker). Os painéis ficam em `infra/grafana/dashboards/` e são carregados sozinhos a cada deploy. Para entrar:
usuário `admin` e a senha `GRAFANA_ADMIN_PASSWORD` do `.env`.

Cuidados que aprendemos ao montar isso: o cAdvisor precisa de `cgroup: host` (com cgroup v2 ele só enxerga o próprio espaço) e de uma
versão recente (a 0.49 não lista os contêineres do Docker 29, a 0.60 lista); e a rede do **servidor** (a placa da máquina) não é lida pelo
node-exporter em contêiner sem rede do host, então o tráfego mostrado é a soma dos contêineres.

Backup (`backup.sh`): banco e fotos, diário, guarda 7 dias em `/opt/usai/backups`. Instalação no cron do `deploy`:

```bash
( crontab -l 2>/dev/null; echo '30 3 * * * /opt/usai/infra/producao/backup.sh >> /opt/usai/backups/backup.log 2>&1' ) | crontab -
```

Restaurar o banco: `gunzip -c usai-banco-AAAA-MM-DD-HHMM.sql.gz | docker compose exec -T -e MYSQL_PWD=... mysql mysql -uroot usai`.
