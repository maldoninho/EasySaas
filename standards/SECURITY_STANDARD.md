# Security Standard

## Princípios

- Defesa em profundidade.
- Menor privilégio.
- Negar por padrão.
- Autorização sempre no servidor.
- Segredos nunca no frontend.
- Auditoria de ações críticas.

## Autenticação

- E-mail confirmado obrigatoriamente.
- Argon2id para senhas.
- Sessões opacas no servidor.
- Cookies `HttpOnly`, `Secure`, `SameSite` e prefixo `__Host-` em produção.
- Uma sessão ativa por usuário como padrão configurável.
- Tokens de verificação e recuperação de uso único, expiráveis e armazenados por hash.

## Aplicação

- CSRF, CSP com nonce, CORS restritivo e validação runtime.
- Limites de payload e upload.
- Sanitização de dados exibidos.
- Proteção contra SSRF.
- Uploads fora do webroot.
- Logs sem segredos, senhas ou tokens.

## Módulos

Todo upload entra em quarentena, passa por inspeção estática, build e testes isolados. Código reprovado não é instalado.

## Administração

- Reautenticação para ações críticas.
- Proteção do último proprietário.
- Confirmação reforçada para exclusões e mudanças de segurança.
