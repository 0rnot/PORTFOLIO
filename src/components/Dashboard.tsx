import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnitData } from '../types';
import { TrendingUp, TrendingDown, Zap, Shield, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  units: UnitData[];
}

type TabType = 'fund' | 'stock' | 'other';

const Dashboard: React.FC<DashboardProps> = ({ units }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('fund');

  const tabs: { key: TabType; label: string; color: string }[] = [
    { key: 'fund', label: 'FUNDS', color: 'var(--cp-cyan)' },
    { key: 'stock', label: 'STOCKS', color: 'var(--cp-green)' },
    { key: 'other', label: 'CRYPTO', color: 'var(--cp-yellow)' },
  ];

  const filteredUnits = units.filter(u => {
    if (activeTab === 'fund') return u.type === 'fund';
    if (activeTab === 'stock') return u.type === 'stock';
    return u.type === 'crypto' || u.type === 'commodity';
  });

  return (
    <div style={{ padding: '0 12px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* タブ */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? `${tab.color}15` : 'transparent',
              color: activeTab === tab.key ? tab.color : 'var(--cp-text-sub)',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '0.8rem',
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
              whiteSpace: 'nowrap' as const,
              transition: 'all 0.2s',
              textShadow: activeTab === tab.key ? `0 0 10px ${tab.color}` : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* カードグリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '10px' }}>
        {filteredUnits.map((unit) => {
          const startOfDay = unit.history['1D'][0]?.open || unit.power;
          const diff = unit.power - startOfDay;
          const diffPercent = ((diff / startOfDay) * 100).toFixed(2);
          const isUp = diff >= 0;
          const accentColor = tabs.find(t => t.key === activeTab)?.color || 'var(--cp-cyan)';

          // スパークラインデータ
          const sparkData = unit.history['1D'].slice(-20).map(d => ({ v: d.close }));

          return (
            <div
              key={unit.id}
              className="glass-panel"
              style={{ cursor: 'pointer', overflow: 'hidden', transition: 'all 0.25s', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate(`/unit/${unit.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 0 20px ${accentColor}30`;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--cp-border)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* ヘッダー */}
              <div style={{ padding: '10px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={unit.imageUrl} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--cp-text)', letterSpacing: '1px' }}>{unit.ticker}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--cp-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.55rem', fontWeight: 900, color: accentColor, background: `${accentColor}15`, padding: '2px 5px', borderRadius: '2px', border: `1px solid ${accentColor}30`, letterSpacing: '1px', flexShrink: 0 }}>
                  {unit.tier}
                </div>
              </div>

              {/* スパークライン */}
              <div style={{ height: '40px', padding: '4px 0 0', opacity: 0.7 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`spark-${unit.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isUp ? 'var(--cp-green)' : 'var(--cp-red)'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={isUp ? 'var(--cp-green)' : 'var(--cp-red)'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={isUp ? 'var(--cp-green)' : 'var(--cp-red)'} strokeWidth={1.5} fill={`url(#spark-${unit.id})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 価格 */}
              <div style={{ padding: '4px 12px 10px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--cp-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {unit.power.toLocaleString(undefined, { minimumFractionDigits: unit.power < 10 ? 2 : 0, maximumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: isUp ? 'var(--cp-green)' : 'var(--cp-red)' }}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isUp ? '+' : ''}{diffPercent}%
                </div>
                {/* ステータスバー */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '0.55rem', color: 'var(--cp-text-sub)' }}>
                  <span><Zap size={9} style={{ color: 'var(--cp-yellow)', verticalAlign: 'middle' }} /> {unit.atk}</span>
                  <span><Shield size={9} style={{ color: 'var(--cp-cyan)', verticalAlign: 'middle' }} /> {unit.def}</span>
                  <span><Activity size={9} style={{ color: 'var(--cp-green)', verticalAlign: 'middle' }} /> {unit.agi}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
