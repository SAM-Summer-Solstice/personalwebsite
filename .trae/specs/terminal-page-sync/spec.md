# 终端与页面联动：cwd 随页面切换 + 默认收起（Terminal Page Sync）Spec

## Why
终端 prompt 的当前文件夹（cwd）与页面导航脱节——在 `~/posts`、`~/projects`、`~/about` 页面上，终端仍显示 `~`，破坏了"终端与网页文件夹一致"的沉浸设定；且终端默认展开占据屏幕底部，用户希望默认收起、按需展开。

## What Changes
- **cwd 随页面联动**：`Terminal` 接收 `activeTab`，页面切换时 cwd 自动同步为对应路径——`home → ~`、`blog → ~/posts`、`projects → ~/projects`、`about → ~/about`；prompt（`xzx@blog:${cwd}$`）与标题栏（`xzx@blog: <cwd> — bash`）随动
- **默认收起**：终端初始为收起状态（所有屏宽），点击标题栏 / ▴ 三角展开，再次点击收起
- **保留自由性**：`cd` 命令仍可自由切换目录；页面联动在每次切换页面时把 cwd 重置为页面路径（符合"点进哪个页面，终端就在哪个文件夹"的设定）

## Impact
- Affected specs: `create-hybrid-terminal-blog`（终端核心）、`add-homepage`（home 导航）
- Affected code:
  - `src/App.jsx`（向 `<Terminal>` 传入 `activeTab`）
  - `src/components/Terminal.jsx`（activeTab prop、cwd 同步 effect、collapsed 初始值、标题动态化）

## ADDED Requirements

### Requirement: cwd 随页面联动
系统 SHALL 在页面切换时将终端当前文件夹同步为页面对应路径。

#### Scenario: 切换页面
- **WHEN** 用户从任一页面导航到 posts / projects / about / home
- **THEN** 终端 prompt 与标题栏中的 cwd 变为 `~/posts` / `~/projects` / `~/about` / `~`

#### Scenario: cd 自由切换
- **WHEN** 用户在终端执行 `cd` 到其他目录
- **THEN** cwd 正常切换；下次切换页面时重置为页面路径

### Requirement: 终端默认收起
系统 SHALL 让终端初始为收起状态，通过标题栏/三角按钮展开与收起。

#### Scenario: 首次加载
- **WHEN** 页面加载
- **THEN** 终端仅显示标题栏（收起态），不占据内容区域

#### Scenario: 展开/收起
- **WHEN** 用户点击标题栏或 ▴/▾ 按钮
- **THEN** 终端在展开（显示输出与输入框）与收起（仅标题栏）之间切换

### Requirement: 标题栏联动
系统 SHALL 让终端标题栏的目录部分随 cwd 实时更新。

#### Scenario: 标题显示
- **WHEN** cwd 变化（页面切换或 cd）
- **THEN** 标题栏显示 `xzx@blog: <cwd> — bash`

## MODIFIED Requirements

### Requirement: 终端收起初始值
收起初始值由"窄屏收起、PC 展开"改为"始终收起"。

### Requirement: 终端标题
标题由硬编码 `xzx@blog: ~ — bash` 改为动态显示当前 cwd。

## REMOVED Requirements

无。
