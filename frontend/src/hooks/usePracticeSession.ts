import { useCallback, useMemo, useState } from "react";
import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { lessonHash } from "../services/lessonVersionService";

export interface PracticeQuestion {
  symbol: BrailleSymbol;
  options: string[]; // 选择题选项（字母）
  startedAt: number;
}

export interface PracticeResult {
  session: PracticeSession;
  total: number;
  correct: number;
  mistake_count: number;
}

/**
 * 练习会话流程 hook。
 *
 * 断网可用：开始会话、逐题作答、结束会话都通过 store 写本地并入队，
 * 联网后按 client_id 幂等合并；答题记录按 client_id 取并集，不被会话盖掉。
 */
export function usePracticeSession(lesson: Lesson | undefined, symbols: BrailleSymbol[]) {
  const sessionStore = usePracticeSessionStore();
  const recordStore = useAnswerRecordStore();

  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);

  const lessonSymbols = useMemo(
    () => symbols.filter((s) => lesson?.symbol_ids.includes(s.id)),
    [symbols, lesson]
  );

  const start = useCallback(async () => {
    if (!lesson || lessonSymbols.length === 0) return;
    const now = new Date().toISOString();
    const newSession: PracticeSession = {
      id: 0,
      lesson_id: lesson.id,
      mode: "CELL_TO_TEXT",
      started_at: now,
      finished_at: "",
      score: 0,
      mistake_count: 0,
      lesson_version: lesson.content_hash ?? lessonHash(lesson)
    };
    const saved = await sessionStore.save(newSession);

    // 出题：课程内字符打乱，每题 4 个选项
    const pool = [...lessonSymbols].sort(() => Math.random() - 0.5);
    const qs: PracticeQuestion[] = pool.map((sym) => {
      const distractors = symbols
        .filter((s) => s.id !== sym.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((s) => s.letter);
      const options = [...distractors, sym.letter].sort(() => Math.random() - 0.5);
      return { symbol: sym, options, startedAt: Date.now() };
    });

    setSession(saved);
    setQuestions(qs);
    setCurrentIndex(0);
    setCorrectCount(0);
    setLastCorrect(null);
    setResult(null);
    setPhase("active");
  }, [lesson, lessonSymbols, symbols, sessionStore]);

  const answer = useCallback(
    async (userAnswer: string) => {
      if (!session || phase !== "active") return;
      const q = questions[currentIndex];
      if (!q) return;
      const isCorrect = userAnswer === q.symbol.letter;
      const latency = Date.now() - q.startedAt;

      const record: AnswerRecord = {
        id: 0,
        session_id: session.id,
        session_client_id: session.client_id,
        symbol_id: q.symbol.id,
        user_answer: userAnswer,
        correct: isCorrect,
        latency_ms: latency,
        mistake_reason: isCorrect ? null : "点阵识别错误",
        lesson_version: session.lesson_version
      };
      await recordStore.save(record);

      const nextCorrect = correctCount + (isCorrect ? 1 : 0);
      setCorrectCount(nextCorrect);
      setLastCorrect(isCorrect);

      if (currentIndex + 1 >= questions.length) {
        // 结束会话
        const finishedAt = new Date().toISOString();
        const total = questions.length;
        const score = Math.round((nextCorrect / total) * 100);
        const mistakeCount = total - nextCorrect;
        const finished: PracticeSession = {
          ...session,
          finished_at: finishedAt,
          score,
          mistake_count: mistakeCount
        };
        const saved = await sessionStore.save(finished);
        setResult({ session: saved, total, correct: nextCorrect, mistake_count: mistakeCount });
        setPhase("done");
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [session, phase, questions, currentIndex, correctCount, recordStore, sessionStore]
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setSession(null);
    setQuestions([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setLastCorrect(null);
    setResult(null);
  }, []);

  return {
    phase,
    session,
    questions,
    currentIndex,
    current: questions[currentIndex],
    correctCount,
    lastCorrect,
    result,
    start,
    answer,
    reset,
    total: questions.length
  };
}
