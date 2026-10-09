import { useEffect, useRef, useState } from 'react';
import styles from './UserAvatar.module.css';

// Mga kulay na bagay sa kape/cream; laging pareho ang kulay ng iisang pangalan
const PALETTE: { bg: string; fg: string }[] = [
  { bg: '#8a5a3c', fg: '#fff' },
  { bg: '#3f6b5c', fg: '#fff' },
  { bg: '#b07a1a', fg: '#fff' },
  { bg: '#5b6b3a', fg: '#fff' },
  { bg: '#9b2c2c', fg: '#fff' },
  { bg: '#4a5a7a', fg: '#fff' },
  { bg: '#6b4a6b', fg: '#fff' },
  { bg: '#e8dccd', fg: '#1f1712' },
  { bg: '#1f1712', fg: '#f6efe6' },
  { bg: '#c08552', fg: '#fff' },
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/** Bilog na may larawan (kung may photoUrl) o initials; lalabas ang buong pangalan kapag tinapatan nang sandali */
function UserAvatar({ name, photoUrl, size = 34 }: { name: string; photoUrl?: string | null; size?: number }) {
  const { bg, fg } = PALETTE[hashName(name) % PALETTE.length];
  const [tooltip, setTooltip] = useState<'hidden' | 'shown' | 'leaving'>('hidden');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTooltip('shown'), 500);
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    if (tooltip === 'hidden') return;
    setTooltip('leaving');
    timer.current = setTimeout(() => setTooltip('hidden'), 150);
  };

  return (
    <span className={styles.wrap} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} tabIndex={0}>
      <span
        className={styles.avatar}
        style={
          photoUrl
            ? { width: size, height: size }
            : { width: size, height: size, fontSize: Math.round(size * 0.36), background: bg, color: fg }
        }
        aria-label={name}
        role="img"
      >
        {photoUrl ? <img className={styles.photo} src={photoUrl} alt="" /> : initials(name)}
      </span>
      {tooltip !== 'hidden' && (
        <span className={`${styles.tooltip} ${tooltip === 'leaving' ? styles.leaving : ''}`} role="tooltip">
          {name}
        </span>
      )}
    </span>
  );
}

export default UserAvatar;
