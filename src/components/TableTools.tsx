import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, Filter, RotateCcw, Search } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir };

/** Сортировка строк таблицы по выбранной колонке. */
export function useSort<T, K extends string>(rows: T[], getters: Record<K, (row: T) => string | number>, initial: { key: NoInfer<K>; dir: SortDir }) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const sorted = useMemo(() => {
    const get = getters[sort.key];
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * factor;
      return String(x).localeCompare(String(y), "ru") * factor;
    });
    // getters — константа модуля
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return { sorted, sort, setSort };
}

/** Фильтры по значениям колонок, как в Excel: выбранные значения или «все». */
export function useColumnFilters<T, F extends string>(rows: T[], accessors: Record<F, (row: T) => string>) {
  const [filters, setFilters] = useState<Partial<Record<F, string[]>>>({});

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        (Object.keys(filters) as F[]).every((key) => {
          const selected = filters[key];
          return !selected || selected.includes(accessors[key](row));
        }),
      ),
    // accessors — константа модуля
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filters],
  );

  const options = useMemo(() => {
    const result = {} as Record<F, Array<{ value: string; count: number }>>;
    (Object.keys(accessors) as F[]).forEach((key) => {
      const counts = new Map<string, number>();
      rows.forEach((row) => {
        const value = accessors[key](row) || "—";
        counts.set(value, (counts.get(value) || 0) + 1);
      });
      result[key] = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "ru"));
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function setFilter(key: F, values: string[] | null) {
    setFilters((current) => {
      const next = { ...current };
      if (values === null) delete next[key];
      else next[key] = values;
      return next;
    });
  }

  const activeCount = Object.keys(filters).length;
  return { filtered, filters, options, setFilter, activeCount, clear: () => setFilters({}) };
}

type ColumnHeaderProps<K extends string> = {
  label: ReactNode;
  sortKey?: K;
  sort?: SortState<K>;
  onSort?: (sort: SortState<K>) => void;
  numeric?: boolean;
  options?: Array<{ value: string; count: number }>;
  selected?: string[];
  onFilter?: (values: string[] | null) => void;
  /** Подписи направлений сортировки, например «Сначала новые». */
  sortLabels?: { asc: string; desc: string };
};

/** Заголовок столбца с меню: сортировка и выбор значений. */
export function ColumnHeader<K extends string>({ label, sortKey, sort, onSort, numeric, options, selected, onFilter, sortLabels }: ColumnHeaderProps<K>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sortActive = sortKey && sort?.key === sortKey ? sort.dir : null;
  const filterActive = Boolean(selected);
  const labels = sortLabels || (numeric ? { asc: "По возрастанию", desc: "По убыванию" } : { asc: "От А до Я", desc: "От Я до А" });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = 260;
    const left = Math.min(Math.max(8, numeric ? rect.right - width : rect.left - 4), window.innerWidth - width - 8);
    setPosition({ top: rect.bottom + 6, left });
  }, [open, numeric]);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (options || []).filter((option) => !normalized || option.value.toLowerCase().includes(normalized));
  }, [options, query]);

  const all = options?.map((option) => option.value) || [];
  const current = selected || all;

  function toggleValue(value: string) {
    if (!onFilter) return;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    onFilter(next.length === all.length ? null : next);
  }

  function only(value: string) {
    onFilter?.([value]);
  }

  return (
    <th className={numeric ? "num" : undefined} aria-sort={sortActive === "asc" ? "ascending" : sortActive === "desc" ? "descending" : undefined}>
      <button
        ref={buttonRef}
        type="button"
        className={`col-btn ${sortActive || filterActive ? "is-active" : ""} ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{label}</span>
        {filterActive ? <Filter size={12} className="col-btn__mark" aria-label="фильтр включён" /> : null}
        {sortActive === "asc" ? <ArrowUpNarrowWide size={13} className="col-btn__mark" aria-hidden="true" /> : null}
        {sortActive === "desc" ? <ArrowDownWideNarrow size={13} className="col-btn__mark" aria-hidden="true" /> : null}
        <ChevronDown size={13} className="col-btn__chevron" aria-hidden="true" />
      </button>

      {open && position
        ? createPortal(
            <div ref={menuRef} className="col-menu" style={{ top: position.top, left: position.left }} role="dialog" aria-label="Сортировка и фильтр">
              {sortKey && onSort ? (
                <div className="col-menu__sort">
                  <button type="button" className={sortActive === "asc" ? "is-active" : ""} onClick={() => { onSort({ key: sortKey, dir: "asc" }); setOpen(false); }}>
                    <ArrowUpNarrowWide size={15} aria-hidden="true" />
                    {labels.asc}
                  </button>
                  <button type="button" className={sortActive === "desc" ? "is-active" : ""} onClick={() => { onSort({ key: sortKey, dir: "desc" }); setOpen(false); }}>
                    <ArrowDownWideNarrow size={15} aria-hidden="true" />
                    {labels.desc}
                  </button>
                </div>
              ) : null}

              {options && onFilter ? (
                <div className="col-menu__filter">
                  {options.length > 8 ? (
                    <label className="col-menu__search">
                      <Search size={14} aria-hidden="true" />
                      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти" aria-label="Найти значение" />
                    </label>
                  ) : null}
                  <label className="col-menu__option col-menu__option--all">
                    <input type="checkbox" checked={!selected} onChange={() => onFilter(selected ? null : [])} />
                    <span>Выбрать все</span>
                  </label>
                  <div className="col-menu__list">
                    {visibleOptions.map((option) => (
                      <div className="col-menu__row" key={option.value}>
                        <label className="col-menu__option">
                          <input type="checkbox" checked={current.includes(option.value)} onChange={() => toggleValue(option.value)} />
                          <span>{option.value}</span>
                          <small>{option.count}</small>
                        </label>
                        <button type="button" className="col-menu__only" onClick={() => only(option.value)}>
                          только
                        </button>
                      </div>
                    ))}
                    {!visibleOptions.length ? <p className="col-menu__empty">Ничего не найдено</p> : null}
                  </div>
                  {selected ? (
                    <button type="button" className="col-menu__reset" onClick={() => onFilter(null)}>
                      <RotateCcw size={13} aria-hidden="true" />
                      Сбросить фильтр
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </th>
  );
}

/** Кнопка в шапке панели: сколько фильтров включено и сброс. */
export function FiltersBadge({ count, onClear }: { count: number; onClear: () => void }) {
  if (!count) return null;
  return (
    <button type="button" className="filters-badge" onClick={onClear}>
      <Filter size={13} aria-hidden="true" />
      {count === 1 ? "1 фильтр" : `${count} фильтра`} · сбросить
    </button>
  );
}
