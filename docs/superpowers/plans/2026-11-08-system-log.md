# 系统日志实施计划

目标：按已提供的 syslog-ui-spec.md、system-log-api-contract.md 和只读后端源码，实现管理员系统异常日志查询与详情。

约束：只修改前端仓库及用户指定的 /tmp/sl-fe/report.md；不提交、不改配置、不操作服务或数据库、不新增依赖。沿用全局主题；全部日志文本使用 Vue 插值。

1. 新增 `src/api/systemLog.js` 两个 GET wrapper，保留 Axios response；在 `src/utils/systemLog.js` 集中处理来源映射、无时区转换的时间校验与查询参数组装。
2. 新增 `src/views/SystemLog.vue`：编辑筛选与已提交筛选分开，默认无时间限制；查询/重置回第一页，手动刷新沿用已提交筛选。复用 MacTable、MacEmptyState 和现有上一页/下一页分页结构。失败清空结果，403 清空并显示权限提示。
3. 新增 `src/components/SystemLogDetail.vue`：复用 MacDialog 外观及关闭行为，设为右侧抽屉；独立加载详情并以请求序号隔离竞态。包含 404、失败重试、堆栈展开、复制反馈、焦点约束和滚动锁定。
4. 同步目录、路由和 Home 系统菜单：APP_SYSTEM_LOG、/system-log，仅管理员且后端应用授权可见；直达无权限留在页面显示指定文案。只读功能不接入快速新增。
5. 在 utils node 测试与 views/components Vitest 规格中覆盖映射、时间、参数、竞态、失败、纯文本、复制与焦点，以及入口权限。先运行专项，再执行 npm run test、npm run build、git diff --check。
6. 将文件清单、差异、真实验证结果与待联调事项写入用户指定报告。真实服务联调与部署不在此次执行范围。
