# FLY Game - 飞机大战（增强版）

一个纯前端实现的 2D 竖版射击小游戏，支持键盘和触控，内置音效、背景音乐、暂停、全屏、清屏炸弹、连击与最高分记录。

## 运行方式

1. 进入项目目录 `D:\Code\FLY_game`
2. 直接用浏览器打开 `index.html`
3. 点击 `开始游戏` 开始

说明：`final_game.html` 与 `index.html` 当前为同一版本入口。

## 玩法说明

- 玩家飞机会自动射击。
- 击毁敌机可以获得分数并累计连击。
- 分数提高后，弹道会升级为多发散射（最多 5 发）。
- 战斗中会随机掉落道具：
  - 炸弹补给：拾取后立即清屏（消灭当前敌机并清空敌方子弹）。
  - 激光强化：限时激活激光武器。
  - 飞弹强化：限时激活追踪飞弹武器。
- 支持本地多用户：可自定义用户名、切换用户，并记录各自最高分与最近战绩。
- 支持本机排行榜（Top 10），按用户最高分排序。
- 支持可选云端排行榜（Supabase，跨设备共享）。
- 中后期会出现更强的精英敌机（更高血量、弹幕更密集）。
- 每连续击毁 20 个目标可恢复 1 点生命（不超过上限）。
- 敌机子弹命中或敌机碰撞都会导致掉血。
- 生命值降到 0 时游戏结束。

## 操作按键

- `Arrow / WASD`：移动
- 鼠标/触控：按住并拖动飞机
- `Space`：加快射速
- `P` 或 `Esc`：暂停/继续
- `R`：重新开始
- `B`：清屏炸弹（有冷却）
- `M`：静音切换
- `[` / `]`：降低/提高音量
- `F`：全屏切换
- `H`：显示/隐藏 HUD
- `Enter`：开始游戏 / 结算后快速重开

## 项目结构

- `index.html`：主入口页面
- `final_game.html`：备用入口页面（同版本）
- `assets/js/final_game.js`：核心游戏逻辑
- `assets/images/`：游戏图片资源
- `assets/audio/`：游戏音频资源
- `assets/CREDITS.md`：素材来源与授权说明

## 技术要点

- 使用 `Canvas 2D` 渲染。
- 无第三方依赖，打开即玩。
- 最高分保存在浏览器 `localStorage`（键名：`plane-war-remaster-best-score`）。

## 云端排行榜（Supabase）

默认是本机模式。要开启云端排行榜：

1. 在 Supabase 创建项目。
2. 执行下面 SQL（新建表 + 允许匿名读写）：

```sql
create table if not exists public.airplane_scores (
  username text primary key,
  best_score integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.airplane_scores enable row level security;

drop policy if exists "read_scores" on public.airplane_scores;
create policy "read_scores"
on public.airplane_scores
for select
using (true);

drop policy if exists "insert_scores" on public.airplane_scores;
create policy "insert_scores"
on public.airplane_scores
for insert
with check (true);

drop policy if exists "update_scores" on public.airplane_scores;
create policy "update_scores"
on public.airplane_scores
for update
using (true)
with check (true);
```

3. 编辑 `assets/js/cloud_config.js`，填入你的配置：

```js
window.CLOUD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  table: "airplane_scores",
  autoRefreshMs: 30000
};
```

4. 重新打开 `index.html`，在“玩家档案”里会显示 `排行模式：云端`。

说明：

- 云端排行是“用户名 + 最高分”模式，会自动保留更高分。
- 如果云端不可用，会自动回退到本机排行显示。

## 素材与版权

项目使用的图像和音频素材来源及授权见：

- `assets/CREDITS.md`

大部分素材为 CC0 许可。
