import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './ExportReportModal.module.css';

import type { MockSaleRow } from '../../../../../utils/mockDashboard';
import { formatDateTime, formatPeso } from '../../../../../utils/format';

import downloadIcon from '../../../../../assets/icons/sidebar/stock-in.svg';

const PREVIEW_LIMIT = 8;

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv(rows: MockSaleRow[]) {
  const header = ['Date & Time', 'Store', 'Cashier', 'Items', 'Payment', 'Discount', 'Total'];
  const lines = rows.map((r) =>
    [formatDateTime(r.dateTime), r.storeName, r.cashier, r.itemsCount, r.paymentMethod, r.discount, r.total]
      .map(csvCell)
      .join(','),
  );
  downloadBlob([header.join(','), ...lines].join('\n'), `sales-report-${toDateInput(new Date())}.csv`, 'text/csv');
}

// Window print → "Save as PDF" sa browser; walang dagdag na library
function exportPdf(rows: MockSaleRow[], totalSum: number) {
  const win = window.open('', '_blank');
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${formatDateTime(r.dateTime)}</td><td>${r.storeName}</td><td>${r.cashier}</td><td style="text-align:right">${r.itemsCount}</td><td>${r.paymentMethod}</td><td>${r.discount}</td><td style="text-align:right">${formatPeso(r.total)}</td></tr>`,
    )
    .join('');
  win.document.write(`
    <html>
      <head>
        <title>Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #2a211b; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p { color: #8c7d71; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border-bottom: 1px solid #e6dbcd; padding: 6px 8px; text-align: left; }
          th { background: #f6efe6; }
          tfoot td { font-weight: bold; border-top: 2px solid #1f1712; }
        </style>
      </head>
      <body>
        <h1>Kohii Cafe by Riri — Sales Report</h1>
        <p>Generated ${formatDateTime(new Date().toISOString())} · ${rows.length} orders</p>
        <table>
          <thead><tr><th>Date &amp; Time</th><th>Store</th><th>Cashier</th><th>Items</th><th>Payment</th><th>Discount</th><th>Total</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr><td colspan="6">Total</td><td style="text-align:right">${formatPeso(totalSum)}</td></tr></tfoot>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export interface ExportReportModalProps {
  rows: MockSaleRow[];
  rangeLabel: string;
  onClose: () => void;
}

// Preview + download ng filtered sales report (Excel/CSV o PDF); walang galaw sa totoong datos
function ExportReportModal({ rows, rangeLabel, onClose }: ExportReportModalProps) {
  const totalSum = rows.reduce((sum, r) => sum + r.total, 0);
  const preview = rows.slice(0, PREVIEW_LIMIT);
  const hiddenCount = rows.length - preview.length;

  return (
    <Modal
      open
      icon={downloadIcon}
      title="Export sales report"
      description={rangeLabel}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => exportCsv(rows)} disabled={rows.length === 0}>
            Download Excel
          </Button>
          <Button onClick={() => exportPdf(rows, totalSum)} disabled={rows.length === 0}>
            Download PDF
          </Button>
        </>
      }
    >
      <div className={styles.summary}>
        <span>
          <strong>{rows.length}</strong> orders
        </span>
        <span>
          <strong>{formatPeso(totalSum)}</strong> total
        </span>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>Nothing to export for this filter.</p>
      ) : (
        <>
          <p className={styles.previewLabel}>Preview</p>
          <div className={styles.previewTableWrap}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Store</th>
                  <th>Cashier</th>
                  <th className={styles.alignRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.dateTime)}</td>
                    <td>{row.storeName}</td>
                    <td>{row.cashier}</td>
                    <td className={styles.alignRight}>{formatPeso(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hiddenCount > 0 && <p className={styles.more}>and {hiddenCount} more row{hiddenCount === 1 ? '' : 's'}...</p>}
        </>
      )}
    </Modal>
  );
}

export default ExportReportModal;
