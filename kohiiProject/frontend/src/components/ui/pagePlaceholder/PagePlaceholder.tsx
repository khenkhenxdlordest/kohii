import styles from './PagePlaceholder.module.css';

// Pansamantalang laman ng page habang hindi pa nagagawa ang totoong feature
function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <div className={styles.empty}>Coming soon</div>
    </section>
  );
}

export default PagePlaceholder;
