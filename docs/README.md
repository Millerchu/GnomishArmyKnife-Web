# 前端文档索引

现行说明核对于 2026-10-15：

- [README](../README.md)：环境、开发代理、测试、构建和部署。
- [架构与功能清单](architecture.md)：目录、路由/API、登录与权限。
- [数据迁移实现](data-migration-architecture.md)：资源、异步任务、归档与局限。

prompt/ 是历史跨端需求，superpowers/specs/ 与 superpowers/plans/ 是历史设计与实施计划，保留原文用于理解需求和决策，不作为现行完整接口规范。软件仓库提示词描述了预期能力，但当前配套后端未提供对应 Controller。

public/instrument-samples/NOTICE.md 是采样来源和许可说明，保留素材归属信息。后端接口以 Controller、DTO/VO、Service 为准；前端请求以 src/api 为准。Compose/NAS 说明位于配套后端 deploy/nas/。
