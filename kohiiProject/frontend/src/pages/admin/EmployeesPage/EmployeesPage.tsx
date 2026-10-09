import { useEffect, useMemo, useState } from 'react';
import styles from './EmployeesPage.module.css';

import Button from '../../../components/ui/Button/Button';
import Icon from '../../../components/ui/Icon/Icon';
import StatCard from '../../../components/ui/StatCard/StatCard';
import UserAvatar from '../../../components/ui/UserAvatar/UserAvatar';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import EmployeeFormModal from '../../../components/modal/admin/EmployeesPage/EmployeeFormModal/EmployeeFormModal';
import ResetPasswordModal from '../../../components/modal/admin/EmployeesPage/ResetPasswordModal/ResetPasswordModal';
import DeactivateEmployeesModal from '../../../components/modal/admin/EmployeesPage/DeactivateEmployeesModal/DeactivateEmployeesModal';
import { getEmployees, setEmployeesStatus } from '../../../api/employees.api';
import { getStores } from '../../../api/stores.api';
import { useAuth } from '../../../hooks/useAuth';
import type { Employee, Job, Store } from '../../../types';
import { jobLabels, jobOf, jobOrder } from '../../../utils/roles';
import { formatDateTime } from '../../../utils/format';

import userPlusIcon from '../../../assets/icons/actions/user-plus.svg';
import editIcon from '../../../assets/icons/actions/edit.svg';
import keyIcon from '../../../assets/icons/actions/key.svg';
import powerIcon from '../../../assets/icons/actions/power.svg';
import searchIcon from '../../../assets/icons/actions/search.svg';

type JobFilter = Job | 'ALL';
type StatusFilter = 'active' | 'inactive' | 'all';

// undefined = sarado; null = bagong employee; Employee = edit
type FormState = Employee | null | undefined;

const fullName = (e: Employee) =>
  e.profile ? `${e.profile.firstName} ${e.profile.lastName}` : (e.username ?? 'Employee');

function EmployeesPage() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<JobFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const [form, setForm] = useState<FormState>(undefined);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [deactivateTargets, setDeactivateTargets] = useState<Employee[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activating, setActivating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([getEmployees(), getStores(true)])
      .then(([employeeList, storeList]) => {
        if (ignore) return;
        setEmployees(employeeList);
        setStores(storeList);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Mawawala ang notice pagkalipas ng ilang segundo
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const list = useMemo(() => employees ?? [], [employees]);
  const active = list.filter((e) => e.isActive);
  const countJob = (job: Job) => active.filter((e) => jobOf(e) === job).length;

  const rows = useMemo(
    () =>
      list.filter(
        (e) =>
          (jobFilter === 'ALL' || jobOf(e) === jobFilter) &&
          (statusFilter === 'all' || e.isActive === (statusFilter === 'active')),
      ),
    [list, jobFilter, statusFilter],
  );

  const selected = list.filter((e) => selectedIds.includes(e.id));
  const selectedActive = selected.filter((e) => e.isActive && e.id !== currentUser?.id);
  const selectedInactive = selected.filter((e) => !e.isActive);

  const retry = () => {
    setLoadError('');
    setEmployees(null);
    setReloadKey((k) => k + 1);
  };

  const replaceEmployees = (saved: Employee[]) => {
    setEmployees((current) => {
      const next = [...(current ?? [])];
      for (const employee of saved) {
        const index = next.findIndex((e) => e.id === employee.id);
        if (index === -1) next.push(employee);
        else next[index] = employee;
      }
      return next;
    });
  };

  const activate = async (targets: Employee[]) => {
    setActionError('');
    if (targets.length === 1) setBusyId(targets[0].id);
    else setActivating(true);
    try {
      replaceEmployees(
        await setEmployeesStatus(
          targets.map((e) => e.id),
          true,
        ),
      );
      setSelectedIds((ids) => ids.filter((id) => !targets.some((e) => e.id === id)));
      setNotice(
        targets.length === 1 ? `${fullName(targets[0])} is active again.` : `${targets.length} employees activated.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not activate the employee(s).');
    } finally {
      setBusyId(null);
      setActivating(false);
    }
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      searchValue: (e) => `${fullName(e)} ${e.username ?? ''}`,
      sortValue: (e) => fullName(e),
      render: (e, highlight) => (
        <span className={styles.person}>
          <UserAvatar name={fullName(e)} size={34} />
          <span className={styles.personText}>
            <span className={styles.name}>
              {highlight(fullName(e))}
              {e.id === currentUser?.id && <span className={styles.youTag}>You</span>}
            </span>
            {e.username ? (
              <span className={styles.username}>@{highlight(e.username)}</span>
            ) : (
              <span className={styles.noLogin}>No login</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      width: 150,
      searchValue: (e) => jobLabels[jobOf(e)],
      sortValue: (e) => jobOrder.indexOf(jobOf(e)),
      render: (e, highlight) => (
        <span className={`${styles.jobBadge} ${styles[jobOf(e)]}`}>{highlight(jobLabels[jobOf(e)])}</span>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      width: 110,
      searchValue: (e) => e.store?.name ?? '',
      sortValue: (e) => e.store?.name ?? '',
      render: (e, highlight) =>
        e.store ? (
          <span className={styles.storeName}>{highlight(e.store.name)}</span>
        ) : (
          <span className={styles.muted}>All</span>
        ),
    },
    {
      key: 'shift',
      header: 'Shift',
      width: 100,
      searchValue: (e) => e.shift ?? '',
      sortValue: (e) => e.shift ?? '',
      render: (e, highlight) =>
        e.shift ? (
          <span className={`${styles.shiftBadge} ${styles[`shift${e.shift}`]}`}>{highlight(e.shift)}</span>
        ) : jobOf(e) === 'ADMIN' || jobOf(e) === 'CLERK' ? (
          <span className={styles.muted}>None</span>
        ) : (
          <span className={styles.muted}>Not set</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 160,
      sortValue: (e) => (e.isActive ? (e.mustChangePassword && e.username ? 1 : 0) : 2),
      render: (e) => (
        <span className={styles.statusStack}>
          <span className={`${styles.status} ${e.isActive ? styles.statusActive : styles.statusInactive}`}>
            <span className={styles.statusDot} />
            {e.isActive ? 'Active' : 'Deactivated'}
          </span>
          {e.isActive && e.username && e.mustChangePassword && (
            <span className={styles.pendingTag}>Temporary password</span>
          )}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      width: 190,
      searchValue: (e) => `${e.profile?.contactNo ?? ''} ${e.profile?.email ?? ''}`,
      render: (e, highlight) =>
        e.profile?.contactNo || e.profile?.email ? (
          <span className={styles.contact}>
            {e.profile?.contactNo && <span>{highlight(e.profile.contactNo)}</span>}
            {e.profile?.email && <span className={styles.email}>{highlight(e.profile.email)}</span>}
          </span>
        ) : (
          <span className={styles.muted}>None</span>
        ),
    },
    {
      key: 'lastLogin',
      header: 'Last login',
      width: 160,
      sortValue: (e) => (e.lastLoginAt ? new Date(e.lastLoginAt).getTime() : null),
      render: (e) =>
        !e.username ? (
          <span className={styles.muted}>No login</span>
        ) : e.lastLoginAt ? (
          <span className={styles.date}>{formatDateTime(e.lastLoginAt)}</span>
        ) : (
          <span className={styles.muted}>Never</span>
        ),
    },
  ];

  const actions: DataTableAction<Employee>[] = [
    { id: 'edit', label: 'Edit', icon: editIcon, onClick: (e) => setForm(e) },
    {
      id: 'reset',
      label: 'Reset password',
      icon: keyIcon,
      // Para sa may login lang (owner, clerk, cashier)
      hidden: (e) => !e.username,
      onClick: (e) => setResetTarget(e),
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      icon: powerIcon,
      tone: 'danger',
      // Hindi puwedeng i-deactivate ang sariling account
      hidden: (e) => !e.isActive || e.id === currentUser?.id,
      onClick: (e) => setDeactivateTargets([e]),
    },
    {
      id: 'activate',
      label: 'Activate',
      icon: powerIcon,
      tone: 'success',
      hidden: (e) => e.isActive,
      onClick: (e) => activate([e]),
    },
  ];

  const selectionCount = selectedIds.length;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Employees</h1>
          <p className={styles.subtitle}>
            Let's manage your team. Only the owner, inventory clerk and cashiers can log in.
          </p>
        </div>
        <Button icon={userPlusIcon} onClick={() => setForm(null)} disabled={employees === null}>
          Add employee
        </Button>
      </header>

      <div className={styles.cards}>
        <StatCard
          variant="users"
          title="Total Employees"
          value={active.length}
          caption={`${list.length - active.length} deactivated`}
        />
        <StatCard variant="cashiers" title="Cashiers" value={countJob('CASHIER')} caption="Alley and Podium" />
        <StatCard variant="baristas" title="Baristas" value={countJob('BARISTA')} caption="Alley and Podium" />
        <StatCard variant="kitchen" title="Kitchen" value={countJob('KITCHEN')} caption="Alley only" />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.jobChips} role="group" aria-label="Filter by job">
          {(['ALL', ...jobOrder] as JobFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.jobChip} ${jobFilter === value ? styles.jobChipActive : ''}`}
              aria-pressed={jobFilter === value}
              onClick={() => setJobFilter(value)}
            >
              {value === 'ALL' ? 'All' : jobLabels[value]}
            </button>
          ))}
        </div>

        <label className={styles.search}>
          <Icon src={searchIcon} size={18} />
          <span className={styles.srOnly}>Search employees</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Try searching 'Barista' or 'Alley'"
          />
        </label>

        <div className={styles.segmented} role="group" aria-label="Status">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              className={statusFilter === value ? styles.segmentActive : ''}
              aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
            >
              {value === 'all' ? 'All' : value === 'active' ? 'Active' : 'Deactivated'}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p className={styles.alert} role="alert">
          {actionError}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {loadError ? (
        <div className={styles.state}>
          <p>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : employees === null ? (
        <p className={styles.state}>Loading employees...</p>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          actions={actions}
          getRowId={(e) => e.id}
          searchTerm={search}
          isRowMuted={(e) => !e.isActive}
          busyRowId={busyId}
          pageSize={8}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isRowSelectable={(e) => e.id !== currentUser?.id}
          emptyMessage="No employees match your filters."
        />
      )}

      {/* Floating na selection bar (lumalabas kapag may napiling employee) */}
      <div
        className={`${styles.selectionBar} ${selectionCount > 0 && deactivateTargets.length === 0 ? styles.selectionBarOpen : ''}`}
        aria-hidden={selectionCount === 0}
      >
        <span className={styles.selectionCount}>
          <span key={selectionCount} className={styles.selectionNumber}>
            {selectionCount}
          </span>{' '}
          {selectionCount === 1 ? 'employee' : 'employees'} selected
        </span>
        <button
          type="button"
          className={styles.selectionButton}
          onClick={() => setSelectedIds([])}
          tabIndex={selectionCount ? 0 : -1}
        >
          Deselect all
        </button>
        {selectedInactive.length > 0 && (
          <button
            type="button"
            className={`${styles.selectionButton} ${styles.selectionActivate}`}
            onClick={() => activate(selectedInactive)}
            disabled={activating}
          >
            {activating ? 'Activating...' : `Activate (${selectedInactive.length})`}
          </button>
        )}
        {selectedActive.length > 0 && (
          <button
            type="button"
            className={`${styles.selectionButton} ${styles.selectionDeactivate}`}
            onClick={() => setDeactivateTargets(selectedActive)}
          >
            <Icon src={powerIcon} size={15} />
            Deactivate ({selectedActive.length})
          </button>
        )}
      </div>

      {form !== undefined && (
        <EmployeeFormModal
          employee={form}
          stores={stores}
          currentUserId={currentUser?.id}
          onClose={() => setForm(undefined)}
          onSaved={(saved) => {
            replaceEmployees([saved]);
            setNotice(form === null ? `${fullName(saved)} was added.` : `${fullName(saved)} updated.`);
            setForm(undefined);
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSaved={(saved) => {
            replaceEmployees([saved]);
            setNotice(`Password reset for ${fullName(saved)}.`);
            setResetTarget(null);
          }}
        />
      )}

      {deactivateTargets.length > 0 && (
        <DeactivateEmployeesModal
          users={deactivateTargets}
          onClose={() => setDeactivateTargets([])}
          onDone={(saved) => {
            replaceEmployees(saved);
            setSelectedIds((ids) => ids.filter((id) => !saved.some((e) => e.id === id)));
            setNotice(
              saved.length === 1 ? `${fullName(saved[0])} was deactivated.` : `${saved.length} employees deactivated.`,
            );
            setDeactivateTargets([]);
          }}
        />
      )}
    </section>
  );
}

export default EmployeesPage;
