# verify_part1.py — 第一部分修复的自动化复查（Chromium 390×844）
import time, sys, json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/h-mind/h-mind-LOVE%20MACHINES/04_script/test/frontend/index.html'
results = []
def check(name, ok, note=''):
    results.append((name, ok, note))
    print(('PASS ' if ok else 'FAIL ') + name + ((' | ' + note) if note else ''))

with sync_playwright() as p:
    try:
        browser = p.chromium.launch()
        bname = 'chromium'
    except Exception:
        browser = p.webkit.launch()
        bname = 'webkit(fallback)'
    print('browser:', bname)
    pg = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))

    # ---------- 1.1 协议页 ----------
    pg.goto(URL)
    pg.evaluate("go(1)")
    time.sleep(0.6)
    li_in = pg.evaluate("document.querySelectorAll('.terms li.in').length")
    btn_ready = pg.evaluate("document.getElementById('termsBtn').classList.contains('ready')")
    check('1.1 首条~260ms 出一条', li_in == 1, f'li.in={li_in}')
    check('1.1 按钮此时未浮出', not btn_ready)
    time.sleep(2.6)  # 约 3.2s 后三条齐
    li_in = pg.evaluate("document.querySelectorAll('.terms li.in').length")
    time.sleep(0.6)
    btn_ready = pg.evaluate("document.getElementById('termsBtn').classList.contains('ready')")
    link_ready = pg.evaluate("document.getElementById('termslink').classList.contains('ready')")
    check('1.1 三条自动出齐', li_in == 3, f'li.in={li_in}')
    check('1.1 按钮淡入(ready)', btn_ready)
    check('1.1 条款链接同时淡入', link_ready)
    pg.click('#termsBtn')
    time.sleep(0.3)
    check('1.1 按一次就走(data-s=8)', pg.evaluate("go.now") == 8)

    # ---------- 1.2 光池（outline 检查） ----------
    pg.evaluate("go(6)")
    time.sleep(1.0)
    pg.evaluate("document.querySelector('.pool').style.outline='1px solid red'")
    pg.screenshot(path='artifacts/checks/p1_pool_outline.png')
    box = pg.evaluate("var p=document.querySelector('.pool').getBoundingClientRect();[p.left,p.top,p.width,p.height]")
    check('1.2 光池盒子伸出屏外', box[0] < 0 and box[1] < 0, str(box))

    # ---------- 1.3 到达条 ----------
    pg.evaluate("go(1)")
    pg.evaluate("arriveAct('测试冷屏到达')")
    time.sleep(0.5)
    shown_cold = pg.evaluate("document.getElementById('abar').classList.contains('show')")
    check('1.3 冷屏不弹到达条', not shown_cold)
    pg.evaluate("go(4)")
    pg.evaluate("arriveAct('测试暖屏到达')")
    time.sleep(0.5)
    shown_warm = pg.evaluate("document.getElementById('abar').classList.contains('show')")
    check('1.3 暖屏弹到达条', shown_warm)
    pg.evaluate("go(1)")
    time.sleep(0.6)
    still = pg.evaluate("document.getElementById('abar').classList.contains('show')")
    check('1.3 go() 切屏即收', not still)
    pg.screenshot(path='artifacts/checks/p1_abar.png')

    # ---------- 1.4 剧本 widget 追加 slot ----------
    pg2 = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg2.on('pageerror', lambda e: errors.append(str(e)))
    pg2.goto(URL + '?scene=3')
    time.sleep(12)  # 等剧本跑到 place 之后
    info = pg2.evaluate("""(()=>{
      var track=document.getElementById('track');
      var kids=[...track.children].map(e=>e.className+(e.dataset.w?':'+e.dataset.w:''));
      var slots=[...track.querySelectorAll('.slot')].map(s=>({w:s.dataset.w||null, top:s.offsetTop, h:s.offsetHeight}));
      var wgs=[...track.querySelectorAll('.wg')].map(w=>({id:w.id, top:w.offsetTop, h:w.offsetHeight, vis:getComputedStyle(w).visibility}));
      return {kids:kids.slice(-14), slots:slots, wgs:wgs, playing:player.playing};
    })()""")
    appended = [s for s in info['slots'] if s['w'] and s['w'].startswith('wg-')]
    check('1.4 剧本模式出现追加 slot', len(appended) >= 1, json.dumps(info['slots'][-4:], ensure_ascii=False))
    ok_align = True
    if appended:
        for s in appended[:2]:
            wg = [w for w in info['wgs'] if w['id'] == s['w']]
            if wg and abs(wg[0]['top'] - (s['top'] + 10)) > 4:
                ok_align = False
    check('1.4 widget 停靠在新 slot 上(top=slot+10)', ok_align, json.dumps(info['wgs'][-3:], ensure_ascii=False))
    pg2.screenshot(path='artifacts/checks/p1_scene3.png')
    pg2.close()

    # ---------- 1.5 关于你必填 ----------
    pg.evaluate("go(11)")
    dis0 = pg.evaluate("document.getElementById('aboutNext').disabled")
    pg.fill('.screen[data-s="11"] input[autocomplete="username"]', 'tester')
    dis1 = pg.evaluate("document.getElementById('aboutNext').disabled")
    pg.fill('.screen[data-s="11"] input[autocomplete="family-name"]', 'chen')
    pg.fill('.screen[data-s="11"] input[autocomplete="given-name"]', 'xiao')
    dis2 = pg.evaluate("document.getElementById('aboutNext').disabled")
    check('1.5 空着不能继续', dis0 is True)
    check('1.5 只填一个仍锁定', dis1 is True)
    check('1.5 填全解锁', dis2 is False)

    # ---------- 1.6 进入页居中(登录路径) ----------
    pg.evaluate("document.body.classList.remove('spiritjourney'); go(10)")
    time.sleep(1.0)
    wy = pg.evaluate("document.querySelector('#enterScreen .welcome').getBoundingClientRect().top")
    H = 844
    check('1.6 登录路径欢迎语接近中轴', abs(wy - H/2) < 60, f'welcome y={wy:.0f}')

    # ---------- 1.7 空对话 typing 位置 ----------
    pg.evaluate("go(2)")
    pg.evaluate("var s=document.querySelector('.screen[data-s=\"2\"] .thread'); herSay(s,s,'测试typing')")
    time.sleep(0.3)
    pos = pg.evaluate("""(()=>{
      var t=document.querySelector('.screen[data-s="2"] .thread');
      var kids=[...t.children].map(e=>e.className);
      var bye=document.querySelector('.screen[data-s="2"] .ehint').classList.contains('bye');
      return {kids:kids, bye:bye};
    })()""")
    check('1.7 typing 在空态文字上方', 'msg her typing' in pos['kids'] and pos['kids'].index('msg her typing') < pos['kids'].index('ehint') if 'ehint' in pos['kids'] else False, json.dumps(pos, ensure_ascii=False))
    check('1.7 空态文字淡出(bye)', pos['bye'])
    pg.screenshot(path='artifacts/checks/p1_typing.png')

    # ---------- 1.8 阶段卡雾 ----------
    pg.evaluate("stageAct({kind:'stage', line:'新的一章', title:'第三天', days:'8.26'}, function(){})")
    time.sleep(0.6)
    glassed = pg.evaluate("document.body.classList.contains('glassed')")
    veil = pg.evaluate("getComputedStyle(document.getElementById('stagecard')).backgroundColor")
    check('1.8 阶段卡挂 body.glassed', glassed)
    check('1.8 阶段卡有浅雾', '0.26' in veil, veil)
    pg.screenshot(path='artifacts/checks/p1_stagecard.png')
    pg.evaluate("document.getElementById('scClose').click()")
    time.sleep(0.6)
    check('1.8 收起退雾', not pg.evaluate("document.body.classList.contains('glassed')"))

    # ---------- 1.9 ?slow= ----------
    pg3 = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg3.goto(URL + '?slow=3')
    sc = pg3.evaluate("SC")
    check('1.9 ?slow=3 读进 SC', abs(sc - 3) < 0.001, f'SC={sc}')
    pg3.close()

    check('全局无 JS 错误', len(errors) == 0, '; '.join(errors[:3]))
    browser.close()

fails = [r for r in results if not r[1]]
print(f'\n==== {len(results)-len(fails)}/{len(results)} PASS ====')
sys.exit(1 if fails else 0)
