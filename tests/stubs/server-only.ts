/**
 * Test stub for the `server-only` package.
 *
 * The real module throws if pulled into a client bundle. That guard is exactly
 * what we want in the app and exactly what we do not want in a Node test run,
 * so vitest.config.mts aliases it here.
 */
export {};
