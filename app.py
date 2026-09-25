"""Icon Copy Table — paged Font Awesome Free glyph picker."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from axioxmedia import (
    AIO_BRAND,
    AIO_SOFTWARE_NAME_EN,
    AIO_SOFTWARE_NAME_ZH,
    aio_logo_png,
    aio_watermark,
    apply_hwnd_icon,
    axiox_window_title,
)
from utm_beacon import schedule_utm_beacon

APP_VERSION = "1.2.1"
PRODUCT_EN = AIO_SOFTWARE_NAME_EN
PRODUCT_ZH = AIO_SOFTWARE_NAME_ZH
FAMILIES = ("solid", "regular", "brands")
PAGE_SIZE_DEFAULT = 48
PAGE_SIZES = (24, 48, 72, 96)


def app_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


ROOT = app_root()
STATIC = ROOT / "static"
DATA = STATIC / "data"
FONTS = STATIC / "fonts"

app = FastAPI(title=PRODUCT_ZH, version=APP_VERSION)
app.mount("/assets", StaticFiles(directory=STATIC), name="assets")


def runtime_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


LOG_FILE = runtime_dir() / "icon_copy_table.log"
PREFS_FILE = runtime_dir() / "icon-copy-table-prefs.json"

_CATALOG: dict[str, list[dict[str, Any]]] = {}


def write_log(message: str) -> None:
    try:
        with LOG_FILE.open("a", encoding="utf-8") as fh:
            fh.write(message.rstrip() + "\n")
    except OSError:
        pass


def load_catalog(family: str) -> list[dict[str, Any]]:
    if family not in FAMILIES:
        raise HTTPException(400, "unknown family")
    if family in _CATALOG:
        return _CATALOG[family]
    path = DATA / f"{family}.json"
    if not path.exists():
        raise HTTPException(500, f"catalog missing: {family}")
    rows = json.loads(path.read_text(encoding="utf-8"))
    _CATALOG[family] = rows
    return rows


def default_prefs() -> dict[str, Any]:
    return {
        "family": "solid",
        "page_size": PAGE_SIZE_DEFAULT,
        "remember": True,
        "last_query": "",
        "theme": "light",
    }


def read_prefs() -> dict[str, Any]:
    data = default_prefs()
    if PREFS_FILE.exists():
        try:
            raw = json.loads(PREFS_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                data.update(raw)
        except (OSError, json.JSONDecodeError):
            pass
    if data.get("family") not in FAMILIES:
        data["family"] = "solid"
    try:
        size = int(data.get("page_size") or PAGE_SIZE_DEFAULT)
    except (TypeError, ValueError):
        size = PAGE_SIZE_DEFAULT
    if size not in PAGE_SIZES:
        size = PAGE_SIZE_DEFAULT
    data["page_size"] = size
    data["remember"] = bool(data.get("remember", True))
    data["last_query"] = str(data.get("last_query") or "")
    data["theme"] = "gold" if data.get("theme") == "gold" else "light"
    return data


def write_prefs(payload: dict[str, Any]) -> dict[str, Any]:
    data = read_prefs()
    data.update(payload)
    if data.get("family") not in FAMILIES:
        data["family"] = "solid"
    try:
        size = int(data.get("page_size") or PAGE_SIZE_DEFAULT)
    except (TypeError, ValueError):
        size = PAGE_SIZE_DEFAULT
    if size not in PAGE_SIZES:
        size = PAGE_SIZE_DEFAULT
    data["page_size"] = size
    data["remember"] = bool(data.get("remember", True))
    data["last_query"] = str(data.get("last_query") or "")[:80]
    data["theme"] = "gold" if data.get("theme") == "gold" else "light"
    PREFS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data


class PrefsBody(BaseModel):
    family: str | None = None
    page_size: int | None = Field(default=None, ge=1, le=200)
    remember: bool | None = None
    last_query: str | None = None
    theme: str | None = None


@app.get("/api/defaults")
def api_defaults() -> dict[str, Any]:
    prefs = read_prefs()
    counts = {fam: len(load_catalog(fam)) for fam in FAMILIES}
    return {
        "version": APP_VERSION,
        "brand": AIO_BRAND,
        "product_zh": PRODUCT_ZH,
        "product_en": PRODUCT_EN,
        "watermark": aio_watermark(),
        "families": [
            {"id": "solid", "label": "Solid", "count": counts["solid"]},
            {"id": "regular", "label": "Regular", "count": counts["regular"]},
            {"id": "brands", "label": "Brands Regular", "count": counts["brands"]},
        ],
        "page_sizes": list(PAGE_SIZES),
        "prefs": prefs,
    }


@app.get("/api/prefs")
def api_prefs_get() -> dict[str, Any]:
    return read_prefs()


@app.post("/api/prefs")
def api_prefs_post(body: PrefsBody) -> dict[str, Any]:
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    return write_prefs(payload)


@app.get("/api/families")
def api_families() -> list[dict[str, Any]]:
    return [
        {
            "id": fam,
            "label": "Brands Regular" if fam == "brands" else fam.title(),
            "count": len(load_catalog(fam)),
        }
        for fam in FAMILIES
    ]


@app.get("/api/icons")
def api_icons(
    family: str = Query("solid"),
    q: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, ge=1, le=200),
) -> dict[str, Any]:
    rows = load_catalog(family)
    needle = (q or "").strip().lower()
    if needle:
        filtered = []
        for item in rows:
            hay = " ".join(
                [
                    item.get("n") or "",
                    item.get("u") or "",
                    item.get("l") or "",
                    " ".join(item.get("t") or []),
                ]
            ).lower()
            if needle in hay:
                filtered.append(item)
        rows = filtered
    total = len(rows)
    size = page_size if page_size in PAGE_SIZES else PAGE_SIZE_DEFAULT
    pages = max(1, (total + size - 1) // size) if total else 1
    if page > pages:
        page = pages
    start = (page - 1) * size
    slice_rows = rows[start : start + size]
    items = [{"n": r["n"], "u": r["u"], "l": r.get("l") or r["n"]} for r in slice_rows]
    return {
        "family": family,
        "q": q,
        "page": page,
        "page_size": size,
        "pages": pages,
        "total": total,
        "items": items,
    }


@app.get("/fonts/{family}.ttf")
def api_font(family: str) -> FileResponse:
    if family not in FAMILIES:
        raise HTTPException(404, "unknown family")
    path = FONTS / f"{family}.ttf"
    if not path.exists():
        raise HTTPException(404, "font missing")
    return FileResponse(path, media_type="font/ttf", filename=f"{family}.ttf")


@app.get("/brand/logo.png")
def brand_logo() -> Response:
    return Response(content=aio_logo_png(), media_type="image/png")


@app.get("/favicon.ico")
def brand_favicon() -> Response:
    return Response(content=aio_logo_png(), media_type="image/png")


@app.get("/")
def index_page() -> FileResponse:
    return FileResponse(STATIC / "index.html")


def show_error(message: str) -> None:
    write_log(message)
    if os.name == "nt":
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, message, PRODUCT_EN, 0x10)
            return
        except Exception:
            pass
    print(message, file=sys.stderr)


def _free_port(preferred: int = 8787) -> int:
    import socket

    for port in (preferred, 8788, 8789, 8790, 0):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("127.0.0.1", port))
            chosen = int(sock.getsockname()[1])
        except OSError:
            chosen = -1
        finally:
            sock.close()
        if chosen > 0:
            return chosen
    raise RuntimeError("没有可用的本地端口")


def ensure_stdio() -> None:
    if sys.stdout is None:
        sys.stdout = LOG_FILE.open("a", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = LOG_FILE.open("a", encoding="utf-8")


def run_server(host: str, port: int, reload: bool = False) -> None:
    import uvicorn

    ensure_stdio()
    if reload:
        uvicorn.run(app, host=host, port=port, reload=True, log_level="warning", log_config=None)
        return
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="warning",
        log_config=None,
        lifespan="on",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = False
    server.run()


def wait_ready(url: str, server_error: list[str], timeout: float = 30.0) -> None:
    import time

    deadline = time.time() + timeout
    while time.time() < deadline:
        if server_error:
            raise RuntimeError(server_error[0])
        try:
            with httpx.Client(timeout=0.8, trust_env=False) as http:
                if http.get(url).status_code < 500:
                    return
        except httpx.HTTPError:
            time.sleep(0.2)
    extra = f"\n服务线程错误：{server_error[0]}" if server_error else ""
    raise RuntimeError(f"本地服务启动超时：{url}{extra}\n日志：{LOG_FILE}")


def run_desktop() -> None:
    import threading
    import traceback
    import webbrowser

    write_log(f"start frozen={getattr(sys, 'frozen', False)} meipass={getattr(sys, '_MEIPASS', '')}")
    write_log(f"static={STATIC} exists={STATIC.exists()}")

    port = _free_port()
    url = f"http://127.0.0.1:{port}"
    write_log(f"bind {url}")
    server_error: list[str] = []

    def _serve() -> None:
        try:
            run_server("127.0.0.1", port, reload=False)
        except Exception:
            server_error.append(traceback.format_exc())
            write_log(server_error[-1])

    thread = threading.Thread(target=_serve, name="uvicorn", daemon=True)
    thread.start()
    wait_ready(f"{url}/api/defaults", server_error)
    schedule_utm_beacon(product_en=PRODUCT_EN, version=APP_VERSION, log=write_log)

    try:
        import webview

        window = webview.create_window(
            title=axiox_window_title(),
            url=url,
            width=1280,
            height=860,
            min_size=(900, 640),
            background_color="#ffffff",
        )

        def paint_chrome(_=None) -> None:
            if os.name != "nt":
                return
            try:
                hwnd = int(window.native.Handle.ToInt32())
                apply_hwnd_icon(hwnd)
            except Exception as exc:
                write_log(f"icon skipped: {exc}")

        try:
            window.events.shown += paint_chrome
        except Exception:
            pass
        webview.start()
    except Exception as exc:
        write_log(f"webview failed: {exc}")
        webbrowser.open(url)
        thread.join()


if __name__ == "__main__":
    import multiprocessing

    multiprocessing.freeze_support()
    if "--serve" in sys.argv:
        port = _free_port()
        run_server("127.0.0.1", port, reload=False)
    else:
        run_desktop()
