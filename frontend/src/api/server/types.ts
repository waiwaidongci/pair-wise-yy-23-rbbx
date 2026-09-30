import type { BrailleSymbol } from "../../types/BrailleSymbol";
import type { Lesson } from "../../types/Lesson";
import type { PracticeSession } from "../../types/PracticeSession";
import type { AnswerRecord } from "../../types/AnswerRecord";

/** localStorage 模拟的服务端全量状态，所有标签页共享同一份 */
export interface MockServerState {
  brailleSymbols: BrailleSymbol[];
  lessons: Lesson[];
  practiceSessions: PracticeSession[];
  answerRecords: AnswerRecord[];
  /** 已处理过的 op_id -> 首次处理时间，重复同步只收一次 */
  processedOps: Record<string, string>;
}

export class MockServerError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
    public detail?: unknown
  ) {
    super(message);
    this.name = "MockServerError";
  }
}

export interface SaveResult {
  entity: string;
  canonical: BrailleSymbol | Lesson | PracticeSession | AnswerRecord;
  /** 幂等命中：该 op_id 之前已经收过，本次不再处理 */
  deduped: boolean;
  /** 会话按答题记录合并时新并入的记录数 */
  mergedRecords?: AnswerRecord[];
}
