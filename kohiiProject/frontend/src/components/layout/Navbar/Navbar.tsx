import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';

import { useAuth } from '../../../hooks/useAuth';
import Icon from '../../ui/Icon/Icon';

import calendarIcon from '../../../assets/icons/navbar/calendar.svg';
import storeIcon from '../../../assets/icons/navbar/store.svg';

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

function Navbar() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  // Ina-update bawat minuto para tama ang greeting at petsa kahit matagal nakabukas
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const firstName = user?.profile?.firstName ?? user?.username ?? '';
  // Admin at clerk ay walang sariling store, nakikita nila ang lahat
  const storeLabel = user?.store ? user.store.name : 'All stores';

  return (
    <header className={styles.navbar}>
      <div>
        <h2 className={styles.greeting}>
          {getGreeting(now.getHours())}, {firstName}
        </h2>
        <p className={styles.subtext}>Here is what is happening at Kohii Cafe today.</p>
      </div>

      <div className={styles.chips}>
        <span className={styles.chip}>
          <Icon src={storeIcon} size={16} />
          {storeLabel}
        </span>
        <span className={styles.chip}>
          <Icon src={calendarIcon} size={16} />
          <time dateTime={now.toISOString().slice(0, 10)}>{dateFormat.format(now)}</time>
        </span>
      </div>
    </header>
  );
}

export default Navbar;
