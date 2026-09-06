# HYSTERESIS 前端测试平台

iPhone(WebKit) 优先的移动端前端测试环境。Windows 上开发，无需 Mac。

## 三种用法

### 1. 本机 iPhone 预览（最常用）

弹出一个真 WebKit 引擎窗口，按 iPhone 尺寸/触摸/DPR 模拟：

```bash
uv run preview                        # iPhone 13，打开 frontend/
uv run preview --device "iPhone SE"   # 换机型
uv run preview --url http://localhost:5173   # 指向外部 dev server（如 Vite）
uv run preview --list                 # 列出所有可用 iPhone 机型名
```

窗口旁的 Playwright Inspector 可录制操作、单步调试；关闭 Inspector 退出。

### 2. 真 iPhone 调试（最终验收）

```bash
uv run serve          # 局域网服务 frontend/，默认端口 8000
uv run serve --dir ../some/build     # 服务其他目录
uv run serve --no-eruda              # 关闭 Eruda 注入
```

启动后按提示在 iPhone（同一 WiFi）上打开 `http://<局域网IP>:8000/`。
页面右下角浮动按钮是 Eruda 控制台，可看 console、网络请求、元素。
首次访问若打不开，检查 Windows 防火墙是否放行了 Python。

### 3. 自动化冒烟测试

```bash
uv run pytest                  # 全设备矩阵（3 款 iPhone + Pixel 7）
uv run pytest -k iphone-13     # 只跑主力机型
```

覆盖：页面加载无报错、无横向溢出、输入框字号不触发 iOS 缩放、
全设备截图（输出到 `artifacts/screenshots/` 供肉眼比对）。

## 置入前端设计

把设计稿的 HTML/CSS/JS 放进 `frontend/`（替换占位页），三种用法立即生效。
如果前端是独立构建产物，也可以不动 `frontend/`：

```bash
TESTKIT_FRONTEND=../build uv run pytest   # 环境变量指向构建目录（相对项目根）
uv run serve --dir ../build
```

## 设备矩阵

在 `src/testkit/devices.py` 里增删。当前：iPhone 13（主力）、
iPhone SE（小屏）、iPhone 14 Pro Max（大屏）、Pixel 7（Android 对照）。

## 边界与提醒

Playwright 的 WebKit 与 Safari 同引擎，能抓到绝大多数 CSS/JS 差异，
但不是完整 iOS：地址栏收放、软键盘、输入法、性能特性只有真机（用法 2）能验证。
发布前务必在真 iPhone 上过一遍。
