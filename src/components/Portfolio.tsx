import { useState, useEffect, useMemo } from 'react';
import { UnitData, PortfolioItem } from '../types';
import { fetchCurrentPrices } from '../api';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  const [simYears, setSimYears] = useState<number>(20);

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

  return (
    <div style={{ padding: '0 12px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* === HERO: 評価額 === */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div className="neon-label" style={{ marginBottom: '4px' }}>TOTAL VALUATION</div>
            <div className="text-cyan" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              ¥{Math.round(aggregatedData.totalValue).toLocaleString()}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
              <span style={{ color: unrealizedGain >= 0 ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                含み益 {unrealizedGain >= 0 ? '+' : ''}¥{Math.round(unrealizedGain).toLocaleString()} ({unrealizedPct.toFixed(2)}%)
              </span>
              <span style={{ color: todayPL >= 0 ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                本日 {todayPL >= 0 ? '+' : ''}¥{Math.round(todayPL).toLocaleString()} ({todayPLPct.toFixed(2)}%)
              </span>
            </div>
          </div>
          {portfolioHistory1D.length > 0 && (
            <div style={{ flex: '1 1 180px', height: '80px', maxWidth: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioHistory1D}>
                  <defs>
                    <linearGradient id="color1D" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--cp-cyan)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--cp-cyan)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Area type="monotone" dataKey="value" stroke="var(--cp-cyan)" strokeWidth={1.5} fill="url(#color1D)" isAnimationActive={false} />
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
            const sparkData = unit.history['1D'].slice(-20).map(d => ({ v: d.close }));
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
                {/* Row 2: Stats + Sparkline */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="neon-label">PRICE</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--cp-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {unit.power.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: isUp ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                          {isUp ? '▲' : '▼'}{diffPct}%
                        </span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="neon-label">評価額</span>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: col, fontVariantNumeric: 'tabular-nums' }}>¥{Math.round(currentValue).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="neon-label">含み益</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: gain >= 0 ? 'var(--cp-green)' : 'var(--cp-red)', fontVariantNumeric: 'tabular-nums' }}>
                        {gain >= 0 ? '+' : ''}¥{Math.round(gain).toLocaleString()} ({gainPct}%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="neon-label">本日損益</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dayChangeVal >= 0 ? 'var(--cp-green)' : 'var(--cp-red)', fontVariantNumeric: 'tabular-nums' }}>
                        {dayChangeVal >= 0 ? '+' : ''}¥{Math.round(dayChangeVal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: '0 0 80px', height: '55px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <defs><linearGradient id={`us-${unit.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.3} /><stop offset="100%" stopColor={col} stopOpacity={0} /></linearGradient></defs>
                        <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1} fill={`url(#us-${unit.id})`} isAnimationActive={false} />
                      </AreaChart>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        {/* Radar */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>STATUS</div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={aggregatedData.radarData}>
                <PolarGrid stroke="rgba(0,240,255,0.15)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--cp-text-sub)', fontSize: 10 }} />
                <Radar dataKey="A" stroke="var(--cp-cyan)" strokeWidth={2} fill="var(--cp-cyan)" fillOpacity={0.2} />
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
            {aggregatedData.topComponents.map((comp, i) => (
              <div key={comp.ticker} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(0,240,255,0.02)', borderLeft: `2px solid ${comp.color || 'var(--cp-cyan)'}`, fontSize: '0.75rem' }}>
                <span><span style={{ color: 'var(--cp-text)', fontWeight: 700, marginRight: '6px' }}>{i + 1}.</span>{comp.ticker} <span style={{ color: 'var(--cp-text-sub)', fontSize: '0.65rem' }}>{comp.name.substring(0, 10)}</span></span>
                <span style={{ color: 'var(--cp-cyan)', fontWeight: 700 }}>{comp.weight.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Territory */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>TERRITORY</div>
          <div style={{ height: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aggregatedData.countries} cx="50%" cy="50%" innerRadius="45%" outerRadius="75%" paddingAngle={2} dataKey="weight" stroke="none">
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
      </div>

      {/* === SIMULATION === */}
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
            <AreaChart data={simulationData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--cp-green)" stopOpacity={0.6} /><stop offset="95%" stopColor="var(--cp-green)" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#64748b" stopOpacity={0.5} /><stop offset="95%" stopColor="#64748b" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--cp-text-sub)" tick={{ fill: 'var(--cp-text-sub)', fontSize: 10 }} />
              <YAxis stroke="var(--cp-text-sub)" tickFormatter={(v) => `¥${(v / 10000).toLocaleString()}万`} tick={{ fill: 'var(--cp-text-sub)', fontSize: 10 }} width={60} />
              <Tooltip formatter={(v: any) => `¥${Number(v).toLocaleString()}`} contentStyle={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-border)', borderRadius: '2px', color: 'var(--cp-text)' }} />
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

