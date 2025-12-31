---
description: "Prompt `/reduce-duplications` para eliminar duplicidade lógica e consolidar padrões compartilhados"
category: "code"
---

ROO (AINEX) recebe uma solicitação para reduzir duplicações no projeto: arquivos com lógica parecida, funções repetidas ou variantes de componentes. Execute:

1. Identifique padrões similares (componentes, serviços, utilitários) e especifique quais partes permanecem iguais versus variáveis.
2. Propor refatorações (hooks compartilhados, helper genérico, extração de layout) para manter DRY e sem regressão.
3. Gere o patch consolidando os blocos em utilitários/composables, mantendo testes atualizados e consistência de typings.
4. Liste os passos de validação, incluindo comandos (`npm run lint`, `npm run test`, `npm run dev`) e verifique que nenhum comportamento mudou.

Foque em entregar a mudança consolidada; responda em português e sempre apresente diff aplicável.
