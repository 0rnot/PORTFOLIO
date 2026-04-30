import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { UnitData, HistoryData } from './types';
import { MOCK_UNITS } from './mockData';
import { fetchCurrentPrices, fetchStockChart } from './api';
import Dashboard from './components/Dashboard';
import UnitStatus from './components/UnitStatus';
import Portfolio from './components/Portfolio';

function App() {
  const [units, setUnits] = useState<UnitData[]>(MOCK_UNITS);
  const location = useLocation();
  const realPricesRef = useRef<Record<string, number>>({});
  const initFetched = useRef(false);

  // 開発環境(HMR)用: mockData.ts が更新されたら units に反映させる
  useEffect(() => {
    setUnits(prev => {
      // 既存の価格や履歴を維持しつつ、コンポーネント情報などを最新のMOCK_UNITSで上書きする
      return MOCK_UNITS.map(mockUnit => {
        const existing = prev.find(p => p.id === mockUnit.id);
        if (existing) {
          return { ...existing, components: mockUnit.components, details: mockUnit.details, name: mockUnit.name };
        }
        return mockUnit;
      });
    });
  }, [MOCK_UNITS]);

  // 初期ロード時に本物の履歴データを取得し、グラフの急な変動（モックとのギャップ）を防ぐ
  useEffect(() => {
    if (initFetched.current) return;
    initFetched.current = true;

    const initializeRealData = async () => {
      const updatedUnits = await Promise.all(units.map(async (unit) => {
        try {
          // リアルな履歴を取得 (1y, 1mo, 1d)
          const data1Y = await fetchStockChart(unit.ticker, '1y', '1d');
          const data1D = await fetchStockChart(unit.ticker, '1d', '5m'); // 日中足

          if (data1Y && data1Y.length > 0) {
            const data1M = data1Y.slice(-30); // 1Yデータから直近30日を抽出
            // ALLは簡易的に1Yデータで代用するか、別途取得するが今回は軽量化のため1Yを利用
            const dataAll = await fetchStockChart(unit.ticker, 'max', '1mo') || data1Y;

            // 日本の投資信託の基準価額に近づけるための乗数（設定されていれば適用）
            const multiplier = unit.details.jpyFundMultiplier || 1;

            let currentData1D = data1D && data1D.length > 0 ? data1D : [data1Y[data1Y.length - 1]];
            const currentPrice = currentData1D[currentData1D.length - 1].close * multiplier;

            realPricesRef.current[unit.ticker] = currentPrice;

            // 履歴データに重複した時間がないかフィルタリング（lightweight-charts対策）しつつ乗数を適用
            const applyMultiplierAndFilter = (data: HistoryData[]) => {
              const seen = new Set();
              return data.filter(item => {
                if (seen.has(item.time)) return false;
                seen.add(item.time);
                return true;
              }).map(item => ({
                ...item,
                open: item.open * multiplier,
                high: item.high * multiplier,
                low: item.low * multiplier,
                close: item.close * multiplier,
                value: item.value * multiplier
              }));
            };

            return {
              ...unit,
              power: currentPrice,
              history: {
                '1D': applyMultiplierAndFilter(currentData1D),
                '1M': applyMultiplierAndFilter(data1M),
                '1Y': applyMultiplierAndFilter(data1Y),
                'ALL': applyMultiplierAndFilter(dataAll)
              }
            };
          }
        } catch (e) {
          console.error(`Failed to fetch real history for ${unit.ticker}`);
        }
        return unit; // 失敗時はモックデータのまま
      }));

      setUnits(updatedUnits);
    };

    initializeRealData();
  }, []); // 最初の1回のみ

  // 1分ごとの真の価格取得
  useEffect(() => {
    const updateTruePrices = async () => {
      const tickers = units.map(u => u.ticker);
      const currentPrices = await fetchCurrentPrices(tickers);
      if (Object.keys(currentPrices).length > 0) {
        // 現在価格の更新時にも multiplier を適用する
        const updatedPrices: Record<string, number> = {};
        for (const [ticker, price] of Object.entries(currentPrices)) {
          const unit = units.find(u => u.ticker === ticker);
          const multiplier = unit?.details.jpyFundMultiplier || 1;
          updatedPrices[ticker] = price * multiplier;
        }
        realPricesRef.current = { ...realPricesRef.current, ...updatedPrices };
      }
    };

    const interval = setInterval(updateTruePrices, 60000); // 1分ごとに更新
    return () => clearInterval(interval);
  }, [units]);

  // 2秒ごとのボラティリティ・シミュレーション（ゲーム的なリアルタイム感を演出）
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setUnits(prevUnits => prevUnits.map(unit => {
        const basePower = realPricesRef.current[unit.ticker] || unit.power;
        
        // 銘柄のティアや属性に基づくボラティリティ係数
        const volMultiplier = unit.type === 'crypto' ? 0.002 : unit.type === 'stock' ? 0.001 : 0.0005;
        const change = basePower * volMultiplier * (Math.random() - 0.5);
        const newPower = Number((basePower + change).toFixed(2));

        // 1Dの履歴の最新のローソク足を更新
        const newHistory1D = [...unit.history['1D']];
        if (newHistory1D.length > 0) {
          const lastData = newHistory1D[newHistory1D.length - 1];
          const updatedLastData = {
            ...lastData,
            close: newPower,
            value: newPower,
            high: Math.max(lastData.high || 0, newPower),
            low: Math.min(lastData.low || newPower, newPower)
          };
          newHistory1D[newHistory1D.length - 1] = updatedLastData;
        }

        return {
          ...unit,
          power: newPower,
          history: {
            ...unit.history,
            '1D': newHistory1D
          }
        };
      }));
    }, 2000);

    return () => clearInterval(tickInterval);
  }, []);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/unit/')) return 'UNIT STATUS';
    if (location.pathname === '/portfolio') return 'PORTFOLIO COMMAND';
    return 'COMMAND CENTER';
  };

  return (
    <div>
      <header className="ba-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 className="ba-header-title">{getPageTitle()}</h1>
        <nav style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
          <Link to="/" style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--cp-cyan)', letterSpacing: '2px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap', textDecoration: 'none' }}>DASH</Link>
          <Link to="/portfolio" style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--cp-magenta)', letterSpacing: '2px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap', textDecoration: 'none' }}>PORTFOLIO</Link>
        </nav>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard units={units} />} />
          <Route path="/unit/:id" element={<UnitStatus units={units} />} />
          <Route path="/portfolio" element={<Portfolio units={units} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
