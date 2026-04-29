import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnitData } from '../types';
import { TrendingUp, TrendingDown, Shield, Zap, Activity } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  units: UnitData[];
}

type TabType = 'fund' | 'stock' | 'other';

const Dashboard: React.FC<DashboardProps> = ({ units }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('fund');

  const getTabColor = (tab: TabType) => {
    if (tab === 'fund') return 'var(--ba-cyan)';
    if (tab === 'stock') return '#22c55e'; // Green
    return '#f59e0b'; // Gold
  };

  const filteredUnits = units.filter(u => {
    if (activeTab === 'fund') return u.type === 'fund';
    if (activeTab === 'stock') return u.type === 'stock';
    return u.type === 'crypto' || u.type === 'commodity';
  });

  return (
    <div style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* タブナビゲーション */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--ba-border)' }}>
        <button 
          onClick={() => setActiveTab('fund')}
          style={{ 
            background: activeTab === 'fund' ? 'rgba(14, 165, 233, 0.1)' : 'transparent', 
            color: activeTab === 'fund' ? 'var(--ba-cyan)' : 'var(--ba-text-sub)', 
            border: 'none', borderBottom: activeTab === 'fund' ? '3px solid var(--ba-cyan)' : '3px solid transparent',
            padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s'
          }}
        >
          投資信託 (FUNDS)
        </button>
        <button 
          onClick={() => setActiveTab('stock')}
          style={{ 
            background: activeTab === 'stock' ? 'rgba(34, 197, 94, 0.1)' : 'transparent', 
            color: activeTab === 'stock' ? '#22c55e' : 'var(--ba-text-sub)', 
            border: 'none', borderBottom: activeTab === 'stock' ? '3px solid #22c55e' : '3px solid transparent',
            padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s'
          }}
        >
          個別株 (STOCKS)
        </button>
        <button 
          onClick={() => setActiveTab('other')}
          style={{ 
            background: activeTab === 'other' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', 
            color: activeTab === 'other' ? '#f59e0b' : 'var(--ba-text-sub)', 
            border: 'none', borderBottom: activeTab === 'other' ? '3px solid #f59e0b' : '3px solid transparent',
            padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s'
          }}
        >
          その他 (CRYPTO/GOLD)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
        {filteredUnits.map((unit) => {
          const startOfDay = unit.history['1D'][0].open || unit.power;
          const diff = unit.power - startOfDay;
          const diffPercent = ((diff / startOfDay) * 100).toFixed(2);
          const isUp = diff >= 0;

          const radarData = [
            { subject: 'ATK', A: unit.atk },
            { subject: 'DEF', A: unit.def },
            { subject: 'AGI', A: unit.agi },
            { subject: 'REC', A: unit.rec },
            { subject: 'CRIT', A: unit.tier === 'S' ? 95 : unit.tier === 'A' ? 80 : 60 },
          ];
          
          const accentColor = getTabColor(activeTab);

          return (
            <div 
              key={unit.id} 
              className="glass-panel" 
              style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate(`/unit/${unit.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${accentColor}40`; // 40 is hex for 25% opacity
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'var(--ba-border)';
              }}
            >
              <div style={{ height: '160px', overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${accentColor}20, var(--ba-surface))` }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                  <img 
                    src={unit.imageUrl} 
                    alt={unit.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, var(--ba-surface))' }}></div>
                <div style={{ position: 'absolute', bottom: '15px', left: '20px', color: 'white', fontWeight: 'bold', fontSize: '1.4rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {unit.ticker}
                </div>
                <div style={{ position: 'absolute', top: '15px', right: '15px', background: accentColor, color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', transform: 'skewX(-5deg)' }}>
                  Tier {unit.tier}
                </div>
              </div>
              
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1rem', color: 'var(--ba-text-sub)', marginBottom: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {unit.name}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ba-text-sub)', fontWeight: 'bold', marginBottom: '4px' }}>POWER (PRICE)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: isUp ? 'var(--ba-white)' : 'var(--ba-red)' }}>
                      {unit.power.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: isUp ? 'var(--ba-green)' : 'var(--ba-red)', fontWeight: 'bold', fontSize: '1rem', marginTop: '4px' }}>
                      {isUp ? <TrendingUp size={18} style={{ marginRight: '4px' }} /> : <TrendingDown size={18} style={{ marginRight: '4px' }} />}
                      {isUp ? '+' : ''}{diffPercent}%
                    </div>
                  </div>
                  
                  <div style={{ width: '110px', height: '110px', margin: '-10px -10px 0 0' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke={`${accentColor}40`} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--ba-text-sub)', fontSize: 10 }} />
                        <Radar dataKey="A" stroke={accentColor} strokeWidth={1} fill={accentColor} fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--ba-text-sub)' }}>
                    <Zap size={14} style={{ marginRight: '6px', color: '#f59e0b' }} /> ATK: {unit.atk}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--ba-text-sub)' }}>
                    <Shield size={14} style={{ marginRight: '6px', color: '#38bdf8' }} /> DEF: {unit.def}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--ba-text-sub)' }}>
                    <Activity size={14} style={{ marginRight: '6px', color: '#22c55e' }} /> AGI: {unit.agi}
                  </div>
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
