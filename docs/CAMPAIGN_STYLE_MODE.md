# Creative Studio design styles — 13 October 2026

Working branch: `codex/campaign-style-mode`, based on `3e7d5bb`.

## Changes

- Content library has one `İçerik Oluştur` entry. Media type is the first decision in the existing wizard, with selected-state semantics and larger touch targets. Existing video deep links remain supported.
- Image direction uses exactly two choices: `Dengeli / Modern` and `Kampanya / Dikkat Çekici`. Video presets remain available. Campaign objectives show a recommendation without silently changing the selection.
- `styleMode` (`balanced_modern` / `campaign_bold`) travels through draft restoration, persistence, submission payload, AI planner, deterministic fallback, V3 brief, legacy image prompt and locked-copy V2 path. Missing/unknown values normalize to balanced for new submissions; old stored prompts without a mode keep their legacy compilation.
- Variation defaults to inheriting the authoritative parent mode. Explicit changes override it; selection persists under the tenant/creative draft key. Revision inherits the existing mode.
- Style changes request only scene suggestions and preserve manually edited scene/copy. Explicit design requests outrank style instructions, while factual and reference identity protections remain mandatory.
- Bold software campaigns permit a perspective mockup of the supplied authentic screenshot, not fabricated metrics, conversations or features. Physical products retain their canonical photograph; no fixed cafe/person or gold/3D template is imposed.
- Found and fixed legacy prompt omission of custom headline/supporting copy. Both now reach its literal-copy instructions.
- No database migration, provider switch, server restart, push, main merge or production deploy in this change.

## Main file groups

- Wizard/library/detail UI: `apps/customer/src/app/(panel)/icerik/` and library CTA CSS in `globals.css`.
- Payload/API: creative types, actions, variation context, draft adapter and `/api/ai-media/plan`.
- Compilation: shared `style-mode.ts`, planner/fallback, legacy prompt, V3 brief, V2 locked-copy builder and process wiring.
- Actual compiled developer examples: [CAMPAIGN_STYLE_MODE_PROMPTS.md](CAMPAIGN_STYLE_MODE_PROMPTS.md). Fixture only, not customer production evidence.

## Verification

- Final targeted regression: 39 tests passed, zero failed (styles, planner/fallback, restore, variation identity, copy fidelity and required references).
- Typecheck passed; final production webpack build passed (exit0), including all62 static pages. Diff whitespace check passed.
- Browser UI/mobile and real service image acceptance: NOT VERIFIED. Browser tool rejected access under its URL security policy. The visual concepts generated earlier are design references, not proof of this new wizard/service implementation.

## Remaining acceptance

1. Render library/wizard on desktop and mobile; verify one entry, media switching, two styles, draft refresh and review label.
2. Verify style switching preserves user copy/scene; variation inherit and explicit change survive refresh.
3. Generate representative balanced/bold media from the actual wizard, verify canonical assets and literal text, archive/download and campaign handoff. Do not label commercial quality PASS from prompt tests alone.
4. Push/release only after the remaining acceptance and the applicable release authorization are resolved.
