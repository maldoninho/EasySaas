import type { ComponentType } from "react";
export interface ModuleDefinition { stableId:string; loadView:()=>Promise<{default:ComponentType}>; }
export function defineModule<T extends ModuleDefinition>(definition:T):T { return Object.freeze(definition); }
export interface ModuleServerContext { stableId:string; requirePermission:(permission:string)=>unknown; }
export type ModuleServerRegistrar = (app: unknown, context:ModuleServerContext)=>Promise<void>|void;
