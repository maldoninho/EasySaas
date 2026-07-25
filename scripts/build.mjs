import { run } from "./lib/process.mjs";import { projectRoot } from "./lib/root.mjs";
run(process.execPath,["scripts/generate-module-registry.mjs"],{cwd:projectRoot});
run("pnpm",["--filter","./packages/**","build"],{cwd:projectRoot});
run("pnpm",["--filter","@easysaas/api","build"],{cwd:projectRoot});
run("pnpm",["--filter","@easysaas/worker","build"],{cwd:projectRoot});
run("pnpm",["--filter","@easysaas/web","build"],{cwd:projectRoot});
