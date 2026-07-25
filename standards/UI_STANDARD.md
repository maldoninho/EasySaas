# UI Standard

## Estrutura

App e Admin usam o mesmo `ApplicationShell`:

```text
Sidebar + Navigation + ContentArea + UserAccount
```

## Regras

- Dashboard fixo no topo.
- Usuário fixo no rodapé da sidebar.
- Clique no usuário abre configurações da conta.
- Sidebar responsiva: fixa no desktop, recolhível no tablet, overlay no mobile.
- Nenhuma tela final pode ser vazia, fictícia ou apenas estrutural.

## Estados obrigatórios

Toda tela com dados assíncronos deve prever:

- loading;
- vazio;
- erro;
- sucesso;
- permissão negada;
- indisponibilidade temporária quando aplicável.

## Acessibilidade

- Navegação por teclado.
- Foco visível.
- Labels associados aos campos.
- Contraste adequado.
- Mensagens de erro vinculadas aos campos.
