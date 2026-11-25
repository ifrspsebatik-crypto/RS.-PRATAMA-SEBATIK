import * as XLSX from 'xlsx';
import { MONTH_NAMES, SEED_DATA, SeedItemTuple } from '../data/seed';
import type { ComputedDrug, DrugItem, MutasiState, NumericInput, StockStatus } from '../types/mutasi';

export const STORAGE_KEY = 'mutasi_v1';

export const getTodayIso = (): string => new Date().toISOString().slice(0, 10);

export const formatIndoDate = (dateStr?: string): string => {
  const d = new Date(dateStr || getTodayIso());
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

export const parseNumeric = (value: unknown): NumericInput => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(String(value).replace(',', '.'));
  return Number.isNaN(num) ? '' : num;
};

export const toZero = (value: NumericInput | undefined | null): number =>
  value === '' || value === null || value === undefined ? 0 : Number(value);

export const formatNum = (value: number): string => {
  if (Number.isInteger(value)) return value.toLocaleString('id-ID');
  return Number(value.toFixed(2)).toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

export const computeItem = (item: DrugItem): ComputedDrug => {
  const p = toZero(item.stok) + toZero(item.rec);
  const sd = item.days.reduce<number>((acc, cur) => acc + toZero(cur), 0);
  const t = sd + toZero(item.lain);
  const pe = t + toZero(item.exp);
  const a = Math.round((p - pe) * 1e4) / 1e4;
  return { p, sd, t, pe, a };
};

export const getStockStatus = (item: DrugItem, lowPct: number): StockStatus => {
  const c = computeItem(item);
  if (c.a < 0) return 'neg';
  if (c.p > 0 && c.a <= (c.p * lowPct) / 100) return 'low';
  return '';
};

export const getOrderedItems = (state: MutasiState): DrugItem[] =>
  state.cats.flatMap((cat) => state.items.filter((item) => item.cat === cat));

export const getReportTitle = (m: number, y: number): string =>
  `MUTASI OBAT BULAN ${MONTH_NAMES[m].toUpperCase()} ${y}`;

let nextUid = 1;
export const generateItemId = (): number => nextUid++;

const makeItemFromTuple = (tuple: SeedItemTuple): DrugItem => ({
  id: generateItemId(),
  cat: tuple[0],
  name: tuple[1],
  unit: tuple[2],
  stok: tuple[3],
  rec: tuple[4],
  days: Array.from({ length: 31 }, (_, idx) => tuple[5][idx] ?? ''),
  lain: tuple[6],
  exp: tuple[7],
});

export const createFreshState = (): MutasiState => {
  nextUid = 1;
  return {
    m: SEED_DATA.m,
    y: SEED_DATA.y,
    cats: [...SEED_DATA.cats],
    items: SEED_DATA.items.map(makeItemFromTuple),
    cetak: getTodayIso(),
    low: 20,
  };
};

export const loadMutasiState = (): MutasiState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MutasiState>;
      if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.cats)) {
        nextUid = 1;
        const items: DrugItem[] = parsed.items.map((item) => ({
          id: generateItemId(),
          cat: String(item.cat || 'Obat Fornas'),
          name: String(item.name || ''),
          unit: String(item.unit || 'Tablet'),
          stok: parseNumeric(item.stok),
          rec: parseNumeric(item.rec),
          days: Array.from({ length: 31 }, (_, idx) => parseNumeric(item.days?.[idx])),
          lain: parseNumeric(item.lain),
          exp: parseNumeric(item.exp),
        }));
        return {
          m: typeof parsed.m === 'number' && parsed.m >= 0 && parsed.m <= 11 ? parsed.m : SEED_DATA.m,
          y: typeof parsed.y === 'number' && parsed.y > 1900 ? parsed.y : SEED_DATA.y,
          cats: parsed.cats.length ? parsed.cats.map(String) : [...SEED_DATA.cats],
          items,
          cetak: typeof parsed.cetak === 'string' && parsed.cetak ? parsed.cetak : getTodayIso(),
          low: typeof parsed.low === 'number' && !Number.isNaN(parsed.low) ? parsed.low : 20,
        };
      }
    }
  } catch {
    // Fallback to fresh seed if localStorage is corrupted
  }
  return createFreshState();
};

export const saveMutasiState = (state: MutasiState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
};

export interface ImportExcelResult {
  items: DrugItem[];
  cats: string[];
  m?: number;
  y?: number;
}

export const parseExcelFile = async (file: File): Promise<ImportExcelResult> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  let rows: unknown[][] | undefined;
  let sheetContext = '';

  for (const sheetName of wb.SheetNames.slice().reverse()) {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
    });
    const headerIdx = sheetRows.findIndex(
      (row) => String(row[1] ?? '').trim().toUpperCase() === 'NAMA OBAT',
    );
    if (
      headerIdx >= 0 &&
      sheetRows.length - headerIdx > 5 &&
      sheetRows.slice(headerIdx + 2).some((row) => toZero(parseNumeric(row[0])) > 0)
    ) {
      rows = sheetRows.slice(headerIdx + 2);
      sheetContext = `${sheetName} ${(sheetRows[0] || []).join(' ')}`;
      break;
    }
  }

  if (!rows) {
    throw new Error('Format tidak dikenali: kolom NAMA OBAT tidak ditemukan');
  }

  const items: DrugItem[] = [];
  const cats: string[] = [];
  let currentCat = 'Obat Fornas';

  for (const row of rows) {
    const col0 = String(row[0] ?? '');
    const col1 = String(row[1] ?? '').trim();
    if (/mengetahui/i.test(col0) || /^sebatik/i.test(col1)) break;
    if (!col1) continue;

    const unitCell = String(row[2] ?? '').trim();
    if (!unitCell) {
      currentCat = col1;
      continue;
    }

    if (!cats.includes(currentCat)) cats.push(currentCat);

    const valAt = (idx: number): NumericInput => {
      const cell = row[idx];
      return cell === '' || cell === undefined || cell === null ? '' : parseNumeric(cell);
    };

    items.push({
      id: generateItemId(),
      cat: currentCat,
      name: col1,
      unit: unitCell || 'Tablet',
      stok: valAt(3),
      rec: valAt(4),
      days: Array.from({ length: 31 }, (_, d) => {
        const val = valAt(6 + d);
        return val === 0 ? '' : val;
      }),
      lain: valAt(37) === 0 ? '' : valAt(37),
      exp: valAt(39) === 0 ? '' : valAt(39),
    });
  }

  if (!items.length) {
    throw new Error('Tidak ada data obat yang dapat dibaca dari file');
  }

  const lower = sheetContext.toLowerCase();
  const monthIdx = MONTH_NAMES.findIndex((month) => lower.includes(month.toLowerCase()));
  const yearMatch = lower.match(/20\d\d/);

  return {
    items,
    cats,
    m: monthIdx >= 0 ? monthIdx : undefined,
    y: yearMatch ? Number(yearMatch[0]) : undefined,
  };
};

export const exportMutasiExcel = (state: MutasiState): void => {
  const encodeCol = XLSX.utils.encode_col;
  const rows: Array<Array<string | number>> = [
    ['APOTEK RUMAH SAKIT PRATAMA SEBATIK'],
    [getReportTitle(state.m, state.y)],
    [],
    [],
  ];

  const formulaRows: number[] = [];
  const header1: string[] = [
    'NO',
    'NAMA OBAT',
    'SATUAN',
    'STOK',
    'PENERIMAAN',
    'PERSEDIAAN',
    'PEMAKAIAN APOTEK',
  ];
  while (header1.length < 37) header1.push('');
  header1.push(
    'LAIN-LAIN',
    'TOTAL PEMAKAIAN',
    'EKPIYER',
    'PEMAKAIAN + EKPIYER',
    'Persediaan Akhir (Stok Akhir)',
  );

  const header2: Array<string | number> = Array(6)
    .fill('')
    .concat(Array.from({ length: 31 }, (_, k) => k + 1));

  rows.push(header1, header2);

  let no = 0;
  for (const cat of state.cats) {
    const group = state.items.filter((item) => item.cat === cat);
    if (!group.length) continue;
    rows.push(['', cat.toUpperCase()]);
    for (const item of group) {
      const c = computeItem(item);
      rows.push([
        ++no,
        item.name,
        item.unit,
        item.stok,
        item.rec,
        c.p,
        ...item.days,
        item.lain,
        c.t,
        item.exp,
        c.pe,
        c.a,
      ]);
      formulaRows.push(rows.length);
    }
  }

  rows.push(
    [],
    ['Mengetahui,', ...Array(19).fill(''), `Sebatik, ${formatIndoDate(state.cetak)}`],
    ['Ka. Instansi Farmasi', ...Array(19).fill(''), 'Pj Mutasi Obat Apotek'],
    [],
    [],
    [],
    ['Andi Sri Marlina, S.Si.,Apt', ...Array(19).fill(''), 'Kasmawati, S.Farm'],
    ['NIP. 19830125 201101 2 002'],
  );

  const ws = XLSX.utils.aoa_to_sheet(rows);
  for (const r of formulaRows) {
    const setFormula = (colIdx: number, formula: string) => {
      const addr = encodeCol(colIdx) + r;
      if (ws[addr]) {
        ws[addr].f = formula;
      } else {
        ws[addr] = { t: 'n', v: 0, f: formula };
      }
    };
    setFormula(5, `D${r}+E${r}`);
    setFormula(38, `SUM(G${r}:AK${r})+AL${r}`);
    setFormula(40, `AM${r}+AN${r}`);
    setFormula(41, `F${r}-AO${r}`);
  }

  ws['!merges'] = [
    ...[0, 1, 2, 3, 4, 5, 37, 38, 39, 40, 41].map((c) => ({ s: { r: 4, c }, e: { r: 5, c } })),
    { s: { r: 4, c: 6 }, e: { r: 4, c: 36 } },
  ];
  ws['!cols'] = [
    { wch: 5 },
    { wch: 38 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    ...Array(31).fill({ wch: 5 }),
    { wch: 10 },
    { wch: 12 },
    { wch: 9 },
    { wch: 14 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = `Mutasi Obat ${MONTH_NAMES[state.m]} ${state.y}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `MUTASI_OBAT_${MONTH_NAMES[state.m].toUpperCase()}_${state.y}.xlsx`);
};
