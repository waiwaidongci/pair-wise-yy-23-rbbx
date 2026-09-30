import { useMemo, useState } from "react";

/** 列表分页 hook，练习会话/错题/进度页面共用 */
export function usePracticeSession<T>(rows: T[] = []) {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);
  return { page, setPage, pageSize, pageRows, total: rows.length };
}
