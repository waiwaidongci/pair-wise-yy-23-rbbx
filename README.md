# 盲文点字学习训练器

纯前端盲文点字学习与练习工具，支持点阵字符卡片、听写练习、错题本和学习进度统计；练习数据存 IndexedDB，并内置**可恢复的离线训练同步流程**：断网继续作答、回网按答题记录合并、重复同步只收一次、课程变化后旧结果失效重算、写入失败断点续传、历史数据兼容迁移。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 离线可恢复训练流程

针对“断网课堂，两个标签页做完同一课程，回网时练习会话盖掉先写的答题记录”：

1. **断网继续作答**：每条答题记录立即写入 IndexedDB，同时向 outbox 队列入队一个带 `op_id` 的写操作；断网期间 flush 直接返回 `NETWORK_OFFLINE`，队列不丢。
2. **回网按答题记录合并**：服务端（localStorage 模拟，跨标签页共享）按 `session_uid` 定位会话、按 `record_uid` 合并答题记录，会话的分数/错题数由合并后的答题记录重算，不再整会话覆盖。
3. **重复同步只收一次**：服务端记录已处理的 `op_id`，重复投递直接返回首次结果（幂等去重）。
4. **课程内容变化后旧结果失效**：课程保存时重算 `content_hash` 与乐观锁 `revision`；reconcile 发现会话上的内容指纹过期，会把会话及其答题记录标记为 `STALE`，进度与错题只统计有效记录。
5. **写入失败保留队列并断点续传**：失败项标 `FAILED`、保留错误码与原因，从 seq 顺序续传；`IN_FLIGHT` 中断项重启后自动重发（幂等安全）。
6. **历史数据兼容迁移**：启动时检测缺少同步标识（`sync_state`/`revision`/uid）的旧行，先补齐标识并修正错型字段（如旧 mock 的字符串型 `correct`/`score`），迁移幂等且只执行一次。
7. **页面提示与练习闸门**：顶部状态条显示在线状态、待同步数、冲突数、失败数与失败原因；练习页有冲突处理中心，未处理冲突或失败队列时禁止开始新练习（“处理完再练习”）。

练习页还提供“离线训练演练台”：可手动模拟断网/恢复、注入一次 500 写入失败，便于在两个标签页中演示完整流程。

## 访问地址或 CLI 示例

前端：<http://localhost:20111>

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`
- 构建：`cd frontend && npm run build`

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Material UI + Zustand + IndexedDB |
| 后端 | 无真实后端；localStorage 模拟跨标签页共享的服务端与幂等合并 |
| 数据库 | IndexedDB（实体表 + outbox 队列 + conflicts 冲突表 + meta） |
| 部署 | Docker Compose（Nginx 托管 SPA） |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 async API；api/server/ 为模拟服务端
│   └── server/           # network、failureSimulator、serverStore、mergeEngine（合并/幂等/冲突）
├── stores/               # Zustand 独立 store（四个实体 store + SyncStore + PracticeDraftStore）
├── types/                # 数据模型与同步状态类型（SyncState/OutboxState/SyncOutboxItem/SyncConflict…）
├── constants/            # 枚举、日志模板、错误码/错误消息、同步配置 syncConfig
├── constructors/         # 默认对象/表单/响应构造器
├── components/common/    # BrailleCell、LessonProgress、PracticePanel、ResultBadge、ChartPanel 等
├── components/sync/      # SyncStatusBar、ConflictCenter、NetworkSimulator
├── components/lesson/    # LessonEditor（触发内容指纹重算）
├── hooks/                # useBraillePattern、usePracticeSession、useIndexedDbStore、usePracticeRunner、useSyncStatus
├── pages/                # learn / practice / mistakes / progress 四个路由页面
├── router/
├── services/             # db、bootstrap、queueManager、practiceService、lessonService、conflictService、progressSelectors
│   ├── sync/             # syncEngine（flush/断点续传/reconcile/失效重算）、outboxFactory
│   └── migration/        # legacyNormalizer、migrationRunner（兼容迁移）
├── utils/                # logger、uid、hash、retry、formatters
├── mocks/                # 带同步标识的规范种子数据
└── workers/              # 如有耗时计算，放 Web Worker
```

## 同步数据标识

- 课程/字符：`revision`（乐观锁）、`content_hash`（课程内容指纹）、`sync_state`
- 练习会话：`session_uid`（跨标签页合并键）、`content_hash`（开始时的课程指纹）、`lesson_revision`
- 答题记录：`record_uid`（单题幂等键）、`session_uid`、`answered_at`
- outbox：`op_id`（服务端幂等键）、`seq`（断点顺序）、`state`（QUEUED/IN_FLIGHT/FAILED/CONFLICT）、`force`（冲突保留本地时强制覆盖）、错误码与原因
- 同步状态：`NEW_LOCAL / PENDING / SYNCED / CONFLICT / STALE`

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `braille-trainer`
- `FRONTEND_PORT`: 前端端口，默认 `20111`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: braille-trainer`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-braille-trainer}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`，浏览器端清空站点数据（IndexedDB 与 localStorage）可重置演示状态。

## 枚举/常量出现位置清单

- PracticeMode (`CELL_TO_TEXT / TEXT_TO_CELL / LISTENING / MIXED`)：
  `constants/PracticeMode`、`types/PracticeMode`、constructors（PracticeSessionConstructor）、
  logTemplates（PracticeSession 模板组）、errorMessages、练习页模式筛选器/模式选择、
  ProgressPage 会话详情展示、SyncStore 日志、模拟服务端占位会话。
- SymbolCategory (`LETTER / NUMBER / PUNCTUATION / CONTRACTION`)：
  `constants/SymbolCategory`、`types/SymbolCategory`、constructors（BrailleSymbolConstructor）、
  logTemplates（BrailleSymbol 模板组）、errorMessages、学习页筛选器、状态徽章展示、种子数据。
- MasteryLevel (`NEW / LEARNING / FAMILIAR / MASTERED`)：
  `constants/MasteryLevel`、`types/MasteryLevel`、constructors、logTemplates、errorMessages、
  `services/progressSelectors.masteryBySymbol`、ProgressPage 掌握程度分布图、StatusBadge 展示。
- SyncState (`NEW_LOCAL / PENDING / SYNCED / CONFLICT / STALE`)：
  `types/SyncState`、`constants/SyncStateText`、四个核心模型类型与构造器、
  syncEngine（reconcile/失效重算/冲突标记）、mergeEngine（服务端权威置 SYNCED）、
  legacyNormalizer（迁移补 NEW_LOCAL）、formatters/StatusBadge（中文展示）、
  SyncStatusBar/ConflictCenter/四个页面（待同步、冲突、失效提示）。
- OutboxState (`QUEUED / IN_FLIGHT / FAILED / CONFLICT`)：
  `types/OutboxState`、`constants/SyncStateText`、outboxFactory、syncEngine、SyncStatusBar。
- ConflictStatus (`OPEN / RESOLVED_LOCAL / RESOLVED_REMOTE`)：
  `types/ConflictStatus`、`constants/SyncStateText`、conflictService、ConflictCenter。
- 错误码（`constants/errorCodes` + `constants/errorMessages`）：
  `NETWORK_OFFLINE`、`SYNC_WRITE_FAILED`、`VERSION_CONFLICT`、`LESSON_CONTENT_CHANGED`、
  `RECORD_MERGE_CONFLICT`、`MIGRATION_REQUIRED`，在 network、failureSimulator、mergeEngine、
  syncEngine、legacyNormalizer、formatters.formatFailureReason、SyncStatusBar/ConflictCenter 中被引用。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；同步标识（uid/revision/content_hash/sync_state）贯穿类型、构造器、种子、outbox、模拟服务端合并引擎、同步引擎、store、页面与状态徽章，修改一个状态值通常需要同步类型、构造器、服务、store、页面、README 与数据库种子。

## License

MIT
