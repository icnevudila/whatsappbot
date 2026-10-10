import fs from 'fs'
import path from 'path'

// Helper functions for Bodymovin / Lottie shapes
function shapeGroup(name, shapeItems) {
  return {
    ty: 'gr',
    nm: name,
    np: shapeItems.length,
    cix: 2,
    bm: 0,
    ix: 1,
    mn: 'ADBE Vector Group',
    hd: false,
    it: shapeItems,
  }
}

function rectShape(name, size, pos = [0, 0], roundness = 0) {
  return {
    ty: 'rc',
    nm: name,
    d: 1,
    s: { a: 0, k: size, ix: 2 },
    p: { a: 0, k: pos, ix: 3 },
    r: { a: 0, k: roundness, ix: 4 },
    mn: 'ADBE Vector Shape - Rect',
    hd: false,
  }
}

function circleShape(name, size, pos = [0, 0]) {
  return {
    ty: 'el',
    nm: name,
    d: 1,
    s: { a: 0, k: [size, size], ix: 2 },
    p: { a: 0, k: pos, ix: 3 },
    mn: 'ADBE Vector Shape - Ellipse',
    hd: false,
  }
}

function pathShape(name, vertices, closed = false) {
  return {
    ty: 'sh',
    nm: name,
    closed,
    ks: {
      a: 0,
      k: {
        i: vertices.map(() => [0, 0]),
        o: vertices.map(() => [0, 0]),
        v: vertices,
        c: closed,
      },
      ix: 2,
    },
    mn: 'ADBE Vector Shape - Group',
    hd: false,
  }
}

function fill(colorHex, opacity = 100) {
  const r = parseInt(colorHex.slice(1, 3), 16) / 255
  const g = parseInt(colorHex.slice(3, 5), 16) / 255
  const b = parseInt(colorHex.slice(5, 7), 16) / 255
  return {
    ty: 'fl',
    nm: 'Fill',
    c: { a: 0, k: [r, g, b, 1], ix: 4 },
    o: { a: 0, k: opacity, ix: 5 },
    r: 1,
    bm: 0,
    mn: 'ADBE Vector Graphic - Fill',
    hd: false,
  }
}

function stroke(colorHex, width = 2, opacity = 100, dash = null) {
  const r = parseInt(colorHex.slice(1, 3), 16) / 255
  const g = parseInt(colorHex.slice(3, 5), 16) / 255
  const b = parseInt(colorHex.slice(5, 7), 16) / 255
  const s: any = {
    ty: 'st',
    nm: 'Stroke',
    c: { a: 0, k: [r, g, b, 1], ix: 3 },
    o: { a: 0, k: opacity, ix: 4 },
    w: { a: 0, k: width, ix: 5 },
    lc: 2, // round
    lj: 2, // round
    ml: 4,
    bm: 0,
    mn: 'ADBE Vector Graphic - Stroke',
    hd: false,
  }
  if (dash) {
    s.d = [
      { n: 'd', nm: 'dash', v: { a: 0, k: dash[0], ix: 1 } },
      { n: 'g', nm: 'gap', v: { a: 0, k: dash[1], ix: 2 } },
    ]
  }
  return s
}

function transform(pos = [0, 0], scale = [100, 100], rot = 0, opacity = 100) {
  const p = typeof pos[0] === 'object' ? pos : { a: 0, k: [pos[0], pos[1], 0], ix: 2 }
  const s = typeof scale[0] === 'object' ? scale : { a: 0, k: [scale[0], scale[1], 100], ix: 6 }
  const r = typeof rot === 'object' ? rot : { a: 0, k: rot, ix: 10 }
  const o = typeof opacity === 'object' ? opacity : { a: 0, k: opacity, ix: 11 }
  return {
    ty: 'tr',
    p,
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s,
    r,
    o,
    sk: { a: 0, k: 0, ix: 4 },
    sa: { a: 0, k: 0, ix: 5 },
    nm: 'Transform',
  }
}

function layer(ind, name, shapes, ks, ip = 0, op = 90) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks,
    ao: 0,
    shapes,
    ip,
    op,
    st: 0,
    bm: 0,
  }
}

function createLottie(name, layers, w = 300, h = 300, op = 90) {
  return JSON.stringify(
    {
      v: '5.5.7',
      fr: 30,
      ip: 0,
      op,
      w,
      h,
      nm: name,
      ddd: 0,
      assets: [],
      layers,
    },
    null,
    2
  )
}

// -------------------------------------------------------------
// IMAGE ANIMATIONS (Mesajify Brand Palette: #00A884, #008069, #07100C)
// -------------------------------------------------------------

// 1. Image Upload: product-upload.json
// Two cards approaching, floating gently with checkmark
export function genProductUpload() {
  const card1Shapes = [
    shapeGroup('Card Base', [
      rectShape('Rect', [90, 120], [0, 0], 12),
      fill('#F4FBF8', 100),
      stroke('#00A884', 2.5, 90),
      transform(),
    ]),
    shapeGroup('Photo Symbol', [
      circleShape('Sun', 14, [-18, -25]),
      fill('#00A884', 80),
      pathShape('Mountain', [[-30, 20], [-10, 0], [10, 18], [25, 5], [35, 20]], true),
      fill('#00A884', 40),
      transform(),
    ]),
  ]
  const card1Ks = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [115, 150, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [125, 146, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [115, 150, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [-6], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [-2], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [-6] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  const card2Shapes = [
    shapeGroup('Card Base', [
      rectShape('Rect', [90, 120], [0, 0], 12),
      fill('#FFFFFF', 100),
      stroke('#008069', 2.5, 90),
      transform(),
    ]),
    shapeGroup('Logo Symbol', [
      circleShape('Outer', 40, [0, 0]),
      stroke('#00A884', 2),
      circleShape('Inner', 20, [0, 0]),
      fill('#00A884', 80),
      transform(),
    ]),
  ]
  const card2Ks = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [185, 150, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [175, 154, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [185, 150, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [6], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [2], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [6] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Connecting Badge
  const badgeShapes = [
    shapeGroup('Badge', [
      circleShape('Dot', 28, [0, 0]),
      fill('#00A884', 100),
      pathShape('Check', [[-6, 0], [-2, 4], [6, -4]], false),
      stroke('#FFFFFF', 3),
      transform(),
    ]),
  ]
  const badgeKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [95, 95, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [110, 110, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [95, 95, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('product-upload', [
    layer(1, 'Badge', badgeShapes, badgeKs),
    layer(2, 'Card Right', card2Shapes, card2Ks),
    layer(3, 'Card Left', card1Shapes, card1Ks),
  ])
}

// 2. Image Scan: image-scan.json
// Rectangular viewfinder with scanning emerald beam and pulsating detection points
export function genImageScan() {
  const frameShapes = [
    shapeGroup('Outer Frame', [
      rectShape('Frame', [160, 190], [0, 0], 16),
      stroke('#00A884', 3, 90),
      fill('#F4FBF8', 40),
      transform(),
    ]),
    shapeGroup('Corners', [
      pathShape('TL', [[-70, -65], [-70, -85], [-50, -85]], false),
      stroke('#008069', 4),
      pathShape('TR', [[50, -85], [70, -85], [70, -65]], false),
      stroke('#008069', 4),
      pathShape('BL', [[-70, 65], [-70, 85], [-50, 85]], false),
      stroke('#008069', 4),
      pathShape('BR', [[50, 85], [70, 85], [70, 65]], false),
      stroke('#008069', 4),
      transform(),
    ]),
  ]
  const frameKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Scanning laser beam
  const beamShapes = [
    shapeGroup('Beam Line', [
      rectShape('Line', [148, 3], [0, 0], 2),
      fill('#00A884', 100),
      rectShape('Glow', [148, 16], [0, 0], 4),
      fill('#00A884', 25),
      transform(),
    ]),
  ]
  const beamKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [150, 85, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [150, 215, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [150, 85, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 90, ix: 11 },
  }

  // Detection target dots
  const targetShapes = [
    shapeGroup('Targets', [
      circleShape('Target1', 12, [-35, -25]),
      stroke('#00A884', 2),
      circleShape('Target2', 14, [30, 20]),
      stroke('#00A884', 2),
      circleShape('Target3', 10, [-20, 35]),
      stroke('#008069', 2),
      transform(),
    ]),
  ]
  const targetKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [90, 90, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [110, 110, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [90, 90, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 80, ix: 11 },
  }

  return createLottie('image-scan', [
    layer(1, 'Beam', beamShapes, beamKs),
    layer(2, 'Targets', targetShapes, targetKs),
    layer(3, 'Frame', frameShapes, frameKs),
  ])
}

// 3. Creative Design: creative-design.json
// Layout elements organizing, header bar, text bars, sparkle accents
export function genCreativeDesign() {
  const canvasShapes = [
    shapeGroup('Poster Board', [
      rectShape('Paper', [160, 200], [0, 0], 14),
      fill('#FFFFFF', 100),
      stroke('#00A884', 2.5, 90),
      // Header badge placeholder
      rectShape('Header', [80, 14], [0, -70], 6),
      fill('#00A884', 30),
      // Image area placeholder
      rectShape('ImageSlot', [130, 80], [0, -15], 8),
      fill('#F4FBF8', 100),
      stroke('#008069', 1.5, 60),
      // Headline bar
      rectShape('Line1', [110, 8], [0, 42], 4),
      fill('#07100C', 70),
      // Subtext bar
      rectShape('Line2', [80, 6], [0, 56], 3),
      fill('#07100C', 35),
      // CTA button
      rectShape('CTA', [70, 16], [0, 76], 8),
      fill('#00A884', 100),
      transform(),
    ]),
  ]
  const canvasKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [150, 150, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [150, 145, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [150, 150, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Floating sparkle 1
  const spark1Shapes = [
    shapeGroup('Sparkle', [
      pathShape('Star', [[0, -16], [4, -4], [16, 0], [4, 4], [0, 16], [-4, 4], [-16, 0], [-4, -4]], true),
      fill('#00A884', 90),
      transform(),
    ]),
  ]
  const spark1Ks = {
    p: { a: 0, k: [60, 80, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [70, 70, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [115, 115, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [70, 70, 100] },
      ],
      ix: 6,
    },
    r: {
      a: 1,
      k: [
        { t: 0, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [90] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Floating sparkle 2
  const spark2Ks = {
    p: { a: 0, k: [240, 220, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [110, 110, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [60, 60, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [110, 110, 100] },
      ],
      ix: 6,
    },
    r: {
      a: 1,
      k: [
        { t: 0, s: [45], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [-45] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 80, ix: 11 },
  }

  return createLottie('creative-design', [
    layer(1, 'Sparkle 1', spark1Shapes, spark1Ks),
    layer(2, 'Sparkle 2', spark1Shapes, spark2Ks),
    layer(3, 'Canvas', canvasShapes, canvasKs),
  ])
}

// 4. AI Image Generating: image-render.json
// Rotating gradient aura, central creative crystal/frame, subtle orbit
export function genImageRender() {
  const auraShapes = [
    shapeGroup('Orbit Ring', [
      circleShape('Ring', 210, [0, 0]),
      stroke('#00A884', 2, 70, [8, 12]),
      transform(),
    ]),
  ]
  const auraKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [0], i: { x: [1], y: [1] }, o: { x: [0], y: [0] } },
        { t: 90, s: [360] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 80, ix: 11 },
  }

  const innerShapes = [
    shapeGroup('Central Core', [
      rectShape('Frame', [120, 150], [0, 0], 18),
      stroke('#00A884', 3, 100),
      fill('#F4FBF8', 60),
      circleShape('Center Sun', 36, [0, -10]),
      fill('#008069', 80),
      rectShape('Bottom Wave', [80, 12], [0, 35], 6),
      fill('#00A884', 50),
      transform(),
    ]),
  ]
  const innerKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [96, 96, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [104, 104, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [96, 96, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('image-render', [
    layer(1, 'Core', innerShapes, innerKs),
    layer(2, 'Orbit', auraShapes, auraKs),
  ])
}

// 5. Image Success: image-success.json
// Joyful checkmark burst, smooth expansion, pristine finish
export function genImageSuccess() {
  const checkShapes = [
    shapeGroup('Badge', [
      circleShape('Outer', 110, [0, 0]),
      fill('#00A884', 100),
      pathShape('Check', [[-24, 0], [-8, 16], [26, -18]], false),
      stroke('#FFFFFF', 7),
      transform(),
    ]),
  ]
  const checkKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [40, 40, 100], i: { x: [0.1], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 30, s: [105, 105, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [100, 100, 100] },
        { t: 90, s: [100, 100, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Radiating burst ring
  const ringShapes = [
    shapeGroup('Burst Ring', [
      circleShape('Ring', 150, [0, 0]),
      stroke('#008069', 3, 50),
      transform(),
    ]),
  ]
  const ringKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 15, s: [60, 60, 100], i: { x: [0.1], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 60, s: [140, 140, 100] },
        { t: 90, s: [140, 140, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: {
      a: 1,
      k: [
        { t: 15, s: [100] },
        { t: 60, s: [0] },
        { t: 90, s: [0] },
      ],
      ix: 11,
    },
  }

  return createLottie('image-success', [
    layer(1, 'Check Badge', checkShapes, checkKs),
    layer(2, 'Ring Burst', ringShapes, ringKs),
  ])
}

// -------------------------------------------------------------
// VIDEO ANIMATIONS (Cinematic, Technical, 9:16 Filmstrip Language)
// -------------------------------------------------------------

// 1. Storyboard: storyboard.json
// Three vertical 9:16 cards connected with a timeline track
export function genStoryboard() {
  const cardsShapes = [
    shapeGroup('Shot 1', [
      rectShape('S1', [48, 85], [-62, 0], 8),
      fill('#1A2421', 100),
      stroke('#00A884', 2),
      circleShape('Dot', 8, [-62, -20]),
      fill('#00A884', 80),
      transform(),
    ]),
    shapeGroup('Shot 2 (Hero)', [
      rectShape('S2', [54, 96], [0, 0], 8),
      fill('#07100C', 100),
      stroke('#00A884', 3),
      rectShape('ProductBar', [32, 24], [0, -10], 4),
      fill('#00A884', 100),
      transform(),
    ]),
    shapeGroup('Shot 3', [
      rectShape('S3', [48, 85], [62, 0], 8),
      fill('#1A2421', 100),
      stroke('#00A884', 2),
      circleShape('Dot', 8, [62, 20]),
      fill('#00A884', 80),
      transform(),
    ]),
  ]
  const cardsKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [150, 145, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [150, 153, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [150, 145, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Timeline track beneath
  const timelineShapes = [
    shapeGroup('Track', [
      rectShape('Rail', [190, 4], [0, 0], 2),
      fill('#008069', 50),
      circleShape('Pin1', 8, [-62, 0]),
      fill('#00A884', 100),
      circleShape('Pin2', 10, [0, 0]),
      fill('#00A884', 100),
      circleShape('Pin3', 8, [62, 0]),
      fill('#00A884', 100),
      transform(),
    ]),
  ]
  const timelineKs = {
    p: { a: 0, k: [150, 225, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 90, ix: 11 },
  }

  return createLottie('storyboard', [
    layer(1, 'Timeline', timelineShapes, timelineKs),
    layer(2, 'Cards', cardsShapes, cardsKs),
  ])
}

// 2. Reference Attach: reference-attach.json
// Center film aperture with two reference chips snapping into magnetic alignment
export function genReferenceAttach() {
  const mainStage = [
    shapeGroup('Film Center', [
      rectShape('Frame', [100, 160], [0, 0], 12),
      fill('#07100C', 100),
      stroke('#00A884', 2.5),
      transform(),
    ]),
  ]
  const mainKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Chip 1: Logo Chip
  const logoChip = [
    shapeGroup('Logo Chip', [
      rectShape('Chip', [42, 42], [0, 0], 10),
      fill('#1A2421', 100),
      stroke('#00A884', 2),
      circleShape('Dot', 16, [0, 0]),
      fill('#00A884', 80),
      transform(),
    ]),
  ]
  const logoChipKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [65, 120, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [95, 120, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [65, 120, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [-10], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [-10] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Chip 2: Product Chip
  const prodChip = [
    shapeGroup('Prod Chip', [
      rectShape('Chip', [44, 56], [0, 0], 10),
      fill('#1A2421', 100),
      stroke('#008069', 2),
      rectShape('Inner', [26, 36], [0, 0], 6),
      fill('#00A884', 90),
      transform(),
    ]),
  ]
  const prodChipKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [235, 180, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [205, 180, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [235, 180, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [10], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [10] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('reference-attach', [
    layer(1, 'Logo Chip', logoChip, logoChipKs),
    layer(2, 'Product Chip', prodChip, prodChipKs),
    layer(3, 'Film Center', mainStage, mainKs),
  ])
}

// 3. Camera Motion: camera-motion.json
// Cinema camera rig gliding smoothly, viewport crosshair, recording indicator
export function genCameraMotion() {
  const cameraBody = [
    shapeGroup('Cinema Camera', [
      rectShape('Body', [76, 52], [0, 0], 10),
      fill('#1A2421', 100),
      stroke('#00A884', 2.5),
      // Top handle
      pathShape('Handle', [[-24, -26], [-24, -36], [24, -36], [24, -26]], false),
      stroke('#008069', 3),
      // Front lens cone
      pathShape('Lens', [[38, -16], [54, -24], [54, 24], [38, 16]], true),
      fill('#07100C', 100),
      stroke('#00A884', 2),
      // Reel circles on top
      circleShape('Reel1', 20, [-12, -26]),
      fill('#008069', 80),
      circleShape('Reel2', 20, [12, -26]),
      fill('#008069', 80),
      // Rec red dot
      circleShape('Rec', 8, [-22, -10]),
      fill('#E11D48', 100),
      transform(),
    ]),
  ]
  const cameraKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [130, 150, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [170, 150, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [130, 150, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [-3], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [3], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [-3] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Camera Dolly Track below
  const trackShapes = [
    shapeGroup('Dolly Track', [
      rectShape('Rail', [220, 6], [0, 0], 3),
      fill('#07100C', 100),
      stroke('#008069', 2),
      transform(),
    ]),
  ]
  const trackKs = {
    p: { a: 0, k: [150, 205, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 80, ix: 11 },
  }

  return createLottie('camera-motion', [
    layer(1, 'Track', trackShapes, trackKs),
    layer(2, 'Camera', cameraBody, cameraKs),
  ])
}

// 4. Video Render: video-render.json
// Vertical filmstrip with sprocket holes looping, glow scanner processing
export function genVideoRender() {
  const filmstrip = [
    shapeGroup('Film Reel Strip', [
      rectShape('MainFrame', [105, 175], [0, 0], 14),
      fill('#07100C', 100),
      stroke('#00A884', 3),
      // Left sprockets
      rectShape('H1', [8, 12], [-44, -60], 2),
      fill('#00A884', 90),
      rectShape('H2', [8, 12], [-44, -20], 2),
      fill('#00A884', 90),
      rectShape('H3', [8, 12], [-44, 20], 2),
      fill('#00A884', 90),
      rectShape('H4', [8, 12], [-44, 60], 2),
      fill('#00A884', 90),
      // Right sprockets
      rectShape('H5', [8, 12], [44, -60], 2),
      fill('#00A884', 90),
      rectShape('H6', [8, 12], [44, -20], 2),
      fill('#00A884', 90),
      rectShape('H7', [8, 12], [44, 20], 2),
      fill('#00A884', 90),
      rectShape('H8', [8, 12], [44, 60], 2),
      fill('#00A884', 90),
      // Inner playback window
      rectShape('Window', [64, 110], [0, 0], 8),
      fill('#1A2421', 100),
      stroke('#008069', 1.5),
      transform(),
    ]),
  ]
  const filmstripKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Vertical laser render scan
  const renderLine = [
    shapeGroup('Laser', [
      rectShape('Beam', [64, 3], [0, 0], 1.5),
      fill('#00A884', 100),
      rectShape('Glow', [64, 14], [0, 0], 4),
      fill('#00A884', 35),
      transform(),
    ]),
  ]
  const renderLineKs = {
    p: {
      a: 1,
      k: [
        { t: 0, s: [150, 100, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [150, 200, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [150, 100, 0] },
      ],
      ix: 2,
    },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('video-render', [
    layer(1, 'Laser', renderLine, renderLineKs),
    layer(2, 'Filmstrip', filmstrip, filmstripKs),
  ])
}

// 5. Timeline Edit: timeline-edit.json
// Audio waveform bars pulsing dynamically + video cuts / timeline block
export function genTimelineEdit() {
  const timelineBoard = [
    shapeGroup('Board', [
      rectShape('Console', [210, 130], [0, 0], 14),
      fill('#07100C', 100),
      stroke('#008069', 2),
      // Video track block 1
      rectShape('V1', [80, 26], [-45, -30], 4),
      fill('#00A884', 90),
      // Video track block 2
      rectShape('V2', [90, 26], [45, -30], 4),
      fill('#008069', 90),
      transform(),
    ]),
  ]
  const boardKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Audio waveform track below
  const waveShapes = [
    shapeGroup('Wave Bars', [
      rectShape('B1', [4, 18], [-70, 0], 2),
      fill('#00A884', 90),
      rectShape('B2', [4, 30], [-55, 0], 2),
      fill('#00A884', 90),
      rectShape('B3', [4, 22], [-40, 0], 2),
      fill('#00A884', 90),
      rectShape('B4', [4, 40], [-25, 0], 2),
      fill('#00A884', 90),
      rectShape('B5', [4, 16], [-10, 0], 2),
      fill('#00A884', 90),
      rectShape('B6', [4, 34], [5, 0], 2),
      fill('#00A884', 90),
      rectShape('B7', [4, 44], [20, 0], 2),
      fill('#00A884', 90),
      rectShape('B8', [4, 26], [35, 0], 2),
      fill('#00A884', 90),
      rectShape('B9', [4, 36], [50, 0], 2),
      fill('#00A884', 90),
      rectShape('B10', [4, 20], [65, 0], 2),
      fill('#00A884', 90),
      transform(),
    ]),
  ]
  const waveKs = {
    p: { a: 0, k: [150, 175, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [100, 75, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [100, 125, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [100, 75, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('timeline-edit', [
    layer(1, 'Audio Wave', waveShapes, waveKs),
    layer(2, 'Board', timelineBoard, boardKs),
  ])
}

// 6. Video Success: video-success.json
// Cinematic frame with large play button and radiant green checkmark
export function genVideoSuccess() {
  const screenShapes = [
    shapeGroup('Screen', [
      rectShape('Monitor', [120, 180], [0, 0], 16),
      fill('#07100C', 100),
      stroke('#00A884', 3),
      // Play triangle
      pathShape('Play', [[-14, -20], [18, 0], [-14, 20]], true),
      fill('#00A884', 100),
      transform(),
    ]),
  ]
  const screenKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [60, 60, 100], i: { x: [0.1], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 35, s: [104, 104, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 50, s: [100, 100, 100] },
        { t: 90, s: [100, 100, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  // Floating check badge on corner
  const cornerBadge = [
    shapeGroup('Badge', [
      circleShape('Circle', 36, [0, 0]),
      fill('#00A884', 100),
      pathShape('Check', [[-8, 0], [-3, 5], [7, -5]], false),
      stroke('#FFFFFF', 3.5),
      transform(),
    ]),
  ]
  const badgeKs = {
    p: { a: 0, k: [205, 85, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [0, 0, 100] },
        { t: 25, s: [0, 0, 100] },
        { t: 50, s: [120, 120, 100] },
        { t: 65, s: [100, 100, 100] },
        { t: 90, s: [100, 100, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('video-success', [
    layer(1, 'Corner Check', cornerBadge, badgeKs),
    layer(2, 'Video Monitor', screenShapes, screenKs),
  ])
}

// -------------------------------------------------------------
// SHARED ANIMATIONS (Warning, Loading)
// -------------------------------------------------------------

export function genWarning() {
  const warnShapes = [
    shapeGroup('Sign', [
      pathShape('Triangle', [[0, -45], [52, 45], [-52, 45]], true),
      fill('#FFFBEB', 100),
      stroke('#F59E0B', 4),
      rectShape('ExclBar', [5, 24], [0, 8], 2.5),
      fill('#B45309', 100),
      circleShape('ExclDot', 6, [0, 28]),
      fill('#B45309', 100),
      transform(),
    ]),
  ]
  const warnKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: {
      a: 1,
      k: [
        { t: 0, s: [95, 95, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 45, s: [105, 105, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
        { t: 90, s: [95, 95, 100] },
      ],
      ix: 6,
    },
    r: { a: 0, k: 0, ix: 10 },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('warning', [layer(1, 'Sign', warnShapes, warnKs)])
}

export function genLoading() {
  const dotsShapes = [
    shapeGroup('Spinner Ring', [
      circleShape('Ring', 80, [0, 0]),
      stroke('#00A884', 4, 80, [14, 20]),
      transform(),
    ]),
  ]
  const dotsKs = {
    p: { a: 0, k: [150, 150, 0], ix: 2 },
    a: { a: 0, k: [0, 0, 0], ix: 1 },
    s: { a: 0, k: [100, 100, 100], ix: 6 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [0] },
        { t: 90, s: [360] },
      ],
      ix: 10,
    },
    o: { a: 0, k: 100, ix: 11 },
  }

  return createLottie('loading', [layer(1, 'Spinner', dotsShapes, dotsKs)])
}

// -------------------------------------------------------------
// BATCH WRITE ALL ANIMATIONS
// -------------------------------------------------------------

const baseDir = path.resolve('apps/customer/public/animations')

const assets = [
  { path: 'image/product-upload.json', content: genProductUpload() },
  { path: 'image/image-scan.json', content: genImageScan() },
  { path: 'image/creative-design.json', content: genCreativeDesign() },
  { path: 'image/image-render.json', content: genImageRender() },
  { path: 'image/image-success.json', content: genImageSuccess() },
  { path: 'video/storyboard.json', content: genStoryboard() },
  { path: 'video/reference-attach.json', content: genReferenceAttach() },
  { path: 'video/camera-motion.json', content: genCameraMotion() },
  { path: 'video/video-render.json', content: genVideoRender() },
  { path: 'video/timeline-edit.json', content: genTimelineEdit() },
  { path: 'video/video-success.json', content: genVideoSuccess() },
  { path: 'shared/warning.json', content: genWarning() },
  { path: 'shared/loading.json', content: genLoading() },
]

for (const asset of assets) {
  const fullPath = path.join(baseDir, asset.path)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, asset.content, 'utf-8')
  console.log(`Generated: ${asset.path} (${Buffer.byteLength(asset.content)} bytes)`)
}
