# 盲文点字学习训练器

纯前端盲文点字学习与练习工具，支持点阵字符卡片、听写练习、错题本和学习进度统计，数据存 IndexedDB。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20111>



## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`



## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Material UI + Zustand + IndexedDB |
| 后端 | - |
| 数据库 | 本地模拟数据 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件封装 async API（本地 db + 入队）
├── stores/               # Zustand 独立 store，禁止全放组件 state
├── types/                # 数据模型类型定义（含同步元数据）
├── constants/            # 枚举、日志模板、错误信息、状态文案
├── constructors/         # 默认对象、表单对象、导入数据构造器
├── components/common/    # 共享组件（BrailleCell / SyncBanner / SyncGate 等）
├── hooks/                # 自定义 hook（useOnlineStatus / useSyncQueue 等）
├── pages/                # 路由页面（学习/练习/错题/进度/同步中心）
├── router/
├── services/             # 离线同步核心（outbox / sync / migration / 课程版本）
├── db/                   # IndexedDB 封装（lessons/sessions/records/outbox/meta）
├── workers/              # 后台同步计时 Worker（退避 + 断点续传）
├── utils/                # 幂等键、内容指纹、格式化
└── mocks/                # 本地种子数据（历史数据，迁移回填同步标识）
```

## 离线训练同步流程（断网课堂）

断网课堂场景：两个标签页做完同一课程，回网时练习会话会盖掉先写的答题记录。为此把课程、练习会话、答题记录接入**可恢复的离线训练流程**：

- **断网继续作答**：所有写入先落本地 IndexedDB 并进入 outbox 队列，刷新/断网不丢。
- **按答题记录合并**：每条记录用客户端生成的 `client_id`（uuid）做全局身份，远端按 `client_id` 取并集合并答题记录，会话不再覆盖记录。
- **重复同步只收一次**：远端按 `client_id` 幂等去重，重复推送只确认接收一次。
- **课程内容变化 → 旧结果失效**：课程内容指纹（`content_hash`）变化后，已有会话/进度标记 `stale` 并重算，旧成绩从进度统计剔除。
- **写入失败 → 保留队列、断点续传**：失败项保留在 outbox，记录失败原因与重试次数，检查点（checkpoint）之前的成功项不重复处理，恢复后从断点继续。
- **历史数据兼容迁移**：启动时迁移服务为缺少同步标识的历史数据回填 `client_id` / `sync_status` / `lesson_version`，幂等执行。
- **页面可见、处理完再练习**：同步中心（`/sync`）展示待同步、冲突、失败原因；有未处理的冲突/失败时，练习门禁（SyncGate）阻止进入练习。

本地数据分层：**本地 IndexedDB**（`braille-trainer-db`）存课程/会话/记录/outbox/meta；**远端服务器**用 localStorage 模拟（`braille-trainer:remote-store`），同一浏览器多标签页共享，对应"两个标签页同步到同一台服务器"。

同步中心提供两个演示开关：**强制离线**（模拟断网课堂）与**模拟写入失败**（演示断点续传）。

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `braille-trainer`
- `FRONTEND_PORT`: 前端端口，默认 `20111`


## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: braille-trainer`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-braille-trainer}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- PracticeMode: constants/PracticeMode、types/PracticeMode、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- SymbolCategory: constants/SymbolCategory、types/SymbolCategory、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- MasteryLevel: constants/MasteryLevel、types/MasteryLevel、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
