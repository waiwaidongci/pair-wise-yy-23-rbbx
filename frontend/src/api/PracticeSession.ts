import { idbGetAll } from "../services/db";
import { seedPracticeSessions } from "../mocks/seedData";
import type { PracticeSession } from "../types/PracticeSession";

const endpoint = "/api/practice-session";

export async function listPracticeSession(): Promise<PracticeSession[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  const local = await idbGetAll("practiceSession");
  return local.length ? local : structuredClone(seedPracticeSessions);
}

export async function savePracticeSession(payload: PracticeSession) {
  console.info("save PracticeSession", payload);
  return payload;
}
