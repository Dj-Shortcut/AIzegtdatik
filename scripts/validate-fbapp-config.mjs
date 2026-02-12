import { readFileSync } from "node:fs";

const REQUIRED_ROOT = ["instant_games"];
const REQUIRED_INSTANT_GAMES = [
  "platform_version",
  "navigation_menu_version",
  "orientation",
  "match_player_config",
];

const ALLOWED_PLATFORM_VERSIONS = new Set(["RICH_GAMEPLAY"]);
const ALLOWED_NAVIGATION_MENU_VERSIONS = new Set(["NAV_FLOATING", "NAV_HIDDEN"]);
const ALLOWED_ORIENTATIONS = new Set(["PORTRAIT", "LANDSCAPE", "BOTH"]);

function fail(message) {
  console.error(`✖ fbapp-config validation failed: ${message}`);
  process.exit(1);
}

function assertHasKeys(obj, keys, pathLabel) {
  for (const key of keys) {
    if (!(key in obj)) {
      fail(`missing required field: ${pathLabel}.${key}`);
    }
  }
}

function validateMatchPlayerConfig(matchPlayerConfig) {
  if (typeof matchPlayerConfig !== "object" || matchPlayerConfig === null) {
    fail("instant_games.match_player_config must be an object");
  }

  const { minimum_size: minimumSize, maximum_size: maximumSize } = matchPlayerConfig;

  if (!Number.isInteger(minimumSize) || minimumSize < 2) {
    fail("instant_games.match_player_config.minimum_size must be an integer >= 2");
  }

  if (!Number.isInteger(maximumSize) || maximumSize < minimumSize) {
    fail("instant_games.match_player_config.maximum_size must be an integer >= minimum_size");
  }
}

function validateConfig(config) {
  assertHasKeys(config, REQUIRED_ROOT, "root");
  const instantGames = config.instant_games;

  if (typeof instantGames !== "object" || instantGames === null) {
    fail("instant_games must be an object");
  }

  assertHasKeys(instantGames, REQUIRED_INSTANT_GAMES, "instant_games");

  if (!ALLOWED_PLATFORM_VERSIONS.has(instantGames.platform_version)) {
    fail(
      `instant_games.platform_version must be one of: ${Array.from(ALLOWED_PLATFORM_VERSIONS).join(", ")}`,
    );
  }

  if (!ALLOWED_NAVIGATION_MENU_VERSIONS.has(instantGames.navigation_menu_version)) {
    fail(
      `instant_games.navigation_menu_version must be one of: ${Array.from(
        ALLOWED_NAVIGATION_MENU_VERSIONS,
      ).join(", ")}`,
    );
  }

  if (!ALLOWED_ORIENTATIONS.has(instantGames.orientation)) {
    fail(`instant_games.orientation must be one of: ${Array.from(ALLOWED_ORIENTATIONS).join(", ")}`);
  }

  validateMatchPlayerConfig(instantGames.match_player_config);
}

const content = readFileSync(new URL("../fbapp-config.json", import.meta.url), "utf8");
const config = JSON.parse(content);
validateConfig(config);

console.log("✔ fbapp-config validation passed.");
