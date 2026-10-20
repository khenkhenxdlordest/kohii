import XLSX from 'xlsx-js-style';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './ExportReportModal.module.css';

import type { OrderListItem } from '../../../../../types';
import { discountLabel } from '../../../../../utils/salesAggregation';
import { formatDateTime, formatPeso } from '../../../../../utils/format';

import downloadIcon from '../../../../../assets/icons/sidebar/stock-in.svg';

const PREVIEW_LIMIT = 8;

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFCF8' } },
  fill: { fgColor: { rgb: '1F1712' } },
  alignment: { vertical: 'center' },
};

const TOTAL_STYLE = { font: { bold: true }, alignment: { horizontal: 'right' } };
const RIGHT_ALIGN = { alignment: { horizontal: 'right' } };

function exportXlsx(rows: OrderListItem[], totalSum: number) {
  const header = ['Date & Time', 'Store', 'Cashier', 'Items', 'Payment', 'Discount', 'Total'];
  const body = rows.map((r) => [
    formatDateTime(r.createdAt),
    r.storeName,
    r.cashierName,
    r.itemsCount,
    r.paymentMethod,
    discountLabel(r),
    r.total,
  ]);

  const sheetData = [header, ...body, ['', '', '', '', '', 'Total', totalSum]];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  sheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];

  for (let col = 0; col < header.length; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) cell.s = HEADER_STYLE;
  }

  const totalRow = body.length + 1;
  for (let col = 0; col < header.length; col += 1) {
    const ref = XLSX.utils.encode_cell({ r: totalRow, c: col });
    const cell = sheet[ref];
    if (cell) cell.s = col === 6 ? TOTAL_STYLE : { font: { bold: true } };
  }

  // Items column (right-align) at Total column (right-align, peso format)
  for (let row = 1; row <= body.length; row += 1) {
    const itemsCell = sheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
    if (itemsCell) itemsCell.s = RIGHT_ALIGN;
    const totalCell = sheet[XLSX.utils.encode_cell({ r: row, c: 6 })];
    if (totalCell) {
      totalCell.z = '"₱"#,##0.00';
      totalCell.s = RIGHT_ALIGN;
    }
  }
  const totalSumCell = sheet[XLSX.utils.encode_cell({ r: totalRow, c: 6 })];
  if (totalSumCell) totalSumCell.z = '"₱"#,##0.00';

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sales Report');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    buffer,
    `sales-report-${toDateInput(new Date())}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

// Window print → "Save as PDF" sa browser; walang dagdag na library
function exportPdf(rows: OrderListItem[], totalSum: number) {
  const win = window.open('', '_blank');
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${formatDateTime(r.createdAt)}</td><td>${r.storeName}</td><td>${r.cashierName}</td><td style="text-align:right">${r.itemsCount}</td><td>${r.paymentMethod}</td><td>${discountLabel(r)}</td><td style="text-align:right">${formatPeso(r.total)}</td></tr>`,
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
  rows: OrderListItem[];
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
          <Button variant="secondary" onClick={() => exportXlsx(rows, totalSum)} disabled={rows.length === 0}>
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
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.storeName}</td>
                    <td>{row.cashierName}</td>
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
