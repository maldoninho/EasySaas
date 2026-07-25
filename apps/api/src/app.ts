import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { env } from "@easysaas/config";
import { HttpError } from "./lib/http.js";
import { registerSecurity } from "./plugins/security.js";
import { accountRoutes } from "./routes/account.js";
import { adminAppRoutes } from "./routes/admin-app.js";
import { adminAuditRoutes } from "./routes/admin-audit.js";
import { adminLandingRoutes } from "./routes/admin-landing.js";
import { adminModuleRoutes } from "./routes/admin-modules.js";
import { adminSystemRoutes } from "./routes/admin-system.js";
import { adminUserRoutes } from "./routes/admin-users.js";
import { authRoutes } from "./routes/auth.js";
import { navigationRoutes } from "./routes/navigation.js";
import { publicRoutes } from "./routes/public.js";
import { activationRoutes } from "./routes/activation.js";
import { setupRoutes } from "./routes/setup.js";
import { registerGeneratedModuleServers } from "./generated/module-server-registry.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStatusCode(error: unknown): number {
  if (error instanceof HttpError) {
    return error.statusCode;
  }

  if (isRecord(error) && typeof error.statusCode === "number") {
    const statusCode = Math.trunc(error.statusCode);
    if (statusCode >= 400 && statusCode <= 599) {
      return statusCode;
    }
  }

  return 500;
}

function readErrorCode(error: unknown, statusCode: number): string {
  if (error instanceof HttpError) {
    return error.code;
  }

  if (isRecord(error) && typeof error.code === "string" && error.code.trim().length > 0) {
    return error.code;
  }

  return statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
}

function readPublicMessage(error: unknown, statusCode: number): string {
  if (statusCode >= 500) {
    return "Ocorreu um erro interno.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "A requisição não pôde ser processada.";
}

export async function buildApp(options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? { level: env.logLevel },
    trustProxy: env.trustProxy,
    bodyLimit: 1_048_576,
    requestIdHeader: "x-request-id",
    genReqId: () => randomUUID(),
    disableRequestLogging: false,
  });

  await registerSecurity(app);
  await publicRoutes(app);
  await setupRoutes(app);
  await activationRoutes(app);
  await authRoutes(app);
  await accountRoutes(app);
  await navigationRoutes(app);
  await adminUserRoutes(app);
  await adminAppRoutes(app);
  await adminModuleRoutes(app);
  await adminLandingRoutes(app);
  await adminSystemRoutes(app);
  await adminAuditRoutes(app);
  await registerGeneratedModuleServers(app);

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Rota não encontrada.",
        requestId: request.id,
      },
    }),
  );

  app.setErrorHandler((error: unknown, request, reply) => {
    request.log.error({ err: error }, "Request failed");

    const statusCode = readStatusCode(error);
    const knownError = error instanceof HttpError;

    return reply.status(statusCode).send({
      error: {
        code: readErrorCode(error, statusCode),
        message: readPublicMessage(error, statusCode),
        requestId: request.id,
        details: knownError ? error.details : undefined,
      },
    });
  });

  return app;
}
