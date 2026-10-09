import { useEffect, useState } from 'react';
import styles from './StoresPage.module.css';

import Button from '../../../components/ui/Button/Button';
import UserAvatar from '../../../components/ui/UserAvatar/UserAvatar';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import DeployStaffModal from '../../../components/modal/admin/StoresPage/DeployStaffModal/DeployStaffModal';
import { deployStaff, getStores } from '../../../api/stores.api';
import { getEmployees } from '../../../api/employees.api';
import type { Employee, StaffPosition, Store } from '../../../types';
import { positionLabels, positionOrder, shiftLabels } from '../../../utils/roles';

import userPlusIcon from '../../../assets/icons/actions/user-plus.svg';
import editIcon from '../../../assets/icons/actions/edit.svg';
import moveIcon from '../../../assets/icons/sidebar/stock-movements.svg';

const fullName = (u: Employee) =>
  u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : (u.username ?? 'Employee');

type DeployState = { store: Store; initialSelection: number[] } | null;

function StoresPage() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deploy, setDeploy] = useState<DeployState>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([getStores(), getEmployees()])
      .then(([storeList, userList]) => {
        if (ignore) return;
        setStores(storeList);
        // Store staff lang (cashier, barista, kitchen) na aktibo, may login man o wala
        setStaff(userList.filter((u) => u.position !== null && u.isActive));
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Ina-update ang staff at ang bilang bawat posisyon sa bawat store
  const applyDeployed = (deployed: Employee[]) => {
    const next = staff.map((u) => deployed.find((d) => d.id === u.id) ?? u);
    setStaff(next);
    setStores(
      (current) =>
        current?.map((store) => ({
          ...store,
          staffCount: Object.fromEntries(
            positionOrder.map((p) => [p, next.filter((u) => u.storeId === store.id && u.position === p).length]),
          ) as Record<StaffPosition, number>,
        })) ?? null,
    );
  };

  const moveTo = async (user: Employee, target: Store) => {
    setActionError('');
    setBusyId(user.id);
    try {
      const deployed = await deployStaff(target.id, [{ userId: user.id, shift: user.shift }]);
      applyDeployed(deployed);
      setNotice(`${fullName(user)} moved to ${target.name}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not move the staff.');
    } finally {
      setBusyId(null);
    }
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'name',
      header: 'Staff',
      sortValue: (u) => fullName(u),
      render: (u) => (
        <span className={styles.person}>
          <UserAvatar name={fullName(u)} size={32} />
          <span className={styles.personText}>
            <span className={styles.name}>{fullName(u)}</span>
            {u.username ? (
              <span className={styles.username}>@{u.username}</span>
            ) : (
              <span className={styles.username}>No login</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      width: 140,
      sortValue: (u) => (u.position ? positionOrder.indexOf(u.position) : null),
      render: (u) =>
        u.position && (
          <span className={`${styles.positionBadge} ${styles[u.position]}`}>{positionLabels[u.position]}</span>
        ),
    },
    {
      key: 'shift',
      header: 'Shift',
      width: 130,
      sortValue: (u) => u.shift ?? '',
      render: (u) =>
        u.shift ? (
          <span className={`${styles.shiftBadge} ${styles[`shift${u.shift}`]}`}>{shiftLabels[u.shift]}</span>
        ) : (
          <span className={styles.muted}>Not set</span>
        ),
    },
  ];

  const actionsFor = (store: Store): DataTableAction<Employee>[] => [
    {
      id: 'shift',
      label: 'Change shift',
      icon: editIcon,
      onClick: (u) => setDeploy({ store, initialSelection: [u.id] }),
    },
    // Isang action bawat ibang store: "Move to Podium" / "Move to Alley"
    ...(stores ?? [])
      .filter((other) => other.id !== store.id)
      .map((other): DataTableAction<Employee> => ({
        id: `move-${other.id}`,
        label: `Move to ${other.name}`,
        icon: moveIcon,
        tone: 'success',
        // Kitchen staff ay hindi puwedeng ilipat sa store na walang kitchen
        hidden: (u) => u.position === 'KITCHEN' && !other.hasKitchen,
        onClick: (u) => moveTo(u, other),
      })),
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stores</h1>
          <p className={styles.subtitle}>Deploy staff to Alley or Podium and set their AM or PM shift.</p>
        </div>
      </header>

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoadError('');
              setStores(null);
              setReloadKey((k) => k + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : stores === null ? (
        <p className={styles.state}>Loading stores...</p>
      ) : (
        <div className={styles.stores}>
          {stores.map((store, index) => {
            const storeStaff = staff.filter((u) => u.storeId === store.id);
            return (
              <section
                key={store.id}
                className={styles.store}
                style={{ animationDelay: `${index * 80}ms` }}
                aria-labelledby={`store-${store.id}`}
              >
                <header className={styles.storeHeader}>
                  <div className={styles.storeInfo}>
                    <h2 id={`store-${store.id}`} className={styles.storeName}>
                      {store.name}
                      <span className={styles.storeCode}>{store.code}</span>
                    </h2>
                    <p className={styles.storeMeta}>
                      <span className={`${styles.kitchenTag} ${store.hasKitchen ? styles.kitchenYes : ''}`}>
                        {store.hasKitchen ? 'With kitchen' : 'No kitchen'}
                      </span>
                    </p>
                  </div>

                  <div className={styles.counts}>
                    {positionOrder
                      .filter((p) => p !== 'KITCHEN' || store.hasKitchen)
                      .map((p) => (
                        <span key={p} className={styles.count}>
                          <span className={styles.countValue}>{store.staffCount[p]}</span>
                          {positionLabels[p]}
                        </span>
                      ))}
                  </div>

                  <Button icon={userPlusIcon} onClick={() => setDeploy({ store, initialSelection: [] })}>
                    Deploy staff
                  </Button>
                </header>

                <DataTable
                  rows={storeStaff}
                  columns={columns}
                  actions={actionsFor(store)}
                  getRowId={(u) => u.id}
                  busyRowId={busyId}
                  pageSize={6}
                  emptyMessage={`No staff deployed to ${store.name} yet. Click Deploy staff.`}
                />
              </section>
            );
          })}
        </div>
      )}

      {deploy && (
        <DeployStaffModal
          store={deploy.store}
          staff={staff}
          initialSelection={deploy.initialSelection}
          onClose={() => setDeploy(null)}
          onDeployed={(deployed) => {
            applyDeployed(deployed);
            setNotice(`${deployed.length} staff deployed to ${deploy.store.name}.`);
            setDeploy(null);
          }}
        />
      )}
    </section>
  );
}

export default StoresPage;
