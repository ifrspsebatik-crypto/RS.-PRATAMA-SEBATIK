import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Database,
  Download,
  Menu,
  Printer,
  Table2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { FullTableView } from './components/FullTableView';
import { MasterView } from './components/MasterView';
import { QuickInputView } from './components/QuickInputView';
import { MONTH_NAMES } from './data/seed';
import type {
  DrugItem,
  MutasiState,
  NumericInput,
  TabId,
  TableFilterStatus,
  ToastMessage,
} from './types/mutasi';
import {
  computeItem,
  createFreshState,
  exportMutasiExcel,
  generateItemId,
  loadMutasiState,
  parseExcelFile,
  saveMutasiState,
  toZero,
} from './utils/mutasi';

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'dash', label: 'Ringkasan', icon: BarChart3 },
  { id: 'quick', label: 'Input Cepat', icon: Zap },
  { id: 'table', label: 'Tabel Mutasi', icon: Table2 },
  { id: 'master', label: 'Master Obat', icon: Database },
];

export default function App() {
  const [state, setState] = useState<MutasiState>(() => loadMutasiState());
  const [activeTab, setActiveTab] = useState<TabId>('dash');
  const [quickDay, setQuickDay] = useState<number>(1);
  const [tablePreset, setTablePreset] = useState<{
    key: number;
    query: string;
    status: TableFilterStatus;
  }>({ key: 0, query: '', status: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveMutasiState(state);
  }, [state]);

  const showToast = (text: string, tone: 'default' | 'error' = 'default') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), text, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  const handleNavigate = (
    tab: TabId,
    preset?: { status?: TableFilterStatus; query?: string },
  ) => {
    if (tab === 'table' && preset) {
      setTablePreset({
        key: Date.now(),
        query: preset.query ?? '',
        status: preset.status ?? '',
      });
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleImportExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseExcelFile(file);
      setState((prev) => ({
        ...prev,
        items: result.items,
        cats: result.cats,
        m: result.m !== undefined ? result.m : prev.m,
        y: result.y !== undefined ? result.y : prev.y,
      }));
      setActiveTab('dash');
      showToast(`${result.items.length} obat berhasil diimpor`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel';
      showToast(msg, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    exportMutasiExcel(state);
    showToast('File Excel berhasil diunduh');
  };

  const handlePrint = () => {
    if (activeTab !== 'table') {
      setActiveTab('table');
      window.setTimeout(() => window.print(), 120);
    } else {
      window.print();
    }
  };

  const handleSaveDayUsage = (
    itemId: number,
    day: number,
    amount: number,
    addMode: boolean,
  ) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const nextDays = [...item.days];
        const base = addMode ? toZero(nextDays[day - 1]) : 0;
        const sum = Math.round((base + amount) * 1e4) / 1e4;
        nextDays[day - 1] = sum === 0 ? '' : sum;
        return { ...item, days: nextDays };
      }),
    }));
  };

  const handleClearDayUsage = (itemId: number, day: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const nextDays = [...item.days];
        nextDays[day - 1] = '';
        return { ...item, days: nextDays };
      }),
    }));
  };

  const handleUpdateTableField = (
    itemId: number,
    field: 'stok' | 'rec' | 'lain' | 'exp' | 'day',
    value: NumericInput,
    dayIndex?: number,
  ) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        if (field === 'day' && dayIndex !== undefined) {
          const nextDays = [...item.days];
          nextDays[dayIndex] = value;
          return { ...item, days: nextDays };
        }
        if (field === 'day') return item;
        return { ...item, [field]: value };
      }),
    }));
  };

  const handleUpdateSettings = (patch: { low?: number; cetak?: string }) => {
    setState((prev) => ({
      ...prev,
      low: patch.low !== undefined ? patch.low : prev.low,
      cetak: patch.cetak !== undefined ? patch.cetak || prev.cetak : prev.cetak,
    }));
  };

  const handleAddItem = (payload: {
    name: string;
    unit: string;
    cat: string;
    stok: NumericInput;
    rec: NumericInput;
  }) => {
    setState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateItemId(),
          cat: payload.cat,
          name: payload.name,
          unit: payload.unit,
          stok: payload.stok,
          rec: payload.rec,
          days: Array(31).fill(''),
          lain: '',
          exp: '',
        },
      ],
    }));
  };

  const handleAddCategory = (catName: string): boolean => {
    if (state.cats.includes(catName)) return false;
    setState((prev) => ({
      ...prev,
      cats: [...prev.cats, catName],
    }));
    return true;
  };

  const handleUpdateItemMeta = (
    itemId: number,
    patch: Partial<Pick<DrugItem, 'name' | 'unit' | 'cat' | 'stok' | 'rec'>>,
  ) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  };

  const handleDeleteItem = (itemId: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleNextMonth = () => {
    setState((prev) => {
      const nextMonth = prev.m + 1 > 11 ? 0 : prev.m + 1;
      const nextYear = prev.m + 1 > 11 ? prev.y + 1 : prev.y;
      return {
        ...prev,
        m: nextMonth,
        y: nextYear,
        items: prev.items.map((item) => ({
          ...item,
          stok: computeItem(item).a,
          rec: '',
          days: Array(31).fill(''),
          lain: '',
          exp: '',
        })),
      };
    });
    const targetMonth = state.m + 1 > 11 ? 0 : state.m + 1;
    const targetYear = state.m + 1 > 11 ? state.y + 1 : state.y;
    showToast(`Bulan baru dibuka: ${MONTH_NAMES[targetMonth]} ${targetYear}`);
  };

  const handleResetTemplate = () => {
    const fresh = createFreshState();
    setState(fresh);
    showToast('Data dikembalikan ke template awal');
  };

  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="font-display text-base font-bold tracking-tight text-slate-900">
            Mutasi Obat
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Apotek RS Pratama Sebatik</div>
        </div>

        <nav className="space-y-1 px-3 py-4" aria-label="Menu utama">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigate(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mx-3 mt-2 border-t border-slate-200 pt-4 px-2 space-y-3">
          <div className="text-xs font-semibold text-slate-500">Periode Laporan</div>
          <div className="grid grid-cols-1 gap-2">
            <label className="block">
              <span className="sr-only">Bulan laporan</span>
              <select
                value={state.m}
                onChange={(e) => setState((prev) => ({ ...prev, m: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {MONTH_NAMES.map((month, idx) => (
                  <option key={month} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Tahun laporan</span>
              <input
                type="number"
                value={state.y}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > 1900 && val < 2200) {
                    setState((prev) => ({ ...prev, y: val }));
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
        Data tersimpan otomatis di browser ({state.items.length} item).
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[80vw] bg-white border-r border-slate-200 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden sm:inline text-slate-500 truncate">
                Apotek RS Pratama Sebatik
              </span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">{activeNav.label}</span>
              <span className="hidden md:inline text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">
                {MONTH_NAMES[state.m]} {state.y}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Impor Excel</span>
              <span className="sm:hidden">Impor</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ekspor Excel</span>
              <span className="sm:hidden">Ekspor</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1440px]">
            {activeTab === 'dash' && (
              <DashboardView
                state={state}
                onNavigate={handleNavigate}
                onNextMonth={handleNextMonth}
                onResetTemplate={handleResetTemplate}
              />
            )}

            {activeTab === 'quick' && (
              <QuickInputView
                state={state}
                selectedDay={quickDay}
                onSelectDay={setQuickDay}
                onSaveDayUsage={handleSaveDayUsage}
                onClearDayUsage={handleClearDayUsage}
                onToast={showToast}
              />
            )}

            {activeTab === 'table' && (
              <FullTableView
                key={tablePreset.key}
                state={state}
                initialQuery={tablePreset.query}
                initialStatus={tablePreset.status}
                onUpdateField={handleUpdateTableField}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {activeTab === 'master' && (
              <MasterView
                state={state}
                onAddItem={handleAddItem}
                onAddCategory={handleAddCategory}
                onUpdateItemMeta={handleUpdateItemMeta}
                onDeleteItem={handleDeleteItem}
                onToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed bottom-5 right-5 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.tone === 'error' ? 'bg-red-700' : 'bg-slate-900'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
