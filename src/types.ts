export type TimeFrame = '1D' | '1M' | '1Y' | 'ALL';

export interface HistoryData {
  time: string | number; // yyyy-mm-dd string OR unix timestamp (seconds)
  value: number; // For Line chart
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Composition {
  id: string;
  name: string;
  ticker: string;
  weight: number;
  color?: string;
}

export interface UnitData {
  id: string;
  type: 'fund' | 'stock' | 'crypto' | 'commodity';
  name: string;
  ticker: string; // Yahoo Finance Ticker
  power: number; 
  atk: number;
  def: number;
  agi: number;
  rec: number;
  tier: string;
  imageUrl: string;
  history: Record<TimeFrame, HistoryData[]>;
  details: {
    sharpeRatio: number;
    dividendYield: number;
    expenseRatio: number;
    netAssets: string;
    description: string;
    defaultExpectedReturn: number;
    jpyFundMultiplier?: number; // USインデックスの値を日本の投資信託の基準価額(円)に変換する係数
  };
  components: Composition[];
  countries: Composition[];
}

export interface PortfolioItem {
  unitId: string;
  quantity: number | string; // 文字列も許容して空入力を可能にする
  investedPrincipal: number | string; // これまでの投資元本（含み益計算用）
  monthlyAddition: number | string; 
  expectedAnnualReturn: number | string; 
}
