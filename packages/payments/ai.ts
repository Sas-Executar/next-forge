import "server-only";
import { StripeAgentToolkit } from "@stripe/agent-toolkit/ai-sdk";
import { keys } from "./keys";

const { STRIPE_SECRET_KEY } = keys();

// @stripe/agent-toolkit 0.9.0 rewired the SDK around a remote MCP server
// (mcp.stripe.com): tool availability is now scoped server-side by the
// Restricted API Key's permissions, not by a client-side `actions` allowlist.
// Callers MUST `await paymentsAgentToolkit.initialize()` before using
// `.getTools()`/`.tools` — construction alone no longer fetches tools.
export const paymentsAgentToolkit = STRIPE_SECRET_KEY
  ? new StripeAgentToolkit({
      secretKey: STRIPE_SECRET_KEY,
      configuration: {},
    })
  : undefined;
