import styles from './Icon.module.css';

// SVG mula sa assets/icons na sumusunod sa kulay ng text (currentColor) gamit ang CSS mask
function Icon({ src, size = 20, className = '' }: { src: string; size?: number; className?: string }) {
  return (
    <span
      className={`${styles.icon} ${className}`}
      style={{
        width: size,
        height: size,
        maskImage: `url("${src}")`,
        WebkitMaskImage: `url("${src}")`,
      }}
      aria-hidden="true"
    />
  );
}

export default Icon;
