import { useState } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import UserAvatar from '../../../../ui/UserAvatar/UserAvatar';
import styles from './DeactivateEmployeesModal.module.css';

import { setEmployeesStatus } from '../../../../../api/employees.api';
import type { Employee } from '../../../../../types';
import { jobLabel } from '../../../../../utils/roles';

import powerIcon from '../../../../../assets/icons/actions/power.svg';

interface DeactivateEmployeesModalProps {
  users: Employee[];
  onClose: () => void;
  onDone: (users: Employee[]) => void;
}

const fullName = (u: Employee) =>
  u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : (u.username ?? 'Employee');

// Ginagamit lang sa UsersPage. Deactivate (hindi delete): nananatili ang record at history ng user.
function DeactivateEmployeesModal({ users, onClose, onDone }: DeactivateEmployeesModalProps) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const count = users.length;

  const confirm = async () => {
    setError('');
    setSaving(true);
    try {
      onDone(
        await setEmployeesStatus(
          users.map((u) => u.id),
          false,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate the employee(s).');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={powerIcon}
      title={count === 1 ? 'Deactivate employee?' : `Deactivate ${count} employees?`}
      description="They will be hidden from stores and cannot log in until activated again."
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="dangerSolid" onClick={confirm} loading={saving}>
            Deactivate
          </Button>
        </>
      }
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <ul className={styles.list}>
        {users.map((user, index) => (
          <li key={user.id} className={styles.item} style={{ animationDelay: `${index * 35}ms` }}>
            <UserAvatar name={fullName(user)} size={32} />
            <span className={styles.meta}>
              <span className={styles.name}>{fullName(user)}</span>
              <span className={styles.sub}>
                {user.username ? `@${user.username} · ` : ''}
                {jobLabel(user)}
                {user.store ? ` · ${user.store.name}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className={styles.notice}>Their sales, stock records and history are kept. You can activate them anytime.</p>
    </Modal>
  );
}

export default DeactivateEmployeesModal;
