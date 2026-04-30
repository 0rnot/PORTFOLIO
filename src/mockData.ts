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
const getLogo = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const createUnit = (
  id: string, type: 'fund'|'stock'|'crypto'|'commodity', name: string, ticker: string, 
  power: number, atk: number, def: number, agi: number, rec: number, tier: string, 
  imageUrl: string, expected: number, components: Composition[], countries: Composition[], 
  jpyFundMultiplier?: number,
  fundDetails?: { sharpe: number, yield: number, expense: number, assets: string }
): UnitData => ({
  id, type, name, ticker, power, atk, def, agi, rec, tier, imageUrl,
  history: {
    '1D': generateHistory(power, 24, power * 0.005),
    '1M': generateHistory(power * 0.95, 30, power * 0.02),
    '1Y': generateHistory(power * 0.8, 250, power * 0.05),
    'ALL': generateHistory(power * 0.5, 1000, power * 0.1),
  },
  details: {
    sharpeRatio: fundDetails?.sharpe ?? (type === 'fund' ? 1.0 : 0.8),
    dividendYield: fundDetails?.yield ?? (type === 'stock' ? 2.0 : type === 'crypto' ? 0 : 1.5),
    expenseRatio: fundDetails?.expense ?? (type === 'fund' ? 0.1 : 0),
    netAssets: fundDetails?.assets ?? (type === 'crypto' ? '1兆$' : '10兆円'),
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
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 7.8, color: '#22c55e' },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', weight: 6.3, color: '#0ea5e9' },
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', weight: 4.9, color: '#3b82f6' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 4.1, color: '#f59e0b' },
    { id: 'googl', name: 'Alphabet Inc.', ticker: 'GOOGL', weight: 3.2, color: '#14b8a6' },
    { id: 'avgo', name: 'Broadcom Inc.', ticker: 'AVGO', weight: 2.8, color: '#3b82f6' },
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 2.5, color: '#8b5cf6' },
    { id: 'tsla', name: 'Tesla Inc.', ticker: 'TSLA', weight: 2.0, color: '#ef4444' },
    { id: 'brkb', name: 'Berkshire Hathaway', ticker: 'BRK-B', weight: 1.6, color: '#64748b' },
    { id: 'lly', name: 'Eli Lilly', ticker: 'LLY', weight: 1.4, color: '#ef4444' },
  ], US_COUNTRY, 5.881, { sharpe: 1.15, yield: 1.3, expense: 0.093, assets: '5.8兆円' }),
  createUnit('ndq100', 'fund', 'eMAXIS NASDAQ100 相当', '^NDX', 18000, 98, 45, 80, 10, 'S', getLogo('am.mufg.jp'), 10.0, [
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 8.7, color: '#22c55e' },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', weight: 7.6, color: '#0ea5e9' },
    { id: 'msft', name: 'Microsoft Corp.', ticker: 'MSFT', weight: 5.6, color: '#3b82f6' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 4.6, color: '#f59e0b' },
    { id: 'tsla', name: 'Tesla Inc.', ticker: 'TSLA', weight: 3.8, color: '#ef4444' },
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 3.5, color: '#8b5cf6' },
    { id: 'avgo', name: 'Broadcom Inc.', ticker: 'AVGO', weight: 3.0, color: '#3b82f6' },
    { id: 'googl', name: 'Alphabet Inc.', ticker: 'GOOGL', weight: 3.4, color: '#14b8a6' },
    { id: 'wmt', name: 'Walmart Inc.', ticker: 'WMT', weight: 3.4, color: '#64748b' },
    { id: 'cost', name: 'Costco Wholesale', ticker: 'COST', weight: 2.5, color: '#ef4444' },
  ], [
    { id: 'us', name: 'United States', ticker: 'US', weight: 95.2, color: '#3b82f6' },
    { id: 'nl', name: 'Netherlands', ticker: 'NL', weight: 1.8, color: '#f59e0b' },
    { id: 'ca', name: 'Canada', ticker: 'CA', weight: 1.1, color: '#ef4444' },
    { id: 'other', name: 'Others', ticker: 'OTHER', weight: 1.9, color: '#64748b' }
  ], 1.206, { sharpe: 1.05, yield: 0.6, expense: 0.20, assets: '1.2兆円' }),
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
  ], GLOBAL_COUNTRY, 150, { sharpe: 0.95, yield: 1.8, expense: 0.058, assets: '4.5兆円' }),
  createUnit('fang', 'fund', 'iFreeNEXT FANG+ 相当', '^NYFANG', 10000, 120, 20, 85, 0, 'EX', getLogo('daiwa-am.co.jp'), 15.0, [
    { id: 'meta', name: 'Meta Platforms', ticker: 'META', weight: 10.5, color: '#8b5cf6' },
    { id: 'tsla', name: 'Tesla Inc.', ticker: 'TSLA', weight: 10.2, color: '#ef4444' },
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', weight: 9.8, color: '#22c55e' },
    { id: 'amzn', name: 'Amazon.com Inc.', ticker: 'AMZN', weight: 9.5, color: '#f59e0b' },
  ], US_COUNTRY, 4.2, { sharpe: 0.88, yield: 0.1, expense: 0.78, assets: '2500億円' }),
  createUnit('vti', 'fund', 'Vanguard Total Stock Market', 'VTI', 260, 80, 75, 95, 45, 'A', getLogo('vanguard.com'), 7.0, [], US_COUNTRY, undefined, { sharpe: 1.10, yield: 1.3, expense: 0.03, assets: '$1.6T' }),
  createUnit('vxus', 'fund', 'Vanguard Total International', 'VXUS', 60, 50, 85, 90, 60, 'B', getLogo('vanguard.com'), 4.0, [], GLOBAL_COUNTRY, undefined, { sharpe: 0.65, yield: 3.1, expense: 0.07, assets: '$430B' }),
  createUnit('vym', 'fund', 'Vanguard High Dividend Yield', 'VYM', 120, 40, 90, 60, 100, 'A', getLogo('vanguard.com'), 6.0, [], US_COUNTRY, undefined, { sharpe: 0.85, yield: 2.8, expense: 0.06, assets: '$550B' }),
  createUnit('qqq', 'fund', 'Invesco QQQ Trust', 'QQQ', 440, 98, 45, 80, 10, 'S', getLogo('invesco.com'), 10.0, [], US_COUNTRY, undefined, { sharpe: 1.08, yield: 0.5, expense: 0.20, assets: '$290B' }),
  createUnit('spy', 'fund', 'SPDR S&P 500 ETF', 'SPY', 520, 85, 70, 95, 40, 'S', getLogo('ssga.com'), 7.0, [], US_COUNTRY, undefined, { sharpe: 1.12, yield: 1.3, expense: 0.09, assets: '$560B' }),
  createUnit('arkk', 'fund', 'ARK Innovation ETF', 'ARKK', 50, 100, 20, 50, 0, 'C', getLogo('ark-funds.com'), 15.0, [], US_COUNTRY, undefined, { sharpe: 0.25, yield: 0.0, expense: 0.75, assets: '$6.5B' }),
  createUnit('dia', 'fund', 'Dow Jones Industrial Average', 'DIA', 390, 70, 80, 80, 70, 'B', getLogo('ssga.com'), 6.5, [], US_COUNTRY, undefined, { sharpe: 0.92, yield: 1.7, expense: 0.16, assets: '$35B' }),
];

// 時価総額上位の個別銘柄 20個
const stocks = [
  createUnit('aapl', 'stock', 'Apple Inc.', 'AAPL', 170, 95, 60, 100, 20, 'S', getLogo('apple.com'), 10.0, [], US_COUNTRY, undefined, { sharpe: 1.25, yield: 0.5, expense: 0, assets: '$3.4T' }),
  createUnit('msft', 'stock', 'Microsoft Corp.', 'MSFT', 400, 95, 65, 95, 20, 'S', getLogo('microsoft.com'), 10.0, [], US_COUNTRY, undefined, { sharpe: 1.35, yield: 0.7, expense: 0, assets: '$3.1T' }),
  createUnit('nvda', 'stock', 'NVIDIA Corp.', 'NVDA', 900, 100, 40, 90, 10, 'EX', getLogo('nvidia.com'), 15.0, [], US_COUNTRY, undefined, { sharpe: 1.80, yield: 0.02, expense: 0, assets: '$2.8T' }),
  createUnit('amzn', 'stock', 'Amazon.com Inc.', 'AMZN', 180, 90, 50, 90, 10, 'A', getLogo('amazon.com'), 12.0, [], US_COUNTRY, undefined, { sharpe: 1.15, yield: 0.0, expense: 0, assets: '$2.0T' }),
  createUnit('meta', 'stock', 'Meta Platforms', 'META', 500, 92, 45, 85, 10, 'A', getLogo('meta.com'), 12.0, [], US_COUNTRY, undefined, { sharpe: 1.40, yield: 0.4, expense: 0, assets: '$1.4T' }),
  createUnit('googl', 'stock', 'Alphabet Inc.', 'GOOGL', 160, 90, 60, 90, 10, 'A', getLogo('google.com'), 10.0, [], US_COUNTRY, undefined, { sharpe: 1.10, yield: 0.5, expense: 0, assets: '$2.1T' }),
  createUnit('tsla', 'stock', 'Tesla Inc.', 'TSLA', 170, 95, 30, 80, 0, 'B', getLogo('tesla.com'), 18.0, [], US_COUNTRY, undefined, { sharpe: 0.55, yield: 0.0, expense: 0, assets: '$540B' }),
  createUnit('brkb', 'stock', 'Berkshire Hathaway', 'BRK-B', 400, 60, 100, 70, 50, 'A', getLogo('berkshirehathaway.com'), 8.0, [], US_COUNTRY, undefined, { sharpe: 0.95, yield: 0.0, expense: 0, assets: '$880B' }),
  createUnit('lly', 'stock', 'Eli Lilly & Co.', 'LLY', 750, 90, 70, 80, 20, 'A', getLogo('lilly.com'), 14.0, [], US_COUNTRY, undefined, { sharpe: 1.50, yield: 0.7, expense: 0, assets: '$720B' }),
  createUnit('avgo', 'stock', 'Broadcom Inc.', 'AVGO', 1300, 95, 55, 85, 30, 'A', getLogo('broadcom.com'), 12.0, [], US_COUNTRY, undefined, { sharpe: 1.30, yield: 1.3, expense: 0, assets: '$850B' }),
  createUnit('v', 'stock', 'Visa Inc.', 'V', 280, 80, 85, 85, 40, 'A', getLogo('visa.com'), 9.0, [], US_COUNTRY, undefined, { sharpe: 1.20, yield: 0.8, expense: 0, assets: '$580B' }),
  createUnit('jpm', 'stock', 'JPMorgan Chase', 'JPM', 190, 75, 90, 75, 50, 'A', getLogo('jpmorganchase.com'), 8.0, [], US_COUNTRY, undefined, { sharpe: 1.05, yield: 2.3, expense: 0, assets: '$690B' }),
  createUnit('wmt', 'stock', 'Walmart Inc.', 'WMT', 60, 60, 95, 70, 60, 'B', getLogo('walmart.com'), 6.0, [], US_COUNTRY, undefined, { sharpe: 0.80, yield: 1.4, expense: 0, assets: '$530B' }),
  createUnit('ma', 'stock', 'Mastercard Inc.', 'MA', 470, 80, 85, 85, 35, 'A', getLogo('mastercard.com'), 10.0, [], US_COUNTRY, undefined, { sharpe: 1.18, yield: 0.6, expense: 0, assets: '$440B' }),
  createUnit('xom', 'stock', 'Exxon Mobil Corp.', 'XOM', 115, 65, 80, 70, 70, 'B', getLogo('exxonmobil.com'), 7.0, [], US_COUNTRY, undefined, { sharpe: 0.75, yield: 3.4, expense: 0, assets: '$460B' }),
  createUnit('unh', 'stock', 'UnitedHealth Group', 'UNH', 480, 70, 90, 75, 50, 'A', getLogo('uhg.com'), 8.0, [], US_COUNTRY, undefined, { sharpe: 1.00, yield: 1.5, expense: 0, assets: '$520B' }),
  createUnit('hd', 'stock', 'Home Depot Inc.', 'HD', 380, 75, 80, 70, 60, 'B', getLogo('homedepot.com'), 8.0, [], US_COUNTRY, undefined, { sharpe: 0.90, yield: 2.4, expense: 0, assets: '$380B' }),
  createUnit('pg', 'stock', 'Procter & Gamble', 'PG', 160, 50, 100, 60, 70, 'A', getLogo('pg.com'), 6.0, [], US_COUNTRY, undefined, { sharpe: 0.85, yield: 2.5, expense: 0, assets: '$390B' }),
  createUnit('jnj', 'stock', 'Johnson & Johnson', 'JNJ', 155, 55, 95, 65, 65, 'B', getLogo('jnj.com'), 6.0, [], US_COUNTRY, undefined, { sharpe: 0.70, yield: 3.0, expense: 0, assets: '$370B' }),
  createUnit('orcl', 'stock', 'Oracle Corp.', 'ORCL', 125, 85, 70, 80, 30, 'B', getLogo('oracle.com'), 9.0, [], US_COUNTRY, undefined, { sharpe: 1.05, yield: 1.2, expense: 0, assets: '$350B' }),
];

// その他 (Crypto / Commodities) 10個
const others = [
  createUnit('btc', 'crypto', 'Bitcoin', 'BTC-USD', 65000, 120, 20, 90, 0, 'EX', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', 25.0, [], DECENTRALIZED, undefined, { sharpe: 1.30, yield: 0, expense: 0, assets: '$1.3T' }),
  createUnit('eth', 'crypto', 'Ethereum', 'ETH-USD', 3500, 115, 25, 95, 0, 'EX', 'https://cryptologos.cc/logos/ethereum-eth-logo.png', 30.0, [], DECENTRALIZED, undefined, { sharpe: 0.95, yield: 3.5, expense: 0, assets: '$420B' }),
  createUnit('sol', 'crypto', 'Solana', 'SOL-USD', 150, 125, 10, 100, 0, 'S', 'https://cryptologos.cc/logos/solana-sol-logo.png', 40.0, [], DECENTRALIZED, undefined, { sharpe: 0.70, yield: 6.5, expense: 0, assets: '$75B' }),
  createUnit('bnb', 'crypto', 'BNB', 'BNB-USD', 550, 100, 30, 80, 0, 'A', 'https://cryptologos.cc/logos/bnb-bnb-logo.png', 20.0, [], DECENTRALIZED, undefined, { sharpe: 0.80, yield: 0, expense: 0, assets: '$85B' }),
  createUnit('xrp', 'crypto', 'XRP', 'XRP-USD', 0.6, 90, 40, 85, 0, 'B', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 15.0, [], DECENTRALIZED, undefined, { sharpe: 0.45, yield: 0, expense: 0, assets: '$33B' }),
  createUnit('gold', 'commodity', 'Gold (COMEX)', 'GC=F', 2350, 40, 120, 70, 0, 'A', 'https://images.unsplash.com/photo-1610224329745-f090ceb72352?auto=format&fit=crop&w=600&q=80', 3.0, [], COMMODITY_GEO, undefined, { sharpe: 0.50, yield: 0, expense: 0.40, assets: '$210B' }),
  createUnit('silver', 'commodity', 'Silver (COMEX)', 'SI=F', 28, 50, 100, 80, 0, 'B', 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?auto=format&fit=crop&w=600&q=80', 4.0, [], COMMODITY_GEO, undefined, { sharpe: 0.35, yield: 0, expense: 0.50, assets: '$16B' }),
  createUnit('oil', 'commodity', 'Crude Oil (WTI)', 'CL=F', 85, 70, 60, 70, 0, 'B', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 2.0, [], COMMODITY_GEO, undefined, { sharpe: 0.20, yield: 0, expense: 0.45, assets: '$3.5B' }),
  createUnit('gas', 'commodity', 'Natural Gas', 'NG=F', 2.0, 80, 40, 60, 0, 'C', 'https://images.unsplash.com/photo-1612277795421-9bc7706a4a34?auto=format&fit=crop&w=600&q=80', 2.0, [], COMMODITY_GEO, undefined, { sharpe: 0.10, yield: 0, expense: 0.55, assets: '$1.2B' }),
  createUnit('tnx', 'commodity', '10-Year T-Note Yield', '^TNX', 4.5, 30, 100, 50, 100, 'A', 'https://images.unsplash.com/photo-1606189934376-7bf7d9f78311?auto=format&fit=crop&w=600&q=80', 0.0, [], US_COUNTRY, undefined, { sharpe: 0.60, yield: 4.5, expense: 0.15, assets: '$28T' }),
];

export const MOCK_UNITS: UnitData[] = [...funds, ...stocks, ...others];
