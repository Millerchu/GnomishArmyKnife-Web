# 数据迁移当前实现

核对日期：2026-10-15。本文替代早期推荐方案，依据 DataMigration.vue、src/api/dataMigration.js 与后端 gak-data-migration。代码机制不代表目标环境已通过恢复验收。

## 页面与接口

页面 /system/data-migrations 提供资源选择、导出配置、ZIP 导入和分页任务历史。后端 DataMigrationAdminGuard 限制管理员操作。浏览器前缀 /api/system/data-migrations，代理去掉 /api。

| 方法 | 相对路径 | 行为 |
| --- | --- | --- |
| GET | /resources | 实际可迁移资源 |
| GET | /tasks、/tasks/{taskId} | 历史、详情 |
| POST | /exports | 创建导出 |
| POST | /imports | multipart：file 与 JSON 字符串 metadata |
| GET | /tasks/{taskId}/download | blob 下载 |
| DELETE | /tasks/{taskId} | 删除导出任务与归档清理 |

页面最多缓存 80 条本地历史，接口失败时降级显示；缓存不能证明服务端任务已完成。

## 后端分工

| 实现 | 职责 |
| --- | --- |
| DataMigrationService | 鉴权、任务创建/查询、删除、下载 |
| MigrationResourceHandler | 资源定义、顺序、业务导出/导入 |
| DataMigrationTaskExecutionService | 执行、统计、失败记录 |
| DataMigrationArchiveService | JSON、ZIP、manifest、校验和 |
| DataMigrationPackageStorageService / 本地实现 | 归档与临时文件 |
| AttachmentMigrationSupport | 附件导出恢复与绑定 |
| LegacyAttachmentMigrationRunner | 历史附件迁移 |

任务及明细已落库，创建事务提交后由 TaskExecutor 执行。进程内异步执行不等于具备持久队列、跨实例消费或重启续跑。

## 可迁移范围

Handler 覆盖用户、应用、权限、字典、审计，以及待办、工作日志、密码备忘、WoW 角色、账单、经验库、健康、油耗、行程。实际可选项以 /resources 为准。

当前没有芽记、站内消息、随身乐器、需求看板和软件仓库的专属 Handler，“全部数据”不能理解为全库备份。新增应用需单独实现 Handler 并验证恢复。

行程资源包含关联支付/退款账单，个人账单资源避免重复导出行程账单。完整恢复要带用户资源或保证目标用户存在，详见后端 gak-modules/gak-data-migration/docs/travel-record-backup.md。

## 归档与校验

Handler 提供 JSON 相对路径，归档服务写入 manifest.json；有附件时生成 attachments/index.json 并复制文件。manifest 记录包名、版本、来源、创建信息、资源选择、记录/附件数、checksum、兼容版本和资源版本。

导入检查 manifest 存在、必需字段和校验和，解包包含路径边界检查。记录版本字段不等于完整版本兼容协商，validateManifest 当前主要检查包名与创建人；不能沿用旧方案宣称已全面校验来源、版本和所有依赖。

## 导入与事务

MERGE、OVERWRITE、STRICT 的具体冲突处理由各 Handler 实现，OVERWRITE 不是无条件清空整库。执行器逐资源导入，按遇错是否继续等条件更新结果；整个 ZIP 不承诺统一回滚。

数据库与磁盘不在同一事务，失败可能留下待清理文件，已成功的其他资源也不一定回滚。先在隔离环境验证重复导入、ID/用户映射、依赖顺序、附件恢复，再处理目标数据。

## 存储与验收

GAK_DATA_MIGRATION_STORAGE_DIR 默认 ./data/data-migrations，NAS 为 /app/data/data-migrations。默认实现为本地磁盘，旧方案列举的 MinIO/OSS/S3 不能当成已接入能力。

验收覆盖管理员权限、失败详情、ZIP 下载和校验、三种策略、附件、行程账单、导出任务删除；页面可打开或构建通过不足以证明可恢复。业务迁移包不能替代数据库和文件完整备份。
