#!/usr/bin/env python3
"""Minimal public status page for Filo worker (token in URL path)."""
from __future__ import annotations

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
        healthy = isinstance(data, dict) and data.get("healthy") is True
        worker = data.get("worker") if isinstance(data, dict) else "?"
        sessions = data.get("sessions") if isinstance(data, dict) else {}
        html = f"""<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="15"/>
<title>Filo worker</title>
<style>
body{{font-family:system-ui,sans-serif;background:#0f1419;color:#e7ecf1;margin:0;padding:2rem}}
.card{{max-width:420px;margin:0 auto;border:1px solid #2a3340;border-radius:12px;padding:1.25rem 1.5rem;background:#161d26}}
.ok{{color:#3dd68c}}.bad{{color:#ff6b6b}}
h1{{font-size:1.1rem;margin:0 0 .75rem}}
p{{margin:.35rem 0;font-size:.95rem;color:#a8b3c0}}
code{{color:#e7ecf1}}
</style></head><body>
<div class="card">
<h1>Filo gönderim sunucusu</h1>
<p class="{'ok' if healthy else 'bad'}">{'Çalışıyor' if healthy else 'Kapalı / hata'}</p>
<p>Worker: <code>{worker}</code></p>
<p>Oturum: <code>{sessions.get('live', '?')}/{sessions.get('max', '?')}</code></p>
<p style="font-size:.8rem;opacity:.7">15 sn’de bir yenilenir · Hetzner</p>
</div></body></html>"""
        raw = html.encode()
        self.send_response(200 if healthy else 503)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("FILO_STATUS_TOKEN gerekli")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
