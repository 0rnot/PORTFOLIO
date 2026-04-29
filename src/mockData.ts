import { UnitData, HistoryData, Composition } from './types';

const generateHistory = (base: number, points: number, volatility: number): HistoryData[] => {
  const data: HistoryData[] = [];
  let current = base;
  for (let i = 0; i < points; i++) {
    const open = current;
    const change = (Math.random() - 0.5) * volatility;
    current += change;
    const close = current;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    const d = new Date();
    d.setDate(d.getDate() - (points - i));
    const time = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    data.push({
      time,
      value: Number(close.toFixed(2)),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });
  }
  return data;
};

// Google FaviconV2 API で高品質ロゴを取得（従来のs2より鮮明）
const getLogo = (domain: string) => `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;

const createUnit = (
  id: string, type: 'fund'|'stock'|'crypto'|'commodity', name: string, ticker: string, 
  power: number, atk: number, def: number, agi: number, rec: number, tier: string, 
  imageUrl: string, expected: number, components: Composition[], countries: Composition[], jpyFundMultiplier?: number
): UnitData => ({
  id, type, name, ticker, power, atk, def, agi, rec, tier, imageUrl,
  history: {
    '1D': generateHistory(power, 24, power * 0.005),
    '1M': generateHistory(power * 0.95, 30, power * 0.02),
    '1Y': generateHistory(power * 0.8, 250, power * 0.05),
    'ALL': generateHistory(power * 0.5, 1000, power * 0.1),
  },
  details: {
    sharpeRatio: type === 'fund' ? 1.2 : 0.8,
    dividendYield: type === 'stock' ? 2.0 : type === 'crypto' ? 0 : 1.5,
    expenseRatio: type === 'fund' ? 0.1 : 0,
    netAssets: type === 'crypto' ? '1兆ドル' : '10兆円',
    description: `${name} のトラッキングデータ。`,
    defaultExpectedReturn: expected,
    jpyFundMultiplier
  },
  components,
  countries
});

const US_COUNTRY = [{ id: 'us', name: 'United States', ticker: 'US', weight: 100, color: '#3b82f6' }];
const GLOBAL_COUNTRY = [
  { id: 'us', name: 'United States', ticker: 'US', weight: 62.1, color: '#3b82f6' },
  { id: 'jp', name: 'Japan', ticker: 'JP', weight: 5.4, color: '#ef4444' },
  { id: 'uk', name: 'United Kingdom', ticker: 'UK', weight: 3.6, color: '#14b8a6' },
  { id: 'other', name: 'Others', ticker: 'OTHER', weight: 28.9, color: '#64748b' }
];
const DECENTRALIZED = [{ id: 'global', name: 'Global Decentralized', ticker: 'GLOBAL', weight: 100, color: '#f59e0b' }];
const COMMODITY_GEO = [{ id: 'global', name: 'Global Commodity', ticker: 'GLOBAL', weight: 100, color: '#eab308' }];

// 主要投資信託
const funds = [
  createUnit('sp500', 'fund', 'eMAXIS Slim S&P 500 相当', '^GSPC', 5200, 85, 70, 95, 40, 'S', getLogo('am.mufg.jp'), 7.0, [
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', weight: 7.1, color: '#3b82f6' },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', weight: 6.5, color: '#0ea5e9' },
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 4.8, color: '#22c55e' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 3.4, color: '#f59e0b' },
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 2.1, color: '#8b5cf6' },
    { id: 'googl', name: 'Alphabet Inc.', ticker: 'GOOGL', weight: 2.0, color: '#14b8a6' },
    { id: 'brkb', name: 'Berkshire Hathaway', ticker: 'BRK-B', weight: 1.7, color: '#64748b' },
    { id: 'lly', name: 'Eli Lilly', ticker: 'LLY', weight: 1.4, color: '#ef4444' },
    { id: 'avgo', name: 'Broadcom', ticker: 'AVGO', weight: 1.3, color: '#3b82f6' },
    { id: 'tsla', name: 'Tesla Inc.', ticker: 'TSLA', weight: 1.2, color: '#ef4444' },
  ], US_COUNTRY, 5.881), // ユーザーの保有資産(1,977,212円 / 470,978口)に合わせて基準価額がピタリと一致するよう係数を調整
  createUnit('ndq100', 'fund', 'eMAXIS NASDAQ100 相当', '^NDX', 18000, 98, 45, 80, 10, 'S', getLogo('am.mufg.jp'), 10.0, [
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', weight: 8.9, color: '#3b82f6' },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', weight: 8.7, color: '#0ea5e9' },
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 4.8, color: '#22c55e' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 4.4, color: '#f59e0b' },
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 4.1, color: '#8b5cf6' },
  ], US_COUNTRY, 1.206), // ユーザーの保有資産(1,750,476円 / 536,923口)に合わせて基準価額がピタリと一致するよう係数を調整
  createUnit('acwi', 'fund', 'eMAXIS Slim 全世界株式 相当', 'URTH', 140, 60, 90, 100, 50, 'S', getLogo('am.mufg.jp'), 5.5, [
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', weight: 4.3, color: '#3b82f6' },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', weight: 3.8, color: '#0ea5e9' },
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 2.9, color: '#22c55e' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 2.0, color: '#f59e0b' },
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 1.3, color: '#8b5cf6' },
    { id: 'googl', name: 'Alphabet Inc.', ticker: 'GOOGL', weight: 1.2, color: '#14b8a6' },
    { id: 'lly', name: 'Eli Lilly', ticker: 'LLY', weight: 0.8, color: '#ef4444' },
    { id: 'tsm', name: 'TSMC', ticker: 'TSM', weight: 0.8, color: '#22c55e' },
    { id: 'avgo', name: 'Broadcom', ticker: 'AVGO', weight: 0.8, color: '#3b82f6' },
    { id: 'brkb', name: 'Berkshire Hathaway', ticker: 'BRK-B', weight: 0.8, color: '#64748b' },
  ], GLOBAL_COUNTRY, 150),
  createUnit('fang', 'fund', 'iFreeNEXT FANG+ 相当', '^NYFANG', 10000, 120, 20, 85, 0, 'EX', getLogo('daiwa-am.co.jp'), 15.0, [
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 10.5, color: '#8b5cf6' },
    { id: 'tsla', name: 'Tesla Inc.', ticker: 'TSLA', weight: 10.2, color: '#ef4444' },
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 9.8, color: '#22c55e' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 9.5, color: '#f59e0b' },
  ], US_COUNTRY, 4.2),
  createUnit('vti', 'fund', 'Vanguard Total Stock Market', 'VTI', 260, 80, 75, 95, 45, 'A', getLogo('vanguard.com'), 7.0, [], US_COUNTRY),
  createUnit('vxus', 'fund', 'Vanguard Total International', 'VXUS', 60, 50, 85, 90, 60, 'B', getLogo('vanguard.com'), 4.0, [], GLOBAL_COUNTRY),
  createUnit('vym', 'fund', 'Vanguard High Dividend Yield', 'VYM', 120, 40, 90, 60, 100, 'A', getLogo('vanguard.com'), 6.0, [], US_COUNTRY),
  createUnit('qqq', 'fund', 'Invesco QQQ Trust', 'QQQ', 440, 98, 45, 80, 10, 'S', getLogo('invesco.com'), 10.0, [], US_COUNTRY),
  createUnit('spy', 'fund', 'SPDR S&P 500 ETF', 'SPY', 520, 85, 70, 95, 40, 'S', getLogo('ssga.com'), 7.0, [], US_COUNTRY),
  createUnit('arkk', 'fund', 'ARK Innovation ETF', 'ARKK', 50, 100, 20, 50, 0, 'C', getLogo('ark-funds.com'), 15.0, [], US_COUNTRY),
  createUnit('dia', 'fund', 'Dow Jones Industrial Average', 'DIA', 390, 70, 80, 80, 70, 'B', getLogo('ssga.com'), 6.5, [], US_COUNTRY),
];

// 時価総額上位の個別銘柄 20個
const stocks = [
  createUnit('aapl', 'stock', 'Apple Inc.', 'AAPL', 170, 95, 60, 100, 20, 'S', getLogo('apple.com'), 10.0, [], US_COUNTRY),
  createUnit('msft', 'stock', 'Microsoft Corp.', 'MSFT', 400, 95, 65, 95, 20, 'S', getLogo('microsoft.com'), 10.0, [], US_COUNTRY),
  createUnit('nvda', 'stock', 'NVIDIA Corp.', 'NVDA', 900, 100, 40, 90, 10, 'EX', getLogo('nvidia.com'), 15.0, [], US_COUNTRY),
  createUnit('amzn', 'stock', 'Amazon.com Inc.', 'AMZN', 180, 90, 50, 90, 10, 'A', getLogo('amazon.com'), 12.0, [], US_COUNTRY),
  createUnit('meta', 'stock', 'Meta Platforms', 'META', 500, 92, 45, 85, 10, 'A', getLogo('meta.com'), 12.0, [], US_COUNTRY),
  createUnit('googl', 'stock', 'Alphabet Inc.', 'GOOGL', 160, 90, 60, 90, 10, 'A', getLogo('google.com'), 10.0, [], US_COUNTRY),
  createUnit('tsla', 'stock', 'Tesla Inc.', 'TSLA', 170, 95, 30, 80, 0, 'B', getLogo('tesla.com'), 18.0, [], US_COUNTRY),
  createUnit('brkb', 'stock', 'Berkshire Hathaway', 'BRK-B', 400, 60, 100, 70, 50, 'A', getLogo('berkshirehathaway.com'), 8.0, [], US_COUNTRY),
  createUnit('lly', 'stock', 'Eli Lilly & Co.', 'LLY', 750, 90, 70, 80, 20, 'A', getLogo('lilly.com'), 14.0, [], US_COUNTRY),
  createUnit('avgo', 'stock', 'Broadcom Inc.', 'AVGO', 1300, 95, 55, 85, 30, 'A', getLogo('broadcom.com'), 12.0, [], US_COUNTRY),
  createUnit('v', 'stock', 'Visa Inc.', 'V', 280, 80, 85, 85, 40, 'A', getLogo('visa.com'), 9.0, [], US_COUNTRY),
  createUnit('jpm', 'stock', 'JPMorgan Chase', 'JPM', 190, 75, 90, 75, 50, 'A', getLogo('jpmorganchase.com'), 8.0, [], US_COUNTRY),
  createUnit('wmt', 'stock', 'Walmart Inc.', 'WMT', 60, 60, 95, 70, 60, 'B', getLogo('walmart.com'), 6.0, [], US_COUNTRY),
  createUnit('ma', 'stock', 'Mastercard Inc.', 'MA', 470, 80, 85, 85, 35, 'A', getLogo('mastercard.com'), 10.0, [], US_COUNTRY),
  createUnit('xom', 'stock', 'Exxon Mobil Corp.', 'XOM', 115, 65, 80, 70, 70, 'B', getLogo('exxonmobil.com'), 7.0, [], US_COUNTRY),
  createUnit('unh', 'stock', 'UnitedHealth Group', 'UNH', 480, 70, 90, 75, 50, 'A', getLogo('uhg.com'), 8.0, [], US_COUNTRY),
  createUnit('hd', 'stock', 'Home Depot Inc.', 'HD', 380, 75, 80, 70, 60, 'B', getLogo('homedepot.com'), 8.0, [], US_COUNTRY),
  createUnit('pg', 'stock', 'Procter & Gamble', 'PG', 160, 50, 100, 60, 70, 'A', getLogo('pg.com'), 6.0, [], US_COUNTRY),
  createUnit('jnj', 'stock', 'Johnson & Johnson', 'JNJ', 155, 55, 95, 65, 65, 'B', getLogo('jnj.com'), 6.0, [], US_COUNTRY),
  createUnit('orcl', 'stock', 'Oracle Corp.', 'ORCL', 125, 85, 70, 80, 30, 'B', getLogo('oracle.com'), 9.0, [], US_COUNTRY),
];

// その他 (Crypto / Commodities) 10個
const others = [
  createUnit('btc', 'crypto', 'Bitcoin', 'BTC-USD', 65000, 120, 20, 90, 0, 'EX', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', 25.0, [], DECENTRALIZED),
  createUnit('eth', 'crypto', 'Ethereum', 'ETH-USD', 3500, 115, 25, 95, 0, 'EX', 'https://cryptologos.cc/logos/ethereum-eth-logo.png', 30.0, [], DECENTRALIZED),
  createUnit('sol', 'crypto', 'Solana', 'SOL-USD', 150, 125, 10, 100, 0, 'S', 'https://cryptologos.cc/logos/solana-sol-logo.png', 40.0, [], DECENTRALIZED),
  createUnit('bnb', 'crypto', 'BNB', 'BNB-USD', 550, 100, 30, 80, 0, 'A', 'https://cryptologos.cc/logos/bnb-bnb-logo.png', 20.0, [], DECENTRALIZED),
  createUnit('xrp', 'crypto', 'XRP', 'XRP-USD', 0.6, 90, 40, 85, 0, 'B', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 15.0, [], DECENTRALIZED),
  createUnit('gold', 'commodity', 'Gold (COMEX)', 'GC=F', 2350, 40, 120, 70, 0, 'A', 'https://images.unsplash.com/photo-1610224329745-f090ceb72352?auto=format&fit=crop&w=600&q=80', 3.0, [], COMMODITY_GEO),
  createUnit('silver', 'commodity', 'Silver (COMEX)', 'SI=F', 28, 50, 100, 80, 0, 'B', 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?auto=format&fit=crop&w=600&q=80', 4.0, [], COMMODITY_GEO),
  createUnit('oil', 'commodity', 'Crude Oil (WTI)', 'CL=F', 85, 70, 60, 70, 0, 'B', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 2.0, [], COMMODITY_GEO),
  createUnit('gas', 'commodity', 'Natural Gas', 'NG=F', 2.0, 80, 40, 60, 0, 'C', 'https://images.unsplash.com/photo-1612277795421-9bc7706a4a34?auto=format&fit=crop&w=600&q=80', 2.0, [], COMMODITY_GEO),
  createUnit('tnx', 'commodity', '10-Year T-Note Yield', '^TNX', 4.5, 30, 100, 50, 100, 'A', 'https://images.unsplash.com/photo-1606189934376-7bf7d9f78311?auto=format&fit=crop&w=600&q=80', 0.0, [], US_COUNTRY),
];

export const MOCK_UNITS: UnitData[] = [...funds, ...stocks, ...others];
