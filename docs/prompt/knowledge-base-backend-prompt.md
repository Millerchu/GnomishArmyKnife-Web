# 经验库后端接口代码生成提示词

本文档用于把前端已预留的“经验库”接口一次性生成为后端代码。  
该应用用于记录个人在工作和生活中沉淀下来的可复用经验，进入页面后会随机展示一组 Banner 经验卡，其余经验以列表形式维护。  
前端项目已固定以下接口路径（基于 `/api` 代理后的实际后端路径）：

- `GET /knowledge-base/entries`：分页查询经验列表
- `GET /knowledge-base/entries/{id}`：查询单条经验详情
- `POST /knowledge-base/entries`：新增经验
- `PUT /knowledge-base/entries/{id}`：编辑经验
- `DELETE /knowledge-base/entries/{id}`：删除经验
- `GET /knowledge-base/highlights`：随机查询一组 Banner 推荐经验

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
- 详情接口返回 `data` 为单个对象
- Banner 接口返回 `data.list`
- 失败时返回清晰 `message`，前端会直接展示

## 2. 可直接投喂 AI 的全量生成 Prompt

```text
你是一名资深 Java 后端工程师，请基于 Spring Boot 3 + Spring Web + Spring Validation + Spring Security + Spring Data JPA（或 MyBatis）生成“经验库模块”完整代码，要求可直接运行。

【目标】
实现以下 REST 接口（基础路径 /knowledge-base）：
1) GET /knowledge-base/entries
   - 查询参数：pageNo(默认1), pageSize(默认10)
   - 返回分页列表：{ list: KnowledgeEntryListVO[], total: number }
   - 默认按 updatedAt DESC, id DESC 排序
2) GET /knowledge-base/entries/{id}
   - 返回单条详情
3) POST /knowledge-base/entries
   - 入参：
     title, category, scenario, source, tags, summary, content
4) PUT /knowledge-base/entries/{id}
   - 入参同新增
5) DELETE /knowledge-base/entries/{id}
6) GET /knowledge-base/highlights
   - 查询参数：size(默认3)
   - 返回随机 Banner 经验列表：{ list: KnowledgeEntryBannerVO[] }
   - 如果总数不足 size，则返回全部

【数据模型】
请生成 knowledge_entry 表，字段至少包含：
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- title
- category
- scenario
- source (nullable)
- tagsJson 或 tagsText
- summary
- content (text)
- createdAt
- updatedAt

其中 tags 建议存为 JSON 数组，也可以存为逗号分隔字符串，但接口返回时要统一为字符串数组。

【业务规则】
- title 必填，长度不超过 64
- category 必填，长度不超过 32
- scenario 必填，长度不超过 80
- source 可为空，长度不超过 80
- summary 必填，长度不超过 180
- content 必填
- tags 可为空，但如果传入，后端返回时统一转为字符串数组
- 只允许当前登录用户查询和维护自己的经验
- 删除、详情、编辑时要校验 ownerUserId
- highlights 接口只从当前登录用户自己的经验中随机抽取
- 返回统一结构：{ code, message, data }
- 增加参数校验、统一异常处理、统一响应封装

【推荐返回 VO】
KnowledgeEntryListVO:
- id
- title
- category
- scenario
- source
- tags: string[]
- summary
- createdAt
- updatedAt

KnowledgeEntryDetailVO:
- id
- title
- category
- scenario
- source
- tags: string[]
- summary
- content
- createdAt
- updatedAt

KnowledgeEntryBannerVO:
- id
- title
- category
- scenario
- tags: string[]
- summary
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
- 提供至少 8 条测试数据，覆盖工作、生活、学习、工具、财务等不同分类
- 提供 highlights 随机抽取逻辑和对应单元测试
- 提供 curl 示例
- 补充关键注释，不要只给伪代码
```

## 3. 单接口增量 Prompt

### 3.1 Banner 随机推荐接口

```text
请为现有 Spring Boot 项目新增 GET /knowledge-base/highlights 接口。

查询参数：
- size，默认 3

要求：
1) 只从当前登录用户自己的经验数据中随机抽取
2) 返回字段：id, title, category, scenario, tags, summary, updatedAt
3) 如果总数少于 size，则返回全部
4) tags 必须以字符串数组形式返回
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

### 3.2 分页列表接口

```text
请为现有 Spring Boot 项目新增 GET /knowledge-base/entries 分页接口。

查询参数：pageNo, pageSize

要求：
1) 只查询当前登录用户自己的经验
2) 默认按 updatedAt DESC, id DESC 排序
3) 返回 data.list + data.total
4) 列表字段包含 title, category, scenario, source, tags, summary, createdAt, updatedAt
5) tags 返回字符串数组
6) 提供 Controller + Service + Mapper/Repository + VO + 单元测试
```

## 4. 联调约定

- 前端接口文件固定为 `src/api/knowledgeBase.js`
- 前端页面固定路由为 `/knowledge-base`
- 前端在后端不可用时会自动回退本地演示数据
- 前端进入页面时会调用 Banner 接口随机展示经验卡片
- 如果后端返回结构不是 `data.list/data.total`，或 tags 不是数组，请同步调整前端解析逻辑
