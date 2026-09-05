#!/usr/bin/env python3
"""Filo ops HTTPS reverse proxy (self-signed) -> 127.0.0.1:9090"""
from __future__ import annotations

import http.client
import os
import ssl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UPSTREAM_HOST = "127.0.0.1"
UPSTREAM_PORT = int(os.environ.get("FILO_STATUS_PORT", "9090"))
LISTEN_PORT = int(os.environ.get("FILO_OPS_HTTPS_PORT", "9443"))
CERT = os.environ.get("FILO_OPS_CERT", "/etc/filo-ops/cert.pem")
KEY = os.environ.get("FILO_OPS_KEY", "/etc/filo-ops/key.pem")


class Proxy(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        return

    def _proxy(self) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        conn = http.client.HTTPConnection(UPSTREAM_HOST, UPSTREAM_PORT, timeout=30)
        headers = {k: v for k, v in self.headers.items() if k.lower() != "host"}
        try:
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()
            data = resp.read()
            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() in {"transfer-encoding", "connection"}:
                    continue
                self.send_header(k, v)
            self.send_header("Strict-Transport-Security", "max-age=86400")
            self.end_headers()
            self.wfile.write(data)
        finally:
            conn.close()

    def do_GET(self) -> None:  # noqa: N802
        self._proxy()

    def do_POST(self) -> None:  # noqa: N802
        self._proxy()

    def do_HEAD(self) -> None:  # noqa: N802
        self._proxy()


if __name__ == "__main__":
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT, KEY)
    server = ThreadingHTTPServer(("0.0.0.0", LISTEN_PORT), Proxy)
    server.socket = ctx.wrap_socket(server.socket, server_side=True)
    server.serve_forever()
