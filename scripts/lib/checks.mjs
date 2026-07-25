import { access, constants, mkdir, rm, statfs, writeFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";

export async function checkWritable(directory) {
  await mkdir(directory, { recursive: true });
  await access(directory, constants.W_OK);
  const testFile = `${directory}/.write-test-${randomUUID()}`;
  await writeFile(testFile, "ok", "utf8");
  await rm(testFile, { force: true });
}

export async function getFreeDiskBytes(directory) {
  const stats = await statfs(directory);
  return Number(stats.bavail) * Number(stats.bsize);
}

export async function checkInternet() {
  await lookup("registry.npmjs.org");
}

export async function canConnect(host, port, timeoutMs = 1500) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function canBind(host, port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host, port }, () => server.close(() => resolve(true)));
  });
}
