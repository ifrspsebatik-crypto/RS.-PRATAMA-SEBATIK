import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from 'react';
import { Check, Search, Trash2 } from 'lucide-react';
import { MONTH_NAMES } from '../data/seed';
import type { DrugItem, MutasiState } from '../types/mutasi';
import { computeItem, formatNum, parseNumeric, toZero } from '../utils/mutasi';

interface QuickInputViewProps {
  state: MutasiState;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onSaveDayUsage: (itemId: number, day: number, amount: number, addMode: boolean) => void;
  onClearDayUsage: (itemId: number, day: number) => void;
  onToast: (message: string, tone?: 'default' | 'error') => void;
}

export function QuickInputView({
  state,
  selectedDay,
  onSelectDay,
  onSaveDayUsage,
  onClearDayUsage,
  onToast,
}: QuickInputViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [quantityText, setQuantityText] = useState('');
  const [addMode, setAddMode] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const matchedDrugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return state.items.slice(0, 20);
    return state.items
      .filter((item) => item.name.toLowerCase().includes(q) || item.cat.toLowerCase().includes(q))
      .slice(0, 25);
  }, [state.items, searchQuery]);

  const selectedItem: DrugItem | undefined = useMemo(() => {
    if (selectedItemId !== null) {
      const byId = state.items.find((x) => x.id === selectedItemId);
      if (byId) return byId;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return undefined;
    return state.items.find((x) => x.name.trim().toLowerCase() === q);
  }, [state.items, selectedItemId, searchQuery]);

  const dayEntries = useMemo(() => {
    return state.items
      .filter((item) => toZero(item.days[selectedDay - 1]) > 0)
      .map((item) => ({
        item,
        amount: toZero(item.days[selectedDay - 1]),
      }));
  }, [state.items, selectedDay]);

  const dayTotalUnits = useMemo(
    () => dayEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [dayEntries],
  );

  const selectDrug = (item: DrugItem) => {
    setSelectedItemId(item.id);
    setSearchQuery(item.name);
    setDropdownOpen(false);
    setActiveIndex(0);
    setTimeout(() => qtyInputRef.current?.focus(), 0);
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDropdownOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, matchedDrugs.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (dropdownOpen && matchedDrugs[activeIndex]) {
        selectDrug(matchedDrugs[activeIndex]);
      } else if (selectedItem) {
        qtyInputRef.current?.focus();
      } else if (matchedDrugs.length > 0) {
        selectDrug(matchedDrugs[0]);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      onToast('Obat tidak ditemukan — pilih dari daftar pencarian', 'error');
      searchInputRef.current?.focus();
      return;
    }
    const parsed = parseNumeric(quantityText);
    if (parsed === '') {
      onToast('Isi jumlah pemakaian terlebih dahulu', 'error');
      qtyInputRef.current?.focus();
      return;
    }

    onSaveDayUsage(selectedItem.id, selectedDay, parsed, addMode);
    onToast(`Tersimpan: ${selectedItem.name} (${formatNum(parsed)} ${selectedItem.unit})`);
    setQuantityText('');
    setSearchQuery('');
    setSelectedItemId(null);
    setDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const selectedComputed = selectedItem ? computeItem(selectedItem) : null;
  const currentDayVal = selectedItem ? toZero(selectedItem.days[selectedDay - 1]) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Input Cepat Pemakaian Harian
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Catat pengeluaran apotek harian untuk periode {MONTH_NAMES[state.m]} {state.y} dengan cepat.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Entry Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-5"
        >
          <div>
            <label htmlFor="quick-day-select" className="block text-sm font-medium text-slate-700">
              Tanggal Pemakaian
            </label>
            <select
              id="quick-day-select"
              value={selectedDay}
              onChange={(e) => onSelectDay(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              {Array.from({ length: 31 }, (_, idx) => idx + 1).map((day) => (
                <option key={day} value={day}>
                  {day} {MONTH_NAMES[state.m]} {state.y}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label htmlFor="quick-drug-search" className="block text-sm font-medium text-slate-700">
              Nama Obat
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                id="quick-drug-search"
                type="text"
                autoComplete="off"
                value={searchQuery}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setDropdownOpen(false), 160);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedItemId(null);
                  setDropdownOpen(true);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Ketik nama obat untuk mencari..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>

            {dropdownOpen && matchedDrugs.length > 0 && (
              <ul
                role="listbox"
                aria-label="Daftar pilihan obat"
                className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {matchedDrugs.map((item, idx) => {
                  const c = computeItem(item);
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={item.id}
                      role="option"
                      aria-selected={selectedItem?.id === item.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectDrug(item);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                        isActive ? 'bg-teal-50 text-teal-900' : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.cat} · {item.unit}
                        </div>
                      </div>
                      <span
                        className={`font-mono-num text-xs font-medium shrink-0 ${
                          c.a < 0 ? 'text-red-600' : 'text-slate-600'
                        }`}
                      >
                        Sisa {formatNum(c.a)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Selected Drug Context */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
            {selectedItem && selectedComputed ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{selectedItem.name}</span>
                  <span className="text-slate-500 shrink-0">{selectedItem.unit}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                  <span>
                    Tgl {selectedDay}:{' '}
                    <strong className="font-mono-num text-slate-900">
                      {formatNum(currentDayVal)}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Stok akhir:{' '}
                    <strong
                      className={`font-mono-num ${
                        selectedComputed.a < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatNum(selectedComputed.a)} {selectedItem.unit}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-slate-500">
                Pilih obat dari daftar untuk melihat sisa stok dan catatan tanggal {selectedDay}.
              </span>
            )}
          </div>

          <div>
            <label htmlFor="quick-qty-input" className="block text-sm font-medium text-slate-700">
              Jumlah Keluar
            </label>
            <input
              ref={qtyInputRef}
              id="quick-qty-input"
              type="text"
              inputMode="decimal"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              placeholder="0"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-num text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={addMode}
              onChange={(e) => setAddMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            />
            <span>Tambahkan ke jumlah yang sudah ada pada tanggal ini</span>
          </label>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <Check className="h-4 w-4" />
            Simpan Pemakaian (Enter)
          </button>
        </form>

        {/* Daily Log List */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Pemakaian Tanggal {selectedDay} {MONTH_NAMES[state.m]} {state.y}
              </h2>
              <p className="text-xs text-slate-500">
                {dayEntries.length} jenis obat tercatat keluar hari ini
              </p>
            </div>
            <span className="font-mono-num text-sm font-semibold text-teal-700">
              Total: {formatNum(dayTotalUnits)} unit
            </span>
          </div>

          {dayEntries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                Belum ada pemakaian pada tanggal {selectedDay} {MONTH_NAMES[state.m]}.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gunakan formulir di sebelah kiri untuk mencatat resep atau pemakaian apotek.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2 pr-3">Nama Obat</th>
                    <th className="px-3 py-2">Kategori</th>
                    <th className="px-3 py-2 text-right">Jumlah</th>
                    <th className="pl-3 py-2 text-right">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayEntries.map(({ item, amount }) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{item.cat}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num font-semibold text-slate-900">
                        {formatNum(amount)} <span className="font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="pl-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onClearDayUsage(item.id, selectedDay);
                            onToast(`Catatan tanggal ${selectedDay} untuk ${item.name} dihapus`);
                          }}
                          aria-label={`Hapus pemakaian ${item.name}`}
                          className="inline-flex rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-teal-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
