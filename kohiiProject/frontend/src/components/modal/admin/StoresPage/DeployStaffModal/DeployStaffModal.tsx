import { useMemo, useState } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import Icon from '../../../../ui/Icon/Icon';
import UserAvatar from '../../../../ui/UserAvatar/UserAvatar';
import styles from './DeployStaffModal.module.css';

import { deployStaff } from '../../../../../api/stores.api';
import type { Employee, StaffShift, Store } from '../../../../../types';
import { jobLabel, jobOf } from '../../../../../utils/roles';

import userPlusIcon from '../../../../../assets/icons/actions/user-plus.svg';
import searchIcon from '../../../../../assets/icons/actions/search.svg';

interface DeployStaffModalProps {
  store: Store;
  /** Lahat ng aktibong store staff (cashier, barista, kitchen) */
  staff: Employee[];
  /** Mga naka-check na agad, hal. galing sa "Change shift" */
  initialSelection?: number[];
  onClose: () => void;
  onDeployed: (employees: Employee[]) => void;
}

const fullName = (e: Employee) =>
  e.profile ? `${e.profile.firstName} ${e.profile.lastName}` : (e.username ?? 'Employee');

// Ginagamit lang sa StoresPage: i-deploy ang staff sa store at itakda ang shift (AM/PM).
// Ang pagpapalit ng trabaho (hal. barista → cashier) ay sa Employees page.
function DeployStaffModal({ store, staff, initialSelection = [], onClose, onDeployed }: DeployStaffModalProps) {
  // Kitchen staff ay hindi puwede sa store na walang kitchen
  const isBlocked = (e: Employee) => jobOf(e) === 'KITCHEN' && !store.hasKitchen;

  const [selected, setSelected] = useState<number[]>(initialSelection);
  const [shifts, setShifts] = useState<Record<number, StaffShift | ''>>(() =>
    Object.fromEntries(staff.map((e) => [e.id, e.shift ?? ''])),
  );
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Nauuna ang mga nasa ibang store (sila ang karaniwang dine-deploy); nasa dulo ang hindi puwede
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const blocked = (e: Employee) => Number(jobOf(e) === 'KITCHEN' && !store.hasKitchen);
    return [...staff]
      .filter((e) => !q || `${fullName(e)} ${jobLabel(e)}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          blocked(a) - blocked(b) ||
          Number(a.storeId === store.id) - Number(b.storeId === store.id) ||
          fullName(a).localeCompare(fullName(b)),
      );
  }, [staff, search, store.id, store.hasKitchen]);

  const toggle = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const confirm = async () => {
    setError('');
    setSaving(true);
    try {
      onDeployed(
        await deployStaff(
          store.id,
          selected.map((userId) => ({ userId, shift: shifts[userId] || null })),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deploy the staff.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={userPlusIcon}
      title={`Deploy staff to ${store.name}`}
      description={store.hasKitchen ? 'With kitchen' : 'No kitchen'}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={confirm} loading={saving} disabled={selected.length === 0}>
            {selected.length === 0 ? 'Select staff' : `Deploy ${selected.length} to ${store.name}`}
          </Button>
        </>
      }
    >
      <label className={styles.search}>
        <Icon src={searchIcon} size={16} />
        <span className={styles.srOnly}>Search staff</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff" />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {staff.length === 0 ? (
        <p className={styles.empty}>No store staff yet. Add cashiers, baristas or kitchen staff in Employees first.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((e, index) => {
            const isSelected = selected.includes(e.id);
            const isHere = e.storeId === store.id;
            const blocked = isBlocked(e);
            return (
              <li
                key={e.id}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''} ${blocked ? styles.rowBlocked : ''}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <label className={styles.pick}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSelected}
                    onChange={() => toggle(e.id)}
                    disabled={blocked}
                    aria-label={`Select ${fullName(e)}`}
                  />
                  <UserAvatar name={fullName(e)} size={32} />
                  <span className={styles.meta}>
                    <span className={styles.name}>{fullName(e)}</span>
                    <span className={styles.sub}>
                      {jobLabel(e)} ·{' '}
                      {blocked ? (
                        <strong className={styles.blockedText}>Kitchen is in Alley only</strong>
                      ) : isHere ? (
                        <strong className={styles.here}>Already here</strong>
                      ) : (
                        (e.store?.name ?? 'No store')
                      )}
                    </span>
                  </span>
                </label>

                {!blocked && (
                  <select
                    className={styles.position}
                    value={shifts[e.id]}
                    onChange={(ev) => setShifts((s) => ({ ...s, [e.id]: ev.target.value as StaffShift | '' }))}
                    aria-label={`Shift of ${fullName(e)} in ${store.name}`}
                  >
                    <option value="">No shift</option>
                    <option value="AM">AM shift</option>
                    <option value="PM">PM shift</option>
                  </select>
                )}
              </li>
            );
          })}
          {visible.length === 0 && <li className={styles.empty}>No staff match "{search}".</li>}
        </ul>
      )}
    </Modal>
  );
}

export default DeployStaffModal;
