import React, { useState, useEffect } from 'react';
import { Session } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const SectionCard: React.FC<{ title: string; children: React.ReactNode; description?: string; }> = ({ title, description, children }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h2>
            {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
        </div>
        <div className="p-6 space-y-6">{children}</div>
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            checked ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}
    >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const SettingRow: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div>{children}</div>
    </div>
);


export const Settings: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();

    // Define settings structure
    const [dashboardRefresh, setDashboardRefresh] = useState('manual');
    const [visibleStatCards, setVisibleStatCards] = useState({
        totalBookings: true,
        activeDrivers: true,
        vehiclesOnRoad: true,
        totalRevenue: true,
    });
    const [quickActions, setQuickActions] = useState(['view_bookings', 'add_driver', 'create_promo', 'customize_form']);
    const [chartType, setChartType] = useState('bar');
    const [activityLimit, setActivityLimit] = useState(5);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedRefresh = localStorage.getItem('dashboardRefresh');
        const savedCards = localStorage.getItem('visibleStatCards');
        const savedActions = localStorage.getItem('quickActions');
        const savedChartType = localStorage.getItem('chartType');
        const savedActivityLimit = localStorage.getItem('activityLimit');

        if (savedRefresh) setDashboardRefresh(savedRefresh);
        if (savedCards) setVisibleStatCards(JSON.parse(savedCards));
        if (savedActions) setQuickActions(JSON.parse(savedActions));
        if (savedChartType) setChartType(savedChartType);
        if (savedActivityLimit) setActivityLimit(parseInt(savedActivityLimit, 10));
    }, []);

    const handleSave = () => {
        localStorage.setItem('dashboardRefresh', dashboardRefresh);
        localStorage.setItem('visibleStatCards', JSON.stringify(visibleStatCards));
        localStorage.setItem('quickActions', JSON.stringify(quickActions));
        localStorage.setItem('chartType', chartType);
        localStorage.setItem('activityLimit', String(activityLimit));
        showNotification('Dashboard settings saved!', 'success');
    };
    
    const allQuickActions = [
        { id: 'view_bookings', label: 'View Bookings' },
        { id: 'add_driver', label: 'Add Driver' },
        { id: 'create_promo', label: 'Create Promo' },
        { id: 'customize_form', label: 'Customize Form' },
        { id: 'view_map', label: 'Live Map' },
        { id: 'add_vehicle', label: 'Add Vehicle' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('settings', 'Dashboard Settings')}</h1>
            
            <SectionCard title="General" description="Configure general dashboard behaviors.">
                <SettingRow label="Auto-Refresh Interval">
                    <select value={dashboardRefresh} onChange={e => setDashboardRefresh(e.target.value)} className="w-48 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50">
                        <option value="manual">Manual</option>
                        <option value="30s">Every 30 seconds</option>
                        <option value="1m">Every 1 minute</option>
                        <option value="5m">Every 5 minutes</option>
                    </select>
                </SettingRow>
                <SettingRow label="Recent Activity Limit">
                    <input type="number" value={activityLimit} onChange={e => setActivityLimit(Math.max(1, parseInt(e.target.value, 10)))} className="w-24 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50" />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Layout & Visibility" description="Customize which elements are visible on your dashboard.">
                <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3">Stat Cards</h3>
                    <div className="space-y-3">
                        <SettingRow label="Show Total Bookings">
                            <ToggleSwitch checked={visibleStatCards.totalBookings} onChange={c => setVisibleStatCards(p => ({...p, totalBookings: c}))} />
                        </SettingRow>
                         <SettingRow label="Show Active Drivers">
                            <ToggleSwitch checked={visibleStatCards.activeDrivers} onChange={c => setVisibleStatCards(p => ({...p, activeDrivers: c}))} />
                        </SettingRow>
                         <SettingRow label="Show Vehicles On-Road">
                            <ToggleSwitch checked={visibleStatCards.vehiclesOnRoad} onChange={c => setVisibleStatCards(p => ({...p, vehiclesOnRoad: c}))} />
                        </SettingRow>
                         <SettingRow label="Show Total Revenue">
                            <ToggleSwitch checked={visibleStatCards.totalRevenue} onChange={c => setVisibleStatCards(p => ({...p, totalRevenue: c}))} />
                        </SettingRow>
                    </div>
                </div>

                 <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allQuickActions.map(action => (
                            <label key={action.id} className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-500/10">
                                <input type="checkbox" checked={quickActions.includes(action.id)} onChange={() => {
                                    const newActions = quickActions.includes(action.id) ? quickActions.filter(a => a !== action.id) : [...quickActions, action.id];
                                    setQuickActions(newActions);
                                }} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded" />
                                <span className="text-sm font-medium">{action.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Analytics" description="Change how charts and data are presented.">
                <SettingRow label="Monthly Bookings Chart Type">
                    <select value={chartType} onChange={e => setChartType(e.target.value)} className="w-48 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50">
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                    </select>
                </SettingRow>
            </SectionCard>
            
            <div className="pt-5 mt-6">
                <div className="flex justify-end items-center">
                    <button onClick={handleSave} className="inline-flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700">
                        Save Dashboard Settings
                    </button>
                </div>
            </div>
        </div>
    );
};