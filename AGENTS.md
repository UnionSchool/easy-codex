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

- 用户安装与使用保持极简：`npm i -g easy-codex` 后运行 `easy-codex`；浮窗为可选 `easy-codex overlay`。发布包应自带原生构建，用户无需编译。easy use 是易用理念，不是命令别名。

## 时钟与自适应额度环

- 复用 easy-claude 原生展示实现，保持 Codex 官方 App Server 额度来源、60秒刷新/120秒过期，不引入 Claude OAuth 或代理传输。
- 使用 windowDurationMins 识别周(10080)与5小时(300)，不假定主次窗口，不跨额度桶拼接。缺失窗口不显示对应环或菜单；只有周时中心自动显示周剩余数字，无百分号。
- 圆环默认(10,74)32×32，时钟(2,116)48×46，左侧竖排居中、相隔10px；可独立拖动，恢复默认位置同时恢复两者。时区城市与配色同 easy-claude，默认硅谷。
- 浮窗首选启动命令为 easy-codex show；overlay 保留为兼容别名，两者调用同一入口。

- 周倒计时只显示最大单位，例如“6天后 25日 06:17 重置”，不足一天按小时、不足一小时按分钟。5小时窗口保留时分组合，例如“3小时2分后 07:59 重置”，没有小时则“22分后 07:59 重置”，省略为零的单位。绝对重置时刻使用电脑本地时区；周含日，5小时不含日期。
- 城市子菜单入口显示“洛杉矶·05:23”样式，使用已选城市时区的当前HH:mm，不显示“时区”前缀；打开菜单时更新，切换能力保留。
- 时间浮窗开关的菜单文案固定为“显示时间”。
- update通过当前Node调用npm CLI，只允许更新自身官方npm包，优先保持现有全局前缀，参数数组传递、不使用shell或sudo；更新成功后提示show重开。
- show/overlay调用自身原生--quit-running，按唯一bundle id仅退出该工具浮窗，等待最多5秒；失败不继续打开，不终止官方Codex/Claude应用。
- update必须在线刷新latest、校验正式版本并防止降级；只在有更高版本时按明确版本号安装，不直接安装可能缓存的@latest。
