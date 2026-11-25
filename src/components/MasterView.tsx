import { FormEvent, useMemo, useState } from 'react';
import { FolderPlus, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_UNITS } from '../data/seed';
import type { DrugItem, MutasiState, NumericInput } from '../types/mutasi';
import { getOrderedItems, parseNumeric } from '../utils/mutasi';
import { ConfirmModal } from './ConfirmModal';

interface MasterViewProps {
  state: MutasiState;
  onAddItem: (payload: {
    name: string;
    unit: string;
    cat: string;
    stok: NumericInput;
    rec: NumericInput;
  }) => void;
  onAddCategory: (catName: string) => boolean;
  onUpdateItemMeta: (
    itemId: number,
    patch: Partial<Pick<DrugItem, 'name' | 'unit' | 'cat' | 'stok' | 'rec'>>,
  ) => void;
  onDeleteItem: (itemId: number) => void;
  onToast: (message: string, tone?: 'default' | 'error') => void;
}

export function MasterView({
  state,
  onAddItem,
  onAddCategory,
  onUpdateItemMeta,
  onDeleteItem,
  onToast,
}: MasterViewProps) {
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Tablet');
  const [newCat, setNewCat] = useState(state.cats[0] || 'Obat Fornas');
  const [newStok, setNewStok] = useState('');
  const [newRec, setNewRec] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchMaster, setSearchMaster] = useState('');
  const [itemToDelete, setItemToDelete] = useState<DrugItem | null>(null);

  const unitOptions = useMemo(() => {
    return Array.from(new Set([...DEFAULT_UNITS, ...state.items.map((i) => i.unit).filter(Boolean)]));
  }, [state.items]);

  const orderedItems = useMemo(() => {
    const q = searchMaster.trim().toLowerCase();
    const list = getOrderedItems(state);
    if (!q) return list;
    return list.filter(
      (i) => i.name.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q),
    );
  }, [state, searchMaster]);

  const handleAddDrug = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      onToast('Isi nama obat terlebih dahulu', 'error');
      return;
    }
    onAddItem({
      name: trimmed,
      unit: newUnit,
      cat: newCat || state.cats[0] || 'Obat Fornas',
      stok: parseNumeric(newStok),
      rec: parseNumeric(newRec),
    });
    setNewName('');
    setNewStok('');
    setNewRec('');
    onToast(`Obat ditambahkan: ${trimmed}`);
  };

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      onToast('Isi nama kategori baru', 'error');
      return;
    }
    const added = onAddCategory(trimmed);
    if (!added) {
      onToast('Kategori sudah ada', 'error');
      return;
    }
    setNewCategoryName('');
    setNewCat(trimmed);
    onToast(`Kategori ditambahkan: ${trimmed}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Master Obat &amp; Kategori</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Kelola daftar katalog obat apotek, satuan, kategori program, stok awal, dan penerimaan.
        </p>
      </div>

      {/* Add Medication + Category Forms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleAddDrug}
          className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8"
        >
          <h2 className="text-sm font-semibold text-slate-900">Tambah Obat Baru</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama obat & kekuatan"
              aria-label="Nama obat dan kekuatan"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none lg:col-span-2"
            />
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              aria-label="Satuan obat"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-700 focus:outline-none"
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              aria-label="Kategori obat"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-700 focus:outline-none"
            >
              {state.cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={newStok}
              onChange={(e) => setNewStok(e.target.value)}
              placeholder="Stok awal"
              aria-label="Stok awal"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-num text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
            />
            <input
              type="text"
              inputMode="decimal"
              value={newRec}
              onChange={(e) => setNewRec(e.target.value)}
              placeholder="Penerimaan"
              aria-label="Penerimaan"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-num text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Tambah Obat
            </button>
          </div>
        </form>

        <form
          onSubmit={handleAddCategory}
          className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between lg:col-span-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Tambah Kategori Baru</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Kelompokkan obat baru atau program kesehatan khusus.
            </p>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nama kategori baru"
              aria-label="Nama kategori baru"
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="h-4 w-4" />
              Tambah Kategori
            </button>
          </div>
        </form>
      </div>

      {/* Master Catalog Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="text-sm font-semibold text-slate-900">
            Katalog Obat ({orderedItems.length} item)
          </div>
          <input
            type="text"
            value={searchMaster}
            onChange={(e) => setSearchMaster(e.target.value)}
            placeholder="Filter nama atau kategori..."
            aria-label="Filter katalog obat"
            className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
          />
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200" style={{ maxHeight: '64vh' }}>
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-teal-700 text-xs font-semibold text-white">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">NO</th>
                <th className="px-3 py-2.5 min-w-[260px]">NAMA OBAT</th>
                <th className="px-3 py-2.5 w-32">SATUAN</th>
                <th className="px-3 py-2.5 w-48">KATEGORI</th>
                <th className="px-3 py-2.5 w-28 text-right">STOK AWAL</th>
                <th className="px-3 py-2.5 w-28 text-right">PENERIMAAN</th>
                <th className="px-3 py-2.5 w-16 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orderedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-mono-num text-xs text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => onUpdateItemMeta(item.id, { name: e.target.value })}
                      aria-label={`Nama obat ${item.name}`}
                      className="w-full rounded border border-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={item.unit}
                      onChange={(e) => onUpdateItemMeta(item.id, { unit: e.target.value })}
                      aria-label={`Satuan ${item.name}`}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-teal-700 focus:outline-none"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={item.cat}
                      onChange={(e) => onUpdateItemMeta(item.id, { cat: e.target.value })}
                      aria-label={`Kategori ${item.name}`}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-teal-700 focus:outline-none"
                    >
                      {state.cats.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.stok === '' || item.stok === null ? '' : String(item.stok)}
                      onChange={(e) =>
                        onUpdateItemMeta(item.id, { stok: parseNumeric(e.target.value) })
                      }
                      aria-label={`Stok awal ${item.name}`}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-right font-mono-num text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.rec === '' || item.rec === null ? '' : String(item.rec)}
                      onChange={(e) =>
                        onUpdateItemMeta(item.id, { rec: parseNumeric(e.target.value) })
                      }
                      aria-label={`Penerimaan ${item.name}`}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-right font-mono-num text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      aria-label={`Hapus ${item.name}`}
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
      </div>

      <ConfirmModal
        open={itemToDelete !== null}
        title="Hapus Obat dari Katalog?"
        description={
          itemToDelete
            ? `Obat "${itemToDelete.name}" beserta seluruh catatan pemakaiannya pada bulan ini akan dihapus.`
            : ''
        }
        confirmLabel="Hapus Obat"
        tone="danger"
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteItem(itemToDelete.id);
            onToast(`Obat dihapus: ${itemToDelete.name}`);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
