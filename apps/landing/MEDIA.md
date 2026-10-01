# Mesajify Visual Lab V2

Preview: `/visual-lab` on the landing development server. Production renders 404 here. The existing landing, app/customer and panel were not edited.

## Review environment

Filters: Signature, Product, Infrastructure, Brand, Bento. Controls: light/dark canvas, motion pause, explanatory text visibility. Status selectors: DRAFT, REVIEW, APPROVED. All start at REVIEW; changing them is local review state, never publication.

## Existing modules upgraded

01: open journey, one continuous SVG path and physically positioned signal, unequal object hierarchy, vertical mobile layout and scrub control.
02: queue, central routing core, four curved routes and load meters. Hat 03 closes at five seconds; the capsule takes an alternate path toward Hat 02. It returns at ten seconds. Counts remain labeled examples.
03: floating file, scanning rows, resolved list. Runs once in view; replay is available. Phone numbers stay masked.
04: real Bofe source photo, product mask, cinematic background, 9:16 crop frame and video reveal.
05: measured desktop phone 340 px / real Inbox 660 px. Delivery, typing, reply, gap-sized travel, row activation and labeled example reply overlay. The real screenshot file is unchanged.
06: compact builder with fields, line selection and preparation feedback; no API call or sending.
07: large sector phone, desktop vertical/mobile horizontal navigation, fading video before source change and typing/reply reset.
08: inner line ring, outer twelve-customer ring, outgoing and stronger incoming pulses.
09: 1.04 screenshot zoom and masked focus on four inspected regions. The supplied screenshot has no line-information region, so the fourth region is accurately called Yanıt geçmişi.
10: maximum-width real browser screen, mask/crossfade and delayed annotation.
11-12: four brand signal variants and two-second demo ticker beats.
13-16: fan-out routing, photo/video, scanner and three-line inbox convergence.
17: floating photo/video/reply in dark negative space on one flowing path.

## Replacing media

Sources and posters live in `src/content/media-manifest.ts`. Generation specifications are in `src/content/generation-prompts.ts`; they do not certify provider provenance. Unavailable media uses a branded fallback.

`public/landing/studio/product-source-raw.jpg` is the existing `bofe_input_raw.jpg`, visually checked against the Bofe advertisement. The previous perfume photo did not match product.mp4 and is no longer used in these modules.

Sector videos: ecommerce/automotive/realestate/clinic/restaurant/service-flow-veo.mp4. Corresponding `*-flow-veo-poster.jpg` files are actual frames extracted at 0.5 seconds. The local-business manifest ID maps to service-flow-veo.mp4 and is labeled Hizmet because the asset shows business services rather than a bakery.

## Validation and limits

TypeScript and optimized production builds pass. Browser inspection covered desktop and 390 px mobile layouts, filters, sector video changes, real report screen switching, screenshot hotspot focus and local builder preparation feedback. Mobile document width stayed within the viewport; inspected images loaded without broken sources. The production page contains the 404 response rather than the review shell.

Native CSS/SVG only; no new dependencies or third-party component code. Existing React/Next/Tailwind use MIT licenses. Scene clocks update four times per second only while visible, unpaused and in a visible document. Validation and sector conversations stop after one sequence. Offscreen CSS motion and video pause via IntersectionObserver. Video uses preload none, muted inline playback and native controls. Reduced motion displays final states and avoids automatic video playback; the user's preference was not forcibly changed. No canvas, WebGL or requestAnimationFrame loop. FPS/Lighthouse were not measured.

Final clean-load browser check: no new console errors after SVG coordinate precision was fixed. Global pause stopped all four Signature videos and set scene running=false.

## Landing integration — 2026-09-30
The six primary V2 product stories are now used on the home page: campaign journey, creative transformation, sector examples, validation/routing, reply to inbox and real product explorer. Existing hero, lead scraper, infrastructure, FAQ, CTA and footer remain. Removed duplicate page navbar; layout owns navigation. Shared canvas styles now cover both review and landing wrappers. Production build passed; browser checks found six sections, one navbar and no horizontal overflow at 1440px and 390px. Automotive selection changed the actual video. This is a local implementation; no deployment or paid generation was performed.

## V3 composition pass — 2026-09-30
Recomposed existing components only. Hero is now 48/52 copy and Bofe photo/ad/reply/Inbox, with the dashboard behind as secondary proof. Campaign journey uses a 300px creative and larger reply/Inbox objects with scroll signal. Creative uses scroll-driven source/process/output emphasis. Sector Lab starts with Bofe and changes sector video/message/reply together. Removed the intervening lead-scraper section from the landing narrative; its source remains. Validation excludes the rejected row and passes completion to the same three-person Bofe queue. Reply uses a 350px phone and 700px real Inbox. Explorer initially continues into Inbox, with the requested five tabs. Existing Bento now renders four functioning micro demos; product facts are inside that existing section.
Upcoming /media paths are metadata only; no files or generation were fabricated. Failed/unavailable video renders its poster; pending labels are visible only in Visual Lab. Browser checks confirmed desktop and 390px contained layout, scanner completion (4 scanned / 3 clean / 3 queued), sector media/message/reply changes, and Raporlar screenshot switching with internal mobile horizontal scrolling. Full-page screenshot captured and inspected at 25 percent. Visual review is subjective, not a performance benchmark. No deployment or paid generation.
Evidence: landing-v3-full.png and landing-v3-25.png in the current thread visualization directory.

## Finalization — 30 Eylül 2026
Resmî marka, son kopya, hero olay sırası, config-driven sektör ve gerçek ekran odakları tamamlandı. Build ve altı responsive genişlik yerelde doğrulandı. Signature V3 sekiz lab önizlemesi REVIEW; final medya slotları pending. Ayrıntılı ölçüm sınırları ve kanıtlar: docs/FINALIZATION-REPORT.md. Aktif dosyaların byte/SHA-256/ffprobe kaydı: docs/ASSET-VERIFICATION.json. Eksik aktif dosya/poster build öncesi hata verir.

## 1 October 2026 — narrative correction
Product Explorer now includes six real-screen tabs. Creative preparation uses existing shot-8.png (brand kit and campaign image screen). Existing videos remain in place; no new media was generated. Asset verification reports 27 active assets and seven pending final slots. See docs/NARRATIVE-CORRECTION.md.
