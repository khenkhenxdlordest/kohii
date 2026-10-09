import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import Icon from '../../../../ui/Icon/Icon';
import styles from './EmployeeFormModal.module.css';

import { createEmployee, updateEmployee } from '../../../../../api/employees.api';
import type { Employee, Job, StaffShift, Store } from '../../../../../types';
import { jobHasLogin, jobIsStoreStaff, jobLabels, jobOf, jobOrder, shiftLabels } from '../../../../../utils/roles';
import { generateTempPassword } from '../../../../../utils/tempPassword';

import userPlusIcon from '../../../../../assets/icons/actions/user-plus.svg';
import editIcon from '../../../../../assets/icons/actions/edit.svg';
import eyeOpenIcon from '../../../../../assets/icons/login/eye-open.svg';
import eyeCloseIcon from '../../../../../assets/icons/login/eye-close.svg';

interface EmployeeFormModalProps {
  /** null = bagong employee; may laman = edit */
  employee: Employee | null;
  stores: Store[];
  /** Para hindi mapalitan ng owner ang sarili niyang trabaho */
  currentUserId: number | undefined;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
}

const jobHints: Record<Job, string> = {
  ADMIN: 'Menu, prices, employees, reports',
  CLERK: 'Inventory, stock in, adjustments',
  CASHIER: 'POS and sales in one store',
  BARISTA: 'Makes drinks. Listed for store and shift',
  KITCHEN: 'Alley kitchen only',
};

const shifts: StaffShift[] = ['AM', 'PM'];

// Ginagamit lang sa EmployeesPage (Add employee / Edit)
function EmployeeFormModal({ employee, stores, currentUserId, onClose, onSaved }: EmployeeFormModalProps) {
  const isEdit = employee !== null;
  const isSelf = isEdit && employee.id === currentUserId;
  const activeStores = stores.filter((s) => s.isActive || s.id === employee?.storeId);
  const originalJob = employee ? jobOf(employee) : null;

  const [firstName, setFirstName] = useState(employee?.profile?.firstName ?? '');
  const [middleName, setMiddleName] = useState(employee?.profile?.middleName ?? '');
  const [lastName, setLastName] = useState(employee?.profile?.lastName ?? '');
  const [contactNo, setContactNo] = useState(employee?.profile?.contactNo ?? '');
  const [email, setEmail] = useState(employee?.profile?.email ?? '');
  const [job, setJob] = useState<Job>(originalJob ?? 'BARISTA');
  const [storeId, setStoreId] = useState(String(employee?.storeId ?? activeStores[0]?.id ?? ''));
  const [shift, setShift] = useState<StaffShift | ''>(employee?.shift ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(generateTempPassword);
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isStaff = jobIsStoreStaff[job];
  const selectedStore = activeStores.find((s) => s.id === Number(storeId));
  // Kailangan ng bagong login kapag bago, o kapag walang login dati (hal. barista → cashier)
  const needsLogin = jobHasLogin[job] && (!isEdit || !employee.username);
  // Kitchen ay sa store lang na may kitchen (Alley)
  const kitchenStore = activeStores.find((s) => s.hasKitchen);

  const chooseJob = (next: Job) => {
    setJob(next);
    if (next === 'KITCHEN' && kitchenStore && !selectedStore?.hasKitchen) setStoreId(String(kitchenStore.id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const staffFields = isStaff ? { storeId: Number(storeId) || null, shift: shift || null } : {};
    const loginFields = needsLogin ? { username: username.trim().toLowerCase(), password } : {};
    try {
      const saved = isEdit
        ? await updateEmployee(employee.id, {
            firstName,
            middleName: middleName.trim() || null,
            lastName,
            contactNo: contactNo.trim() || null,
            email: email.trim() || null,
            ...(isSelf ? {} : { job, ...staffFields, ...loginFields }),
          })
        : await createEmployee({
            job,
            ...staffFields,
            ...loginFields,
            firstName,
            middleName: middleName.trim() || undefined,
            lastName,
            contactNo: contactNo.trim() || undefined,
            email: email.trim() || undefined,
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the employee.');
      setSaving(false);
    }
  };

  const losesLogin = isEdit && Boolean(employee.username) && !jobHasLogin[job];

  return (
    <Modal
      open
      icon={isEdit ? editIcon : userPlusIcon}
      title={isEdit ? 'Edit employee' : 'Add employee'}
      description={isEdit ? (employee.username ? `@${employee.username}` : 'No login account') : 'Add a staff member.'}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

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
                autoFocus
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
          <legend className={styles.sectionTitle}>Job</legend>
          {isSelf && <p className={styles.note}>You cannot change your own job.</p>}
          <div className={styles.jobList}>
            {jobOrder.map((value) => (
              <label
                key={value}
                className={`${styles.jobOption} ${job === value ? styles.jobOptionActive : ''} ${isSelf ? styles.jobOptionDisabled : ''}`}
              >
                <input
                  type="radio"
                  name="employee-job"
                  value={value}
                  checked={job === value}
                  onChange={() => chooseJob(value)}
                  disabled={isSelf}
                />
                <span className={styles.jobText}>
                  <span className={styles.jobLabel}>{jobLabels[value]}</span>
                  <span className={styles.jobHint}>{jobHints[value]}</span>
                  <span className={`${styles.loginTag} ${jobHasLogin[value] ? styles.loginYes : ''}`}>
                    {jobHasLogin[value] ? 'Can log in' : 'No login'}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {losesLogin && (
            <p className={styles.warning}>
              {jobLabels[job]} has no login. The username @{employee.username} and password will be removed.
            </p>
          )}
        </fieldset>

        {isStaff && (
          <fieldset className={`${styles.section} ${styles.reveal}`}>
            <legend className={styles.sectionTitle}>Store and shift</legend>
            <div className={styles.storeList} role="radiogroup" aria-label="Store">
              {activeStores.map((store) => {
                const blocked = job === 'KITCHEN' && !store.hasKitchen;
                return (
                  <label
                    key={store.id}
                    className={`${styles.storeOption} ${Number(storeId) === store.id ? styles.storeOptionActive : ''} ${blocked || isSelf ? styles.jobOptionDisabled : ''}`}
                    title={blocked ? `${store.name} has no kitchen` : undefined}
                  >
                    <input
                      type="radio"
                      name="employee-store"
                      value={store.id}
                      checked={Number(storeId) === store.id}
                      onChange={() => setStoreId(String(store.id))}
                      disabled={blocked || isSelf}
                    />
                    <span>
                      <span className={styles.jobLabel}>{store.name}</span>
                      <span className={styles.jobHint}>
                        {store.hasKitchen ? 'With kitchen' : 'No kitchen'}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className={styles.shiftRow}>
              <span className={styles.label}>Shift</span>
              <div className={styles.shiftChips} role="radiogroup" aria-label="Shift">
                {shifts.map((value) => (
                  <label key={value} className={`${styles.shiftChip} ${shift === value ? styles.shiftChipActive : ''}`}>
                    <input
                      type="radio"
                      name="employee-shift"
                      value={value}
                      checked={shift === value}
                      onChange={() => setShift(value)}
                      disabled={isSelf}
                    />
                    {shiftLabels[value]}
                  </label>
                ))}
                <label className={`${styles.shiftChip} ${shift === '' ? styles.shiftChipActive : ''}`}>
                  <input
                    type="radio"
                    name="employee-shift"
                    value=""
                    checked={shift === ''}
                    onChange={() => setShift('')}
                    disabled={isSelf}
                  />
                  Not set
                </label>
              </div>
            </div>
          </fieldset>
        )}

        {needsLogin && !isSelf && (
          <fieldset className={`${styles.section} ${styles.reveal}`}>
            <legend className={styles.sectionTitle}>Login</legend>
            {isEdit && <p className={styles.note}>{jobLabels[job]} can log in, so this employee needs an account.</p>}
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Username</span>
                <input
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="e.g. cashier3"
                  pattern="[a-z0-9._]{3,30}"
                  title="3-30 characters: letters, numbers, dot or underscore"
                  autoComplete="off"
                  required
                />
              </label>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="temp-password">
                  Temporary password
                </label>
                <div className={styles.passwordWrap}>
                  <input
                    id="temp-password"
                    className={styles.passwordInput}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
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
                  <button
                    type="button"
                    className={styles.generateButton}
                    onClick={() => setPassword(generateTempPassword())}
                  >
                    New
                  </button>
                </div>
              </div>
            </div>
            <p className={styles.note}>
              Give this password to the employee. They will be asked to change it on their first login.
            </p>
          </fieldset>
        )}
      </form>
    </Modal>
  );
}

export default EmployeeFormModal;
