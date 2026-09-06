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
