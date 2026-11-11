# 个人工作台首期

`/home` 为唯一工作台入口。基于 2026-11-11 已批准的 Atlas 架构第 9 节推荐默认值和静态原型实施；未新增路由、后端接口、依赖或服务。

## 文件职责与变更清单

| 文件 | 职责或调整 |
| --- | --- |
| `src/views/Home.vue` | 组装顶栏、工作台、个人中心和移动操作栏，从 2358 行缩减到约 283 行 |
| `src/App.vue` | 提供共享权限上下文，挂载全局搜索与快速新增；Bing 壁纸逻辑保持原样 |
| `src/components/QuickCreateDialog.vue` | 新增 `initialTypeCode`，打开时校验授权后初始化类型及依赖数据 |
| `src/components/workbench/WorkbenchPanel.vue` | 问候、成功数据摘要、权限状态、整理态与固定分栏 |
| `src/components/workbench/CardState.vue` | 每卡独立的骨架、空态动作、错误重试与进入应用动作 |
| `src/components/workbench/TodoCard.vue` | TODAY 列表、服务端摘要、最多五条 upcoming、完成与失败回滚 |
| `src/components/workbench/WorkLogCard.vue` | 今日写入状态、本周七天人天、最近一条、未完成事项 |
| `src/components/workbench/BillsCard.vue` | 本月金额、年度预算执行率、分类前三 |
| `src/components/workbench/HealthCard.vue` | 最近测量、就诊、报告日期及计数 |
| `src/components/workbench/AppDock.vue` | 坞折叠、应用磁贴与桌面拖拽 |
| `src/components/workbench/WorkbenchCommandHost.vue` | 登录后全局快捷键、搜索、键盘选择、直接打开快速新增 |
| `src/components/workbench/homeShell.css` | 迁移保留的顶栏、菜单、个人中心样式及移动三按钮 |
| `src/components/workbench/workbench.css` | 卡片、分栏、整理态和坞的响应式样式 |
| `src/components/workbench/commandPalette.css` | 桌面命令面板与移动全屏样式 |
| `src/composables/useHomeShell.js` | 保留资料、头像、修改密码、退出、彩蛋与系统菜单行为 |
| `src/composables/useWorkbenchAccess.js` | 共享权限目录、应用过滤及排序；登录与权限变化时刷新 |
| `src/composables/useWorkbenchPreference.js` | 按登录用户读取和保存偏好，token/id 变化重读 |
| `src/utils/workbenchStorage.js` | 用户后缀键、一次性旧键迁移与排序清理 |
| `src/composables/useWorkbenchResource.js` | 卡片加载、重试、成功刷新与忽略卸载/过期响应 |
| `src/utils/workbenchApps.js` | 沿用应用转换、图标与解包逻辑 |
| `src/utils/systemMenuRoute.js` | 从原 Home 提取的系统菜单路由过滤规则 |
| `src/utils/workbenchLayout.js` | 布局存储、规范化、排序与迁移 |
| `src/utils/workbenchData.js` | 本地日期、本周日期、人天汇总与数字格式 |
| `src/constants/workLogStatus.js` | 工作日志页与工作台共用的完成状态文案 |
| `src/utils/workbenchCommands.js` | 搜索过滤、安全的文本高亮与可编辑目标纯函数 |
| `src/utils/permissionAccess.js` | 兼容显式 `accessibleFeatureCodes`，保留原 `featureCodes` 等形态 |
| `src/utils/__tests__/workbench.test.js` | 布局容错/迁移、搜索、日期与授权字段纯函数测试 |
| `src/components/__tests__/workbenchCards.component.spec.js` | 四卡加载/空态/失败重试/卸载、真实字段、待办回滚 |
| `src/components/__tests__/workbench.component.spec.js` | 权限等待/隐藏/失败/变化、独立失败、整理态、移动折叠、坞排序与持久化 |
| `src/components/__tests__/workbenchCommands.component.spec.js` | 快捷键、过滤/高亮、键盘执行、Esc、无匹配、未登录、预选及共享权限 |
| `src/components/__tests__/homeMobileDesign.test.js` | 原断点、四列、拖拽、安全区、菜单和弹窗契约迁移到拆分后的文件 |
| `src/views/__tests__/homeMobile.component.spec.js` | 保留菜单及移动拖拽验证，补日志 API 测试替身 |
| `src/views/__tests__/businessDialogMigrationDetail.component.spec.js` | 保留退出确认行为断言，读取迁移后的壳层逻辑 |
| `docs/superpowers/plans/2026-11-11-workbench.md` | 实施步骤与约束 |
| `docs/workbench.md`、`docs/README.md`、`docs/architecture.md` | 当前实现与验收边界 |

## 关键设计

- App 通过 Vue provide/inject 共享一个权限上下文。独立挂载 Home 的测试仍可创建自己的上下文。只有首次加载或登录 token、user.id 变化时进入 loading 并清空旧授权。其他刷新均在后台进行，保留卡片与旧授权，成功后整体替换目录/授权码/来源，失败保留旧值；旧请求用代次标记忽略。返回 /home 会刷新一次，首屏已有权限请求时不重复请求。业务卡卸载后忽略在途结果。权限接口使用实际的 userId、grantedFeatureCodes、apps、permissionSource 字段。
- 首期复用现有 API wrapper，不创建聚合接口。四卡独立并行；日志卡内部只并行调用 unfinished-items 和 weekly-brief，不再重复请求 listWorkLogs。按后端实际实现，weekly-brief 是参考日期所在的周；前端汇总完整七天，不漏周末。每次加载重新计算本地今日和周范围，跨午夜（包括周一）刷新后按新日期判断今日已写和统计本周。汇总、每日和最近一条统一调用工作日志页的 getLogPersonDay：请假（LEAVE/SICK_LEAVE）及出差在途计 0，workItems 都有 personDay 时按条目求和，否则使用日志 personDay。
- 待办完成使用响应式 completedOverrides 集合覆盖勾选状态，不直接修改 shallowRef 中的接口对象；失败移除覆盖并提示回滚，成功重新读取服务端摘要，新数据到达后清理覆盖。
- 今日摘要要求待办和日志均显示且加载成功；失败、隐藏或授权撤销时隐藏摘要。未使用示例数据或业务 localStorage 回退。
- `home_tool_custom_order` 的字符串数组格式与 `sortHomeTools` 沿用；读取和 setOrder 均过滤空串、纯空白与非字符串，并去重。排序保留当前未授权的历史键，恢复授权仍可恢复原顺序。计数为坞内应用数量，不包含系统菜单。
- 新布局键为 `gak_workbench_layout_v1`（`version/order/hidden`）；重复和未知键被清理，新增键补在末尾。坞折叠键为 `gak_workbench_dock_collapsed_v1`。三个键（含 home_tool_custom_order）均按登录 user.id 隔离，形如 `<key>:<userId>`，Long ID 保持字符串。读取先找用户后缀键，只有不存在时才读取无后缀旧键并写入当前用户键，作为一次性迁移；旧键保留供其他账号迁移。后续写入只写用户后缀键；无 user.id 时读写无后缀键。token 或 user.id 变化会重新读取三个偏好。均不写入登录 user，不支持跨浏览器同步。
- 命令面板挂在 App，非首页可以直接打开共享 QuickCreateDialog，无需先跳转首页。只提供已授权应用与 `resolveQuickCreateTypes` 的类型；系统管理继续仅在齿轮菜单。同账号权限刷新不会卸载或关闭 QuickCreateDialog，已填表单保留；切换身份或退出时关闭旧账号弹层。
- Ctrl/⌘ K 在 body、按钮、链接、卡片等非编辑区打开命令面板并取消默认行为。`isEditableTarget` 纯函数用于检查 document.activeElement、event.target 和 composedPath：文本类 input（含省略 type、search、password、email、number、tel、url、日期时间等）、textarea、select，以及 isContentEditable 为真的元素和子孙节点内，快捷键不打开面板、不取消默认行为、不阻断传播。checkbox、radio、button、submit、reset、range、color、file、hidden、image 类型 input 不算文本编辑区。IME 组合输入（isComposing）、Alt 组合键和未登录状态均忽略。唯一编辑区例外是已打开面板自身的搜索框：Ctrl/⌘ K 保持打开、取消默认行为并选中已有文本。普通输入按键继续放行。
- 卡片和命令面板使用现有图标/鉴权图片组件；命令弹层与快速新增继续复用 MacDialog。健康只渲染明确列出的日期与计数字段。
- 桌面首两卡占两行，第三、四卡上下堆叠；少于四卡时自然补位。移动断点沿用 `matchMedia('(max-width: 720px)')`；账单和健康默认折叠；底部三个操作及安全区留白保留最后一排图标的空间。

## 视觉验收修复与接口核对（2026-11-11）

此前已只读核对配套后端源码，并对照 `workbench-dev/shots/01-desktop.png`、`14-mobile.png` 与原型桌面截图；没有修改后端。四卡实际使用字段如下：

| 数据来源 | 实际字段与展示口径 |
| --- | --- |
| `TodoItemPageVO` | `list`、`summary`、`upcoming`；分页信息不参与摘要推算 |
| `TodoItemListVO` | `id`、`title`、`status`、`important`、`listCode`、`dueDate`；Long ID 保留字符串 |
| `TodoSummaryVO` | `today`、`important`、`completed`、`total`；`total` 包含已完成任务 |
| `TodoItemSimpleVO` | upcoming 使用 `id`、`title`、`dueDate`、`listCode`；过滤到期日不晚于今天的记录、排除今日列表中的 id 后，最多取五条 |
| `WeeklyWorkLogBriefResponse` | `logDate` 判断今日已写、排序最近一条并归集本周七天；`typeCodes/location/personDay/workItems[].personDay` 交给 getLogPersonDay 计算工作人天；摘要显示 `brief` |
| `UnfinishedWorkItemResponse` | 使用 `id`、`workItem`、`status`；原先错误读取 `content` 导致空白。其余真实字段为 `workLogId`、`logDate`、`projectCode`、`zentaoNo` |
| `PersonalBillSummaryVO` | `currentMonthExpense`、`currentMonthIncome`、`currentMonthBalance`、`annualBudgetAmount`、`annualBudgetUsed`、`annualBudgetUsageRate`、`categoryDistribution` |
| `PersonalBillCategoryDistributionVO` | `categoryName`、`amount`、`ratio`；按金额降序取前三 |
| `HealthSummaryVO` | `latestMeasureDate/recordCount`、`lastVisitDate/visitCount`、`lastExamDate/reportCount`；仅日期与计数 |

- 工作日志未完成事项显示 `workItem`，title 使用同一字段。状态文案从既有工作日志页抽到 `workLogStatus.js` 共用：`COMPLETED → 已完成`、`UNFINISHED → 未完成`；工作台遇到未知或缺失状态回退「未完成」。最近一条移除了不存在的顶层 `content` 回退，继续以 weekly-brief 的 `brief` 展示。
- 账单 `annualBudgetUsageRate` 和分类 `ratio` 都是以 1 表示 100% 的四位小数；展示和条宽乘 100，例如 `0.6197 → 61.97%`、`0.3546 → 35.46%`。年度条是纵向 flex 卡片的直接子元素，原先会在空间不足时收缩至不可见；`.wb-bar` 增加 `flex-shrink: 0`，保留 7px 高度及现有渐变。分类条样式保持原样。
- 今日列表和 upcoming 共用 `workbenchData.js` 的 `formatTodoDueDate(dueDate, now)`：按本地日期显示「今天」「明天」，其余如「11月13日 周五」，无日期或无效日期显示「未设日期」。`listCode=MY_DAY` 在两处均优先显示「我的一天」。LocalDate 按本地年月日解析，避免 UTC 午夜偏移；明天用日历递增，兼容跨月、跨年和夏令时。
- ≤720px 的整页滚动容器是 `.home-page`（`overflow-y: auto`），不是 body；`.main-area` 为内容区，`overflow: visible`。此前将移动 `.main-area` 的 `height: 100%` 改为 `height: auto; min-height: 100%`，确保内容增高后底部 padding 跟随最后一排应用。保留 `calc(100px + env(safe-area-inset-bottom))` 留白；三按钮栏高度为 46px 加上下各 10px 及底部安全区，留白比操作栏多 34px。已在 390×844 的 Playwright 合成数据视觉验收中滚到底部并复拍确认，最后一排图标不被底栏遮挡，详见验证结果。

## 快速新增同步

应用页面与快捷表单的字段、默认值、选项及提交接口未改变。新增的是授权过滤后的预选入口，仍调用 QuickCreateDialog 原有初始化、字典依赖、校验与提交流程。卡片按钮和命令选择传递 `TODO_ITEM`、`WORK_LOG`、`PERSONAL_BILL`、`HEALTH_RECORD`。新增成功广播 `gak:quick-created`，首页重新加载四卡；非首页显示成功提示。

已检查 `quickCreateRegistry.js`、`QuickCreateDialog.vue` 和 `Home.vue`；未增加业务类型，因此注册表无须变更。

本轮同步修复全局快速新增宿主：仅按登录状态挂载，同账号权限刷新（含保存个人资料触发的 auth-changed）不关闭、不卸载，不重置表单。已用真实 QuickCreateDialog 验证事件派发前后草稿和实例均保留；业务类型、字段、默认值、依赖、校验与提交接口无变化，注册表无需调整。

Vera WB-BUG-C5：已核对上述三处入口，新的全局快捷键守卫也覆盖快速新增的文本输入框、下拉框与多行文本框，不再抢走编辑焦点；业务类型、字段和提交链路未改变，无需调整注册表或快捷表单。

## 与原型的差异

- 每周展示七天，包含周六/周日，原型示意五天；人天口径来自真实日志。
- 待办总数标签使用「全部任务」，对应后端 `summary.total`（含已完成），避免原型「全部未完成」的口径歧义。
- 最近日志为本周范围内最近一条；没有本周日志时明确提示。
- 每张卡保留独立失败重试，未增加原型标题旁的单卡刷新按钮；新增成功会刷新卡片。
- 命令面板复用 MacDialog 的居中弹层、焦点恢复和 Esc 行为；移动端使用同一组件的全屏呈现。
- 空态不显示假数字。健康日期保留完整年份，避免跨年歧义。壁纸继续线上原 Bing 逻辑，未复制原型壁纸或示例内容。

## 既有验证结果与限制（Forge 评审修复）

- Node.js v24.22.1 满足 Vite 要求。
- `npm run test` 已执行：unit 全部通过（默认 Node 输出 28 个文件级结果）；补跑相同文件 glob 的 `node --test --test-isolation=none` 核对实际用例数，144/144 通过，较 Forge 评审基线 139 增加 5 项。新增人天口径、排序清理及三个键的用户隔离/一次性迁移测试。
- component：337 通过、2 失败、1 跳过，共 340 用例，较 Forge 评审基线 323 增加 14 项通过。两项失败均在既有 `instrumentPractice.component.spec.js`：录制切换的 `0/30` 与预期 `0/10` 不符，以及第 11 段录制覆盖提示未触发；未修改该文件。`npm run test` 因此以非零状态结束，无新增失败。
- 工作台、卡片、命令与 Home 专项合计 69/69 通过，其中卡片 27/27；另有纯函数专项 17/17 通过。新增组件测试覆盖真实快速新增草稿及卡片实例在 permissions-changed/同用户 auth-changed 中保留、后台刷新失败、token/id 变化 loading、Home 保存资料和返回首页、账号偏好重读及无 id 回退、setOrder 去重、待办到期去重/只读对象回滚、跨周午夜刷新、最近一条人天。权限测试 mock 使用实际字段 userId/grantedFeatureCodes/apps/permissionSource，不依赖后端不存在的 accessibleFeatureCodes。此前日期纯函数专项已在 `TZ=Asia/Shanghai` 与 `TZ=America/Los_Angeles` 下各 12/12 通过；本轮未重复该时区专项。
- `npm run build` 通过；`git diff --check` 通过。
- 已用临时 Vite（另一端口 5180，已停止）加 Playwright 拦截 `/api/**` 返回合成数据，完成桌面 1440×900 和移动 390×844 共 20 张截图的视觉验收，页面 JS 错误为 0。预算条和移动端底部遮挡已修复，并复拍确认；移动端滚动容器为 `.home-page`，最后一排图标不被底栏遮挡。截图在 `/workspace/gak/work/workbench-dev/shots/`。以上为此前已完成的验收，本轮未启停服务。尚未用真实后端联调，需要测试在测试环境复核。
- 未启动/停止服务、未访问外网、未进行真实后端联调或部署。源码已核对 Controller、VO/DTO 与 Service；不能据此声称运行联调通过。
- 首期不需要后端改动，也未修改后端仓库。应用级后端授权加固不在本期，前端隐藏不替代后端鉴权。

## Vera WB-BUG-C5 验证（2026-11-11）

- 更新与新口径冲突的旧断言，保留原有普通按键、筛选/高亮、键盘选择执行、Esc、授权及快速新增测试。新增 37 项组件用例，覆盖 Ctrl/Meta 两种组合的编辑区放行（含不取消默认行为、不阻断传播）、body/checkbox/button 打开、面板搜索框重选、IME、Alt、activeElement/target/Shadow DOM composedPath，以及 isEditableTarget 的全部输入类型、编辑状态继承和空目标边界；纯函数 DOM 用例放在同一组件测试文件。
- 修复前命令专项 30 项失败、18 项通过；修复后 48/48 通过。
- 已执行 `npm run test`：unit 通过；为核对实际用例数，补跑相同 glob 的 `node --test --test-isolation=none --test-reporter=tap`，144/144 通过。component 374 通过、2 失败、1 跳过，共 377 项；失败仍只有既有乐器「录制中切换乐器会先提交片段并停止旧声部」「第 11 段录制前明确提示会覆盖当前乐器最旧记录」，未修改该测试文件。`npm run test` 因这两项已知失败返回非零。
- `npm run build` 通过；`git diff --check` 通过，未提交文件另用 `git diff --no-index --check` 检查，无空白错误。保留前几轮未提交成果；未提交/推送、部署、启停服务、连接数据库、联网、安装依赖或修改后端。本次未执行浏览器或真实后端联调。
