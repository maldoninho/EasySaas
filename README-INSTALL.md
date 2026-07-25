# Instalação local — passo a passo

## 1. Requisitos

- Windows 10/11, Linux ou macOS.
- Node.js 24.12 ou superior dentro da série 24 LTS.
- PostgreSQL acessível.
- Internet no primeiro `pnpm install`.
- Aproximadamente 2 GB livres para dependências e builds.

Docker é opcional.

## 2. Extrair

Extraia o ZIP em um caminho curto, por exemplo:

```text
C:\Projetos\easysaas
```

ou:

```text
~/projetos/easysaas
```

## 3. PostgreSQL opcional com Docker

```bash
docker compose -f docker-compose.optional.yml up -d
```

O ambiente local padrão usa:

```text
Banco: easysaas
Usuário: easysaas
Senha: easysaas
Porta: 5432
```

Nunca use essa senha em produção.

## 4. Iniciar

Windows:

```bat
start.cmd
```

Linux/macOS:

```bash
chmod +x start.sh
./start.sh
```

O bootstrap:

1. diagnostica Node, Corepack, disco, permissões, portas e PostgreSQL;
2. cria `.env.local` e segredos aleatórios;
3. ativa a versão fixa do pnpm;
4. instala dependências;
5. valida contratos e estrutura;
6. executa migrations e seed;
7. inicia Web, API e Worker.

## 5. Primeiro proprietário

Abra:

```text
http://localhost:3000/setup
```

Abra `.env.local`, copie `SETUP_TOKEN` e preencha o formulário. O token é exigido somente no primeiro acesso e a operação é aceita apenas como acesso local.

Depois:

1. entre no App;
2. abra **Configurações da conta**;
3. ative MFA TOTP;
4. acesse `/admin`.

## 6. URLs

```text
Landing:    http://localhost:3000
Login:      http://localhost:3000/login
App:        http://localhost:3000/app
Admin:      http://localhost:3000/admin
Health:     http://localhost:4000/api/v1/health
Readiness:  http://localhost:4000/api/v1/ready
```

## 7. E-mail em desenvolvimento

Por padrão, `SMTP_MODE=file`. Os e-mails ficam em:

```text
runtime/mail-outbox/
```

Para SMTP real, altere `.env.local`.

## 8. Diagnóstico

```bash
pnpm doctor
pnpm validate
pnpm repair
```

Nunca compartilhe `.env.local`.

## Correção obrigatória de inicialização — Hotfix 1

Use Node.js 24 LTS. A versão recomendada e fixada é `24.18.0`.

```bash
nvm install 24.18.0
nvm use 24.18.0
```

Depois, a opção principal continua sendo:

- Windows: `start.cmd`
- Linux/macOS: `./start.sh`

Para diagnóstico manual:

```bash
pnpm packages:build
pnpm packages:check
pnpm ports:check
node scripts/ports.mjs
pnpm validate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Não encerre processos de portas automaticamente sem identificar o PID. Também é possível alterar `WEB_PORT`, `APP_URL`, `API_PORT` e `API_INTERNAL_URL` no `.env.local`.

## Inicialização única

Em Linux/WSL/macOS:

```bash
chmod +x start.sh
./start.sh
```

Também é válido executar `npm run dev` ou `pnpm dev`; ambos chamam o mesmo bootstrap automático. Não edite `.env.local` manualmente no primeiro início.
