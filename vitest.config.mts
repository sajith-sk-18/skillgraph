import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	resolve: {
		alias: {
			// `server-only` throws by design outside a Server Component. Tests
			// exercise those modules directly, so it is stubbed here.
			"server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
			"@": fileURLToPath(new URL("./", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
});
