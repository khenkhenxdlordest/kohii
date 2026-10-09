import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

import { useAuth } from '../../../hooks/useAuth';
import Icon from '../../ui/Icon/Icon';
import { roleLabels } from '../../../utils/roles';

import kohiLogo from '../../../assets/images/logo/kohiLogo.png';
import profileIcon from '../../../assets/icons/sidebar/profile.svg';
import logoutIcon from '../../../assets/icons/sidebar/logout.svg';

export interface NavItem {
  label: string;
  to: string;
  icon: string;
  /** true para sa dashboard (index route) para hindi laging naka-highlight */
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

function Sidebar({ sections, profilePath }: { sections: NavSection[]; profilePath: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <img className={styles.logo} src={kohiLogo} alt="Kohii Cafe by Riri" />
      </div>

      <nav className={styles.menu} aria-label="Main menu">
        {sections.map((section) => (
          <div key={section.title}>
            <p className={styles.sectionTitle}>{section.title}</p>
            <ul className={styles.navList}>
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                    }
                  >
                    <Icon src={item.icon} size={19} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.profile}>
        <NavLink
          to={profilePath}
          className={({ isActive }) =>
            `${styles.profileLink} ${isActive ? styles.profileLinkActive : ''}`
          }
        >
          <span className={styles.avatar}>
            <Icon src={profileIcon} size={19} />
          </span>
          <span className={styles.profileText}>
            <span className={styles.profileName}>
              {user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user?.username}
            </span>
            <span className={styles.profileRole}>{user ? roleLabels[user.role] : ''}</span>
          </span>
        </NavLink>
        <button
          className={styles.logoutButton}
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
        >
          <Icon src={logoutIcon} size={19} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
