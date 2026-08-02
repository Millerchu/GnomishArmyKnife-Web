# 工作日志周报项目汇总实施计划

## 目标

在不修改后端契约的前提下，为周报中的每个项目增加总人天和项目内禅道号汇总。

## 实施步骤

1. 扩展 `src/utils/workLogCalendar.js` 的 `buildWeeklyReportGroups`，在现有单次项目聚合中累计 `personDayTotal`，并按中英文逗号拆分、收集首次出现顺序去重的 `zentaoNos`。
2. 扩展 `src/utils/__tests__/workLogCalendar.test.js`，覆盖人天求和、禅道号清洗去重、项目隔离及零人天排除。
3. 修改 `src/views/WorkLog.vue` 的周报项目卡片，增加项目标题元信息和禅道号行，并补充桌面端、窄屏样式。
4. 扩展 `src/views/__tests__/workLogDialog.component.spec.js`，验证每个项目的人天和禅道号独立展示。
5. 运行聚焦测试、完整前端测试、生产构建及 `git diff --check`。
