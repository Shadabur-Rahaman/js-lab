import { defineConfig } from "vite";
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
export default defineConfig({
  base: "./",
  server: {
    watch: {
      ignored: ["**/html-lab/**", "**/css-lab/**", "**/.deployment/**"],
    },
  },
  plugins: [react(), tailwindcss(), v3Worker],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
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
