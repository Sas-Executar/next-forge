// Moved to packages/domain (M06) so packages/agent-runtime's /bomdia
// command can share the exact same day boundary — re-exported here so
// every existing M05 page import (../lib/day-range) keeps working.
export { dayRange } from "@repo/domain";
