import React, { useState, useEffect } from 'react';
import { BookingType, View, FormStructure, Session, CustomizationOptions } from '../types';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { DEFAULT_FORM_FIELDS, DEFAULT_CUSTOMIZATIONS } from '../constants';
import { Preview } from './form-builder/Preview';
import { EmbedCodeModal } from './form-builder/EmbedCodeModal';

export const FormTemplates: React.FC<{ setActiveView: (view: View) => void; session: Session }> = ({ setActiveView, session }) => {
    const { t } = useTheme();
    const [formStructure, setFormStructure] = useState<FormStructure>(DEFAULT_FORM_FIELDS);
    const [customizations, setCustomizations] = useState<CustomizationOptions>(DEFAULT_CUSTOMIZATIONS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
    
    const userId = session?.user?.id;

    useEffect(() => {
        const fetchConfig = async () => {
            if (!session) {
                setError(t('auth_error_short', "User not authenticated."));
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            
            try {
                const [formConfigRes, pricingRes, routesRes, vehiclesRes] = await Promise.all([
                    supabase.from('form_configurations').select('fields, customizations').eq('uid', session.user.id).maybeSingle(),
                    supabase.from('pricing_settings').select('*').eq('uid', session.user.id).maybeSingle(),
                    supabase.from('flat_rate_routes').select('*').eq('uid', session.user.id),
                    supabase.from('vehicles').select('*').eq('uid', session.user.id)
                ]);

                if (formConfigRes.error || pricingRes.error || routesRes.error || vehiclesRes.error) {
                    const errorMessages = [formConfigRes.error?.message, pricingRes.error?.message, routesRes.error?.message, vehiclesRes.error?.message].filter(Boolean).join(', ');
                    throw new Error(`${t('failed_load_config', 'Failed to load configuration:')} ${errorMessages}`);
                }
                
                const data = formConfigRes.data;

                if (data) {
                    if (data.fields) {
                        setFormStructure({ ...DEFAULT_FORM_FIELDS, ...(data.fields as any) });
                    }
                    const loadedCustomizations = data.customizations as any || {};
                    const customizationsWithLatestData = {
                        ...DEFAULT_CUSTOMIZATIONS,
                        ...loadedCustomizations,
                        pricing: pricingRes.data,
                        routes: routesRes.data,
                        vehicles: vehiclesRes.data,
                        hourlyNotes: {
                            ...DEFAULT_CUSTOMIZATIONS.hourlyNotes,
                            ...(loadedCustomizations.hourlyNotes || {})
                        },
                        layout_settings: {
                            ...DEFAULT_CUSTOMIZATIONS.layout_settings,
                            ...(loadedCustomizations.layout_settings || {}),
                             components_visibility: {
                                ...DEFAULT_CUSTOMIZATIONS.layout_settings.components_visibility,
                                ...(loadedCustomizations.layout_settings?.components_visibility || {})
                            },
                            waypoint_button_config: {
                                ...DEFAULT_CUSTOMIZATIONS.layout_settings.waypoint_button_config,
                                ...(loadedCustomizations.layout_settings?.waypoint_button_config || {})
                            }
                        }
                    };
                    setCustomizations(customizationsWithLatestData);
                } else {
                     const customizationsWithLatestData = {
                        ...DEFAULT_CUSTOMIZATIONS,
                        pricing: pricingRes.data,
                        routes: routesRes.data,
                        vehicles: vehiclesRes.data,
                     };
                     setCustomizations(customizationsWithLatestData);
                     setFormStructure(DEFAULT_FORM_FIELDS);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [session, t]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg border-[0.5px] border-slate-200/70 overflow-hidden flex flex-col">
                             <div className="p-4 border-b-[0.5px] border-slate-200/70 flex justify-between items-center flex-shrink-0">
                                <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                            </div>
                            <div className="p-6 flex-1">
                                <div className="h-full bg-slate-200 rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                    <p className="text-slate-600">{error}</p>
                </div>
            );
        }

        const bookingTypes: BookingType[] = ['distance', 'hourly', 'flat_rate', 'on_demand', 'charter', 'airport_transfer', 'event_shuttle'];

        return (
            <div className="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {bookingTypes.map(type => (
                    <div key={type} className="bg-white rounded-lg border-[0.5px] border-slate-200/70 overflow-hidden flex flex-col">
                        <div className="p-4 border-b-[0.5px] border-slate-200/70 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-semibold text-slate-800 capitalize truncate pr-2">{t(`${type}_booking`, type.replace('_', ' '))} {t('form', 'Form')}</h3>
                            <button
                                onClick={() => setIsEmbedModalOpen(true)}
                                className="text-sm font-medium text-[var(--accent-color)] hover:underline flex-shrink-0"
                            >
                                {t('get_embed_code', 'Get Embed Code')}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                             <div className="p-4 sm:p-6">
                                <Preview
                                    formStructure={formStructure}
                                    customizations={customizations}
                                    forceBookingType={type}
                                    disableTypeSelector={true}
                                    userId={userId}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 text-slate-800">
            <header className="flex items-center justify-between p-3 bg-white border-b border-slate-200 flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setActiveView(View.Dashboard)} 
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span>{t('exit', 'Exit')}</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold">{t('embeddable_templates', 'Embeddable Templates')}</h1>
                        <p className="text-xs text-slate-500 mt-1">{t('embeddable_templates_desc', 'Embed individual booking forms for specific services.')}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setActiveView(View.FormBuilder)} 
                        className="bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 flex items-center transition-all duration-300 text-sm"
                    >
                        {t('go_to_main_form_builder', 'Go to Main Form Builder')}
                    </button>
                </div>
            </header>
             <main className="flex-1 overflow-y-auto">
                {renderContent()}
            </main>
             <EmbedCodeModal
                isOpen={isEmbedModalOpen}
                onClose={() => setIsEmbedModalOpen(false)}
                userId={userId}
            />
        </div>
    );
};