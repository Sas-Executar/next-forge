# Executar UI — Hierarquia de referência

## Regra de composição

O Executar não mistura Apple HIG, Geist e Fluent como três estilos visuais equivalentes. A hierarquia obrigatória é:

1. **Apple HIG — comportamento e UX**
   - hierarquia clara;
   - alvos de toque confortáveis;
   - feedback imediato de estado;
   - acessibilidade;
   - navegação previsível;
   - redução de movimento quando solicitado pelo sistema.

2. **Geist — identidade visual**
   - tipografia e densidade;
   - grid e espaçamento;
   - superfícies neutras;
   - bordas discretas;
   - contraste alto;
   - linguagem minimalista e funcional.

3. **Fluent — operações complexas**
   - command bars;
   - menus;
   - seletores;
   - estados operacionais;
   - formulários, tabelas e controles densos quando necessários.

## Regras do modo de execução

- A superfície de execução é **full-screen**.
- A barra superior é fixa e ocupa 100% da largura.
- Uma única unidade de execução recebe foco visual por vez.
- O conteúdo usa scroll vertical nativo com snap por unidade.
- O usuário deve conseguir operar por touch, mouse e teclado.
- A conclusão é sempre explícita; o fim do timer não conclui uma unidade.
- **Auto Mode** pode avançar automaticamente ao término do timer, mas não marca a unidade como concluída.
- Contadores são derivados do estado real das unidades concluídas, nunca de valores decorativos.
- Fases e workflows são considerados concluídos apenas quando todas as tarefas subjacentes estiverem concluídas.
- Estado de conclusão, notas, modo, duração e Auto Mode devem persistir localmente no protótipo.

## Princípio visual

A interface deve parecer um único produto Executar. HIG orienta comportamento, Geist define a linguagem visual e Fluent fornece padrões para controles operacionais; nenhuma referência deve aparecer como cópia visual literal de outro produto.