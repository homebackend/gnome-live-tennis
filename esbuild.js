// esbuild.js
import { build } from "esbuild";
import { type } from "os";

await build({
  entryPoints: ["src/extension.ts", "src/prefs.ts"],
  outdir: "dist/",
  bundle: true,
  target: "firefox115",
  format: "esm",
  external: ["gi://*", "resource://*"], // Exclude GJS and Shell imports
});
