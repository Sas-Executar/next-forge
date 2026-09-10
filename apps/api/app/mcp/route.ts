import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { buildMcpServer } from "@repo/mcp";

/**
 * MCP host (M12-T01, D6) — `@modelcontextprotocol/sdk`'s Streamable
 * HTTP transport over Web Standard `Request`/`Response`
 * (`WebStandardStreamableHTTPServerTransport`, not the Express-wrapped
 * `StreamableHTTPServerTransport`: apps/api is a Next.js route handler,
 * not an Express app), Clerk-authenticated via the same `requireRole()`
 * (@repo/auth/server) every other apps/api route already uses.
 *
 * Stateless mode (`sessionIdGenerator: undefined`): a fresh `McpServer` +
 * transport is built per HTTP request, bound to that request's resolved
 * `{workspaceId, actorRef}` (packages/mcp/src/context.ts). This is a
 * disclosed simplification, not an oversight — a real session-scoped
 * transport would need server-side session storage shared across
 * serverless invocations (no persistent process here to hold it in
 * memory), which this milestone doesn't build. Every MCP call is
 * independently authenticated and workspace-scoped regardless; nothing
 * about tenant propagation or the AuthorityGate depends on session
 * continuity (packages/mcp/src/server.ts's own tool set is what
 * carries M12-T03's guarantees, not this transport's session state).
 */
const resolveContext = async () => {
  const { workspace, membership } = await requireRole("MEMBER");
  return { workspaceId: workspace.id, actorRef: membership.clerkUserId };
};

const handle = async (request: Request): Promise<Response> => {
  let context: Awaited<ReturnType<typeof resolveContext>>;
  try {
    context = await resolveContext();
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return new Response("No active workspace", { status: 409 });
    }
    if (error instanceof InsufficientRoleError) {
      return new Response("Forbidden", { status: 403 });
    }
    throw error;
  }

  const server = buildMcpServer(context);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
};

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
