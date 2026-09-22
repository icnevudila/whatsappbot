/**
 * MESAJIFY VIDEO ENGINE V5 - NEGATIVE CONSTRAINTS & CONSTANTS
 * Universal guardrails against Veo hallucinations and AI artifacts.
 */

export const V5_STANDARD_NEGATIVES_LIST: string[] = [
  'fake logos',
  'additional brands',
  'misspelled brand name',
  'distorted logo',
  'altered lettering',
  'promotional captions',
  'price tags',
  'subtitles',
  'additional logos',
  'invented brand names',
  'generated captions',
  'promotional badges',
  'extra products',
  'invented accessories',
  'altered packaging',
  'distorted labels',
  'product deformation',
  'duplicate subject',
  'duplicate product',
  'altered product geometry',
  'incorrect product color',
  'warped packaging',
  'warped logo',
  'gibberish typography',
  'floating graphics',
  'holographic interface',
  'unmotivated location change',
  'identity drift',
  'extra fingers',
  'deformed hands',
  'unsafe product use',
  'watermark',
  'fake phone numbers, fake URLs, discount badges, graphic overlays, lower thirds, floating banners, text cards',
  'cartoon, 3D animation look, cgi render, uncanny valley',
  'spinning laptop, rotating laptop, turntable spin, rotating table, motorized rotation, spinning gadget, 360 degree turntable, levitating objects',
  'laptop manufacturer logo, text on laptop bezel, laptop brand name, hardware logo, text on screen frame, screen bezel text, macbook text, notebook text, keyboard text, keyboard gibberish, fake laptop brand, MeBesuk, branding on hardware, unbranded hardware violations',
  'blurry artifacts, low quality, pixelated, amateur video, choppy jumps, abrupt view shifts, jerky camera',
]

export const V5_STANDARD_NEGATIVES = V5_STANDARD_NEGATIVES_LIST.join(', ')
