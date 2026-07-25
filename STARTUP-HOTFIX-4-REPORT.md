# Startup Hotfix 4

## Falha corrigida

A versão 1.0.3 permitia iniciar pelo `start.sh`, mas `npm run dev` pulava o bootstrap e executava diretamente a verificação de pré-início. Em uma instalação nova, isso fazia o Doctor reprovar porque `.env.local` ainda não existia.

## Correção

Todos os pontos de entrada públicos agora convergem para `scripts/bootstrap.mjs`:

- `npm run dev`
- `pnpm dev`
- `./start.sh`
- `start.cmd`

O bootstrap executa, na ordem:

1. diagnóstico de pré-instalação;
2. reparo automático e criação segura do `.env.local`;
3. ativação do pnpm fixado;
4. instalação das dependências;
5. registro de módulos;
6. compilação dos packages;
7. validações;
8. migrations;
9. seed;
10. diagnóstico de pré-início;
11. inicialização direta de Web, API e Worker.

## Proteção contra recursão

O bootstrap não chama novamente `pnpm dev` ou `pnpm start`. Ele chama os comandos internos `dev:direct` e `start:direct`.

## Validação realizada neste ambiente

- JSON do `package.json` válido;
- sintaxe dos scripts Node validada;
- ausência de recursão entre bootstrap e comandos públicos confirmada;
- sequência de criação do `.env.local` anterior ao Doctor de pré-início confirmada;
- arquivo ZIP e checksum SHA-256 gerados.

O build completo com dependências reais continua dependente do ambiente do utilizador. Entretanto, o log do WSL já confirmou que todos os packages, incluindo `@easysaas/validation`, compilam na versão 1.0.3; o Hotfix 4 altera apenas a orquestração de inicialização.
