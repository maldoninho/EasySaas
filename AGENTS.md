# AGENTS.md — Regras canônicas do EasySaaS

Este arquivo é a fonte oficial para qualquer IA, agente ou desenvolvedor humano que altere o projeto.

## 1. Objetivo

Construir uma base SaaS single-tenant, modular, segura, simples de operar e fácil de manter por humanos e IAs.

## 2. Regras obrigatórias

1. Não alterar o Core para implementar uma funcionalidade de produto.
2. Não criar arquivos fora da área autorizada da tarefa.
3. Não duplicar lógica entre App e Admin; reutilizar o `ApplicationShell`.
4. Não editar o menu manualmente dentro dos módulos.
5. Não criar rotas visuais fixas dentro dos módulos.
6. Não importar internals de outro módulo.
7. Não usar `any`, `eval`, `new Function` ou execução dinâmica de código.
8. Não confiar no frontend para autenticação ou autorização.
9. Não colocar segredos no navegador, logs ou repositório.
10. Não declarar conclusão sem testes e critérios de aceite verificáveis.
11. Não criar telas vazias, páginas fictícias ou placeholders como entrega final.
12. Não introduzir microserviços, Redis obrigatório, Kubernetes ou multi-tenancy sem decisão arquitetural explícita.

## 3. Ordem obrigatória de leitura

1. `standards/ARCHITECTURE_STANDARD.md`
2. `standards/SECURITY_STANDARD.md`
3. `standards/MODULE_STANDARD.md`
4. `standards/DATABASE_STANDARD.md`
5. `standards/API_STANDARD.md`
6. `standards/UI_STANDARD.md`
7. `standards/TEST_STANDARD.md`
8. `standards/ERROR_STANDARD.md`
9. `standards/AI_IMPLEMENTATION_STANDARD.md`

## 4. Definição de concluído

Uma tarefa somente está concluída quando:

- compila;
- passa no lint;
- passa nos testes aplicáveis;
- possui estados de loading, vazio, erro e sucesso quando houver interface;
- possui validação de entrada;
- possui autorização server-side;
- não quebra Windows, Linux ou macOS;
- não viola os contratos centrais;
- atualiza documentação quando necessário;
- apresenta evidências objetivas de verificação.
