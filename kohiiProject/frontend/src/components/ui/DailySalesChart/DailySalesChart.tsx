import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './DailySalesChart.module.css';
import Icon from '../Icon/Icon';
import { formatPeso } from '../../../utils/format';

import downloadIcon from '../../../assets/icons/sidebar/stock-in.svg';
import closeIcon from '../../../assets/icons/actions/close.svg';

export interface DailySalesPoint {
  /** YYYY-MM-DD */
  day: string;
  orders: number;
  total: number;
}

export type ChartGranularity = 'day' | 'month' | 'year';

interface ChartPoint extends DailySalesPoint {
  granularity: ChartGranularity;
}

const CHART_HEIGHT = 180;
const FULLSCREEN_HEIGHT = 420;
const CLOSE_MS = 200;
const MAX_LABELS = 8;

const viewModeOptions: { value: ChartGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

// Kahit gaano karaming araw ang ipinasa (para sa Monthly/Yearly), itong dami
// lang ang ipapakita sa Daily view - kundi, nagiging siksik/hirap basahin
const DAILY_WINDOW = 30;

function toDailyPoints(data: DailySalesPoint[]): ChartPoint[] {
  return data.slice(-DAILY_WINDOW).map((d) => ({ ...d, granularity: 'day' }));
}

/** Kinakabuuan ang mga araw bawat buwan (hal. 2026-07-01) */
function toMonthlyPoints(data: DailySalesPoint[]): ChartPoint[] {
  const byMonth = new Map<string, { orders: number; total: number }>();
  for (const d of data) {
    const key = `${d.day.slice(0, 7)}-01`;
    const entry = byMonth.get(key) ?? { orders: 0, total: 0 };
    entry.orders += d.orders;
    entry.total += d.total;
    byMonth.set(key, entry);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, ...v, granularity: 'month' }));
}

/** Kinakabuuan ang mga araw bawat taon (hal. 2026-01-01) */
function toYearlyPoints(data: DailySalesPoint[]): ChartPoint[] {
  const byYear = new Map<string, { orders: number; total: number }>();
  for (const d of data) {
    const key = `${d.day.slice(0, 4)}-01-01`;
    const entry = byYear.get(key) ?? { orders: 0, total: 0 };
    entry.orders += d.orders;
    entry.total += d.total;
    byYear.set(key, entry);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, ...v, granularity: 'year' }));
}

function toChartPoints(data: DailySalesPoint[], mode: ChartGranularity): ChartPoint[] {
  if (mode === 'month') return toMonthlyPoints(data);
  if (mode === 'year') return toYearlyPoints(data);
  return toDailyPoints(data);
}

// Kohii brand colors, para pareho ang itsura ng on-screen chart at ng na-export na imahe
const COLORS = {
  surface: '#fffcf8',
  line: '#e6dbcd',
  ink: '#2a211b',
  muted: '#8c7d71',
  espresso: '#1f1712',
};

/** Pinakamalapit na "maayos" na number (1/2/5/10 × 10^n), para klaro ang gridline */
function niceNumber(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

const AXIS_STEPS = 2;
// Kung diretso lang mag-round pataas (hal. 22,474 -> 50,000), kalahati ng chart ay walang laman.
// Tinitiyak nito na ang pinakamataas na bar ay umaabot ng hindi bababa sa 80% ng taas
const AXIS_FILL_THRESHOLD = 0.8;

function axisMax(values: number[]) {
  const rawMax = Math.max(...values, 1);
  const baseStep = niceNumber(rawMax / AXIS_STEPS);
  const baseMax = baseStep * AXIS_STEPS;
  const adjustedRawMax = rawMax >= baseMax * AXIS_FILL_THRESHOLD ? rawMax / AXIS_FILL_THRESHOLD : rawMax;
  const step = Math.max(1, niceNumber(adjustedRawMax / AXIS_STEPS));
  return step * AXIS_STEPS;
}

const shortDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

const fullDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' });

const monthShort = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

const monthFull = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

const yearLabel = (day: string) => day.slice(0, 4);

function pointShortLabel(p: ChartPoint) {
  if (p.granularity === 'year') return yearLabel(p.day);
  if (p.granularity === 'month') return monthShort(p.day);
  return shortDate(p.day);
}

const monthTick = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short' });

/** Mas maikli pa kaysa pointShortLabel - para sa x-axis column na makitid ang puwang */
function pointTickLabel(p: ChartPoint) {
  if (p.granularity === 'year') return yearLabel(p.day);
  if (p.granularity === 'month') return monthTick(p.day);
  return shortDate(p.day);
}

function pointFullLabel(p: ChartPoint) {
  if (p.granularity === 'year') return yearLabel(p.day);
  if (p.granularity === 'month') return monthFull(p.day);
  return fullDate(p.day);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/** Guhit ng buong chart (bars + gridlines + value labels + table ng datos) papunta sa canvas, para sa PNG/JPEG export */
function renderChartImage(data: ChartPoint[], maxTotal: number, title: string, format: 'png' | 'jpeg'): string | null {
  const rowHeight = 22;
  const tableTop = 240;
  const tableHeight = 40 + data.length * rowHeight;
  const width = Math.max(720, data.length * 70);
  const height = tableTop + tableHeight + 24;

  const canvas = document.createElement('canvas');
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(ratio, ratio);

  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = COLORS.espresso;
  ctx.font = '700 18px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(title, 24, 20);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '400 12px Arial, sans-serif';
  ctx.fillText(`Generated ${new Date().toLocaleString('en-PH')}`, 24, 44);

  const plotLeft = 70;
  const plotRight = width - 24;
  const plotTop = 76;
  const plotBottom = 200;
  const plotHeight = plotBottom - plotTop;

  ctx.strokeStyle = COLORS.line;
  ctx.fillStyle = COLORS.muted;
  ctx.font = '400 11px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  [0, 0.5, 1].forEach((f) => {
    const value = Math.round(maxTotal * f);
    const y = plotBottom - f * plotHeight;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    if (value > 0) ctx.fillText(formatPeso(value).replace('.00', ''), plotLeft - 10, y);
  });

  const slotWidth = (plotRight - plotLeft) / Math.max(data.length, 1);
  const barWidth = Math.min(28, slotWidth * 0.5);
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    const slotCenter = plotLeft + slotWidth * (i + 0.5);
    const barHeight = maxTotal === 0 ? 0 : (d.total / maxTotal) * plotHeight;
    const x = slotCenter - barWidth / 2;
    const y = plotBottom - barHeight;

    ctx.fillStyle = COLORS.espresso;
    const r = Math.min(4, barWidth / 2, barHeight);
    if (barHeight > 0) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, barWidth, barHeight, [r, r, 0, 0]);
      else ctx.rect(x, y, barWidth, barHeight);
      ctx.fill();
    }

    ctx.fillStyle = COLORS.ink;
    ctx.font = '400 10px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(pointTickLabel(d), slotCenter, plotBottom + 8);
  });

  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Date', 24, tableTop);
  ctx.fillText('Orders', width * 0.45, tableTop);
  ctx.textAlign = 'right';
  ctx.fillText('Total', width - 24, tableTop);

  ctx.font = '400 12px Arial, sans-serif';
  data.forEach((d, i) => {
    const y = tableTop + 28 + i * rowHeight;
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath();
    ctx.moveTo(24, y - 4);
    ctx.lineTo(width - 24, y - 4);
    ctx.stroke();

    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'left';
    ctx.fillText(pointFullLabel(d), 24, y);
    ctx.fillText(String(d.orders), width * 0.45, y);
    ctx.fillStyle = COLORS.espresso;
    ctx.textAlign = 'right';
    ctx.fillText(formatPeso(d.total), width - 24, y);
  });

  return canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
}

/** Bar chart ng sales bawat araw: CSS-height bars, pure-CSS hover/focus na speech-bubble, fullscreen at export-as-image */
function DailySalesChart({ data, subtitle }: { data: DailySalesPoint[]; subtitle?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOpenFs, setExportOpenFs] = useState(false);
  const [viewMode, setViewMode] = useState<ChartGranularity>('day');
  // Nagsisimula sa 0 ang bars tapos lumalaki papuntang totoong height, hindi agad naka-full height
  const [grown, setGrown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportFsRef = useRef<HTMLDivElement>(null);

  const closeFullscreen = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFullscreen(false);
      setIsClosing(false);
    }, CLOSE_MS);
  };

  // Isang frame muna sa 0 bago lumipat sa totoong height, para talagang mag-animate ang
  // transition (kung agad naka-set ang final height sa unang render, walang babaguhin
  // kaya walang animation). Nag-uulit din tuwing magbabago ang data (hal. bagong filter).
  useEffect(() => {
    setGrown(false);
    const timer = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(timer);
  }, [data, viewMode]);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpen]);

  useEffect(() => {
    if (!exportOpenFs) return;
    const onClick = (e: MouseEvent) => {
      if (exportFsRef.current && !exportFsRef.current.contains(e.target as Node)) setExportOpenFs(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpenFs]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isFullscreen]);

  const points = useMemo(() => toChartPoints(data, viewMode), [data, viewMode]);

  if (points.length === 0) return null;

  const maxTotal = axisMax(points.map((d) => d.total));
  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_LABELS));
  const chartTitle = viewMode === 'year' ? 'Sales by year' : viewMode === 'month' ? 'Sales by month' : 'Sales by day';
  // Sariling window ng chart, hiwalay sa anumang date filter ng ibang panel sa page
  const windowLabel = viewMode === 'day' ? `Last ${Math.min(DAILY_WINDOW, data.length)} days` : `Last ${data.length} days`;
  const fullSubtitle = [subtitle, windowLabel].filter(Boolean).join(' · ');

  const handleExport = (format: 'png' | 'jpeg') => {
    const dataUrl = renderChartImage(points, maxTotal, chartTitle, format);
    if (!dataUrl) return;
    downloadDataUrl(
      dataUrl,
      `sales-by-${viewMode}-${new Date().toISOString().slice(0, 10)}.${format === 'png' ? 'png' : 'jpg'}`,
    );
  };

  // .track ang iisang coordinate box na ginagamit ng gridlines AT ng bars (same % basis),
  // kaya laging magkatapat sila. Ang x-axis labels ay hiwalay na row sa ibaba, parehong
  // flex layout lang (gap/flex:1) kaya pumapatak pa rin sila sa ibaba ng tamang bar.
  const renderBars = (trackHeight: number) => (
    <div className={styles.scroll}>
      <div className={styles.plot}>
        <div className={styles.track} style={{ height: trackHeight }}>
          {[0, 0.5, 1].map((f) => (
            <div
              key={f}
              className={`${styles.gridRow} ${f === 0.5 ? styles.gridRowMid : ''}`}
              style={{ top: `${(1 - f) * 100}%` }}
            >
              <span className={styles.gridLabel}>{f > 0 ? formatPeso(Math.round(maxTotal * f)).replace('.00', '') : ''}</span>
              <span className={styles.gridLineInner} />
            </div>
          ))}

          <div className={styles.bars}>
            {points.map((d) => (
              <div key={d.day} className={styles.barCol}>
                <div
                  className={styles.barWrap}
                  tabIndex={0}
                  aria-label={`${pointFullLabel(d)}: ${d.orders} orders, ${formatPeso(d.total)}`}
                >
                  <div
                    className={styles.bar}
                    style={{ height: grown ? `${Math.max(2, (d.total / maxTotal) * 100)}%` : '0%' }}
                  >
                    <div className={styles.label}>
                      <span className={styles.labelValue}>{formatPeso(d.total)}</span>
                      <span className={styles.labelMeta}>
                        {pointShortLabel(d)} · {d.orders} orders
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.xAxisRow}>
          {points.map((d, i) => (
            <span key={d.day} className={styles.xLabel}>
              {i % labelEvery === 0 || i === points.length - 1 ? pointTickLabel(d) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHeader = (fullscreen: boolean) => {
    const menuOpen = fullscreen ? exportOpenFs : exportOpen;
    const setMenuOpen = fullscreen ? setExportOpenFs : setExportOpen;
    const menuRef = fullscreen ? exportFsRef : exportRef;

    return (
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{chartTitle}</h2>
          <p className={styles.subtitle}>{fullSubtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle} role="group" aria-label="View by">
            {viewModeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={viewMode === opt.value ? styles.viewToggleActive : ''}
                aria-pressed={viewMode === opt.value}
                onClick={() => setViewMode(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className={styles.exportWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Export chart as image"
              aria-expanded={menuOpen}
            >
              <Icon src={downloadIcon} size={16} />
            </button>
            {menuOpen && (
              <div className={styles.exportMenu} role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleExport('png');
                  }}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleExport('jpeg');
                  }}
                >
                  Download JPEG
                </button>
              </div>
            )}
          </div>
          {fullscreen ? (
            <button type="button" className={styles.iconButton} onClick={closeFullscreen} aria-label="Close fullscreen view">
              <Icon src={closeIcon} size={16} />
            </button>
          ) : (
            <button type="button" className={styles.expandButton} onClick={() => setIsFullscreen(true)}>
              Expand
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.panel}>
      {renderHeader(false)}
      {renderBars(CHART_HEIGHT)}

      {isFullscreen && (
        <div className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`} onClick={closeFullscreen}>
          <div className={`${styles.fsPanel} ${isClosing ? styles.fsPanelClosing : ''}`} onClick={(e) => e.stopPropagation()}>
            {renderHeader(true)}
            {renderBars(FULLSCREEN_HEIGHT)}
          </div>
        </div>
      )}
    </div>
  );
}

export default DailySalesChart;
