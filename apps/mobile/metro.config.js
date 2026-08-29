const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm symlinks packages/* into apps/mobile/node_modules/@safe-sahel/*, but
// the symlink targets live outside apps/mobile — Metro needs the workspace
// root in watchFolders to watch (and hot-reload) those real files.
// Default hierarchical node_modules lookup is left alone so Metro still
// finds pnpm's nested per-package dependencies (e.g. whatwg-fetch inside
// @expo/metro-runtime/node_modules).
config.watchFolders = [workspaceRoot];

module.exports = withNativeWind(config, { input: "./src/global.css" });
