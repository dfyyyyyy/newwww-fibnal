import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import type { FormStructure, CustomizationOptions, BookingType } from '../../types';
import { Preview } from '../form-builder/Preview';
import { DEFAULT_FORM_FIELDS, DEFAULT_CUSTOMIZATIONS } from '../../constants';
import { useTheme } from '../../contexts/ThemeContext';

interface PublicBookingFormProps {
    tenantId: string;
}

export const PublicBookingForm: React.FC<PublicBookingFormProps> = ({ tenantId }) => {
    const { setAccentColor, t } = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formStructure, setFormStructure] = useState<FormStructure | null>(null);
    const [customizations, setCustomizations] = useState<CustomizationOptions | null>(null);
    const [padding, setPadding] = useState<string | undefined>(undefined);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPadding = urlParams.get('padding');
        if (urlPadding) {
            setPadding(urlPadding);
        }

        const fetchConfig = async () => {
            if (!tenantId) {
                setError(t('no_tenant_id', "No tenant ID provided."));
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            
            try {
                const { data, error: rpcError } = await supabase.rpc('get_public_booking_config', {
                    p_uid: tenantId,
                });

                if (rpcError) throw rpcError;
                
                if (data) {
                    const config = data as any;
                    setFormStructure({ ...DEFAULT_FORM_FIELDS, ...(config.fields || {}) });
                    
                    const loadedCustomizations = config.customizations || {};
                    const customizationsWithData = {
                        ...DEFAULT_CUSTOMIZATIONS,
                        ...loadedCustomizations,
                        pricing: config.pricing,
                        routes: config.routes,
                        vehicles: config.vehicles,
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
                    setCustomizations(customizationsWithData);
                    
                    if (customizationsWithData.color) {
                         const root = window.document.documentElement;
                         root.style.setProperty('--accent-color', customizationsWithData.color);
                    }

                } else {
                    throw new Error(t('form_config_not_found', "Form configuration not found for this user."));
                }

            } catch (err: any) {
                setError(err.message || t('unknown_form_fetch_error', "An unknown error occurred while fetching the form."));
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();

    }, [tenantId, setAccentColor, t]);
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
                <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-red-500">{t('error', 'Error')}</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">{error}</p>
                </div>
            </div>
        );
    }
    
    if (formStructure && customizations) {
        return (
            <div>
                <Preview 
                    formStructure={formStructure}
                    customizations={customizations}
                    userId={tenantId}
                    isPreview={false}
                    padding={padding}
                />
            </div>
        );
    }

    return null;
};