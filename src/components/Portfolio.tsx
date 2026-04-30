import { useState, useEffect, useMemo } from 'react';
import { UnitData, PortfolioItem } from '../types';
import { fetchCurrentPrices, fetchFearGreedIndex } from '../api';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { Plus, Trash2 } from 'lucide-react';

interface PortfolioProps {
  units: UnitData[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f43f5e', '#14b8a6', '#64748b', '#eab308'];

const Portfolio: React.FC<PortfolioProps> = ({ units }) => {
  // 初期ロードでlocalStorageから読み込む
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('portfolioData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            ...item,
            investedPrincipal: item.investedPrincipal || 0
          }));
        }
      } catch (e) {
        console.error("Failed to parse portfolio data");
      }
    }
    return [
      { unitId: 'sp500', quantity: 100000, investedPrincipal: 3000000, monthlyAddition: 30000, expectedAnnualReturn: 7.0 },
      { unitId: 'acwi', quantity: 50000, investedPrincipal: 1500000, monthlyAddition: 20000, expectedAnnualReturn: 5.5 }
    ];
  });

  const [baseExchangeRate, setBaseExchangeRate] = useState<number>(158);
  const [exchangeRate, setExchangeRate] = useState<number>(158);
  const [simYears, setSimYears] = useState(30);
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line');
  const [showATH, setShowATH] = useState(false);
  const [athValue, setAthValue] = useState<number>(() => {
    const saved = localStorage.getItem('portfolio-ath');
    return saved ? Number(saved) : 0;
  });

  // 初回および定期的にリアルタイム為替レートを取得
  useEffect(() => {
    const fetchRate = async () => {
      const prices = await fetchCurrentPrices(['JPY=X']);
      if (prices['JPY=X']) {
        setBaseExchangeRate(prices['JPY=X']);
      }
    };
    fetchRate();
    const interval = setInterval(fetchRate, 60000);
    return () => clearInterval(interval);
  }, []);

  // 保存処理
  useEffect(() => {
    localStorage.setItem('portfolioData', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('exchangeRate', baseExchangeRate.toString());
  }, [baseExchangeRate]);

  // 為替のリアルタイム変動
  useEffect(() => {
    const interval = setInterval(() => {
      setExchangeRate(() => {
        const change = baseExchangeRate * 0.0005 * (Math.random() - 0.5);
        return Number((baseExchangeRate + change).toFixed(3));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [baseExchangeRate]);

  const handleUpdateItem = (index: number, field: keyof PortfolioItem, value: number | string) => {
    const newP = [...portfolio];
    newP[index] = { ...newP[index], [field]: value };
    setPortfolio(newP);
  };

  const handleAdd = () => {
    const unselected = units.find(u => !portfolio.find(p => p.unitId === u.id));
    if (unselected) {
      setPortfolio([...portfolio, {
        unitId: unselected.id,
        quantity: 10000,
        investedPrincipal: 100000,
        monthlyAddition: 10000,
        expectedAnnualReturn: unselected.details.defaultExpectedReturn
      }]);
    }
  };

  const handleRemove = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  // 評価額の計算
  const calcUnitValue = (unit: UnitData, quantity: number | string, priceOverride?: number, rateOverride?: number) => {
    const q = Number(quantity) || 0;
    const rate = rateOverride || Number(exchangeRate) || 158;
    const price = priceOverride !== undefined ? priceOverride : unit.power;
    // 投資信託の場合は jpyFundMultiplier で既に円建ての基準価額になっているため、為替変動は不要
    if (unit.type === 'fund') {
      return (price * q) / 10000;
    }
    // 個別株・仮想通貨などはドル建てなので為替レートをかける
    return price * q * rate;
  };

  // データ集計 (メモ化してパフォーマンス最適化)
  const aggregatedData = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;
    let totalAtk = 0, totalDef = 0, totalAgi = 0, totalRec = 0;
    const componentMap = new Map<string, { name: string, value: number, color?: string }>();
    const countryMap = new Map<string, { name: string, value: number, color?: string }>();

    const items = portfolio.map(item => {
      const unit = units.find(u => u.id === item.unitId);
      if (!unit) return null;

      const value = calcUnitValue(unit, item.quantity);
      totalValue += value;
      return { unit, item, value };
    }).filter(Boolean) as { unit: UnitData, item: PortfolioItem, value: number }[];

    if (totalValue > 0) {
      items.forEach(({ unit, item, value }) => {
        totalInvested += Number(item.investedPrincipal) || 0;
        const weight = value / totalValue;
        totalAtk += unit.atk * weight;
        totalDef += unit.def * weight;
        totalAgi += unit.agi * weight;
        totalRec += unit.rec * weight;

        // 構成銘柄の加重平均を計算
        unit.components.forEach(comp => {
          const addedValue = value * (comp.weight / 100);
          const existing = componentMap.get(comp.ticker);
          if (existing) {
            existing.value += addedValue;
          } else {
            componentMap.set(comp.ticker, { name: comp.name, value: addedValue, color: comp.color });
          }
        });

        // 国別比率の加重平均を計算
        if (unit.countries) {
          unit.countries.forEach(country => {
            const addedValue = value * (country.weight / 100);
            const existing = countryMap.get(country.ticker);
            if (existing) {
              existing.value += addedValue;
            } else {
              countryMap.set(country.ticker, { name: country.name, value: addedValue, color: country.color });
            }
          });
        }
      });
    }

    const topComponents = Array.from(componentMap.entries())
      .map(([ticker, data]) => ({ ticker, name: data.name, weight: (data.value / totalValue) * 100, color: data.color }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    const countries = Array.from(countryMap.entries())
      .map(([ticker, data]) => ({ ticker, name: data.name, weight: (data.value / totalValue) * 100, color: data.color }))
      .sort((a, b) => b.weight - a.weight);

    return {
      items,
      totalValue,
      totalInvested,
      radarData: [
        { subject: 'ATK', A: Math.round(totalAtk) },
        { subject: 'DEF', A: Math.round(totalDef) },
        { subject: 'AGI', A: Math.round(totalAgi) },
        { subject: 'REC', A: Math.round(totalRec) },
      ],
      topComponents,
      countries
    };
  }, [portfolio, units, exchangeRate]);

  // portfolio全体の1D履歴を生成
  const portfolioHistory1D = useMemo(() => {
    const timeMap = new Map<string, number>();

    portfolio.forEach(item => {
      const unit = units.find(u => u.id === item.unitId);
      if (unit && unit.history['1D']) {
        unit.history['1D'].forEach(pt => {
          const val = calcUnitValue(unit, item.quantity, pt.close, baseExchangeRate);
          const timeKey = String(pt.time);
          timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + val);
        });
      }
    });

    return Array.from(timeMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([time, value]) => {
        const d = new Date(Number(time) * 1000);
        return {
          time: isNaN(d.getTime()) ? time : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          value: Math.round(value)
        };
      });
  }, [portfolio, units, baseExchangeRate]);

  // 複利シミュレーションデータの生成 (金融庁等の標準シミュレーターに準拠した月次複利・毎月積立方式)
  const simulationData = useMemo(() => {
    const data = [];

    for (let year = 0; year <= simYears; year++) {
      let yearTotal = 0;
      let yearPrincipal = 0;
      const months = year * 12;

      aggregatedData.items.forEach((item) => {
        const monthlyAddition = Number(item.item.monthlyAddition) || 0;
        const expectedAnnualReturn = Number(item.item.expectedAnnualReturn) || 0;
        const initialValue = item.value;

        // 投資元本: 過去の投資元本 + (毎月積立額 × 経過月数)
        const baseInvested = Number(item.item.investedPrincipal) || 0;
        const principal = baseInvested + (monthlyAddition * months);
        yearPrincipal += principal;

        // 想定年利から月利を算出
        const monthlyRate = expectedAnnualReturn / 100 / 12;

        let projected = initialValue;
        if (year > 0) {
          if (monthlyRate === 0) {
            projected = principal;
          } else {
            // ① 初期投資額の複利計算: PV * (1 + r)^n
            const initialGains = initialValue * Math.pow(1 + monthlyRate, months);

            // ② 毎月積立の複利計算（期末積立の終値公式）: PMT * (((1 + r)^n - 1) / r)
            const monthlyGains = monthlyAddition * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

            projected = initialGains + monthlyGains;
          }
        }

        yearTotal += projected;
      });

      data.push({
        year: `Year ${year}`,
        Principal: Math.round(yearPrincipal),
        Projected: Math.round(yearTotal),
      });
    }
    return data;
  }, [aggregatedData, simYears]);

  const unrealizedGain = aggregatedData.totalValue - aggregatedData.totalInvested;
  const unrealizedPct = aggregatedData.totalInvested > 0 ? (unrealizedGain / aggregatedData.totalInvested * 100) : 0;
  const todayStart = portfolioHistory1D.length > 0 ? portfolioHistory1D[0].value : aggregatedData.totalValue;
  const todayPL = aggregatedData.totalValue - todayStart;
  const todayPLPct = todayStart > 0 ? (todayPL / todayStart * 100) : 0;
  const simFinal = simulationData[simulationData.length - 1];
  const simGain = simFinal ? simFinal.Projected - simFinal.Principal : 0;
  const simGainPct = simFinal && simFinal.Principal > 0 ? (simGain / simFinal.Principal * 100) : 0;

  // === ATH SOUND ===
  const playATHSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.3, ctx.currentTime);
      master.connect(ctx.destination);

      // Bass impact
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(80, ctx.currentTime);
      bass.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);
      bassGain.gain.setValueAtTime(0.5, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      bass.connect(bassGain).connect(master);
      bass.start(ctx.currentTime);
      bass.stop(ctx.currentTime + 1);

      // Rising arpeggio (C5 → E5 → G5 → C6 → E6)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + 0.5);
      });

      // Shimmer / sparkle
      const shimmer = ctx.createOscillator();
      const shimGain = ctx.createGain();
      const shimFilter = ctx.createBiquadFilter();
      shimmer.type = 'sawtooth';
      shimmer.frequency.setValueAtTime(2093, ctx.currentTime + 0.5);
      shimFilter.type = 'bandpass';
      shimFilter.frequency.setValueAtTime(3000, ctx.currentTime);
      shimFilter.Q.setValueAtTime(5, ctx.currentTime);
      shimGain.gain.setValueAtTime(0, ctx.currentTime + 0.5);
      shimGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.6);
      shimGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      shimmer.connect(shimFilter).connect(shimGain).connect(master);
      shimmer.start(ctx.currentTime + 0.5);
      shimmer.stop(ctx.currentTime + 2);

      // Final chord (power chord)
      [523.25, 659.25, 783.99].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const t = ctx.currentTime + 0.7;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + 2.5);
      });

      setTimeout(() => ctx.close(), 4000);
    } catch (e) {
      console.warn('ATH sound failed:', e);
    }
  };

  // === ATH DETECTION ===
  useEffect(() => {
    if (aggregatedData.totalValue > 0 && aggregatedData.totalValue > athValue) {
      setAthValue(aggregatedData.totalValue);
      localStorage.setItem('portfolio-ath', String(aggregatedData.totalValue));
      if (athValue > 0) {
        setShowATH(true);
        playATHSound();
        setTimeout(() => setShowATH(false), 4500);
      }
    }
  }, [aggregatedData.totalValue]);

  // === MARKET CLOCK ===
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t); }, []);
  const markets = useMemo(() => {
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const t = utcH * 60 + utcM;
    const isOpen = (openH: number, openM: number, closeH: number, closeM: number) => {
      const o = openH * 60 + openM, c = closeH * 60 + closeM;
      return o < c ? (t >= o && t < c) : (t >= o || t < c);
    };
    return [
      { name: 'TOKYO', tz: 'JST', open: isOpen(0, 0, 6, 0), hours: '09:00-15:00' },
      { name: 'HONG KONG', tz: 'HKT', open: isOpen(1, 30, 8, 0), hours: '09:30-16:00' },
      { name: 'LONDON', tz: 'GMT', open: isOpen(8, 0, 16, 30), hours: '08:00-16:30' },
      { name: 'NEW YORK', tz: 'EST', open: isOpen(14, 30, 21, 0), hours: '09:30-16:00' },
    ];
  }, [now]);

  // === FEAR & GREED INDEX (CNN Real Data) ===
  const [fearGreed, setFearGreed] = useState(50);
  useEffect(() => {
    fetchFearGreedIndex().then(val => { if (val !== null) setFearGreed(val); });
    const interval = setInterval(() => { fetchFearGreedIndex().then(val => { if (val !== null) setFearGreed(val); }); }, 300000);
    return () => clearInterval(interval);
  }, []);
  const fgLabel = fearGreed <= 20 ? 'EXTREME FEAR' : fearGreed <= 40 ? 'FEAR' : fearGreed <= 60 ? 'NEUTRAL' : fearGreed <= 80 ? 'GREED' : 'EXTREME GREED';
  const fgColor = fearGreed <= 20 ? 'var(--cp-red)' : fearGreed <= 40 ? '#f97316' : fearGreed <= 60 ? 'var(--cp-yellow)' : fearGreed <= 80 ? 'var(--cp-green)' : 'var(--cp-cyan)';

  // === PERFORMANCE ATTRIBUTION ===
  const perfAttribution = useMemo(() => {
    return aggregatedData.items.map(item => {
      const hist = item.unit.history['1D'];
      const startPrice = hist[0]?.open || item.unit.power;
      const startVal = calcUnitValue(item.unit, item.item.quantity, startPrice, baseExchangeRate);
      const curVal = item.value;
      const contrib = curVal - startVal;
      return { ticker: item.unit.ticker, contribution: contrib, pct: todayStart > 0 ? (contrib / todayStart * 100) : 0 };
    }).sort((a, b) => b.contribution - a.contribution);
  }, [aggregatedData, baseExchangeRate, todayStart]);

  // === CORRELATION MATRIX ===
  const correlationData = useMemo(() => {
    const items = aggregatedData.items;
    if (items.length < 2) return [];
    const histories = items.map(i => i.unit.history['1D'].map(h => h.close));
    const corr = (a: number[], b: number[]) => {
      const n = Math.min(a.length, b.length);
      if (n < 3) return 0;
      const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
      const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) { num += (a[i]-ma)*(b[i]-mb); da += (a[i]-ma)**2; db += (b[i]-mb)**2; }
      return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
    };
    return items.map((_, i) => items.map((__, j) => i === j ? 1 : corr(histories[i], histories[j])));
  }, [aggregatedData]);

  // === DIVIDEND CALENDAR ===
  const dividendCalendar = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], income: 0 }));
    aggregatedData.items.forEach(item => {
      const annualDiv = item.value * (item.unit.details.dividendYield / 100);
      const quarterly = annualDiv / 4;
      [2, 5, 8, 11].forEach(m => { months[m].income += quarterly; });
    });
    return months;
  }, [aggregatedData]);

  // === MONTE CARLO ===
  const monteCarloData = useMemo(() => {
    if (aggregatedData.items.length === 0) return simulationData;
    const avgReturn = aggregatedData.items.reduce((s, i) => s + (i.item.expectedAnnualReturn as number) * (i.value / aggregatedData.totalValue), 0) / 100;
    const vol = 0.15;
    return simulationData.map((d, idx) => {
      const y = idx;
      const drift = Math.exp(avgReturn * y);
      const devUp = Math.exp(vol * Math.sqrt(y) * 1.65);
      const devDown = Math.exp(-vol * Math.sqrt(y) * 1.65);
      const devMid = Math.exp(vol * Math.sqrt(y) * 0.67);
      return { ...d, Upper90: Math.round(d.Projected * devUp / drift * drift), Lower90: Math.round(d.Projected * devDown / drift * drift), Upper50: Math.round(d.Projected * devMid / drift * drift), Lower50: Math.round(d.Projected / devMid * drift / drift) };
    });
  }, [simulationData, aggregatedData]);

  return (
    <div style={{ padding: '0 12px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ATH Celebration Effect */}
      {showATH && (
        <div className="ath-overlay">
          <div className="ath-badge">
            <div className="ath-badge-title">NEW ATH</div>
            <div className="ath-badge-sub">ALL-TIME HIGH REACHED</div>
            <div style={{ marginTop: '12px', fontSize: 'clamp(1rem, 3vw, 1.8rem)', fontWeight: 900, color: '#39ff14', textShadow: '0 0 20px rgba(57,255,20,0.6)', fontVariantNumeric: 'tabular-nums' }}>
              ¥{Math.round(aggregatedData.totalValue).toLocaleString()}
            </div>
          </div>
          {/* Particles */}
          {Array.from({ length: 30 }).map((_, i) => {
            const angle = (i / 30) * Math.PI * 2;
            const dist = 150 + Math.random() * 200;
            const size = 3 + Math.random() * 5;
            const colors = ['#00f0ff', '#39ff14', '#ff3366', '#f0f', '#fbbf24'];
            return (
              <div key={i} className="ath-particle" style={{
                left: '50%', top: '50%',
                width: `${size}px`, height: `${size}px`,
                background: colors[i % colors.length],
                boxShadow: `0 0 ${size * 2}px ${colors[i % colors.length]}`,
                '--px': `${Math.cos(angle) * dist}px`,
                '--py': `${Math.sin(angle) * dist}px`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              } as React.CSSProperties} />
            );
          })}
          {/* Horizontal Lines */}
          {[20, 40, 60, 80].map(top => (
            <div key={top} className="ath-line" style={{ top: `${top}%`, left: 0, animationDelay: `${top / 100}s` }} />
          ))}
        </div>
      )}

      {/* === HERO: 評価額 === */}
      <div className={`glass-panel${showATH ? ' ath-hero-glow' : ''}`} style={{ padding: '16px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '0 0 auto', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="neon-label" style={{ marginBottom: '4px' }}>TOTAL VALUATION</div>
            <div className="text-cyan" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              ¥{Math.round(aggregatedData.totalValue).toLocaleString()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
              <span style={{ color: unrealizedGain >= 0 ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                含み益 {unrealizedGain >= 0 ? '+' : ''}¥{Math.round(unrealizedGain).toLocaleString()} ({unrealizedPct.toFixed(2)}%)
              </span>
              <span style={{ color: todayPL >= 0 ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                本日 {todayPL >= 0 ? '+' : ''}¥{Math.round(todayPL).toLocaleString()} ({todayPLPct.toFixed(2)}%)
              </span>
            </div>
          </div>
          {portfolioHistory1D.length > 0 && (
            <div style={{ flex: '1 1 300px', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioHistory1D} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="color1D" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={todayPL >= 0 ? 'var(--cp-green)' : 'var(--cp-red)'} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={todayPL >= 0 ? 'var(--cp-green)' : 'var(--cp-red)'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--cp-text-sub)', fontSize: 8 }} interval="preserveStartEnd" />
                  <YAxis domain={['dataMin', 'dataMax']} tick={{ fill: 'var(--cp-text-sub)', fontSize: 8 }} width={50} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v: any) => `¥${Number(v).toLocaleString()}`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)', fontSize: '0.75rem' }} />
                  <Area type="monotone" dataKey="value" stroke={todayPL >= 0 ? 'var(--cp-green)' : 'var(--cp-red)'} strokeWidth={1.5} fill="url(#color1D)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {/* サマリーバー */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--cp-border)', paddingTop: '10px' }}>
          {[
            { label: '元本合計', val: `¥${Math.round(aggregatedData.totalInvested).toLocaleString()}`, color: 'var(--cp-text-sub)' },
            { label: 'USD/JPY', val: (Number(exchangeRate) || 0).toFixed(2), color: 'var(--cp-cyan)' },
            { label: '銘柄数', val: String(aggregatedData.items.length), color: 'var(--cp-magenta)' },
            { label: '加重ATK', val: String(aggregatedData.radarData[0]?.A || 0), color: 'var(--cp-yellow)' },
          ].map(s => (
            <div key={s.label} className="data-card" style={{ flex: '1 1 70px', padding: '6px 8px', textAlign: 'center' }}>
              <div className="neon-label">{s.label}</div>
              <div style={{ fontWeight: 900, fontSize: '0.85rem', color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === UNIT SETUP === */}
      <div className="glass-panel" style={{ padding: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">UNIT SETUP</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {portfolio.map((item, index) => {
            const unit = units.find(u => u.id === item.unitId);
            if (!unit) return null;
            const startOfDay = unit.history['1D'][0]?.open || unit.power;
            const diff = unit.power - startOfDay;
            const diffPct = ((diff / startOfDay) * 100).toFixed(2);
            const isUp = diff >= 0;
            const currentValue = calcUnitValue(unit, item.quantity);
            const gain = currentValue - Number(item.investedPrincipal);
            const gainPct = Number(item.investedPrincipal) > 0 ? (gain / Number(item.investedPrincipal) * 100).toFixed(2) : '0.00';
            const dayChangeVal = calcUnitValue(unit, item.quantity) - calcUnitValue(unit, item.quantity, startOfDay);
            const sparkData = unit.history['1D'].slice(-20).map((d, i) => ({ v: d.close, open: d.open, high: d.high, low: d.low, close: d.close, idx: i }));
            const col = unit.type === 'fund' ? 'var(--cp-cyan)' : unit.type === 'stock' ? 'var(--cp-green)' : 'var(--cp-yellow)';

            return (
              <div key={index} style={{ padding: '10px', borderRadius: '2px', position: 'relative', background: 'rgba(0,240,255,0.02)', border: '1px solid var(--cp-border)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: col }} />
                {/* Row 1: Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={unit.imageUrl} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                  </div>
                  <select value={item.unitId} onChange={(e) => handleUpdateItem(index, 'unitId', e.target.value)}
                    style={{ flex: 1, padding: '5px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--cp-border)', color: 'var(--cp-text)', fontWeight: 700, borderRadius: '2px', outline: 'none', cursor: 'pointer', minWidth: 0, fontSize: '0.8rem' }}>
                    {units.map(u => <option key={u.id} value={u.id}>{u.ticker} - {u.name}</option>)}
                  </select>
                  <button onClick={() => handleRemove(index)} style={{ background: 'rgba(255,51,51,0.1)', border: '1px solid rgba(255,51,51,0.3)', color: 'var(--cp-red)', cursor: 'pointer', padding: '6px', borderRadius: '2px', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Row 2: Stats (left) + Sparkline (right, fills space) */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                  <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="neon-label" style={{ width: '50px' }}>PRICE</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--cp-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {unit.power.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: isUp ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                          {isUp ? '▲' : '▼'}{diffPct}%
                        </span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="neon-label" style={{ width: '50px' }}>評価額</span>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: col, fontVariantNumeric: 'tabular-nums' }}>¥{Math.round(currentValue).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="neon-label" style={{ width: '50px' }}>含み益</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: gain >= 0 ? 'var(--cp-green)' : 'var(--cp-red)', fontVariantNumeric: 'tabular-nums' }}>
                        {gain >= 0 ? '+' : ''}¥{Math.round(gain).toLocaleString()} ({gainPct}%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="neon-label" style={{ width: '50px' }}>本日損益</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dayChangeVal >= 0 ? 'var(--cp-green)' : 'var(--cp-red)', fontVariantNumeric: 'tabular-nums' }}>
                        {dayChangeVal >= 0 ? '+' : ''}¥{Math.round(dayChangeVal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: '1 1 0', height: '80px', minWidth: '120px', position: 'relative' }}>
                    <button onClick={() => setChartMode(chartMode === 'line' ? 'candle' : 'line')} style={{ position: 'absolute', top: 0, right: 0, zIndex: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--cp-border)', color: 'var(--cp-text-sub)', fontSize: '0.55rem', padding: '2px 6px', cursor: 'pointer', borderRadius: '2px', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {chartMode === 'line' ? 'CANDLE' : 'LINE'}
                    </button>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartMode === 'line' ? (
                        <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                          <defs><linearGradient id={`us-${unit.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.4} /><stop offset="100%" stopColor={col} stopOpacity={0} /></linearGradient></defs>
                          <YAxis domain={['dataMin', 'dataMax']} hide />
                          <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} fill={`url(#us-${unit.id})`} isAnimationActive={false} />
                        </AreaChart>
                      ) : (() => {
                        const cData = sparkData;
                        const maxH = Math.max(...cData.map(d => d.high));
                        const minL = Math.min(...cData.map(d => d.low));
                        const rng = maxH - minL || 1;
                        const yS = (v: number) => 4 + (1 - (v - minL) / rng) * 68;
                        const bW = Math.max(Math.floor(100 / cData.length * 0.6), 2);
                        return (
                          <svg width="100%" height="100%" viewBox={`0 0 ${cData.length * (bW + 2) + 8} 76`} preserveAspectRatio="none" style={{ display: 'block' }}>
                            {cData.map((d, ci) => {
                              const isUp = d.close >= d.open;
                              const clr = isUp ? '#39ff14' : '#ff3366';
                              const cx = 4 + ci * (bW + 2) + bW / 2;
                              return (
                                <g key={ci}>
                                  <line x1={cx} y1={yS(d.high)} x2={cx} y2={yS(d.low)} stroke={clr} strokeWidth={0.8} />
                                  <rect x={cx - bW / 2} y={yS(Math.max(d.open, d.close))} width={bW} height={Math.max(yS(Math.min(d.open, d.close)) - yS(Math.max(d.open, d.close)), 0.5)} fill={clr} fillOpacity={isUp ? 0.35 : 0.85} stroke={clr} strokeWidth={0.4} />
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Row 3: Inputs 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { lbl: unit.type === 'fund' ? '口数' : '数量', val: item.quantity, field: 'quantity' as keyof PortfolioItem, green: false },
                    { lbl: '元本(¥)', val: item.investedPrincipal, field: 'investedPrincipal' as keyof PortfolioItem, green: false },
                    { lbl: '毎月積立', val: item.monthlyAddition, field: 'monthlyAddition' as keyof PortfolioItem, green: false },
                    { lbl: '年利(%)', val: item.expectedAnnualReturn, field: 'expectedAnnualReturn' as keyof PortfolioItem, green: true },
                  ].map(inp => (
                    <div key={inp.lbl}>
                      <div className="neon-label" style={{ marginBottom: '2px' }}>{inp.lbl}</div>
                      <input type="number" step={inp.field === 'expectedAnnualReturn' ? '0.1' : undefined} value={inp.val}
                        onChange={(e) => handleUpdateItem(index, inp.field, e.target.value === '' ? '' : Number(e.target.value))}
                        style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--cp-border)', color: inp.green ? 'var(--cp-green)' : 'var(--cp-text)', fontWeight: inp.green ? 700 : 400, borderRadius: '2px', outline: 'none', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <button className="ba-btn" style={{ width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={handleAdd}>
          <Plus size={16} style={{ marginRight: '5px' }} /> ADD UNIT
        </button>
      </div>

      {/* === ANALYTICS GRID === */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        {/* Radar */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>STATUS</div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={aggregatedData.radarData}>
                <PolarGrid stroke="rgba(0,240,255,0.15)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--cp-text-sub)', fontSize: 10 }} />
                <Radar dataKey="A" stroke="var(--cp-cyan)" strokeWidth={2} fill="var(--cp-cyan)" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--cp-border)', paddingTop: '8px' }}>
            {aggregatedData.radarData.map(s => (
              <div key={s.subject} style={{ textAlign: 'center' }}>
                <div className="neon-label">{s.subject}</div>
                <div style={{ fontWeight: 900, color: 'var(--cp-cyan)', fontSize: '1rem' }}>{s.A}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>ALLOCATION</div>
          <div style={{ height: '160px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aggregatedData.items.map(i => ({ name: i.unit.ticker, value: i.value }))} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="value" stroke="none">
                  {aggregatedData.items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `¥${Math.round(Number(v)).toLocaleString()}`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '80px', overflowY: 'auto' }}>
            {aggregatedData.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '1px', background: COLORS[idx % COLORS.length], display: 'inline-block' }} />{item.unit.ticker}</span>
                <span style={{ color: 'var(--cp-cyan)', fontWeight: 700 }}>{((item.value / aggregatedData.totalValue) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Components */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>TOP HOLDINGS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '280px' }}>
            {aggregatedData.topComponents.map((comp, i) => {
              const stockUnit = units.find(u => u.ticker === comp.ticker);
              let chgPct = 0;
              let price = 0;
              if (stockUnit) {
                const hist = stockUnit.history['1D'];
                const open = hist[0]?.open || stockUnit.power;
                price = stockUnit.power;
                chgPct = open > 0 ? ((price - open) / open) * 100 : 0;
              }
              const isUp = chgPct >= 0;
              return (
                <div key={comp.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(0,240,255,0.02)', borderLeft: `2px solid ${comp.color || 'var(--cp-cyan)'}`, fontSize: '0.75rem' }}>
                  <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <span style={{ color: 'var(--cp-text)', fontWeight: 700, marginRight: '4px' }}>{i + 1}.</span>
                    {comp.ticker}
                    <span style={{ color: 'var(--cp-text-sub)', fontSize: '0.6rem', marginLeft: '4px' }}>{comp.name.substring(0, 8)}</span>
                  </span>
                  {stockUnit && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isUp ? 'var(--cp-green)' : 'var(--cp-red)', marginRight: '8px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {isUp ? '▲' : '▼'}{Math.abs(chgPct).toFixed(2)}%
                    </span>
                  )}
                  <span style={{ color: 'var(--cp-cyan)', fontWeight: 700, whiteSpace: 'nowrap' }}>{comp.weight.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Territory */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>TERRITORY</div>
          <div style={{ height: '160px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aggregatedData.countries} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="weight" stroke="none">
                  {aggregatedData.countries.map((e, i) => <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {aggregatedData.countries.map(c => (
              <div key={c.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.color || 'var(--cp-cyan)', display: 'inline-block' }} />{c.name}</span>
                <span style={{ color: 'var(--cp-cyan)', fontWeight: 700 }}>{c.weight.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* FUND DETAILS */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>FUND DETAILS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {aggregatedData.items.map((item, idx) => {
              const u = item.unit;
              const g = item.value - Number(item.item.investedPrincipal);
              const gPct = Number(item.item.investedPrincipal) > 0 ? (g / Number(item.item.investedPrincipal) * 100) : 0;
              return (
                <div key={idx} style={{ padding: '8px', background: 'rgba(0,240,255,0.02)', borderLeft: `2px solid ${COLORS[idx % COLORS.length]}`, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--cp-text)' }}>{u.ticker}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: g >= 0 ? 'var(--cp-green)' : 'var(--cp-red)' }}>{g >= 0 ? '+' : ''}{gPct.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', fontSize: '0.65rem' }}>
                    <div><span style={{ color: 'var(--cp-text-sub)' }}>Sharpe: </span><span style={{ color: 'var(--cp-cyan)' }}>{u.details.sharpeRatio.toFixed(2)}</span></div>
                    <div><span style={{ color: 'var(--cp-text-sub)' }}>Yield: </span><span style={{ color: 'var(--cp-yellow)' }}>{u.details.dividendYield.toFixed(1)}%</span></div>
                    <div><span style={{ color: 'var(--cp-text-sub)' }}>Cost: </span><span style={{ color: 'var(--cp-magenta)' }}>{u.details.expenseRatio.toFixed(2)}%</span></div>
                    <div><span style={{ color: 'var(--cp-text-sub)' }}>AUM: </span><span style={{ color: 'var(--cp-text)' }}>{u.details.netAssets}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RISK METRICS */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>RISK METRICS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(() => {
              const avgSharpe = aggregatedData.items.length > 0 ? aggregatedData.items.reduce((s, i) => s + i.unit.details.sharpeRatio * (i.value / aggregatedData.totalValue), 0) : 0;
              const avgYield = aggregatedData.items.length > 0 ? aggregatedData.items.reduce((s, i) => s + i.unit.details.dividendYield * (i.value / aggregatedData.totalValue), 0) : 0;
              const avgCost = aggregatedData.items.length > 0 ? aggregatedData.items.reduce((s, i) => s + i.unit.details.expenseRatio * (i.value / aggregatedData.totalValue), 0) : 0;
              const monthlyIncome = aggregatedData.totalValue * (avgYield / 100) / 12;
              return [
                { label: 'AVG SHARPE', value: avgSharpe.toFixed(2), color: 'var(--cp-cyan)' },
                { label: 'AVG YIELD', value: `${avgYield.toFixed(2)}%`, color: 'var(--cp-yellow)' },
                { label: 'AVG COST', value: `${avgCost.toFixed(3)}%`, color: 'var(--cp-magenta)' },
                { label: 'EST. MONTHLY', value: `¥${Math.round(monthlyIncome).toLocaleString()}`, color: 'var(--cp-green)' },
                { label: 'INVESTED', value: `¥${Math.round(aggregatedData.totalInvested).toLocaleString()}`, color: 'var(--cp-text-sub)' },
                { label: 'GAIN RATIO', value: `${unrealizedPct.toFixed(1)}%`, color: unrealizedGain >= 0 ? 'var(--cp-green)' : 'var(--cp-red)' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(0,240,255,0.02)', borderLeft: `2px solid ${m.color}` }}>
                  <span className="neon-label">{m.label}</span>
                  <span style={{ fontWeight: 900, fontSize: '0.85rem', color: m.color, fontVariantNumeric: 'tabular-nums' }}>{m.value}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* === MARKET CLOCK + FEAR & GREED === */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        {/* Market Clock */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '10px' }}>MARKET CLOCK</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {markets.map(m => (
              <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(0,240,255,0.02)', borderLeft: `3px solid ${m.open ? 'var(--cp-green)' : 'var(--cp-red)'}` }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--cp-text)' }}>{m.name}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--cp-text-sub)' }}>{m.hours} {m.tz}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.open ? 'var(--cp-green)' : 'var(--cp-red)', display: 'inline-block', boxShadow: m.open ? '0 0 6px var(--cp-green)' : 'none' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, color: m.open ? 'var(--cp-green)' : 'var(--cp-red)' }}>{m.open ? 'OPEN' : 'CLOSED'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fear & Greed Gauge */}
        <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: '10px', alignSelf: 'flex-start' }}>FEAR & GREED</div>
          <div style={{ position: 'relative', width: '160px', height: '90px', overflow: 'hidden' }}>
            <svg viewBox="0 0 200 110" width="160" height="90">
              <defs>
                <linearGradient id="fgGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--cp-red)" />
                  <stop offset="25%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="var(--cp-yellow)" />
                  <stop offset="75%" stopColor="var(--cp-green)" />
                  <stop offset="100%" stopColor="var(--cp-cyan)" />
                </linearGradient>
              </defs>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(fearGreed / 100) * 251.2} 251.2`} />
              <line x1="100" y1="100" x2={100 + 65 * Math.cos(Math.PI - (fearGreed / 100) * Math.PI)} y2={100 - 65 * Math.sin(Math.PI - (fearGreed / 100) * Math.PI)} stroke={fgColor} strokeWidth="2" />
              <circle cx="100" cy="100" r="4" fill={fgColor} />
            </svg>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: fgColor, lineHeight: 1 }}>{fearGreed}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: fgColor, letterSpacing: '2px', marginTop: '2px' }}>{fgLabel}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px', fontSize: '0.55rem', color: 'var(--cp-text-sub)' }}>
            <span>FEAR</span><span>NEUTRAL</span><span>GREED</span>
          </div>
        </div>

        {/* Performance Attribution */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>ATTRIBUTION</div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfAttribution} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--cp-text-sub)', fontSize: 8 }} tickFormatter={(v) => `¥${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="ticker" tick={{ fill: 'var(--cp-cyan)', fontSize: 9, fontWeight: 700 }} width={38} />
                <Tooltip formatter={(v: any) => `¥${Math.round(Number(v)).toLocaleString()}`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)', fontSize: '0.75rem' }} />
                <Bar dataKey="contribution" radius={[0, 2, 2, 0]}>
                  {perfAttribution.map((entry, idx) => <Cell key={idx} fill={entry.contribution >= 0 ? 'var(--cp-green)' : 'var(--cp-red)'} fillOpacity={0.7} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.65rem', color: 'var(--cp-text-sub)' }}>
            <span>LOSS ←</span>
            <span>→ GAIN</span>
          </div>
        </div>
      </div>

      {/* === CORRELATION + DIVIDEND === */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
        {/* Correlation Heatmap */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>CORRELATION</div>
          {correlationData.length > 0 ? (
            <div style={{ overflowX: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.65rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 6px', color: 'var(--cp-text-sub)' }}></th>
                    {aggregatedData.items.map(i => <th key={i.unit.ticker} style={{ padding: '4px 6px', color: 'var(--cp-cyan)', fontWeight: 700, textAlign: 'center' }}>{i.unit.ticker.substring(0, 5)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {correlationData.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ padding: '4px 6px', color: 'var(--cp-cyan)', fontWeight: 700, whiteSpace: 'nowrap' }}>{aggregatedData.items[ri]?.unit.ticker.substring(0, 5)}</td>
                      {row.map((val, ci) => {
                        const abs = Math.abs(val);
                        const bg = val >= 0 ? `rgba(57,255,20,${abs * 0.5})` : `rgba(255,51,102,${abs * 0.5})`;
                        return <td key={ci} style={{ padding: '4px 6px', textAlign: 'center', background: bg, color: 'var(--cp-text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.7rem' }}>{ri === ci ? '1.00' : val.toFixed(2)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px', fontSize: '0.6rem', color: 'var(--cp-text-sub)' }}>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(57,255,20,0.4)', marginRight: '4px', verticalAlign: 'middle' }} />Positive</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(255,51,102,0.4)', marginRight: '4px', verticalAlign: 'middle' }} />Negative</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--cp-text-sub)', fontSize: '0.75rem' }}>2銘柄以上追加してください</div>
          )}
        </div>

        {/* Yield Income */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '4px' }}>YIELD INCOME</div>
          <div style={{ fontSize: '0.55rem', color: 'var(--cp-text-sub)', marginBottom: '6px', lineHeight: 1.3 }}>※再投資型ファンドは内部再投資見込額を含む</div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendCalendar} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--cp-text-sub)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'var(--cp-text-sub)', fontSize: 8 }} tickFormatter={(v) => `¥${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip formatter={(v: any) => `¥${Math.round(Number(v)).toLocaleString()}`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)', fontSize: '0.75rem' }} />
                <Bar dataKey="income" fill="var(--cp-yellow)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem' }}>
            <span style={{ color: 'var(--cp-text-sub)' }}>EST. ANNUAL</span>
            <span style={{ color: 'var(--cp-yellow)', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>¥{Math.round(dividendCalendar.reduce((s, m) => s + m.income, 0)).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* === SIMULATION (Monte Carlo Enhanced) === */}
      <div className="glass-panel" style={{ padding: '14px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
          <div className="section-title" style={{ borderLeftColor: 'var(--cp-green)' }}>SIMULATION</div>
          <select value={simYears} onChange={(e) => setSimYears(Number(e.target.value))}
            style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--cp-green)', border: '1px solid rgba(57,255,20,0.3)', fontWeight: 900, fontSize: '0.85rem', padding: '4px 10px', borderRadius: '2px', cursor: 'pointer' }}>
            <option value={10}>10Y</option><option value={20}>20Y</option><option value={30}>30Y</option><option value={50}>50Y</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {[
            { lbl: `${simYears}年後 評価額`, val: `¥${simFinal?.Projected.toLocaleString()}`, col: 'var(--cp-green)' },
            { lbl: '元本合計', val: `¥${simFinal?.Principal.toLocaleString()}`, col: 'var(--cp-text-sub)' },
            { lbl: '運用益', val: `+¥${simGain.toLocaleString()}`, col: 'var(--cp-cyan)' },
            { lbl: '運用益率', val: `+${simGainPct.toFixed(1)}%`, col: 'var(--cp-magenta)' },
          ].map(c => (
            <div key={c.lbl} className="data-card" style={{ textAlign: 'center' }}>
              <div className="neon-label">{c.lbl}</div>
              <div style={{ fontWeight: 900, fontSize: 'clamp(0.9rem, 2vw, 1.3rem)', color: c.col, fontVariantNumeric: 'tabular-nums' }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 'clamp(200px, 40vw, 350px)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monteCarloData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--cp-green)" stopOpacity={0.6} /><stop offset="95%" stopColor="var(--cp-green)" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#64748b" stopOpacity={0.5} /><stop offset="95%" stopColor="#64748b" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--cp-text-sub)" tick={{ fill: 'var(--cp-text-sub)', fontSize: 10 }} />
              <YAxis stroke="var(--cp-text-sub)" tickFormatter={(v) => `¥${(v / 10000).toLocaleString()}万`} tick={{ fill: 'var(--cp-text-sub)', fontSize: 10 }} width={60} />
              <Tooltip formatter={(v: any) => `¥${Number(v).toLocaleString()}`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)' }} />
              <Area type="monotone" dataKey="Upper90" stroke="none" fill="var(--cp-cyan)" fillOpacity={0.05} name="上位90%" />
              <Area type="monotone" dataKey="Lower90" stroke="none" fill="var(--cp-cyan)" fillOpacity={0.05} name="下位90%" />
              <Area type="monotone" dataKey="Upper50" stroke="none" fill="var(--cp-cyan)" fillOpacity={0.08} name="上位50%" />
              <Area type="monotone" dataKey="Lower50" stroke="none" fill="var(--cp-cyan)" fillOpacity={0.08} name="下位50%" />
              <Area type="monotone" dataKey="Projected" stroke="var(--cp-green)" strokeWidth={2} fillOpacity={1} fill="url(#colorProjected)" name="予想評価額" />
              <Area type="monotone" dataKey="Principal" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorPrincipal)" name="投資元本" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;

