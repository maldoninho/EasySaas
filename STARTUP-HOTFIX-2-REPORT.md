# Hotfix de inicialização 2

## Correções

- packageManager atualizado para pnpm 11.15.1.
- validação estrutural sincronizada com pnpm 11.15.1.
- `pnpm-workspace.yaml` reescrito sem chaves duplicadas.
- lifecycle build de `sharp` explicitamente autorizado, além de `argon2` e `esbuild`.
- `@types/unzipper` adicionado ao pacote de validação.
- carregamento de Ajv corrigido para TypeScript 6 + NodeNext.
- `start.sh` tenta reutilizar automaticamente o Node 24.18.0 já instalado pelo NVM.

## Uso esperado no WSL

Em uma pasta nova, execute apenas:

```bash
./start.sh
```

O bootstrap ativa o pnpm correto, instala dependências, compila packages, valida, executa migrations e seed e inicia Web/API/Worker.
