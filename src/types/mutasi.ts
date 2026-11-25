export type NumericInput = number | '';

export interface DrugItem {
  id: number;
  cat: string;
  name: string;
  unit: string;
  stok: NumericInput;
  rec: NumericInput;
  days: NumericInput[];
  lain: NumericInput;
  exp: NumericInput;
}

export interface MutasiState {
  m: number;
  y: number;
  cats: string[];
  items: DrugItem[];
  cetak: string;
  low: number;
}

export interface ComputedDrug {
  p: number; // persediaan (stok + rec)
  sd: number; // sum of daily usage
  t: number; // total pemakaian (sd + lain)
  pe: number; // pemakaian + ekpiyer (t + exp)
  a: number; // persediaan akhir (p - pe)
}

export type StockStatus = 'neg' | 'low' | '';

export type TabId = 'dash' | 'quick' | 'table' | 'master';

export type TableFilterStatus = '' | 'aktif' | 'dead' | 'neg' | 'low';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'default' | 'error';
}
