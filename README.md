# GnomishArmyKnife Web

GnomishArmyKnife 的 Vue 单页前端，以桌面首页组织个人工具、系统管理、需求看板和消息中心。本文于 2026-10-15 按当前源码核对，替代初始 Vite 模板说明。

## 文档入口

- [架构与功能清单](docs/architecture.md)
- [数据迁移当前实现](docs/data-migration-architecture.md)
- [文档索引](docs/README.md)

## 环境与开发

依赖声明为 Vue ^3.5.24、Vue Router ^4.6.4、Axios ^1.13.2、Vite ^7.2.4，实际版本以 package-lock.json 为准。建议 Node.js 22.12+（Vite 7 要求 20.19+ 或 22.12+）；Dockerfile 使用 Node 22。

在**前端仓库根目录**执行：

```powershell
npm ci
npm run dev
```

默认开发地址通常为 `http://localhost:5173`，以终端输出为准，端口占用时可能变化。后端默认端口 8080，需单独启动并配置数据库。

本机 `.env.local` 可配置：

```dotenv
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

前者控制浏览器请求前缀，后者只控制开发代理。默认 `/api/auth/login` 经 Vite 去掉 `/api` 后转到后端 `/auth/login`。更改环境文件后重启 Vite。生产变量在构建时固化，不能仅更改 Nginx 容器环境变量；不要在 VITE_* 中存放秘密。

## 验证与构建

```powershell
npm run test:unit
npm run test:component
npm run test
npm run build
npm run preview
```

- test:unit 使用 Node test runner，覆盖 utils、constants、部分 components 和乐器功能下的 *.test.js。
- test:component 使用 Vitest，扫描 src/components/__tests__ 和 src/views/__tests__，排除 *.test.js 与 .worktrees；不自动覆盖 features 下的组件规格。
- test 顺序执行上述两组，前一组失败会停止。
- build 输出 dist/；preview 预览构建产物，不是生产服务器，不能假定复用开发 API 代理。

乐器组件专项命令：`npx vitest run src/features/instrument-practice/__tests__/instrumentSurfaces.component.spec.js`。构建和测试通过不能替代真实后端联调。

## 部署

Dockerfile 先构建后由 Nginx 托管，Dockerfile.prebuilt 使用已有产物。nginx.conf 将 history 路由回退到 index.html，将 `/api/` 代理到 `gak-app:8080/`，并为 `/api/messages/stream` 关闭缓冲、设置 90 秒读取超时。

独立部署需调整 gak-app 上游地址，保留路由回退、API 前缀改写和 SSE 配置。完整 Compose/NAS 脚本位于配套后端 deploy/nas/。

## 当前边界

软件仓库已有页面与 API wrapper，但当前配套后端没有 `/software-packages` Controller。目录中的 REAL、密级和加密标记不等于接口或加密机制已经实现，详见[架构](docs/architecture.md)。
