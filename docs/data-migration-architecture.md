# 数据迁移功能架构设计

本文档描述系统菜单“数据迁移”的推荐实现方式，目标是让管理员可以在不同环境之间导出、导入系统数据和业务数据，并按需携带附件。

## 1. 目标与边界

- 仅管理员可见、可操作。
- 支持导出系统数据、业务数据或两者组合。
- 支持按应用维度选择业务数据，避免每次都全量迁移。
- 导出结果统一生成 ZIP 包，便于跨环境传输。
- 导入时支持严格、合并、覆盖三种策略。
- 导入导出都沉淀为任务，保留执行状态、统计值、失败原因和下载地址。

## 2. 前端架构

页面路由：`/system/data-migrations`

页面沿用现有系统管理模块的全局壁纸背景和毛玻璃容器，不单独覆盖全局背景层。

页面分为三块：

1. 导出配置区
   - 快捷模式：全部数据、仅系统数据、仅业务数据、自定义。
   - 系统资源勾选：用户、应用目录、权限、字典、系统参数。
   - 业务资源勾选：按应用目录中的 `featureCode` 选择。
   - 导出选项：包名、是否包含附件、迁移说明。

2. 导入执行区
   - 上传 ZIP 包。
   - 选择导入策略：`MERGE` / `OVERWRITE` / `STRICT`。
   - 选择是否导入附件、是否遇错继续。

3. 任务记录区
   - 展示导出、导入历史记录，而不只是最近一次任务。
   - 支持按任务类型、执行状态筛选，并支持分页查看。
   - 支持查看状态、统计值和导出包下载。
   - 导出历史支持删除，删除时应同步清理对应 ZIP 压缩包和冗余文件。
   - 前端可缓存最近一批历史记录，在任务接口短暂不可用时作为只读兜底。

## 3. 后端架构

推荐拆成四层：

1. 资源清单层
   - 统一管理可迁移资源编码。
   - 系统资源使用固定编码。
   - 业务资源直接复用应用目录中的 `appCode/featureCode`。

2. 归档打包层
   - 导出时根据资源清单拉取数据库数据。
   - 如果资源带附件，则联动文件服务拉取附件。
   - 生成 `manifest.json`、结构化数据文件、附件目录后压缩为 ZIP。

3. 导入校验层
   - 校验 ZIP 结构、`manifest` 版本、来源环境、校验和、资源依赖关系。
   - 校验通过后再进入执行层。

4. 任务执行层
   - 导入导出都按任务执行。
   - 任务记录建议包含：任务号、类型、状态、资源数、记录数、附件数、操作人、开始时间、结束时间、错误信息、下载地址。
   - 任务记录必须持久化，供前端历史列表分页查询。
   - 导出任务删除时，应同步删除任务关联的 ZIP 包、临时压缩文件和可清理的冗余归档文件。

## 4. 包结构建议

```text
data-migration-20260329.zip
├── manifest.json
├── system/
│   ├── users.json
│   ├── apps.json
│   ├── permissions.json
│   └── dictionaries.json
├── business/
│   ├── APP_TODO_LIST/
│   │   └── data.json
│   └── APP_WORK_LOG/
│       └── data.json
└── attachments/
    ├── index.json
    └── ...
```

`manifest.json` 建议至少包含：

- `packageName`
- `packageVersion`
- `sourceEnv`
- `createdAt`
- `createdBy`
- `systemResourceCodes`
- `businessAppCodes`
- `recordCount`
- `attachmentCount`
- `checksum`
- `compatibleVersion`

## 5. 附件处理建议

如果业务模块存在图片、图标、上传文件、附件索引等内容，后端建议接入文件服务，不要把附件直接硬塞在业务表里：

- 对象存储：MinIO、阿里云 OSS、Amazon S3
- 文件服务：Nginx 静态目录、本地文件服务器
- 打包组件：`zip4j`、`commons-compress`

导出时：

- 结构化数据保留附件元数据。
- 附件文件按资源清单同步归档到 `attachments/`。

导入时：

- 先恢复附件，再回填业务表中的附件地址或文件 ID。
- 如果目标环境使用文件服务，建议返回新的文件 URL 或文件标识。

## 6. 任务模型建议

建议新增迁移任务表：`gak_data_migration_task`

核心字段：

- `id`
- `task_no`
- `task_type`
- `status`
- `scope_mode`
- `package_name`
- `system_resource_codes`
- `business_app_codes`
- `record_count`
- `attachment_count`
- `file_url`
- `file_storage_type`
- `error_message`
- `operator_user_id`
- `created_at`
- `finished_at`

如需更细颗粒度统计，可增加明细表：`gak_data_migration_task_item`。

## 7. 典型流程

### 7.1 导出流程

1. 前端读取资源清单。
2. 管理员选择导出范围并提交。
3. 后端创建导出任务。
4. 后端组装结构化数据和附件。
5. 后端生成 ZIP 包并回填下载地址。
6. 前端在任务列表展示状态，并允许下载。
7. 前端把返回的任务写入历史区，并在需要时缓存最近结果。

### 7.2 导入流程

1. 前端上传 ZIP 包和导入参数。
2. 后端落临时文件或文件服务。
3. 后端解析 `manifest.json` 并做校验。
4. 校验通过后按策略执行导入。
5. 导入完成后写入任务结果。
6. 前端刷新任务列表查看结果。
