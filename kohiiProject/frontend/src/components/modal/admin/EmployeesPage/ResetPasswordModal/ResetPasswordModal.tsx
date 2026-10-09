import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import Icon from '../../../../ui/Icon/Icon';
import styles from './ResetPasswordModal.module.css';

import { resetEmployeePassword } from '../../../../../api/employees.api';
import type { Employee } from '../../../../../types';
import { generateTempPassword } from '../../../../../utils/tempPassword';

import keyIcon from '../../../../../assets/icons/actions/key.svg';
import eyeOpenIcon from '../../../../../assets/icons/login/eye-open.svg';
import eyeCloseIcon from '../../../../../assets/icons/login/eye-close.svg';

interface ResetPasswordModalProps {
  user: Employee;
  onClose: () => void;
  onSaved: (user: Employee) => void;
}

// Ginagamit lang sa UsersPage. Ang owner ang nagse-set ng pansamantalang password.
function ResetPasswordModal({ user, onClose, onSaved }: ResetPasswordModalProps) {
  const [password, setPassword] = useState(generateTempPassword);
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const name = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.username;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      onSaved(await resetEmployeePassword(user.id, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={keyIcon}
      title="Reset password"
      description={`${name} · @${user.username}`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" loading={saving}>
            Reset password
          </Button>
        </>
      }
    >
      <form id="reset-password-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.label} htmlFor="reset-password">
          New temporary password
        </label>
        <div className={styles.passwordWrap}>
          <input
            id="reset-password"
            className={styles.passwordInput}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            autoFocus
            required
          />
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon src={showPassword ? eyeOpenIcon : eyeCloseIcon} size={18} />
          </button>
          <button type="button" className={styles.generateButton} onClick={() => setPassword(generateTempPassword())}>
            New
          </button>
        </div>

        <p className={styles.notice}>
          Give this password to {user.profile?.firstName ?? user.username}. They will be asked to set their own password
          on their next login.
        </p>
      </form>
    </Modal>
  );
}

export default ResetPasswordModal;
