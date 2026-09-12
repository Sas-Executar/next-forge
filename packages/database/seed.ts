/**
 * Local-dev seed data. Exercises the core-domain slice (Workspace →
 * Membership → Project → Task → Dependency → Evidence) plus one
 * AuditEvent, enough to prove the schema round-trips real writes/reads.
 *
 * Fixtures only — never a source of real business data (Blueprint,
 * read-only, zero-placeholder rule: "Fixtures podem existir
 * exclusivamente em tests/dev").
 *
 * Run via `bunx prisma db seed` (wired in prisma.config.ts) or
 * `bun run seed.ts` directly. Idempotent: upserts by natural key, safe
 * to re-run against the same database.
 */
import { database } from "./index";

const SEED_CLERK_ORG_ID = "org_seed_dev_workspace";
const SEED_CLERK_USER_ID = "user_seed_dev_owner";

async function main() {
  const workspace = await database.workspace.upsert({
    where: { clerkOrgId: SEED_CLERK_ORG_ID },
    update: {},
    create: {
      clerkOrgId: SEED_CLERK_ORG_ID,
      name: "EXECUTAR — Dev Workspace",
    },
  });

  await database.membership.upsert({
    where: {
      workspaceId_clerkUserId: {
        workspaceId: workspace.id,
        clerkUserId: SEED_CLERK_USER_ID,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      clerkUserId: SEED_CLERK_USER_ID,
      role: "OWNER",
    },
  });

  const project = await database.project.upsert({
    where: { id: `${workspace.id}-seed-project` },
    update: {},
    create: {
      id: `${workspace.id}-seed-project`,
      workspaceId: workspace.id,
      name: "Onboarding EXECUTAR",
      description: "Seed project — local dev only, not real data.",
    },
  });

  // Two tasks: `writeBrief` depends on `researchCompetitors` — proves the
  // Dependency table and EligibilityEngine's dependency check (M04) have
  // real data to compute against.
  const researchTask = await database.task.upsert({
    where: { id: `${project.id}-research` },
    update: {},
    create: {
      id: `${project.id}-research`,
      workspaceId: workspace.id,
      projectId: project.id,
      title: "Pesquisar concorrentes",
      state: "DONE",
    },
  });

  const briefTask = await database.task.upsert({
    where: { id: `${project.id}-brief` },
    update: {},
    create: {
      id: `${project.id}-brief`,
      workspaceId: workspace.id,
      projectId: project.id,
      title: "Escrever brief do produto",
      state: "READY",
    },
  });

  await database.dependency.upsert({
    where: {
      fromTaskId_toTaskId: {
        fromTaskId: briefTask.id,
        toTaskId: researchTask.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      fromTaskId: briefTask.id,
      toTaskId: researchTask.id,
    },
  });

  await database.evidence.upsert({
    where: { id: `${researchTask.id}-evidence` },
    update: {},
    create: {
      id: `${researchTask.id}-evidence`,
      workspaceId: workspace.id,
      taskId: researchTask.id,
      grade: "A_OBSERVADO",
      description: "Planilha de benchmark concluída e revisada.",
    },
  });

  await database.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      actorType: "SYSTEM",
      actorRef: "seed-script",
      action: "SEED",
      objectType: "Workspace",
      objectId: workspace.id,
    },
  });

  console.log(`Seeded workspace ${workspace.id} (${workspace.name})`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
  });
