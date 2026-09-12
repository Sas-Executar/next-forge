import { analytics } from "@repo/analytics/server";
import type {
  DeletedObjectJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  UserJSON,
  WebhookEvent,
} from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { env } from "@/env";

const handleUserCreated = (data: UserJSON) => {
  analytics?.identify({
    distinctId: data.id,
    properties: {
      email: data.email_addresses.at(0)?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: new Date(data.created_at),
      avatar: data.image_url,
      phoneNumber: data.phone_numbers.at(0)?.phone_number,
    },
  });

  analytics?.capture({
    event: "User Created",
    distinctId: data.id,
  });

  return new Response("User created", { status: 201 });
};

const handleUserUpdated = (data: UserJSON) => {
  analytics?.identify({
    distinctId: data.id,
    properties: {
      email: data.email_addresses.at(0)?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: new Date(data.created_at),
      avatar: data.image_url,
      phoneNumber: data.phone_numbers.at(0)?.phone_number,
    },
  });

  analytics?.capture({
    event: "User Updated",
    distinctId: data.id,
  });

  return new Response("User updated", { status: 201 });
};

const handleUserDeleted = (data: DeletedObjectJSON) => {
  if (data.id) {
    analytics?.identify({
      distinctId: data.id,
      properties: {
        deleted: new Date(),
      },
    });

    analytics?.capture({
      event: "User Deleted",
      distinctId: data.id,
    });
  }

  return new Response("User deleted", { status: 201 });
};

// Workspace is the local tenancy root, keyed to a Clerk organization (D3).
// Shared by both organization.created and organization.updated so the
// local row stays in sync either way — upsert, not create-only, since
// webhook delivery order/at-least-once retries aren't guaranteed.
const upsertWorkspaceFromOrganization = (data: OrganizationJSON) =>
  database.workspace.upsert({
    where: { clerkOrgId: data.id },
    update: { name: data.name },
    create: { clerkOrgId: data.id, name: data.name },
  });

const handleOrganizationCreated = async (data: OrganizationJSON) => {
  await upsertWorkspaceFromOrganization(data);

  analytics?.groupIdentify({
    groupKey: data.id,
    groupType: "company",
    distinctId: data.created_by,
    properties: {
      name: data.name,
      avatar: data.image_url,
    },
  });

  if (data.created_by) {
    analytics?.capture({
      event: "Organization Created",
      distinctId: data.created_by,
    });
  }

  return new Response("Organization created", { status: 201 });
};

const handleOrganizationUpdated = async (data: OrganizationJSON) => {
  await upsertWorkspaceFromOrganization(data);

  analytics?.groupIdentify({
    groupKey: data.id,
    groupType: "company",
    distinctId: data.created_by,
    properties: {
      name: data.name,
      avatar: data.image_url,
    },
  });

  if (data.created_by) {
    analytics?.capture({
      event: "Organization Updated",
      distinctId: data.created_by,
    });
  }

  return new Response("Organization updated", { status: 201 });
};

// Clerk's built-in roles are "org:admin"/"org:member" by default, but an
// org can define fully custom role keys — OrganizationMembershipRole is
// an open string, not a fixed union. This mapping is provisional (only
// the default admin role promotes to OWNER; everything else, including
// any custom role, is treated as MEMBER) pending the real permission
// matrix (M16-T01) — see MembershipRole's own comment in
// packages/database/prisma/schema.prisma.
const mapClerkRoleToMembershipRole = (role: string): "OWNER" | "MEMBER" =>
  role === "org:admin" ? "OWNER" : "MEMBER";

const handleOrganizationMembershipCreated = async (
  data: OrganizationMembershipJSON
) => {
  // Upsert the workspace too, defensively: organization.created may not
  // have arrived yet, or may have been missed — this handler must not
  // assume delivery order.
  const workspace = await upsertWorkspaceFromOrganization(data.organization);

  await database.membership.upsert({
    where: {
      workspaceId_clerkUserId: {
        workspaceId: workspace.id,
        clerkUserId: data.public_user_data.user_id,
      },
    },
    update: { role: mapClerkRoleToMembershipRole(data.role) },
    create: {
      workspaceId: workspace.id,
      clerkUserId: data.public_user_data.user_id,
      role: mapClerkRoleToMembershipRole(data.role),
    },
  });

  analytics?.groupIdentify({
    groupKey: data.organization.id,
    groupType: "company",
    distinctId: data.public_user_data.user_id,
  });

  analytics?.capture({
    event: "Organization Member Created",
    distinctId: data.public_user_data.user_id,
  });

  return new Response("Organization membership created", { status: 201 });
};

const handleOrganizationMembershipDeleted = async (
  data: OrganizationMembershipJSON
) => {
  const workspace = await database.workspace.findUnique({
    where: { clerkOrgId: data.organization.id },
    select: { id: true },
  });

  // deleteMany, not delete: a missing workspace/membership (e.g. an
  // out-of-order or retried webhook) is a no-op, not an error — never
  // invent state, never throw on an already-absent row.
  if (workspace) {
    await database.membership.deleteMany({
      where: {
        workspaceId: workspace.id,
        clerkUserId: data.public_user_data.user_id,
      },
    });
  }

  analytics?.capture({
    event: "Organization Member Deleted",
    distinctId: data.public_user_data.user_id,
  });

  return new Response("Organization membership deleted", { status: 201 });
};

export const POST = async (request: Request): Promise<Response> => {
  if (!env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Not configured", ok: false });
  }

  // Get the headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!(svixId && svixTimestamp && svixSignature)) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = (await request.json()) as object;
  const body = JSON.stringify(payload);

  // Create a new SVIX instance with your secret.
  const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let event: WebhookEvent | undefined;

  // Verify the payload with the headers
  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    log.error("Error verifying webhook:", { error });
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = event.data;
  const eventType = event.type;

  log.info("Webhook", { id, eventType, body });

  let response: Response = new Response("", { status: 201 });

  switch (eventType) {
    case "user.created": {
      response = handleUserCreated(event.data);
      break;
    }
    case "user.updated": {
      response = handleUserUpdated(event.data);
      break;
    }
    case "user.deleted": {
      response = handleUserDeleted(event.data);
      break;
    }
    case "organization.created": {
      response = await handleOrganizationCreated(event.data);
      break;
    }
    case "organization.updated": {
      response = await handleOrganizationUpdated(event.data);
      break;
    }
    case "organizationMembership.created": {
      response = await handleOrganizationMembershipCreated(event.data);
      break;
    }
    case "organizationMembership.deleted": {
      response = await handleOrganizationMembershipDeleted(event.data);
      break;
    }
    default: {
      break;
    }
  }

  await analytics?.shutdown();

  return response;
};
