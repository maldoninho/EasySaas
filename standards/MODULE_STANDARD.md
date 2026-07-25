# Module Standard

## Identidade

Cada módulo possui um `stableId` imutável em kebab-case.

Exemplo:

```text
article-generator
```

Nome visual, categoria, posição, ícone e slug ficam no banco e podem mudar sem alterar o `stableId`.

## Estrutura mínima

```text
modules/<stable-id>/
├── module.json
├── module.ts
├── view.tsx
├── module.test.ts
└── AGENTS.md
```

Arquivos adicionais só existem quando necessários.

## Entrada única

`module.ts` é a única interface pública do módulo. O Core nunca importa arquivos internos diretamente.

## Rotas

O módulo não declara rota visual fixa. O Core resolve a rota usando os metadados do banco.

## Manifesto

`module.json` deve validar contra `packages/contracts/src/module.schema.json`.

## Segurança

- Sem `eval` ou `new Function`.
- Sem acesso direto ao filesystem fora do diretório permitido.
- Sem leitura irrestrita de `process.env`.
- Sem alteração de tabelas do Core.
- Sem importação de internals de outro módulo.
- Sem instalação livre de dependências em produção.

## Ciclo de vida

```text
SCAFFOLDED → FILES_LOADED → VALIDATING → VALIDATED → READY → ACTIVE
                                      ↘ FAILED
ACTIVE → INACTIVE | MAINTENANCE | INVALID
```

## Atualização

Nova versão é validada em staging. A versão atual permanece ativa até a promoção atômica da candidata.
