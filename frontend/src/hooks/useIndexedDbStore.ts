import { useEffect, useMemo, useState } from "react";
import { idbGetAll, type StoreName } from "../services/db";

/** 从 IndexedDB 读取实体表并分页；队列/服务端合并导致行数变化时自动刷新当前页 */
export function useIndexedDbStore<T>(store: StoreName) {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const refresh = () => {
    void idbGetAll(store).then((all) => setRows(all as T[]));
  };

  useEffect(() => {
    refresh();
    const onTick = () => refresh();
    window.addEventListener("storage", onTick);
    return () => window.removeEventListener("storage", onTick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);
  return { rows, pageRows, page, setPage, pageSize, total: rows.length, refresh };
}
