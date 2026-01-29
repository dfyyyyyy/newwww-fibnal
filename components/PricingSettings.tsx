
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import type { PricingSettings as PricingSettingsType, Session, AdvancedPricingConfig, PeakHour, TimeOfDaySlot, LocationZone } from '../types';
import { View } from '../types';
import { ICONS } from '../constants';
import { Tooltip } from './shared/Tooltip';

// FIX: Completed the definition of defaultAdvancedConfig to match the AdvancedPricingConfig interface.
const defaultAdvancedConfig: AdvancedPricingConfig = {
    is_enabled: false,
    surge: {
        is_enabled: false,
        peak_hours: [],
    },
    time_of_day: {
        is_enabled: false,
        slots: [],
    },
    location_surcharges: {
        is_enabled: false,
        zones: [],
    },
    scheduled_rides: {
        is_enabled: false,
        surge_protection: false,
        premium_type: 'fixed',
        premium_value: 0,
    },
    additional_fees: {
        waiting_fee_per_min: 0,
        waiting_grace_period_mins: 15,
        cancellation_fee: 25,
        standard_cleaning_fee: 50,
    },
};

const defaultPricingSettings: Omit<PricingSettingsType, 'id' | 'uid' | 'updated_at'> = {
    base_fare: 2.50,
    cost_per_km: 1.75,
    cost_per_min: 0.30,
    cost_per_hour: 50.00,
    surge_multiplier: 1.0,
    advanced_config: defaultAdvancedConfig
};


const SectionCard: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode; }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white p-6 border-b border-slate-200 dark:border-slate-700">{title}</h2>
        <div className="p-6">{children}</div>
        {footer && (
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl text-right">
                {footer}
            </div>
        )}
    </div>
);


// FIX: Added the PricingSettings component and exported it to resolve the import error in App.tsx.
export const PricingSettings: React.FC<{
    session: Session;
    showNotification: (message: string, type: 'success' | 'error') => void;
    setActiveView: (view: View) => void;
}> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [settings, setSettings] = useState<Omit<PricingSettingsType, 'id' | 'uid' | 'updated_at'>>(defaultPricingSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!session) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('pricing_settings')
                .select('*')
                .eq('uid', session.user.id)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
                setError(error.message);
            } else if (data) {
                const advancedConfig = data.advanced_config ? { ...defaultAdvancedConfig, ...(data.advanced_config as object) } : defaultAdvancedConfig;
                setSettings({ ...defaultPricingSettings, ...data, advanced_config: advancedConfig });
            } else {
                setSettings(defaultPricingSettings);
            }
            setLoading(false);
        };
        fetchSettings();
    }, [session]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setSettings(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('pricing_settings')
            .upsert({
                uid: session.user.id,
                ...settings,
            }, { onConflict: 'uid' });

        if (error) {
            showNotification(`Error saving settings: ${error.message}`, 'error');
        } else {
            showNotification('Pricing settings saved successfully!', 'success');
        }
        setSaving(false);
    };

    const inputClasses = "block w-full sm:text-sm rounded-lg bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 text-slate-900 dark:text-white";

    if (loading) {
        return <div>Loading pricing settings...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('pricing_settings_title', 'Pricing Settings')}</h1>

            <SectionCard 
                title="Base Fares"
                footer={
                    <button onClick={handleSave} disabled={saving} className="inline-flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="base_fare" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Base Fare ($)</label>
                        <input type="number" step="0.01" name="base_fare" id="base_fare" value={settings.base_fare} onChange={handleInputChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="cost_per_km" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost per Kilometer ($)</label>
                        <input type="number" step="0.01" name="cost_per_km" id="cost_per_km" value={settings.cost_per_km} onChange={handleInputChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="cost_per_min" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost per Minute ($)</label>
                        <input type="number" step="0.01" name="cost_per_min" id="cost_per_min" value={settings.cost_per_min} onChange={handleInputChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="cost_per_hour" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost per Hour ($)</label>
                        <input type="number" step="0.01" name="cost_per_hour" id="cost_per_hour" value={settings.cost_per_hour} onChange={handleInputChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="surge_multiplier" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Surge Multiplier</label>
                        <input type="number" step="0.1" name="surge_multiplier" id="surge_multiplier" value={settings.surge_multiplier} onChange={handleInputChange} className={inputClasses} />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};
