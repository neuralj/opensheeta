import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/daemon.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  outDir: "dist",
  target: "node22",
  platform: "node",
  splitting: false,
  sourcemap: false,
  minify: false,
  treeshake: true,
  tsconfig: "tsconfig.json",
})
