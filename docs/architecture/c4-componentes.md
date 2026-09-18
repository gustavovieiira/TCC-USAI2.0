# C4 — Nível 3: Diagrama de Componentes

Dentro do container "Backend API": um módulo por domínio (`apps/backend/src/modules/<dominio>/`),
todos seguindo o mesmo padrão de camadas (`routes → controller → service → schemas/types`), mais a
camada `common/` (transversal) e o servidor de WebSocket.

```mermaid
C4Component
    title USAI — Diagrama de Componentes (Backend API)

    Container_Boundary(api, "Backend API (Node.js + Express)") {
        Component(auth, "Auth", "Router + Service", "Cadastro via link+PIN, login, refresh token, RBAC")
        Component(itens, "Itens", "Router + Service", "Catálogo: publicar, editar, remover, listar por condomínio")
        Component(locacoes, "Locações", "Router + Service", "Solicitar, aprovar/rejeitar, máquina de estados")
        Component(mensagens, "Mensagens", "Router + Service", "Chat vinculado a uma locação")
        Component(mural, "Mural", "Router + Service", "Feed de avisos/pedidos do condomínio, comentários públicos")
        Component(conversas, "Conversas", "Router + Service", "Chat privado 1:1 efêmero (7 dias) a partir do Mural")
        Component(saques, "Saques", "Router + Service", "Cálculo de saldo (dinâmico) e solicitação/aprovação de saque")
        Component(sindico, "Síndico", "Router + Service", "PIN e link do condomínio, moradores, locações ativas")
        Component(admin, "Admin", "Router + Service", "Condomínios, contas de síndico, resumo financeiro global")
        Component(common, "common/", "Middlewares", "authGuard (JWT+RBAC), errorHandler, logger (Winston), cliente Prisma singleton")
        Component(realtime, "realtime/socket.ts", "Socket.IO", "Salas locacao:<id> e conversa:<id>, reaproveita o JWT do REST")
    }

    ContainerDb(db, "MySQL", "MySQL 8 + Prisma ORM")
    System_Ext(asaas, "Asaas", "Gateway de pagamentos (planejado)")

    Rel(auth, common, "Usa")
    Rel(itens, common, "Usa")
    Rel(locacoes, common, "Usa")
    Rel(saques, common, "Usa")
    Rel(mural, common, "Usa")
    Rel(conversas, common, "Usa")

    Rel(auth, db, "Lê/escreve", "Prisma")
    Rel(itens, db, "Lê/escreve", "Prisma")
    Rel(locacoes, db, "Lê/escreve", "Prisma")
    Rel(mensagens, db, "Lê/escreve", "Prisma")
    Rel(mural, db, "Lê/escreve", "Prisma")
    Rel(conversas, db, "Lê/escreve", "Prisma")
    Rel(saques, db, "Lê/escreve", "Prisma")
    Rel(sindico, db, "Lê/escreve", "Prisma")
    Rel(admin, db, "Lê/escreve", "Prisma")

    Rel(realtime, mensagens, "Reaproveita verificarParticipante")
    Rel(realtime, conversas, "Reaproveita verificarParticipante")
    Rel(locacoes, asaas, "Cobrança e webhook de confirmação (planejado)", "REST/Webhook")
```

Ver [Nível 1 — Contexto](c4-contexto.md) e [Nível 2 — Containers](c4-containers.md).
