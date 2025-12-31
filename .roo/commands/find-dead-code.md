---
description: "Prompt `/find-dead-code` para detectar código legado/dormant que pode ser removido sem quebrar o fluxo"
category: "code"
---

Como ROO (AINEX), receba um módulo ou área suspeita de ter código morto (fragments não utilizados, componentes não montados, rotas sem invocação). Proceda assim:

1. Investigue imports, exports e uso efetivo em frontend/backend para identificar funções não referenciadas ou dados nunca lidos.
2. Verifique testes, rotas e hooks relacionados para certificar a ausência de dependências.
3. Gera um plano de remoção: descreva o trecho que pode sumir, o impacto esperado, os testes a serem executados.
4. Aplique o patch que elimina o código morto e atualize docstrings/imports. Liste comandos/flags para garantir que nada deixou de ser executado após a remoção (`npm run lint`, `npm run test`, `npm run dev -- --watch` com logs).

Use resposta em português, com foco em entregar a limpeza solicitada em diff; não explique o comando em si.
