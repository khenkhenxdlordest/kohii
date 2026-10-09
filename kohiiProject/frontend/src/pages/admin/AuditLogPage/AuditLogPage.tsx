import { useEffect, useMemo, useState } from 'react';
import styles from './AuditLogPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import Button from '../../../components/ui/Button/Button';
import AuditLogTable from '../../../components/ui/AuditLogTable/AuditLogTable';
import DateRangeFilter, { defaultDateRangeValue, type DateRangeValue } from '../../../components/ui/DateRangeFilter/DateRangeFilter';
import { getAuditLog } from '../../../api/auditLog.api';
import type { AuditLogEntry } from '../../../types';

import searchIcon from '../../../assets/icons/actions/search.svg';

type EntityFilter = 'all' | string;

const PAGE_LIMIT = 200;

function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRangeValue);

  useEffect(() => {
    let ignore = false;
    getAuditLog(PAGE_LIMIT)
      .then((rows) => {
        if (!ignore) setEntries(rows);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const entityOptions = useMemo(() => {
    const unique = [...new Set((entries ?? []).map((e) => e.entity))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const shownEntries = useMemo(() => {
    return (entries ?? []).filter((e) => {
      if (entityFilter !== 'all' && e.entity !== entityFilter) return false;
      const day = e.createdAt.slice(0, 10);
      if (dateRange.from && day < dateRange.from) return false;
      if (dateRange.to && day > dateRange.to) return false;
      return true;
    });
  }, [entries, entityFilter, dateRange]);

  const retry = () => {
    setLoadError('');
    setEntries(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Log</h1>
          <p className={styles.subtitle}>Every create, edit, price change and deactivate across the system.</p>
        </div>
      </header>

      {loadError ? (
        <div className={styles.state}>
          <p>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon src={searchIcon} size={18} />
              <span className={styles.srOnly}>Search activity</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, change or who did it"
              />
            </label>

            {entityOptions.length > 0 && (
              <div className={styles.segmented} role="group" aria-label="Entity">
                <button
                  type="button"
                  className={entityFilter === 'all' ? styles.segmentActive : ''}
                  aria-pressed={entityFilter === 'all'}
                  onClick={() => setEntityFilter('all')}
                >
                  All
                </button>
                {entityOptions.map((entity) => (
                  <button
                    key={entity}
                    type="button"
                    className={entityFilter === entity ? styles.segmentActive : ''}
                    aria-pressed={entityFilter === entity}
                    onClick={() => setEntityFilter(entity)}
                  >
                    {entity}
                  </button>
                ))}
              </div>
            )}

            <DateRangeFilter value={dateRange} onApply={setDateRange} />
          </div>

          <AuditLogTable
            rows={shownEntries}
            searchTerm={search}
            pageSize={15}
            emptyMessage={entries === null ? 'Loading...' : 'No activity yet.'}
          />
        </>
      )}
    </section>
  );
}

export default AuditLogPage;
