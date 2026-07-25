# Startup Hotfix 5 — Typecheck real da API

## Defeito corrigido

O bootstrap 1.0.4 chegou corretamente à validação real do workspace, mas o typecheck da API falhou porque o callback global de erros do Fastify recebe `error` como `unknown` sob TypeScript estrito. O código acessava `statusCode` e `message` diretamente.

## Correção aplicada

- tratamento explícito de `unknown` no error handler;
- normalização segura de `statusCode`, `code` e mensagem pública;
- preservação de detalhes apenas para `HttpError` conhecido;
- nenhum uso de `any`;
- manutenção da resposta genérica para erros internos;
- versão elevada para 1.0.5.

## Resultado esperado

Todos os packages já compilavam no WSL do ambiente de homologação. Com esta correção, `apps/api typecheck` deixa de acessar propriedades de um valor `unknown`, permitindo que o bootstrap avance para migrations, seed e início dos serviços.
