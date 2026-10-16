# easy-codex 工作约定

- 本文件与 `MEMORY.md` 由 Codex 与 Claude Code 共用。
- 开始或恢复任务读取 `MEMORY.md`，处理子目录前检查局部规则；阶段完成转下一项、总结、交接及结束时更新记忆，注明时区和工具，保留其他会话有效记录。
- 本项目为 Node.js ≥22 的无第三方依赖 ESM CLI；入口 `bin/easy-codex.js`，查询及格式化在 `src/usage.js`，测试在 `test/usage.test.js`。
- 首个功能只读 Codex 账号额度。通过官方 App Server 协议复用 CLI 登录，不读取凭据文件，不发起模型会话，不执行额度重置或购买。
- 缺失额度不是零或满额；优先多桶响应；时间单位来自服务端，不能硬编码为固定套餐窗口。
- 项目目录执行 `npm test`；真实查询执行 `node bin/easy-codex.js`，需要已登录的 Codex CLI 和网络。
- 公开仓库为 UnionSchool/easy-codex；npm 使用无作用域 easy-codex。发布通过 GitHub v* 标签工作流及 npm Environment，版本必须一致；需要 NPM_TOKEN。默认不提交或发布，用户明确授权后执行。
- MEMORY.md 为本地交接记录，不进入公开仓库或 npm 包。

## macOS 浮窗

- 用户于 2026-10-17 同意独立浮窗，取代此前“只接受原生嵌入”的限制；仍不修改官方安装包。
- `native/Overlay.swift` 使用 Swift 6 / AppKit / CoreGraphics；`npm run build:overlay` 构建 macOS 14+ 的 arm64/x86_64 通用应用并执行颜色、坐标自检。Node 查询投影在 `src/overlay-data.js`，子进程入口在 `src/overlay-query.js`。
- 跟随窗口边界，不把固定偏移称为头像识别。仅显示 CLI 登录账号额度，不能宣称已核对桌面账号。
- 包中包含通用原生构建；更新需重建再安装。数据过期、未知和查询失败要明确呈现，退出应取消在途查询。
