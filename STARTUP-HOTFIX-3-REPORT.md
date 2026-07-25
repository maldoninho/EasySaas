# EasySaaS — Startup Hotfix 3

## Falha corrigida

O package `@easysaas/validation` não compilava no TypeScript 6 com `moduleResolution: NodeNext` porque o `default` export do Ajv era inferido como um namespace sem assinatura construtora.

## Correção implementada

- Removido o `await import("ajv").default`.
- Adicionado carregador explícito via `createRequire(import.meta.url)`.
- O carregador aceita tanto exportação CommonJS direta quanto objeto com `default`.
- O construtor usa contrato TypeScript local estrito, sem `any`.
- Ajv fixado em `8.17.1` para impedir deriva de versão durante a instalação.
- Configurações exclusivas do pnpm foram movidas de `.npmrc` para `pnpm-workspace.yaml`, eliminando os avisos do npm.
- Versão do projeto elevada para `1.0.3`.

## Uso esperado

No WSL Ubuntu, a partir de uma pasta nova:

```bash
chmod +x start.sh
./start.sh
```

Também permanece compatível com:

```bash
npm run dev
```

## Limitação da validação do ambiente de geração

O ambiente de geração não possui acesso ao registro npm, portanto não foi possível baixar as dependências reais e executar o build completo. Foram executadas validações de estrutura, JSON, YAML, sintaxe dos scripts, análise estática do código alterado e integridade do ZIP. A correção remove diretamente a expressão que gerava o erro TS2351 observado no WSL.
