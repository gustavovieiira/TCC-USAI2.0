# USAI 2.0

Plataforma web para compartilhamento e locação de itens ociosos entre moradores de condomínios
residenciais. Projeto de Portfólio (TCC) — Engenharia de Software, Católica SC.

## O problema

Hoje o empréstimo e locação de itens entre vizinhos de condomínio acontece de forma informal, via
grupos de WhatsApp: sem catálogo, sem histórico, sem controle de pagamento. A USAI organiza esse ciclo
inteiro — anúncio, solicitação, aprovação, pagamento, acompanhamento e devolução — dentro de um ambiente
privado por condomínio.

## Perfis de usuário

- **Morador** — anuncia, solicita e aluga itens dentro do próprio condomínio.
- **Síndico** — gerencia o link de acesso e o PIN do condomínio, acompanha as locações ativas.
- **Admin USAI** — controla o financeiro global da plataforma, aprova/rejeita saques, gerencia os
  condomínios cadastrados.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | MySQL + Prisma ORM |
| Autenticação | JWT (access + refresh) + bcrypt |
| Pagamentos | Asaas (PIX/checkout) |
| Infraestrutura | Docker + Docker Compose + Nginx |
| CI/CD | GitHub Actions |
| Observabilidade | Prometheus + Grafana |
| Testes | Jest + Supertest (backend) · Vitest + Testing Library (frontend) |

## Estrutura do repositório

```
apps/
  backend/     # API REST (Express + Prisma)
  frontend/    # SPA (React + Vite)
docs/
  architecture/  # Diagramas C4
  adr/           # Decisões técnicas
```

## Rodando localmente

Pré-requisitos: Node.js 20+, Docker e Docker Compose.

```bash
cp .env.example .env
docker compose up -d
```

- API: http://localhost:3000
- Frontend: http://localhost:5173

Veja o guia completo em [docs/deploy.md](docs/deploy.md) *(em construção)*.

## Documentação

A documentação de arquitetura, requisitos e decisões técnicas vive na
[Wiki deste repositório](../../wiki).

## Status

Em desenvolvimento — Portfólio 2026/2, entrega prevista para 30/11/2026.
