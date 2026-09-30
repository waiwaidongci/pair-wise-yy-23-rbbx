import { idbDelete, idbGetAll, idbPut } from "./db";
import { syncEngine } from "./sync/syncEngine";
import { logOperation } from "../utils/logger";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { Lesson } from "../types/Lesson";
import type { SyncConflict } from "../types/SyncConflict";
import type { SyncOutboxItem } from "../types/SyncOutboxItem";
import type { SyncReport } from "../types/SyncReport";

/** 页面处理冲突：保留本地（重新强制入队）或采用远端（丢弃本地版本），处理完再练习 */
export const conflictService = {
  async resolve(conflictId: string, resolution: "LOCAL" | "REMOTE"): Promise<SyncReport> {
    const conflicts = await idbGetAll("conflicts");
    const conflict = conflicts.find((item) => item.id === conflictId);
    if (!conflict || conflict.status !== "OPEN") {
      return syncEngine.flush();
    }

    const queue = await idbGetAll("outbox");
    const relatedItems = queue.filter(
      (item) => item.state === "CONFLICT" && item.entity === conflict.entity && item.entity_id === conflict.entity_id
    );

    if (resolution === "LOCAL") {
      for (const item of relatedItems) {
        await idbPut("outbox", {
          ...item,
          force: true,
          state: "QUEUED",
          attempts: 0,
          last_error_code: "",
          last_error_message: "",
          updated_at: new Date().toISOString()
        });
      }
      logOperation(conflict.entity, 4, { conflictId, resolution: "LOCAL" });
    } else {
      await this.applyRemote(conflict, relatedItems);
      for (const item of relatedItems) {
        await idbDelete("outbox", item.op_id);
      }
      logOperation(conflict.entity, 4, { conflictId, resolution: "REMOTE" });
    }

    conflict.status = resolution === "LOCAL" ? "RESOLVED_LOCAL" : "RESOLVED_REMOTE";
    conflict.resolved_at = new Date().toISOString();
    await idbPut("conflicts", conflict);
    return syncEngine.flush();
  },

  /** 采用远端：本地实体行替换为权威版本；被否的本地答题记录直接删除 */
  async applyRemote(conflict: SyncConflict, relatedItems: SyncOutboxItem[] = []) {
    if (conflict.entity === "Lesson") {
      const remote = JSON.parse(conflict.remote_payload) as Lesson;
      await idbPut("lesson", { ...remote, sync_state: "SYNCED" });
    } else if (conflict.entity === "AnswerRecord") {
      const remote = JSON.parse(conflict.remote_payload) as AnswerRecord;
      if (remote && remote.record_uid) {
        await idbPut("answerRecord", { ...remote, sync_state: "SYNCED" });
      }
      for (const item of relatedItems) {
        await idbDelete("answerRecord", item.entity_id);
      }
    }
  },

  async listOpen(): Promise<SyncConflict[]> {
    const conflicts = await idbGetAll("conflicts");
    return conflicts.filter((item) => item.status === "OPEN");
  },

  /** 有任何未处理冲突时禁止开始新练习（“处理完再练习”） */
  async hasOpenConflict(): Promise<boolean> {
    return (await this.listOpen()).length > 0;
  }
};
