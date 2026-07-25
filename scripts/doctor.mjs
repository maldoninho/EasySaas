import { runDoctor } from "./lib/doctor-core.mjs";

const args = new Set(process.argv.slice(2));
const phase = args.has("--preinstall") ? "preinstall" : args.has("--prestart") ? "prestart" : "default";
const report = await runDoctor({ phase });

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("\nEasySaaS Doctor\n");
  for (const item of report.results) {
    const icon = item.ok ? "✓" : item.level === "warning" ? "!" : "✗";
    console.log(`${icon} ${item.message}`);
    if (item.detail) console.log(`  ${item.detail}`);
  }
  console.log(report.ok ? "\nDiagnóstico aprovado.\n" : "\nDiagnóstico reprovado. Corrija os itens marcados com ✗.\n");
}

process.exitCode = report.ok ? 0 : 1;
