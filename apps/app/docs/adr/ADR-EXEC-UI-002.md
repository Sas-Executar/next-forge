# ADR-EXEC-UI-002 — Lista convencional e navegação do aplicativo

- Versão: 1.0 · Data: 2026-09-11 · Projeto: EXECUTAR.
- Status: IMPLEMENTADO por solicitação do usuário; aprovação visual desta revisão ainda não presumida.
- Complementa [ADR-EXEC-UI-001](ADR-EXEC-UI-001.md), preservado como registro histórico da UI aprovada.
- Origem: instrução do usuário e seis capturas anexadas (IMG_1040 a IMG_1045).
- Tags: #UI #Navegação #Lista.

## Decisão

A lista usa o padrão convencional observado nas referências: checkbox, título, informação secundária opcional e acesso discreto aos detalhes. Itens são linhas separadas por divisores, agrupadas por fase em seções recolhíveis. Não há cartão individual nem sequência de botões Selecionar/Concluir/Contexto por tarefa.

A referência informa formatos e densidade; não incorpora identidade, dados pessoais, imagens, texto promocional ou funcionalidades fictícias do aplicativo mostrado nas capturas.

O modo Foco mantém tipografia de execução, posição, progresso, contexto, timer e conclusão opcional por avanço manual. Lista e Foco usam a mesma base e o mesmo armazenamento de estado.

## Navegação e rotas

| Rota | Superfície | Comportamento |
|---|---|---|
| `/tarefas` | Lista | Checkbox explícito; grupos por fase; detalhes por título ou ícone |
| `/foco` | Execução por scroll | Anterior/próxima, timer, Auto Mode e conclusão manual opcional |
| `/configuracoes` | Preferências | Aparência, visualização, detalhes, concluídas, timer e comportamento |
| `/` | Entrada compatível | Restaura preferência e normaliza a URL |
| `/scroll-task-prototype` | Entrada legada | Preserva links anteriores |

Parâmetros: `nivel=tasks|actions|phases|workflows` e `unidade=<ID existente>`. Links legados em hash continuam aceitos. O histórico restaura rota e posição; navegar nunca conclui por si só.

No desktop, navegação lateral persistente. No mobile, drawer nativo modal com as mesmas rotas. Nenhum link fictício é exibido. Calendário, conta, notificações e integrações vistos nas referências não são simulados sem modelo de dados ou implementação correspondente.

## Interação e estado

- Rolar a lista nunca conclui. O checkbox conclui/reabre; título abre detalhes e notas.
- Concluídas podem ser ocultadas e os detalhes secundários ligados/desligados.
- Tema segue o sistema ou a escolha explícita Claro/Escuro.
- Abrir detalhes e sair do Foco pausa o timer, evitando avanço durante edição de notas ou preferências.
- Limpar conclusões exige confirmação; notas são preservadas.
- A chave `executar-scroll-v7`, os IDs, notas, configurações e conclusões existentes são mantidos e validados.
- Não foi introduzido manifesto/service worker; esta decisão não afirma instalação ou funcionamento offline de PWA.

## Implementação

`index.html`: estrutura semântica e controles nativos. `styles.css`: contratos e apresentação compartilhados. `model.mjs`: estado, unidades, conclusão e rotas. `app.mjs`: renderização e interação. `vercel.json`: mapeamento explícito das páginas e assets.

## Evidência de validação

- PASS: sintaxe dos módulos, HTML e referências de IDs.
- PASS: 11 casos de scroll, conclusão agregada/individual e preservação de estado.
- PASS: rotas, parâmetros, links legados, níveis e oito mapeamentos de página/asset.
- PASS: Chromium com Playwright — lista, checkbox, notas, troca de modo, navegação e Voltar, exclusão de conclusão por scroll na lista, conclusão manual no Foco, preferências e persistência.
- Capturas inspecionadas: desktop 1440×900, mobile 390×844, detalhes e configurações. Layout também exercitado a 320×568, 844×390 e com texto a 200%; sem overflow horizontal observado.
- Temas escuro/maior contraste exercitados; não substituem auditoria de contraste completa.
- PENDENTE: VoiceOver/Safari em aparelho físico e revisão visual final do usuário. Testes não constituem certificação HIG/WCAG.

## Rastreabilidade

Base: `3eb5d040b2b980f62c6c2100bd82fd5f41c84268`. Registro e publicação na branch `chatgpt/scroll-task-prototype`; sem declaração de merge em main.
