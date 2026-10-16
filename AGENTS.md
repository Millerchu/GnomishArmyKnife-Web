# GnomishArmyKnife Web Agent 指南

本文件适用于 GnomishArmyKnife-Web 前端仓库。技术栈为 Vue 3、Vite 7、Vue Router 和 Axios，使用 JavaScript 与 Vue 单文件组件。

## 仓库边界与启动清单

- 本仓库只维护前端代码，Git 命令在本仓库根目录执行。
- 完整 GAK 工作区中，本仓库位于 `repos/frontend`，配套后端位于 `../backend`，工作区跨端文档位于 `../../docs`；独立克隆时先读本仓库 `README.md`、`docs/architecture.md` 和 `docs/README.md`。
- 修改前执行 `git status --short --branch`，读取目标目录中更具体的 `AGENTS.md`，保留用户已有改动。
- 先明确目标用户流、影响页面、接口契约和验收方式，优先完成小的纵向切片。
- 除非用户明确要求，否则不要提交或推送 Git；提交时只暂存本次任务文件。
- 不提交密钥、Token、私钥或本地环境配置；`VITE_*` 会进入浏览器产物，不能存放秘密。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `src/views` | 路由页面、页面交互与数据加载 |
| `src/components` | 共享组件、业务编辑器、对话框 |
| `src/api` | 业务 API wrapper 与统一请求客户端 `request.js` |
| `src/router/index.js` | 路由、懒加载与导航守卫 |
| `src/store/user.js` | 用户状态；当前未使用 Pinia/Vuex |
| `src/constants` | 应用目录、图标、字典用途、快速新增类型与业务选项 |
| `src/utils` | 可复用转换、登录存储与纯函数 |
| `src/features/messages` | 消息状态、SSE 和相关样式 |
| `src/features/instrument-practice` | 乐器界面、音频、录制与相关逻辑 |
| `public` | 图标、乐器采样等静态资源 |
| `docs` | 本仓库实现说明与文档索引 |

## 开发约定

- 先搜索已有页面、编辑器和提交链路，复用 `MacDialog.vue`、`SystemDialogHost.vue`、鉴权图片及图标组件。
- 页面状态按列表、表单、洞察、图表等业务块拆分；共享逻辑放在聚焦的组件、`utils` 或 `features` 中。
- API 调用统一放在 `src/api`，页面中不要直接拼接请求地址。
- `computed` 只做派生，不写副作用；数据加载和状态更新放在事件或显式函数中。
- 演示数据、mock 与业务 localStorage 回退逻辑上线前移除；测试 mock 和登录状态存储按各自用途保留。
- 样式兼顾响应式与信息密度，表单改动检查桌面端和移动端，以及加载、空数据、错误和未保存状态。
- 注释解释业务约束、兼容原因与边界；TODO 写明待处理事项。

## 接口与跨端协作

- 以配套后端 Controller、DTO/VO 和 Service 为契约来源，核对字段、默认值、状态、校验、权限与错误语义。
- 普通成功码为字符串 `"0"`，分页通常为 `data.list` / `data.total`；请求拦截器保留 Axios response，按实际响应解包。下载与 SSE 单独处理。
- 后端 Long ID 按字符串处理，避免转为 JavaScript Number 丢失精度。
- 新增应用时同步检查页面、路由、API wrapper、`src/constants/appCatalog.js`、`featureCode`、图标与应用授权。
- 前端可见性和路由守卫不能替代后端授权；不能仅凭目录中的状态、密级或加密标记认定功能可用。
- 修改行程、健康与账单关联，以及附件和消息功能时，检查相关模块的数据同步、归属与失败处理。
- 当前需求看板内嵌 `Home.vue`；新增入口前先核对现有组织方式。接口是否存在以当前后端源码和联调结果为准。
- 跨端说明在完整工作区的 `../../docs` 维护，前端实现细节在本仓库 `docs` 维护。

## 快速新增同步规则

- 每次修改应用功能或接口时，必须评估主界面“快速新增”的同步影响；新增应用或业务数据类型时，检查是否需要提供快捷入口。
- 必查 `src/constants/quickCreateRegistry.js`、`src/components/QuickCreateDialog.vue` 和 `src/views/Home.vue`。快速新增类型独立维护，应用目录更新不会自动同步。
- 新增表单的字段、默认值、选项、校验、权限、依赖数据或提交逻辑调整时，同步检查应用页面与快捷表单，保持后端契约及业务行为一致。
- 优先复用业务规则与编辑组件，避免两套新增逻辑长期分叉；快捷入口须具备实际可用的接口和对应权限。
- 需要宝宝、车辆等关联对象时，处理默认选择、空数据和加载失败，不能直接复制静态表单而遗漏依赖逻辑。
- 验收覆盖桌面端和移动端入口、权限过滤、类型选择、表单初始化、校验与提交；行为变化时同步更新相关测试。
- 交付说明必须注明快速新增同步内容，或说明不适用的原因；未完成同步时明确记录缺口。

## 环境与验证

建议 Node.js 22.12+；Vite 7 要求 Node.js 20.19+ 或 22.12+。先检查 `node --version`，使用满足要求的运行时。

以下命令在本仓库根目录执行，已有依赖且锁文件未变化时无需重复安装：

```powershell
npm ci
npm run dev
```

开发代理在 `vite.config.js` 配置，默认把 `/api` 去掉后转发到 `http://localhost:8080`；可用 `.env.local` 中的 `VITE_API_PROXY_TARGET` 调整，修改后重启 Vite。后端单独启动。

代码或 UI 行为变更默认验证：

```powershell
npm run test
npm run build
```

- `test:unit` 使用 Node test runner，具体扫描路径见 `package.json`。
- `test:component` 使用 Vitest，扫描 `src/components/__tests__` 和 `src/views/__tests__`，排除 `*.test.js` 与 `.worktrees`；不会自动覆盖 `features` 下的组件规格，涉及该目录时补跑对应规格。
- `npm run test` 顺序执行上述两组；构建产物在 `dist`，构建通过不能替代真实后端联调。
- 仅修改文档时检查内容、路径与 `git diff --check`，无需运行应用测试或构建。
- 调整部署时核对 `nginx.conf` 的 history 回退、`/api` 前缀改写与 SSE 配置。

## 交付说明

- 说明修改文件、行为变化、快速新增同步情况、执行的验证与尚需联调的内容。
- 测试、编译、运行联调和部署分别报告，不把源码核对当成线上验证。
- 可复用的前端维护规则补充到本文件或本仓库 `docs`；跨端规则同时检查工作区指南。
