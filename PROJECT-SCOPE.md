# Escopo congelado

EasySaaS é uma base single-tenant instalada separadamente para cada empresa. Não inclui multi-tenancy, marketplace, billing, Kubernetes ou microserviços na V1.

## Superfícies

1. Landing pública configurável.
2. Autenticação completa.
3. App do usuário.
4. Administração integral.

## Navegação

Dashboard fixo, categorias no banco (`group`, `direct`, `index`), módulos em qualquer posição, conta no rodapé e conteúdo à direita. App e Admin compartilham o mesmo shell.

## Módulos

Pasta física estável, `module.json`, ponto único `module.ts`, rota visual derivada do banco, scaffold vazio, upload em quarentena, validação, versão candidata, ativação atômica e rollback.
