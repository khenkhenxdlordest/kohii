import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import styles from './ProfilePage.module.css';

import { useAuth } from '../../../hooks/useAuth';
import { changeMyPassword, updateMe, uploadMyPhoto } from '../../../api/auth.api';
import { ApiError } from '../../../api/client';
import { jobLabel } from '../../../utils/roles';
import Button from '../../../components/ui/Button/Button';
import UserAvatar from '../../../components/ui/UserAvatar/UserAvatar';
import Icon from '../../../components/ui/Icon/Icon';

import editIcon from '../../../assets/icons/actions/edit.svg';
import searchIcon from '../../../assets/icons/actions/search.svg';
import closeIcon from '../../../assets/icons/actions/close.svg';

function ProfilePage() {
  const { user, setUser } = useAuth();
  const profile = user?.profile ?? null;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.username ?? '';

  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [middleName, setMiddleName] = useState(profile?.middleName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [contactNo, setContactNo] = useState(profile?.contactNo ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const next = await updateMe({
        firstName,
        middleName: middleName.trim() || null,
        lastName,
        contactNo: contactNo.trim() || null,
        email: email.trim() || null,
      });
      setUser(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const next = await uploadMyPhoto(file);
      setUser(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the photo.');
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const next = await changeMyPassword({ currentPassword, newPassword });
      setUser(next);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>Your account details and password.</p>
      </header>

      {error && (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      )}
      {saved && !error && <p className={styles.notice}>Profile updated.</p>}

      <div className={styles.layout}>
        <div className={styles.photoCard}>
          <div className={styles.photoWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.photoButton}
              onClick={() => setMenuOpen((v) => !v)}
              disabled={uploading}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Profile photo options"
            >
              <UserAvatar name={fullName} photoUrl={profile?.photoUrl} size={96} />
              <span className={styles.photoEdit}>
                <Icon src={editIcon} size={14} />
              </span>
            </button>

            {menuOpen && (
              <div className={styles.photoMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.photoMenuItem}
                  disabled={!profile?.photoUrl}
                  onClick={() => {
                    setMenuOpen(false);
                    setViewerOpen(true);
                  }}
                >
                  <Icon src={searchIcon} size={15} />
                  View profile photo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.photoMenuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    fileInput.current?.click();
                  }}
                >
                  <Icon src={editIcon} size={15} />
                  Change photo
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenInput}
            onChange={handlePhotoChange}
          />
          <p className={styles.photoName}>{fullName}</p>
          <p className={styles.photoRole}>
            {jobLabel(user)}
            {user.store ? ` · ${user.store.name}` : ''}
          </p>
          {uploading && <p className={styles.photoHint}>Uploading...</p>}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Personal details</legend>
            <div className={styles.grid3}>
              <label className={styles.field}>
                <span className={styles.label}>First name</span>
                <input
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={50}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>
                  Middle name <span className={styles.optional}>optional</span>
                </span>
                <input
                  className={styles.input}
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  maxLength={50}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Last name</span>
                <input
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={50}
                  required
                />
              </label>
            </div>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>
                  Contact number <span className={styles.optional}>optional</span>
                </span>
                <input
                  className={styles.input}
                  type="tel"
                  inputMode="tel"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  maxLength={20}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>
                  Email <span className={styles.optional}>optional</span>
                </span>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={100}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Account</legend>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Username</span>
                <input className={styles.input} value={user.username} disabled />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Role</span>
                <input className={styles.input} value={jobLabel(user)} disabled />
              </label>
            </div>
          </fieldset>

          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Change password</legend>

          {passwordError && (
            <p className={styles.alert} role="alert">
              {passwordError}
            </p>
          )}
          {passwordSaved && !passwordError && <p className={styles.notice}>Password updated.</p>}

          <div className={styles.grid3}>
            <label className={styles.field}>
              <span className={styles.label}>Current password</span>
              <input
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>New password</span>
              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Confirm new password</span>
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </div>
        </fieldset>

        <div className={styles.actions}>
          <Button type="submit" loading={changingPassword}>
            Update password
          </Button>
        </div>
      </form>

      {viewerOpen && profile?.photoUrl && (
        <div className={styles.viewerBackdrop} onClick={() => setViewerOpen(false)}>
          <div className={styles.viewerCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.viewerClose}
              onClick={() => setViewerOpen(false)}
              aria-label="Close"
            >
              <Icon src={closeIcon} size={16} />
            </button>
            <img className={styles.viewerImage} src={profile.photoUrl} alt={`${fullName}'s profile photo`} />
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
