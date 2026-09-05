#!/usr/bin/env python3
"""Minimal public status page for Filo worker (token in URL path)."""
from __future__ import annotations

import html
import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("FILO_STATUS_TOKEN", "").strip()
HEALTH = "http://127.0.0.1:8080/health"
PORT = int(os.environ.get("FILO_STATUS_PORT", "9090"))


def fetch_health() -> tuple[int, dict | str]:
    try:
        with urllib.request.urlopen(HEALTH, timeout=3) as r:
            body = r.read().decode()
            return r.status, json.loads(body)
    except Exception as e:  # noqa: BLE001
        return 503, {"error": str(e), "healthy": False}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        return

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if not TOKEN or path != f"/s/{TOKEN}":
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"not found")
            return

        code, data = fetch_health()
        if not isinstance(data, dict):
            data = {"error": str(data), "healthy": False}

        healthy = data.get("healthy") is True
        ready = data.get("ready") is True
        worker = html.escape(str(data.get("worker", "?")))
        role = html.escape(str(data.get("role", "?")))
        sessions = data.get("sessions") if isinstance(data.get("sessions"), dict) else {}
        capacity = data.get("capacity") if isinstance(data.get("capacity"), dict) else {}
        jobs = data.get("jobs") if isinstance(data.get("jobs"), dict) else {}
        uptime = data.get("uptimeSeconds", "?")
        live = sessions.get("live", "?")
        tracked = sessions.get("tracked", "?")
        vmax = sessions.get("max", "?")
        free = sessions.get("free", "?")
        pending = jobs.get("pending", "?")
        stale = jobs.get("staleClaimed", "?")
        db = data.get("db")
        degraded = data.get("degraded")
        raw = html.escape(json.dumps(data, ensure_ascii=False, indent=2))

        page = f"""<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="10"/>
<title>Filo · {worker}</title>
<style>
body{{font-family:ui-sans-serif,system-ui,sans-serif;background:#0f1419;color:#e7ecf1;margin:0;padding:1.5rem}}
.wrap{{max-width:560px;margin:0 auto}}
.card{{border:1px solid #2a3340;border-radius:12px;padding:1.25rem 1.4rem;background:#161d26;margin-bottom:1rem}}
.ok{{color:#3dd68c}}.bad{{color:#ff6b6b}}.muted{{color:#8b98a8}}
h1{{font-size:1.15rem;margin:0 0 .5rem}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:.65rem .9rem;margin-top:.85rem}}
.k{{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:#8b98a8}}
.v{{font-size:.98rem;font-weight:600;margin-top:.15rem}}
code,pre{{font-family:ui-monospace,Menlo,Consolas,monospace}}
pre{{font-size:.72rem;overflow:auto;background:#0f1419;border:1px solid #2a3340;border-radius:8px;padding:.75rem;color:#a8b3c0}}
</style></head><body><div class="wrap">
<div class="card">
<h1>Filo gönderim sunucusu</h1>
<p class="{'ok' if healthy else 'bad'}">{'● Çalışıyor' if healthy else '● Kapalı / hata'}</p>
<p class="muted" style="font-size:.9rem">Worker <code>{worker}</code> · rol {role}</p>
<div class="grid">
<div><div class="k">Hazır</div><div class="v {'ok' if ready else 'bad'}">{'evet' if ready else 'hayır'}</div></div>
<div><div class="k">DB</div><div class="v">{'ok' if db else 'yok'}</div></div>
<div><div class="k">Canlı oturum</div><div class="v">{live} / {vmax}</div></div>
<div><div class="k">Takip / boş</div><div class="v">{tracked} · {free} boş</div></div>
<div><div class="k">Bekleyen job</div><div class="v">{pending}</div></div>
<div><div class="k">Stale claimed</div><div class="v">{stale}</div></div>
<div><div class="k">Uptime</div><div class="v">{uptime}s</div></div>
<div><div class="k">Degraded</div><div class="v">{'evet' if degraded else 'hayır'}</div></div>
</div>
</div>
<div class="card">
<div class="k" style="margin-bottom:.5rem">Ham health JSON</div>
<pre>{raw}</pre>
<p class="muted" style="font-size:.75rem;margin:.6rem 0 0">10 sn’de yenilenir · sadece durum; mesaj içeriği burada yok (panel Gidenler)</p>
</div>
</div></body></html>"""
        body = page.encode()
        self.send_response(200 if healthy else 503)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("FILO_STATUS_TOKEN gerekli")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
