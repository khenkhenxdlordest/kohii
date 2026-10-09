import DataTable, { type DataTableColumn } from '../DataTable/DataTable';
import styles from './AuditLogTable.module.css';

import type { AuditLogEntry } from '../../../types';

const columns: DataTableColumn<AuditLogEntry>[] = [
  {
    key: 'label',
    header: 'Action',
    width: 180,
    sortValue: (row) => row.label,
    render: (row) => <span className={`${styles.badge} ${styles[row.tone]}`}>{row.label}</span>,
  },
  {
    key: 'subject',
    header: 'Item',
    searchValue: (row) => row.subject,
    render: (row, highlight) => (
      <span className={styles.subject}>
        <span className={styles.subjectName}>{highlight(row.subject)}</span>
        <span className={styles.entity}>{row.entity}</span>
      </span>
    ),
  },
  { key: 'change', header: 'Change', searchValue: (row) => row.change, render: (row, highlight) => <span className={styles.change}>{highlight(row.change)}</span> },
  { key: 'actor', header: 'By', width: 150, searchValue: (row) => row.actor, sortValue: (row) => row.actor },
  {
    key: 'createdAt',
    header: 'When',
    width: 170,
    sortValue: (row) => row.createdAt,
    render: (row) => new Date(row.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
  },
];

/** Reusable table para sa AuditLog entries; ginagamit sa dashboard panel at sa buong Audit Log page */
function AuditLogTable({
  rows,
  searchTerm,
  pageSize,
  emptyMessage,
}: {
  rows: AuditLogEntry[];
  searchTerm?: string;
  pageSize?: number;
  emptyMessage: string;
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      searchTerm={searchTerm}
      pageSize={pageSize}
      emptyMessage={emptyMessage}
    />
  );
}

export default AuditLogTable;
