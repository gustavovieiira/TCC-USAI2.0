# C4 — Nível 2: Diagrama de Containers

Como a USAI é dividida por dentro: uma SPA, uma API que também fala WebSocket, um banco relacional e
a stack de observabilidade — tudo orquestrado via Docker Compose.

```mermaid
C4Container
    title USAI — Diagrama de Containers

    Person(morador, "Morador / Síndico / Admin")

    System_Boundary(usai, "USAI") {
        Container(spa, "Frontend SPA", "React + Vite + TypeScript + Tailwind", "Catálogo, locações, mural, conversas, saques, perfil e painéis de síndico/admin")
        Container(api, "Backend API", "Node.js + Express + TypeScript", "REST (auth, itens, locações, mensagens, mural, conversas, saques, síndico, admin) + WebSocket (Socket.IO) no mesmo processo")
        ContainerDb(db, "MySQL", "MySQL 8 + Prisma ORM", "Condominios, Users, Itens, Locacoes, Mensagens, Post, ComentarioPost, ConversaPrivada, MensagemPrivada, SolicitacaoSaque, LogAuditoria")
        Container(prom, "Prometheus", "Prometheus", "Coleta métricas HTTP expostas em /metrics")
        Container(graf, "Grafana", "Grafana", "Dashboards sobre as métricas do Prometheus")
    }

    System_Ext(asaas, "Asaas", "Gateway de pagamentos (planejado)")

    Rel(morador, spa, "Usa", "HTTPS")
    Rel(spa, api, "Consome API REST e conecta ao WebSocket", "JSON / WebSocket, JWT")
    Rel(api, db, "Lê e escreve", "Prisma / SQL")
    Rel(prom, api, "Coleta métricas", "GET /metrics")
    Rel(graf, prom, "Consulta métricas", "PromQL")
    Rel(api, asaas, "Cobrança e webhook de confirmação (planejado)", "REST/Webhook")
```

Ver [Nível 1 — Contexto](c4-contexto.md) e [Nível 3 — Componentes](c4-componentes.md).
