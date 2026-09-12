// Monorepo-aware Metro config (M08-T01) — Expo's own documented pattern
// for a workspace app that imports sibling packages (@repo/schemas,
// @repo/domain) living outside apps/mobile itself. Metro's default
// config only watches/resolves within the app's own directory; a bare
// `@repo/*` import would otherwise fail to resolve even though Bun's
// workspace symlinks put it in apps/mobile/node_modules.
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

// biome-ignore lint/correctness/noGlobalDirnameFilename: this file is loaded as CommonJS (require/module.exports below) — import.meta.dirname doesn't exist here, __dirname is the only correct option.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Metro needs to watch the whole monorepo so changes in packages/* (not
// just apps/mobile) trigger a rebuild.
config.watchFolders = [workspaceRoot];

// Resolve modules from both this app's node_modules and the workspace
// root's — the Bun-hoisted deps (react, expo, ...) live at the root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// disableHierarchicalLookup is the right call for Yarn PnP or a fully
// flat pnpm store, but Bun's actual layout (confirmed empirically: a
// real `expo export --platform web` run) keeps most of a package's own
// transitive dependencies (e.g. expo-router's `standard-navigation`)
// only inside that package's own nested node_modules — not hoisted to
// the workspace root. Disabling hierarchical lookup broke exactly that
// resolution; leaving it enabled (Metro's default) is what actually
// works here, at the cost of the theoretical risk the comment used to
// warn about (a stray second React copy climbing past a workspace
// boundary) — not observed in practice for this repo's dependency set.

module.exports = config;
