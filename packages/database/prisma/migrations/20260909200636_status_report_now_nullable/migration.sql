-- StatusReport.now becomes nullable (M07-T01, packages/reports'
-- buildStatusReport()): a workspace can genuinely have nothing
-- currently eligible (nextAction() returns NONE, or TIE — an
-- unresolved tie requiring human decision, per skills/copiloto-executar
-- /SKILL.md's own EXIGE_HUMANO rule). That's a real, distinct state
-- from an empty JSON object — faking a placeholder `now` block for it
-- would violate the same "never invent state" principle every other
-- builder in this codebase already follows.
ALTER TABLE "StatusReport" ALTER COLUMN "now" DROP NOT NULL;
