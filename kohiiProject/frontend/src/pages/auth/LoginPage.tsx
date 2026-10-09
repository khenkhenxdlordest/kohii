import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './login.module.css';

import { ApiError } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { dashboardRoutes } from '../../utils/roles';

import kohiLogo from '../../assets/images/logo/kohiLogo.png';
import usernameIcon from '../../assets/icons/login/username.svg';
import passwordIcon from '../../assets/icons/login/password.svg';
import eyeOpenIcon from '../../assets/icons/login/eye-open.svg';
import eyeCloseIcon from '../../assets/icons/login/eye-close.svg';
import alertIcon from '../../assets/icons/login/alert.svg';

const REMEMBERED_USERNAME_KEY = 'rememberedUsername';

function readRememberedUsername() {
  try {
    return localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(readRememberedUsername);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => readRememberedUsername() !== '');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const user = await login({ username: username.trim(), password });

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      navigate(dashboardRoutes[user.role], { replace: true });
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError && err.status !== 401
          ? err.message
          : 'Invalid username or password.',
      );
      setLoading(false);
    }
  };

  return (
    <main className={styles.loginContainer}>
      <section className={styles.loginLeft}>
        <img className={styles.loginLogo} src={kohiLogo} alt="Kohii Cafe by Riri" />
        <p className={styles.brandTagline}>Point of Sale &amp; Inventory System</p>
      </section>

      <section className={styles.loginRight}>
        <div className={styles.loginCard}>
          <header className={styles.loginHeader}>
            <h1 className={styles.loginTitle}>Welcome back</h1>
            <p className={styles.loginSubtitle}>Log in to start your shift at Kohii Cafe.</p>
          </header>

          <form className={styles.loginForm} onSubmit={handleSubmit}>
            {errorMessage && (
              <div className={styles.errorMessage} role="alert">
                <img src={alertIcon} alt="" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <label className={styles.inputLabel} htmlFor="username">
              Username
            </label>
            <div className={styles.inputWrap}>
              <img src={usernameIcon} alt="" aria-hidden="true" />
              <input
                className={styles.inputField}
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus={username === ''}
                disabled={loading}
                required
              />
            </div>

            <label className={styles.inputLabel} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrap}>
              <img src={passwordIcon} alt="" aria-hidden="true" />
              <input
                className={styles.inputField}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={username !== ''}
                disabled={loading}
                required
              />
              <button
                className={styles.toggleButton}
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <img src={showPassword ? eyeOpenIcon : eyeCloseIcon} alt="" aria-hidden="true" />
              </button>
            </div>

            <label className={styles.rememberMe}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              Remember my username
            </label>

            <button className={styles.loginButton} type="submit" disabled={loading} aria-busy={loading}>
              {loading && <span className={styles.buttonSpinner} aria-hidden="true" />}
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className={styles.helpText}>Forgot your password? Ask the owner to reset it.</p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
