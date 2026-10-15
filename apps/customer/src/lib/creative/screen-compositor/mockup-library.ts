import type { DeviceAngle, DeviceMockupPreset, DeviceType, Quad } from './types'

export const DEVICE_PRESETS: Record<string, DeviceMockupPreset> = {
  'macbook-pro-16-frontal': {
    id: 'macbook-pro-16-frontal',
    device: 'laptop',
    angle: 'frontal',
    name: 'MacBook Pro 16" Frontal Studio',
    aspectRatio: '16:10',
    screenResolution: { width: 3456, height: 2160 },
    targetCanvasSize: { width: 1920, height: 1080 },
    screenQuad: [
      { x: 420, y: 140 }, // TL
      { x: 1500, y: 140 }, // TR
      { x: 1485, y: 815 }, // BR
      { x: 435, y: 815 }, // BL
    ],
    cornerRadius: 8,
    bezelThickness: 12,
    glareOpacity: 0.08,
    chassisColor: '#1c1d1f', // Space Gray
  },
  'macbook-pro-16-three-quarter': {
    id: 'macbook-pro-16-three-quarter',
    device: 'laptop',
    angle: 'three_quarter_right',
    name: 'MacBook Pro 16" Natural 3/4 Perspective',
    aspectRatio: '16:10',
    screenResolution: { width: 3456, height: 2160 },
    targetCanvasSize: { width: 1920, height: 1080 },
    // Natural 3/4 angle (~14°-18° yaw, receding right edge, fully readable, elegant desk angle)
    screenQuad: [
      { x: 380, y: 130 }, // TL (near top)
      { x: 1420, y: 220 }, // TR (receding top)
      { x: 1420, y: 780 }, // BR (receding bottom)
      { x: 380, y: 870 }, // BL (near bottom)
    ],
    cornerRadius: 8,
    bezelThickness: 12,
    glareOpacity: 0.1,
    chassisColor: '#1c1d1f',
  },
  'macbook-pro-16-desk-work': {
    id: 'macbook-pro-16-desk-work',
    device: 'laptop',
    angle: 'desk_overhead',
    name: 'MacBook Pro 16" Active Work Context',
    aspectRatio: '16:10',
    screenResolution: { width: 3456, height: 2160 },
    targetCanvasSize: { width: 1920, height: 1080 },
    // Slight top-down desk perspective (~12° pitch)
    screenQuad: [
      { x: 440, y: 160 },
      { x: 1480, y: 160 },
      { x: 1515, y: 785 },
      { x: 405, y: 785 },
    ],
    cornerRadius: 8,
    bezelThickness: 12,
    glareOpacity: 0.07,
    chassisColor: '#1c1d1f',
  },
  'macbook-pro-16-square': {
    id: 'macbook-pro-16-square',
    device: 'laptop',
    angle: 'frontal',
    name: 'MacBook Pro 16" Square Feed',
    aspectRatio: '16:10',
    screenResolution: { width: 3024, height: 1890 },
    targetCanvasSize: { width: 1080, height: 1080 },
    screenQuad: [
      { x: 110, y: 220 }, // TL
      { x: 970, y: 220 }, // TR
      { x: 955, y: 760 }, // BR
      { x: 125, y: 760 }, // BL
    ],
    cornerRadius: 6,
    bezelThickness: 9,
    glareOpacity: 0.07,
    chassisColor: '#1c1d1f',
  },
  'studio-display-desktop': {
    id: 'studio-display-desktop',
    device: 'desktop',
    angle: 'frontal',
    name: 'Apple Studio Display 27"',
    aspectRatio: '16:9',
    screenResolution: { width: 5120, height: 2880 },
    targetCanvasSize: { width: 1920, height: 1080 },
    screenQuad: [
      { x: 380, y: 110 },
      { x: 1540, y: 110 },
      { x: 1540, y: 762 },
      { x: 380, y: 762 },
    ],
    cornerRadius: 4,
    bezelThickness: 14,
    glareOpacity: 0.06,
    chassisColor: '#2b2c2e',
  },
  'ipad-pro-12-tablet': {
    id: 'ipad-pro-12-tablet',
    device: 'tablet',
    angle: 'frontal',
    name: 'iPad Pro 12.9" Landscape',
    aspectRatio: '4:3',
    screenResolution: { width: 2732, height: 2048 },
    targetCanvasSize: { width: 1920, height: 1080 },
    screenQuad: [
      { x: 480, y: 150 },
      { x: 1440, y: 150 },
      { x: 1440, y: 870 },
      { x: 480, y: 870 },
    ],
    cornerRadius: 18,
    bezelThickness: 16,
    glareOpacity: 0.08,
    chassisColor: '#121214',
  },
  'iphone-16-pro-mobile': {
    id: 'iphone-16-pro-mobile',
    device: 'mobile',
    angle: 'frontal',
    name: 'iPhone 16 Pro Vertical Story',
    aspectRatio: '9:19.5',
    screenResolution: { width: 1179, height: 2556 },
    targetCanvasSize: { width: 1080, height: 1920 }, // 9:16 Story format
    screenQuad: [
      { x: 190, y: 260 },
      { x: 890, y: 260 },
      { x: 890, y: 1775 },
      { x: 190, y: 1775 },
    ],
    cornerRadius: 48,
    bezelThickness: 14,
    glareOpacity: 0.1,
    chassisColor: '#1f2022', // Natural Titanium
  },
}

/**
 * Get device preset by device type, angle, and canvas aspect format.
 */
export function getDevicePreset(
  device: DeviceType,
  angle?: DeviceAngle,
  isSquare: boolean = false,
): DeviceMockupPreset {
  if (device === 'laptop') {
    if (isSquare) return DEVICE_PRESETS['macbook-pro-16-square']
    if (angle === 'three_quarter_right' || angle === 'three_quarter_left') {
      return DEVICE_PRESETS['macbook-pro-16-three-quarter']
    }
    if (angle === 'desk_overhead') {
      return DEVICE_PRESETS['macbook-pro-16-desk-work']
    }
    return DEVICE_PRESETS['macbook-pro-16-frontal']
  }
  if (device === 'desktop') return DEVICE_PRESETS['studio-display-desktop']
  if (device === 'tablet') return DEVICE_PRESETS['ipad-pro-12-tablet']
  if (device === 'mobile') return DEVICE_PRESETS['iphone-16-pro-mobile']
  return DEVICE_PRESETS['macbook-pro-16-frontal']
}
