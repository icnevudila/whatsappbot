import Image from 'next/image';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type State = 'idle' | 'active' | 'processing' | 'success';
const widths = { full: { xs: 120, sm: 140, md: 180, lg: 240, xl: 320 }, symbol: { xs: 24, sm: 32, md: 48, lg: 72, xl: 104 } };

export function MesajifyMark({ variant = 'symbol', size = 'md', state = 'idle', className = '', decorative = false, priority = false }: { variant?: 'full' | 'symbol'; size?: Size; state?: State; className?: string; decorative?: boolean; priority?: boolean }) {
  const width = widths[variant][size];
  const sourceWidth = variant === 'full' ? 1557 : 490;
  return <span className={`mesajify-mark ${className}`} data-state={state} data-variant={variant} style={{ width, display: 'inline-flex', position: 'relative', flexShrink: 0, aspectRatio: `${sourceWidth}/442` }}>
    <Image src={variant === 'full' ? '/brand/mesajify-logo-full.png' : '/brand/mesajify-symbol.png'} alt={decorative ? '' : 'Mesajify'} width={sourceWidth} height={442} sizes={`${width}px`} priority={priority} style={{ width: '100%', height: 'auto', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
  </span>;
}
