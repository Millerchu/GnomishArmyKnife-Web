# 周视图每日卡片禅道编号汇总实施计划

1. 在 `src/utils/__tests__/workLogCalendar.test.js` 补充每日汇总禅道编号的拆分、去空、顺序去重和空值断言。
2. 在 `src/utils/workLogCalendar.js` 的 `buildDateSummaryMap` 中生成每日 `zentaoNos`。
3. 在 `src/views/__tests__/workLogDialog.component.spec.js` 验证周视图有编号时显示、无编号时隐藏。
4. 在 `src/views/WorkLog.vue` 的每日卡片项目下方增加条件渲染，并沿用次要文本色与自然换行布局。
5. 运行工具函数测试、工作日志组件测试、前端测试和构建。

