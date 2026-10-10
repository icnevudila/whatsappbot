/** Only shipped decorative assets; never tenant media or arbitrary JSON. */
const PUBLIC_ANIMATION_PATHS = new Set([
  '/animations/image/product-upload.json','/animations/image/image-scan.json',
  '/animations/image/creative-design.json','/animations/image/image-render.json','/animations/image/image-success.json',
  '/animations/video/storyboard.json','/animations/video/reference-attach.json','/animations/video/camera-motion.json',
  '/animations/video/video-render.json','/animations/video/timeline-edit.json','/animations/video/video-success.json',
  '/animations/shared/loading.json','/animations/shared/warning.json','/animations/runtime/dotlottie-player.wasm',
  ...['blocks-scale','pulse-rings-2','clock','blocks-wave','blocks-shuffle-3','bars-scale','12-dots-scale-rotate','3-dots-fade'].map(name => `/animations/svg-spinners/${name}.svg`),
  ...['clipboard-check','clock-3','images','image','clapperboard','sliders-horizontal','scan-line','circle-check','circle-alert','circle-x'].map(name => `/animations/studio-icons/${name}.svg`),
])
export function isPublicAnimationPath(path: string): boolean { return PUBLIC_ANIMATION_PATHS.has(path) }
