// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions is Deno, not React Native — different globals, its own
    // toolchain, and `supabase functions deploy` type-checks it on the way out.
    ignores: ["dist/*", "supabase/functions/*"],
  }
]);
