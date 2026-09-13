"""壳清单与矩阵的程序化验证（Playwright，默认全设备矩阵；-k iphone-13 只跑主力档）。

每条对应任务书第六节壳清单的一行或第一至四节里可程序化验证的格子。
截图存 artifacts/screenshots/ 供肉眼复核。
注意：headless WebKit 不栅格化 CSS filter blur / backdrop-filter，玻璃质感以真机为准。
"""

import json
import re
import time
from pathlib import Path

import pytest

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts" / "screenshots"

CANVAS = ".screen[data-s='4']"


def shot(page, name):
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=ARTIFACTS / f"{page.device_id}-{name}.png", full_page=True)


def open_drawer(page):
    page.click(f"{CANVAS} .hbtn.menu")
    page.wait_for_selector("#drawer.open")


def open_sub(page, title):
    open_drawer(page)
    page.click(f".dmenu button:not(.dtoggle):has-text('{title}')")
    page.wait_for_selector("#gsub.open")


def go_canvas(page, app_url, extra=""):
    page.goto(app_url + extra)
    page.wait_for_selector("#app")
    # 关掉首次引导与开场白，让画布保持空、行为确定（引导另由冒烟测试覆盖）
    page.evaluate("localStorage.setItem('after-guided','1'); helloDone=true;")
    page.evaluate("go(4)")


# ---------- 壳清单 · 高 ----------


def test_drawer_entries_merged(mobile_page, app_url):
    """「通知」「帮助」入口删除；菜单剩六条；安静时段并入停止主动联系旁（默认藏）。"""
    go_canvas(mobile_page, app_url)
    open_drawer(mobile_page)
    items = mobile_page.eval_on_selector_all(
        ".dmenu button:not(.dtoggle)", "els => els.map(e => e.textContent.trim())"
    )
    assert "通知" not in items and "帮助" not in items
    assert items == ["订阅", "隐私", "设置", "评分", "报告", "需要帮助"]
    assert not mobile_page.eval_on_selector(
        "#dQuiet", "el => getComputedStyle(el).display !== 'none'"
    )
    shot(mobile_page, "drawer")


def test_quiet_hours_beside_mute(mobile_page, app_url):
    """开「停止主动联系」→ 安静时段起止出现（只 UI），值本地记住；abar 不再出现。"""
    go_canvas(mobile_page, app_url)
    open_drawer(mobile_page)
    mobile_page.click("#muteToggle")
    assert mobile_page.eval_on_selector(
        "#dQuiet", "el => getComputedStyle(el).display !== 'none'"
    )
    mobile_page.eval_on_selector("#qFrom", "el => el.value = '23:30'")
    mobile_page.dispatch_event("#qFrom", "change")
    assert mobile_page.evaluate("localStorage.getItem('after-qfrom')") == "23:30"
    # 剧本第 6 幕 skipIfMuted：开着停止联系时整幕跳过
    mobile_page.click("#drawerClose")
    mobile_page.evaluate("scene(6)")
    mobile_page.wait_for_timeout(1200)
    assert not mobile_page.evaluate("player.playing")
    assert mobile_page.eval_on_selector_all("#track .msg", "els => els.length") == 0
    shot(mobile_page, "quiet-hours")


def test_privacy_export_download(mobile_page, app_url):
    """导出我的数据：生成一份 JSON 真实下载，内容含 profile 与 after-* 本地键。"""
    go_canvas(mobile_page, app_url)
    mobile_page.evaluate("localStorage.setItem('after-guided','1')")
    open_sub(mobile_page, "隐私")
    with mobile_page.expect_event("download", timeout=5000) as dl:
        mobile_page.click(".gsubbody .startbtn:not(.pvdel)")
    download = dl.value
    assert re.match(r"after-data-\d{4}-\d{2}-\d{2}\.json", download.suggested_filename)
    path = download.path()
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    assert data["app"] == "AFTER" and "profile" in data and "settings" in data
    assert data["localStorage"].get("after-guided") == "1"


def test_delete_account_double_confirm(mobile_page, app_url):
    """删除账户：二次确认 → 清 localStorage → 回开始页。先点一次只亮确认行，可取消。"""
    go_canvas(mobile_page, app_url)
    mobile_page.evaluate("localStorage.setItem('after-guided','1')")
    open_sub(mobile_page, "隐私")
    del_btn = ".gsubbody .pvdel"
    mobile_page.click(del_btn)
    assert mobile_page.eval_on_selector(del_btn, "el => el.disabled")  # 一次点击不生效
    # 取消：恢复原样
    mobile_page.click(f".gsubbody .segrow .seg:has-text('取消')")
    assert not mobile_page.eval_on_selector(del_btn, "el => el.disabled")
    # 再来一遍，确认删除
    mobile_page.click(del_btn)
    # 等重载真正发生（wait_for_load_state 可能命中旧页面的 load，造成竞态）
    with mobile_page.expect_navigation(wait_until="load"):
        mobile_page.click(f".gsubbody .segrow .seg:has-text('确认删除')")
    mobile_page.wait_for_selector("#app")
    assert mobile_page.evaluate("localStorage.length") == 0
    assert mobile_page.eval_on_selector(
        "#startScreen", "el => el.classList.contains('on')"
    )


def test_help_page_copy(mobile_page, app_url):
    """需要帮助：定稿文案、热线占位注明按目标市场填；平台声音没有感叹号。"""
    go_canvas(mobile_page, app_url)
    open_sub(mobile_page, "需要帮助")
    text = mobile_page.eval_on_selector("#gsubBody", "el => el.textContent")
    assert "按目标市场填写" in text and "占位" in text
    assert "AI 角色" in text and "!" not in text and "！" not in text
    shot(mobile_page, "help")


def test_drawer_account_area(mobile_page, app_url):
    """账户区显示注册时填的用户名与姓名；登录路径显示「已登录」。"""
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    # 注册路径：直接在第 11 屏填表（DOM 即是注册时填的）
    mobile_page.evaluate("go(11)")
    mobile_page.fill(".fin[autocomplete='username']", "romaluo")
    mobile_page.fill(".fin[autocomplete='family-name']", "罗")
    mobile_page.fill(".fin[autocomplete='given-name']", "曼")
    mobile_page.select_option("select.fin", label="男性")
    mobile_page.evaluate("go(4)")
    open_drawer(mobile_page)
    assert mobile_page.eval_on_selector("#dName", "el => el.textContent") == "罗曼"
    assert mobile_page.eval_on_selector("#dAcct", "el => el.textContent") == "romaluo"
    mobile_page.click("#dHead")  # 展开细节
    assert mobile_page.eval_on_selector("#duName", "el => el.textContent") == "romaluo"
    assert mobile_page.eval_on_selector("#dSex", "el => el.textContent") == "男性"
    mobile_page.click("#drawerClose")
    # 登录路径：点第三方 → after-login → 「已登录」
    mobile_page.evaluate("go(7)")
    mobile_page.click(".screen[data-s='7'] .foot .startbtn:nth-child(1)")
    mobile_page.wait_for_selector(".screen[data-s='10'].on")
    mobile_page.evaluate("go(4)")
    open_drawer(mobile_page)
    assert mobile_page.eval_on_selector("#dAcct", "el => el.textContent") == "已登录"


def test_ended_reopen_goes_readonly(mobile_page, app_url):
    """结束后（剧本第 7 幕走完）再打开：直达只读画布，开始页不再出现「注册」。"""
    mobile_page.goto(app_url + "?scene=7")
    mobile_page.wait_for_selector("#stagecard.show", timeout=20000)
    mobile_page.click("#scClose")
    mobile_page.wait_for_function("document.body.classList.contains('ended')", timeout=15000)
    assert mobile_page.evaluate("localStorage.getItem('after-ended')") == "1"
    # 再打开
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    mobile_page.wait_for_timeout(800)
    assert mobile_page.evaluate("document.body.classList.contains('ended')")
    assert mobile_page.eval_on_selector(CANVAS, "el => el.classList.contains('on')")
    assert not mobile_page.eval_on_selector(
        "#startScreen", "el => el.classList.contains('on')"
    )
    # 只读：输入区藏掉，widget 不可动
    assert mobile_page.eval_on_selector(
        f"{CANVAS} .composer", "el => getComputedStyle(el).display === 'none'"
    )
    shot(mobile_page, "ended-reopen")


# ---------- 壳清单 · 中 / 低 ----------


def test_subscription_seat_card(mobile_page, app_url):
    """订阅：保留两行 + 一张「1 席」小卡（状态、下次结算日占位）。"""
    go_canvas(mobile_page, app_url)
    open_sub(mobile_page, "订阅")
    assert mobile_page.eval_on_selector(".seatcard .seat", "el => el.textContent") == "1 席"
    text = mobile_page.eval_on_selector(".seatcard", "el => el.textContent")
    assert "状态" in text and "下次结算日" in text and "占位" in text
    shot(mobile_page, "subscription")


def test_fontsize_three_steps(mobile_page, app_url):
    """设置只剩字号三档，且真的生效（--fs-3 变化）、本地记住、重载保持。"""
    go_canvas(mobile_page, app_url)
    open_sub(mobile_page, "设置")
    labels = mobile_page.eval_on_selector_all(
        ".gsubbody .seg", "els => els.map(e => e.textContent)"
    )
    assert labels == ["小", "标准", "大"]
    mobile_page.click(".gsubbody .seg:has-text('大')")
    assert mobile_page.evaluate("document.body.classList.contains('fs-l')")
    assert mobile_page.evaluate(
        "getComputedStyle(document.body).getPropertyValue('--fs-3').trim()"
    ) == "15px"
    mobile_page.reload()
    mobile_page.wait_for_selector("#app")
    assert mobile_page.evaluate("document.body.classList.contains('fs-l')")


def test_rate_and_forgot_coming_soon(mobile_page, app_url):
    """评分与忘记密码：「即将开放」克制态（一行说明）。"""
    go_canvas(mobile_page, app_url)
    open_sub(mobile_page, "评分")
    assert mobile_page.eval_on_selector(
        "#gsubBody", "el => el.textContent.trim()"
    ) == "评分即将开放。"
    mobile_page.click("#gsubBack")
    mobile_page.click("#drawerClose")
    mobile_page.evaluate("go(7)")
    mobile_page.click("#forgotBtn")
    assert mobile_page.eval_on_selector(
        "#forgotHint", "el => el.classList.contains('on') && el.textContent === '找回密码即将开放。'"
    )


def test_report_local_store(mobile_page, app_url):
    """报告：多行输入 + 发送（本地存 after-reports），发送后一行「收到了」。"""
    go_canvas(mobile_page, app_url)
    open_sub(mobile_page, "报告")
    mobile_page.fill(".rtext", "她把日期记错了。")
    mobile_page.click(".gsubbody .startbtn")
    assert mobile_page.eval_on_selector(".rok", "el => el.textContent") == "收到了。"
    reports = json.loads(mobile_page.evaluate("localStorage.getItem('after-reports')"))
    assert reports[0]["text"] == "她把日期记错了。"


def test_third_party_login_goes_enter(mobile_page, app_url):
    """三个第三方按钮点了走进入页（演示），不死按。"""
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    for i in (1, 2, 3):
        mobile_page.evaluate("go(7)")
        mobile_page.click(f".screen[data-s='7'] .foot .startbtn:nth-child({i})")
        mobile_page.wait_for_selector(".screen[data-s='10'].on")


def test_album_sends_local_image(mobile_page, app_url, tmp_path):
    """附件 › 相册：<input type=file> 选本地图，发到画布。"""
    go_canvas(mobile_page, app_url)
    # 造一张本地小图
    png = tmp_path / "pic.png"
    import zlib, struct

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", 4, 4, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\xc8\x50\x3c" * 4 for _ in range(4))
    png.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )
    mobile_page.click(f"{CANVAS} .cbtn.pic")
    mobile_page.wait_for_selector("#atsheet.open")
    mobile_page.click("#atAlbum")
    mobile_page.set_input_files(f"{CANVAS} .cfile", str(png))
    mobile_page.wait_for_selector(f"{CANVAS} .chip img")
    mobile_page.click(f"{CANVAS} .cbtn.mic")  # 有图时它是发送键
    mobile_page.wait_for_selector(f"{CANVAS} .msg.you img")


def test_her_card_paper(mobile_page, app_url):
    """顶栏点她胶囊：一张纸（名字 / 自述 / 认识第 N 天），不可编辑。"""
    go_canvas(mobile_page, app_url)
    mobile_page.click(f"{CANVAS} .idpill")
    mobile_page.wait_for_selector("#hercard.open")
    assert mobile_page.eval_on_selector("#hpName", "el => el.textContent") == "陈小满"
    assert mobile_page.eval_on_selector("#hpBio", "el => el.textContent.length > 0")
    assert mobile_page.eval_on_selector(
        "#hpDays", "el => el.textContent"
    ) == "认识第 1 天"
    assert mobile_page.eval_on_selector(
        "#hercard", "el => !el.querySelector('input,textarea')"
    )
    shot(mobile_page, "hercard")


def test_achv_charms_empty_and_unlock(mobile_page, app_url):
    """成就页：新用户五页全空（只有开口环、圆点全空心）；演示解锁一枚后该页挂上挂件。"""
    go_canvas(mobile_page, app_url, "?dev=1")
    mobile_page.click(f"{CANVAS} .hbtn.achv")
    mobile_page.wait_for_selector("#achv.open")
    # charms.js 是动态 import 的，等它装好并决定渲染模式（GL / 平铺降级）
    mobile_page.wait_for_function("() => window.__charmsMode !== undefined", timeout=15000)
    mode = mobile_page.evaluate("window.__charmsMode")
    if mode == "gl":
        slots = mobile_page.evaluate("window.__charmsSlots()")
        assert len(slots) == 5 and not any(s["hasCharm"] for s in slots)
        assert mobile_page.evaluate("window.__charmsPage()") == 0  # 全空时停第一页
    else:
        assert mobile_page.eval_on_selector_all("#achvFall .pg", "els => els.length") == 5
        assert mobile_page.eval_on_selector_all("#achvFall .pg.got", "els => els.length") == 0
    # 翻页圆点：五个全空心；常驻纸条空
    assert mobile_page.eval_on_selector_all("#achvDots i", "els => els.length") == 5
    assert mobile_page.eval_on_selector_all("#achvDots i.got", "els => els.length") == 0
    assert mobile_page.eval_on_selector("#achvNote", "el => el.textContent") == ""
    shot(mobile_page, "achv-empty")
    mobile_page.click("#achvClose")
    # 演示菜单是脚手架，用 JS 点击（真机演示路径不走它）
    mobile_page.evaluate("document.querySelector('.devbtn').click()")
    mobile_page.evaluate("document.querySelector(\".devmenu [data-act='unlock']\").click()")
    # 她给的过程：PNG 落在画布上 → 晃两下 → 她说一句 → 4s 后飘进圆键
    mobile_page.wait_for_selector(".wg[id^='wg-charm-']", timeout=15000)
    mobile_page.wait_for_selector(f"{CANVAS} .hbtn.achv.ringed", timeout=15000)
    assert mobile_page.evaluate("JSON.parse(localStorage.getItem('after-charms')).length") == 1
    mobile_page.click(f"{CANVAS} .hbtn.achv")
    mobile_page.wait_for_selector("#achv.open")
    if mode == "gl":
        # openPage 在微任务里挂上去，直接等那枚玫瑰挂出来（不赌时序）
        mobile_page.wait_for_function(
            "() => window.__charmsSlots && window.__charmsSlots()[0].hasCharm === true",
            timeout=15000)
        slots = mobile_page.evaluate("window.__charmsSlots()")
        assert slots[0]["id"] == "rose"
        assert mobile_page.evaluate("window.__charmsPage()") == 0  # 停最新解锁的那一枚
    else:
        mobile_page.wait_for_selector("#achvFall .pg.got", timeout=15000)
        assert mobile_page.eval_on_selector_all("#achvFall .pg.got", "els => els.length") == 1
    # 圆点一枚实心，纸条是玫瑰那句
    assert mobile_page.eval_on_selector_all("#achvDots i.got", "els => els.length") == 1
    assert "我说不的时候" in mobile_page.eval_on_selector("#achvNote", "el => el.textContent")
    shot(mobile_page, "achv-one-charm")


def test_achv_charms_all_param(mobile_page, app_url):
    """演示「五枚都有」：直接进满串页，五页都有挂件、圆点全实心、停最新一枚。"""
    go_canvas(mobile_page, app_url, "?dev=1")
    mobile_page.evaluate("document.querySelector('.devbtn').click()")
    mobile_page.evaluate("document.querySelector(\".devmenu [data-act='charmsAll']\").click()")
    mobile_page.wait_for_selector("#achv.open")
    mobile_page.wait_for_function("() => window.__charmsMode !== undefined", timeout=15000)
    mobile_page.wait_for_timeout(600)
    mode = mobile_page.evaluate("window.__charmsMode")
    if mode == "gl":
        slots = mobile_page.evaluate("window.__charmsSlots()")
        assert [s["id"] for s in slots] == ["rose", "letter", "egg", "match", "ring"]
        assert all(s["hasCharm"] for s in slots)
        assert mobile_page.evaluate("window.__charmsPage()") == 4  # 停最新解锁的那一枚
    else:
        assert mobile_page.eval_on_selector_all("#achvFall .pg.got", "els => els.length") == 5
    assert mobile_page.eval_on_selector_all("#achvDots i.got", "els => els.length") == 5
    assert "先放你这儿" in mobile_page.eval_on_selector("#achvNote", "el => el.textContent")
    shot(mobile_page, "achv-all")


def test_shelf_empty_then_seven(mobile_page, app_url):
    """零件匣空态一行「她还没给你东西。」；她给过七件后七件都在。"""
    go_canvas(mobile_page, app_url)
    mobile_page.evaluate("go(12)")
    assert mobile_page.eval_on_selector(
        ".shelfempty", "el => el.textContent"
    ) == "她还没给你东西。"
    shot(mobile_page, "shelf-empty")
    mobile_page.evaluate("go(4)")
    mobile_page.evaluate(
        "['vt','wx','cal','stk','gb','gz','alm'].forEach(k => placeWidget(k, {}))"
    )
    mobile_page.wait_for_timeout(400)
    mobile_page.evaluate("go(12)")
    assert mobile_page.eval_on_selector_all(".shelfrow", "els => els.length") == 7
    # 独件页可达且能回
    mobile_page.click(".shelfrow:first-child")
    mobile_page.wait_for_selector(".screen[data-s='13'].on")
    mobile_page.evaluate("go(12)")
    mobile_page.wait_for_selector(".screen[data-s='12'].on")


def test_netfail_presence(mobile_page, app_url):
    """断网模拟：你那侧红点重发，她那侧顶栏小字「连不上」。"""
    go_canvas(mobile_page, app_url, "?dev=1")
    mobile_page.evaluate("document.querySelector('.devbtn').click()")
    mobile_page.evaluate("document.querySelector(\".devmenu [data-act='netfail']\").click()")
    assert mobile_page.eval_on_selector(
        f"{CANVAS} .who .tag", "el => el.textContent.includes('连不上')"
    )
    mobile_page.evaluate("document.querySelector(\".devmenu [data-act='netfail']\").click()")
    assert not mobile_page.eval_on_selector(
        f"{CANVAS} .who .tag", "el => el.textContent.includes('连不上')"
    )


# ---------- 文案 / STRINGS ----------


def test_strings_all_bound(mobile_page, app_url):
    """STR_BIND 无落空（每条绑定都命中元素），页面无报错。"""
    warns = []
    mobile_page.on(
        "console",
        lambda m: warns.append(m.text) if "字串绑定落空" in m.text else None,
    )
    errors = []
    mobile_page.on("pageerror", lambda e: errors.append(str(e)))
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    assert warns == [], f"有字串绑定落空: {warns}"
    assert errors == [], f"页面报错: {errors}"
    # 抽查几处水化结果
    assert mobile_page.eval_on_selector(
        "#startScreen .btns .primary", "el => el.textContent"
    ) == "注册"
    assert mobile_page.eval_on_selector(
        ".screen[data-s='8'] .opt", "el => el.textContent"
    ) == "我想分享生活中的琐事，让情绪有一个出口"
    # 挂件登记表：五枚，顺序与 charms.js 的 CHARMS 一致（页面位置跟着这个顺序走）
    ids = mobile_page.evaluate("STRINGS.achv.items.map(i => i.id)")
    assert ids == ["rose", "letter", "egg", "match", "ring"]


def test_system_voice_len(mobile_page, app_url):
    """系统声音规则自检：空态 / 提示行 / toast 类字串 ≤14 字、句号结尾（标签类除外）。"""
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    bad = mobile_page.evaluate(
        """(() => {
          const s = STRINGS;
          const oneLiners = [s.canvas.seen, s.shelf.empty, s.rate.soon,
            s.report.got, s.login.forgotSoon, s.presence.netfail];
          return oneLiners.filter(t => t.length > 14 || !/。$|^连不上$|^已读$|^未获得$/.test(t));
        })()"""
    )
    assert bad == [], f"系统声音超规: {bad}"


# ---------- 剧本《十二天》（第四节可程序化部分） ----------


def test_script_scenes_boot(mobile_page, app_url):
    """?scene=1…7 各自起播：从空布起，无报错。"""
    for n in range(1, 8):
        errors = []
        mobile_page.on("pageerror", lambda e: errors.append(str(e)))
        mobile_page.goto(app_url + f"?scene={n}")
        mobile_page.wait_for_selector("#app")
        mobile_page.wait_for_timeout(2500 if n < 7 else 6000)
        assert errors == [], f"第 {n} 幕起播报错: {errors}"
        assert mobile_page.evaluate("player.i") == n


def test_script_scene6_branch(mobile_page, app_url):
    """第 6 幕分岔：到达后播放器停在分岔口；「回」→ warmth 回 .6 且和好（第 7 幕跳过）。"""
    mobile_page.goto(app_url + "?scene=6&dev=1")
    mobile_page.wait_for_selector("#app")
    mobile_page.wait_for_function("!!player.branch", timeout=15000)
    assert mobile_page.eval_on_selector(
        "#track", "el => el.textContent.includes('那天的事，我想了想')"
    )
    mobile_page.click(".devbtn")
    mobile_page.click("[data-branch='0']")
    mobile_page.wait_for_function("player.makeup === true", timeout=15000)
    assert mobile_page.evaluate("document.body.dataset.warmth") == "0.6"
    # 和好了：第十二天没有来
    mobile_page.evaluate("scene(7)")
    assert not mobile_page.evaluate("player.playing")


def test_script_replay_clears(mobile_page, app_url):
    """「重头」：清空画布、回开始页、她不重复出现。"""
    mobile_page.goto(app_url + "?scene=2&dev=1")
    mobile_page.wait_for_selector("#app")
    mobile_page.wait_for_timeout(4000)
    mobile_page.click(".devbtn")
    mobile_page.click(".devmenu [data-act='replay']")
    mobile_page.wait_for_selector("#startScreen.on")
    assert mobile_page.eval_on_selector_all(
        "#track .msg, #track .wg", "els => els.length"
    ) == 0
    assert not mobile_page.evaluate("spirit.classList.contains('on')")


# ---------- 性能预算（headless 粗测；blur 不栅格化，数字偏乐观，真机复核） ----------


def test_perf_p6_cold_start(mobile_page, app_url):
    """P6 粗测：冷启动到开始页可操作（本地静态服务，无网络节流；4G 数字待真机）。"""
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    t = mobile_page.evaluate(
        """(() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const paint = {};
          performance.getEntriesByType('paint').forEach(p => paint[p.name] = p.startTime);
          return {
            domContentLoaded: nav.domContentLoadedEventEnd,
            load: nav.loadEventEnd,
            firstPaint: paint['first-paint'],
            now: performance.now()
          };
        })()"""
    )
    print(f"\n[P6 粗测] domContentLoaded={t['domContentLoaded']:.0f}ms "
          f"load={t['load']:.0f}ms firstPaint={t.get('firstPaint')} now={t['now']:.0f}ms")
    # 本地直供：到 #app 可操作应远小于 1.5s 预算；4G 预算真机验
    assert t["now"] < 1500, f"冷启动到可操作 {t['now']:.0f}ms，超 1.5s（本地粗测）"


def test_perf_p1_scroll_long_frames(mobile_page, app_url):
    """P1 粗测：满屏 widget（7 件）+ 20 气泡，强制逐帧滚动 2s，统计长帧 >32ms。

    headless WebKit 不栅格化 blur/backdrop-filter，此数字偏乐观，只作回归参照。
    """
    go_canvas(mobile_page, app_url)
    mobile_page.evaluate(
        """(() => {
          for (let i = 0; i < 20; i++) youSay(track, scroller, '第 ' + (i + 1) + ' 条，滚动性能粗测。');
          ['vt','wx','cal','stk','gb','gz','alm'].forEach(k => placeWidget(k, {}));
        })()"""
    )
    mobile_page.wait_for_timeout(1500)
    frames = mobile_page.evaluate(
        """new Promise(res => {
          const sc = document.querySelector(".screen[data-s='4'] .scroll");
          const frames = [];
          let last = performance.now(); const t0 = last;
          function tick(t) {
            frames.push(t - last); last = t;
            sc.scrollTop = (sc.scrollHeight - sc.clientHeight) * (0.5 + 0.5 * Math.sin((t - t0) / 300));
            if (t - t0 < 2000) requestAnimationFrame(tick); else res(frames.slice(1));
          }
          requestAnimationFrame(tick);
        })"""
    )
    long_frames = [f for f in frames if f > 32]
    print(f"\n[P1 粗测] 帧数={len(frames)} 最长帧={max(frames):.1f}ms "
          f">32ms 长帧={len(long_frames)}（headless 不栅格化 blur，偏乐观）")
    shot(mobile_page, "perf-full-canvas")
    # 本机 headless WebKit 无 GPU 合成，帧普遍 >32ms（实测 11/11），断言没有区分度。
    # P1 的预算按规格在真机（L/A）上验；这里只留测量值与一张满屏截图做回归参照，
    # 只在崩坏级退化（平均帧 >1s）时才挂。
    avg = sum(frames) / max(1, len(frames))
    assert avg < 1000, f"平均帧 {avg:.0f}ms，崩坏级退化（headless 粗测）"
