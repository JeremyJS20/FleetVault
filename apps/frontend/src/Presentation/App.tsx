import React, { useState, useEffect } from 'react';
import { Sun, Moon, Database, Activity, ShieldAlert, Cpu } from 'lucide-react';
import type { HealthStatus } from '@rent-car/common';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const localTheme = localStorage.getItem('theme');
    if (localTheme === 'light' || localTheme === 'dark') return localTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health');
      const json = await response.json();
      if (json.success) {
        setHealthData(json.data);
      } else {
        setError(json.error || 'Failed to fetch status');
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden px-4 md:px-8 py-6">
      {/* Auroral background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[30%] rounded-full bg-accent-primary opacity-10 filter blur-[120px] pointer-events-none transition-all duration-700"></div>
      <div className="absolute bottom-[-10%] right-[20%] w-[60%] h-[30%] rounded-full bg-accent-primary-end opacity-10 filter blur-[120px] pointer-events-none transition-all duration-700"></div>

      {/* Header */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-4 border-b border-border-surface/40 mb-12">
        <div className="flex items-center gap-3 select-none group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-primary-end text-white font-extrabold text-xl shadow-md transition-transform group-hover:scale-105">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-fg-main">
            RentCar <span className="text-accent-primary">Enterprise</span>
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="btn-ghost"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-2xl w-full mx-auto my-auto flex flex-col items-center">
        <div className="glass-card w-full text-center space-y-8 relative overflow-hidden">
          {/* Subtle top light edge in dark mode */}
          {theme === 'dark' && (
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          )}

          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[10px] font-bold uppercase tracking-widest text-accent-primary">
              <Cpu size={12} className="animate-pulse" /> Baseline App Ready
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg-main leading-tight">
              Hello World!
            </h1>
            <p className="text-fg-secondary text-sm max-w-md mx-auto leading-relaxed">
              Welcome to the RentCar Enterprise monorepo foundation. The architectural layers and neo-minimalist theme are fully operational.
            </p>
          </div>

          {/* Instrument Cluster Display for Serverless Health */}
          <div className="p-5 rounded-2xl bg-bg-inset border border-border-surface/60 text-left space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-secondary flex items-center gap-2">
              <Activity size={14} className="text-accent-primary" /> API Connectivity Status
            </h2>

            {loading ? (
              <div className="flex items-center gap-3 py-2 text-xs font-mono text-fg-secondary">
                <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                Checking connectivity...
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                <ShieldAlert size={16} />
                <div>
                  <div className="font-bold">Connection Failed</div>
                  <div className="font-mono mt-0.5 opacity-90">{error}</div>
                </div>
              </div>
            ) : healthData ? (
              <div className="grid grid-cols-2 gap-4 font-mono text-xs text-fg-secondary">
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-fg-tertiary">Status</span>
                  <span className="text-emerald-500 font-bold">{healthData.status}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-fg-tertiary">Database</span>
                  <span className="text-fg-main font-bold flex items-center gap-1.5">
                    <Database size={12} className="text-accent-primary" /> {healthData.database}
                  </span>
                </div>
                <div className="col-span-2 border-t border-border-surface/40 pt-2">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-fg-tertiary">API Message</span>
                  <span className="text-fg-main text-xs">{healthData.message}</span>
                </div>
                <div className="col-span-2 pt-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-fg-tertiary">Timestamp</span>
                  <span className="opacity-85">{healthData.timestamp}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-fg-secondary">No status data fetched.</div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="btn-primary w-full"
            >
              Verify Endpoint Connection
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto text-center py-6 border-t border-border-surface/40 mt-12 text-[10px] font-mono tracking-widest text-fg-tertiary uppercase">
        RentCar Enterprise · Neo-Minimalist Liquid Glass System
      </footer>
    </div>
  );
};

export default App;
