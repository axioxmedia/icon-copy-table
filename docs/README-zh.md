<div align="center">

# 图标复制表

**Packed via Axiox Media**

两步桌面工具：先选 Solid / Regular / Brands Regular，再分页浏览 Font Awesome Free 字形，并复制专用区字符到 Unreal Text 字段。

<p>
  <a href="../README.md"><img src="https://img.shields.io/badge/English-README-e7c07a?style=for-the-badge" alt="English README" /></a>
</p>

<p>
  <a href="#install">安装</a> ·
  <a href="#features">功能</a> ·
  <a href="#requirements">环境</a> ·
  <a href="#architecture">结构</a> ·
  <a href="#documentation">问答</a>
</p>

<p>
  <img src="https://img.shields.io/badge/platform-Windows_10%2F11-0b0d12?style=flat-square" alt="Windows" />
  <img src="https://img.shields.io/badge/python-3.11%2B-e7c07a?style=flat-square" alt="Python" />
  <img src="https://img.shields.io/badge/ui-zh%20%2F%20en-7ee0c6?style=flat-square" alt="i18n" />
  <img src="https://img.shields.io/badge/glyphs-FA_7.3.1-c9a227?style=flat-square" alt="Font Awesome 7.3.1" />
</p>

</div>

<div align="center">
  <img src="APPCap.png" alt="图标复制表 预览" width="100%" />
</div>

> [!NOTE]
> 打包后的 EXE 未签名。首次运行可能被 Windows SmartScreen 拦截。

---

## 一览

| 项 | 值 |
|---|---|
| 产品 | 图标复制表 |
| 流程 | 选择字体 → 分页复制表 |
| 家族 | Solid、Regular、Brands Regular |
| 目录 | Font Awesome Free 7.3.1 |
| 界面 | 白底黑字，中 / 英 |

<a id="install"></a>

## 安装

### 1. GitHub Deploy Desk（推荐）

用 [GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer) 一键部署本仓库。

1. 取得部署器：https://github.com/axioxmedia/github-deployer
2. 把本仓库地址贴进 Deploy Desk。
3. 在应用内阅读说明后确认部署。

这是受支持的安装路径。下面的源码 / EXE 步骤只供本地已有检出时使用。

### 2. 源码运行或冻结 EXE

| 路径 | 命令 |
|---|---|
| 源码 | `start.bat` |
| EXE | `build_exe.bat` → `dist\IconCopyTable.exe` |
| PowerShell | `powershell -ExecutionPolicy Bypass -File .\build_exe.ps1` |

需要 Python 3.11+，并勾选 “Add python.exe to PATH”。

<a id="features"></a>

## 功能

| 功能 | 说明 |
|---|---|
| 字体选择 | 三个按钮：Solid、Regular、Brands Regular |
| 分页表 | 每页 24 / 48 / 72 / 96，不一次性铺开整表 |
| 复制 | 点击卡片复制专用区字符，而不是英文类名 |
| 搜索 | 按名称、标签、检索词或十六进制码位过滤当前家族 |
| 本地字体 | 内置 TTF，不走 CDN |
| 记忆 | 上次家族、每页数量、检索词与界面语言会保留 |

<a id="requirements"></a>

## 环境

| | 最低 | 建议 |
|---|---|---|
| 系统 | Windows 10 | Windows 11 |
| Python | 3.11 | 3.12 |
| 分辨率 | 1280×720 | 1280×860 |

<a id="architecture"></a>

## 结构

FastAPI 提供 `/api/icons` 分页与三套 TTF。向导页访问 `127.0.0.1`。pywebview 包成窗口。PyInstaller 打成无控制台单文件 EXE。

```
向导界面  →  FastAPI 127.0.0.1  →  static/data/*.json + static/fonts/*.ttf
                                →  pywebview 窗口 / IconCopyTable.exe
```

<a id="documentation"></a>

## 问答

<details>
<summary>如何贴进 Unreal Engine？</summary>

选好字体，打开复制表，点击卡片，再到 Unreal Text 字段粘贴。不要手打 `fa-skull` 这类英文名。

</details>

<details>
<summary>为什么 Regular 和 Brands 比 Solid 少？</summary>

Font Awesome Free 的 Solid 最全，Regular 是较小的线框子集，Brands Regular 是独立的品牌集。软件只列出当前字体里实际存在的字形。

</details>

Packed via Axiox Media · [axiox.media](https://axiox.media)
