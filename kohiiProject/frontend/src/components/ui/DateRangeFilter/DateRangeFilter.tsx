import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../Button/Button';
import styles from './DateRangeFilter.module.css';

export type DatePreset = 'custom' | 'today' | 'this-week' | 'this-month';

export interface DateRangeValue {
  from: string;
  to: string;
  preset: DatePreset;
}

export const defaultDateRangeValue: DateRangeValue = { from: '', to: '', preset: 'custom' };

const CLOSE_MS = 180;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const presets: { key: DatePreset; label: string }[] = [
  { key: 'custom', label: 'Custom' },
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This week' },
  { key: 'this-month', label: 'This month' },
];

function toIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIso(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function presetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 'today') return { from: toIso(today), to: toIso(today) };

  if (preset === 'this-week') {
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toIso(monday), to: toIso(sunday) };
  }

  if (preset === 'this-month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toIso(first), to: toIso(last) };
  }

  return { from: '', to: '' };
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return { iso: toIso(d), label: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
  });
}

function formatRangeLabel(value: DateRangeValue) {
  if (value.preset !== 'custom') return presets.find((p) => p.key === value.preset)?.label ?? 'Date';
  if (!value.from && !value.to) return 'All dates';
  const fmt = (iso: string) =>
    parseIso(iso)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) ?? '';
  if (value.from && value.to) return `${fmt(value.from)} – ${fmt(value.to)}`;
  return `From ${fmt(value.from || value.to)}`;
}

/** Date-range popover na may calendar at presets; reusable sa Sales Reports at Audit Log */
function DateRangeFilter({ value, onApply }: { value: DateRangeValue; onApply: (next: DateRangeValue) => void }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(() => {
    const seed = parseIso(value.from) || parseIso(value.to) || new Date();
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const todayIso = toIso(new Date());
  const calendarDays = useMemo(() => buildCalendarDays(month), [month]);

  const close = () => {
    setMounted(false);
    setTimeout(() => setOpen(false), CLOSE_MS);
  };

  const openPanel = () => {
    setDraft(value);
    setMonth(() => {
      const seed = parseIso(value.from) || parseIso(value.to) || new Date();
      return new Date(seed.getFullYear(), seed.getMonth(), 1);
    });
    setOpen(true);
    requestAnimationFrame(() => setMounted(true));
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const selectPreset = (preset: DatePreset) => {
    setDraft((prev) => (preset === 'custom' ? { ...prev, preset } : { ...prev, preset, ...presetRange(preset) }));
  };

  const selectMonth = () => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    setDraft({ preset: 'custom', from: toIso(first), to: toIso(last) });
  };

  const selectDay = (iso: string) => {
    setDraft((prev) => {
      // Walang from pa, o kumpleto na ang dati -> simulan ang bagong range
      if (!prev.from || (prev.from && prev.to)) return { preset: 'custom', from: iso, to: '' };
      // May from na, wala pang to -> kumpletuhin, swap kung mas maaga ang bagong petsa
      return iso < prev.from ? { preset: 'custom', from: iso, to: prev.from } : { preset: 'custom', from: prev.from, to: iso };
    });
  };

  const inRange = (iso: string) => draft.from && draft.to && iso >= draft.from && iso <= draft.to;
  const isEndpoint = (iso: string) => iso === draft.from || iso === draft.to;

  const apply = () => {
    onApply(draft);
    close();
  };

  const reset = () => {
    setDraft(defaultDateRangeValue);
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${value.from || value.to || value.preset !== 'custom' ? styles.triggerActive : ''}`}
        onClick={() => (open ? close() : openPanel())}
      >
        {formatRangeLabel(value)}
      </button>

      {open && (
        <div ref={panelRef} className={`${styles.panel} ${mounted ? styles.panelOpen : ''}`}>
          <div className={styles.presetRow} role="group" aria-label="Date preset">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={draft.preset === p.key ? styles.presetActive : ''}
                onClick={() => selectPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.monthRow}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.monthLabel}
              onClick={selectMonth}
              title="Select this whole month"
            >
              {month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map((w, i) => (
              <span key={`${w}-${i}`}>{w}</span>
            ))}
          </div>

          <div className={styles.grid}>
            {calendarDays.map((day) => (
              <button
                key={day.iso}
                type="button"
                className={[
                  styles.day,
                  day.inMonth ? '' : styles.dayMuted,
                  inRange(day.iso) ? styles.dayInRange : '',
                  isEndpoint(day.iso) ? styles.daySelected : '',
                  day.iso === todayIso ? styles.dayToday : '',
                ].join(' ')}
                onClick={() => selectDay(day.iso)}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={reset}>
              Reset
            </Button>
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangeFilter;
