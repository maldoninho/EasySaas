# API Standard

## Base

```text
/api/v1
```

## Convenções

- JSON como formato padrão.
- Schemas de entrada e saída obrigatórios.
- Validação runtime em todas as fronteiras.
- Erros com código estável e mensagem segura.
- Paginação em listagens potencialmente grandes.
- Idempotência em operações críticas.
- `request_id` em todas as requisições.

## Autorização

Toda rota protegida chama o Policy Engine no servidor.

## Módulos

Rotas de módulo são registradas pelo contrato público do módulo, nunca por importação direta de arquivos internos.
