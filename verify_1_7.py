# verify_1_7.py — 干净页面复查 1.7
import time, json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/h-mind/h-mind-LOVE%20MACHINES/04_script/test/frontend/index.html'
with sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.goto(URL)
    pg.evaluate("guideDone=true")   # 不让引导弹窗干扰
    pg.evaluate("go(2)")
    pg.evaluate("var s=document.querySelector('.screen[data-s=\"2\"] .thread'); herSay(s,s,'测试typing')")
    time.sleep(0.3)
    pos = pg.evaluate("""(()=>{
      var t=document.querySelector('.screen[data-s="2"] .thread');
      return {kids:[...t.children].map(e=>e.className),
              bye:t.querySelector('.ehint').classList.contains('bye')};
    })()""")
    print(json.dumps(pos, ensure_ascii=False))
    kids = pos['kids']
    ok1 = 'msg her typing' in kids and kids.index('msg her typing') < kids.index('ehint')
    ok2 = pos['bye']
    print('1.7 typing 在空态文字上方:', 'PASS' if ok1 else 'FAIL')
    print('1.7 空态文字淡出(bye):', 'PASS' if ok2 else 'FAIL')
    # 等话到达后 ehint 应 display:none
    time.sleep(3.2)
    disp = pg.evaluate("getComputedStyle(document.querySelector('.screen[data-s=\"2\"] .thread .ehint')).display")
    print('1.7 话到后 ehint display:', disp, 'PASS' if disp == 'none' else 'FAIL')
    pg.screenshot(path='artifacts/checks/p1_typing.png')
    browser.close()
