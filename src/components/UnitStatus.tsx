import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UnitData, TimeFrame } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts';
import { ArrowLeft, BarChart2, TrendingUp, Info } from 'lucide-react';

interface UnitStatusProps {
  units: UnitData[];
}

const UnitStatus: React.FC<UnitStatusProps> = ({ units }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const unit = units.find(u => u.id === id);
  
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1Y');
  const [chartType, setChartType] = useState<'line' | 'candle'>('candle');
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);
  const currentChartTypeRef = useRef<'line' | 'candle' | null>(null);

  // Initialize Chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(56, 189, 248, 0.1)' },
        horzLines: { color: 'rgba(56, 189, 248, 0.1)' },
      },
      timeScale: {
        borderColor: 'rgba(56, 189, 248, 0.3)',
      },
      rightPriceScale: {
        borderColor: 'rgba(56, 189, 248, 0.3)',
      },
      autoSize: true, // This allows it to automatically fit the container
    });
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      currentChartTypeRef.current = null;
    };
  }, []);

  // Update Series and Data when unit or chart configuration changes
  useEffect(() => {
    if (!chartRef.current || !unit) return;
    const chart = chartRef.current;

    const historyData = unit.history[timeFrame];
    const sortedData = [...historyData].sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Switch series type if needed
    if (seriesRef.current && currentChartTypeRef.current !== chartType) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (!seriesRef.current) {
      if (chartType === 'candle') {
        seriesRef.current = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      } else {
        seriesRef.current = chart.addLineSeries({
          color: '#0ea5e9',
          lineWidth: 3,
        });
      }
      currentChartTypeRef.current = chartType;
    }

    try {
      if (chartType === 'candle') {
        seriesRef.current.setData(sortedData as any);
      } else {
        seriesRef.current.setData(sortedData.map(d => ({ time: d.time as any, value: d.value })) as any);
      }
      // Only fit content on major changes to prevent jitter on real-time ticks
      if (sortedData.length > 0) {
        // chart.timeScale().fitContent();
      }
    } catch (e) {
      console.error('Failed to set chart data', e);
    }
  }, [timeFrame, chartType, unit]); // unit updates every 2s, but chart is not destroyed anymore

  if (!unit) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Unit Not Found</h2>
        <button className="ba-btn" onClick={() => navigate('/')}>BACK TO COMMAND</button>
      </div>
    );
  }

  const radarData = [
    { subject: 'ATK', A: unit.atk, fullMark: 100 },
    { subject: 'DEF', A: unit.def, fullMark: 100 },
    { subject: 'AGI', A: unit.agi, fullMark: 100 },
    { subject: 'REC', A: unit.rec, fullMark: 100 },
    { subject: 'CRIT', A: unit.tier === 'S' ? 95 : unit.tier === 'A' ? 80 : 60, fullMark: 100 },
  ];

  const startPower = unit.history[timeFrame][0].open || unit.power;
  const diff = unit.power - startPower;
  const diffPercent = ((diff / startPower) * 100).toFixed(2);
  const isUp = diff >= 0;

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <button 
          className="ba-btn" 
          style={{ display: 'flex', alignItems: 'center', background: 'var(--ba-surface)' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} style={{ marginRight: '8px' }} /> BACK TO COMMAND
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* 左側: キャラクターと基本ステータス */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', height: '400px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), var(--ba-bg))' }}>
            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', padding: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <img 
                src={unit.imageUrl} 
                alt={unit.name} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.95))', color: 'white' }}>
              <div style={{ display: 'inline-block', background: 'var(--ba-cyan)', padding: '2px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '5px', transform: 'skewX(-5deg)' }}>
                Tier {unit.tier}
              </div>
              <h2 style={{ fontSize: '2rem', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{unit.ticker}</h2>
              <div style={{ fontSize: '0.9rem', color: 'var(--ba-text-sub)' }}>{unit.name}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 className="text-blue-dark skew-text" style={{ fontSize: '1.2rem', marginBottom: '15px', borderLeft: '4px solid var(--ba-cyan)', paddingLeft: '10px' }}>
              CURRENT POWER
            </h3>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: isUp ? 'var(--ba-white)' : 'var(--ba-red)', lineHeight: 1 }}>
              {unit.power.toLocaleString()}
            </div>
            <div style={{ fontSize: '1.1rem', color: isUp ? 'var(--ba-green)' : 'var(--ba-red)', fontWeight: 'bold', marginTop: '5px' }}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{diffPercent}% ({isUp ? '+' : ''}{Math.round(diff).toLocaleString()})
            </div>
          </div>
        </div>

        {/* 右側: グラフ */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="text-blue-dark skew-text" style={{ fontSize: '1.2rem', borderLeft: '4px solid var(--ba-cyan)', paddingLeft: '10px' }}>
                COMBAT LOG
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', background: 'var(--ba-bg)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--ba-border)' }}>
                  {(['1D', '1M', '1Y', 'ALL'] as TimeFrame[]).map(tf => (
                    <button 
                      key={tf}
                      style={{ 
                        background: timeFrame === tf ? 'var(--ba-cyan)' : 'transparent',
                        color: timeFrame === tf ? 'white' : 'var(--ba-text-sub)',
                        border: 'none', padding: '6px 16px', cursor: 'pointer', fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setTimeFrame(tf)}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', background: 'var(--ba-bg)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--ba-border)' }}>
                  <button 
                    style={{ background: chartType === 'line' ? 'var(--ba-surface-hover)' : 'transparent', color: chartType === 'line' ? 'var(--ba-cyan)' : 'var(--ba-text-sub)', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                    onClick={() => setChartType('line')} title="Line Chart"
                  ><TrendingUp size={18} /></button>
                  <button 
                    style={{ background: chartType === 'candle' ? 'var(--ba-surface-hover)' : 'transparent', color: chartType === 'candle' ? 'var(--ba-cyan)' : 'var(--ba-text-sub)', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                    onClick={() => setChartType('candle')} title="Candlestick Chart"
                  ><BarChart2 size={18} /></button>
                </div>
              </div>
            </div>

            <div ref={chartContainerRef} style={{ width: '100%', flex: 1, minHeight: '300px' }} />
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <h3 className="text-blue-dark skew-text" style={{ fontSize: '1.2rem', marginBottom: '15px', borderLeft: '4px solid var(--ba-cyan)', paddingLeft: '10px' }}>
                UNIT ABILITIES
              </h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-sub" style={{ fontWeight: 'bold' }}>ATK (攻撃力 / リターン)</span>
                  <span style={{ fontWeight: 900, color: 'var(--ba-white)' }}>{unit.atk}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-sub" style={{ fontWeight: 'bold' }}>DEF (防御力 / 低リスク)</span>
                  <span style={{ fontWeight: 900, color: 'var(--ba-white)' }}>{unit.def}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-sub" style={{ fontWeight: 'bold' }}>AGI (敏捷 / 流動性)</span>
                  <span style={{ fontWeight: 900, color: 'var(--ba-white)' }}>{unit.agi}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-sub" style={{ fontWeight: 'bold' }}>REC (回復 / 配当)</span>
                  <span style={{ fontWeight: 900, color: 'var(--ba-white)' }}>{unit.rec}</span>
                </li>
              </ul>
            </div>
            
            <div style={{ flex: 1, height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(14, 165, 233, 0.2)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--ba-text-sub)', fontSize: 11, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Status" dataKey="A" stroke="var(--ba-cyan)" strokeWidth={2} fill="var(--ba-cyan-glow)" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細情報と構成比セクション */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: '1 1 400px', padding: '20px' }}>
          <h3 className="text-blue-dark skew-text" style={{ fontSize: '1.2rem', marginBottom: '15px', borderLeft: '4px solid var(--ba-cyan)', paddingLeft: '10px', display: 'flex', alignItems: 'center' }}>
            <Info size={18} style={{ marginRight: '8px' }} /> DETAIL INFORMATION
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--ba-text-sub)', marginBottom: '20px', lineHeight: 1.6 }}>
            {unit.details.description}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ background: 'var(--ba-surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--ba-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ba-text-sub)', marginBottom: '5px' }}>シャープレシオ (CRIT)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--ba-white)' }}>{unit.details.sharpeRatio.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--ba-surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--ba-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ba-text-sub)', marginBottom: '5px' }}>配当利回り (REC)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--ba-white)' }}>{unit.details.dividendYield.toFixed(2)}%</div>
            </div>
            <div style={{ background: 'var(--ba-surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--ba-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ba-text-sub)', marginBottom: '5px' }}>信託報酬 (コスト)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--ba-white)' }}>{unit.details.expenseRatio.toFixed(4)}%</div>
            </div>
            <div style={{ background: 'var(--ba-surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--ba-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ba-text-sub)', marginBottom: '5px' }}>純資産総額 (AGI)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--ba-white)' }}>{unit.details.netAssets}</div>
            </div>
          </div>
        </div>

        {unit.countries && unit.countries.length > 0 && (
          <div className="glass-panel" style={{ flex: '1 1 350px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-blue-dark skew-text" style={{ fontSize: '1.2rem', marginBottom: '15px', borderLeft: '4px solid var(--ba-cyan)', paddingLeft: '10px' }}>
              TERRITORY (国別構成比)
            </h3>
            <div style={{ display: 'flex', flex: 1, gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1, height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={unit.countries}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="weight"
                      stroke="none"
                    >
                      {unit.countries.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#38bdf8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{ background: 'var(--ba-surface)', border: '1px solid var(--ba-border)', borderRadius: '8px', color: 'white' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '250px', overflowY: 'auto', paddingRight: '10px' }}>
                {unit.countries.map((comp) => (
                  <div key={comp.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: comp.color || '#38bdf8', marginRight: '8px' }}></div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--ba-white)' }}>{comp.name}</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--ba-cyan)', fontSize: '0.85rem' }}>{comp.weight.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {unit.components.length > 0 && (
          <div className="glass-panel" style={{ flex: '1 1 350px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-blue-dark skew-text" style={{ fontSize: '1.2rem', marginBottom: '15px', borderLeft: '4px solid var(--ba-cyan)', paddingLeft: '10px' }}>
              TOP UNITS (構成銘柄TOP10)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, maxHeight: '250px', overflowY: 'auto', paddingRight: '10px' }}>
              {unit.components.map((comp) => {
                const isClickable = units.some(u => u.id === comp.id);
                return (
                  <div 
                    key={comp.ticker} 
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '6px 10px', background: 'var(--ba-surface)', borderRadius: '4px',
                      borderLeft: `3px solid ${comp.color || '#38bdf8'}`,
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => { if (isClickable) navigate(`/unit/${comp.id}`); }}
                    onMouseEnter={(e) => { if(isClickable) e.currentTarget.style.background = 'var(--ba-surface-hover)' }}
                    onMouseLeave={(e) => { if(isClickable) e.currentTarget.style.background = 'var(--ba-surface)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--ba-white)', marginRight: '8px', fontSize: '0.9rem' }}>{comp.ticker}</span>
                      <span style={{ color: 'var(--ba-text-sub)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{comp.name}</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--ba-cyan)', fontSize: '0.9rem' }}>
                      {comp.weight.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitStatus;
