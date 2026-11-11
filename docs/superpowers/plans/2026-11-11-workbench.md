# 个人工作台实施计划

依据已批准的 workbench-architecture.md 第 9 节推荐默认值与 workbench-prototype。用户已授权直接实施；不提交、不部署、不启停服务、不联网、不安装依赖、不修改后端。

- [x] 抽离共享权限目录与应用入口转换，沿用 home_tool_custom_order；登录变化、权限变化与卸载时防止旧响应写回。
- [x] 建立布局纯函数（规范化顺序、隐藏、未知键与恢复默认）及独立卡片加载 composable；每卡骨架、空态、重试与忽略过期响应。
- [x] 实现待办、日志、账单、健康四卡，复用现有 API，核对后端字段；勾选失败回滚；摘要只使用成功加载的数据。
- [x] 实现固定分栏、整理态、应用坞与移动单列/折叠；保留个人中心、通知、主题、彩蛋、打印机、用户看板。
- [x] 全局挂载命令面板与快速新增，复用权限状态和 QuickCreateDialog；补充预选类型及成功刷新。
- [x] 补充纯函数和组件行为测试，调整原 Home 设计断言，运行 npm run test、npm run build、git diff --check，记录已知乐器基线失败及联调边界。

组件边界：Home 组装现有顶栏与个人中心；useHomeShell 保留个人中心/菜单逻辑；useWorkbenchAccess 统一权限与应用目录；WorkbenchPanel 管理卡片布局；WorkbenchCard 管理显示与折叠；四业务卡各自取数；AppDock 管理坞与拖拽；WorkbenchCommandHost 全局管理搜索和快速新增。布局只写 gak_workbench_layout_v1，坞折叠只写 gak_workbench_dock_collapsed_v1。

验证：纯函数测试放 src/utils/__tests__；组件测试放 src/components/__tests__；既有 Home 测试保留断点、拖拽、菜单、主题及安全区断言，改为对应拆分后的源文件/行为。

## 视觉验收修复（2026-11-11）

用户已明确修复范围，沿用现有设计，在本会话执行；不提交、不推送、不部署、不启停服务、不联网、不安装依赖、不修改后端及 instrumentPractice.component.spec.js。

- [x] 只读核对四卡使用的后端 DTO/VO；日志条目使用 workItem，抽取既有工作日志页状态文案映射供两处复用，保留 weekly-brief 的 brief/logDate/personDay 口径。组件测试使用三种真实日志响应字段，核验待办摘要、账单四位小数比例和健康日期计数。
- [x] workbenchData.js 新增 formatTodoDueDate(dueDate, now = new Date())，以本地年月日比较今天/明天，其余显示月日与星期，无日期显示未设日期；两处待办列表均使用，MY_DAY 优先显示我的一天。Node 测试覆盖跨月、跨年、本地午夜与无效日期。
- [x] workbench.css 为进度条禁止 flex 收缩，保留 7px 高度与现有渐变。对照提供的桌面截图，核查移动 home-page/main-area 的滚动边界与末排应用安全区；修正移动内容高度，使 padding 跟随全部内容。浏览器启动受环境限制，待实测滚动位置。
- [x] 更新 docs/workbench.md，执行针对性测试、npm run test、用例计数与 npm run build、git diff --check；记录已知乐器失败和离线浏览器验证边界。

## Forge 评审修复（2026-11-11）

沿用用户明确的修复方案与验收标准，在当前会话直接实施，不新增设计确认或提交步骤。

- [x] M1/L3/L4：日志汇总和最近一条统一调用 getLogPersonDay；每次加载重新计算日期，仅请求 weekly-brief 和 unfinished-items。补请假、在途、条目人天与跨周午夜测试，更新卡片及 Home mock。
- [x] M2/L7：权限首次/身份变化才清空并 loading，同账号事件及返回首页后台刷新，失败保留旧值，忽略过期响应。快速新增仅按登录状态挂载；测试真实弹窗草稿、卡片实例及刷新失败/身份切换。
- [x] L2/L8：即将到期仅保留今日之后且不在今日列表的任务；用响应式完成覆盖集合实现乐观更新及失败回滚，验证不修改接口对象。
- [x] L5/L6：共用按登录用户 id 生成的存储键与一次性旧键迁移；不删除旧键；token/id 变化重读三个偏好。排序过滤空值/重复，setOrder 也去重。补纯函数和账号切换组件测试。
- [x] L1/交付：更新 workbench.md 的行为、视觉验收事实、快速新增影响和测试数字；运行 npm run test、npm run build、git diff --check，仅允许既有两项乐器失败。

评审修复验收：unit 144/144；component 337 通过、仅 2 项既有乐器失败、1 跳过；工作台/Home 专项 69/69；构建与 git diff --check 通过。此前临时 Vite/Playwright 已完成 20 张桌面及移动截图验收，本轮未启停服务；真实后端仍待测试环境复核。

## Vera WB-BUG-C5 修复（2026-11-11）

按用户明确的新口径直接实施：登录和组合键校验后先忽略 IME；面板自身搜索框保留打开并选中文本；其余从 activeElement、target 和 composedPath 判断可编辑元素，通过前不取消默认行为或阻断传播。纯函数放 workbenchCommands.js，不改变接口或快速新增表单。

- [x] 在 workbenchCommands.component.spec.js 更新旧输入区断言，新增 Ctrl/Meta 的编辑区、事件路径、非编辑区、面板重选和 IME 回归；补纯函数的输入类型/继承边界测试，并先确认失败。
- [x] 实现 isEditableTarget 和快捷键守卫，更新 workbench.md；核对快速新增注册表、表单和 Home，确认共用守卫覆盖其输入区。
- [x] 运行专项、npm run test、npm run build 和 git diff --check，核对 unit 基线及仅两项既有乐器失败，记录实际数字。不提交、不推送、不部署、不联网、不装依赖、不启停服务、不改后端或乐器测试。

验收：修复前专项 30 失败/18 通过；修复后 48/48 通过。新增 37 项组件用例；全量 unit 144/144，component 374 通过/2 项既有乐器失败/1 跳过，构建通过。未提交文件另用 git diff --no-index --check 检查，无空白错误；未执行浏览器或真实后端联调。
