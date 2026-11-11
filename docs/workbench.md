# 个人工作台（首期与二期里程碑①②③）

`/home` 为唯一工作台入口。首期基于 2026-11-11 已批准的 Atlas 架构与静态原型实施。二期里程碑①增加两张卡片和独立偏好 API 客户端；②使用 12 列网格、草稿整理及本地缓存迁移；③将布局和应用坞合并为一个云端偏好文档，保留按用户隔离的本地缓存。未新增路由。

## Forge 评审修复（2026-11-11，基于 59596b1）

本节为当前行为，覆盖下方历史记录中移动端顺序、阅读投影、路由离开及卸载处理的旧描述；没有变更后端契约。

- **M1**：移动端按 `(y,x)` 显示可见卡，hidden 卡在整理列表末尾，仅供切换显示，不参与换位。↑↓ 只交换相邻两卡的坐标；同档不 settle，不同档仅对换入小槽位的大卡做一次独立 settle（夹紧边界，必要时在其他卡不动的前提下找空位）。其余四卡的桌面存储坐标、档位和数组次序保持不变，不再调用全局 pack 或 `compactAuthorized`。移动端排序与桌面视觉顺序一致；跨档受矩形可用空间约束，安置后以实际坐标顺序显示。
- **M2**：默认排位、一期迁移和 `packGridCards` 先安置可见卡，hidden 卡最后安置；`compactAuthorized` 还会优先过滤未授权卡。阅读时先过滤 hidden 与未授权卡，再按原 `(y,x)` 顺序从左上寻找空位，最后沿用右侧 1–2 列补缝；这是渲染副本，不写回草稿、存储坐标或 PUT。旧缓存/云端坐标即使曾被 hidden 占位，也不会在阅读态留下对应空洞；整理时仍可恢复原始坐标编辑。
- **L1**：保留桌面拖拽、缩放和键盘操作的重力回填：操作卡优先占目标格，**每次操作都会紧凑其余卡片**，包含未碰撞的卡。移动端换位按 M1 的独立安置处理。
- **L2**：`WorkbenchPanel.vue` 使用 `onBeforeRouteLeave`，有未保存草稿时沿用 `SystemDialogHost` 提示「放弃未保存的整理？」；「继续整理」取消导航并保留草稿，「放弃整理」允许离开。未改动草稿不拦截。已点击完成并发出的 PUT 在卸载后仍处理持久化结果：成功更新缓存/version，网络失败或 5xx 将**提交时冻结的卡片快照**及最新即时坞保存本机，标记 `pending=true,pendingCards=true`，下次进入重试；卸载后的卡片 409 也保留提交快照待选择。每次落缓存前核对请求所属身份与当前 token/user.id，切换账号、重新登录或登出后的旧结果不写缓存。
- **L3**：GET 在途时点击完成，等待当前 GET（包括失败结束）再执行一次 PUT，保留原提交版本基准供 409 仲裁；等待期间按钮显示「正在同步…」，禁用重复点击及整理控件。等待中离开或切换账号不会继续提交旧草稿。
- **L4**：非整理态后台坞 PUT 409，或纯坞 pending 在 GET 中发现云端已变而采用云端时，以非阻塞 `role=status` 状态条提示「应用坞设置已按其他设备的最新版本更新」。含卡片修改的 pending 仍使用冲突选择框。
- **L5**：本期依赖 `grid-layout-plus` 1.1.1、`interactjs` 1.10.28、`@interactjs/types` 1.10.28、`@vexip-ui/hooks` 2.9.4 / `utils` 2.16.4、`@floating-ui/dom` / `core` 1.8.0 / `utils` 0.2.12 均为 **MIT**；`@juggle/resize-observer` 3.4.0 为 **Apache-2.0**。依据已安装包的 package.json 和 LICENSE 核对，未安装依赖。该包未附独立 NOTICE 文件；将其原始版权及授权声明保留为 [NOTICE](../public/third-party/resize-observer/NOTICE.txt)，并随静态产物保留完整 [Apache 许可证](../public/third-party/resize-observer/LICENSE.txt)。lock 相对一期基线新增的 9 个包仅将 resolved 域名前缀从 `registry.npmjs.org` 改为 `registry.npmmirror.com`，版本、integrity 与其他条目不变，未运行 npm install。
- **L7**：补齐同档/跨档双向换位与其他卡坐标不变、一期 hidden 迁移/默认隐藏 health/旧缓存隐藏/缓存授权过滤的阅读投影、真实内存路由的确认/取消、PUT 卸载后的网络/500/503/成功/换账号隔离、GET 等待成功/失败与按钮禁用、坞更新提示，以及键盘移动/切档/移动端换位后的真实焦点断言。
- **L8**：规范化 payload 超过 16384 个 UTF-8 字节时，从 `dock.order` 尾部逐项截断至满足上限，保留卡片布局和坞折叠值；单测验证截断是原数组前缀、字节边界及输入不变。
- **L9**：按要求未处理；移动端仍随 Home 分包下载网格库。L6 属于后端文档，本次未修改后端。

本轮修改 `workbenchGrid.js`、`useWorkbenchLayout.js`、`WorkbenchPanel.vue`、对应单元/组件规格与已有路由 mock、`package-lock.json`、本文，新增真实路由离开组件规格和静态第三方许可证/NOTICE。已核对 `quickCreateRegistry.js`、`QuickCreateDialog.vue`、`Home.vue`：没有业务类型、表单字段、默认值、校验、权限、依赖或提交接口变化，快速新增沿用原宿主、授权过滤与 refreshKey，无需同步修改。

本轮验证（Node.js v24.22.1）：

| 验证 | 结果 |
| --- | --- |
| `npm run test:unit` | 29/29 文件通过；相同 glob 补跑 `node --test --test-isolation=none --test-reporter=tap` 得 **168/168 用例通过**，比基线增加 3 项 |
| `npm run test:component` | **472 通过、2 失败、1 跳过，共 475 项**；比基线增加 20 项。42 文件通过、1 失败、1 跳过；失败仅为既有 `instrumentPractice.component.spec.js` 的「录制中切换乐器会先提交片段并停止旧声部」及「第 11 段录制前明确提示会覆盖当前乐器最旧记录」，未修改该文件 |
| `npx vite build --outDir /tmp/wb2/dist-f3 --emptyOutDir` | 通过；第三方 LICENSE / NOTICE 与 public 源文件逐字节一致 |
| `git diff --check`、lock 结构核对 | 通过；9 个新增包仅 resolved 前缀变化，integrity、版本和既有条目均未变化 |

日志位于 `/tmp/wb2/f3-test-unit.log`、`f3-test-unit-cases.log`、`f3-test-component.log`、`f3-build.log`。未执行真实后端联调、浏览器指针/视觉验收或部署；组件 mock 和内存路由验证不代表线上验证。未安装依赖、提交 Git、修改后端、启动服务、操作 5173/8080/55432 或运行 shoot.py；未新增 docs/superpowers 计划文件。

## Round1 / Round2 视觉问题修复（2026-11-11，基于 741dd9b）

本节覆盖下方历史记录中的默认布局、像素行高和避让行为；云端接口、版本、草稿与三档存储尺寸保持原契约。仅修改前端及仓库外 `/tmp/wb2/shoot.py`。

### 网格、手柄及选区

- S=4×2、M=6×3、L=8×4 不变。Round2 默认为待办 L、其余五卡 S：待办 `(0,0,8×4)`、账单 `(8,0,4×2)`、健康 `(8,2,4×2)`、日志 `(0,4,4×2)`、油耗 `(4,4,4×2)`、经验库 `(8,4,4×2)`。12×6 网格完全覆盖，卡片数组仍为待办、日志、账单、健康、油耗、经验库；当前移动端按坐标排序为待办、账单、健康、日志、油耗、经验库。新默认、无定制顺序的旧布局迁移和恢复默认采用此组合；旧版定制顺序仍按原规则紧凑迁移。授权不全时继续过滤后从左上紧凑排列；已有云端/缓存文档保留合法坐标和档位，不强制改成新默认，原两张 L 的布局也有回归测试。
- 移动或切档后，操作卡占据夹紧后的目标格，其他卡按操作前的行、列顺序，从 `y=0`、`x=0` 逐格搜索可放下的最上方矩形。网格库在手势过程中的临时推位只作反馈，不参与最终布局，避免其把本可回填的卡片推到下一行。数组次序不变。键盘移动仍保留操作卡指定的位置。
- `readingGridCards(cards)` 只生成阅读态副本：先排除 hidden（未授权卡已由调用方排除），可见卡按原行列次序向左上紧凑；再检查卡片右缘距第 12 列还有 **1–2 列**，并且扩展后的整个矩形与任何已显示邻卡均无交集时向右延伸到边界。高度、size 不变；投影 x/y 可因紧凑调整，源坐标不变，右缘扩展不越过邻卡。整理态恢复真实档位宽度；扩展宽度不进入草稿、缓存或 PUT。单测覆盖默认满格、M6+M6、S4×3、顶部回填、邻卡下半部阻挡、跨高度不阻挡、无重叠和原输入/payload 不变。
- 桌面整理态缩放手柄为右下角内缩 7px 的 26×26px 玻璃按钮区域，浅色折角及悬停强调；提高层级避免被玻璃卡片遮住。阅读态不生成手柄。整理态网格及后代禁用文本选择；在手柄按下、指针结束/取消、移动/缩放完成时清除选区，窗口监听在卸载时移除。

### 内容、溢出及冲突框

Round1 的 156/174px 行高已根据用户复拍调整：Round2 桌面行高为 114px，721–1180px 为 116px，视觉间隔仍为 14px。仅改变像素行高，不修改后端按档位规范化的 w/h；高度按 `h×rowHeight+(h−1)×14` 计算，组件测试覆盖两个断点的全部三档：

| 宽度范围 | S 像素高度 | M 像素高度 | L 像素高度 |
| --- | ---: | ---: | ---: |
| >1180px | 242 | 370 | 498 |
| 721–1180px | 246 | 376 | 506 |

`WorkbenchCardContent.vue` 维护卡内滚动：正文沿纵向按自然高度展开，子块不被 flex 压扁；桌面正文块间距为 6px，让 S 卡优先容纳摘要、周统计和最近一条。超长内容（包括整理态增加控件后放不下的内容）通过 `overflow:auto` 在本卡内滚动，外壳维持裁剪边界。ResizeObserver 与内容变化监听更新上下边缘的 18px 淡出，滚到底部后去掉底部提示；仅实际溢出的滚动区可 Tab 聚焦。移动端继续自动撑高，不加淡出。

Round1 移除了扩大 scrollWidth 的 `.wb-desktop-grid {margin:-14px}`，用户 Round2 复拍已确认 `documentOverflow=false`。Round2 进一步消除库自带横向外侧 gutter：网格保持 `margin:0;width:100%`，库间距改为 `[0,14]`，格子左右内距分别为 `14×x/12` 和 `14×(12−x−w)/12`。这样首尾卡与问候卡齐边、同档卡等宽、卡间仍留 14px，阅读投影也使用同一算法；缩放手柄随右内距偏移，保持在真实卡片右下角内缩 7px。组件测试覆盖桌面/平板容器宽度下的齐边、等宽、间距和整理态一致性。**未放宽横向溢出断言，也没有增加 overflow:hidden 来掩盖问题**：脚本仍检查 html、`.home-page/.main-area/.workbench` 和网格的 clientWidth、scrollWidth、左右边界，并检查 documentElement 是否横向可滚动和实际卡片/标题/应用坞是否越界。Round2 新几何的真实浏览器结果待外部复拍。

409 对话框通过 MacDialog Teleport 到 body，原 `.workbench button` 样式无法匹配。现在提供限定于 `.wb-conflict-dialog` 的样式：按钮至少 104×40px；「覆盖云端」使用主题色渐变、浅色内描边和阴影，次按钮沿用玻璃控件表面。保留原有首焦点、Tab 循环、Esc、禁用及保存行为。

### 脚本、快速新增及验证

`/tmp/wb2/shoot.py` 的云端 mock 与新默认一致；03 仍由待办 L 缩至 M，05 仍验证改为 M 后离线保存，06 改按日志 S4 的库格子宽度计算四列拖动距离并检查油耗避让。横向步长以库格子宽度除以列数计算，不再加库的 14px 横向间距；纵向仍加 14px。保留用户添加的头像 mock、软失败记录、真实手柄选择器 `.vgl-item:has([data-card]) .vgl-item__resizer` 和 `handleDiag` 诊断，排除 0×0 占位项。用户已确认此前六个真实缩放手柄均为 26×26px 可见；该结论来自用户复拍，本轮未重新测量。

脚本输出为 `/tmp/wb2/shots-v2/`，仍有 11 个场景，含桌面/平板 S 档整理回归。保留手柄面积/命中、禁选及空选区、超长正文滚动淡出和分容器溢出断言，新增三档紧凑高度、默认布局齐边和桌面首屏六卡内容露出的断言。主要摘要检查分别记录完整可见与可滚动到达：允许 S 档超出部分通过本卡滚动查看，同时要求可聚焦及底部淡出。**本轮仅静态核对 Python 语法、mock 布局与用户诊断保留情况，未运行脚本、启动服务或复拍截图**。

已复核 `quickCreateRegistry.js`、`QuickCreateDialog.vue`、`Home.vue`：只调整布局展示和冲突按钮，未改变业务类型、字段、默认值、权限、依赖或提交链路；六卡快速新增继续使用原有宿主和 refreshKey，无需同步新增表单。

- Round2 `npm run test:unit`：**29/29 文件通过**；为取得实际用例数字，相同 glob 补跑 `node --test --test-isolation=none --test-reporter=tap`，**165/165 用例通过**。比 Round1 增加一项已有两张 L 云端布局的兼容回归。
- Round2 `npm run test:component`：**452 通过、2 失败、1 跳过**，共 455 项；41 文件通过、1 失败、1 跳过。仅原有 instrumentPractice 两项失败：「录制中切换乐器会先提交片段并停止旧声部」（0/30 与预期 0/10）和「第 11 段录制前明确提示会覆盖当前乐器最旧记录」。未修改乐器代码或规格。比 Round1 增加一项新默认六卡坐标及齐边/间距的组件测试，并更新行高与日志 S 的边界/播报断言。
- `npx vite build --outDir /tmp/wb2/dist-v2 --emptyOutDir`：通过。
- 测试和构建日志分别在 `/tmp/wb2/test-unit-v2.log`、`test-unit-cases-v2.log`、`test-component-v2.log`、`build-v2.log`。脚本仅做 Python 语法检查；交付前执行 `git diff --check`。已删除上轮未跟踪的 `docs/superpowers/plans/2026-11-11-workbench-visual-fixes.md`，本轮未新增计划文件。
- Node.js v24.22.1；未安装依赖、修改后端、commit/push、部署或操作 5173/8080/55432。真实浏览器视觉及真实后端联调均待外部复验，组件 mock 不替代指针验收。

## 二期里程碑③：布局上云（2026-11-11）

本节为当前同步行为，网格交互沿用②。依据架构方案 4.4–4.6 / 6 和后端 `docs/workbench-preferences-contract.md` 的冻结契约实现；没有修改后端。续做基于 `51fb02b`，保留其①②及③已有实现。

### 续做审阅与修复

`51fb02b` 已接入首次 GET/迁移 PUT、完成 PUT、409 对话框、本地待同步、焦点刷新、坞后台同步和账号代次隔离，并已有 27 个同步用例。续做前尚缺③的当前行为说明和独立视觉脚本；本轮补齐它们并修复以下边界：

- 移动端旧测试断言整理前缓存为空，与③首次迁移上传后写缓存冲突。现改为核对整理前后缓存不变，完成才提交草稿；初次上传 version=0、完成 version=1，重挂载读取 version=2 后不多发 PUT。排序、显隐及恢复默认断言保留。
- PUT 已成功但本地缓存写入失败时，先记住服务端新 version，保留草稿及错误，重试使用新版本；不会把缓存错误误报为离线或重复提交旧版本。
- 区分包含卡片修改和仅坞修改的待同步数据。离线卡片之后再改坞，重试遇到冲突仍须用户选择，不能按纯坞冲突直接丢弃卡片修改。
- 在冲突弹窗内显示覆盖请求的 400/415 等错误，保持弹窗与草稿。

### 进入页面与首次迁移

登录进入 `/home` 后调用 `GET /workbench/preferences`，保留 Axios response，解包 `response.data.data`。version 仅接受非负安全整数，PUT 回传 JSON 数字；Long 用户 ID 保持字符串。payload 只含 `{cards,dock}`，schemaVersion 固定为 1。

- **version=0 且 payload=null**：存在任何本地定制键时，使用 `composeWorkbenchPayload` 合并网格/一期迁移、即时坞折叠及顺序，PUT version=0。首次上传若 409，直接应用最新云端。无任何本地键时选择方案推荐的延迟写入：只在内存记 version=0，不上传默认布局、不写同步标记，直到首次完成整理或坞变化。
- **已有记录**：`applyWorkbenchPayload` 宽松解析并覆盖网格缓存及两个坞键，广播偏好变化供共享排序和坞重读，不触发认证/权限刷新或循环 PUT。即使 payload=null 或未知 schema，也保留原 version，使用合法默认布局；不误作首次上传。
- **GET 失败/离线**：保留并渲染本地布局，显示「暂未与服务器同步，已使用本机布局」。允许继续整理。未知版本的首次 PUT 仍用数字 0，若云端已有记录，由后端 409 阻止盲写。

缓存仍使用 `gak_workbench_grid_v2:<userId>`、`gak_workbench_dock_collapsed_v1:<userId>`、`home_tool_custom_order:<userId>`。一期三项和无后缀旧键沿用②的一次性迁移，不删除旧键。新增 `gak_workbench_sync_v1:<userId>` 保存 `{uploaded, version, pending}`；pending 时另带 `pendingCards` 布尔值。uploaded 表示已知云端版本大于 0；pending 表示有未确认上传的缓存。标记、payload 和日志均不包含 token 或认证信息。旧的 pending 标记未携带来源时按包含卡片修改保护。

### 完成、冲突与离线重试规则

整理仍深拷贝草稿，不即时写卡片缓存；恢复默认只改草稿，取消丢弃草稿。`finish()` 调用异步 `commitLayout`，使用当前已知 version、草稿卡片和重新读取的即时坞值：

| 结果 | 行为 |
| --- | --- |
| PUT 成功 | 采用服务端规范化文档和新 version，更新三项缓存及同步标记，清 pending，退出整理 |
| HTTP 409 | 从 `error.response.data.data` 取最新文档，显示更新时间和可见卡数；「使用云端」丢弃草稿并退出；「覆盖云端」用返回 version 重发草稿，若再次 409 则更新摘要并继续保留草稿 |
| Esc / 关闭冲突框 | 只关闭冲突框，继续整理，保留草稿；MacDialog 提供 Esc/窗口风格，业务弹层补首焦点、Tab/Shift+Tab 循环和关闭后焦点恢复 |
| 网络失败 / 5xx | 将草稿及即时坞写本机，标记 pendingCards=true，退出整理，提示「已保存在本机，稍后自动同步」 |
| 400 / 415 | 保留草稿与整理态，显示服务端错误；覆盖冲突失败时错误也显示在弹窗内，不静默写缓存 |
| 401 | 沿用 request 拦截器清理登录态和跳转；工作台不额外登出或回写旧账号 |
| PUT 成功但缓存失败 | 记住新 version，显示缓存错误并保留草稿，供重试完成或取消；不声称本机已保存 |

**重试没有循环计时器**：下次「完成」使用原同步基准提交；或下次成功 GET 时，若云端 version 与基准相同，立即 PUT 待同步本地缓存。未知基准且 GET 返回 version=0 也可重试；若云端已变化且本地含卡片修改，进入整理并显示同一个冲突框，保留待同步本地为草稿。关闭冲突框仍保留草稿。纯坞待同步遇到版本变化或后台 PUT 409 则采用云端并显示应用坞已更新的非阻塞提示。恢复网络本身不触发请求，需下一次完成、窗口获焦/可见事件或坞操作；未重试前 pending 跨刷新保留。

### 坞、多设备与账号切换

坞折叠和图标顺序即时写本地并生效，取消卡片整理不回滚坞；整理期间坞不后台 PUT，完成时一并提交，取消后可继续同步坞。非整理态坞变化使用 800ms 防抖 PUT 整份文档；历史未授权图标键保留。若已有待同步卡片，坞操作触发的重试也使用卡片冲突保护。写入串行，PUT 在途继续修改坞时以 revision 保留最新坞，采用新 version 后再防抖补交；GET 在途修改坞也不会回滚即时值。

进入页面、`window.focus` 和 `visibilitychange` 变为 visible 时 GET，后两者共用至少 5 秒节流。整理中只提示云端有更新，不覆盖草稿，也不推进本次提交基准，完成时仍由 409 仲裁。不做轮询、WebSocket 或布局 SSE。卸载移除事件和坞计时器，忽略在途 GET；已提交的 PUT 按本轮 L2 规则持久化，切换身份后的旧结果丢弃。

`gak:auth-changed` 中 token 或 user.id 变化时，清理草稿/冲突/防抖，按新账号重读缓存和同步标记，并重新 GET。请求使用 epoch 忽略旧账号 GET/PUT 结果，避免写入新账号缓存。同账号资料变化不重置布局。同步提示使用非阻塞状态条；不再使用「只保存在本浏览器」文案。

### 文件、快速新增与验收

续做修改 `useWorkbenchLayout.js`、`WorkbenchConflictDialog.vue`、`WorkbenchPanel.vue`、`workbenchSync.component.spec.js`、`workbenchPhase2.component.spec.js`、本文与 `docs/architecture.md`；新增仓库外 `/tmp/wb2/shoot.py`。既有 `useWorkbenchPreference.js` 的偏好事件和 API wrapper 沿用。

已核对 `src/constants/quickCreateRegistry.js`、`src/components/QuickCreateDialog.vue`、`src/views/Home.vue`：本轮只调整偏好保存，不新增业务类型、不改变表单字段/默认值/校验/依赖/提交接口。桌面和移动仍复用六卡的快速新增类型和 refreshKey，无注册表或快捷表单同步缺口。

视觉脚本使用已有 Playwright Python 环境，执行入口为 `/workspace/.pwvenv/bin/python /tmp/wb2/shoot.py`。它先检查 5191 空闲，自启 `npx vite --port 5191 --strictPort --host 127.0.0.1`，finally 只终止自身进程组；不会操作已有服务。所有 `/api/**` 返回合成权限、六卡和可切换 success/409/offline 偏好响应，未知 API 使验收失败，外网请求阻断；Vite 的 API 代理指向无业务服务的端口 9，避免漏拦截访问 8080。最初为六张 S、九张截图；当前混排 mock、十一张截图及输出位置以上方 Round1 修复为准。本轮未执行，不声称截图已通过。

### 里程碑③最终验证

- Node.js v24.22.1；没有安装依赖或修改 package/锁文件。
- `npm run test:unit`：29/29 文件通过；相同 glob 补跑 `node --test --test-isolation=none --test-reporter=tap`，**162/162 用例通过**。
- `npm run test:component`：**448 通过、2 失败、1 跳过**，共 451 项；40 个文件通过、1 失败、1 跳过。仅失败 `src/views/__tests__/instrumentPractice.component.spec.js` 的「录制中切换乐器会先提交片段并停止旧声部」（0/30 与预期 0/10）和「第 11 段录制前明确提示会覆盖当前乐器最旧记录」。没有修改该文件；命令因这两项既有失败返回非零。
- 同步规格现有 **34 项全部通过**，较续做基线增加 7 项，覆盖缓存失败后的版本、离线卡片后坞冲突保护、GET 在途坞变化、纯坞离线重试 409、GET 失败保留缓存、共享排序防抖及冲突框内 400 错误。原有首次迁移/无定制/空 payload、409 选择和再次冲突、Esc/焦点/Tab、网络与 5xx 重试、400/415、5 秒节流、整理草稿、账号切换与卸载测试保留。
- `npx vite build --outDir /tmp/wb2/dist-m3 --emptyOutDir` 通过。`git diff --check` 和 `python3 -m py_compile /tmp/wb2/shoot.py` 通过；只做脚本语法及静态复核，没有执行截图脚本。
- 日志：`/tmp/wb2/m3-unit.log`、`m3-unit-cases.log`、`m3-component.log`、`m3-build.log`；基线复现和新增回归的失败日志另存 `m3-baseline.log`、`m3-new-regressions.log`。
- 未进行真实后端联调、真实浏览器拖拽/视觉验收或部署；截图、触屏与屏幕阅读器结果须在沙箱外复核。组件规格中的网格交互使用 mock，不能替代实际指针验收；真实 request 拦截器的 409/401 行为由既有 API 组件规格验证。
- 没有 commit/push/deploy，没有修改后端、连接数据库、安装依赖、启动服务或操作 5173/8080/55432。视觉脚本将来仅使用自己的 5191 临时服务。

## 二期里程碑②：本地整理体验（历史记录，2026-11-11）

以下记录②完成时的行为和验收；当时偏好客户端尚未接入。当前同步与失败处理以上方③为准。

### 网格与交互

- 使用用户已安装的 `grid-layout-plus@1.1.1`（MIT，声明 `^1.1.1`），未安装或升级依赖。应用坞继续使用原有 HTML5 图标拖拽。
- >720px 阅读与整理使用相同的 12 列坐标；仅整理时开启拖拽、右下角缩放及手柄。拖动限定在卡片标题左侧的 ⠿，内容和按钮不触发拖动。库内部对象与草稿分离，只在结束事件后提交稳定坐标。
- 仅三档：S=4×2、M=6×3、L=8×4。松手以 `(w,h)` 网格距离的平方和吸附，等距选较小档；按钮与 Shift＋方向键也使用同一档位逻辑。坐标夹紧至 12×48，目标卡优先，每次操作都会紧凑其余卡片（重力回填），包含未碰撞的卡。
- 默认待办 L、日志 M、其余四卡 S。左上逐行寻找可用矩形：待办 `(0,0)`，日志 `(0,4)`，账单 `(8,0)`，健康 `(8,2)`，油耗 `(6,4)`，经验库 `(6,6)`（坐标零起算）。L 与 M 总宽为 14，不能同排；油耗和经验库在第二组区域依次放置。默认/一期迁移布局在授权不全时紧凑排列，未授权卡仍保留隐藏、档位和列表次序；其坐标可为避让而调整。已保存自定义坐标刷新后保留；页面内授权集合变化时重新紧凑排列。
- 桌面行高 110px，721–1180px 行高 124px，间距 14px。断点切换不重写坐标或档位；正文在卡内滚动，外层裁剪，标题可换行。删除 `wb-count-*` 和依赖 nth-child 的固定卡片模板。
- ≤720px 不挂载 GridLayout/GridItem，普通单列、内容自动撑高；整理态只有 ↑↓ 排序与显隐，没有拖拽、缩放或尺寸控件。阅读时保留账单、健康、油耗、经验库的折叠摘要。

### 草稿、保存及键盘

进入整理深拷贝当前布局；拖拽、改档、显隐及排序只修改草稿。显示「有未保存更改」，完成整理后保存，取消丢弃草稿，恢复默认只重置草稿。缓存写入失败保留草稿并显示错误，可再次完成或取消。未保存草稿触发 `beforeunload` 的浏览器原生提示；未改动、完成、取消及卸载后不提示。草稿不做 sessionStorage 恢复，当前普通 SPA 路由离开时使用系统确认框（见本轮 L2 修复）。

保存入口为 `useWorkbenchLayout().commitLayout(draft)`，返回 Promise；`finish()` await 成功后才退出整理。里程碑③可在此接 PUT，保留成功更新缓存、失败保留草稿的边界。坞折叠、排序继续即时生效，取消卡片整理不会回滚坞；保存卡片时重新读取坞的最新值合入缓存。

整理态每张卡可 Tab 聚焦，正文保持 inert。桌面方向键移动一格，Shift＋任一方向键切换档位；移动端只响应上下键换位。内部输入框和按钮的方向键不触发卡片移动。`aria-live="polite"` 播报一基行列和中文档位，例如「工作日志已移到第 2 行第 1 列，尺寸中」；移动端行号取单列次序。阅读态无手柄，卡片外壳不进入 Tab 序列。减少动态效果设置关闭库的位移动画与骨架动画。

### 本地格式与纯函数

新缓存键：`gak_workbench_grid_v2:<userId>`，内容如下；schemaVersion 是格式版本，不是服务端并发 version：

```json
{"schemaVersion":1,"cards":[{"id":"todo","hidden":false,"size":"L","x":0,"y":0,"w":8,"h":4}],"dock":{"collapsed":false,"order":[]}}
```

实际缓存补齐六张已知卡。优先读取新格式，未找到/损坏/未来格式则从一期三项迁移：`gak_workbench_layout_v1`、`gak_workbench_dock_collapsed_v1`、`home_tool_custom_order`。读取沿用 `readUserStorage`：用户后缀优先，仅不存在时回退无后缀键并尝试复制，原键保留；无 user.id 时使用无后缀键，Long ID 保持字符串。新布局只在完成时写入新键，不删除或覆盖旧布局键。token 或 id 变化会放弃旧草稿并重读对应账号。

一期 order 按默认档位紧凑放置，hidden 保留，未知/重复项清理，新增卡补尾部且默认可见。非法值使用合法默认。新缓存中的 dock 是快照，独立坞键有值时以其即时值为准。

`src/utils/workbenchGrid.js` 提供：

| 入口 | 输入与输出 |
| --- | --- |
| `composeWorkbenchPayload(layout, collapsed, order)` | 传入已解码的一期 `{order,hidden}` 或新 `{cards}`、布尔折叠值、应用键数组；返回仅含 `{cards,dock}` 的契约 payload，不带 schemaVersion、version 或身份字段 |
| `applyWorkbenchPayload(payload, schemaVersion=1)` | 宽松接收服务端 payload，返回独立的本地 `{schemaVersion:1,cards,dock}`，不读写存储；里程碑③再将该结果与 dock 两字段写入对应本地缓存 |
| `readWorkbenchGrid(storage, userId)` | 读取/迁移本地三项及新键；沿用一次性旧键回退规则，完成时才写新缓存 |
| `snapGridSize` / `packGridCards` / `settleGridCards` / `updateGridCard` | 吸附、紧凑放置、边界与碰撞、位置/档位更新；纯函数不改输入 |

宽松读取采用服务端同类规则：非法/未知卡丢弃，相同 id 取第一张合法卡，w/h 按 size 覆盖后验证边界；dock 两字段分别回落，排序 strip、去空去重、保留历史键、过滤 NUL/孤立代理字符/超过 64 个 UTF-16 单元的键，最多 100 项；不支持的 schema 回默认；规范化后超出 16KiB 优先从 dock.order 尾部截断，保留卡片布局。前端另补默认卡，并修复重叠位置供网格显示；这是 UI 层修复，后端读取本身不检查重叠、不补六卡。

### 本轮文件与快速新增同步

新增 `WorkbenchGrid.vue`、`useWorkbenchLayout.js`、`workbenchGrid.js` 和对应纯函数/组件规格；修改 `WorkbenchPanel.vue`、`workbench.css`、既有 `workbench.component.spec.js` / `workbenchPhase2.component.spec.js` 及本文。里程碑①油耗/经验库及偏好客户端成果保留。

已检查 `quickCreateRegistry.js`、`QuickCreateDialog.vue` 和 `Home.vue`。本轮未变更业务类型、表单字段、默认值、校验、依赖或接口；六卡仍转发既有快速新增类型，成功后由 refreshKey 刷新。整理态 inert 阻止业务误操作，快捷注册表及表单无需变更。

### 里程碑②最终验证

- Node.js v24.22.1。`npm run test:unit`：29/29 文件通过；按相同 glob 补跑 `node --test --test-isolation=none --test-reporter=tap`：**162/162 用例通过**。本轮新增 14 个纯函数用例。
- `npm run test:component`：**414 通过、2 失败、1 跳过**，共 417 项。本轮新增 19 个组件用例；既有工作台测试同步草稿及移动端排序行为。失败仅为 `src/views/__tests__/instrumentPractice.component.spec.js` 的「录制中切换乐器会先提交片段并停止旧声部」和「第 11 段录制前明确提示会覆盖当前乐器最旧记录」，未改动该文件。
- `npx vite build --outDir /tmp/wb2/dist-m2 --emptyOutDir`：通过。`git diff --check` 及新增文件空白检查通过。
- 单元覆盖尺寸吸附、全部 63 种非空授权子集的放置、边界/碰撞、档位、排序、旧三项迁移/无后缀回退/非法数据/新卡补齐、payload 合成与宽松应用/16KiB 上限。组件覆盖草稿/完成/取消/恢复默认/失败重试、inert、beforeunload/卸载、键盘/播报、移动端不挂载网格、账号隔离、坞即时保存、中屏行高和减少动态效果。网格交互规格 mock 库，验证自研结束事件逻辑；既有工作台组件规格仍加载真实 grid-layout-plus。
- 日志：`/tmp/wb2/m2-unit.log`、`m2-unit-cases.log`、`m2-component.log`、`m2-build.log`；包体明细：`m2-bundle-sizes.json`，复算脚本 `measure-m2.py`。

与 `/tmp/wb2/dist-check4/assets` 比较（bytes，gzip 为 Python gzip level 9、mtime=0，逐文件压缩后求和；不是 Vite 日志的压缩级别）：

| 产物 | 基线原始 | 当前原始 | 原始增量 | gzip 增量 |
| --- | ---: | ---: | ---: | ---: |
| assets 全部（63 文件） | 1,626,587 | 1,776,061 | +149,474 | +48,549 |
| JavaScript（34 文件） | 1,063,952 | 1,213,473 | +149,521 | +48,548 |
| CSS（29 文件） | 562,635 | 562,588 | -47 | +1 |
| Home JS 分包 | 74,289 | 222,674 | +148,385 | +48,156 |

此增量包含 grid-layout-plus/interactjs 与本轮业务代码，不能单独作为库的净体积。库随 Home 路由加载；移动端不实例化网格，但仍会下载该 Home 分包。

本轮未启动或停止任何服务、未监听端口、未触碰 5173/8080/55432、未修改后端、未安装/升级依赖、未提交/推送/部署。未做真实浏览器拖拽/屏幕阅读器/触屏及视觉验收，也未做真实后端联调。后续由用户截图复核 1440/1024/390px 六卡布局、滚动与手柄；偏好上云和冲突处理仍在里程碑③。

## 二期里程碑①（历史记录，2026-11-11）

依据 `/workspace/gak/work/workbench-phase2-architecture.md` 第 2、4.4、6 节及本次任务范围实施。网格库留给里程碑②，偏好上云留给里程碑③。该里程碑当时使用按用户隔离的本地布局及即时保存；当前整理行为以上方里程碑②为准。

### 文件与行为

| 文件 | 改动 |
| --- | --- |
| `src/components/workbench/FuelCard.vue`（新增） | 只调用 getFuelSummary()，无参数；本月实付、平均油耗、最多 4 条最近记录，多车展示前三辆车油耗摘要；页脚进入 /fuel-stats |
| `src/components/workbench/KnowledgeCard.vue`（新增） | 调用 listKnowledgeEntries({view: 'published', pageNo: 1, pageSize: 5})；只展示标题、分类、摘要和更新日期；单条与页脚进入 /knowledge-base |
| `src/utils/workbenchData.js` | 白名单映射和油耗格式；数据进入响应式状态及 state 事件前即裁剪；摘要按 Unicode 字符截取 90 字加省略号，日期取服务端 LocalDateTime 的年月日，不转换时区 |
| `src/utils/workbenchLayout.js` | 注册 fuel / APP_FUEL_STATS、knowledge / APP_KNOWLEDGE_BASE，旧布局补末尾且默认可见；配置 mobileFolded |
| `src/components/workbench/WorkbenchPanel.vue` | 映射新卡、授权后挂载、移动默认一行摘要、整理态排序/显隐与 refreshKey 刷新 |
| `src/components/workbench/workbench.css` | 五卡为三列两行、首卡跨两行；六卡为三列两行，行高至少 320px，容器自增高；721–1180px 两列，≤720px 单列；内容保留滚动，摘要视觉最多两行 |
| `src/api/workbenchPreference.js`（新增） | GET/PUT 客户端，只发送 version/schemaVersion/payload；保留 Axios response；没有接入工作台 |
| `src/utils/__tests__/workbench.test.js` | 更新六卡预期；增加旧布局迁移、白名单、截断、记录上限与零元历史测试 |
| `src/components/__tests__/workbench.component.spec.js` | 更新持久化布局预期 |
| `src/components/__tests__/workbenchPhase2.component.spec.js`（新增） | 两卡加载/空/失败重试/业务错误/正常/卸载/过期响应；DOM 和 state 白名单、授权过滤、布局模板、排序显隐、移动摘要、快速新增刷新 |
| `src/components/__tests__/workbenchPreference.component.spec.js`（新增） | 使用真实 request 拦截器和合成 Axios adapter 验证 GET/PUT、初始文档、version 0/2 的 409 最新 data、不登出、网络错误及 401 原行为 |
| `docs/workbench.md` | 当前行为、字段来源及验证边界 |

两卡复用 CardState/useWorkbenchResource 的独立骨架、空态、失败重试和过期/卸载响应保护。未授权不挂载、不请求，整理态同样不显示。油耗空态检查最近记录、车辆记录数、累计实付/油量；有历史而本月为零时显示 ¥0.00。无可计算平均油耗显示「暂无」，单次 fuelConsumption 为 null 时不显示，0 正常显示。不请求地区油价、报表、随机推荐或经验详情，不展示油耗附件/备注及经验正文/附件/审核信息/属主。

### 后端字段对照

只读核对根目录 `/workspace/gak/GnomishArmyKnife`。下表简写：

- F = `gak-modules/gak-fuel-stats/src/main/java/com/gak/fuelstats`
- K = `gak-modules/gak-knowledge-base/src/main/java/com/gak/knowledgebase`
- R = `gak-framework/src/main/java/com/gak/framework/response`

| 字段 | 后端文件:行 | 用途 |
| --- | --- | --- |
| currentMonthAmount | F/vo/FuelSummaryVO.java:16 | 本月实付 |
| averageConsumption | F/vo/FuelSummaryVO.java:15 | 综合平均油耗 L/100km |
| totalAmount、totalFuelVolume | F/vo/FuelSummaryVO.java:11、:13 | 仅辅助历史非空判定 |
| recentRecords、vehicleStats | F/vo/FuelSummaryVO.java:18、:17 | 最近记录与车辆摘要 |
| fuelDate、vehicleName | F/vo/FuelRecordVO.java:16、:15 | 日期与车辆名 |
| discountedAmount、fuelConsumption | F/vo/FuelRecordVO.java:22、:32 | 单次实付与可选油耗 |
| vehicleName、averageConsumption、recordCount | F/vo/FuelVehicleStatVO.java:10、:14、:15 | 车辆摘要；记录数仅辅助历史判定 |
| title、category、summary、updatedAt | K/vo/KnowledgeEntryVO.java:14、:15、:19、:26 | 展示白名单 |
| content、attachments、reviewRemark、ownerUserId | K/vo/KnowledgeEntryVO.java:20、:27、:24、:13 | 丢弃，不渲染、不传给面板 |
| reviewedBy、reviewedAt | K/vo/KnowledgeEntryVO.java:22、:23 | 审核信息同样丢弃 |
| list、total | R/PagedResult.java:12 | 只读取 list，total 不参与展示数量推算 |
| view、pageNo、pageSize | K/dto/KnowledgeEntryQueryRequest.java:20、:13、:17 | published、1、5；pageSize 最大 100（:16） |
| code、message、data | R/ApiResponse.java:11，成功码 :13 | 沿用 workbenchPayload 解包 |

FuelRecordController.java:96–99 的 summary 无查询参数；FuelRecordService.java:151–162 汇总，:50 限制最近四条，:370–378 按服务端 YearMonth.now()、fuelDate 汇总 discountedAmount。KnowledgeBaseController.java:39–43 是登录态分页；KnowledgeBaseService.java:224–232 按已发布、更新时间/id 降序，:401–409 处理 view，:372 普通用户新增为 PENDING。部署时区仍须在联调环境确认。

### 偏好客户端

后端实现见 GnomishArmyKnife docs/workbench-preferences-contract.md；客户端尚未接入工作台，联调留到里程碑③。

GET 初始文档为 `{version: 0, schemaVersion: 1, payload: null}`，PUT 发送 `{version, schemaVersion, payload}`，须使用 `Content-Type: application/json`；缺失或错误 Content-Type 返回 415，token 对应用户不存在返回 401。GET 和 409 对已存数据宽松返回，`data.version` 始终为 JSON 数字。

未修改 request.js：既有拦截器对 `409 / WORKBENCH_PREFERENCE_VERSION_CONFLICT`（message 为「布局已在其他设备更新，请查看后选择保留云端或用本地覆盖。」）原样 reject AxiosError。调用方从 `error.response.data` 取完整响应体、`error.response.data.data` 取最新文档。测试使用该契约原文验证最新 data 可取、不登出，同时验证 401 清理登录态/跳转行为保持。工作台未使用此客户端，整理仍只写 localStorage。

### 快速新增同步

已检查 quickCreateRegistry.js、QuickCreateDialog.vue、Home.vue 及 WorkbenchCommandHost。既有 FUEL_RECORD/KNOWLEDGE_ENTRY 已按对应 APP 授权注册，新卡转发同一类型，复用原表单初始化、校验及提交链路，无新增业务类型/字段/默认值/依赖数据。经验空态明确「新增经验可能需要审核」，不承诺立即出现。成功后既有 gak:quick-created → refreshKey 刷新两卡；组件测试覆盖桌面、移动展开后的新增类型与刷新。

### 本次验证与限制

- Node.js v24.22.1；无新依赖，锁文件未变。
- `npm run test:unit`：28/28 文件通过；同一 glob 补跑 `--test-isolation=none` 核对 **148/148 用例通过**。
- `npm run test:component`：**395 通过、2 失败、1 跳过**，共 398 用例；新增 21 个组件/API 用例全部通过。失败仅为既有 instrumentPractice.component.spec.js 的「录制中切换乐器会先提交片段并停止旧声部」（0/30 与预期 0/10 不符）和「第 11 段录制前明确提示会覆盖当前乐器最旧记录」。未修改该文件。
- `npx vite build --outDir /tmp/wb2/dist-check --emptyOutDir` 通过。日志为 `/tmp/wb2/test-unit.log`、`test-unit-cases.log`、`test-component.log`、`build.log`。
- 桌面五六卡及移动折叠已做组件断言，未完成真实浏览器视觉验收：尝试 `python3 -m http.server 5182 --bind 127.0.0.1 --directory /tmp/wb2/dist-check` 时，沙箱创建 socket 报 `PermissionError: [Errno 1] Operation not permitted`，服务未启动。需在允许本地监听的环境使用此独立端口、配置合成 API 响应，检查 1440px/1024px/390px 的卡片位置、水平溢出、整理和折叠。
- 未连接真实业务后端；偏好 GET/PUT/409、服务端时区和业务授权仍须后续联调。前端隐藏不替代后端鉴权。
- 未提交/推送/部署，未修改后端，未操作 5173/8080 或 55432 数据库。

以下保留首期实现与验收历史，其中“四卡”仅指首期。

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
