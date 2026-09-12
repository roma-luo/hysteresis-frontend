# AFTER 剧本字段说明

剧本放在 `frontend/index.html` 的 `<script type="application/json" id="script">` 里，换剧本不改 JS。
结构：`{ "title": "…", "scenes": [ { "name": "第一天 · 糖", "acts": [ … ] } ] }`，
一幕（scene）是一组按序执行的动作（act）。播放器 `scene(n)` 播第 n 幕，
演示菜单「上一幕 / 下一幕 / 重头」推进，`?scene=N` 从第 N 幕起播。
人设定稿后照本表写正式剧本。

## 动作集（也是将来画布协议的雏形）

| act | 字段 | 含义 |
|---|---|---|
| `say` | `text`, `ref?`, `refuse?` | 她说一句。`ref` 可选，指向一个 widget id（如 `'w2'`），话到达后笔尖去点一下那件东西（point）。`refuse:true` 可选：这句是她的拒绝，到达后给出挂件「凋谢的玫瑰」（首次） |
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
| `stage` | `kind`, `title`, `line`, `days?` | 阶段卡：竖卡 3:4、全屏居中、纸材质；顶部她的剪影（墨，无光）、中间一句结束语（宋体）、`days` 日期区间与 `title`「第 N 天」、底部 AFTER 字标。`kind` 三型：end / stage / missed，只差顶部小字与配色权重。卡在「收起」后播放器才继续；「保存图片」用 canvas 画 PNG，可走系统分享 |
| `branch` | `options:[{label, acts, makeup?}]` | 分岔：播放器停在这儿，演示菜单出现各 label 按钮。选中后按序播该支的 `acts`；`makeup:true` 表示和好支——之后的结束幕不再播放 |
| `end` | — | 结束页（现有 `data-s="14"`）。结束后：头像退回墨色空心圆、小字空、输入区收起、画布只读（widget 不可拖不可点）。之后没有动作 |

## 幕级字段

| 字段 | 含义 |
|---|---|
| `name` | 幕名（演示菜单顶部小字显示） |
| `day` | 这一幕是第几天（1/3/5/7/9/11/12）。幕首检查挂件：`day≥3` 她先给火柴盒、`day≥7` 先给戒指，给了再说正事；挂件纸条上的「第 N 天」也用它 |
| `acts` | 按序执行的动作数组 |
| `skipIfMuted` | 为 `true` 时，设置里「停止她的主动联系」开着就整幕跳过（她不发消息，直接进下一幕）。第六幕用它 |

## 默认剧本《十二天》

七幕：1 第一天·糖（warmth .85，放唱机，说三句，画一只猫）→ 2 第三天·你说（decide 卡，记下）
→ 3 第五天·一起（coop 猜词，放日历，warmth .9）→ 4 第七天·边界（你一句越界，她一句边界，warmth .45）
→ 5 第九天·疏远（回话短、typing ×2，翻旧账 recall decide，warmth .25）
→ 6 第十一天·主动（arrive「那天的事，我想了想」，分岔：回 → warmth .6 跳过第 7 幕；不回 → 第 7 幕）
→ 7 第十二天·结束（warmth → 0，阶段卡，结束页）。

文案为占位，人设定稿后替换；换文案只动 JSON。
