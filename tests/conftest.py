"""测试夹具：本地静态服务器 + 设备矩阵参数化的移动端页面。

前端目录默认为项目根的 frontend/，可用环境变量 TESTKIT_FRONTEND 覆盖
（例如指向后续置入的构建产物目录）。
"""

from __future__ import annotations

import os
import threading
from pathlib import Path

import pytest

from testkit.devices import DEVICE_MATRIX
from testkit.server import make_server

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def frontend_dir() -> Path:
    override = os.environ.get("TESTKIT_FRONTEND")
    return (PROJECT_ROOT / override).resolve() if override else PROJECT_ROOT / "frontend"


@pytest.fixture(scope="session")
def app_url():
    """在随机端口上服务前端目录，返回其地址。"""
    server = make_server(frontend_dir(), host="127.0.0.1", port=0, eruda=False)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}/"
    server.shutdown()


@pytest.fixture(scope="session")
def _engines(playwright):
    """按需启动并复用浏览器引擎（webkit / chromium）。"""
    cache = {}
    yield lambda name: cache.setdefault(name, getattr(playwright, name).launch())
    for browser in cache.values():
        browser.close()


@pytest.fixture(params=DEVICE_MATRIX, ids=lambda spec: spec.id)
def mobile_page(playwright, _engines, request):
    """每个测试在整个设备矩阵上各跑一遍。page.device_id 为当前设备。"""
    spec = request.param
    browser = _engines(spec.engine)
    context = browser.new_context(**playwright.devices[spec.device])
    page = context.new_page()
    page.device_id = spec.id
    yield page
    context.close()
