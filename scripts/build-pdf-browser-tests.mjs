import { build } from "esbuild";
await build({
  entryPoints: ["tests/pdf-preview-browser.tsx"],
  outfile: "tests/pdf-preview-browser.bundle.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  target: "es2022",
  plugins: [
    {
      name: "local-pdf-test-transport",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/client$/ }, () => ({
          path: "preview-client",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export const link=async resource=>'/.deployment/pdf-preview-fixtures/'+resource.id+'.pdf';export const download=async()=>{};export const size=n=>Math.round(n/1024)+' KB';export const extension=()=> 'pdf';export const previewable=()=>true;`,
          loader: "js",
        }));
        builder.onResolve({ filter: /\.mjs\?url$/ }, () => ({
          path: "pdf-worker-url",
          namespace: "worker-url",
        }));
        builder.onLoad({ filter: /.*/, namespace: "worker-url" }, () => ({
          contents:
            'export default "/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";',
          loader: "js",
        }));
      },
    },
  ],
});
