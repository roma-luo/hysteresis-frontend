"""本机 iPhone 预览：弹出一个真 WebKit 引擎的窗口，按 iPhone 参数模拟。

用法:
    uv run preview                      # iPhone 13 打开本地 frontend/
    uv run preview --device "iPhone SE"
    uv run preview --url http://localhost:5173   # 指向外部 dev server
    uv run preview --list               # 列出所有可用 iPhone 设备名

窗口内同时打开 Playwright Inspector，可以录制操作、单步执行。
关闭 Inspector 即退出。
"""

from __future__ import annotations

import argparse
import threading

from playwright.sync_api import sync_playwright

from testkit.server import DEFAULT_FRONTEND, make_server


def main() -> None:
    parser = argparse.ArgumentParser(description="本机 iPhone(WebKit) 预览窗口")
    parser.add_argument("--device", default="iPhone 13", help="Playwright 设备描述符名")
    parser.add_argument("--url", default=None, help="要打开的地址；缺省时自动服务 frontend/")
    parser.add_argument("--dir", default=str(DEFAULT_FRONTEND), help="缺省服务的前端目录")
    parser.add_argument("--list", action="store_true", help="列出可用的 iPhone 设备名后退出")
    args = parser.parse_args()

    with sync_playwright() as p:
        if args.list:
            for name in p.devices:
                if "iPhone" in name and "landscape" not in name:
                    print(name)
            return

        url = args.url
        server = None
        if url is None:
            server = make_server(args.dir, host="127.0.0.1", port=0, eruda=False)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            url = f"http://127.0.0.1:{server.server_address[1]}/"

        device = p.devices[args.device]
        browser = p.webkit.launch(headless=False)
        context = browser.new_context(**device)
        context.grant_permissions(["camera"])
        page = context.new_page()
        page.goto(url)
        print(f"{args.device} -> {url}")
        print("Playwright Inspector 已打开；关闭它即退出预览。")
        page.pause()

        browser.close()
        if server:
            server.shutdown()


if __name__ == "__main__":
    main()
