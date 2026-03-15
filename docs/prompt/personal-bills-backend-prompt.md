# 个人账单后端接口代码生成提示词

本文档用于把前端已预留的“个人账单”接口一次性生成为后端代码。  
注意：`年度预算` 功能已经并入 `个人账单` 页面，不再作为独立应用存在。  
前端项目已固定以下接口路径（基于 `/api` 代理后的实际后端路径）：

- `GET /personal-bills`：分页查询账单列表
- `POST /personal-bills`：新增账单
- `PUT /personal-bills/{id}`：编辑账单
- `DELETE /personal-bills/{id}`：删除账单
- `GET /personal-bills/summary`：查询账单汇总与预算执行情况
- `GET /personal-bills/budgets`：查询年度预算列表
- `POST /personal-bills/budgets`：新增年度预算
- `PUT /personal-bills/budgets/{id}`：编辑年度预算
- `DELETE /personal-bills/budgets/{id}`：删除年度预算

## 1. 推荐统一返回结构

```json
{
  "code": "0",
  "message": "success",
  "data": {
    "list": [],
    "total": 0
  }
}
```

说明：
- 列表接口返回 `data.list` + `data.total`
- 汇总接口返回 `data` 为单个对象
- 失败时返回清晰 `message`，前端会直接展示

## 2. 可直接投喂 AI 的全量生成 Prompt

```text
你是一名资深 Java 后端工程师，请基于 Spring Boot 3 + Spring Web + Spring Validation + Spring Security + Spring Data JPA（或 MyBatis）生成“个人账单模块”完整代码，要求可直接运行。

【目标】
实现以下 REST 接口（基础路径 /personal-bills）：
1) GET /personal-bills
   - 查询参数：pageNo(默认1), pageSize(默认10), month(可选, 格式 YYYY-MM), billType(可选), categoryName(可选), keyword(可选)
   - keyword 匹配：categoryName、accountName、paymentMethod、merchantName、note
   - 返回分页列表：{ list: PersonalBillListVO[], total: number }
2) POST /personal-bills
   - 入参：
     billType, categoryName, amount, accountName, paymentMethod, merchantName, billDate, note
3) PUT /personal-bills/{id}
   - 入参同新增
4) DELETE /personal-bills/{id}
5) GET /personal-bills/summary
   - 查询参数：month(可选, YYYY-MM), year(可选)
   - 返回：
     {
       currentMonthExpense: number,
       currentMonthIncome: number,
       currentMonthBalance: number,
       currentYearExpense: number,
       annualBudgetAmount: number,
       annualBudgetUsed: number,
       annualBudgetRemaining: number,
       annualBudgetUsageRate: number,
       categoryDistribution: CategoryDistributionVO[],
       recentBills: PersonalBillSimpleVO[],
       budgetProgressList: BudgetProgressVO[]
     }
6) GET /personal-bills/budgets
   - 查询参数：year(可选)
   - 返回分页或普通列表均可，前端支持 `data.list`
7) POST /personal-bills/budgets
   - 入参：year, categoryName, annualLimit, alertThreshold, note
8) PUT /personal-bills/budgets/{id}
   - 入参同新增
9) DELETE /personal-bills/budgets/{id}

【数据模型】
请生成两张表：

表 1：personal_bill
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- billType (EXPENSE / INCOME)
- categoryName
- amount (decimal)
- accountName (nullable)
- paymentMethod (nullable)
- merchantName (nullable)
- billDate (date)
- note (nullable)
- createdAt
- updatedAt

表 2：annual_budget
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- year (int)
- categoryName
- annualLimit (decimal)
- alertThreshold (decimal, 0-1)
- note (nullable)
- createdAt
- updatedAt

【业务规则】
- billType 只允许：EXPENSE / INCOME
- categoryName 必填，长度不超过 32
- amount 必填，且 > 0
- billDate 必填
- accountName、paymentMethod、merchantName、note 可为空
- budget.year 必填，建议 4 位年份
- annualLimit 必填，且 > 0
- alertThreshold 必填，范围 0 < x <= 1
- 当前登录用户只能访问自己的账单和预算
- 账单列表按 billDate DESC, id DESC 排序
- summary 中：
  1. currentMonthExpense = month 范围内支出总额
  2. currentMonthIncome = month 范围内收入总额
  3. currentMonthBalance = 收入 - 支出
  4. currentYearExpense = year 范围内支出总额
  5. annualBudgetAmount = 当前年度预算总额
  6. annualBudgetUsed = 当前年度预算分类对应的支出总额
  7. annualBudgetRemaining = annualBudgetAmount - annualBudgetUsed，不低于 0
  8. annualBudgetUsageRate = annualBudgetUsed / annualBudgetAmount
  9. categoryDistribution 返回当前月份的支出分类占比
  10. budgetProgressList 返回每个预算分类的 usedAmount、remainingAmount、usageRate 和状态
- 如果 month 未传，可默认当前月份；year 未传可从 month 推断当前年份

【推荐返回 VO】
PersonalBillListVO:
- id
- billType
- categoryName
- amount
- accountName
- paymentMethod
- merchantName
- billDate
- note
- updatedAt

PersonalBillSimpleVO:
- id
- billType
- categoryName
- amount
- billDate

CategoryDistributionVO:
- categoryName
- amount
- ratio

BudgetProgressVO:
- id
- year
- categoryName
- annualLimit
- alertThreshold
- usedAmount
- remainingAmount
- usageRate（百分比值，0-100，方便前端直接渲染进度条宽度）
- statusClass
- statusText
- note

AnnualBudgetListVO:
- id
- year
- categoryName
- annualLimit
- alertThreshold
- note

PersonalBillSummaryVO:
- currentMonthExpense
- currentMonthIncome
- currentMonthBalance
- currentYearExpense
- annualBudgetAmount
- annualBudgetUsed
- annualBudgetRemaining
- annualBudgetUsageRate
- categoryDistribution[]
- recentBills[]
- budgetProgressList[]

【返回格式】
统一返回：
{
  "code": "0",
  "message": "success",
  "data": ...
}
失败时 code 非 0，message 为可读错误信息。

【代码输出要求】
- 按 Controller / Service / Repository(Mapper) / Entity / DTO / VO / Exception / Config 分层输出
- 提供 MySQL 8 建表 SQL
- 提供至少 12 条账单测试数据和 5 条预算测试数据
- 覆盖收入 / 支出、多分类、多月份、多预算超额和预警情况
- 提供 curl 示例
- 代码中补充关键注释，不要只给伪代码
```

## 3. 单接口增量 Prompt

### 3.1 汇总接口

```text
请为现有 Spring Boot 项目新增 GET /personal-bills/summary 接口。
查询参数：month(可选), year(可选)

要求：
1) 只统计当前登录用户自己的账单和预算
2) 返回 currentMonthExpense、currentMonthIncome、currentMonthBalance、currentYearExpense
3) 返回 annualBudgetAmount、annualBudgetUsed、annualBudgetRemaining、annualBudgetUsageRate
4) 返回 categoryDistribution、recentBills、budgetProgressList
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

### 3.2 账单列表接口

```text
请为现有 Spring Boot 项目新增 GET /personal-bills 分页接口。
查询参数：pageNo, pageSize, month, billType, categoryName, keyword

要求：
1) 只查询当前登录用户自己的账单
2) keyword 匹配 categoryName、accountName、paymentMethod、merchantName、note
3) 返回 data.list + data.total
4) 列表按 billDate DESC, id DESC
5) 提供 Controller + Service + Mapper/Repository + VO + 单元测试
```

### 3.3 年度预算接口

```text
请为现有 Spring Boot 项目新增 GET/POST/PUT/DELETE /personal-bills/budgets 系列接口。

要求：
1) 字段：year, categoryName, annualLimit, alertThreshold, note
2) alertThreshold 范围限制为 0 < x <= 1
3) 只允许当前登录用户维护自己的预算
4) 返回统一结构：{ code, message, data }
5) 提供 Controller + Service + DTO + VO + 单元测试
```

## 4. 联调约定

- 前端接口文件固定为 `src/api/personalBills.js`
- 前端页面固定路由为 `/personal-bills`
- `年度预算` 功能已整合进 `个人账单` 页面，不再单独提供应用入口
- 前端后端未联通时会回退本地演示数据
- 前端预算进度以 `year + categoryName` 对应支出账单来计算
- 如果后端返回结构不是 `data.list/data.total`，或 summary / budgets 字段名不一致，请同步调整前端解析逻辑
