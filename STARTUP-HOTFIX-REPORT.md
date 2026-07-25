# EasySaaS — Hotfix de inicialização 1

## Motivo

A entrega anterior foi disponibilizada sem um build real com as dependências oficiais. O primeiro teste encontrou bloqueios que a validação estática com stubs não detectou. Esta falha de classificação foi corrigida neste pacote.

## Correções aplicadas

1. `tsconfig.base.json` agora inclui `types: ["node"]` para o TypeScript 6 reconhecer as APIs e os globais do Node.
2. Os packages compartilhados são compilados antes de migrations e antes do modo de desenvolvimento.
3. A inicialização verifica se todos os `dist/index.js` obrigatórios realmente existem.
4. `WEB_PORT` e `WEB_HOST` passam a ser respeitados pelo Next.js; a porta 3000 deixou de estar fixa no `package.json` do Web.
5. As portas 3000 e 4000 são verificadas imediatamente antes da inicialização.
6. Foi adicionado `pnpm ports:check` e `node scripts/ports.mjs` para localizar processos que ocupam as portas sem encerrá-los automaticamente.
7. `pnpm-workspace.yaml` autoriza explicitamente somente os lifecycle builds necessários de `argon2` e `esbuild` no pnpm 11.
8. `.nvmrc` e `.node-version` foram atualizados para Node.js 24.18.0 LTS.
9. O bootstrap agora segue a ordem: instalar → gerar registry → compilar packages → verificar dist → validar → migrar → seed → verificar portas → iniciar.

## Ordem de execução

```bash
nvm install 24.18.0
nvm use 24.18.0
pnpm install
pnpm packages:build
pnpm validate
pnpm db:migrate
pnpm db:seed
pnpm ports:check
pnpm dev
```

Também é possível executar apenas `start.cmd` no Windows ou `./start.sh` no Linux/macOS; o bootstrap executa a sequência automaticamente.

## Limite de validação deste hotfix

O ambiente de geração continua sem acesso ao registro npm. Portanto, a sintaxe, a estrutura e os testes locais foram executados, mas o build real com dependências baixadas continua exigindo uma máquina com Node.js 24 LTS, pnpm e acesso ao registro.
