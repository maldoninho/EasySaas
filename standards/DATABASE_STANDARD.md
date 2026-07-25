# Database Standard

## Banco

PostgreSQL é o banco oficial.

## Convenções

- Tabelas e colunas em `snake_case`.
- Chaves primárias com UUID.
- `created_at` e `updated_at` em registros mutáveis.
- Índices e constraints explícitos.
- Toda mudança de schema ocorre por migration.

## Core

Módulos não podem alterar tabelas protegidas do Core.

## Módulos

Tabelas de módulos usam prefixo:

```text
mod_<stable_id_normalizado>_<table>
```

Exemplo:

```text
mod_article_generator_documents
```

## Transações

Operações que alteram mais de uma entidade relacionada devem ser transacionais.

## Exclusão

Exclusão de módulo não apaga dados automaticamente. Remoção de dados requer migration e confirmação explícita.
