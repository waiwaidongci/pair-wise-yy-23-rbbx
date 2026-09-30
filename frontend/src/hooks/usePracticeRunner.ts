import { useCallback, useState } from "react";
import { usePracticeDraftStore } from "../stores/PracticeDraftStore";
import { practiceService, type AnswerInput } from "../services/practiceService";
import { useSyncStore } from "../stores/SyncStore";
import type { Lesson } from "../types/Lesson";
import type { PracticeMode } from "../constants/PracticeMode";

/** 驱动一次可离线继续的练习：开始、逐题作答（立即持久化+入队）、结束后触发合并同步 */
export function usePracticeRunner() {
  const draft = usePracticeDraftStore((state) => state.draft);
  const setDraft = usePracticeDraftStore((state) => state.setDraft);
  const appendRecord = usePracticeDraftStore((state) => state.appendRecord);
  const replaceSession = usePracticeDraftStore((state) => state.replaceSession);
  const clearDraft = usePracticeDraftStore((state) => state.clear);
  const flush = useSyncStore((state) => state.flush);
  const [submitting, setSubmitting] = useState(false);

  const start = useCallback(
    async (lesson: Lesson, mode: PracticeMode) => {
      const session = await practiceService.startSession({ lesson, mode });
      setDraft({ session, records: [], currentIndex: 0 });
      void flush();
    },
    [setDraft, flush]
  );

  const answer = useCallback(
    async (input: AnswerInput) => {
      if (!draft) return;
      setSubmitting(true);
      try {
        const record = await practiceService.saveAnswer(draft.session, input);
        appendRecord(record);
        void flush();
      } finally {
        setSubmitting(false);
      }
    },
    [draft, appendRecord, flush]
  );

  const finish = useCallback(async () => {
    if (!draft) return;
    const session = await practiceService.finishSession(draft.session.session_uid, draft.records);
    replaceSession(session);
    clearDraft();
    await flush();
  }, [draft, replaceSession, clearDraft, flush]);

  return { draft, start, answer, finish, submitting };
}
