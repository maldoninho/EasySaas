export type UserStatus = "pending" | "active" | "blocked" | "disabled";
export type CategoryMode = "group" | "direct" | "index";
export type ModuleStatus = "scaffolded" | "validating" | "failed" | "ready" | "active" | "inactive" | "maintenance" | "invalid";
export type ValidationStatus = "pending" | "running" | "passed" | "failed";
export type LandingSectionType = "header" | "hero" | "features" | "benefits" | "cta" | "footer";

export interface ModuleManifest {
  schemaVersion: 1;
  stableId: string;
  name: string;
  version: string;
  description: string;
  function?: string;
  icon?: string;
  entryFile: "module.ts";
  viewFile: string;
  serverFile?: string;
  permissions: string[];
  coreCompatibility: string;
  suggestedCategory?: string;
  capabilities?: { frontend?: boolean; backend?: boolean; database?: boolean; jobs?: boolean };
}
export interface NavigationModule { id:string; stableId:string; name:string; slug:string; icon?:string; categorySlug:string; categoryName:string; }
export interface NavigationCategory { id:string; name:string; slug:string; icon?:string; mode:CategoryMode; modules:NavigationModule[]; directModule?:NavigationModule; }
export interface ApiErrorShape { error: { code:string; message:string; requestId?:string; details?:unknown } }

export const moduleSchema = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://easysaas.local/schemas/module.schema.json","type":"object","additionalProperties":false,"required":["schemaVersion","stableId","name","version","description","entryFile","viewFile","permissions","coreCompatibility"],"properties":{"schemaVersion":{"const":1},"stableId":{"type":"string","pattern":"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$","maxLength":80},"name":{"type":"string","minLength":2,"maxLength":100},"version":{"type":"string","pattern":"^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$"},"description":{"type":"string","minLength":2,"maxLength":500},"function":{"type":"string","maxLength":500},"icon":{"type":"string","maxLength":50},"entryFile":{"const":"module.ts"},"viewFile":{"type":"string","pattern":"^[a-zA-Z0-9_./-]+\\.tsx$"},"serverFile":{"type":"string","pattern":"^[a-zA-Z0-9_./-]+\\.ts$"},"permissions":{"type":"array","uniqueItems":true,"maxItems":100,"items":{"type":"string","pattern":"^[a-z0-9-]+\\.[a-z0-9-]+$"}},"coreCompatibility":{"type":"string","minLength":1,"maxLength":100},"suggestedCategory":{"type":"string","maxLength":80},"capabilities":{"type":"object","additionalProperties":false,"properties":{"frontend":{"type":"boolean"},"backend":{"type":"boolean"},"database":{"type":"boolean"},"jobs":{"type":"boolean"}}}}} as const;
