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
        builder.onResolve({ filter: /\.mjs\?url$/ }, () => ({
          path: "pdf-worker-url",
          namespace: "worker-url",
        }));
        builder.onLoad({ filter: /.*/, namespace: "worker-url" }, () => ({
          contents:
            'export default "/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";',
          loader: "js",
        }));
        builder.onResolve({ filter: /\/client$/ }, (args) => {
          if (args.importer.replaceAll("\\", "/").includes("/src/resources/"))
            return { path: path.resolve("tests/resources-fixture-client.ts") };
        });
      },
    },
  ],
});
