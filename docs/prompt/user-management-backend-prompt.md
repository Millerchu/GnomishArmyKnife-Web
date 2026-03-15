# 用户管理后端接口代码生成提示词

本文档用于把前端已预留的用户管理接口一次性生成为后端代码。  
前端项目已接入以下接口路径（基于 `/api` 代理后的实际后端路径）：

- `GET /system/users`：分页查询用户列表
- `POST /system/users`：新增用户
- `PUT /system/users/{id}`：编辑用户
- `DELETE /system/users/{id}`：删除用户
- `PATCH /system/users/{id}/status`：启用/禁用用户
- `POST /system/users/{id}/reset-password`：重置密码

## 1. 推荐统一返回结构（与前端兼容）

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
- 非列表接口可返回 `data` 为对象或 `null`。
- 失败时建议返回清晰的 `message`，前端会直接展示。

## 2. 可直接投喂 AI 的全量生成 Prompt（Spring Boot 版）

```text
你是一名资深 Java 后端工程师，请基于 Spring Boot 3 + Spring Web + Spring Validation + Spring Data JPA（或 MyBatis）生成“用户管理模块”完整代码，要求可直接运行。

【目标】
实现以下 REST 接口（基础路径 /system/users）：
1) GET /system/users
   - 查询参数：pageNo(默认1), pageSize(默认10), keyword(可选), status(可选: ENABLED/DISABLED), roleCode(可选)
   - 返回分页列表：{ list: UserListItem[], total: number }
2) POST /system/users
   - 入参：username, initialPassword, displayName, phone, email, roleCode, status, remark
3) PUT /system/users/{id}
   - 入参：displayName, phone, email, roleCode, status, remark
4) DELETE /system/users/{id}
5) PATCH /system/users/{id}/status
   - 入参：status(ENABLED/DISABLED), enabled(boolean，可选，若传入则与status一致性校验)
6) POST /system/users/{id}/reset-password
   - 入参：newPassword, forceChange(boolean)

【数据模型】
请生成 user 表（或等价实体），字段至少包含：
- id (Long, PK)
- username (唯一)
- passwordHash
- displayName
- phone
- email
- roleCode (ADMIN/DEV/USER)
- status (ENABLED/DISABLED)
- forceChangePassword (boolean)
- lastLoginTime (datetime, nullable)
- remark
- createdAt
- updatedAt

【业务规则】
- username 唯一，新增时校验重复
- 删除用户前校验：默认管理员账号不可删除（例如 username=admin）
- 状态变更接口支持启用/禁用
- 重置密码时使用 BCrypt 加密存储，不保存明文
- 关键字查询匹配 username/displayName/phone/email（模糊匹配）
- 所有接口增加参数校验与统一异常处理

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
- 提供建表 SQL（MySQL 8）
- 提供至少 6 条初始化测试数据（含 admin）
- 给出 curl 示例
- 代码中补充关键注释，避免伪代码
```

## 3. 单接口增量生成 Prompt（按需使用）

### 3.1 状态变更接口

```text
请为现有 Spring Boot 项目新增 PATCH /system/users/{id}/status 接口。
入参 JSON: { "status": "ENABLED|DISABLED", "enabled": true|false(可选) }
要求：
1) status 必填，只允许 ENABLED 或 DISABLED
2) enabled 若传入，必须与 status 含义一致，否则返回 400
3) 更新用户状态与 updatedAt
4) 返回统一结构：{ code, message, data }
5) 提供 Controller + Service + DTO + 单元测试示例
```

### 3.2 重置密码接口

```text
请为现有 Spring Boot 项目新增 POST /system/users/{id}/reset-password 接口。
入参 JSON: { "newPassword": "...", "forceChange": true|false }
要求：
1) newPassword 长度至少 6 位
2) 使用 BCrypt 对新密码加密后保存
3) forceChange=true 时，设置用户下次登录强制改密
4) 返回统一结构：{ code, message, data }
5) 提供 Controller + Service + DTO + 单元测试示例
```

## 4. 联调约定

- 前端已在 `src/api/systemUser.js` 中固定以上路径与方法。
- 前端列表页在后端不可用时会自动回退演示数据；联调后将自动切换为真实接口数据。
- 若后端返回结构不是 `data.list/data.total`，请同步调整前端解析逻辑。
