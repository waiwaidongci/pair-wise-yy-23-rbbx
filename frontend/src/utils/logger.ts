import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { EntityName } from "../types/EntityName";

/** 所有写操作都要经过这里记录日志，模板集中在 constants/logTemplates */
export function logOperation(entity: EntityName, templateIndex: number, detail?: Record<string, unknown>) {
  const template = LOG_TEMPLATES[entity]?.[templateIndex] ?? `未知操作(${entity})`;
  console.info(`[sync] ${template}`, detail ?? "");
}

export function logError(code: string, message: string, detail?: Record<string, unknown>) {
  console.warn(`[sync:${code}] ${message}`, detail ?? "");
}
