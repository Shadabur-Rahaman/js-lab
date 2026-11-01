import { defineConfig, type Plugin } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { buildSync } from "esbuild";
import { resolve } from "node:path";
const v3Worker = {
  name: "v3-isolated-worker",
  resolveId(id: string) {
    if (id === "virtual:v3-worker-source") return "\0v3-worker";
  },
  load(this: any, id: string) {
    if (id === "\0v3-worker") {
      for (const file of [
        "src/v3/worker.mjs",
        "src/v3/mock.mjs",
        "src/utils/displayValue.mjs",
      ])
        this.addWatchFile(resolve(file));
      const output = buildSync({
        entryPoints: ["src/v3/worker.mjs"],
        bundle: true,
        write: false,
        format: "iife",
        platform: "browser",
        target: "es2022",
        minify: true,
      });
      return "export default " + JSON.stringify(output.outputFiles[0].text);
    }
  },
};
function pdfAssets(): Plugin {
  const files = new Map<string, Buffer>();
  for (const folder of ["cmaps", "standard_fonts", "wasm"])
    for (const name of readdirSync(
      resolve("node_modules/pdfjs-dist", folder),
    )) {
      if (name === "quickjs-eval.wasm") continue; // No PDF scripting engine in previews.
      files.set(
        `pdf-assets/${folder}/${name}`,
        readFileSync(resolve("node_modules/pdfjs-dist", folder, name)),
      );
    }
  files.set(
    "pdf-assets/LICENSE",
    readFileSync(resolve("node_modules/pdfjs-dist/LICENSE")),
  );
  return {
    name: "local-pdf-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url || "/", "http://localhost").pathname.slice(
          1,
        );
        const body = files.get(path);
        if (!body) return next();
        res.setHeader(
          "Content-Type",
          path.endsWith(".wasm")
            ? "application/wasm"
            : path.endsWith(".js")
              ? "text/javascript"
              : "application/octet-stream",
        );
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.end(body);
      });
    },
    generateBundle() {
      for (const [fileName, source] of files)
        this.emitFile({ type: "asset", fileName, source });
    },
  };
}
export default defineConfig({
  base: "./",
  server: {
    watch: {
      ignored: ["**/html-lab/**", "**/css-lab/**", "**/.deployment/**"],
    },
  },
  plugins: [react(), tailwindcss(), v3Worker, pdfAssets()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "curriculum-v4": ["./src/v4/curriculum.ts"],
          "v3-worker": ["virtual:v3-worker-source"],
          "react-vendor": ["react", "react-dom"],
          "motion-vendor": ["motion/react"],
          "editor-vendor": ["prismjs", "react-simple-code-editor"],
          "curriculum-v2": [
            "./src/data/curriculum.ts",
            "./src/data/appliedProjects.ts",
          ],
        },
      },
    },
  },
});
