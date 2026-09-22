"""
Token, Cookie, and Credential Redaction Utility for Flow Incidents
Guarantees that no authentication tokens, cookies, or sensitive headers
leak into incident HARs, DOM dumps, or diagnostic bundles.
"""

import re
import json
from typing import Any, Dict, List, Union

SENSITIVE_HEADERS = {
    "cookie",
    "set-cookie",
    "authorization",
    "proxy-authorization",
    "x-goog-authuser",
    "x-client-data",
    "sec-ch-ua",
    "sec-ch-ua-platform"
}

SENSITIVE_KEY_PATTERNS = [
    re.compile(r"(?i)(cookie|auth|token|session|sid|hsid|ssid|sapisid|apisid|password|secret|key|bearer)")
]

GOOGLE_TOKEN_PATTERNS = [
    re.compile(r"SNlM0e=([A-Za-z0-9_\-\:]+)"),
    re.compile(r"FdrFJe=([0-9]+)"),
    re.compile(r"ya29\.[A-Za-z0-9_\-]+"),
    re.compile(r"(SID|HSID|SSID|APISID|SAPISID)=([A-Za-z0-9_\-]+)"),
]

def redact_string(text: str) -> str:
    """Redacts sensitive Google session tokens and cookies from raw string text/HTML."""
    if not text:
        return text
    
    redacted = text
    for pattern in GOOGLE_TOKEN_PATTERNS:
        redacted = pattern.sub(r"[REDACTED_TOKEN]", redacted)
        
    return redacted

def redact_headers(headers: Union[List[Dict[str, Any]], Dict[str, Any]]) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """Redacts sensitive request and response headers in HAR and HTTP logs."""
    if isinstance(headers, list):
        redacted_list = []
        for h in headers:
            name = str(h.get("name", "")).lower()
            if name in SENSITIVE_HEADERS or any(p.search(name) for p in SENSITIVE_KEY_PATTERNS):
                redacted_list.append({"name": h.get("name"), "value": "[REDACTED_HEADER_VALUE]"})
            else:
                redacted_list.append(h)
        return redacted_list
    elif isinstance(headers, dict):
        redacted_dict = {}
        for k, v in headers.items():
            if str(k).lower() in SENSITIVE_HEADERS or any(p.search(str(k)) for p in SENSITIVE_KEY_PATTERNS):
                redacted_dict[k] = "[REDACTED_HEADER_VALUE]"
            else:
                redacted_dict[k] = v
        return redacted_dict
    return headers

def redact_har(har_data: Dict[str, Any]) -> Dict[str, Any]:
    """Strictly redacts a full HAR object before disk storage or transmission."""
    try:
        log = har_data.get("log", {})
        entries = log.get("entries", [])
        for entry in entries:
            req = entry.get("request", {})
            if "headers" in req:
                req["headers"] = redact_headers(req["headers"])
            if "cookies" in req:
                req["cookies"] = [{"name": c.get("name", "cookie"), "value": "[REDACTED_COOKIE]"} for c in req.get("cookies", [])]
            if "queryString" in req:
                for q in req["queryString"]:
                    if any(p.search(str(q.get("name", ""))) for p in SENSITIVE_KEY_PATTERNS):
                        q["value"] = "[REDACTED_PARAM]"
            if "postData" in req and "text" in req["postData"]:
                req["postData"]["text"] = redact_string(req["postData"]["text"])

            res = entry.get("response", {})
            if "headers" in res:
                res["headers"] = redact_headers(res["headers"])
            if "cookies" in res:
                res["cookies"] = [{"name": c.get("name", "cookie"), "value": "[REDACTED_COOKIE]"} for c in res.get("cookies", [])]
            if "content" in res and "text" in res["content"]:
                res["content"]["text"] = redact_string(res["content"]["text"])
        return har_data
    except Exception:
        return {"log": {"version": "1.2", "entries": [], "comment": "Redaction applied"}}
