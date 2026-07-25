# Architecture Standard

## Modelo

- Single-tenant: uma instalação por empresa.
- Monólito modular.
- Um repositório, uma versão e um ciclo de implantação.
- Processos permitidos na V1: Web, API e Worker opcional.

## Camadas

```text
UI → route/controller → service → repository → database
```

Nenhuma camada pode pular diretamente para uma camada inferior sem contrato explícito.

## Dependências

- O Core não importa módulos de produto.
- Módulos dependem somente de contratos públicos do Core.
- Módulos não importam internals de outros módulos.
- UI compartilhada pertence a `packages/ui`.
- Contratos compartilhados pertencem a `packages/contracts`.

## Estrutura alvo

```text
apps/web
apps/api
apps/worker
packages/core
packages/auth
packages/policy
packages/database
packages/contracts
packages/module-sdk
packages/ui
modules/*
```

## Decisões fixas

- TypeScript estrito.
- PostgreSQL.
- `pnpm`.
- Next.js e Fastify.
- Docker opcional.
- Linux VPS como referência oficial de produção.
