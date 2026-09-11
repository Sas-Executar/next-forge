# Contratos de interface — execução

Data: 2026-09-11. Projeto: executar-nf-app.
Base: 483ef76c9819174b7fd03afe76bf2a9f038e6dd4, branch chatgpt/scroll-task-prototype.
Origem: especificação HIG anexada pelo usuário e regras Fluent descritas na conversa.
Escopo: public/scroll-task-prototype/index.html, servido pelas rotas / e /scroll-task-prototype.

## Implementação

- Layout adaptado ao espaço disponível, com cabeçalho de altura natural, safe areas e unidades com altura mínima de uma tela que crescem com o conteúdo.
- Tipografia em rem, títulos com quebra de palavras e altura de linha legível. Espaçamento baseado em 4 px.
- Controles com dimensões mínimas de 44 CSS px, foco visível, estados pressionado/desabilitado e nomes acessíveis.
- Uma ação primária visível; conclusão móvel compacta e contexto disponível por botão.
- Cores semânticas para claro/escuro, preferência de maior contraste, cores forçadas e movimento reduzido. Estado de conclusão também em texto, ícone e progresso acessível.
- Menu com foco inicial, Escape e retorno de foco. Atalhos globais não capturam Enter/Espaço de controles nativos.
- Scroll só conclui uma ação/tarefa quando há entrada manual para frente e avanço para a unidade imediatamente seguinte. Auto Mode, mudanças programáticas, retorno, fases/workflows e saltos não concluem pelo scroll.
- Posição calculada pela geometria real das unidades, incluindo alturas variáveis. Textos de conclusão e pendências são atualizados junto com o estado.
- Persistência existente preservada; falhas de localStorage não interrompem a interface.

## Evidência e limites

- PASS: compilação sintática do JavaScript e dez casos da função real de resolução do scroll, via `node apps/app/tests/scroll-contract.cjs`.
- PASS: `git diff --check`.
- PENDENTE: validação visual desktop/mobile/paisagem, ampliação a 200%, RTL, contraste e interação real de toque/roda.
- PENDENTE: VoiceOver em Safari/iOS e tamanhos de acessibilidade em dispositivo real.
- O ambiente não disponibilizou navegador; o download do Chromium falhou. Testes de lógica não comprovam renderização ou acessibilidade completa.
- SwiftUI, Dynamic Type AX1–AX5 e pt nativos não se aplicam diretamente ao HTML. rem, zoom, controles HTML e CSS px são adaptações web; não constituem certificação HIG ou WCAG.

## Verificação manual

1. Em 320 px, 390 px, desktop e paisagem, abrir contexto e menu; conferir acesso ao conteúdo completo.
2. Ampliar texto a 200%; confirmar que título, notas e botões continuam utilizáveis.
3. Navegar por Tab, Enter, Espaço e Escape; conferir os anúncios de posição e conclusão no leitor de tela.
4. Concluir por scroll manual, voltar, desligar a opção, ativar Auto Mode e selecionar fase/workflow; conferir que somente o avanço manual elegível conclui.
5. Conferir tema escuro, maior contraste, redução de movimento e RTL.
