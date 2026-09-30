import { mockData } from "../mocks/seedData";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { LOG_TEMPLATES } from "../constants/logTemplates";

const endpoint = "/api/braille-symbol";

export async function listBrailleSymbol(): Promise<BrailleSymbol[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // 本地参考数据兜底，离线也可用
    }
  }
  return [...(mockData.brailleSymbol as unknown as BrailleSymbol[])];
}

export async function saveBrailleSymbol(payload: BrailleSymbol): Promise<BrailleSymbol> {
  console.info(`[BrailleSymbol] ${LOG_TEMPLATES.BrailleSymbol[0]}`, payload);
  return payload;
}
