# Mesajify service naming

The public/operator-facing display name is now consistent while technical
container names stay stable for backwards-compatible Docker, DNS, and runbook
references.

| Technical service | Display name | Role |
|---|---|---|
| `wa-service` | `Mesajify · WhatsApp` | WhatsApp worker and line sessions |
| `ai-media-control` | `Mesajify · AI Video Control` | Job lifecycle, provider routing, QA |
| `gflow-engine` | `Mesajify · Google Flow` | Flow browser/provider worker |
| `omnistudio-engine` | `Mesajify · Görsel & Post-Production` | Image, browser gateway, post-production |
| `hetzner-caddy` | `Mesajify · Edge Proxy` | TLS and public ingress |

Docker labels use `com.mesajify.service.display_name` and
`com.mesajify.service.role`. The runtime container identifiers are deliberately
not renamed in this pass because operational scripts, internal DNS, health
checks, and browser-worker tooling still reference them.
