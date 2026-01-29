
import React, { useState, useEffect } from 'react';
import { View, ChartData, Session, Booking, BookingStatus } from '../types';
import { ICONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Tooltip } from './shared/Tooltip';

const getStatusInfo = (status: BookingStatus) => {
    switch (status) {
        case 'Completed': return { text: "Completed", color: "text-green-500" };
        case 'In Progress': return { text: "In Progress", color: "text-blue-500" };
        case 'On Way': return { text: "On Way", color: "text-cyan-500" };
        case 'Scheduled': return { text: "Scheduled", color: "text-yellow-500" };
        case 'Cancelled': return { text: "Cancelled", color: "text-red-500" };
        default: return { text: "Unknown", color: "text-slate-500" };
    }
};

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode; 
    color: string; 
    trend?: { val: string; isUp: boolean };
}> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex flex-col shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-opacity-10 dark:bg-white/5 ${color.replace('text-', 'bg-')}`}>
                 <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend.isUp ? 'bg-green-100 text-green-600 dark:bg-green-500/10' : 'bg-red-100 text-red-600 dark:bg-red-500/10'}`}>
                    {trend.isUp ? '↑' : '↓'} {trend.val}
                </div>
            )}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
    </div>
);

const QuickActionButton: React.FC<{onClick: () => void, children: React.ReactNode, isPrimary?: boolean, icon: React.ReactNode, tooltip: string}> = ({ onClick, children, isPrimary, icon, tooltip }) => {
    const primaryClasses = "bg-primary-500 text-white hover:bg-primary-600 hover:scale-[1.02]";
    const secondaryClasses = "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:scale-[1.02]";
    
    return (
        <Tooltip content={tooltip} position="top">
            <button onClick={onClick} className={`text-center p-4 rounded-2xl transition-all duration-200 shadow-sm flex flex-col items-center justify-center gap-3 w-full h-full ${isPrimary ? primaryClasses : secondaryClasses}`}>
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl ${isPrimary ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    {icon}
                </div>
                <span className="font-bold text-sm tracking-tight">{children}</span>
            </button>
        </Tooltip>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm flex items-center justify-between gap-4">
                            <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export const Dashboard: React.FC<{ setActiveView: (view: View) => void; session: Session; }> = ({ setActiveView, session }) => {
    const { isDarkMode, t } = useTheme();
    const [stats, setStats] = useState({
        totalBookings: 0,
        activeDrivers: 0,
        vehiclesOnRoad: 0,
        totalRevenue: 0,
    });
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = async (signal?: AbortSignal) => {
        if (!session) {
            setError("No user session found.");
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        try {
            const userId = session.user.id;
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const [
                bookingsCountRes,
                driversCountRes,
                vehiclesCountRes,
                chartBookingsRes,
                recentBookingsListRes,
            ] = await Promise.all([
                supabase.from('bookings').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('uid', userId),
                supabase.from('drivers').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('uid', userId).in('status', ['Online', 'On Trip']),
                supabase.from('vehicles').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('uid', userId).eq('status', 'Active'),
                supabase.from('bookings').select('amount, created_at, status').abortSignal(signal).eq('uid', userId).gte('created_at', oneYearAgo.toISOString()),
                supabase.from('bookings').select('id, customer, status, amount, form_data, created_at').eq('uid', userId).order('created_at', { ascending: false }).limit(5),
            ]);

            if (signal?.aborted) return;

            const newStats = { totalBookings: 0, activeDrivers: 0, vehiclesOnRoad: 0, totalRevenue: 0 };
            let newChartData: ChartData[] = [];

            if (bookingsCountRes.error) throw bookingsCountRes.error;
            newStats.totalBookings = bookingsCountRes.count || 0;

            if (driversCountRes.error) throw driversCountRes.error;
            newStats.activeDrivers = driversCountRes.count || 0;
            
            if (vehiclesCountRes.error) throw vehiclesCountRes.error;
            newStats.vehiclesOnRoad = vehiclesCountRes.count || 0;

            if (chartBookingsRes.error) {
                throw chartBookingsRes.error;
            } else if (chartBookingsRes.data) {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const today = new Date();
                const chartDataMap: Map<string, { name: string; bookings: number }> = new Map();

                for (let i = 11; i >= 0; i--) {
                    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                    const monthName = monthNames[d.getMonth()];
                    const year = d.getFullYear().toString().slice(-2);
                    const key = `${monthName} '${year}`;
                    chartDataMap.set(key, { name: key, bookings: 0 });
                }

                let totalRevenueLastYear = 0;
                for (const b of chartBookingsRes.data) {
                    if (b.created_at) {
                        const date = new Date(b.created_at);
                        const monthName = monthNames[date.getMonth()];
                        const year = date.getFullYear().toString().slice(-2);
                        const key = `${monthName} '${year}`;
                        if (chartDataMap.has(key)) chartDataMap.get(key)!.bookings++;
                    }
                    if (b.status === 'Completed') {
                        const amountString = String(b.amount || '0').replace(/[^0-9.-]+/g, "");
                        const amountValue = parseFloat(amountString);
                        if (!isNaN(amountValue)) totalRevenueLastYear += amountValue;
                    }
                }
                newStats.totalRevenue = totalRevenueLastYear;
                newChartData = Array.from(chartDataMap.values());
            }

            if (recentBookingsListRes.error) {
                throw recentBookingsListRes.error;
            } else if (recentBookingsListRes.data) {
                setRecentBookings(recentBookingsListRes.data as Booking[]);
            }
            
            setStats(newStats);
            setChartData(newChartData);

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(err.message || 'A network error occurred. Please try again.');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };
    
    useEffect(() => {
        const controller = new AbortController();
        fetchDashboardData(controller.signal);
        return () => controller.abort();
    }, [session, t]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center text-slate-400 font-medium">Preparing your workspace...</div>;
    }

    if (error) {
        return (
            <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/30">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ops! Something went wrong</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">{error}</p>
                <button onClick={() => fetchDashboardData()} className="mt-8 px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
                    Try Reloading
                </button>
            </div>
        );
    }

    const adminName = session.user.email?.split('@')[0] || 'Admin';

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight capitalize">Ahlan, {adminName}!</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Ready to manage your fleet's operations today?</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">System Live</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('total_bookings', 'Total Bookings')} value={stats.totalBookings.toLocaleString()} icon={ICONS.Bookings} color="text-blue-500" trend={{ val: '8.4%', isUp: true }} />
                <StatCard title={t('active_drivers', 'Active Drivers')} value={stats.activeDrivers.toString()} icon={ICONS.Drivers} color="text-green-500" trend={{ val: '2.1%', isUp: false }} />
                <StatCard title={t('vehicles_on_road', 'Vehicles On-Road')} value={stats.vehiclesOnRoad.toString()} icon={ICONS.Vehicles} color="text-orange-500" />
                <StatCard title={t('total_revenue', 'Revenue')} value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} icon={ICONS.Payments} color="text-indigo-500" trend={{ val: '12.5%', isUp: true }} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('performance_overview', 'Performance Overview')}</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Analysis of monthly booking volume</p>
                        </div>
                    </div>
                    <div style={{width: '100%', height: 350}}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="bookings" stroke="var(--accent-color)" strokeWidth={4} fillOpacity={1} fill="url(#colorBookings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="xl:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recent Rides</h2>
                    <p className="text-sm font-medium text-slate-400 mt-1 mb-8">Latest activity across your fleet.</p>
                    <div className="space-y-5 flex-1">
                        {recentBookings.length > 0 ? recentBookings.map(booking => {
                            const status = getStatusInfo(booking.status);
                            const bookingTime = new Date((booking.form_data as any)?.datetime || booking.created_at);
                            return (
                                <div key={booking.id} className="flex items-center gap-4 group">
                                    <div className="relative">
                                        <img className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-110" src={`https://ui-avatars.com/api/?name=${booking.customer.replace(/\s/g, "+")}&background=random&color=fff&rounded=true`} alt={booking.customer} />
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 \${status.color.replace('text-', 'bg-')}`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">{booking.customer}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                                            <span>#{booking.id}</span>
                                            <span>•</span>
                                            <span style={{ color: status.color.replace('bg-', 'text-') }}>{status.text}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 dark:text-white">$\${booking.amount}</p>
                                    </div>
                                </div>
                            )
                        }) : (
                             <div className="text-center text-slate-500 dark:text-slate-400 py-10">No recent bookings.</div>
                        )}
                    </div>
                     <button onClick={() => setActiveView(View.Bookings)} className="mt-10 w-full text-center bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold px-4 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        View All Operations
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-8">{t('quick_actions', 'Fast Tracks')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <QuickActionButton onClick={() => setActiveView(View.Bookings)} icon={<svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Bookings}</svg>} tooltip="See all current and past bookings">{t('view_recent_bookings', 'Bookings')}</QuickActionButton>
                    <QuickActionButton onClick={() => setActiveView(View.Drivers)} icon={<svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Drivers}</svg>} tooltip="Add a new driver to your fleet">{t('onboard_new_driver', 'Drivers')}</QuickActionButton>
                    <QuickActionButton onClick={() => setActiveView(View.Promos)} icon={<svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Promos}</svg>} tooltip="Create discounts to attract more customers">{t('create_promo_code', 'Promos')}</QuickActionButton>
                    <QuickActionButton onClick={() => setActiveView(View.FormBuilder)} icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS['Form Builder']}</svg>} isPrimary tooltip="Customize the look and fields of your public booking form">{t('customize_booking_form', 'Form Builder')}</QuickActionButton>
                </div>
            </div>
        </div>
    );
};
