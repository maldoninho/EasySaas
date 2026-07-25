import { readFile, writeFile } from "node:fs/promises";

export function parseEnv(text) {
  const result = {};
  for (const originalLine of text.split(/\r?\n/u)) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function serializeEnv(values, comments = []) {
  const lines = [...comments];
  for (const [key, value] of Object.entries(values)) {
    lines.push(`${key}=${String(value ?? "")}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function readEnvFile(path) {
  return parseEnv(await readFile(path, "utf8"));
}

export async function writeEnvFile(path, values) {
  await writeFile(path, serializeEnv(values, ["# Gerado pelo EasySaaS. Não versionar este arquivo."]), {
    encoding: "utf8",
    mode: 0o600,
  });
}
