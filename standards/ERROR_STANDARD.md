# Error Standard

## Objetivos

- Mensagens úteis ao usuário.
- Detalhes técnicos apenas em logs protegidos.
- Códigos de erro estáveis.
- Correlação por `request_id`.

## Formato de API

```json
{
  "error": {
    "code": "MODULE_VALIDATION_FAILED",
    "message": "O módulo não passou na validação.",
    "requestId": "uuid"
  }
}
```

## Regras

- Nunca retornar stack trace ao cliente em produção.
- Nunca incluir senha, token, segredo ou SQL sensível.
- Erros de autenticação devem evitar enumeração de contas.
- Erros de validação devem apontar campos sem revelar detalhes internos perigosos.
