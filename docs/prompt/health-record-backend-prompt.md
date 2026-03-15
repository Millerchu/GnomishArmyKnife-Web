# 健康应用后端接口代码生成提示词

本文档用于把前端已预留的“健康”接口一次性生成为后端代码。  
该应用用于记录个人常见健康数据，包括身高、体重、体脂率、血压、血脂、血糖、心率，以及尿酸、谷丙转氨酶、谷草转氨酶、γ-GT 等肝功能/代谢相关指标，并支持体检报告上传与上次体检时间追踪。  
前端项目已固定以下接口路径（基于 `/api` 代理后的实际后端路径）：

- `GET /health-records`：分页查询健康记录
- `POST /health-records`：新增健康记录
- `PUT /health-records/{id}`：编辑健康记录
- `DELETE /health-records/{id}`：删除健康记录
- `GET /health-records/summary`：查询健康概览
- `GET /health-records/trends`：查询各项指标趋势数据
- `GET /health-records/reports`：查询体检报告列表
- `POST /health-records/reports`：新增体检报告
- `PUT /health-records/reports/{id}`：编辑体检报告
- `DELETE /health-records/reports/{id}`：删除体检报告
- `POST /health-records/reports/upload`：上传体检报告文件

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
- 汇总与趋势接口返回 `data` 为单个对象
- 失败时返回清晰 `message`，前端会直接展示

## 2. 可直接投喂 AI 的全量生成 Prompt

```text
你是一名资深 Java 后端工程师，请基于 Spring Boot 3 + Spring Web + Spring Validation + Spring Security + Spring Data JPA（或 MyBatis）生成“健康应用模块”完整代码，要求可直接运行。

【目标】
实现以下 REST 接口（基础路径 /health-records）：
1) GET /health-records
   - 查询参数：pageNo(默认1), pageSize(默认10)
   - 返回分页列表：{ list: HealthRecordListVO[], total: number }
2) POST /health-records
   - 入参：
     measureDate, heightCm, weightKg, bodyFatRate, systolicPressure, diastolicPressure,
     totalCholesterol, triglycerides, hdlCholesterol, ldlCholesterol, fastingGlucose, heartRate,
     uricAcid, alanineAminotransferase, aspartateAminotransferase, gammaGlutamylTransferase, note
3) PUT /health-records/{id}
   - 入参同新增
4) DELETE /health-records/{id}
5) GET /health-records/summary
   - 返回：
     {
       latestMeasureDate: string,
       latestWeight: number,
       weightChange: number,
       latestBmi: number,
       latestBodyFatRate: number,
       latestPressureText: string,
       latestTotalCholesterol: number,
       lastExamDate: string,
       totalRecords: number,
       reportCount: number,
       bmiStatusText: string,
       bmiStatusClass: string,
       pressureStatusText: string,
       pressureStatusClass: string,
       cholesterolStatusText: string,
       cholesterolStatusClass: string
     }
6) GET /health-records/trends
   - 返回：
     {
       metrics: {
         weightKg: HealthTrendPointVO[],
         bodyFatRate: HealthTrendPointVO[],
         systolicPressure: HealthTrendPointVO[],
         diastolicPressure: HealthTrendPointVO[],
         totalCholesterol: HealthTrendPointVO[],
         ldlCholesterol: HealthTrendPointVO[],
         fastingGlucose: HealthTrendPointVO[],
         uricAcid: HealthTrendPointVO[],
         alanineAminotransferase: HealthTrendPointVO[],
         aspartateAminotransferase: HealthTrendPointVO[],
         gammaGlutamylTransferase: HealthTrendPointVO[]
       }
     }
7) GET /health-records/reports
   - 返回分页或普通列表均可，前端支持 `data.list`
8) POST /health-records/reports
   - 入参：
     examDate, hospitalName, reportTitle, summary, doctorAdvice, reportFileName, reportUrl
9) PUT /health-records/reports/{id}
   - 入参同新增
10) DELETE /health-records/reports/{id}
11) POST /health-records/reports/upload
   - multipart/form-data 上传字段：file
   - 返回：
     {
       fileName: string,
       fileUrl: string,
       storageType: "LOCAL_FILE_SERVER"
     }

【数据模型】
请生成两张表：

表 1：health_record
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- measureDate (date)
- heightCm (decimal)
- weightKg (decimal)
- bodyFatRate (decimal, nullable)
- systolicPressure (int, nullable)
- diastolicPressure (int, nullable)
- totalCholesterol (decimal, nullable)
- triglycerides (decimal, nullable)
- hdlCholesterol (decimal, nullable)
- ldlCholesterol (decimal, nullable)
- fastingGlucose (decimal, nullable)
- heartRate (int, nullable)
- uricAcid (decimal, nullable)
- alanineAminotransferase (decimal, nullable)
- aspartateAminotransferase (decimal, nullable)
- gammaGlutamylTransferase (decimal, nullable)
- note (nullable)
- createdAt
- updatedAt

表 2：health_report
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- examDate (date)
- hospitalName (nullable)
- reportTitle
- summary (nullable)
- doctorAdvice (nullable)
- reportFileName (nullable)
- reportUrl (nullable)
- createdAt
- updatedAt

【业务规则】
- measureDate 必填
- heightCm 必填，且 > 0
- weightKg 必填，且 > 0
- bodyFatRate、血压、血脂、血糖、心率、尿酸、转氨酶、γ-GT 都可为空
- 如果 systolicPressure 或 diastolicPressure 传入，则都应 >= 0
- uricAcid、alanineAminotransferase、aspartateAminotransferase、gammaGlutamylTransferase 如果传入，则都应 >= 0
- reportTitle 必填，长度不超过 64
- examDate 必填
- hospitalName、summary、doctorAdvice、reportFileName、reportUrl 可为空
- 当前登录用户只能访问自己的健康记录和体检报告
- 健康记录列表按 measureDate DESC, id DESC 排序
- 体检报告列表按 examDate DESC, id DESC 排序
- summary 接口按最近一次健康记录和最近一次体检报告生成
- BMI = weightKg / ((heightCm / 100) ^ 2)
- weightChange = 最近一次体重 - 上一次体重
- 血压状态建议：
  1. systolic < 120 且 diastolic < 80 => 正常
  2. systolic < 140 且 diastolic < 90 => 偏高
  3. 其他 => 需关注
- 总胆固醇状态建议：
  1. < 5.2 => 理想范围
  2. < 6.2 => 轻度偏高
  3. >= 6.2 => 需关注
- BMI 状态建议：
  1. < 18.5 => 偏轻
  2. < 24 => 正常
  3. < 28 => 偏高
  4. >= 28 => 肥胖
- upload 接口需要把文件保存到本地文件服务器或挂载目录，并返回可访问的 fileUrl

【推荐返回 VO】
HealthRecordListVO:
- id
- measureDate
- heightCm
- weightKg
- bodyFatRate
- systolicPressure
- diastolicPressure
- totalCholesterol
- triglycerides
- hdlCholesterol
- ldlCholesterol
- fastingGlucose
- heartRate
- uricAcid
- alanineAminotransferase
- aspartateAminotransferase
- gammaGlutamylTransferase
- note
- createdAt
- updatedAt

HealthSummaryVO:
- latestMeasureDate
- latestWeight
- weightChange
- latestBmi
- latestBodyFatRate
- latestPressureText
- latestTotalCholesterol
- lastExamDate
- totalRecords
- reportCount
- bmiStatusText
- bmiStatusClass
- pressureStatusText
- pressureStatusClass
- cholesterolStatusText
- cholesterolStatusClass

HealthTrendPointVO:
- label
- value
- measureDate

HealthReportListVO:
- id
- examDate
- hospitalName
- reportTitle
- summary
- doctorAdvice
- reportFileName
- reportUrl
- createdAt
- updatedAt

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
- 提供至少 8 条健康记录测试数据和 2 条体检报告测试数据
- 覆盖体重下降、血压改善、血脂改善、仅部分字段有值、体检报告带文件等情况
- 提供 curl 示例
- 代码中补充关键注释，不要只给伪代码
```

## 3. 单接口增量 Prompt

### 3.1 健康概览接口

```text
请为现有 Spring Boot 项目新增 GET /health-records/summary 接口。

要求：
1) 只统计当前登录用户自己的健康记录和体检报告
2) 返回最近一次测量的体重、BMI、体脂、血压、总胆固醇
3) 返回上一次体重变化、上次体检时间、记录数、报告数
4) 同时返回 BMI / 血压 / 总胆固醇的状态文案和状态 class
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

### 3.2 趋势接口

```text
请为现有 Spring Boot 项目新增 GET /health-records/trends 接口。

要求：
1) 只查询当前登录用户自己的健康记录
2) 返回 weightKg、bodyFatRate、systolicPressure、diastolicPressure、totalCholesterol、ldlCholesterol、fastingGlucose、uricAcid、alanineAminotransferase、aspartateAminotransferase、gammaGlutamylTransferase 这些趋势
3) 每项趋势返回 label、value、measureDate
4) 趋势按 measureDate 升序
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

### 3.3 体检报告接口

```text
请为现有 Spring Boot 项目新增：
- GET /health-records/reports
- POST /health-records/reports
- PUT /health-records/reports/{id}
- DELETE /health-records/reports/{id}
- POST /health-records/reports/upload

要求：
1) 报告字段：
   examDate, hospitalName, reportTitle, summary, doctorAdvice, reportFileName, reportUrl
2) upload 接口使用 multipart/form-data，接收 file 字段，并返回 fileName、fileUrl、storageType
3) 文件需保存到本地文件服务器或配置目录
4) 只允许当前登录用户维护自己的体检报告
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + DTO + VO + 单元测试
```

## 4. 联调约定

- 前端接口文件固定为 `src/api/healthRecord.js`
- 前端页面固定路由为 `/health`
- 前端后端未联通时会回退本地演示数据
- 体检报告上传成功后，前端依赖 `fileName` + `fileUrl` 回填表单
- 如果后端返回结构不是 `data.list/data.total`，或 summary / trends 字段名不一致，请同步调整前端解析逻辑
