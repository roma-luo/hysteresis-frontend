"""被测设备矩阵。

iPhone(WebKit) 为主力档位，Pixel(Chromium) 作为 Android 对照。
device 名称必须是 Playwright 内置设备描述符（playwright.devices 的键）。
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DeviceSpec:
    id: str       # 用于测试 ID 与截图文件名
    engine: str   # playwright 浏览器类型: webkit / chromium
    device: str   # Playwright 设备描述符名称


DEVICE_MATRIX = [
    DeviceSpec("iphone-13", "webkit", "iPhone 13"),       # 主力：标准尺寸 iPhone
    DeviceSpec("iphone-se", "webkit", "iPhone SE"),       # 小屏兜底
    DeviceSpec("iphone-14-pro-max", "webkit", "iPhone 14 Pro Max"),  # 大屏
    DeviceSpec("pixel-7", "chromium", "Pixel 7"),         # Android 对照
]

PRIMARY = DEVICE_MATRIX[0]
