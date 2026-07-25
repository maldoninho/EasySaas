import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
export const projectRoot = resolve(dirname(currentFile), "../..");
export const rootPath = (...parts) => resolve(projectRoot, ...parts);
