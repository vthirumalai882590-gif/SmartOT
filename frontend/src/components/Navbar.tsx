import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../stores/auth.store';
import { offlineQueue, SyncState } from '../services/offline-queue';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  PlayCircle,
  UserCheck,
  LogOut,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { UserRole } from '../../../shared/src/types';

interface NavbarProps {
  onOpenAIConsultant?: () => void;
  onOpenScenarioRunner?: () => void;
  unreadAlertCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAIConsultant,
  onOpenScenarioRunner,
}) => {
  const { user, quickLoginAs, logout } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>(offlineQueue.getSyncState());
  const [queueCount, setQueueCount] = useState<number>(offlineQueue.getQueueCount());
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  useEffect(() => {
    return offlineQueue.subscribe((state, count) => {
      setSyncState(state);
      setQueueCount(count);
    });
  }, []);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'ADMINISTRATOR', label: 'Administrator', desc: 'Hospital-wide command & full governance' },
    { role: 'OT_MANAGER', label: 'OT Manager', desc: 'Surgical schedule & theatre transitions' },
    { role: 'CSSD_STAFF', label: 'CSSD Staff', desc: 'Sterilization lifecycle & QR scanning' },
    { role: 'WARD_STAFF', label: 'Ward Staff', desc: 'Patient readiness & consent verification' },
  ];

  return (
    <header className="h-16 border-b border-white/8/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between shrink-0 select-none">
      {/* Brand & Hospital Unit */}
      {/* MediwoxPlus pattern: font-serif wordmark, text-shadow 1px→4px stacked hard shadow */}
      {/* Source: Navigation.tsx L36-39 — font-serif, tracking-tight, text-white */}
      {/* CarboTrack pattern: dark theme inverts nav to white-on-dark */}
      {/* Source: Navbar.js L78 — theme==='dark' ? 'bg-white text-black' : 'bg-gray-900 text-white' */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/25 transition-transform duration-300 hover:scale-105">
          <Activity className="h-6 w-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            {/* MediwoxPlus: font-serif wordmark + hard text-shadow stack */}
            <span
              className="text-xl font-bold tracking-tight text-white heading-serif wordmark-shadow"
            >
              SmartOT <span className="text-teal-400">Command</span>
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/25">
              Ops Hub
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Connected Surgical Workflow & Real-Time Operational Intelligence
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* MediwoxPlus pattern: rounded-full pill CTA buttons for primary actions */}
        {/* Source: Hero.tsx L70 — 'rounded-full shadow-md hover:bg-blue-700 hover:scale-105' */}
        {onOpenScenarioRunner && (
          <button
            onClick={onOpenScenarioRunner}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500/40 hover:to-orange-500/40 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-md shadow-amber-500/15 hover:scale-105 hover:shadow-lg"
            title="Run the automated step-by-step P-1024 surgical workflow demo scenario"
          >
            <PlayCircle className="h-4 w-4 text-amber-400" />
            <span className="hidden md:inline">Scripted Scenario (P-1024)</span>
          </button>
        )}

        {/* MediwoxPlus Book Appointment pattern → AI Consultant as primary CTA */}
        {/* Source: Navigation.tsx L100 — 'bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg' */}
        {onOpenAIConsultant && (
          <button
            onClick={onOpenAIConsultant}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/25 hover:scale-105 hover:shadow-lg"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="hidden md:inline">AI Consultant</span>
          </button>
        )}

        {/* Offline / Online Sync State Badge */}
        <div className="flex items-center">
          {syncState === 'ONLINE' && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Online</span>
            </div>
          )}
          {syncState === 'OFFLINE' && (
            <div
              onClick={() => offlineQueue.flushQueue()}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer hover:bg-rose-500/25"
              title="Click to retry synchronization"
            >
              <WifiOff className="h-3.5 w-3.5 text-rose-400" />
              <span>Offline ({queueCount} queued)</span>
            </div>
          )}
          {syncState === 'SYNCING' && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-medium">
              <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
          {syncState === 'SYNC_COMPLETE' && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs font-medium">
              <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
              <span>Sync Complete</span>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        <button
          onClick={logout}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition hover:scale-105 shadow-sm"
          title="Sign out and return to landing page"
        >
          <LogOut className="h-4 w-4 text-rose-400" />
          <span className="hidden sm:inline font-bold">Logout</span>
        </button>

        {/* Role Switcher Dropdown with Framer Motion */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition hover:scale-105"
          >
            <UserCheck className="h-4 w-4 text-teal-400" />
            <span className="hidden sm:inline font-bold">{user?.role?.replace('_', ' ') || 'Switch Role'}</span>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isRoleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 backdrop-blur-xl"
              >
                <div className="px-3 py-2.5 border-b border-white/8 mb-1">
                  <p className="text-[11px] text-slate-400 font-medium">Currently signed in as:</p>
                  <p className="text-sm font-bold text-white heading-serif">{user?.name}</p>
                  <p className="text-xs text-teal-400 font-medium">{user?.department}</p>
                </div>

                <div className="py-1">
                  <p className="px-3 text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
                    Switch Demo Persona:
                  </p>
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        quickLoginAs(r.role);
                        setIsRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex flex-col ${
                        user?.role === r.role
                          ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                          : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="text-[10px] text-slate-400">{r.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 mt-1">
                  <button
                    onClick={() => {
                      logout();
                      setIsRoleMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition font-bold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
