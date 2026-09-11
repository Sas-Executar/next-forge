# docs/executar

Registro de planejamento do **Executar App / Agente Copiloto** sobre este Turborepo.

| Arquivo | O que é |
|---|---|
| `PLANO_EXECUTAR_COPILOTO.md` | Plano de implementação. **Aprovado pelo usuário, ainda não executado.** |
| `PROMPT_ATIVACAO_SESSAO.md` | Prompt pronto para colar numa nova sessão de Claude Code que vá implementar o plano. |

## Estado

- **Planejamento:** concluído e aprovado em 2026-09-11.
- **Fase 0 (auditoria e reconciliação):** concluída em 2026-09-11, sem alterar
  código de produto. Linha de base de regressão registrada:
  `bun run typecheck` 37/37 pacotes · `bunx ultracite check .` 0 erros
  (659 arquivos) · `bun run test` 281 passando / 141 pulando / 0 falhando
  (422 testes totais, 18/18 pacotes com task `test`). Ver
  `DIAGNOSTICO_REPOSITORIO.md` para o detalhe completo e a limitação
  metodológica registrada (o corpus `Executar-app-Blueprint` não está
  acessível nesta sessão).
- **Fases 1-9:** não iniciadas — aguardam revisão e aprovação explícita do
  usuário, fase a fase, conforme `PROMPT_ATIVACAO_SESSAO.md` exige.
- **Base de código:** `claude/trusting-pasteur-w4jzf1` — head do PR [#1](https://github.com/Sas-Executar/next-forge/pull/1), aberto e draft. **Não usar `main` como base.**

## Artefatos da Fase 0 (produzidos)

`DIAGNOSTICO_REPOSITORIO.md` · `MATRIZ_FONTE_REQUISITO_CODIGO.csv` · `INVENTARIO_COMPONENTES_AGENTICOS.yaml` · `GRAFO_DEPENDENCIAS.md` · `DECISOES_TECNICAS_PENDENTES.md` · `ADRS_CANDIDATOS/` (ADR-001 a ADR-004) · `PLANO_IMPLEMENTACAO_INCREMENTAL.md` · `PLANO_SCHEMAS_MIGRACOES.md` · `PLANO_TESTES_EVALS.md` · `PLANO_SEGURANCA_PERMISSOES.md` · `PLANO_OBSERVABILIDADE_OPERACAO.md` · `PLANO_INTEGRACAO_TURBOREPO.md`

## Leitura complementar (raiz do repositório)

`HANDOFF.md` · `PRODUCT_AUDIT.md` · `LAUNCH_RUNBOOK.md` · `AGENTS.md` · `QUALITY_GATES.md`
