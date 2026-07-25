# EasySaaS 1.0

Base empresarial **single-tenant**: cada instalação atende uma empresa, com banco, arquivos, usuários, configurações e módulos próprios.

## Componentes incluídos

- Landing pública configurável e versionada.
- Autenticação por convite, recuperação de senha e sessões opacas.
- App e Admin usando o mesmo `ApplicationShell`.
- Usuários, papéis, permissões e proteção do último proprietário.
- Categorias reordenáveis e módulos transferíveis entre categorias.
- Criação de módulo vazio, manifesto, quarentena, validação, versões, ativação e rollback.
- PostgreSQL, fila de jobs, SMTP ou caixa de saída local, armazenamento local controlado.
- Auditoria, health/readiness, backup, scripts multiplataforma e documentação operacional.

## Stack fixada

- Node.js 24.12+ LTS
- TypeScript 6.0.3 em modo estrito
- Next.js 16.2.11
- React 19.2.6
- Fastify 5.8.5
- PostgreSQL 18
- pnpm 11.15.1

## Início rápido

1. Leia [`README-INSTALL.md`](README-INSTALL.md).
2. Prepare um PostgreSQL ou suba o banco local com `docker compose -f docker-compose.optional.yml up -d`.
3. Execute `start.cmd` no Windows ou `./start.sh` no Linux/macOS.
4. Após o seed, abra `http://localhost:3000/primeiro-acesso` para ver o superusuário padrão local e entrar.

### Login padrão local

```text
Primeiro acesso: http://localhost:3000/primeiro-acesso
Login:  superadmin
E-mail: superadmin@local.easysaas
Senha:  TrocarSenha!2026
```

Esses valores podem ser alterados antes do primeiro seed em `.env.local` pelas variáveis `EASYSAAS_SUPERADMIN_EMAIL`, `EASYSAAS_SUPERADMIN_NAME` e `EASYSAAS_SUPERADMIN_PASSWORD`.

## Estrutura

```text
apps/web       Landing, autenticação, App e Admin
apps/api       API Fastify, autenticação, políticas e administração
apps/worker    E-mails, deploy de módulos, arquivamento e backups
packages/*     Core, contratos, segurança, banco, providers e SDK
modules/*      Código-fonte ativo dos módulos
runtime/*      Staging, versões, builds, arquivos, backups e logs
standards/*    Regras obrigatórias para humanos e IAs
```

## Comandos

```bash
pnpm bootstrap       # prepara, migra e inicia
pnpm dev             # Web, API e Worker
pnpm validate        # estrutura, contratos, scripts e testes disponíveis
pnpm doctor          # diagnóstico do ambiente
pnpm repair          # cria diretórios, .env.local e segredos ausentes
pnpm build           # build de produção
pnpm backup          # solicita backup pelo worker
```

## Estado de produção

O código está estruturado para implantação, mas a aprovação da instalação depende do teste no ambiente real: PostgreSQL, SMTP, domínio, HTTPS, `pg_dump`, permissões, backup/restauração e build com o lockfile gerado. Consulte [`VALIDATION-REPORT.md`](VALIDATION-REPORT.md).
