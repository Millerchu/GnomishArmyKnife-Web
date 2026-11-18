# 智订剩余开发实施计划

> 按 writing-plans 的任务隔离方式实施，分离后端业务、前端业务和集成验证；不提交 Git。

**Goal:** 将已有智订框架接入真实账号、订阅、用量、支付与统计，按评审消除重复计量和不明金额。
**Architecture:** 独立 gak-ai-subscription 模块；独立 DTO/VO/实体；所有接口校验应用授权及用户归属。Vue 主页面与快速新增复用编辑器，工作台复用 summary。
**Tech Stack:** 现有 Spring Boot / MyBatis Plus / PostgreSQL / Vue 3。

## 全局规则与评审落地
- 现有未提交改动保留；不提交、不部署远端；Logo 原样保留。
- 金额 NUMERIC/BigDecimal；ID 字符串；原币分组，不擅自汇兑。
- 用量稳定键：账号、周期标识、时区、区间、归属、指标、单位、维度。累计采用最新观测；冲突不按天拆量。跨月未分配费用标记不完整。
- 支付不可覆盖，退款引用原支付、同币种且累计不超原额。订阅退款按原覆盖区间冲减并重算历史月份（首版不封账）；终止权益显式编辑，不以退款金额推测结束时间。
- 预算约束确认成本；预计订阅成本独立展示。未知费用、缺汇率及待核对记录给出原因。
- 自动同步仅在官方能力核验后开放；未确认 Muse 产品身份时不编造地址或 API。

## 任务 1：后端手动闭环与金额核算
文件：新增 gak-modules/gak-ai-subscription；修改模块/start pom、schema；新增 docs/sql/20261118-ai-subscription-business.sql。
接口：/ai-subscriptions 下 tools/accounts/subscriptions/usage-records/payments/summary；列表返回数组；保存返回 VO；成功 code="0"。
- [x] 独立实体、DTO、VO、mapper、service、controller；账号归档保留历史。
- [x] 安全的密码摘要关联；订阅周期与自动续费记录；支付/退款原始记录；累计快照及冲突排除。
- [x] 原币三金额、预计成本、完整性原因；月份左闭右开、原始月底锚点。
- [x] 测试所有者隔离、重复累计、退款上限、跨月与闰年；Maven test/compile。

## 任务 2：真实四分区与共享编辑器
文件：src/api/aiSubscriptions.js、src/components/ai-subscriptions/*、src/views/AiSubscriptions.vue、quickCreateRegistry.js、QuickCreateDialog.vue。
- [x] 工具与账号录入；订阅、用量、支付表单；失败重试与未知值。
- [x] 三种金额独立、续费 7/30 天、官方同步能力文本。
- [x] 三个快速新增入口复用编辑器；空账号引导、权限过滤。
- [x] 组件交互测试与生产构建。

## 任务 3：工作台及集成验收
文件：AiSubscriptionsCard.vue、workbenchLayout.js、workbenchGrid.js、WorkbenchPanel.vue、验收文档。
- [x] 工作台共享 summary，移除恢复、权限与空错态。
- [x] 核对 OpenAI 组织和 xAI 团队费用接口文档，完成样例验证并记录外部账号缺口。
- [x] 核对关联、预算/提醒的可用边界，完成独立 PostgreSQL 联调。
- [x] 运行前端全测试、后端编译；在后端 `docs/ai-subscription.md` 记录既有测试失败、待实测适配器和未实现范围。
