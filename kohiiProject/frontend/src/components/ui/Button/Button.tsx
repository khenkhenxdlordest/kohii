import type { ButtonHTMLAttributes } from 'react';
import Icon from '../Icon/Icon';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';
  size?: 'md' | 'sm';
  /** SVG mula sa assets/icons */
  icon?: string;
  loading?: boolean;
}

function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  type = 'button',
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && <Icon src={icon} size={size === 'sm' ? 16 : 18} />
      )}
      {children}
    </button>
  );
}

export default Button;
