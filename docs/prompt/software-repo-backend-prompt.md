# 软件仓库后端接口代码生成提示词

本文档用于把前端已预留的“软件仓库”接口一次性生成为后端代码。  
该应用用于维护个人常用软件安装包，支持一个软件维护多个版本安装包、本地安装包上传、本地文件服务器优先下载；前端仅在 PC 端提供下载按钮，移动端只查看版本信息。  
前端项目已固定以下接口路径（基于 `/api` 代理后的实际后端路径）：

- `GET /software-packages`：分页查询软件列表
- `POST /software-packages`：新增软件
- `PUT /software-packages/{id}`：编辑软件
- `DELETE /software-packages/{id}`：删除软件
- `POST /software-packages/{id}/versions`：新增软件版本
- `POST /software-packages/upload`：上传本地安装包到文件服务器
- `PUT /software-packages/versions/{versionId}`：编辑软件版本
- `DELETE /software-packages/versions/{versionId}`：删除软件版本
- `GET /software-packages/summary`：查询软件仓库概览统计

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
你是一名资深 Java 后端工程师，请基于 Spring Boot 3 + Spring Web + Spring Validation + Spring Security + Spring Data JPA（或 MyBatis）生成“软件仓库模块”完整代码，要求可直接运行。

【目标】
实现以下 REST 接口（基础路径 /software-packages）：
1) GET /software-packages
   - 查询参数：pageNo(默认1), pageSize(默认10), keyword(可选), categoryName(可选), platformCode(可选)
   - keyword 匹配：softwareName、vendorName、description、versions.versionName
   - 返回分页列表：{ list: SoftwarePackageListVO[], total: number }
2) POST /software-packages
   - 入参：
     softwareName, vendorName, categoryName, platformCode, officialSite, description
3) PUT /software-packages/{id}
   - 入参同新增
4) DELETE /software-packages/{id}
   - 删除软件时一并删除该软件下全部版本
5) POST /software-packages/{id}/versions
   - 入参：
     versionName, releaseChannel, packageType, packageSize, releaseDate, systemRequirement, localFileName, localFileUrl, downloadUrl, isRecommended, changelog
6) POST /software-packages/upload
   - multipart/form-data 上传字段：file
   - 返回：
     {
       fileName: string,
       fileUrl: string,
       storageType: "LOCAL_FILE_SERVER"
     }
7) PUT /software-packages/versions/{versionId}
   - 入参同新增版本
8) DELETE /software-packages/versions/{versionId}
9) GET /software-packages/summary
   - 返回：
     {
       totalPackages: number,
       totalVersions: number,
       recommendedVersions: number,
       categoryStats: CategoryStatsVO[],
       recentVersions: RecentVersionVO[]
     }

【数据模型】
请生成两张表：

表 1：software_package
- id (Long, PK)
- ownerUserId (Long, 当前登录用户ID)
- softwareName
- vendorName (nullable)
- categoryName
- platformCode
- officialSite (nullable)
- description (nullable)
- createdAt
- updatedAt

表 2：software_version
- id (Long, PK)
- packageId (Long, FK -> software_package.id)
- ownerUserId (Long, 当前登录用户ID)
- versionName
- releaseChannel
- packageType (nullable)
- packageSize (nullable)
- releaseDate (date, nullable)
- systemRequirement (nullable)
- localFileName (nullable)
- localFileUrl (nullable)
- downloadUrl (nullable)
- isRecommended (boolean)
- changelog (nullable)
- createdAt
- updatedAt

【业务规则】
- softwareName 必填，长度不超过 64
- categoryName 必填，长度不超过 32
- platformCode 必填，只允许：
  WINDOWS / MACOS / LINUX / ANDROID / IOS / CROSS_PLATFORM
- vendorName、officialSite、description 可为空
- versionName 必填，长度不超过 32
- releaseChannel 必填，只允许：
  STABLE / BETA / NIGHTLY / LEGACY
- packageType、packageSize、systemRequirement、localFileName、localFileUrl、downloadUrl、changelog 可为空
- isRecommended 默认为 false
- 当前登录用户只能访问和维护自己的软件及版本数据
- 软件列表按 updatedAt DESC, id DESC 排序
- 每个软件下的版本列表按：
  1. isRecommended DESC
  2. releaseDate DESC
  3. id DESC
- 同一个软件下可以有多个版本
- 同一个软件下建议最多只有一个推荐版本：
  如果新增或编辑版本时 isRecommended = true，需要把该软件下其他版本自动改为 false
- 如果同时存在 localFileUrl 和 downloadUrl，前端会优先使用 localFileUrl 作为下载地址
- `POST /software-packages/upload` 需要把文件保存到本地文件服务器或本地挂载目录，并返回可直接访问的 `fileUrl`
- 后端始终返回 localFileUrl 和 downloadUrl；是否显示下载按钮由前端根据是否为 PC 端自行控制

【推荐返回 VO】
SoftwareVersionVO:
- id
- versionName
- releaseChannel
- packageType
- packageSize
- releaseDate
- systemRequirement
- localFileName
- localFileUrl
- downloadUrl
- isRecommended
- changelog
- createdAt
- updatedAt

SoftwarePackageListVO:
- id
- softwareName
- vendorName
- categoryName
- platformCode
- officialSite
- description
- createdAt
- updatedAt
- versions: SoftwareVersionVO[]

CategoryStatsVO:
- categoryName
- packageCount
- versionCount

RecentVersionVO:
- id
- packageId
- softwareName
- versionName
- releaseDate
- releaseChannel

SoftwareRepoSummaryVO:
- totalPackages
- totalVersions
- recommendedVersions
- categoryStats[]
- recentVersions[]

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
- 提供至少 8 条软件数据、每个软件 2-4 条版本测试数据
- 覆盖多平台、多分类、推荐版本、无下载链接、旧版本归档等情况
- 提供 curl 示例
- 代码中补充关键注释，不要只给伪代码
```

## 3. 单接口增量 Prompt

### 3.1 软件列表接口

```text
请为现有 Spring Boot 项目新增 GET /software-packages 分页接口。
查询参数：pageNo, pageSize, keyword, categoryName, platformCode

要求：
1) 只查询当前登录用户自己的软件仓库数据
2) keyword 匹配 softwareName、vendorName、description、versions.versionName
3) 返回 data.list + data.total
4) 每个软件项需要内嵌 versions 列表
5) 软件列表按 updatedAt DESC, id DESC
6) 版本列表按 isRecommended DESC, releaseDate DESC, id DESC
7) 提供 Controller + Service + Mapper/Repository + VO + 单元测试
```

### 3.2 软件版本维护接口

```text
请为现有 Spring Boot 项目新增：
- POST /software-packages/{id}/versions
- POST /software-packages/upload
- PUT /software-packages/versions/{versionId}
- DELETE /software-packages/versions/{versionId}

要求：
1) 版本字段：
   versionName, releaseChannel, packageType, packageSize, releaseDate, systemRequirement, localFileName, localFileUrl, downloadUrl, isRecommended, changelog
2) releaseChannel 只允许 STABLE / BETA / NIGHTLY / LEGACY
3) 如果某版本设置为 isRecommended = true，需要自动取消同软件下其他版本的推荐状态
4) POST /software-packages/upload 接口使用 multipart/form-data，接收 file 字段，并返回 fileName、fileUrl、storageType
5) 文件需要保存到本地文件服务器或配置目录，返回可下载访问地址
6) 只允许当前登录用户维护自己的版本数据
7) 返回统一结构：{ code, message, data }
8) 提供 Controller + Service + DTO + VO + 单元测试
```

### 3.3 概览统计接口

```text
请为现有 Spring Boot 项目新增 GET /software-packages/summary 接口。

要求：
1) 只统计当前登录用户自己的软件仓库数据
2) 返回 totalPackages、totalVersions、recommendedVersions
3) 返回 categoryStats（分类软件数、版本数）
4) 返回 recentVersions（最近更新版本记录）
5) 返回统一结构：{ code, message, data }
6) 提供 Controller + Service + VO + 单元测试
```

## 4. 联调约定

- 前端接口文件固定为 `src/api/softwareRepo.js`
- 前端页面固定路由为 `/software-repo`
- 前端移动端仅查看版本信息，不展示下载按钮；桌面端才展示下载按钮
- 前端如果同时拿到 `localFileUrl` 和 `downloadUrl`，会优先使用 `localFileUrl`
- 前端后端未联通时会回退本地演示数据
- 如果后端返回结构不是 `data.list/data.total`，或 summary 字段名不一致，请同步调整前端解析逻辑
