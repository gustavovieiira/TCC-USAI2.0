# C4 — Nível 1: Diagrama de Contexto

Visão de alto nível: quem usa a USAI e com quais sistemas externos ela conversa.

```mermaid
C4Context
    title USAI — Diagrama de Contexto

    Person(morador, "Morador", "Anuncia, solicita e aluga itens dentro do condomínio")
    Person(sindico, "Síndico", "Gerencia acesso e visibilidade das locações do condomínio")
    Person(admin, "Admin USAI", "Controla o financeiro global e os condomínios cadastrados")

    System(usai, "USAI", "Plataforma web de locação de itens ociosos entre moradores de condomínio")

    System_Ext(asaas, "Asaas", "Gateway de pagamentos: cobrança PIX/checkout e webhooks")

    Rel(morador, usai, "Usa", "HTTPS")
    Rel(sindico, usai, "Usa", "HTTPS")
    Rel(admin, usai, "Usa", "HTTPS")
    Rel(usai, asaas, "Gera cobranças e recebe confirmação de pagamento", "REST/Webhook")
```

Ver também [Nível 2 — Containers](c4-containers.md) e [Nível 3 — Componentes](c4-componentes.md).
