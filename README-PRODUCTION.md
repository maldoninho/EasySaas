# Implantação em produção

## Referência

- VPS Linux atualizada.
- Caddy ou outro reverse proxy com HTTPS.
- PostgreSQL próprio ou serviço gerenciado.
- Processos Web, API e Worker sob systemd ou gerenciador equivalente.
- Docker opcional, não obrigatório.

## Pré-requisitos obrigatórios

1. Gerar e revisar `pnpm-lock.yaml` em ambiente conectado.
2. Definir `NODE_ENV=production`.
3. Usar `COOKIE_SECURE=true` e não definir `COOKIE_DOMAIN` para cookies `__Host-`.
4. Substituir credenciais locais do PostgreSQL.
5. Configurar SMTP real.
6. Manter API em endereço interno; expor ao público apenas o Next/reverse proxy.
7. Instalar `pg_dump` compatível com o PostgreSQL.
8. Configurar backup externo e testar restauração.
9. Restringir permissões do usuário do sistema e dos diretórios `runtime` e `.env.local`.

## Build

```bash
node scripts/bootstrap.mjs --production --no-start
```

Produção é bloqueada sem `pnpm-lock.yaml`.

Depois:

```bash
pnpm start
```

## Reverse proxy

Encaminhe o domínio para a porta 3000. A Web encaminha `/api/*` para a API interna. Não exponha a porta 4000 diretamente à internet.

## Atualização

1. Backup completo.
2. Colocar em manutenção quando necessário.
3. Instalar dependências com lockfile congelado.
4. Executar `pnpm validate`.
5. Executar migrations.
6. Fazer build.
7. Reiniciar processos.
8. Conferir health/readiness e fluxos críticos.
9. Reverter a versão da aplicação e restaurar banco apenas conforme o plano de rollback testado.

## Backups

O worker cria backup em `runtime/backups/` usando `pg_dump`, módulo-store e storage local. Copie backups para destino externo criptografado; o disco da própria VPS não é destino suficiente.

## Segurança de módulos

Uploads entram em staging, têm caminhos e manifesto inspecionados, passam por validação estática e só viram versão candidata. A ativação recompila a Web e preserva a versão anterior. Código de módulo deve ser tratado como código confiável da empresa; a validação reduz risco, mas não transforma JavaScript em sandbox perfeita.
