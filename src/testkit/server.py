"""静态文件服务器：把 frontend/ 提供给局域网内的真 iPhone 访问。

特性:
- 默认监听 0.0.0.0，手机连同一 WiFi 即可访问
- 对 HTML 响应注入 Eruda 移动端控制台（屏幕右下角浮动按钮），便于在手机上看 console/网络请求
- 全部响应带 Cache-Control: no-store，避免调试时被缓存坑
"""

from __future__ import annotations

import argparse
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FRONTEND = PROJECT_ROOT / "frontend"

ERUDA_SNIPPET = (
    b'<script src="https://cdn.jsdelivr.net/npm/eruda"></script>'
    b"<script>eruda.init();eruda.position({x:8,y:280});</script>"
)


class DevHandler(SimpleHTTPRequestHandler):
    eruda = False

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.eruda and self._try_serve_injected_html():
            return
        super().do_GET()

    def _try_serve_injected_html(self) -> bool:
        path = Path(self.translate_path(self.path.split("?", 1)[0]))
        if path.is_dir():
            path = path / "index.html"
        if path.suffix.lower() not in (".html", ".htm") or not path.is_file():
            return False
        body = path.read_bytes()
        if b"</body>" in body:
            body = body.replace(b"</body>", ERUDA_SNIPPET + b"</body>", 1)
        else:
            body += ERUDA_SNIPPET
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return True


def make_server(
    directory: Path | str = DEFAULT_FRONTEND,
    host: str = "0.0.0.0",
    port: int = 8000,
    eruda: bool = True,
) -> ThreadingHTTPServer:
    handler = partial(
        type("Handler", (DevHandler,), {"eruda": eruda}),
        directory=str(directory),
    )
    return ThreadingHTTPServer((host, port), handler)


def lan_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="局域网前端调试服务器（iPhone 真机用）")
    parser.add_argument("--dir", default=str(DEFAULT_FRONTEND), help="要服务的前端目录")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-eruda", action="store_true", help="关闭 Eruda 控制台注入")
    args = parser.parse_args()

    server = make_server(args.dir, args.host, args.port, eruda=not args.no_eruda)
    port = server.server_address[1]
    print(f"服务目录: {Path(args.dir).resolve()}")
    print(f"本机访问: http://127.0.0.1:{port}/")
    ip = lan_ip()
    if ip:
        print(f"iPhone 访问（需同一 WiFi）: http://{ip}:{port}/")
    if not args.no_eruda:
        print("Eruda 已注入：手机页面右下角浮动按钮 = 控制台")
    print("Ctrl+C 停止")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
