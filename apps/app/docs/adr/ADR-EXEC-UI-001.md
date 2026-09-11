# ADR-EXEC-UI-001 — Contrato permanente de interface e modos de execução

- Classe: ADR · Tipo: decisão arquitetural de UI.
- Versão: 1.0 · Data: 2026-09-11.
- Projeto: EXECUTAR / executar-nf-app.
- Status da decisão: ACEITA por manifestação explícita do usuário nesta conversa.
- Owner: não informado.
- Tags: #UI #Acessibilidade #Execução.
- Referência aprovada: commit `4e9b3ee90211ab6b1989c4ae1c4d779d439fcc60`.
- [Deploy aprovado pelo usuário](https://executar-nf-12cm2o792-sas-executar1.vercel.app).

## Contexto e evidência

O usuário aprovou expressamente a UI entregue, autorizou seu registro permanente em ADR e solicitou uma opção de apresentação em lista para pessoas que não desejam executar por scroll. Pediu também que a navegação do app/PWA siga a mesma UI e os mesmos contratos.

Evidência direta: instrução e aprovação do usuário em 2026-09-11. A aprovação refere-se à versão acima. A nova implementação de lista/navegação foi solicitada; sua aprovação visual não é presumida.

## Decisão

1. Preservar a UI aprovada como referência: hierarquia projeto → contexto → posição → ação principal; spacing de 4 px; ação primária única por superfície; comandos secundários discretos; verde informacional com texto/ícone.
2. Aplicar o contrato de layout, interação, tipografia, cor, componentes e acessibilidade a toda extensão de navegação do EXECUTAR.
3. Oferecer Scroll e Lista como apresentações do mesmo estado de execução. A preferência de apresentação deve persistir, assim como seleção, notas, conclusões e configurações.
4. No modo Lista, scroll é exclusivamente navegação. Conclusão/reabertura é explícita por controle, sem avanço automático após concluir uma linha.
5. No modo Scroll, preservar o comportamento opcional aprovado de concluir ao avançar manualmente uma ação/tarefa. Voltar, navegação por botões/teclado, Auto Mode, mudança de apresentação e navegação de fases/workflows não concluem pelo scroll.
6. Navegação acessível deve oferecer seleção direta, anterior/próxima e preservação de contexto ao mudar de nível. Histórico do navegador deve restaurar apresentação e posição, sem alterar conclusões.
7. Mudanças futuras que contrariem esta decisão exigem outro ADR que referencie e substitua explicitamente este. Não reescrever a aprovação histórica.

## Contratos transversais

- Layout pelo espaço disponível; safe areas; conteúdo pode crescer; sem dimensões dependentes de modelo de aparelho.
- Texto escalável; sem corte de informação essencial; cores semânticas para claro/escuro e preferências de contraste/movimento.
- Alvos mínimos de 44 CSS px, foco visível, nomes acessíveis e estados em texto/semântica.
- Priorizar controles HTML nativos, incluindo dialog, button, select e textarea na versão web.
- Respeitar teclado, histórico, leitores de tela e direção de escrita.
- Não transformar um estado implementado ou um deploy READY em prova de acessibilidade completa.

## Escopo observado e implementação

O deploy atual serve `public/scroll-task-prototype/index.html` nas rotas `/` e `/scroll-task-prototype`. A navegação operacional disponível usa os níveis já existentes: workflows, fases, tarefas e ações.

O repositório também contém telas autenticadas de starter com links demonstrativos. Elas não são servidas pela configuração atual do protótipo. Não foram apresentadas como funcionalidades integradas. A extensão do contrato a futuras rotas autenticadas permanece obrigatória quando essas rotas forem conectadas.

Os modos Ação/Tarefa atualmente compartilham a base de dados demonstrativa do protótipo; esta entrega não inventa uma nova decomposição de tarefas. Também não declara instalação ou funcionamento offline de PWA: não há manifesto/service worker neste deploy.

## Verificação

- PASS: sintaxe JavaScript; HTML estático e IDs únicos; diff sem erros de whitespace.
- PASS: 11 casos da lógica de scroll, incluindo exclusão integral em Lista.
- PASS: round-trip de URL, histórico sem duplicação, persistência da apresentação/seleção na rota, mudança de nível preservando unidade correspondente e rejeição de navegação inválida.
- PENDENTE: execução dos fluxos completos em navegador real, validação visual responsiva, toque, VoiceOver/Safari e ampliação de texto. O ambiente anterior não tinha navegador e o download falhou; a aprovação visual do usuário não substitui esses testes técnicos.

Comandos: `node apps/app/tests/scroll-contract.cjs` e `node apps/app/tests/navigation-contract.cjs`.

## Consequências

A preferência de navegação deixa de impor o scroll de execução. Estado de negócio e apresentação permanecem separados. A UI aprovada passa a ser uma decisão rastreável, reutilizável nas próximas rotas, com limites de validação explícitos.

Registro versionado na branch de trabalho `chatgpt/scroll-task-prototype`; este ADR não afirma merge em `main`.
