## Comandos Utilizados
* ler arquivos: read_file
* editar arquivos: write_to_file
* usar navegador: browser_action
* executar comandos: execute_command
* usar MCP: MCP commands
* busca semantica: codebase_search
* mapear repositório: list_files
* novo comando: new_task
* executar comando slash: run_slash_command
* atualizar lista de tarefas: update_todo_list
* alternar modo: switch_mode
* buscar arquivos: search_files
* ler arquivo: read_file
* ferramenta de execução: execute_command

## Instruções sobre o codebase
* Comandos de build, lint e test: npm run build, npm run lint, npm run test
* Diretrizes de estilo de código: Utilizar o padrão de código do projeto
* Padrões de projeto específicos: Utilizar o padrão de projeto do monorepo
* Identificação da pilha de tecnologias utilizadas: Python, JavaScript, React, Node.js
* Comandos essenciais extraídos: npm run start, npm run dev
* Mapeamento da arquitetura principal: O projeto é um monorepo com backend e frontend separados
* Documentação de padrões críticos: Utilizar o padrão de documentação do projeto
* Estilo de código extraído: Utilizar o estilo de código do projeto
* Especificidades de teste descobertas: Utilizar o padrão de teste do projeto
* Compilação/Atualização do arquivo AGENTS.md: Atualizar o arquivo com as informações coletadas

## Estrutura de saída
* Crie ou melhore o arquivo AGENTS.md com apenas informações não óbvias
* Crie arquivos AGENTS.md específicos para cada modo (code, debug, ask, architect) no diretório .roo/rules-*/
* Certifique-se de que os arquivos contenham apenas informações não óbvias e sejam concisos

## Critérios de qualidade
* Apenas inclua informações não óbvias descobertas por meio da leitura de arquivos
* Exclua qualquer coisa que possa ser adivinhada a partir de práticas padrão
* Foque em armadilhas, requisitos ocultos e padrões contraintuitivos
* Inclua caminhos de arquivo específicos ao referenciar utilitários personalizados
* Seja extremamente conciso - se for óbvio, não inclua
* Cada linha deve prevenir um potencial erro ou confusão
* Teste: Um desenvolvedor experiente seria surpreendido por essa informação?
* Se estiver atualizando arquivos existentes: EXCLUA informações óbvias primeiro, os arquivos devem ficar MAIS CURTOS
* Medida de sucesso: O arquivo é mais conciso e valioso do que antes?

# AGENTS.md — ROO Cline (VS Code) | SENTINNELL

## O que é verdade neste workspace (use como âncora)
- Monorepo com pastas irmãs: `backend/`, `frontend/`, `scripts/`.
- Existe `.rooignore` na raiz: se o Agent “não encontrar” algo, a causa #1 pode ser exclusão na indexação.
- Existe `SENTINNELL.code-workspace`: paths relativos podem mudar conforme a pasta aberta no VS Code.
- Logs de dev já existem na raiz (debug rápido):
  - `backend-dev.err.log` / `backend-dev.out.log`
  - `frontend-dev.err.log` / `frontend-dev.out.log`

## Regras que evitam as piores cagadas (não-negociáveis)
- **Não assumir nada**: antes de sugerir comandos/fluxos, confirmar nos `package.json` reais (raiz + `backend/` + `frontend/`).
- **Não misturar projetos**: trate `backend/` e `frontend/` como mundos separados (dependências, scripts e configs podem divergir).
- **Diretório certo ou nada feito**: sempre declarar de onde o comando deve ser rodado (raiz vs `backend/` vs `frontend/`) com base em script/config existente.
- **Editar só com contexto**: antes de mudar um arquivo, ler a seção completa (evita quebrar padrões locais).
- **Mudança mínima**: não reformatar arquivo inteiro; patch pequeno, validado, e só depois continuar.
- **Sem bypass de segurança**: não introduzir “allow all”, “skip auth”, “if dev bypass” (mesmo temporário) sem alternativa segura + evidência no repo.

## Padrão de investigação (ordem que reduz retrabalho)
1) Verificar `.rooignore` se algo “sumiu” nas buscas do Agent.
2) Localizar a fonte de verdade do app alvo (backend ou frontend): scripts, configs, docs internas, `.env*.example`.
3) Confirmar ordem obrigatória (build de pacotes internos, migrações, seeds, geração) antes de rodar `dev/start`.

## Debug (use o que já está pronto)
- Falhou `dev/start`? Olhe primeiro:
  - backend → `backend-dev.err.log` / `backend-dev.out.log`
  - frontend → `frontend-dev.err.log` / `frontend-dev.out.log`
- Ao relatar problema, sempre incluir: lado (backend/frontend), log (err/out) e trecho exato do erro.

## Como o Agent deve responder
- Toda afirmação sobre o projeto deve citar **onde foi visto** (arquivo/pasta). Se não viu, declarar “hipótese” e indicar exatamente onde checar.
- Sempre terminar com um próximo passo verificável (ex.: “confirme X em Y antes de alterar Z”).
