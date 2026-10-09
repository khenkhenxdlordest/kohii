import { Link } from 'react-router-dom';
import styles from './statusPage.module.css';

function NotFoundPage() {
  return (
    <main className={styles.page}>
      <div>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.text}>The page you are looking for does not exist.</p>
        <Link className={styles.button} to="/">Back to dashboard</Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
