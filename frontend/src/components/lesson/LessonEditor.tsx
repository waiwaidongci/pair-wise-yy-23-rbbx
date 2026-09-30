import { useState } from "react";
import { lessonService } from "../../services/lessonService";
import { useLessonStore } from "../../stores/LessonStore";
import { useSyncStore } from "../../stores/SyncStore";
import { StatusBadge } from "../common/StatusBadge";
import type { Lesson } from "../../types/Lesson";

/** 修改课程内容（字符集合/标题），保存后 revision 前进、content_hash 重算，旧会话在下次同步时失效 */
export function LessonEditor({ lesson }: { lesson: Lesson }) {
  const reload = useLessonStore((state) => state.load);
  const flush = useSyncStore((state) => state.flush);
  const [title, setTitle] = useState(lesson.title);
  const [symbolIds, setSymbolIds] = useState(lesson.symbol_ids.join(","));
  const [saving, setSaving] = useState(false);

  const dirty = title !== lesson.title || symbolIds !== lesson.symbol_ids.join(",");

  const save = async () => {
    setSaving(true);
    try {
      const ids = symbolIds
        .split(/[,，]/)
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isFinite(id) && id > 0);
      await lessonService.updateContent(lesson, { title, symbol_ids: ids });
      await reload();
      await flush();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lesson-editor">
      <div className="lesson-editor-head">
        <strong>{lesson.title}</strong>
        <StatusBadge value={lesson.sync_state} />
      </div>
      <label>
        课程标题
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        字符 id（逗号分隔，修改后旧练习结果失效重算）
        <input value={symbolIds} onChange={(event) => setSymbolIds(event.target.value)} />
      </label>
      <div className="lesson-editor-meta">
        <span>revision: {lesson.revision}</span>
        <span>hash: {lesson.content_hash}</span>
      </div>
      <button className="sim-button" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? "保存中…" : "保存课程变更"}
      </button>
    </div>
  );
}
