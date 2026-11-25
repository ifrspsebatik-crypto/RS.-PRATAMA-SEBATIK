import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { DrugItem, MutasiState, NumericInput, TableFilterStatus } from '../types/mutasi';
import {
  computeItem,
  formatIndoDate,
  formatNum,
  getOrderedItems,
  getReportTitle,
  getStockStatus,
  parseNumeric,
} from '../utils/mutasi';

interface FullTableViewProps {
  state: MutasiState;
  initialQuery?: string;
  initialStatus?: TableFilterStatus;
  onUpdateField: (
    itemId: number,
    field: 'stok' | 'rec' | 'lain' | 'exp' | 'day',
    value: NumericInput,
    dayIndex?: number,
  ) => void;
  onUpdateSettings: (patch: { low?: number; cetak?: string }) => void;
}

interface LedgerInputProps {
  value: NumericInput;
  onCommit: (val: NumericInput) => void;
  ariaLabel: string;
}

function LedgerCellInput({ value, onCommit, ariaLabel }: LedgerInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft !== null ? draft : value === '' || value === null ? '' : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      className="ledger-input"
      value={displayValue}
      onFocus={(e) => {
        setDraft(value === '' || value === null ? '' : String(value));
        e.target.select();
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        onCommit(parseNumeric(raw));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function FullTableView({
  state,
  initialQuery = '',
  initialStatus = '',
  onUpdateField,
  onUpdateSettings,
}: FullTableViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TableFilterStatus>(initialStatus);

  const rowNumbers = useMemo(() => {
    const map = new Map<number, number>();
    getOrderedItems(state).forEach((item, idx) => map.set(item.id, idx + 1));
    return map;
  }, [state]);

  const matchesStatusFilter = (item: DrugItem): boolean => {
    if (!statusFilter) return true;
    const c = computeItem(item);
    if (statusFilter === 'aktif') return c.t > 0;
    if (statusFilter === 'dead') return c.t === 0;
    return getStockStatus(item, state.low) === statusFilter;
  };

  const groupedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.cats
      .filter((cat) => catFilter === '' || catFilter === cat)
      .map((cat) => ({
        cat,
        items: state.items.filter(
          (item) =>
            item.cat === cat &&
            item.name.toLowerCase().includes(q) &&
            matchesStatusFilter(item),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [state, query, catFilter, statusFilter]);

  const totalMatched = useMemo(
    () => groupedRows.reduce((sum, g) => sum + g.items.length, 0),
    [groupedRows],
  );

  return (
    <div className="space-y-4">
      {/* Print-only official report header */}
      <div className="print-only text-center font-bold text-slate-900 mb-3">
        <div className="text-base">APOTEK RUMAH SAKIT PRATAMA SEBATIK</div>
        <div className="text-sm">{getReportTitle(state.m, state.y)}</div>
      </div>

      {/* Screen Header & Filter Toolbar */}
      <div className="no-print space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Tabel Mutasi Penuh
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {getReportTitle(state.m, state.y)} · Menampilkan{' '}
              <span className="font-mono-num font-medium text-slate-700">{totalMatched}</span> dari{' '}
              <span className="font-mono-num font-medium text-slate-700">{state.items.length}</span> obat
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-red-300 bg-red-100" />
              Stok Minus
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-amber-300 bg-amber-100" />
              Stok Menipis
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama obat..."
              aria-label="Cari nama obat"
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            aria-label="Filter kategori obat"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="">Semua kategori</option>
            {state.cats.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TableFilterStatus)}
            aria-label="Filter status stok"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="">Semua status</option>
            <option value="aktif">Obat aktif keluar</option>
            <option value="dead">Dead stock</option>
            <option value="neg">Stok minus</option>
            <option value="low">Stok menipis</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span>Menipis ≤</span>
            <input
              type="number"
              min={0}
              max={100}
              value={state.low}
              onChange={(e) => {
                const parsed = parseNumeric(e.target.value);
                onUpdateSettings({ low: parsed === '' ? 0 : Math.max(0, parsed) });
              }}
              className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right font-mono-num text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
            <span>% persediaan</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 ml-auto">
            <span>Tgl cetak</span>
            <input
              type="date"
              value={state.cetak}
              onChange={(e) => onUpdateSettings({ cetak: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </label>
        </div>
      </div>

      {/* Full 46-column Ledger Grid */}
      <div
        className="ledger-scroll-container overflow-auto rounded-xl border border-slate-300 bg-white"
        style={{ maxHeight: '72vh' }}
      >
        <table className="ledger-table w-max">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky-col-1 text-center">
                NO
              </th>
              <th rowSpan={2} className="sticky-col-2 text-left">
                NAMA OBAT
              </th>
              <th rowSpan={2} className="sticky-col-3 text-left">
                SATUAN
              </th>
              <th rowSpan={2} className="sticky-col-4 text-right">
                SISA
              </th>
              <th rowSpan={2} className="text-right">
                STOK
              </th>
              <th rowSpan={2} className="text-right">
                PENERIMAAN
              </th>
              <th rowSpan={2} className="text-right">
                PERSEDIAAN
              </th>
              <th colSpan={31} className="text-center">
                PEMAKAIAN APOTEK (TANGGAL)
              </th>
              <th rowSpan={2} className="text-right">
                LAIN-LAIN
              </th>
              <th rowSpan={2} className="text-right">
                TOTAL PEMAKAIAN
              </th>
              <th rowSpan={2} className="text-right">
                EKPIYER
              </th>
              <th rowSpan={2} className="text-right">
                PEMAKAIAN + EKPIYER
              </th>
              <th rowSpan={2} className="text-right">
                PERSEDIAAN AKHIR
              </th>
            </tr>
            <tr>
              {Array.from({ length: 31 }, (_, idx) => (
                <th key={idx + 1} className="text-center font-mono-num">
                  {idx + 1}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groupedRows.length === 0 ? (
              <tr>
                <td colSpan={46} className="p-6 text-center text-sm text-slate-500">
                  Tidak ada obat yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              groupedRows.map(({ cat, items }) => (
                <FragmentCategoryGroup
                  key={cat}
                  cat={cat}
                  items={items}
                  lowPct={state.low}
                  rowNumbers={rowNumbers}
                  onUpdateField={onUpdateField}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Official Signature Block (Visible in both screen footer and A3 print) */}
      <div className="flex flex-wrap justify-between gap-8 px-4 pt-6 text-sm text-slate-800 sm:px-10">
        <div className="text-center">
          <div>Mengetahui,</div>
          <div>Ka. Instansi Farmasi</div>
          <div className="h-16" />
          <div className="font-bold underline">Andi Sri Marlina, S.Si.,Apt</div>
          <div className="text-xs text-slate-600">NIP. 19830125 201101 2 002</div>
        </div>

        <div className="text-center">
          <div>Sebatik, {formatIndoDate(state.cetak)}</div>
          <div>Pj Mutasi Obat Apotek</div>
          <div className="h-16" />
          <div className="font-bold underline">Kasmawati, S.Farm</div>
        </div>
      </div>
    </div>
  );
}

interface FragmentCategoryGroupProps {
  cat: string;
  items: DrugItem[];
  lowPct: number;
  rowNumbers: Map<number, number>;
  onUpdateField: FullTableViewProps['onUpdateField'];
}

function FragmentCategoryGroup({
  cat,
  items,
  lowPct,
  rowNumbers,
  onUpdateField,
}: FragmentCategoryGroupProps) {
  return (
    <>
      <tr className="row-cat">
        <td colSpan={46}>
          <span className="sticky left-2">{cat.toUpperCase()}</span>
        </td>
      </tr>
      {items.map((item) => {
        const c = computeItem(item);
        const status = getStockStatus(item, lowPct);
        const rowClass = status === 'neg' ? 'row-neg' : status === 'low' ? 'row-low' : '';

        return (
          <tr key={item.id} className={rowClass}>
            <td className="sticky-col-1 text-center font-mono-num text-slate-600">
              {rowNumbers.get(item.id) ?? ''}
            </td>
            <td className="sticky-col-2 font-medium text-slate-900" title={item.name}>
              {item.name}
            </td>
            <td className="sticky-col-3 text-slate-600">{item.unit}</td>
            <td
              className={`sticky-col-4 text-right font-mono-num font-bold ${
                status === 'neg'
                  ? 'text-red-700'
                  : status === 'low'
                    ? 'text-amber-800'
                    : 'text-slate-900'
              }`}
              title={
                status === 'neg'
                  ? 'Status: Stok Minus'
                  : status === 'low'
                    ? 'Status: Stok Menipis'
                    : 'Status: Normal'
              }
            >
              {status === 'neg' && <span className="mr-1 text-[10px] uppercase">Min </span>}
              {status === 'low' && <span className="mr-1 text-[10px] uppercase">Low </span>}
              {formatNum(c.a)}
            </td>
            <td>
              <LedgerCellInput
                value={item.stok}
                ariaLabel={`Stok awal ${item.name}`}
                onCommit={(val) => onUpdateField(item.id, 'stok', val)}
              />
            </td>
            <td>
              <LedgerCellInput
                value={item.rec}
                ariaLabel={`Penerimaan ${item.name}`}
                onCommit={(val) => onUpdateField(item.id, 'rec', val)}
              />
            </td>
            <td className="text-right font-mono-num font-medium text-slate-800">
              {formatNum(c.p)}
            </td>
            {item.days.map((dayVal, dayIdx) => (
              <td key={dayIdx}>
                <LedgerCellInput
                  value={dayVal}
                  ariaLabel={`${item.name} tanggal ${dayIdx + 1}`}
                  onCommit={(val) => onUpdateField(item.id, 'day', val, dayIdx)}
                />
              </td>
            ))}
            <td>
              <LedgerCellInput
                value={item.lain}
                ariaLabel={`Lain-lain ${item.name}`}
                onCommit={(val) => onUpdateField(item.id, 'lain', val)}
              />
            </td>
            <td className="text-right font-mono-num font-medium text-teal-800">
              {formatNum(c.t)}
            </td>
            <td>
              <LedgerCellInput
                value={item.exp}
                ariaLabel={`Ekpiyer ${item.name}`}
                onCommit={(val) => onUpdateField(item.id, 'exp', val)}
              />
            </td>
            <td className="text-right font-mono-num font-medium text-slate-800">
              {formatNum(c.pe)}
            </td>
            <td className="text-right font-mono-num font-bold text-slate-900">
              {formatNum(c.a)}
            </td>
          </tr>
        );
      })}
    </>
  );
}
