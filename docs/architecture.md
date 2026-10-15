# 前端架构与功能清单

核对日期：2026-10-15。依据 router、API、应用目录、页面与配套后端源码。

## 代码组织

| 目录 | 职责 |
| --- | --- |
| src/views | 路由页面、交互、数据加载 |
| src/components | 共享 UI、编辑器、MacDialog、系统对话框、需求看板 |
| src/api | Axios 业务请求、附件和消息流请求 |
| src/router | 懒加载、history 路由与导航守卫 |
| src/store/user.js | 用户状态；当前未引入 Pinia/Vuex |
| src/features/messages | 跨页面消息状态与样式 |
| src/features/instrument-practice | 乐器界面、音频引擎、录制、节拍器、简谱、composables |
| src/constants | 应用目录、图标、业务选项 |
| src/utils | 登录存储、导航判断、转换和纯函数 |
| public | 图标、乐器采样等静态资源 |

典型链路是页面 → src/api → request.js → 后端。消息、乐器功能拥有独立目录，并非所有状态都在 store。复用 UI 先查 MacDialog、SystemDialogHost、编辑器及已有图标。

## 路由/API 对照

API 为后端前缀，浏览器默认再加 `/api`。

| 页面入口 | 用途 | API / 边界 |
| --- | --- | --- |
| /login、/register | 登录注册 | /auth |
| /home | 桌面、内嵌需求看板 | 应用/授权接口；看板 /requirement-items |
| /growth-record | 芽记 | /growth-records |
| /travel-record | 行笺 | /travel-records、/travel-groups |
| /messages、/system/messages | 收件箱、管理发布 | /messages |
| /calculator、/star-interactive | 计算器、星空交互 | 无对应独立后端模块 |
| /work-log | 工作日志 | /work-logs |
| /password-memo | 密码备忘 | /password-memos |
| /todo-list | 待办 | /todo-items |
| /fuel-stats | 油耗 | /fuel-records、/fuel-vehicles |
| /wow-character-stats | WoW 角色 | /wow-characters、/wow-specialization-guides |
| /personal-bills | 账单 | /personal-bills |
| /knowledge-base | 经验库 | /knowledge-base |
| /health | 健康 | /health-records |
| /instrument-practice | 随身乐器 | 本地音频；作品 /instrument-practice/takes |
| /software-repo | 软件仓库 | 请求 /software-packages；当前后端缺少实现 |
| /system/users | 用户 | /system/users |
| /system/apps | 应用 | /system/apps |
| /system/permissions | 授权 | /system/permissions |
| /system/dictionaries | 字典 | /system/dictionaries |
| /system/data-migrations | 迁移 | /system/data-migrations |

需求看板是 Home.vue 内的 RequirementBoard 组件，没有独立路由。消息中心不要求应用授权，消息管理要求管理员。

## 请求、状态与权限

request.js 默认基础路径 /api、8 秒超时、withCredentials 为 true，读取 localStorage Token 设置 Bearer 头。拦截器返回 Axios response，没有自动统一解包；页面需读取 response.data 中的业务包。普通成功码为字符串 "0"，分页为 data.list、data.total，Long ID 为字符串，避免 Number(id) 丢失精度。

HTTP 401 或约定的登录失效码/信息触发登录状态清理和跳转；公开认证与公开精选请求有例外。下载使用 blob，SSE 走专门流式逻辑。

routeAccess.js 将 /login、/register 视为公开页面，其余要求 token 与 user 同时存在，登录用户访问 /login 转 /home。当前仅消息管理路由显式声明 requiresAdmin。桌面应用可见性、业务页面权限是另一层，不能声称守卫统一验证了全部 APP_* 权限；后端仍须检查授权和数据归属。

appCatalog.js 保存目录与元数据，实际可用性依赖后端状态和授权。目录标记、页面存在、后端实现是不同证据。

## 消息、附件与维护

消息状态跨路由复用 SSE 连接，通知触发刷新并有轮询补查，持久化状态以后端为准。代理需支持流式响应。

附件已有公共 API 与鉴权图片组件，新增上传先复用；行程与健康还涉及账单关联、迁移恢复，不能仅改显示字段就改变来源语义。

新增应用同步后端契约、API、页面、路由、featureCode、权限、图标和测试。复杂复用逻辑放 features/utils；页面缓存不代表业务保存成功。测试范围见 [README](../README.md#验证与构建)。
