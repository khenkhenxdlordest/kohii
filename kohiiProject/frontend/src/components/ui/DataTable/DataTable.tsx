import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import ActionButton from '../ActionButton/ActionButton';
import Icon from '../Icon/Icon';
import styles from './DataTable.module.css';
import { highlightText, matchesSearch } from './highlight';

import sortIcon from '../../../assets/icons/actions/sort.svg';
import sortAscIcon from '../../../assets/icons/actions/sort-asc.svg';
import sortDescIcon from '../../../assets/icons/actions/sort-desc.svg';

type RowId = string | number;
type SortState = { key: string; direction: 'asc' | 'desc' } | null;

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Lapad ng column, hal. 200 o '20%' */
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  /**
   * Text na hahanapin at iha-highlight. Kapag may `render`, ipinapasa ang
   * `highlight()` para magamit sa loob ng custom na laman.
   */
  searchValue?: (row: T) => string | null | undefined;
  /** Kapag may laman, puwedeng i-sort ang column: pindot = A-Z, ulit = Z-A, ulit = default */
  sortValue?: (row: T) => string | number | null | undefined;
  render?: (row: T, highlight: (text: string | null | undefined) => ReactNode) => ReactNode;
}

/** Lahat ng action ay may 2-click rule (1st click = tooltip na may label, 2nd click = gawin) */
export interface DataTableAction<T> {
  id: string;
  label: string;
  /** SVG mula sa assets/icons */
  icon: string;
  tone?: 'default' | 'success' | 'danger';
  hidden?: (row: T) => boolean;
  onClick: (row: T) => void;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string | number;
  actions?: DataTableAction<T>[];
  searchTerm?: string;
  selectedId?: string | number | null;
  onRowClick?: (row: T) => void;
  /** Para sa mga row na naka-deactivate, hal. kulay-abo */
  isRowMuted?: (row: T) => boolean;
  /** Kapag may ID dito, may spinner ang row (hal. habang nagse-save) */
  busyRowId?: string | number | null;
  emptyMessage?: string;
  /** Ilang row bawat page; kapag wala, ibabagay sa taas ng screen */
  pageSize?: number;
  /** Checkbox sa bawat row; ang parent ang may hawak ng napili (hal. para sa selection bar) */
  selectedIds?: RowId[];
  onSelectionChange?: (ids: RowId[]) => void;
  /** Hal. hindi puwedeng piliin ang sariling account */
  isRowSelectable?: (row: T) => boolean;
}

type PageItem = number | 'left-ellipsis' | 'right-ellipsis';

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 46;
const FOOTER_SPACE = 96;
const MIN_ROWS = 5;

function DataTable<T>({
  rows,
  columns,
  getRowId,
  actions = [],
  searchTerm = '',
  selectedId,
  onRowClick,
  isRowMuted,
  busyRowId,
  emptyMessage = 'Nothing to show yet.',
  pageSize,
  selectedIds,
  onSelectionChange,
  isRowSelectable,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoPageSize, setAutoPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>(null);
  // Naka-ugnay ang page sa search at sort; kapag nagbago ang alinman, babalik sa page 1
  const [pageState, setPageState] = useState({ page: 1, query: searchTerm, sort });
  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;

  const perPage = pageSize ?? autoPageSize;
  const query = searchTerm.trim();

  // Ilang row ang kasya sa screen (ResizeObserver para hindi na kailangan ng timer)
  useEffect(() => {
    if (pageSize) return;
    const measure = () => {
      const top = containerRef.current?.getBoundingClientRect().top ?? 0;
      const available = window.innerHeight - top - HEADER_HEIGHT - FOOTER_SPACE;
      setAutoPageSize(Math.max(MIN_ROWS, Math.floor(available / ROW_HEIGHT)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [pageSize]);

  // Shift + scroll ng mouse: pahalang na scroll na may momentum
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let velocity = 0;
    let frame: number | null = null;

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      velocity = 0;
    };
    const animate = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return stop();
      const next = el.scrollLeft + velocity;
      const clamped = Math.max(0, Math.min(max, next));
      el.scrollLeft = clamped;
      velocity *= clamped !== next ? 0.45 : 0.9;
      if (Math.abs(velocity) < 0.15) return stop();
      frame = requestAnimationFrame(animate);
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey && event.deltaX === 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      event.preventDefault();
      const raw = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX || event.deltaY;
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? raw * 16 : raw;
      velocity = Math.max(-80, Math.min(80, velocity + delta * 0.18));
      if (frame === null) frame = requestAnimationFrame(animate);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      stop();
    };
  }, []);

  const filtered = useMemo(() => {
    const searchable = columns.filter((c) => c.searchValue);
    if (!query || searchable.length === 0) return rows;
    return rows.filter((row) => searchable.some((c) => matchesSearch(c.searchValue!(row), query)));
  }, [rows, columns, query]);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !column?.sortValue) return filtered;
    const getValue = column.sortValue;
    const list = [...filtered].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      // Walang laman ay laging nasa dulo
      if (left == null || left === '') return 1;
      if (right == null || right === '') return -1;
      return typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { sensitivity: 'base', numeric: true });
    });
    return sort.direction === 'asc' ? list : list.reverse();
  }, [filtered, columns, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const requestedPage = pageState.query === searchTerm && pageState.sort === sort ? pageState.page : 1;
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * perPage;
  const pageRows = sorted.slice(start, start + perPage);

  const goTo = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    setPageState({ page: next, query: searchTerm, sort });
  };

  // A-Z → Z-A → default (katulad ng reference)
  const toggleSort = (key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortStateOf = (key: string) => (sort?.key === key ? sort.direction : 'none');

  // ── Pagpili (checkbox) ──
  const selectedSet = new Set(selectedIds ?? []);
  const selectableIds = sorted.filter((row) => isRowSelectable?.(row) ?? true).map(getRowId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));
  const someSelected = selectableIds.some((id) => selectedSet.has(id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const others = (selectedIds ?? []).filter((id) => !selectableIds.includes(id));
    onSelectionChange(allSelected ? others : [...others, ...selectableIds]);
  };

  const toggleRow = (id: RowId) => {
    if (!onSelectionChange) return;
    const current = selectedIds ?? [];
    onSelectionChange(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const pageItems = useMemo<PageItem[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items: PageItem[] = [1];
    const from = Math.max(2, page - 1);
    const to = Math.min(totalPages - 1, page + 1);
    if (from > 2) items.push('left-ellipsis');
    for (let p = from; p <= to; p += 1) items.push(p);
    if (to < totalPages - 1) items.push('right-ellipsis');
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  const highlight = (text: string | null | undefined) =>
    highlightText(text, query, styles.matchExact, styles.matchPartial);

  const cellStyle = (column: DataTableColumn<T>): CSSProperties => ({
    width: column.width,
    textAlign: column.align ?? 'left',
  });

  const hasActions = actions.length > 0;

  return (
    <div ref={containerRef} className={styles.container}>
      <div ref={scrollRef} className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectable && (
                <th scope="col" className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => {
                const state = sortStateOf(column.key);
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={cellStyle(column)}
                    aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : undefined}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        className={`${styles.sortButton} ${column.align === 'right' ? styles.sortButtonRight : ''}`}
                        onClick={() => toggleSort(column.key)}
                        title="Sort"
                      >
                        {column.header}
                        {/* Tatlong icon na nagpapalitan nang may fade (normal / A-Z / Z-A) */}
                        <span className={`${styles.sortIcons} ${styles[`sort_${state}`]}`} aria-hidden="true">
                          <span className={`${styles.sortLayer} ${styles.sortLayerNone}`}>
                            <Icon src={sortIcon} size={14} />
                          </span>
                          <span className={`${styles.sortLayer} ${styles.sortLayerAsc}`}>
                            <Icon src={sortAscIcon} size={14} />
                          </span>
                          <span className={`${styles.sortLayer} ${styles.sortLayerDesc}`}>
                            <Icon src={sortDescIcon} size={14} />
                          </span>
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {hasActions && (
                <th scope="col" className={styles.actionCell}>
                  Action
                </th>
              )}
            </tr>
          </thead>

          {/* Bagong key bawat page/search para maulit ang animation ng rows */}
          <tbody key={`${page}-${query}-${perPage}-${sort?.key ?? ''}-${sort?.direction ?? ''}`}>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0) + (selectable ? 1 : 0)} className={styles.empty}>
                  {query ? `No results for "${query}".` : emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => {
                const id = getRowId(row);
                const isChecked = selectedSet.has(id);
                const canSelect = isRowSelectable?.(row) ?? true;
                const classes = [
                  styles.row,
                  onRowClick ? styles.clickable : '',
                  selectedId === id ? styles.selected : '',
                  isChecked ? styles.checked : '',
                  isRowMuted?.(row) ? styles.muted : '',
                ].join(' ');

                return (
                  <tr
                    key={id}
                    className={classes}
                    style={{ '--row-index': index } as CSSProperties}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isChecked}
                          onChange={() => toggleRow(id)}
                          disabled={!canSelect}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} style={cellStyle(column)}>
                        {column.render
                          ? column.render(row, highlight)
                          : column.searchValue
                            ? highlight(column.searchValue(row))
                            : null}
                      </td>
                    ))}

                    {hasActions && (
                      <td className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.actionGroup}>
                          {busyRowId === id ? (
                            <span className={styles.spinner} aria-label="Saving" />
                          ) : (
                            actions
                              .filter((action) => !action.hidden?.(row))
                              .map((action) => (
                                <ActionButton
                                  key={action.id}
                                  icon={action.icon}
                                  label={action.label}
                                  tone={action.tone}
                                  onConfirm={() => action.onClick(row)}
                                />
                              ))
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <p className={styles.summary}>
          Showing <strong>{sorted.length === 0 ? 0 : start + 1}</strong> to{' '}
          <strong>{Math.min(start + perPage, sorted.length)}</strong> of <strong>{sorted.length}</strong>
        </p>

        <nav className={styles.pagination} aria-label="Pagination">
          <button type="button" className={styles.pageButton} onClick={() => goTo(page - 1)} disabled={page === 1}>
            Prev
          </button>
          {pageItems.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                className={`${styles.pageButton} ${item === page ? styles.pageActive : ''}`}
                onClick={() => goTo(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            ) : (
              <span key={item} className={styles.ellipsis} aria-hidden="true">
                …
              </span>
            ),
          )}
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}

export default DataTable;
