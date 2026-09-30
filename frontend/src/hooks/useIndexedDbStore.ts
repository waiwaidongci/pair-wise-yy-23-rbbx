import { useCallback, useEffect, useState } from "react";
import { STORES, getAll } from "../db";

/**
 * 通用 IndexedDB 集合 hook。
 * 按 store 名加载本地数据，暴露 loading / rows / reload，
 * 供页面直接消费本地持久化数据（离线可用）。
 */
export function useIndexedDbStore<T>(storeName: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAll<T>(storeName);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载本地数据失败");
    } finally {
      setLoading(false);
    }
  }, [storeName]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}

export { STORES };
