export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 退避后重试；最终仍失败时由调用方把队列项保留为 FAILED，实现断点续传 */
export async function withRetry<T>(task: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await delay(baseDelayMs * 2 ** i);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
