import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}) => {
  const [activeTabState, setActiveTabState] = useState(defaultValue);
  const activeTab = value !== undefined ? value : activeTabState;

  const setActiveTab = (val: string) => {
    if (onValueChange) onValueChange(val);
    else setActiveTabState(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`w-full space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center p-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-600 gap-1.5 shadow-inner ${className}`}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  icon: Icon,
  badge,
  className = '',
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used inside Tabs');

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      onClick={() => context.setActiveTab(value)}
      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
        isActive
          ? 'bg-white text-teal-800 shadow-sm border border-slate-200/90'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
      } ${className}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className = '',
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used inside Tabs');

  if (context.activeTab !== value) return null;

  return <div className={`animate-fade-in-up ${className}`}>{children}</div>;
};
