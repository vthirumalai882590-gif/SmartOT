import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Users,
  CalendarClock,
  PackageCheck,
  AlertTriangle,
  BarChart3,
  Sliders,
  Sparkles,
  Clock,
  UserCircle,
  Menu,
  LogOut,
  Settings,
} from 'lucide-react';
import { useAuth } from '../stores/auth.store';

interface SidebarProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded = false, onToggleExpand }) => {
  const { user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const effectiveExpanded = isExpanded || isHovered;

  const navItems = [
    { to: '/', label: 'Home', fullLabel: 'Command Center', icon: Home },
    { to: '/patients', label: 'Patients', fullLabel: 'Patients & Readiness', icon: Users },
    { to: '/ot-schedule', label: 'Schedule', fullLabel: 'Live OT Schedule', icon: CalendarClock },
    { to: '/cssd', label: 'CSSD', fullLabel: 'CSSD & QR Verification', icon: PackageCheck },
    { to: '/alerts', label: 'Alerts', fullLabel: 'Alerts & Delay Feed', icon: AlertTriangle },
    { to: '/analytics', label: 'Analytics', fullLabel: 'Bottlenecks & Analytics', icon: BarChart3 },
    { to: '/simulator', label: 'Simulator', fullLabel: 'What-If Simulator', icon: Sliders },
    { to: '/ai-consultant', label: 'AI Ops', fullLabel: 'AI Operations Consultant', icon: Sparkles },
    { to: '/audit-logs', label: 'Audit', fullLabel: 'Audit Trail & Events', icon: Clock },
    { to: '/settings', label: 'Settings', fullLabel: 'Admin & Master Data', icon: Settings },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: effectiveExpanded ? 256 : 74 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="h-full overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white/95 backdrop-blur-xl flex flex-col justify-between select-none z-30 shrink-0 p-1.5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col items-center space-y-1 w-full">
        {/* Top Hamburger Menu Button (YouTube Style) */}
        <div className="w-full flex items-center justify-center py-2 mb-1 shrink-0">
          <button
            onClick={onToggleExpand}
            className="p-2.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer"
            title={isExpanded ? 'Collapse sidebar' : 'Pin / expand sidebar'}
          >
            <Menu className="h-6 w-6 stroke-[2]" />
          </button>
        </div>

        {/* Navigation Items (Stacked Icon + Label) */}
        <nav className="w-full space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  effectiveExpanded
                    ? `flex items-center space-x-3.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-teal-50 text-teal-700 border border-teal-200/90 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                      }`
                    : `flex flex-col items-center justify-center py-3 px-1 rounded-xl text-center transition-all group ${
                        isActive
                          ? 'bg-teal-50 text-teal-700 font-bold shadow-sm border border-teal-200/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                        effectiveExpanded ? 'h-5 w-5' : 'h-6 w-6 mb-1.5'
                      } ${isActive ? 'text-teal-600' : 'text-slate-500'}`}
                    />
                    <span
                      className={`tracking-tight ${
                        effectiveExpanded ? 'text-xs truncate font-semibold' : 'text-[10px] leading-tight font-medium truncate max-w-full'
                      }`}
                    >
                      {effectiveExpanded ? item.fullLabel : item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Band with User Persona & Logout Button */}
      <div className="w-full pt-2 flex flex-col items-center shrink-0 mt-4 rounded-xl space-y-1.5">
        {effectiveExpanded ? (
          <div className="w-full p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate">
              <UserCircle className="h-8 w-8 text-teal-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold truncate">{user?.name || 'Staff'}</p>
                <p className="text-[10px] text-teal-400 truncate">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center py-2 px-1 w-full rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer border border-rose-200"
            title="Sign out to return to landing page"
          >
            <LogOut className="h-5 w-5 text-rose-600 mb-1" />
            <span className="text-[10px] font-bold tracking-tight">Logout</span>
          </button>
        )}
      </div>
    </motion.aside>
  );
};
