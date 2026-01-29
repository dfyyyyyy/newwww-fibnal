import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import type { FormConfiguration, Session, ExtraOption } from '../types';
import { DEFAULT_FORM_FIELDS, DEFAULT_CUSTOMIZATIONS, ICONS } from '../constants';
import { Tooltip } from './shared/Tooltip';

interface HourlyNotes {
    minimum_hours: string;
    extra_hour_charges: string;
    driver_waiting_charges: string;
    toll_parking: string;
}

const defaultNotes: HourlyNotes = {
    minimum_hours: '',
    extra_hour_charges: '',
    driver_waiting_charges: '',
    toll_parking: '',
};

const defaultExtraOptions: ExtraOption[] = DEFAULT_CUSTOMIZATIONS.extraOptions || [];


const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            checked ? 'bg-[var(--accent-color)]' : 'bg-slate-200 dark:bg-slate-700'
        }`}
    >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);


export const Notes: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
  const { t } = useTheme();
  const [notes, setNotes] = useState<HourlyNotes>(defaultNotes);
  const [extraOptions, setExtraOptions] = useState<ExtraOption[]>(defaultExtraOptions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const userId = session?.user?.id;

  useEffect(() => {
    const fetchData = async () => {
        if (!session) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('form_configurations')
                .select('customizations')
                .eq('uid', session.user.id)
                .maybeSingle();

            if (dbError) throw dbError;
            
            if (data && data.customizations) {
                const customs = data.customizations as any;
                if (customs.hourlyNotes) {
                    setNotes({ ...defaultNotes, ...customs.hourlyNotes });
                }
                const savedOptionsSource = customs.extraOptions || (customs.layout_settings && customs.layout_settings.extraOptions);
                if (savedOptionsSource) {
                    const savedOptions = savedOptionsSource as ExtraOption[];
                    // Merge saved options with defaults to preserve structure and add new defaults.
                    const mergedOptions = defaultExtraOptions.map(defaultOption => {
                        const savedOption = savedOptions.find(so => so.name === defaultOption.name);
                        return savedOption ? { ...defaultOption, ...savedOption } : defaultOption;
                    });
                    // Add any purely custom options that were saved but are not in the defaults.
                    const customSavedOptions = savedOptions.filter(so => !defaultExtraOptions.some(d => d.name === so.name));
                    setExtraOptions([...mergedOptions, ...customSavedOptions]);
                } else {
                    setExtraOptions(defaultExtraOptions);
                }
            } else {
                setNotes(defaultNotes);
                setExtraOptions(defaultExtraOptions);
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(t('fetch_fail_prefix', 'Failed to fetch notes & options.'));
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [session, t]);

  const handleNoteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNotes(prev => ({...prev, [name]: value}));
  };

  const handleExtraOptionChange = (index: number, field: keyof ExtraOption, value: string | number | boolean) => {
      const newOptions = [...extraOptions];
      if (field === 'price' || field === 'min' || field === 'max') {
          const numValue = field === 'price' ? parseFloat(value as string) : parseInt(value as string, 10);
          newOptions[index] = { ...newOptions[index], [field]: isNaN(numValue) ? 0 : numValue };
      } else {
          newOptions[index] = { ...newOptions[index], [field]: value };
      }
      setExtraOptions(newOptions);
  };

  const handleAddExtraOption = () => {
    setExtraOptions(prev => [...prev, { name: '', price: 0, enabled: true, min: 0, max: 1 }]);
  };

  const handleRemoveExtraOption = (indexToRemove: number) => {
      setExtraOptions(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
        setSaveStatus(t('save_fail_no_user', 'Cannot save: User is not logged in.'));
        return;
    }
    setSaving(true);
    setSaveStatus(t('saving', 'Saving...'));

    try {
        const { data: currentConfig, error: fetchError } = await supabase
            .from('form_configurations')
            .select('customizations, fields')
            .eq('uid', userId)
            .maybeSingle();
        
        if (fetchError) throw fetchError;

        const currentCustomizations = (currentConfig?.customizations as any) || DEFAULT_CUSTOMIZATIONS;

        const updatedCustomizations = {
            ...currentCustomizations,
            hourlyNotes: notes,
            extraOptions: extraOptions, 
            layout_settings: {
                ...DEFAULT_CUSTOMIZATIONS.layout_settings,
                ...(currentCustomizations.layout_settings || {}),
            }
        };

        // Clean up the old nested location if it exists
        if (updatedCustomizations.layout_settings?.extraOptions) {
            delete updatedCustomizations.layout_settings.extraOptions;
        }
        
        const payload: Partial<FormConfiguration> = {
            uid: userId,
            customizations: updatedCustomizations as any,
            fields: currentConfig?.fields || (DEFAULT_FORM_FIELDS as any),
        };

        const { error } = await supabase.from('form_configurations').upsert([payload], { onConflict: 'uid' });

        if (error) throw error;
        
        setSaveStatus(t('settings_saved_success', 'Settings saved successfully!'));

    } catch (err: any) {
        setSaveStatus(`${t('error', 'Error')}: ${err.message}`);
    } finally {
        setSaving(false);
        setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  if (loading) {
    return null;
  }

  if (error) {
     return (
         <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
     );
  }

  const inputClasses = "block w-full sm:text-sm rounded-lg bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 text-slate-900 dark:text-white";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('notes_and_extra', 'Notes & Extra')}</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/70">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('hourly_booking_notes_title', 'Hourly Booking Notes')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('hourly_booking_notes_desc', 'Set charges and notes that will be displayed to the customer for hourly bookings.')}</p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="minimum_hours" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('minimum_hours', 'Minimum Hours')}</label>
                <input type="text" name="minimum_hours" id="minimum_hours" className={inputClasses} placeholder={t('e_g_2_hours', 'e.g., 2 Hours')} value={notes.minimum_hours} onChange={handleNoteInputChange}/>
            </div>
            <div>
                <label htmlFor="extra_hour_charges" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('extra_hour_charges', 'Extra Hour Charges')}</label>
                <input type="text" name="extra_hour_charges" id="extra_hour_charges" className={inputClasses} placeholder={t('e_g_50_hr', 'e.g., $50/hr')} value={notes.extra_hour_charges} onChange={handleNoteInputChange}/>
            </div>
            <div>
                <label htmlFor="driver_waiting_charges" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('driver_waiting_charges', 'Driver Waiting Charges')}</label>
                <input type="text" name="driver_waiting_charges" id="driver_waiting_charges" className={inputClasses} placeholder={t('e_g_1_min_after_15_mins', 'e.g., $1/min after 15 mins')} value={notes.driver_waiting_charges} onChange={handleNoteInputChange}/>
            </div>
            <div>
                <label htmlFor="toll_parking" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('toll_parking', 'Toll/Parking')}</label>
                <input type="text" name="toll_parking" id="toll_parking" className={inputClasses} placeholder={t('e_g_not_included', 'e.g., Not included')} value={notes.toll_parking} onChange={handleNoteInputChange}/>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/70">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('extra_options', 'Extra Options')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Offer add-ons to your customers during booking.</p>
            <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-center">Enabled</th>
                            <th className="px-4 py-3 font-semibold">Option Name</th>
                            <th className="px-4 py-3 font-semibold">Price ($)</th>
                            <th className="px-4 py-3 font-semibold text-center">Min Qty</th>
                            <th className="px-4 py-3 font-semibold text-center">Max Qty</th>
                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {extraOptions.map((option, index) => (
                            <tr key={index} className="even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50">
                                <td className="px-4 py-3 align-middle text-center">
                                    <div className="flex justify-center">
                                        <ToggleSwitch checked={option.enabled} onChange={(checked) => handleExtraOptionChange(index, 'enabled', checked)} />
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <input type="text" value={option.name} onChange={(e) => handleExtraOptionChange(index, 'name', e.target.value)} className={`${inputClasses} font-medium`} placeholder="e.g., Bottled Water" />
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <input type="number" step="0.01" value={option.price} onChange={(e) => handleExtraOptionChange(index, 'price', e.target.value)} className={`${inputClasses} w-24`} />
                                </td>
                                <td className="px-4 py-3 align-middle text-center">
                                    <input type="number" value={option.min || 0} onChange={(e) => handleExtraOptionChange(index, 'min', e.target.value)} className={`${inputClasses} w-20 text-center`} />
                                </td>
                                <td className="px-4 py-3 align-middle text-center">
                                    <input type="number" value={option.max || 1} onChange={(e) => handleExtraOptionChange(index, 'max', e.target.value)} className={`${inputClasses} w-20 text-center`} />
                                </td>
                                <td className="px-4 py-3 align-middle text-right">
                                    <Tooltip content="Remove Option">
                                        <button type="button" onClick={() => handleRemoveExtraOption(index)} className="p-1.5 rounded-full text-slate-400 hover:text-red-500">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                {ICONS.Delete}
                                            </svg>
                                        </button>
                                    </Tooltip>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4">
                <button
                    type="button"
                    onClick={handleAddExtraOption}
                    className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{ICONS.Add}</svg>
                    Add a new option
                </button>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl sticky bottom-4 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-end items-center">
                {saveStatus && <p className={`text-sm mr-4 ${saveStatus.includes(t('error', 'Error')) ? 'text-red-600' : 'text-green-600'}`}>{saveStatus}</p>}
                <button type="submit" disabled={saving} className="inline-flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                    {saving ? (
                        <>
                           <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           {t('saving', 'Saving...')}
                        </>
                    ) : t('save_changes', 'Save Changes')}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};