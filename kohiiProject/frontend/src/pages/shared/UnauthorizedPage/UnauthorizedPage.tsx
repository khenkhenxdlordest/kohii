import { Link } from 'react-router-dom';
import styles from './UnauthorizedPage.module.css';

function UnauthorizedPage() {
  return (
    <main className={styles.page}>
      <div>
        <p className={styles.code}>403</p>
        <h1 className={styles.title}>No access</h1>
        <p className={styles.text}>Your account is not allowed to open this page.</p>
        <Link className={styles.button} to="/">Back to my dashboard</Link>
      </div>
    </main>
  );
}

export default UnauthorizedPage;
