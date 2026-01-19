
import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, ShieldCheck, Globe } from 'lucide-react';

export const HUDOverlay: React.FC = () => {
  const [stats, setStats] = useState({ cpu: 12, mem: 4.2, temp: 38 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 15) + 10,
        mem: parseFloat((Math.random() * 0.5 + 4.1).toFixed(1)),
        temp: Math.floor(Math.random() * 5) + 36,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-20">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sky-400 font-orbitron text-xs">
            <Cpu size={14} className="animate-pulse" />
            <span className="tracking-widest">CPU LOAD: {stats.cpu}%</span>
            <div className="w-24 h-1 bg-sky-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-400 glow-blue transition-all duration-1000" 
                style={{ width: `${stats.cpu}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 text-sky-400 font-orbitron text-xs">
            <Zap size={14} className="animate-pulse" />
            <span className="tracking-widest">ENERGY: {stats.temp}°C</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-sky-400 font-orbitron text-xs">
          <div className="flex items-center gap-2">
            <span className="tracking-widest">SYSTEM SECURE</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="tracking-widest">CORE: ONLINE</span>
            <Activity size={16} className="text-sky-400" />
          </div>
        </div>
      </div>

      {/* Decorative Rotating Circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
        <div className="w-[500px] h-[500px] border border-sky-500 rounded-full animate-[spin_20s_linear_infinite] border-dashed border-spacing-4" />
        <div className="absolute top-4 left-4 w-[468px] h-[468px] border border-sky-400 rounded-full animate-[spin_15s_linear_infinite_reverse] border-dotted" />
      </div>

      {/* Bottom HUD */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1 text-sky-400/50 font-mono text-[10px]">
          <div>SECURE LINK ESTABLISHED [256-BIT]</div>
          <div>LOC: MALIBU, CA // GRID: 44.12.9.1</div>
          <div className="flex items-center gap-2">
            <Globe size={10} />
            <span>GLOBAL NETWORK READY</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sky-400 font-orbitron text-3xl font-bold tracking-tighter text-glow">
            {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-sky-600 font-orbitron text-[10px] tracking-widest mt-1">
            STARK INDUSTRIES // MARK VII
          </div>
        </div>
      </div>
    </div>
  );
};

export const RotatingHex: React.FC = () => (
  <div className="relative w-12 h-12 flex items-center justify-center animate-spin-slow">
    <div className="absolute inset-0 border-2 border-sky-500/30 rounded-full" />
    <div className="absolute inset-2 border border-sky-400 rounded-full border-dashed" />
    <div className="w-1 h-1 bg-sky-400 rounded-full animate-ping" />
  </div>
);
