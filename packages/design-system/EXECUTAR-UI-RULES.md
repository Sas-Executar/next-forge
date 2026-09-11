# Executar UI — Hierarquia de referência

## Regra de composição

O Executar não mistura Apple HIG, Geist e Fluent como três estilos visuais equivalentes. A hierarquia obrigatória é:

1. **Apple HIG — comportamento e UX**
   - hierarquia clara;
   - alvos de toque de pelo menos 44 × 44;
   - feedback imediato de estado;
   - acessibilidade;
   - navegação previsível;
   - redução de movimento quando solicitado pelo sistema.

2. **Geist — identidade visual**
   - tipografia e densidade;
   - superfícies neutras;
   - bordas discretas;
   - contraste alto;
   - linguagem minimalista e funcional.

3. **Fluent 2 — hierarquia operacional**
   - espaçamento em ramp de base 4 px;
   - proximidade para indicar relação entre informações;
   - espaço negativo para separar grupos e aumentar foco;
   - baseline e hierarquia tipográfica consistentes;
   - um único botão primário por contexto;
   - ações secundárias com menor peso visual;
   - command bars, menus, seletores e estados operacionais.

## Ramp de espaçamento

Usar prioritariamente: `4, 8, 12, 16, 20, 24, 32, 40, 48, 56`.

Pequenos espaçamentos agrupam elementos semanticamente relacionados. Espaçamentos maiores criam seções e hierarquia sem depender de linhas ou caixas adicionais.

## Cor informacional

- Verde é a cor de informação positiva e progresso operacional no modo de execução.
- Aplicar em progresso, contador de conclusão, estados ativos, número da unidade e confirmação de tarefa concluída.
- Não usar somente cor para comunicar estado: combinar verde com texto, ícone, rótulo ou mudança de forma.
- O botão primário pode permanecer neutro/escuro; verde não deve transformar todos os controles em ações primárias.

## Regras do modo de execução

- A superfície de execução é **full-screen**.
- A barra superior é fixa e ocupa 100% da largura.
- Uma única unidade de execução recebe foco visual por vez.
- O conteúdo usa scroll vertical nativo com snap por unidade.
- O usuário deve conseguir operar por touch, mouse e teclado.
- **Scroll não implica conclusão por padrão.**
- Pode existir a preferência explícita **Concluir ao avançar**. Quando ativada, somente um scroll manual para frente em modo Ação/Tarefa conclui a unidade anterior.
- Auto Mode, botões, teclado e navegação programática nunca usam essa preferência para concluir silenciosamente uma unidade.
- O fim do timer nunca conclui uma unidade.
- **Auto Mode** pode avançar automaticamente ao término do timer sem marcar a unidade como concluída.
- Contadores são derivados do estado real das unidades concluídas, nunca de valores decorativos.
- Fases e workflows são considerados concluídos apenas quando todas as tarefas subjacentes estiverem concluídas.
- Estado de conclusão, notas, modo, duração, Auto Mode e preferência de conclusão por scroll devem persistir localmente no protótipo.

## Mobile

- Não usar uma barra inferior pesada para uma única ação.
- Quando necessário, a ação primária pode assumir formato de controle flutuante compacto, respeitando safe areas.
- Estado/progresso e ação primária devem ocupar regiões distintas para reduzir competição visual.

## Princípio visual

A interface deve parecer um único produto Executar. HIG orienta comportamento, Geist define a linguagem visual e Fluent organiza hierarquia, espaçamento e comandos; nenhuma referência deve aparecer como cópia visual literal de outro produto.