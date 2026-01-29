



import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartData, Session } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';

const PIE_COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#8b5cf6'];

export const ReportsAnalytics: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [vehicleData, setVehicleData] = useState<{ name: string; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode, t } = useTheme();

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!session) {
        setError(t('auth_error_short', "User not authenticated."));
        setIsDataLoading(false);
        return;
    }
    
    setIsDataLoading(true);
    setError(null);
    try {
        const userId = session.user.id;

        const [bookingsRes, vehiclesRes] = await Promise.all([
            supabase.from('bookings').select('created_at').eq('uid', userId).abortSignal(signal!),
            supabase.from('vehicles').select('type').eq('uid', userId).abortSignal(signal!)
        ]);

        if (signal?.aborted) return;
        if (bookingsRes.error) throw bookingsRes.error;
        if (vehiclesRes.error) throw vehiclesRes.error;

        if (bookingsRes.data) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthlyBookings: { [key: string]: number } = {};
            bookingsRes.data.forEach(booking => {
                const month = monthNames[new Date(booking.created_at).getMonth()];
                if (month) {
                     monthlyBookings[month] = (monthlyBookings[month] || 0) + 1;
                }
            });
            const formattedMonthlyData = monthNames.map(name => ({
                name,
                bookings: monthlyBookings[name] || 0
            }));
            setMonthlyData(formattedMonthlyData);
        }

        if (vehiclesRes.data) {
            const vehicleDistribution: { [key: string]: number } = {};
            vehiclesRes.data.forEach(vehicle => {
                vehicleDistribution[vehicle.type] = (vehicleDistribution[vehicle.type] || 0) + 1;
            });
            const formattedVehicleData = Object.entries(vehicleDistribution).map(([name, value]) => ({ name, value }));
            setVehicleData(formattedVehicleData);
        }

    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error("Failed to fetch analytics data:", err);
            const errorMessage = (err && typeof err.message === 'string') ? err.message : t('unexpected_error', 'An unexpected error occurred.');
            setError(`${t('fetch_fail_analytics', 'Failed to fetch analytics data:')} ${errorMessage}`);
        }
    } finally {
        if (!signal?.aborted) {
            setIsDataLoading(false);
        }
    }
  }, [session, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);

    return () => {
        controller.abort();
    };
  }, [fetchData]);
  
  const tickColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';
  const legendColor = isDarkMode ? '#e2e8f0' : '#334155';
  const tooltipStyle = {
    backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF',
    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
    borderRadius: '0.75rem',
    fontSize: '0.8rem'
  };
  
  if (isDataLoading) {
    return null;
  }

  if (error) {
    return (
         <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
            <button 
                onClick={() => fetchData()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
                {t('try_again', 'Try Again')}
            </button>
        </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">{t('reports_analytics_title', 'Reports & Analytics')}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/70">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t('monthly_bookings_chart_title', 'Bookings per Month')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} />
              <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: legendColor, fontSize: '12px' }} />
              <Bar dataKey="bookings" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/70">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t('vehicle_distribution_chart_title', 'Vehicle Type Distribution')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={vehicleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={{ fill: tickColor, fontSize: 12 }}>
                {vehicleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: legendColor, fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};