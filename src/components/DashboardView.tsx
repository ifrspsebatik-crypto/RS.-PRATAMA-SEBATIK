import { useMemo, useState } from 'react';
import { ArrowRight, CalendarPlus, RotateCcw } from 'lucide-react';
import { MONTH_NAMES } from '../data/seed';
import type { MutasiState, TabId, TableFilterStatus } from '../types/mutasi';
import { computeItem, formatNum, getStockStatus } from '../utils/mutasi';
import { ConfirmModal } from './ConfirmModal';

interface DashboardViewProps {
  state: MutasiState;
  onNavigate: (tab: TabId, filterPreset?: { status?: TableFilterStatus; query?: string }) => void;
  onNextMonth: () => void;
  onResetTemplate: () => void;
}

export function DashboardView({
  state,
  onNavigate,
  onNextMonth,
  onResetTemplate,
}: DashboardViewProps) {
  const [confirmMode, setConfirmMode] = useState<'next-month' | 'reset' | null>(null);
  const [hoveredTopId, setHoveredTopId] = useState<number | null>(null);

  const metrics = useMemo(() => {
    const computed = state.items.map((item) => ({
      item,
      c: computeItem(item),
      status: getStockStatus(item, state.low),
    }));

    const totalUsage = computed.reduce((sum, x) => sum + x.c.t, 0);
    const totalPersediaan = computed.reduce((sum, x) => sum + x.c.p, 0);
    const totalExpired = computed.reduce((sum, x) => sum + Number(x.item.exp || 0), 0);
    const deadStock = computed.filter((x) => x.c.t === 0);
    const negativeItems = computed.filter((x) => x.status === 'neg');
    const lowItems = computed.filter((x) => x.status === 'low');
    const topUsage = computed
      .filter((x) => x.c.t > 0)
      .sort((a, b) => b.c.t - a.c.t)
      .slice(0, 10);

    const categoryBreakdown = state.cats
      .map((cat) => {
        const group = computed.filter((x) => x.item.cat === cat);
        return {
          cat,
          count: group.length,
          persediaan: group.reduce((s, x) => s + x.c.p, 0),
          pemakaian: group.reduce((s, x) => s + x.c.t, 0),
          sisa: group.reduce((s, x) => s + x.c.a, 0),
        };
      })
      .filter((g) => g.count > 0);

    return {
      totalItems: state.items.length,
      totalUsage,
      totalPersediaan,
      totalExpired,
      deadCount: deadStock.length,
      negativeItems,
      lowItems,
      topUsage,
      categoryBreakdown,
    };
  }, [state]);

  const maxTopUsage = metrics.topUsage[0]?.c.t || 1;
  const nextMonthIndex = (state.m + 1) % 12;
  const nextYear = state.m === 11 ? state.y + 1 : state.y;

  return (
    <div className="space-y-6">
      {/* Period heading */}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Ringkasan Mutasi Obat
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Periode {MONTH_NAMES[state.m]} {state.y} · Ambang stok menipis ≤{' '}
            <span className="font-mono-num font-medium text-slate-700">{state.low}%</span> dari persediaan
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('quick')}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
        >
          Input Pemakaian Hari Ini
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 5 KPI summary strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Item Obat</div>
          <div className="mt-1.5 font-mono-num text-2xl font-semibold text-slate-900">
            {formatNum(metrics.totalItems)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {state.cats.length} kategori aktif
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Pemakaian</div>
          <div className="mt-1.5 font-mono-num text-2xl font-semibold text-teal-700">
            {formatNum(metrics.totalUsage)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Unit keluar bulan ini
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Dead Stock</div>
          <div className="mt-1.5 font-mono-num text-2xl font-semibold text-slate-900">
            {formatNum(metrics.deadCount)}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('table', { status: 'dead' })}
            className="mt-1 text-xs font-medium text-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            Lihat pemakaian 0
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Stok Menipis</div>
          <div className="mt-1.5 font-mono-num text-2xl font-semibold text-amber-600">
            {formatNum(metrics.lowItems.length)}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('table', { status: 'low' })}
            className="mt-1 text-xs font-medium text-amber-700 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            Periksa item menipis
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 col-span-2 md:col-span-1">
          <div className="text-xs font-medium text-slate-500">Stok Minus</div>
          <div className="mt-1.5 font-mono-num text-2xl font-semibold text-red-600">
            {formatNum(metrics.negativeItems.length)}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('table', { status: 'neg' })}
            className="mt-1 text-xs font-medium text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            Tinjau selisih minus
          </button>
        </div>
      </div>

      {/* Main Analytics + Stock Alerts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top 10 Horizontal Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                10 Obat Pemakaian Tertinggi
              </h2>
              <p className="text-xs text-slate-500">
                Akumulasi pemakaian harian dan lain-lain selama {MONTH_NAMES[state.m]} {state.y}
              </p>
            </div>
            {metrics.topUsage.length > 0 && (
              <span className="font-mono-num text-xs text-slate-500">
                Tertinggi: {formatNum(metrics.topUsage[0].c.t)} {metrics.topUsage[0].item.unit}
              </span>
            )}
          </div>

          {metrics.topUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <p className="text-sm font-medium text-slate-700">
                Belum ada catatan pemakaian obat pada bulan ini.
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Mulai catat pengeluaran harian melalui Input Cepat Harian atau langsung pada Tabel Mutasi Penuh.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('quick')}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                Catat Pemakaian Pertama
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {metrics.topUsage.map(({ item, c }, index) => {
                const pct = Math.max(4, Math.round((c.t / maxTopUsage) * 100));
                const isHovered = hoveredTopId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setHoveredTopId(item.id)}
                    onMouseLeave={() => setHoveredTopId(null)}
                    onClick={() => onNavigate('table', { query: item.name })}
                    className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-teal-700 rounded-md"
                  >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-slate-800 group-hover:text-teal-700">
                        <span className="mr-2 font-mono-num text-xs text-slate-400">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-mono-num text-xs font-semibold text-slate-700 shrink-0">
                        {formatNum(c.t)} {item.unit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-sm bg-slate-100">
                      <div
                        className={`h-full rounded-sm transition-colors duration-150 ${
                          isHovered ? 'bg-teal-800' : 'bg-teal-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock Alerts Column */}
        <div className="space-y-6">
          {/* Negative Stock Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-red-700">Stok Minus</h2>
              <span className="font-mono-num text-xs font-medium text-red-700">
                {metrics.negativeItems.length} item
              </span>
            </div>
            {metrics.negativeItems.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">Tidak ada stok minus.</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {metrics.negativeItems.slice(0, 30).map(({ item, c }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate('table', { query: item.name })}
                    className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    <span className="truncate font-medium text-slate-800">{item.name}</span>
                    <span className="font-mono-num font-semibold text-red-600 shrink-0">
                      Minus {formatNum(c.a)} {item.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-amber-700">Stok Menipis</h2>
              <span className="font-mono-num text-xs font-medium text-amber-700">
                {metrics.lowItems.length} item
              </span>
            </div>
            {metrics.lowItems.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">Tidak ada stok menipis.</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {metrics.lowItems.slice(0, 30).map(({ item, c }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate('table', { query: item.name })}
                    className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    <span className="truncate font-medium text-slate-800">{item.name}</span>
                    <span className="font-mono-num font-semibold text-amber-700 shrink-0">
                      Menipis · {formatNum(c.a)} {item.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">Rekapitulasi per Kategori</h2>
          <span className="text-xs text-slate-500">
            Total Persediaan: <strong className="font-mono-num text-slate-700">{formatNum(metrics.totalPersediaan)}</strong> · Ekpiyer: <strong className="font-mono-num text-slate-700">{formatNum(metrics.totalExpired)}</strong>
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2 pr-4">Kategori</th>
                <th className="px-4 py-2 text-right">Jumlah Item</th>
                <th className="px-4 py-2 text-right">Total Persediaan</th>
                <th className="px-4 py-2 text-right">Total Pemakaian</th>
                <th className="pl-4 py-2 text-right">Sisa Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.categoryBreakdown.map((row) => (
                <tr key={row.cat} className="hover:bg-slate-50">
                  <td className="py-2 pr-4 font-medium text-slate-800">{row.cat}</td>
                  <td className="px-4 py-2 text-right font-mono-num text-slate-600">
                    {formatNum(row.count)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono-num text-slate-600">
                    {formatNum(row.persediaan)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono-num text-teal-700 font-medium">
                    {formatNum(row.pemakaian)}
                  </td>
                  <td className="pl-4 py-2 text-right font-mono-num font-semibold text-slate-900">
                    {formatNum(row.sisa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period Operations Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pengelolaan Periode Laporan</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tutup buku memindahkan Stok Akhir saat ini menjadi Stok Awal untuk bulan {MONTH_NAMES[nextMonthIndex]} {nextYear}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmMode('next-month')}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="h-4 w-4" />
            Buka Bulan Baru ({MONTH_NAMES[nextMonthIndex]})
          </button>
          <button
            type="button"
            onClick={() => setConfirmMode('reset')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            Kembalikan Template Awal
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmMode === 'next-month'}
        title={`Buka Periode ${MONTH_NAMES[nextMonthIndex]} ${nextYear}?`}
        description="Stok Akhir pada bulan berjalan akan disalin menjadi Stok Awal bulan berikutnya. Kolom penerimaan, pemakaian harian, lain-lain, dan ekpiyer akan dikosongkan."
        confirmLabel="Ya, Buka Bulan Baru"
        onConfirm={() => {
          setConfirmMode(null);
          onNextMonth();
        }}
        onCancel={() => setConfirmMode(null)}
      />

      <ConfirmModal
        open={confirmMode === 'reset'}
        title="Kembalikan ke Template Awal?"
        description="Seluruh catatan stok awal, penerimaan, dan pemakaian yang tersimpan saat ini akan dihapus dan diganti dengan daftar obat standar RS Pratama Sebatik."
        confirmLabel="Ya, Reset Data"
        tone="danger"
        onConfirm={() => {
          setConfirmMode(null);
          onResetTemplate();
        }}
        onCancel={() => setConfirmMode(null)}
      />
    </div>
  );
}
