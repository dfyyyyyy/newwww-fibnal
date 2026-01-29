import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormField, FormStructure, Json, BookingType, Session, View, CustomizationOptions } from '../../types';
import { Preview } from './Preview';
import { CustomizationPanel } from './CustomizationPanel';
import { Toolbox } from './Toolbox';
import { Canvas } from './Canvas';
import { supabase } from '../../services/supabase';
import { ICONS, DEFAULT_FORM_FIELDS, DEFAULT_CUSTOMIZATIONS, BUILDER_ICONS } from '../../constants';
import { EmbedCodeModal } from './EmbedCodeModal';
import { Database } from '../../services/database.types';
import { Tooltip } from '../shared/Tooltip';

type FormType = keyof FormStructure;

const PanelTab: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            isActive 
                ? 'text-[var(--accent-color)] border-[var(--accent-color)]'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
    >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">{icon}</svg>
        <span>{label}</span>
    </button>
);


export const FormBuilder: React.FC<{ session: Session; setActiveView: (view: View) => void; }> = ({ session, setActiveView }) => {
    const [formStructure, setFormStructure] = useState<FormStructure>(DEFAULT_FORM_FIELDS);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
    const [activeCanvasTab, setActiveCanvasTab] = useState<FormType>('common');
    
    const [customizations, setCustomizations] = useState<CustomizationOptions>(DEFAULT_CUSTOMIZATIONS);
    const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [activePanel, setActivePanel] = useState<'fields' | 'style'>('fields');
    
    const userId = session?.user?.id;

    const fetchFormConfiguration = useCallback(async (signal?: AbortSignal) => {
        if (session) {
            const [formConfigRes, pricingRes, routesRes, vehiclesRes] = await Promise.all([
                supabase.from('form_configurations').select('*').eq('uid', session.user.id).maybeSingle(),
                supabase.from('pricing_settings').select('*').eq('uid', session.user.id).maybeSingle(),
                supabase.from('flat_rate_routes').select('*').eq('uid', session.user.id),
                supabase.from('vehicles').select('*').eq('uid', session.user.id)
            ]);
    
            if (signal?.aborted) return;
            
            if (formConfigRes.error || pricingRes.error || routesRes.error || vehiclesRes.error) {
                 const errorMessages = [formConfigRes.error?.message, pricingRes.error?.message, routesRes.error?.message, vehiclesRes.error?.message].filter(Boolean).join(', ');
                 alert(`Failed to load form configuration: ${errorMessages}`);
                 return;
            }
    
            const data = formConfigRes.data;
    
            if (data) {
                setFormStructure({
                    ...DEFAULT_FORM_FIELDS,
                    ...(data.fields as unknown as FormStructure || {})
                });
                
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
            // After initial data load, reset the unsaved changes flag.
            setHasUnsavedChanges(false);
        }
    }, [session]);

    useEffect(() => {
        const controller = new AbortController();
        fetchFormConfiguration(controller.signal);

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            controller.abort();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [fetchFormConfiguration, hasUnsavedChanges]);

    const handleSave = useCallback(async () => {
        if (!userId) return;
        setIsSaving(true);
        setSaveStatus({ message: 'Saving...', type: 'info' });
        
        const payload: Database['public']['Tables']['form_configurations']['Insert'] = { 
            uid: userId, 
            fields: formStructure as unknown as Json,
            customizations: customizations as unknown as Json
        };
        
        const { error } = await supabase
            .from('form_configurations')
            .upsert([payload], { onConflict: 'uid' });

        if (error) {
            setSaveStatus({ message: `Save Failed: ${error.message}`, type: 'error' });
        } else {
            setHasUnsavedChanges(false);
            setSaveStatus({ message: 'Saved!', type: 'success' });
        }
        setIsSaving(false);
        setTimeout(() => setSaveStatus(null), 3000);
    }, [userId, formStructure, customizations]);

    const updateFields = (newFields: FormField[]) => {
        setFormStructure(prev => ({ ...prev, [activeCanvasTab]: newFields }));
        setHasUnsavedChanges(true);
    };

    const addField = (field: FormField) => {
        setFormStructure(prev => ({ ...prev, [activeCanvasTab]: [...prev[activeCanvasTab], field] }));
        setHasUnsavedChanges(true);
    };
    
    const updateField = (index: number, field: FormField) => {
        const newFields = [...formStructure[activeCanvasTab]];
        newFields[index] = field;
        updateFields(newFields);
    };

    const deleteField = (index: number) => {
        const newFields = formStructure[activeCanvasTab].filter((_, i) => i !== index);
        updateFields(newFields);
    };
    
    const reorderFields = (startIndex: number, endIndex: number) => {
        const newFields = [...formStructure[activeCanvasTab]];
        const [removed] = newFields.splice(startIndex, 1);
        newFields.splice(endIndex, 0, removed);
        updateFields(newFields);
    };

    const updateCustomization = (key: keyof CustomizationOptions | 'layout_settings', value: any) => {
        if (key === 'layout_settings') {
            setCustomizations(prev => ({
                ...prev,
                layout_settings: value
            }));
        } else {
            setCustomizations(prev => ({ ...prev, [key]: value }));
        }
        setHasUnsavedChanges(true);
    };

    const previewWidths = {
        desktop: '100%',
        tablet: '768px',
        mobile: '375px'
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 dark:bg-black text-slate-800 dark:text-slate-200" style={{'--accent-color': customizations.color} as any}>
            <header className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => {
                            if (!hasUnsavedChanges || window.confirm("You have unsaved changes. Are you sure you want to exit?")) {
                                setActiveView(View.Dashboard);
                            }
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span className="hidden sm:inline">Exit</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold">Form Builder</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customize your public booking form.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {Object.keys(previewWidths).map(device => (
                        <Tooltip key={device} content={`${device.charAt(0).toUpperCase() + device.slice(1)} View`}>
                        <button
                            onClick={() => setPreviewDevice(device as any)}
                            className={`hidden md:flex p-2 rounded-lg transition-colors ${previewDevice === device ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                {BUILDER_ICONS[device.charAt(0).toUpperCase() + device.slice(1) as keyof typeof BUILDER_ICONS]}
                            </svg>
                        </button>
                        </Tooltip>
                    ))}
                </div>

                <div className="flex items-center space-x-4">
                     <div className="flex items-center gap-2 text-sm">
                        {hasUnsavedChanges && <span className="text-yellow-500 font-semibold hidden sm:inline">Unsaved Changes</span>}
                        {saveStatus && <span className={`font-semibold ${saveStatus.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{saveStatus.message}</span>}
                    </div>
                    <button 
                        onClick={() => setIsEmbedModalOpen(true)}
                        className="hidden sm:inline-flex items-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors text-sm"
                    >
                        Embed & Share
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 flex items-center transition-all duration-300 text-sm disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save & Publish'}
                    </button>
                </div>
            </header>
            
            <main className="flex flex-1 overflow-hidden">
                 <aside className="w-[350px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
                    <div className="flex border-b border-slate-200 dark:border-slate-800">
                        <PanelTab icon={BUILDER_ICONS.Fields} label="Fields" isActive={activePanel === 'fields'} onClick={() => setActivePanel('fields')} />
                        <PanelTab icon={BUILDER_ICONS.Style} label="Style" isActive={activePanel === 'style'} onClick={() => setActivePanel('style')} />
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                        {activePanel === 'fields' && (
                            <>
                                <Toolbox onAddField={addField} />
                                <hr className="my-6 border-slate-200 dark:border-slate-700" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold mb-2">Edit fields for booking type:</p>
                                    {(Object.keys(formStructure) as FormType[]).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setActiveCanvasTab(type)}
                                            className={`w-full text-left p-2 rounded-md text-sm font-medium transition-colors capitalize ${activeCanvasTab === type ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            {type.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                                <hr className="my-6 border-slate-200 dark:border-slate-700" />
                                <Canvas 
                                    fields={formStructure[activeCanvasTab]}
                                    onUpdateField={updateField}
                                    onDeleteField={deleteField}
                                    onReorderFields={reorderFields}
                                />
                            </>
                        )}
                        {activePanel === 'style' && (
                            <CustomizationPanel 
                                customizations={customizations}
                                updateCustomization={updateCustomization}
                                userId={userId}
                                formStructure={formStructure}
                            />
                        )}
                    </div>
                 </aside>
                
                <div className="flex-1 flex justify-center items-start overflow-y-auto p-4 sm:p-8 bg-slate-200/50 dark:bg-black/50">
                     <div 
                        className="w-full transition-all duration-300 bg-white dark:bg-slate-900 rounded-lg shadow-lg"
                        style={{ maxWidth: previewWidths[previewDevice] }}
                    >
                        <Preview 
                            formStructure={formStructure}
                            customizations={customizations}
                            userId={userId}
                        />
                    </div>
                </div>
            </main>

            <EmbedCodeModal isOpen={isEmbedModalOpen} onClose={() => setIsEmbedModalOpen(false)} userId={userId} />
        </div>
    );
};