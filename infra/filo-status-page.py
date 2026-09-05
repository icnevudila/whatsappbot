#!/usr/bin/env python3
"""
Filo ops status — şifreli giriş + hat/telefon mesaj özeti.
URL: http://IP:9090/s/<TOKEN>/
"""
from __future__ import annotations

import hashlib
import hmac
import html
import json
import os
import secrets
import time
import urllib.parse
import urllib.request
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOKEN = os.environ.get("FILO_STATUS_TOKEN", "").strip()
USER = os.environ.get("FILO_STATUS_USER", "filo").strip() or "filo"
PASSWORD = os.environ.get("FILO_STATUS_PASSWORD", "").strip()
SECRET = os.environ.get("FILO_STATUS_SECRET", "").strip() or PASSWORD or "change-me"
HEALTH = "http://127.0.0.1:8080/health"
PORT = int(os.environ.get("FILO_STATUS_PORT", "9090"))
ENV_FILE = os.environ.get(
    "FILO_ENV_FILE",
    "/opt/whatsappbot/apps/wa-service/.env",
)
SESSION_TTL = 12 * 3600


def load_database_url() -> str | None:
    override = os.environ.get("DATABASE_URL", "").strip()
    if override:
        return override
    path = Path(ENV_FILE)
    if not path.is_file():
        return None
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def fetch_health() -> dict:
    try:
        with urllib.request.urlopen(HEALTH, timeout=3) as r:
            return json.loads(r.read().decode())
    except Exception as e:  # noqa: BLE001
        return {"healthy": False, "error": str(e)}


def sign_session(exp: int) -> str:
    payload = f"{USER}:{exp}"
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def valid_session(raw: str | None) -> bool:
    if not raw:
        return False
    parts = raw.split(":")
    if len(parts) != 3:
        return False
    user, exp_s, sig = parts
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    if user != USER or exp < int(time.time()):
        return False
    expect = hmac.new(
        SECRET.encode(),
        f"{user}:{exp}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expect, sig)


def query_messages(limit: int = 40) -> tuple[list[dict], str | None]:
    url = load_database_url()
    if not url:
        return [], "DATABASE_URL yok"
    try:
        import psycopg  # type: ignore
    except ImportError:
        try:
            import psycopg2 as psycopg  # type: ignore
        except ImportError:
            return [], "psycopg kurulu değil"

    sql = """
      select
        m.created_at,
        m.direction,
        m.status,
        m.message_type,
        m.phone_e164,
        left(coalesce(m.body, ''), 120) as body,
        case when m.media_url is not null then true else false end as has_media,
        a.label as account_label,
        a.phone_e164 as account_phone,
        sl.holder_id as worker_id
      from public.message_log m
      left join public.accounts a on a.id = m.account_id
      left join wa.session_lease sl on sl.account_id = m.account_id
      order by m.created_at desc
      limit %s
    """
    try:
        # psycopg3
        if hasattr(psycopg, "connect"):
            with psycopg.connect(url, connect_timeout=8) as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (limit,))
                    cols = [d[0] for d in cur.description]
                    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
                    return rows, None
        return [], "psycopg API bilinmiyor"
    except Exception as e:  # noqa: BLE001
        return [], str(e)


CSS = """
body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0f1419;color:#e7ecf1;margin:0;padding:1.25rem}
.wrap{max-width:920px;margin:0 auto}
.card{border:1px solid #2a3340;border-radius:12px;padding:1.1rem 1.25rem;background:#161d26;margin-bottom:1rem}
.ok{color:#3dd68c}.bad{color:#ff6b6b}.muted{color:#8b98a8}
h1{font-size:1.15rem;margin:0 0 .5rem}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem}
@media(max-width:720px){.grid{grid-template-columns:1fr 1fr}}
.k{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:#8b98a8}
.v{font-size:.95rem;font-weight:600;margin-top:.12rem}
table{width:100%;border-collapse:collapse;font-size:.82rem}
th,td{text-align:left;padding:.45rem .35rem;border-bottom:1px solid #2a3340;vertical-align:top}
th{color:#8b98a8;font-weight:500;font-size:.7rem;text-transform:uppercase}
input{width:100%;box-sizing:border-box;padding:.65rem .75rem;border-radius:8px;border:1px solid #2a3340;background:#0f1419;color:#e7ecf1;margin:.35rem 0 0}
button{margin-top:.85rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer}
.tag{display:inline-block;padding:.1rem .4rem;border-radius:6px;font-size:.7rem;border:1px solid #2a3340}
.in{color:#60a5fa}.out{color:#3dd68c}
a{color:#93c5fd}
"""


def login_page(err: str = "") -> bytes:
    msg = f'<p class="bad">{html.escape(err)}</p>' if err else ""
    page = f"""<!doctype html><html lang="tr"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Filo ops giriş</title><style>{CSS}</style></head><body><div class="wrap">
<div class="card" style="max-width:380px;margin:3rem auto">
<h1>Filo ops</h1>
<p class="muted">Şifreli izleme — hat / telefon / mesaj özeti</p>
{msg}
<form method="post" action="">
<label class="k">Kullanıcı</label>
<input name="user" autocomplete="username" required value="{html.escape(USER)}"/>
<label class="k">Şifre</label>
<input name="password" type="password" autocomplete="current-password" required/>
<button type="submit">Giriş</button>
</form>
</div></div></body></html>"""
    return page.encode()


def dashboard_page(health: dict, rows: list[dict], db_err: str | None) -> bytes:
    healthy = health.get("healthy") is True
    worker = html.escape(str(health.get("worker", "?")))
    sessions = health.get("sessions") if isinstance(health.get("sessions"), dict) else {}
    jobs = health.get("jobs") if isinstance(health.get("jobs"), dict) else {}

    trs = []
    for r in rows:
        direction = r.get("direction") or "?"
        dir_cls = "in" if direction == "in" else "out"
        dir_label = "Gelen" if direction == "in" else "Giden"
        when = r.get("created_at")
        when_s = when.strftime("%d.%m %H:%M:%S") if hasattr(when, "strftime") else str(when)[:19]
        acc = html.escape(str(r.get("account_label") or r.get("account_phone") or "—"))
        phone = html.escape(str(r.get("phone_e164") or "—"))
        body = html.escape(str(r.get("body") or ""))
        if r.get("has_media"):
            body = (body + " ").strip() + "📎"
        status = html.escape(str(r.get("status") or ""))
        mtype = html.escape(str(r.get("message_type") or ""))
        wid = html.escape(str(r.get("worker_id") or "—"))
        trs.append(
            f"<tr><td>{html.escape(when_s)}</td>"
            f'<td class="{dir_cls}">{dir_label}</td>'
            f"<td>{acc}<div class='muted' style='font-size:.72rem'>{wid}</div></td>"
            f"<td><code>{phone}</code></td>"
            f"<td>{mtype} · {status}</td>"
            f"<td>{body}</td></tr>"
        )
    table = (
        "<table><thead><tr>"
        "<th>Zaman</th><th>Yön</th><th>Hat</th><th>Telefon</th><th>Durum</th><th>Özet</th>"
        "</tr></thead><tbody>"
        + ("".join(trs) if trs else "<tr><td colspan='6' class='muted'>Kayıt yok</td></tr>")
        + "</tbody></table>"
    )
    err_html = f'<p class="bad">DB: {html.escape(db_err)}</p>' if db_err else ""

    page = f"""<!doctype html><html lang="tr"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="20"/>
<title>Filo ops · {worker}</title><style>{CSS}</style></head><body><div class="wrap">
<div class="card">
<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">
<div>
<h1>Filo ops</h1>
<p class="{'ok' if healthy else 'bad'}">{'● Çalışıyor' if healthy else '● Kapalı'}</p>
<p class="muted">Worker <code>{worker}</code></p>
</div>
<form method="post" action="?logout=1"><button type="submit" style="width:auto;background:#2a3340">Çıkış</button></form>
</div>
<div class="grid" style="margin-top:1rem">
<div><div class="k">Canlı oturum</div><div class="v">{sessions.get('live','?')} / {sessions.get('max','?')}</div></div>
<div><div class="k">Bekleyen job</div><div class="v">{jobs.get('pending','?')}</div></div>
<div><div class="k">DB</div><div class="v">{'ok' if health.get('db') else 'yok'}</div></div>
<div><div class="k">Uptime</div><div class="v">{health.get('uptimeSeconds','?')}s</div></div>
</div>
</div>
<div class="card">
<div class="k" style="margin-bottom:.65rem">Son mesajlar — hangi hat · nereye/kimden</div>
{err_html}
{table}
<p class="muted" style="font-size:.75rem;margin-top:.75rem">20 sn yenilenir · şifreli oturum · HTTP (ileride HTTPS eklenir)</p>
</div>
</div></body></html>"""
    return page.encode()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        return

    def _base(self) -> str:
        return f"/s/{TOKEN}"

    def _read_body(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n > 0 else b""

    def _cookie_session(self) -> str | None:
        raw = self.headers.get("Cookie")
        if not raw:
            return None
        jar = SimpleCookie()
        jar.load(raw)
        morsel = jar.get("filo_ops")
        return morsel.value if morsel else None

    def _send(self, code: int, body: bytes, headers: list[tuple[str, str]] | None = None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if headers:
            for k, v in headers:
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _path(self) -> str:
        return urllib.parse.urlparse(self.path).path.rstrip("/") or "/"

    def do_GET(self) -> None:  # noqa: N802
        if not TOKEN or not PASSWORD:
            self._send(503, b"status page not configured")
            return
        path = self._path()
        base = self._base()
        if path != base and not path.startswith(base + "/"):
            self._send(404, b"not found")
            return

        if not valid_session(self._cookie_session()):
            self._send(200, login_page())
            return

        health = fetch_health()
        rows, err = query_messages()
        self._send(200, dashboard_page(health, rows, err))

    def do_POST(self) -> None:  # noqa: N802
        if not TOKEN or not PASSWORD:
            self._send(503, b"status page not configured")
            return
        path = self._path()
        base = self._base()
        if path != base and not path.startswith(base + "/"):
            self._send(404, b"not found")
            return

        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if qs.get("logout"):
            self._send(
                302,
                b"",
                [
                    ("Location", base),
                    ("Set-Cookie", "filo_ops=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict"),
                ],
            )
            return

        form = urllib.parse.parse_qs(self._read_body().decode("utf-8", errors="replace"))
        user = (form.get("user") or [""])[0]
        password = (form.get("password") or [""])[0]
        if not (
            secrets.compare_digest(user, USER)
            and secrets.compare_digest(password, PASSWORD)
        ):
            self._send(401, login_page("Kullanıcı veya şifre hatalı"))
            return

        exp = int(time.time()) + SESSION_TTL
        cookie = (
            f"filo_ops={sign_session(exp)}; Path=/; Max-Age={SESSION_TTL}; "
            "HttpOnly; SameSite=Strict"
        )
        self._send(302, b"", [("Location", base), ("Set-Cookie", cookie)])


if __name__ == "__main__":
    if not TOKEN or not PASSWORD:
        raise SystemExit("FILO_STATUS_TOKEN ve FILO_STATUS_PASSWORD gerekli")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
