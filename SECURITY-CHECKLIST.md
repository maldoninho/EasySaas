# Checklist de segurança

## Antes de publicar

- [ ] PostgreSQL não usa credenciais do exemplo.
- [ ] `.env.local` está fora do Git e com permissão restrita.
- [ ] `SESSION_SECRET`, `ENCRYPTION_KEY` e `SETUP_TOKEN` são aleatórios.
- [ ] `COOKIE_SECURE=true` sob HTTPS.
- [ ] API não está exposta diretamente.
- [ ] MFA foi configurado para todos os administradores.
- [ ] Cadastro público permanece desativado quando não necessário.
- [ ] SMTP e domínio de envio foram validados.
- [ ] Backup externo e restauração foram testados.
- [ ] `pnpm-lock.yaml` foi gerado, revisado e congelado.
- [ ] Dependências passaram por auditoria de vulnerabilidades.
- [ ] `pnpm validate`, typecheck, testes e build passaram no ambiente final.
- [ ] Política de retenção de logs, auditoria e arquivos foi definida.
- [ ] Reverse proxy aplica HTTPS, limites de requisição e cabeçalhos de borda.

## Controles implementados

- Argon2id para senhas.
- Tokens de uso único armazenados por hash.
- Sessões opacas server-side e revogáveis.
- CSRF por cookie + cabeçalho + hash da sessão.
- Cookies HttpOnly/SameSite e `__Host-` em produção.
- Rate limiting de autenticação e setup.
- MFA TOTP e códigos de recuperação.
- RBAC com autorização server-side.
- Reautenticação por senha para conceder Proprietário ou Super Admin.
- Política configurável de CAPTCHA, sessão única, TTL e MFA administrativo.
- Proteção do último proprietário.
- Auditoria de ações críticas.
- Upload temporário, inspeção de ZIP e bloqueio de path traversal/symlink.
- Versionamento e rollback de módulos.
- Queries parametrizadas no Core.
- Segredos fora do frontend.
