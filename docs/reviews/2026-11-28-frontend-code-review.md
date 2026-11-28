# GnomishArmyKnife-Web 前端代码全面审查报告

- **审查日期**：2026-11-28
- **审查范围**：`repos/frontend` 全仓源码（`src/api`、`src/router`、`src/store`、`src/composables`、`src/components`、`src/features`、`src/utils`、`src/constants`、`src/views`、`src/styles`）、单测/组件测试、构建与部署配置（`package.json`、`vite.config.js`、`nginx.conf`、`Dockerfile*`、`deploy.sh`、`rollback.sh`、`scripts/*`）
- **跨端契约参照**：`repos/frontend/AGENTS.md`、`E:\AIWorkspace\GAK\AGENTS.md` 及配套后端 `repos/backend`（Controller / DTO / VO / Service / `schema.sql`）
- **工作区基线**：`main` 分支（保留工作区已有的 `src/views/WowCharacterStats.vue` 与 `src/views/__tests__/wowCharacterDialog.component.spec.js` 未提交改动，本次审查为纯只读分析 + 新增本报告文件）

---

## 一、总体评价与验证基线

### 1.1 自动化测试与构建基线

| 检查项 | 运行环境 / 命令 | 结果 | 备注 |
| --- | --- | --- | --- |
| 默认终端 Node 检查 | `node --version`（系统默认 PATH） | `v14.21.3`（失败） | 不满足 Vite 7 所需的 Node `20.19+ / 22.12+`，直接执行 `npm test` 会报 `node: bad option: --test` |
| 单元测试 | Node `v24.13.0` + `npm run test:unit` | **175 / 175 通过** | 覆盖 `utils`、`constants`、`components`、`instrument-practice` 纯逻辑 |
| 组件测试 | Node `v24.13.0` + `npm run test:component` | **49 文件 / 513 用例通过**，1 跳过 | 运行期控制台存在十余次未 mock 请求直连 `127.0.0.1:3000` 的 `ECONNREFUSED` 噪音 |
| 特性目录组件测试 | `npx vitest run src/features --exclude "**/*.test.js"` | **1 文件 / 4 用例通过** | 默认 `npm run test` 未扫描该目录（存在门禁盲区） |
| 生产构建 | Node `v24.13.0` + `npm run build` | **通过**（6.83s） | 最大 chunk 为 `index`（287.87 kB）与 `Home`（236.15 kB） |

### 1.2 架构质量总评

`GnomishArmyKnife-Web` 呈现出清晰的**渐进式演进特征**：
- **亮点突出**：近期建设或重构的模块（如 `MacDialog` 对话框体系、首页 12 列工作台网格与乐观锁同步、`SystemLog`、`AiSubscriptions`、`GrowthRecords`、`TravelRecords`、随身乐器 WebAudio 引擎）架构边界清晰，具备良好的局域网 HTTP 降级设计（手写 `BigInt` RSA 加密、剪贴板回退、幂等键生成）、请求代次（generation / sequence）竞态隔离与 `Asia/Shanghai` 时区纯函数封装；全仓 API 调用已基本收口至 `src/api/*`，`computed` 普遍保持了纯派生无副作用。
- **核心短板**：
  1. **跨端契约与「快速新增」分叉**：快捷入口多处未同步业务页与后端 DTO 约束（如加油记录必报 400、软件仓库暴露无后端 404 入口）；个人中心误调管理员接口导致普通用户必现 403；需求看板上传附件但后端未接入导致截图静默丢失。
  2. **全局生命周期与超时边界**：`MessageHost` 双实例挂载/卸载竞态导致进入 `/home` 时实时消息会话被误杀；Axios 全局 `8000ms` 超时截断大文件上传与数据迁移导入导出。
  3. **安全与历史包袱**：注册与密码备忘二次校验仍存在明文传口令；`appCatalogDraft.js` 等未清理的业务 `localStorage` 回退逻辑掩盖真实报错并反向污染数据迁移；`WorkLog.vue`（5787 行）、`WowCharacterStats.vue`（5114 行）、`FuelStats.vue`（3702 行）等巨石组件维护成本较高。

### 1.3 审查发现统计

| 严重度 | 数量 | 核心分布领域 |
| --- | --- | --- |
| **高（High / P0）** | 12 | 消息会话竞态、跨端契约断层、快速新增分叉、大文件超时与脏数据回退、口令与权限边界、草稿污染、运维脚本风险 |
| **中（Medium / P1）** | 13 | 误判登出、响应码未校验、异步竞态、工作台串号、附件上传锁与释放、脏检查基线、浮点与时区、测试隔离与 Nginx 头 |
| **低（Low / P2）** | 7 | 原生 `alert` 阻塞、`v-html` 静态 SVG 收敛、Long ID 字符串归一化、末页删除翻页、焦点无障碍、死代码清理 |

---

## 二、高严重度问题（High / P0）

### H-01：`MessageHost` 双实例挂载/卸载竞态导致进入 `/home` 时全局消息会话被立即终止
- **位置**：`src/App.vue:8-12`、`src/views/Home.vue:49`、`src/components/MessageHost.vue:53-58, 70, 77-79`、`src/features/messages/state.js:35-58`
- **问题分析**：
  - `App.vue` 中 `<router-view/>` 位于 `<MessageHost v-if="$route.path !== '/home'"/>` 之前，而 `Home.vue:49` 内部又挂载了一个 `<MessageHost inline />`，两个组件实例共享 `state.js:8` 的模块级单例 `session`。
  - 当用户从 `/login` 登录成功进入 `/home`，或从任意子页面（如 `/messages`、`/todo-list`）返回 `/home` 时：`<router-view/>` 先挂载 `Home.vue` 内的 `<MessageHost inline />` 调用 `startMessageSession(auth.token)`；紧接着同一轮更新中，`App.vue` 的 `<MessageHost>` 因 `v-if` 变为 `false` 触发 `onBeforeUnmount`（`MessageHost.vue:77-79`），**无条件执行 `stopMessageSession()`**。
  - `stopMessageSession()` 会立即 `abort()` SSE 流与汇总请求、清除 30 秒轮询定时器、将 `session` 置为 `null` 并把 `unreadCount`、`recent`、`notice` 清零。此后用户停留在主页期间，实时消息推送、轮询和手动点击铃铛触发的 `refreshMessages()`（因 `if (!current) return` 直接空退）全部失效。
  - 反之从 `/home` 进入子页面时，`Home.vue` 卸载也会先调用 `stopMessageSession()` 清空 `known` 集合与 `initialized`，随后 `App.vue` 的 `MessageHost` 重建会话，导致每次离开首页都断开重连 SSE 并重复弹出“你有 X 条未读消息”登录提示。
- **修复建议**：将消息会话生命周期从 UI 展示组件 `MessageHost.vue` 的 `onBeforeUnmount` 中剥离，改在 `App.vue`（或根级认证监听逻辑）中根据登录态统一启停单实例会话；`MessageHost.vue` 仅消费响应式 `messageState` 并触发交互动作。

### H-02：主界面「个人中心」调用管理员专属 `/system/users` 接口导致普通用户必报 403，且主动退出未吊销服务端 Token
- **位置**：`src/composables/useHomeShell.js:7, 222-254, 381-389, 406-445, 485-487`、`src/api/auth.js:20-22`
- **对照后端**：`SystemUserService.java:54-55, 124-125`、`AuthController.java:82-87`
- **问题分析**：
  1. `loadCurrentUserProfile`（`228` 行调用 `GET /system/users`）与 `submitProfile`（`427` 行调用 `PUT /system/users/{id}`）均指向管理员专属接口，后端 `SystemUserService` 入口强制执行 `requireAdminOperator(currentUserId)`。非 `ADMIN` 角色打开个人中心必触发 HTTP 403 弹出“资料同步失败”警告；点击“保存信息”必因 403 中断，连带第 `428` 行的个人头像保存 `saveMyAvatarAttachments` 也无法执行。即便对管理员，`pageSize: 100` 在用户超百时也可能漏匹配本人。
  2. `logout()`（`251-254` 行）及改密后的自动退出（`486` 行）仅执行 `clearAuthState(localStorage)`，未调用 `logoutApi()`（`POST /auth/logout`），导致服务端 `TokenService` 中的旧 Bearer Token 在过期前依然有效。
- **修复建议**：前后端对齐新增面向当前登录用户的 `/auth/profile`（或 `/users/me`）读写接口并接入 `useHomeShell.js`；封装统一登出函数先执行 `await logoutApi().catch(() => {})` 再清理本地存储跳转登录页。

### H-03：「快速新增」多处违反同步规则，与业务页及后端契约严重分叉（部分入口提交必败或 404）
- **位置**：`src/constants/quickCreateRegistry.js:32-145, 191-194`、`src/components/QuickCreateDialog.vue:237-241, 315-324, 370-407, 432-462`
- **问题分析**：
  1. **油耗记录（`FUEL_RECORD`）提交必报 400**：后端 `SaveFuelRecordRequest` 要求 `fuelWarningLight`（`@NotNull`）与 `lastRecordKnown`（`@NotNull`）必填，快捷表单完全缺失；`fillType` 定义为 `FULL / FIXED_AMOUNT / FIXED_VOLUME`，而后端 `FuelRecordService` 仅允许 `FULL / PARTIAL`；数值字段设为 `min: 0`（后端要求严格 `> 0`）；且未按 `AGENTS.md` 关联对象规则接入 `listFuelVehicles` 车辆下拉与油/电模式切换，仍为手填文本 `vehicleName`。
  2. **软件仓库（`SOFTWARE_PACKAGE` / `SOFTWARE_VERSION`）暴露 404 入口**：配套后端尚无 `/software-packages` 模块（见 `docs/README.md:11`），但 `schema.sql` 默认启用 `APP_SOFTWARE_REPO`，选择「新增软件版本」加载依赖即报 404；且快捷表单枚举 `MACOS / CROSS_PLATFORM / NIGHTLY` 与 `SoftwareRepo.vue` 的 `MAC / CROSS / LEGACY` 自相矛盾。
  3. **年度预算（`ANNUAL_BUDGET`）与账单分叉**：缺失 `PersonalBills.vue:157` 的 `budgetName` 字段，`annualLimit` 允许填 `0`（后端 `@DecimalMin("0.01")`），`buildPayload` 未将预算数值转为 `Number`；`PERSONAL_BILL` 缺失多币种 `currency` 与“退款冲减”能力。
  4. **WoW 角色（`WOW_CHARACTER`）缺失级联与成对校验**：职业、专精、种族、阵营未复用 `wowCharacterRules.js` 做级联过滤（全量专精含多个同名“神圣/恢复/冰霜”无法区分，且可选出非法职业种族组合），缺少双专业判重、大秘境层数与副本成对校验，payload 漏传 `macros: []`。
  5. **健康就诊/报告与工作日志缺口**：`HEALTH_VISIT` 缺少“主诉/诊断/治疗/医嘱四选一”及文件名与 URL 成对校验；`HEALTH_REPORT` 让用户手填纯文本 `visitId`（Long ID）而非下拉选择；`WORK_LOG` 未校验市内/市外出差互斥及当日剩余人天上限，且首条日志无法填写 `offWorkTime`。
- **修复建议**：移除尚未实现后端的 `SOFTWARE_PACKAGE` / `SOFTWARE_VERSION` 快捷类型；按业务域抽离共享表单 schema 与校验纯函数（如 `fuelRecordForm.js`、`wowCharacterRules.js`），补齐车辆与最近就诊记录选择器。

### H-04：全局 Axios `8000ms` 超时截断大文件传输，Blob 错误响应无法提取提示，且 `SoftwareRepo` 静默写入 `blob:` 脏数据
- **位置**：`src/api/request.js:77-81, 101-111`、`src/api/softwareRepo.js:25-33`、`src/views/SoftwareRepo.vue:426-478, 854-876`、`src/api/dataMigration.js:16-24, 30-35`、`src/views/DataMigration.vue:1186, 1231-1274`、`src/api/healthRecord.js:77-85`、`src/api/travelRecords.js:10-11`
- **问题分析**：
  1. **超时失配**：`nginx.conf:8, 29-30` 允许 `200m` 请求体与 `300s` 代理超时，但 `request.js:79` 全局写死 `timeout: 8000`（8 秒）。除 `attachment.js` 单独设为 `60000ms` 外，安装包上传、数据迁移 ZIP 导入与归档下载、体检报告上传、行程导出均未覆盖超时，在 NAS 磁盘归档或公网环境下极易超时中断（导入若已在服务端落盘而前端报超时，还会诱导管理员重复点击造成重复导入）。
  2. **Blob 异常吞没后端错误消息**：`responseType: 'blob'` 的下载/导出接口在返回 400/403/500 JSON 时，`error.response.data` 为 `Blob` 对象，业务侧读取 `error.response?.data?.message` 恒为 `undefined`。
  3. **上传失败静默回退 `blob:` URL 入库**：`SoftwareRepo.vue:868-873` 在上传失败进入 `catch` 时不报错，直接将临时 `URL.createObjectURL(file)` 赋给 `versionForm.localFileUrl` 允许保存入库，页面卸载释放后永久失效；同文件还残留未使用的 `DEFAULT_PACKAGES` 演示数据（`426-478` 行）。
  4. **迁移任务缺少轮询**：后端导出/导入任务为异步执行（初始返回 `RUNNING`），`DataMigration.vue:1186` 同步判断 `task.canDownload` 恒不命中，且无 `PENDING / RUNNING` 定时轮询与卸载清理。
- **修复建议**：在 `request.js` 导出 `LONG_TRANSFER_TIMEOUT = 300000` 应用于所有大文件上传/导入/导出接口，并在响应拦截器中自动解析 `application/json` 类型的错误 `Blob`；移除 `SoftwareRepo.vue` 的 `createObjectURL` 回退与 `DEFAULT_PACKAGES` 死代码；为 `DataMigration.vue` 补充受控轮询。

### H-05：`appCatalogDraft.js` 等业务 `localStorage` 草稿回退未按规范清理，掩盖报错并直接破坏数据迁移自定义导出
- **位置**：`src/utils/appCatalogDraft.js:4, 86-131`、`src/views/AppManagement.vue:654-662, 777-796, 824-830, 853-861`、`src/views/DataMigration.vue:617, 860-874, 1088-1120`、`src/utils/permissionDraft.js:1-45`
- **问题分析**：
  - 违反 `AGENTS.md:38`“演示数据、mock 与业务 localStorage 回退逻辑上线前移除”约定。
  - `AppManagement.vue` 在新增/编辑/停用应用遇到**任何后端错误（含 400 校验失败、编码冲突、403 无权限）**时，都会调用 `persistLocalApp` 将被拒绝的脏数据（含伪造 `draft-${Date.now()}` ID）写入无账号、无环境隔离的 `localStorage['system_app_catalog_draft']` 并关闭弹窗。
  - **跨模块触发后端 400**：后端 `DataMigrationService.java:299-311` 仅返回已注册 `MigrationResourceHandler` 的可迁移应用；但 `DataMigration.vue:1110-1112` 在接口成功时仍执行 `mergeAppCatalogList(buildFallbackApps(), backendBusinessApps)`，强行塞入无迁移处理器的前端目录与本地草稿项（如 `APP_CALCULATOR`、`APP_SYSTEM_LOG`、`APP_AI_SUBSCRIPTION`、`draft-*`）。管理员一旦取消任意勾选进入 `CUSTOM` 模式导出，后端立即抛 `400 DATA_MIGRATION_BUSINESS_RESOURCE_INVALID`（`业务资源不存在`）。
- **修复建议**：删除无引用的 `src/utils/permissionDraft.js`；移除 `appCatalogDraft.js` 与 `DataMigration.vue` 中的 `localStorage` 草稿/历史缓存读写，`DataMigration` 严格以 `/system/data-migrations/resources` 返回列表为准。

### H-06：口令传输、加密能力标识与凭据防泄漏存在多处安全缺口
- **位置**：`src/views/Register.vue:129-141`、`src/views/PasswordMemo.vue:222-229, 596-617, 892-894, 975-998`、`src/constants/appCatalog.js:76`、`src/views/UserManagement.vue:214-221, 303-309, 429-437`
- **问题分析**：
  1. **局域网 HTTP 明文传输主口令**：站点容器默认监听 HTTP 80，`Login.vue` 与改密已采用 `/auth/password-public-key` + RSA 公钥加密；但 `Register.vue:131-132` 注册时仍明文发送 `password` / `initialPassword`（并冗余携带 `roleCode: 'USER'` 等管理字段），`PasswordMemo.vue:975-977` 二次验证查看密码时也明文发送当前登录密码 `{ loginPassword: verifyForm.loginPassword }`（且异常进入 `catch` 时未清空 `verifyForm.loginPassword`）。
  2. **加密等级标识失实**：`appCatalog.js:76` 将密码备忘录标为 `encryptionMode: 'END_TO_END'`，但前端并无客户端主密钥派生与加解密，全链路明文 JSON 传输、仅由服务端落库加密（实为 `'FIELD'`）。
  3. **剪贴板明文常驻与降级 DOM 残留风险**：`PasswordMemo.vue:605-614` 降级复制创建含明文密码的 `<textarea>` 挂载至 `body` 时未使用 `try...finally` 保证移除，且密码写入系统剪贴板后无定时自动清空机制；新建密码框 `#password-memo-create-password`（`222-229` 行）缺少 `autocomplete="new-password"`，易诱导浏览器密码管理器覆盖站点登录凭据。
  4. **后台口令明文展示与弱随机源**：`UserManagement.vue:214-221, 303-309` 初始密码与重置密码输入框未设 `type="password"`，且 `generatePassword`（`429-437` 行）使用非密码学安全的 `Math.random()`。
- **修复建议**：注册与密码备忘验证统一复用 RSA 公钥加密传输；将 `appCatalog.js:76` 修正为 `'FIELD'`；`copyText` 用 `try...finally` 清理临时节点并增加剪贴板超时自动擦除；补齐密码框 `type="password"` 与 `autocomplete="new-password"`，`generatePassword` 改用 `crypto.getRandomValues`。

### H-07：5 个 `/system/*` 管理路由缺失 `requiresAdmin` 守卫，非管理员访问表现分裂且缺少 404 兜底路由
- **位置**：`src/router/index.js:10-11, 28-33, 40-46`、`src/views/AppManagement.vue:647-662`、`src/views/PermissionManagement.vue:570-576`、`src/views/UserManagement.vue:529-532`、`src/views/DataDictionary.vue:724-726`、`src/views/DataMigration.vue:7, 915`
- **问题分析**：
  - 虽然配套后端对 5 个系统管理模块均实施了管理员鉴权并返回 403，但前端 `router/index.js` 仅对 `/system/messages` 和 `/system-log` 配置了 `meta: {requiresAdmin: true}`，其余 `/system/users`、`/system/apps`、`/system/permissions`、`/system/data-migrations`、`/system/dictionaries` 全部裸放行。
  - 非管理员手动访问时出现分裂异常：`/system/apps` 吞掉 403 回退展示同浏览器管理员遗留的 `localStorage` 目录草稿并允许本地增改；`/system/permissions` 将 403 误报为 `"应用目录接口不可用，请先恢复后端服务"`；`/system/users` 与 `/system/dictionaries` 弹阻塞式 `alert` 后仍渲染操作表单；`/system/data-migrations` 页头仍读取展示本地迁移任务缓存条数。
  - 此外 `routes` 未配置 `/:pathMatch(.*)*` 兜底路由，已登录用户访问未知路径会渲染无导航白屏（仅剩背景层）。
- **修复建议**：为全部 `/system/*` 路由统一配置 `meta: {requiresAdmin: true}`（及统一的页内无权限或跳回 `/home` 策略），并在路由表末尾增加 `{path: '/:pathMatch(.*)*', redirect: '/home'}`。

### H-08：`RequirementBoard.vue` 上传并提交图片附件，但后端需求看板未接入附件契约，截图静默丢失且残留孤儿文件
- **位置**：`src/components/RequirementBoard.vue:240, 310, 313-316, 669, 682, 720, 751, 765`
- **对照后端**：`CreateRequirementRequest.java`、`UpdateRequirementRequest.java`、`RequirementDetailVO.java`、`AttachmentConstants.java`
- **问题分析**：前端在新建与详情编辑弹窗中均挂载 `AttachmentManager` 将截图上传至 `/attachments` 并在保存时提交 `attachmentIds`，但后端需求看板 DTO/VO 与 `AttachmentConstants` 均未定义附件字段与业务类型，Jackson 反序列化直接忽略 `attachmentIds`。用户看到“提交成功”但图片全部丢失，服务端残留未绑定的孤儿文件；且取消新增/编辑时前端也未清理 `_pending` 附件。
- **修复建议**：后端补齐需求看板附件绑定与查询契约（或在后端就绪前隐藏看板 `AttachmentManager`），并在前端取消弹窗时遍历调用 `deleteAttachment` 清理本次新上传的 `_pending` 附件。

### H-09：`WorkLog` 裸读 `localStorage` 且雪花 ID 兼容逻辑造成查询 2 倍请求放大；日详情合并导致同日同项目第 2 条日志无法编辑/删除
- **位置**：`src/views/WorkLog.vue:447-506, 961-968, 1232-1234, 1453-1487, 1587-1591`（对照后端 `WorkLogController.java:116-126`）
- **问题分析**：
  1. **2 倍冗余查询**：`WorkLog.vue:1232` 裸调 `JSON.parse(localStorage.getItem('user') || '{}')`（未用 `readAuthState` 且无 `try/catch`）。`961-968` 行 `resolveLegacyRoundedUserId` 对所有 19 位雪花 ID 都会算出一个精度截断后的不同字符串，触发 `requestLogsWithCompatibleUserIds`（`1587-1591` 行）每次并发发送 **2 个 `GET /work-logs` 请求**。而后端 `WorkLogController.listWorkLogs` 完全从 Token 解析当前用户，**根本不接收 `userId` 参数**，导致周/月/年/日详情/表单初始化每次都无意义翻倍请求。
  2. **同日同项目第 2 条日志不可操作且加班时长翻倍**：`detailProjectGroups`（`1453-1487` 行）按 `projectCode` 合并同日多条日志，但编辑（`460` 行）和删除（`478` 行）始终只传 `group.primaryLog`（`logs[0]`），导致第 2 条及后续日志无法在日详情中编辑或删除；且 `1483` 行直接 `reduce` 累加各条日志的 `overtimeHours`，与 `workLogCalendar.js:166-172` 按日去重取最大值的统计口径冲突。
- **修复建议**：改用 `readAuthState()`，删除 `resolveLegacyRoundedUserId` 与 `requestLogsWithCompatibleUserIds`；日详情改为逐条日志独立提供编辑/删除入口，加班时长复用按日去重口径。

### H-10：个人账单与智订跨模块关联断链、UTC 日期导致凌晨记账跨日/跨月错位，且删除缺少异常捕获与防重锁
- **位置**：`src/views/PersonalBills.vue:58, 162, 205, 211, 274-278, 309, 314`、`src/views/AiSubscriptions.vue:79-80`、`src/constants/quickCreateRegistry.js:6`
- **问题分析**：
  1. **智订关联账单漏标与跳转失效**：`PersonalBills.vue:58` 漏写 `sourceType === 'AI_SUBSCRIPTION'` 角标（退款还会误显示为手工 `· 退款冲减`）；点击跳转 `/ai-subscriptions?recordId=...`（`274-278` 行）后，`AiSubscriptions.vue:79-80` 完全未读取 `recordId`，用户被留在总览页无法定位或解绑该笔支付。
  2. **UTC 日期偏移**：`PersonalBills.vue:205` 与 `quickCreateRegistry.js:6` 均使用 `new Date().toISOString().slice(0, 10)` 获取当天日期。在东八区每日 `00:00–07:59` 返回的是**昨天日期**；每月 1 日凌晨记账时，列表筛选在当月而默认账单日期落入上月最后一天。
  3. **删除无保护**：`removeBill`（`309` 行）与 `removeBudget`（`314` 行）均无 `submitting` / `budgetSubmitting` 互斥锁且无 `try/catch`，报错会触发未捕获 Promise 异常且无任何用户提示。
- **修复建议**：补齐 `AI_SUBSCRIPTION` 角标并在 `AiSubscriptions.vue` 消费 `route.query.recordId` 定位到账单关联区；全仓统一使用 `Asia/Shanghai` / 本地日历工具函数替代 `toISOString().slice(0, 10)`；为 `removeBill` / `removeBudget` 补齐状态锁与 `try/catch`。

### H-11：随身乐器自动停止录音漏调 NAS 持久化接口导致数据丢失与删除 400，且 `src/features` 组件测试漏跑
- **位置**：`package.json:10-12`、`src/features/instrument-practice/composables/useSessionRecorder.js:168-182, 269-277`、`src/views/InstrumentPractice.vue:847-877, 1066-1069`
- **问题分析**：
  1. **自动停录未落库**：仅手动点击停止按钮或切换乐器会触发 `finishRecording()` 调用 `createInstrumentPracticeTake` 保存至后端。当满 10 分钟上限自动停录（`useSessionRecorder.js:168-180`）或切后台/锁屏触发 `visibilitychange -> stopRecording()`（`269-275` 行）时，仅在内存生成 UUID 作为 `id` 的本地片段而未调用保存接口；随后点击删除该片段会将 UUID 发给后端 `@PathVariable Long takeId` 触发 HTTP 400；录制中点左上角 `goHome()`（`1066-1069` 行）则静默丢弃录音。
  2. **门禁漏跑组件规格**：`package.json:12` 的 `test:component` 仅扫描 `src/components/__tests__` 与 `src/views/__tests__`，导致 `src/features/instrument-practice/__tests__/instrumentSurfaces.component.spec.js` 在 `npm run test` 中完全未执行。
- **修复建议**：统一由 `useSessionRecorder` 的停录完成回调触发后端持久化，对未落库临时片段区分本地删除/重试上传，并在离开路由前拦截录制态；将 `src/features` 纳入 `package.json` 的 `test:component` 扫描路径。

### H-12：`rollback.sh` 存在远程误删生产目录风险且与 `deploy.sh` 失配；`App.vue` 第三方壁纸存在整日缓存污染与 CSS 注入风险
- **位置**：`rollback.sh:1-19`、`deploy.sh:11-18, 63-82`、`src/App.vue:40-80`
- **问题分析**：
  1. **回滚脚本高危腐化**：`rollback.sh` 未设 `set -euo pipefail`，读取 `VERSION` 后未做非空与格式校验即远程执行 `rm -rf ${NAS_HTML_DIR}/* && cp -r ${BACKUP_BASE}/${VERSION}/* ...`——误按回车会直接清空线上静态目录；且 `deploy.sh` 实际目录为 `/volume1/Projects/GAK-Web/html` 并备份为 `html_${TIME}.tar.gz` 压缩包，`rollback.sh` 仍写死旧路径 `/共享文件夹/docker/nginx/html` 与目录 `cp -r`，紧急回滚必然失败。
  2. **第三方壁纸缺少校验与转义**：`App.vue:53-77` 在视图层直接 `fetch('https://bing.biturl.top/...')`（违反 `AGENTS.md:36`），未校验 `res.ok` 与 `data?.url` 合法性；一旦返回异常使 `url === undefined`，`localStorage` 会缓存字符串 `"undefined"`（布尔为真）导致全站整日背景失效无法回退；且外部 `url` 未经协议白名单与引号包裹直接拼入 CSS `url(${url})`，存在样式注入面。
- **修复建议**：统一 `deploy.sh` 与 `rollback.sh` 配置，启用 `set -euo pipefail`、白名单校验备份包名并采用解压至临时目录后原子替换（用 `nginx -s reload` 替代 `docker restart`）；壁纸请求迁入 `src/api`（建议后端代理），严格校验 `https:` URL 后以 `JSON.stringify(validUrl.href)` 写入 `url(...)`。

---

## 三、中严重度问题（Medium / P1）

### M-01：`request.js` 基于业务错误文案子串模糊判定登录失效，易误踢正常在线用户
- **位置**：`src/api/request.js:12, 33-46, 61-74, 94-99`
- **问题与建议**：`isAuthExpiredMessage` 对所有响应的 `message/msg/error` 做子串匹配（含 `'认证失败'`、`'token已过期'`、`'token无效'` 等即强清本地登录态跳 `/login`）。在 AI 供应商同步、外部凭据测试或系统异常日志查看场景下，业务错误消息极易命中上述关键词导致误登出；同时模块变量 `authRedirecting` 一旦置 `true` 若未发生整页刷新将永不复位。建议仅依据 HTTP `401` 与明确的鉴权错误码白名单（`isAuthExpiredCode`）触发登出。

### M-02：十余处页面重复手写 `unwrapData` 且未校验业务成功码 `"0"`
- **位置**：`WorkLog.vue:970`、`TodoList.vue:398`、`KnowledgeBase.vue:335`、`SoftwareRepo.vue:481`、`PasswordMemo.vue:534`、`PersonalBills.vue:214`、`HealthRecord.vue:577`、`FuelStats.vue:735`、`WowCharacterStats.vue:1120`、`WowSpecializationGuidePanel.vue:236`、`UserManagement.vue:356`、`AppManagement.vue:398`、`PermissionManagement.vue:322`、`DataMigration.vue:620`、`DataDictionary.vue:448`、`NumberedScoreSheet.vue:255` 等
- **问题与建议**：`AGENTS.md:45` 约定普通成功码为字符串 `"0"`，但上述手写解包函数仅判断 `hasOwnProperty('data')` 而未检查 `code`。若接口在 HTTP 200 下返回业务错误包 `{ code: '500', message: '...', data: null }`，写操作会误判成功并关闭弹窗（`NumberedScoreSheet.vue:255` 还会因 `savedScores` 非数组直接白屏）。建议参考 `src/utils/systemLog.js:56-65` 提取全仓统一的 `unwrapResponse(res)` 工具函数。

### M-03：多处关键查询与详情加载缺少异步竞态（generation / sequence）保护
- **位置**：`PermissionManagement.vue:583-612`、`DataDictionary.vue:660-681`、`WorkLog.vue:1678-1749, 2120-2128, 2287-2291`、`PasswordMemo.vue:834-852, 946-959`、`PersonalBills.vue:253-265`、`WowCharacterStats.vue:1610-1682, 1981-1994`、`FuelStats.vue:1242-1256`、`RequirementBoard.vue:511-529, 695-710`、`QuickCreateDialog.vue:229-281`
- **问题与建议**：快速切换选中项或筛选条件时无递增序号保护。最典型的高危场景是 `PermissionManagement.vue`：管理员快速点击用户 A 再点用户 B，若 A 的权限列表慢返回会覆盖 `selectedFeatureCodes`，此时点击“保存授权”（`PUT` 全量覆盖）会将 A 的权限误写入 B 账号；`WorkLog` 编辑弹窗内快速改日期也会被旧日期的 `formDayLogs` 覆盖算错剩余人天上限。建议抽离通用 `createLatestRequestGuard()` 为上述入口补齐代次校验。

### M-04：工作台多账号切换旧键污染新账号云端布局，且非编辑态原地篡改卡片坐标
- **位置**：`src/utils/workbenchStorage.js:9-14`、`src/composables/useWorkbenchLayout.js:41, 107-110, 185-188, 225-230`、`src/components/workbench/WorkbenchPanel.vue:103-113`
- **问题与建议**：
  1. `readUserStorage` 将旧版无后缀键迁移复制到 `${key}:${userId}` 后未删除原旧键，且 `hasLocalCustomization()` 检测到无后缀旧键即视为已自定义，导致同浏览器登录新账号时自动继承上一账号布局并 `PUT` 上传污染云端。
  2. `WorkbenchPanel.vue:105` 在非编辑态直接调用 `compactAuthorized(layout.value)` 原地修改 `layout.value.cards` 坐标，随后用户仅折叠应用坞就会把临时紧凑坐标持久化上云；同时快速进出 `/home` 时旧实例在途 `PUT` 与新实例内存 `version` 未同步易引发 409 假冲突。建议迁移后清理无后缀旧键、移除对 `layout.value` 的原地 `compactAuthorized`（交由 `readingGridCards` 纯派生投影），并在模块级同步最新确认 `version`。

### M-05：多模块遗漏附件上传状态锁（`@uploading`），且附件异步预览拦截与同步吊销 `ObjectURL` 存在浏览器兼容缺陷
- **位置**：`HealthRecord.vue:441-448, 495-502`、`FuelStats.vue:600-607`、`KnowledgeBase.vue:213-219, 546-551`、`WowCharacterStats.vue:648-665, 854-871, 1338`、`AttachmentGallery.vue:24-29`、`src/api/attachment.js:40-41`、`DataMigration.vue:1271-1274`
- **问题与建议**：
  1. 健康、油耗、知识库未监听 `AttachmentManager` 的 `@uploading` 锁定弹窗保存/关闭按钮（`WowCharacterStats` 手写了两套重复上传逻辑也未将 `vaultAttachmentUploading` 并入按钮与关闭禁用），上传未完成即点保存会静默丢失附件；知识库取消编辑时还漏删 `_pending` 孤儿附件。
  2. `AttachmentGallery.vue:24-29` 在 `await getAttachmentBlob(...)` 返回后才调 `window.open`，在 iOS/macOS Safari 与移动端易因丢失瞬态用户激活被拦截，且缺少 `try/catch`；`attachment.js:41` 与 `DataMigration.vue:1273` 在 `anchor.click()` 后同步立即 `URL.revokeObjectURL`，在 Firefox/Safari 下易截断下载。建议统一绑定 `@uploading`、将 `AttachmentGallery` 改为页内预览弹窗（或同步先开窗口）并加异常捕获、将下载后的 `revokeObjectURL` 延迟至 `setTimeout(..., 10000)`。

### M-06：编辑弹窗未保存修改（Dirty Check）基线错位误报与路由后退漏拦
- **位置**：`PasswordMemo.vue:186-192, 834-852`、`WorkLog.vue:512-522, 1489-1493, 2120-2129, 2166-2174`、`PersonalBills.vue:272, 279`
- **问题与建议**：`PasswordMemo` 打开编辑弹窗时先置 `showEditDialog = true` 再异步请求详情回填，但未向 `<MacDialog>` 传入 `:form-ready` 与 `:form-baseline-key`，导致空表单被记为初始基线，用户未改一字点关闭也误报“放弃未保存的更改？”；`WorkLog` 编辑弹窗同样缺少 `:form-baseline-key`、漏检 `projectSearchText` 且未注册 `onBeforeRouteLeave`；`PersonalBills` 在弹窗最小化状态下重新点新建/编辑未递增 `billBaselineKey`。建议统一通过 `:form-ready` + `:form-baseline-key` 对齐异步回填完成时机。

### M-07：`WorkLog` 历史禅道号覆盖丢号与周报同名工作项人天抹零
- **位置**：`src/views/WorkLog.vue:676-681, 1365-1368, 1868-1869`、`src/utils/workLogCalendar.js:243-256, 292-293`
- **问题与建议**：
  1. 编辑仅含日志级 `zentaoNo` 的旧记录时，一旦在任一明细填入新禅道号，`aggregateZentaoNumbers(...) || form.legacyZentaoNo` 因左侧非空短路会静默丢弃原历史禅道号，而不填新号时只读框又使原禅道号无法清空。建议 `fillForm` 直接将旧日志级禅道号迁移回填至首条明细。
  2. `workLogCalendar.js:250-254` 周报按 `content` 合并同项目工作项时，若前序记录有 `personDay` 而后续同名记录 `personDay == null`，新对象省略 `personDay` 属性覆盖 `itemMap` 会将前序累计人天抹零；且 `buildDateSummaryMap`（`293` 行）忽略结构化 `workItems` 导致周日历卡片与详情文本可能不一致。建议合并时保留已有 `existing?.personDay`，日汇总优先读取 `item.workItems`。

### M-08：`KnowledgeBase` 三个分页列表无翻页控件、行内快捷审核串用详情备注，且空 ID 比较越权渲染按钮
- **位置**：`src/views/KnowledgeBase.vue:154-157, 442-450, 478-485, 501-508, 631-650`、`src/utils/knowledgeBaseAccess.js:67, 77`
- **问题与建议**：
  1. 公共条目、我的投稿、待审核均固定请求 `pageNo: 1` 且无翻页 UI，超出首页的数据前端不可达。
  2. 详情弹窗最小化保留 `reviewForm.reviewRemark` 期间，在列表行直接点另一条投稿的“通过/驳回”会把上一条的审核备注串用提交。
  3. `knowledgeBaseAccess.js:67, 77` 使用 `` `${normalizedEntry.ownerUserId ?? ''}` === `${currentUser.id ?? ''}` ``，当两侧 ID 同时缺失转为空串时 `"" === ""` 为 `true`，误判非管理员为作者展示编辑/删除入口。建议先校验双方非空再比较，补齐分页控件并隔离行内审核备注参数。

### M-09：金额浮点直算存在 `-¥0.00` 负零与精度偏差；`FuelStats` 新能源口径错位、零值误拦与翻页串行慢查询
- **位置**：`src/views/PersonalBills.vue:223, 232-236`、`src/views/FuelStats.vue:44, 471, 814-818, 1208-1221, 1300-1358, 1376-1379, 1613-1628, 1674-1681`
- **问题与建议**：
  1. `PersonalBills` 日分组累加与记账算式直接使用二进制浮点运算，在含负数退款冲减（如 `0.3 - 0.1 - 0.2`）时格式化出 `-¥0.00`；建议统一按整数“分”运算并消除 `-0`。
  2. `FuelStats` 电车充电记录仍硬编码显示 `L/100km`、“满油/补油”并按 `> 9` 标红高能耗（电耗常在 `12–20 kWh/100km`）；`!form.odometerKm` 等判空误杀 `0` 值；且每次翻页都串行 `await` 重拉 `listFuelRecords` + `getFuelSummary` + `getFuelReports` 三个全表计算接口。建议按能源类型动态映射单位与阈值，翻页仅请求列表接口，初始化改用 `Promise.all`。

### M-10：权限管理与数据迁移页上传类图标（`UPLOAD`）未走鉴权图片组件导致 401 裂图
- **位置**：`src/views/PermissionManagement.vue:184-191, 647`、`src/views/DataMigration.vue:146-153`（对比 `AppManagement.vue:90-94`）
- **问题与建议**：上传图标地址 `/api/attachments/{id}/content` 需携带 Bearer Token，`AppManagement` 已使用 `<AuthenticatedImage>`，但权限与迁移页仍用普通 `<img>` 封装的 `<AppIconImage>` 触发 401 裂图；且管理员在权限页修改自身授权后未派发 `gak:permissions-changed` 事件。建议抽离统一的 `<SystemAppIcon :app="app" />` 组件并在保存本人权限后派发刷新事件。

### M-11：`Calculator` 全局劫持键盘与接口 404，`StarInteractive` 外部 CDN 缺 SRI 且加载失败重入死锁
- **位置**：`src/views/Calculator.vue:484-496, 699-708, 914`、`src/views/StarInteractive.vue:28, 66-87`
- **问题与建议**：
  1. `Calculator` 在 `window` 绑定 `keydown` 未排除 `ctrlKey/metaKey` 及输入框/全局命令面板焦点，会拦截快捷键；`toggleSign` 在 `1+2` 上变成 `-1+2`、度数模式 `tan(90)` 未拦截奇点；且请求后端不存在的 `/tools/calculator/histories` 固定触发 404 后回退未按 `userId` 隔离的 `localStorage`。
  2. `StarInteractive` 动态插入 `cdn.jsdelivr.net` 脚本缺少 `integrity`（SRI），且首次加载失败触发 `onerror` 时未移除死 `<script>` 节点，再次进入页面会绑定到死节点上导致 `await loadScript` 永久挂起。建议在 `onerror` 中 `script.remove()` 并改用本地托管或固定版本 + SRI。

### M-12：超大单文件组件耦合与废弃代码隐患（含 `src/store/user.js` 未安装依赖炸弹）
- **位置**：`src/store/user.js:1-16`、`src/views/WorkLog.vue`（5787 行，含 `4764` 与 `5162` 两段互相 `!important` 覆盖的 `@media (max-width: 720px)`）、`src/views/WowCharacterStats.vue`（5114 行）、`src/views/FuelStats.vue`（3702 行，含 `836-873` 死函数）、`src/views/HealthRecord.vue`（2001 行，含 `1158-1211` 废弃上传死代码与 `926` 行空指标漏校验）
- **问题与建议**：`src/store/user.js:1` 仍 `import {defineStore} from 'pinia'`，而 `package.json` 未安装 `pinia`（仅因暂无引用未引爆构建），建议立即删除或重构为无依赖模块；参照 `AiSubscriptions` 将巨石视图按弹窗与业务面板拆分子组件，并清理确认无引用的死代码。

### M-13：`nginx.conf` 缺少 `index.html` 禁缓存与安全响应头；测试环境存在真实端口请求逃逸与 Node 版本门禁缺失
- **位置**：`nginx.conf:1-36`、`package.json:1-28`、`src/views/__tests__/homeMobile.component.spec.js` 等多个组件测试
- **问题与建议**：
  1. `nginx.conf` 未对 `/index.html` 设置 `Cache-Control: no-cache` 且对缺失静态资源回退 `/index.html`，发版删除旧 hash 资源后存量缓存页面点击懒加载路由会报动态模块 MIME 错误；同时缺少 `X-Frame-Options: SAMEORIGIN`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`，`/api/messages/stream` 也漏配 `X-Forwarded-*` 与 `gzip off`。
  2. 组件测试未全局拦截漏 mock 的 Axios 请求，运行时向 `127.0.0.1:3000` 发起真实连接抛 `ECONNREFUSED`；`package.json` 缺少 `"engines": {"node": "^20.19.0 || >=22.12.0"}` 且 `dependencies` 中包含未使用的 `"path": "^0.12.7"`。建议补齐 Vitest 全局网络拦截 setup、Nginx 缓存与安全头配置及 `package.json` 约束。

---

## 四、低严重度问题（Low / P2）

1. **L-01 阻塞式原生弹窗与亮色主题适配**：`WorkLog`、`TodoList`、`PersonalBills`、`HealthRecord`、`UserManagement`、`DataDictionary` 等仍大量调用原生 `window.alert()`，且部分早期系统管理页硬编码深色背景与 `#fff` 文本，建议逐步迁移至非阻塞通知 / `SystemDialogHost` 并统一接入 `--theme-*` 变量。
2. **L-02 静态预设 SVG 的 `v-html` 收敛与外链协议白名单**：`QuickCreateDialog.vue:47`、`AppManagement.vue:104, 212, 310`、`PermissionManagement.vue:190`、`DataMigration.vue:152` 使用 `v-html="getPresetIconSvg(...)"`（当前仅返回 `appIconLibrary.js` 静态常量，无活跃 XSS），建议封装为 `<AppPresetIcon>` 组件消除 `v-html`；`WowSpecializationGuidePanel.vue:139` 的 `:href="activeGuide.sourceUrl"` 建议增加 `/^https?:\/\//i` 校验，历史健康报告直链 `HealthRecord.vue:221` 改走鉴权 Blob 打开。
3. **L-03 个别组件 Long ID 未统一转字符串**：`PersonalBankCardManager.vue:90` 的 `linkedCounts` Map 键及 `TravelRecords.vue:36, 199, 261` 的 `<option :value>` 未先执行 `String(id)` 归一化，在混合类型输入下存在匹配失效隐患。
4. **L-04 列表交互细节**：`TodoList`、`SoftwareRepo`、`PasswordMemo` 在第 `pageNo > 1` 页删除最后一条记录后未自动回退 `pageNo - 1`；`SoftwareRepo.vue:629` 从当前分页结果派生分类下拉导致筛选后其他分类消失；`TodoList.vue:781-803` 快速连点切换完成/重要状态缺少单条请求锁；`UserManagement.vue:785-825` 批量操作部分失败进入 `catch` 后未刷新列表。
5. **L-05 无障碍与重复请求细节**：`SystemLogDetail.vue:93-136` 在已包裹 `MacDialog` 的情况下重复挂载 `document` 级 `focusin/keydown` 焦点陷阱且回退选择器 `.system-log-page nav a` 不匹配实际 `<button>`；`GlassSelect.vue:2` 未将 `aria-label` 透传至触发 `<button>` 且缺少上下方向键选值；`MessageCenter.vue:45-53, 65` 标记已读时手动 `load()` 与 `watch(state.revision)` 叠加产生重复请求。
6. **L-06 随身乐器细节优化**：`performanceAudioExport.js:192-209` 导出 WAV 时重复 `fetch` 采样文件而未复用 `InstrumentAudioEngine` 已解码缓存的 `AudioBuffer`；`useStringDynamics.js:131-137` 的 `styleFor(stringId)` 在模板首次渲染期向 `reactive({})` 懒写入键产生轻微渲染期副作用。
7. **L-07 残留碎片与硬编码清理**：`src/api/systemUser.js:30` 末尾残留孤立字符 `0`；`src/api/user.js` 为无导出空文件；`src/utils/flexible.js` 已停用但仍留在源码目录；`AppIconImage.vue:8, 99` 永久缓存失败态图标 Promise；`Home.vue:17` 硬编码内网打印机地址 `http://192.168.31.138:1180/`；`GrowthRecordEditor.vue:44` 顶层缓存 `today` 跨零点不刷新。

---

## 五、值得推广的工程亮点

1. **面向 NAS 局域网 HTTP 的务实安全与兼容降级**：`rsaEncrypt.js` 基于 `BigInt` 与 `crypto.getRandomValues` 零依赖实现 PKCS#1 v1.5 公钥加密；`messageStream.js` 兼容非安全上下文生成幂等键并实现流式 UTF-8 / CRLF 分块 SSE 解析；`RequestErrorMessage.vue` 严格校验 32 位十六进制 `X-Trace-Id` 并提供保焦点的剪贴板回退。
2. **高完成度的桌面化弹窗与脏检查基础设施**：`MacDialog.vue` + `macDialogState.js` + `SystemDialogHost.vue` 构建了统一的层级栈、拖拽边界夹紧、背景 `inert` 隔离、最小化焦点恢复与表单未保存更改拦截能力。
3. **工作台乐观并发控制与命令面板实现**：`useWorkbenchLayout.js` 清晰分离了阅读态投影与编辑态草稿、409 版本冲突仲裁弹窗及离线待同步队列；`WorkbenchCommandHost.vue` 通过分段纯文本渲染 `<mark>` 实现搜索高亮，零 `v-html` 注入风险。
4. **新一代业务模块的清晰分层与边界意识**：`SystemLog`、`AiSubscriptions`、`GrowthRecords`、`TravelRecords` 普遍保持 150–300 行薄视图 + 聚焦子组件 + 纯函数 `utils` 结构，严格校验 `String(code) === '0'`、使用 `BigInt` 处理超大额度、通过递增代数拦截过期请求，并以 `Asia/Shanghai` / UTC 往返校验杜绝日历越界。
5. **随身乐器 WebAudio 调度与资源闭环**：`instrumentAudioEngine.js` 与 `metronomeScheduler.js` 采用 `AudioContext.currentTime` 前瞻窗口防抖调度、复音上限平滑淡出裁剪防爆音，并在切后台 `suspend()` 与组件卸载 `dispose({close: true})` 时完整回收音频上下文与轨道资源。

---

## 六、分阶段整改建议

1. **第一阶段（P0 阻断与安全止血，1–2 个迭代内优先闭环）**
   - 修复 `MessageHost` 双实例卸载误杀 `/home` 消息会话问题（H-01）与 `/system/*` 路由守卫缺口（H-07）。
   - 修复大文件/迁移接口 `8000ms` 超时与 Blob 错误解析，移除 `SoftwareRepo` 的 `blob:` 脏回退及 `appCatalogDraft.js` 草稿污染（H-04、H-05）。
   - 对齐跨端契约：补齐个人中心自服务接口与登出 Token 吊销（H-02）、修正 `FUEL_RECORD` 等快速新增分叉并下线未就绪的软件仓库快捷入口（H-03）、处理需求看板孤儿附件（H-08）、修复个人账单 `AI_SUBSCRIPTION` 跳转与 UTC 日期偏移及删除 `try/catch`（H-10）。
   - 补齐注册与密码备忘验证的 RSA 加密传输、更正 `END_TO_END` 标签、修复 `rollback.sh` 与 `App.vue` 壁纸校验（H-06、H-12），将 `src/features` 纳入 `test:component` 并闭环乐器自动停录保存（H-11）。
2. **第二阶段（P1 稳定性与一致性收敛）**
   - 收敛 `request.js` 登出判定条件（M-01）与统一 `unwrapResponse` 成功码校验（M-02）。
   - 为权限管理、工作日志、个人账单等补齐请求代次防竞态（M-03）、`@uploading` 附件锁与延迟 `revokeObjectURL`（M-05）、`MacDialog` 异步编辑基线（M-06）。
   - 消除 `WorkLog` 双倍查询与同日同项目合并不可编辑问题（H-09、M-07），补齐 `KnowledgeBase` 分页与空 ID 校验（M-08），修复 `nginx.conf` 缓存/安全头与 Vitest 网络逃逸（M-13）。
3. **第三阶段（P2 架构演进与技术债清理）**
   - 按业务块渐进拆解 `WorkLog.vue`、`WowCharacterStats.vue`、`FuelStats.vue` 三个超 3000 行单文件组件（M-12），清理废弃死代码与孤立文件（L-07），统一非阻塞消息提示与明暗主题变量（L-01）。
