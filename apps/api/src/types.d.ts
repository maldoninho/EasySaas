import type { CurrentUser } from "./services/session.js";
declare module "fastify" {
  interface FastifyRequest { currentUser?:CurrentUser; sessionId?:string; csrfTokenHash?:string; }
}
export {};
