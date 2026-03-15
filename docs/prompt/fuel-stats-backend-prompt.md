# 油耗统计后端接口代码生成提示词

本文档用于把前端已预留的“油耗统计”接口一次性生成为后端代码。  
前端项目已固定以下接口路径（基于 `/api` 代理后的实际后端路径）：

- `GET /fuel-records`：分页查询加油记录列表
- `POST /fuel-records`：新增加油记录
- `PUT /fuel-records/{id}`：编辑加油记录
- `DELETE /fuel-records/{id}`：删除加油记录
- `GET /fuel-records/summary`：查询油耗统计汇总信息
- `GET /fuel-records/latest-prices`：查询当前最新油价
- `GET /fuel-records/reports`：查询图表报表数据

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
- 列表接口返回 `data.list` + `data.total`。
- 汇总接口返回 `data` 为单个对象。
- 失败时返回清晰 `message`，前端会直接展示。

## 2. 可直接投喂 AI 的全量生成 Prompt

```text
你是一名资深 Java 后端工程师，请基于 Spring Boot 3 + Spring Web + Spring Validation + Spring Security + Spring Data JPA（或 MyBatis）生成“油耗统计模块”完整代码，要求可直接运行。

【目标】
实现以下 REST 接口（基础路径 /fuel-records）：
1) GET /fuel-records
   - 查询参数：pageNo(默认1), pageSize(默认10), keyword(可选), vehicleName(可选), fuelType(可选), fillType(可选)
   - keyword 匹配：vehicleName、stationName、note
   - 返回分页列表：{ list: FuelRecordListVO[], total: number }
2) POST /fuel-records
   - 入参：
     vehicleName, fuelDate, odometerKm, fuelVolume, totalAmount, discountedAmount, unitPrice, fuelType, fillType, stationName, note
3) PUT /fuel-records/{id}
   - 入参同新增
4) DELETE /fuel-records/{id}
5) GET /fuel-records/summary
   - 查询参数：vehicleName(可选), fuelType(可选), fillType(可选)
   - 返回：
     {
       totalPaidAmount: number,
       totalDiscountAmount: number,
       totalFuelVolume: number,
       averageUnitPrice: number,
       averageConsumption: number,
       currentMonthAmount: number,
       vehicleStats: VehicleStatVO[],
       recentRecords: FuelRecordSimpleVO[]
     }
6) GET /fuel-records/latest-prices
   - 返回：
     {
       publishDate: string,
       prices: {
         "92": number,
         "95": number,
         "98": number,
         "DIESEL": number
       }
     }
7) GET /fuel-records/reports
   - 查询参数：vehicleName(可选), fuelType(可选), fillType(可选)
   - 返回：
     {
       currentYearMonthlyFuel: MonthlyFuelReportVO[],
       yearlyCostStats: YearlyCostReportVO[]
     }

【数据模型】
请生成 fuel_record 表，字段至少包含：
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- vehicleName
- fuelDate (date)
- odometerKm (decimal/int)
- fuelVolume (decimal)
- totalAmount (decimal, 加油原价金额)
- discountedAmount (decimal, 实际优惠后金额)
- unitPrice (decimal)
- fuelType (92 / 95 / 98 / DIESEL)
- fillType (FULL / PARTIAL)
- stationName (nullable)
- note (nullable)
- createdAt
- updatedAt

【业务规则】
- vehicleName 必填，长度不超过 40
- fuelDate 必填
- odometerKm 必填，且 >= 0
- fuelVolume 必填，且 > 0
- totalAmount 必填，且 > 0
- discountedAmount 必填，且 > 0，且不能大于 totalAmount
- unitPrice 可选；如果前端未传，则由 discountedAmount / fuelVolume 自动计算
- fuelType 只允许：92 / 95 / 98 / DIESEL
- fillType 只允许：FULL / PARTIAL
- 当前登录用户只能访问自己的记录
- 列表按 fuelDate 降序、odometerKm 降序
- summary 接口中的 averageConsumption 计算建议：
  1. 按 vehicleName 分组
  2. 同车按 fuelDate + odometerKm 升序
  3. 取当前记录与上一条记录的里程差 distanceKm
  4. distanceKm > 0 时，估算油耗 = fuelVolume / distanceKm * 100
  5. 对所有可计算记录求平均或按总里程/总油量求综合油耗
- currentMonthAmount 为当前自然月花费总额
- recentRecords 返回最近 4 条记录即可

【推荐返回 VO】
FuelRecordListVO:
- id
- vehicleName
- fuelDate
- odometerKm
- fuelVolume
- totalAmount
- discountedAmount
- discountAmount
- unitPrice
- fuelType
- fillType
- stationName
- note
- distanceKm
- fuelConsumption
- createdAt
- updatedAt

FuelSummaryVO:
- totalPaidAmount
- totalDiscountAmount
- totalFuelVolume
- averageUnitPrice
- averageConsumption
- currentMonthAmount
- vehicleStats[]
- recentRecords[]

VehicleStatVO:
- vehicleName
- totalAmount
- totalDiscountAmount
- totalFuelVolume
- averageConsumption
- recordCount

FuelRecordSimpleVO:
- id
- vehicleName
- fuelDate
- fuelVolume
- totalAmount
- discountedAmount

MonthlyFuelReportVO:
- label
- fuelVolume
- totalAmount（优惠后实付金额）

YearlyCostReportVO:
- label
- totalAmount（优惠后实付金额）
- totalFuelVolume

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
- 提供至少 8 条初始化测试数据，覆盖不同车辆、油号、满油/补油、不同金额与里程
- 提供 curl 示例
- 代码中补充关键注释，不要只给伪代码
```

## 3. 单接口增量 Prompt

### 3.1 汇总接口

```text
请为现有 Spring Boot 项目新增 GET /fuel-records/summary 接口。
查询参数：vehicleName(可选), fuelType(可选), fillType(可选)

要求：
1) 只统计当前登录用户自己的 fuel_record
2) 返回 totalPaidAmount、totalDiscountAmount、totalFuelVolume、averageUnitPrice、averageConsumption、currentMonthAmount
3) 同时返回 vehicleStats 和 recentRecords
4) 里程差与油耗计算逻辑放到 Service 层
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

### 3.2 列表接口

```text
请为现有 Spring Boot 项目新增 GET /fuel-records 分页接口。
查询参数：pageNo, pageSize, keyword, vehicleName, fuelType, fillType

要求：
1) 只查询当前登录用户自己的记录
2) keyword 匹配 vehicleName、stationName、note
3) 返回 data.list + data.total
4) 列表按 fuelDate 降序、odometerKm 降序
5) 提供 Controller + Service + Mapper/Repository + VO + 单元测试
```

### 3.3 最新油价接口

```text
请为现有 Spring Boot 项目新增 GET /fuel-records/latest-prices 接口。

要求：
1) 返回当前最新油价发布时间 publishDate
2) 返回 92 / 95 / 98 / DIESEL 四种油价
3) 若系统后续支持地区维度，可预留 regionCode 参数
4) 返回统一结构：{ code, message, data }
5) 提供 Controller + Service + VO + 单元测试
```

### 3.4 图表报表接口

```text
请为现有 Spring Boot 项目新增 GET /fuel-records/reports 接口。
查询参数：vehicleName(可选), fuelType(可选), fillType(可选)

要求：
1) 只统计当前登录用户自己的数据
2) 返回 currentYearMonthlyFuel：当年 1-12 月加油量与优惠后实付金额
3) 返回 yearlyCostStats：按年汇总燃油实付金额与加油量
4) 结果按时间顺序返回，方便前端直接绘制条形图
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

## 4. 联调约定

- 前端接口文件固定为 `src/api/fuelStats.js`
- 前端页面固定路由为 `/fuel-stats`
- 前端在后端不可用时会自动回退本地演示数据
- 前端列表支持 `keyword / vehicleName / fuelType / fillType` 组合筛选
- 前端会展示估算油耗 `fuelConsumption`；如果后端列表直接返回该字段，前端会优先使用
- 前端会调用 `GET /fuel-records/latest-prices` 展示最新油价
- 前端会调用 `GET /fuel-records/reports` 绘制“当年每月用油统计”和“各年用油花费统计”条形图，图中金额口径为优惠后实付金额
- 前端登记记录时会同时提交 `totalAmount`（原价）和 `discountedAmount`（优惠后金额），页面会自行展示 `discountAmount`
- 如果后端返回结构不是 `data.list/data.total`，或 summary / latest-prices / reports 字段名不一致，请同步调整前端解析逻辑
