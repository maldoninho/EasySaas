# Changelog

## 1.0.5 — Startup Hotfix 5

- Corrige TS18046 no error handler global da API.
- Trata erros Fastify como `unknown` de forma segura e estrita.
- Mantém mensagens internas ocultas em respostas HTTP 5xx.

## 1.0.4 — Inicialização realmente automática

- `npm run dev`, `pnpm dev` e `./start.sh` agora executam o mesmo bootstrap completo.
- O bootstrap cria e normaliza `.env.local` antes da validação de pré-início.
- Removida a recursão entre `bootstrap` e `dev`.
- Adicionados comandos internos `dev:direct` e `start:direct`, usados apenas pelo bootstrap.
- O primeiro início continua a instalar dependências, compilar packages, validar, migrar, aplicar seed e iniciar os serviços sem edição manual.

## 1.0.3 — Startup Hotfix 3

- Corrige TS2351 no carregamento do Ajv em `@easysaas/validation`.
- Fixa Ajv em 8.17.1.
- Move configurações do pnpm para `pnpm-workspace.yaml`.
- Remove avisos de configurações pnpm lidas pelo npm.

## 1.0.0 — 2026-07-24

- Base single-tenant completa.
- Landing configurável.
- Autenticação, sessões e RBAC.
- App/Admin compartilhando o mesmo shell.
- Categorias e engine de módulos versionados.
- Worker, providers, auditoria, backups e scripts multiplataforma.

## 1.0.1-startup-hotfix

- Corrige tipos Node no TypeScript 6.
- Compila packages antes de migrations e desenvolvimento.
- Verifica artefatos `dist` obrigatórios.
- Respeita `WEB_HOST` e `WEB_PORT` no Web.
- Adiciona diagnóstico de portas.
- Declara builds permitidos do pnpm 11.
- Atualiza runtime recomendado para Node.js 24.18.0 LTS.
## 1.0.2

- Corrigido pnpm fixado e allowBuilds para sharp.
- Corrigidos tipos de unzipper e importação do Ajv no validador.
- Corrigido start.sh para reutilizar Node 24 via NVM.
