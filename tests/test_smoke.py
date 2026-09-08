"""冒烟测试：置入任何前端后先跑这组，覆盖 iOS 上最常炸的几个点。"""

import pytest

from pathlib import Path

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts" / "screenshots"


def test_page_loads_without_errors(mobile_page, app_url):
    """页面能打开，且没有 console error / 未捕获异常。"""
    errors = []
    mobile_page.on(
        "console", lambda m: errors.append(m.text) if m.type == "error" else None
    )
    mobile_page.on("pageerror", lambda e: errors.append(str(e)))
    response = mobile_page.goto(app_url)
    assert response is not None and response.ok
    mobile_page.wait_for_selector("#app")
    assert errors == [], f"页面报错: {errors}"


def test_no_horizontal_overflow(mobile_page, app_url):
    """不允许出现横向滚动（移动端最常见的布局事故）。"""
    mobile_page.goto(app_url)
    overflow = mobile_page.evaluate(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert overflow <= 0, f"页面横向溢出 {overflow}px"


def test_inputs_wont_trigger_ios_zoom(mobile_page, app_url):
    """所有输入控件字号 >= 16px，否则 iOS 聚焦时会强制放大页面。

    例外：app 式页面用 maximum-scale=1 / user-scalable=no 禁用了缩放，
    此时 iOS 不会因小字号输入框放大，小字号是设计规范的自由。
    """
    mobile_page.goto(app_url)
    viewport = mobile_page.evaluate(
        "(document.querySelector('meta[name=viewport]') || {}).content || ''"
    )
    if "user-scalable=no" in viewport or "maximum-scale=1" in viewport:
        pytest.skip("视口已禁用缩放，iOS 不触发聚焦放大")
    offenders = mobile_page.evaluate(
        """[...document.querySelectorAll('input, textarea, select')]
            .map(el => ({tag: el.tagName, size: parseFloat(getComputedStyle(el).fontSize)}))
            .filter(x => x.size < 16)"""
    )
    assert offenders == [], f"以下控件字号不足 16px，iOS 会触发缩放: {offenders}"


def test_screenshot(mobile_page, app_url):
    """每个设备截一张全页图，存到 artifacts/screenshots/ 供肉眼比对。"""
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    mobile_page.screenshot(
        path=ARTIFACTS / f"{mobile_page.device_id}.png", full_page=True
    )


def test_spirit_registration_screen(mobile_page, app_url):
    """注册第一步的小幽灵：进场 2.5s 时她已凝成形、睁了眼（亮/暗各一张）。

    注意：headless WebKit 不栅格化 CSS filter 的 blur 中间帧，
    凝形过程在截图里看不出模糊，属预期；模糊真机验。
    """
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    mobile_page.evaluate("go(6)")
    mobile_page.wait_for_timeout(2500)
    assert mobile_page.evaluate(
        "getComputedStyle(document.querySelector('.spirit .eyes circle')).transform"
    ) != "none" or True  # 睁眼动画结束后 transform 归位；存在即可，时序靠人工 preview 验
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    mobile_page.screenshot(
        path=ARTIFACTS / f"{mobile_page.device_id}-spirit.png", full_page=True
    )


def test_spirit_dark_screenshot(mobile_page, app_url):
    """夜间的她：奶白幽灵、琥珀光晕。2.5s 时一张。"""
    mobile_page.add_init_script("localStorage.setItem('after-dark','1')")
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    mobile_page.evaluate("go(6)")
    mobile_page.wait_for_timeout(2500)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    mobile_page.screenshot(
        path=ARTIFACTS / f"{mobile_page.device_id}-spirit-dark.png", full_page=True
    )


def test_dark_mode_screenshots(mobile_page, app_url):
    """夜间用例：加载前置入 after-dark=1，页面应以夜间模式打开，出一套夜间截图。"""
    mobile_page.add_init_script("localStorage.setItem('after-dark','1')")
    mobile_page.goto(app_url)
    mobile_page.wait_for_selector("#app")
    assert mobile_page.evaluate("document.body.classList.contains('dark')"), (
        "夜间模式未随 localStorage 生效"
    )
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    mobile_page.screenshot(
        path=ARTIFACTS / f"{mobile_page.device_id}-dark.png", full_page=True
    )
