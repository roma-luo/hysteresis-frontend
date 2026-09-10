# AFTER 剧本字段说明

剧本放在 `frontend/index.html` 的 `<script type="application/json" id="script">` 里，换剧本不改 JS。
结构：`{ "title": "…", "scenes": [ { "name": "第一天 · 糖", "acts": [ … ] } ] }`，
一幕（scene）是一组按序执行的动作（act）。播放器 `scene(n)` 播第 n 幕，
演示菜单「上一幕 / 下一幕 / 重头」推进，`?scene=N` 从第 N 幕起播。
人设定稿后照本表写正式剧本。

## 动作集（也是将来画布协议的雏形）

| act | 字段 | 含义 |
|---|---|---|
| `say` | `text`, `ref?` | 她说一句。`ref` 可选，指向一个 widget id（如 `'w2'`），话到达后笔尖去点一下那件东西（point） |
| `you` | `text` | 演示模式下代用户发一句（也可留给现场手打） |
| `place` | `widget`, `data?` | 放东西：`widget` 是登记表 WIDGETS 的 key（vt/wx/cal/stk/gz…），`data` 传给该 widget 的 `make(opts)`（如贴纸的 `text`）。笔尖从头像出发带进来，落下 scale .96→1。`warmth < .45` 时她不出手，动作跳过 |
| `ink` | `scene` | 写字/画画（现有扁头笔那套，`'cat'`）。`warmth < .25` 时她连笔也不拿 |
| `card` | `kind:'decide'`, `text`, `options`, `mark?` | 事件卡·请求决定。`options` 为 `[{label, reply}]`：你选，她用 reply 采纳或反驳。`mark` 可选：回复到达后留一枚「她记下了」stamp，并以该名存档，供 `recall` 引用 |
| `card` | `kind:'coop'`, `game:'guess'` | 事件卡·协作：复用猜词。她说「猜一个」，把格纸放进来 |
| `recall` | `text`, `ref` | 翻旧账：她说一句引用早先某条的话；到达后，`ref`（某个 `mark` 名）指着的那条旁边出现一枚 stamp 并轻轻亮一下，对话线滚到那条 400ms 再滚回 |
| `warmth` | `to`, `ms?` | 关系标量直设，默认过渡 4000ms；关系结束时用 1600ms。光、布色、漂移、顶栏小字随它变 |
| `presence` | `text` | 顶栏小字覆盖（不设则按 warmth 段位：≥.7 在线；.45–.7 刚刚在线；.25–.45 三小时前在线；<.25 离线；0 空） |
| `wait` | `ms` | 停一拍 |
| `arrive` | `text` | 主动消息：话先进对话屏（带时间戳）；你不在对话屏时顶栏滑下一条极薄的玻璃条（她的头像+一行字，3.5s 收起，点了去对话屏）。不震动、不红点、不催 |
| `stage` | `kind`, `title`, `line` | 阶段卡。当前为轻量占位（一张居中小纸，出一下就走）；正式三型卡（end/stage/missed）在 Step 4 |
| `branch` | `options:[{label, acts, makeup?}]` | 分岔：播放器停在这儿，演示菜单出现各 label 按钮。选中后按序播该支的 `acts`；`makeup:true` 表示和好支——之后的结束幕不再播放 |
| `end` | — | 结束页（现有 `data-s="14"`）。之后没有动作 |

## 默认剧本《十二天》

七幕：1 第一天·糖（warmth .85，放唱机，说三句，画一只猫）→ 2 第三天·你说（decide 卡，记下）
→ 3 第五天·一起（coop 猜词，放日历，warmth .9）→ 4 第七天·边界（你一句越界，她一句边界，warmth .45）
→ 5 第九天·疏远（回话短、typing ×2，翻旧账 recall decide，warmth .25）
→ 6 第十一天·主动（arrive「那天的事，我想了想」，分岔：回 → warmth .6 跳过第 7 幕；不回 → 第 7 幕）
→ 7 第十二天·结束（warmth → 0，阶段卡，结束页）。

文案为占位，人设定稿后替换；换文案只动 JSON。
