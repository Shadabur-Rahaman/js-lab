import { build } from "esbuild";
import path from "node:path";
await build({
  entryPoints: ["tests/resources-browser.tsx"],
  outfile: "tests/resources-browser.bundle.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  define: { "import.meta.env": "{}" },
  plugins: [
    {
      name: "resource-test-fixtures",
      setup(builder) {
        builder.onResolve({ filter: /\/client$/ }, (args) => {
          if (args.importer.replaceAll("\\", "/").includes("/src/resources/"))
            return { path: path.resolve("tests/resources-fixture-client.ts") };
        });
      },
    },
  ],
});
