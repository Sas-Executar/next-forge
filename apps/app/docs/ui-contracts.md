# Contratos de interface — EXECUTAR

Data: 2026-09-11. Projeto: executar-nf-app.

A decisão de referência aprovada é [ADR-EXEC-UI-001](adr/ADR-EXEC-UI-001.md). A revisão da lista e das rotas está formalizada em [ADR-EXEC-UI-002](adr/ADR-EXEC-UI-002.md).

## Interface atual

- Lista convencional com checkbox, título e detalhe opcional; agrupamento por fase; conclusão sempre explícita.
- Foco com posição, progresso, contexto, timer, Auto Mode e scroll manual opcional para concluir ações/tarefas.
- Rotas Tarefas, Foco e Configurações. Navegação lateral no desktop e drawer no mobile.
- Aparência do sistema/clara/escura; contraste reforçado e movimento reduzido; safe areas, texto escalável, controles nativos e foco visível.
- Estado compartilhado e persistido na chave existente, sem apagar notas ou conclusões.

## Verificação

```sh
node apps/app/tests/scroll-contract.cjs
node apps/app/tests/navigation-contract.cjs
node apps/app/tests/routes-contract.cjs
node apps/app/tests/ui-browser.cjs
```

O teste de navegador requer Playwright e Chromium. Pode usar as variáveis `EXECUTAR_PLAYWRIGHT_MODULE`, `EXECUTAR_BROWSER_PATH` e, para Chromium empacotado, `EXECUTAR_CHROMIUM_MODULE`. O servidor do teste aplica os mapeamentos reais de `vercel.json`.

Testes de lógica, rotas e navegador passaram. Ver ADR-EXEC-UI-002 para escopo e limites; VoiceOver/Safari em aparelho real permanece pendente.
