import React, { useState, useMemo } from 'react';
import { LANGUAGES, PAYMENT_ICONS, DEFAULT_CUSTOMIZATIONS } from '../../constants';
import { BookingType, FormStructure, CustomizationOptions, FormField } from '../../types';
import { supabase } from '../../services/supabase';
import imageCompression from 'browser-image-compression';

interface CustomizationPanelProps {
    customizations: CustomizationOptions;
    updateCustomization: (key: keyof CustomizationOptions | 'layout_settings', value: any) => void;
    userId: string | null;
    formStructure: FormStructure;
}

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <h2>
                <button
                    type="button"
                    className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-800 dark:text-white"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                >
                    <span>{title}</span>
                    <svg className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </h2>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="pb-4 space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
};


const Label: React.FC<{ htmlFor?: string; children: React.ReactNode; }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {children}
    </label>
);

const SettingRow: React.FC<{label: string, description?: string, children: React.ReactNode}> = ({ label, description, children }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <div>
            <Label>{label}</Label>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1">{description}</p>}
        </div>
        <div className="flex justify-end">{children}</div>
    </div>
);

const parseColor = (colorStr: string = '#000000'): { hex: string; alpha: number } => {
    if (colorStr.startsWith('rgba')) {
        const parts = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (parts) {
            const r = parseInt(parts[1], 10);
            const g = parseInt(parts[2], 10);
            const b = parseInt(parts[3], 10);
            const toHex = (c: number) => `0${c.toString(16)}`.slice(-2);
            const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            return { hex, alpha: parseFloat(parts[4]) };
        }
    }
    // Assume hex if not rgba, and ensure it's a valid 6-digit hex
    if (colorStr.startsWith('#') && (colorStr.length === 4 || colorStr.length === 7)) {
        let hex = colorStr;
        if (hex.length === 4) {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }
        return { hex, alpha: 1 };
    }
    return { hex: '#000000', alpha: 1 };
};

const toRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
};

const ColorInput: React.FC<{ value: string; onChange: (value: string) => void; enableAlpha?: boolean; }> = ({ value, onChange, enableAlpha = false }) => {
    const { hex, alpha } = parseColor(value);

    const handleHexChange = (newHex: string) => {
        onChange(enableAlpha ? toRgba(newHex, alpha) : newHex);
    };

    const handleAlphaChange = (newAlpha: number) => {
        onChange(toRgba(hex, newAlpha));
    };

    return (
        <div className="w-48 space-y-2">
            <div className="relative">
                <div
                    className="w-full pl-3 pr-10 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white"
                >
                    {enableAlpha ? `${hex.toUpperCase()} | ${Math.round(alpha * 100)}%` : hex.toUpperCase()}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <input
                        type="color"
                        value={hex}
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                        style={{ appearance: 'none', WebkitAppearance: 'none' }}
                        aria-label="Color picker"
                    />
                </div>
            </div>
            {enableAlpha && (
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={alpha}
                        onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                        aria-label="Opacity"
                    />
                </div>
            )}
        </div>
    );
};

const RadioGroup: React.FC<{ value: string; options: { value: string; label: string }[], onChange: (value: string) => void }> = ({ value, options, onChange }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(option => (
            <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    value === option.value
                        ? 'bg-[var(--accent-color)] text-white'
                        : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                }`}
            >
                {option.label}
            </button>
        ))}
    </div>
);

const CheckboxGroup: React.FC<{ options: { name: string; label: string; icon: string }[], selected: string[], onChange: (name: string) => void }> = ({ options, selected, onChange }) => (
    <div className="grid grid-cols-3 gap-2">
        {options.map(option => (
            <button
                key={option.name}
                type="button"
                title={option.label}
                onClick={() => onChange(option.name)}
                className={`p-2 border rounded-lg transition-all flex items-center justify-center h-12 ${
                    selected.includes(option.name)
                        ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-color)] bg-[var(--accent-color-light)]'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
            >
                <svg viewBox="0 0 24 24" className="w-full h-full object-contain" dangerouslySetInnerHTML={{ __html: option.icon }} />
            </button>
        ))}
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
            checked ? 'bg-[var(--accent-color)]' : 'bg-slate-200 dark:bg-slate-600'
        }`}
    >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({ customizations, updateCustomization, userId, formStructure }) => {
    const commonInputClass = "w-full mt-1 p-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]";
    
    const layoutSettings = useMemo(() => ({
        ...DEFAULT_CUSTOMIZATIONS.layout_settings,
        ...(customizations.layout_settings || {}),
        components_visibility: {
            ...DEFAULT_CUSTOMIZATIONS.layout_settings.components_visibility,
            ...(customizations.layout_settings?.components_visibility || {})
        },
        waypoint_button_config: {
            ...DEFAULT_CUSTOMIZATIONS.layout_settings.waypoint_button_config,
            ...(customizations.layout_settings?.waypoint_button_config || {})
        }
    }), [customizations.layout_settings]);

    const allFields = useMemo(() => {
        const fields = new Map<string, string>();
        Object.values(formStructure).flat().forEach((field: FormField) => {
            if (field.key && !fields.has(field.key)) {
                fields.set(field.key, field.label);
            }
        });
        return Array.from(fields, ([key, label]) => ({ value: key, label }));
    }, [formStructure]);


    const updateLayoutSetting = (key: string, value: any) => {
        updateCustomization('layout_settings', {
            ...layoutSettings,
            [key]: value
        });
    };

    const updateComponentVisibility = (key: string, value: boolean) => {
        updateLayoutSetting('components_visibility', {
            ...layoutSettings.components_visibility,
            [key]: value
        });
    };
    
    const updateWaypointConfig = (key: string, value: any) => {
        updateLayoutSetting('waypoint_button_config', {
            ...layoutSettings.waypoint_button_config,
            [key]: value
        });
    };

    const handleLanguageChange = (code: string) => {
        const newLangs = customizations.selectedLanguages.includes(code)
            ? customizations.selectedLanguages.filter(l => l !== code)
            : [...customizations.selectedLanguages, code];
        updateCustomization('selectedLanguages', newLangs);
    };
    
    const handlePaymentIconChange = (name: string) => {
        const newIcons = customizations.paymentIcons.includes(name)
            ? customizations.paymentIcons.filter(i => i !== name)
            : [...customizations.paymentIcons, name];
        updateCustomization('paymentIcons', newIcons);
    };

    const handleBookingTypeChange = (type: BookingType) => {
        const currentTypes = customizations.enabledBookingTypes;
        const isEnabled = currentTypes.includes(type);
        let newTypes;
        if (isEnabled) {
            newTypes = currentTypes.length > 1 ? currentTypes.filter(t => t !== type) : currentTypes;
        } else {
            newTypes = [...currentTypes, type];
        }
        updateCustomization('enabledBookingTypes', newTypes);
    };

    const handleWaypointBookingTypeChange = (type: BookingType) => {
        const currentTypes = layoutSettings.waypoint_button_config.enabled_for_types;
        const newTypes = currentTypes.includes(type) ? currentTypes.filter(t => t !== type) : [...currentTypes, type];
        updateWaypointConfig('enabled_for_types', newTypes);
    };

    return (
        <div className="bg-white dark:bg-slate-900" style={{'--accent-color': customizations.color, '--accent-color-light': 'color-mix(in srgb, var(--accent-color) 15%, transparent)'} as any}>
            <AccordionItem title="General" defaultOpen={true}>
                <SettingRow label="Form Title">
                    <input
                        type="text"
                        id="formTitle"
                        value={customizations.title}
                        onChange={(e) => updateCustomization('title', e.target.value)}
                        className="w-48 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/50"
                    />
                </SettingRow>
                <SettingRow label="Show Company Logo" description="Display the logo set in Settings.">
                    <ToggleSwitch
                        checked={layoutSettings.components_visibility.show_logo === true}
                        onChange={(checked) => updateComponentVisibility('show_logo', checked)}
                    />
                </SettingRow>
            </AccordionItem>

            <AccordionItem title="Layout & Theme">
                 <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider -mb-2">Colors</h4>
                <SettingRow label="Brand Color">
                    <ColorInput value={customizations.color} onChange={(value) => updateCustomization('color', value)} />
                </SettingRow>
                <SettingRow label="Container Background">
                    <ColorInput value={layoutSettings.container_color || 'rgba(255,255,255,1)'} onChange={(value) => updateLayoutSetting('container_color', value)} enableAlpha />
                </SettingRow>
                <SettingRow label="Container Background (Dark)">
                     <ColorInput value={layoutSettings.container_color_dark || 'rgba(30,41,59,1)'} onChange={(value) => updateLayoutSetting('container_color_dark', value)} enableAlpha />
                </SettingRow>
                <hr className="border-slate-200 dark:border-slate-700" />
                 <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider -mb-2">Container</h4>
                <SettingRow label="Container Style">
                    <RadioGroup
                        value={layoutSettings.container_style}
                        onChange={(value) => updateLayoutSetting('container_style', value)}
                        options={[ { value: 'card_with_shadow', label: 'Card with Shadow' }, { value: 'simple', label: 'Simple (No Shadow)' } ]}
                    />
                </SettingRow>
                <SettingRow label="Corner Radius">
                    <div className="flex items-center gap-2 w-48">
                        <input
                            type="range"
                            min="0"
                            max="32"
                            value={layoutSettings.container_border_radius ?? 8}
                            onChange={(e) => updateLayoutSetting('container_border_radius', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                        />
                        <span className="text-sm font-medium w-10 text-right">{layoutSettings.container_border_radius ?? 8}px</span>
                    </div>
                </SettingRow>
                 <hr className="border-slate-200 dark:border-slate-700" />
                 <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider -mb-2">Buttons</h4>
                 <SettingRow label="Main Button Style">
                    <RadioGroup
                        value={layoutSettings.button_style}
                        onChange={(value) => updateLayoutSetting('button_style', value)}
                        options={[ { value: 'filled_rounded', label: 'Filled' }, { value: 'outline_square', label: 'Outline' } ]}
                    />
                </SettingRow>
                <SettingRow label="Secondary Button Style">
                     <RadioGroup
                        value={layoutSettings.secondary_button_style || 'filled'}
                        onChange={(value) => updateLayoutSetting('secondary_button_style', value)}
                        options={[ { value: 'filled', label: 'Filled' }, { value: 'outline', label: 'Outline' } ]}
                    />
                </SettingRow>
                 <SettingRow label="Navigation Button Position">
                    <RadioGroup
                        value={layoutSettings.button_position}
                        onChange={(value) => updateLayoutSetting('button_position', value)}
                        options={[ { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'space_between', label: 'Space Between' } ]}
                    />
                </SettingRow>
            </AccordionItem>

            <AccordionItem title="Component Visibility">
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-4 mb-4">Control which form elements are visible to the user.</p>
                <SettingRow label="Progress Bar">
                    <ToggleSwitch checked={layoutSettings.progress_bar_visibility === 'visible'} onChange={(checked) => updateLayoutSetting('progress_bar_visibility', checked ? 'visible' : 'hidden')} />
                </SettingRow>
                <SettingRow label="Step Titles">
                     <ToggleSwitch checked={layoutSettings.step_titles_visibility === 'visible'} onChange={(checked) => updateLayoutSetting('step_titles_visibility', checked ? 'visible' : 'hidden')} />
                </SettingRow>
                <SettingRow label="Map Display" description="Show map on the first step for route visualization.">
                    <ToggleSwitch checked={layoutSettings.components_visibility.map_visibility === true} onChange={(checked) => updateComponentVisibility('map_visibility', checked)} />
                </SettingRow>
                <hr className="border-slate-200 dark:border-slate-700" />
                <SettingRow label="Booking Type Selector">
                     <ToggleSwitch checked={layoutSettings.components_visibility.booking_type_selector} onChange={(checked) => updateComponentVisibility('booking_type_selector', checked)} />
                </SettingRow>
                <SettingRow label="Language Selector">
                     <ToggleSwitch checked={layoutSettings.components_visibility.language_selector} onChange={(checked) => updateComponentVisibility('language_selector', checked)} />
                </SettingRow>
                <SettingRow label="Vehicle Selector Button">
                    <ToggleSwitch checked={layoutSettings.components_visibility.vehicle_selector} onChange={(checked) => updateComponentVisibility('vehicle_selector', checked)} />
                </SettingRow>
                <SettingRow label="Round Trip Button">
                    <ToggleSwitch checked={layoutSettings.components_visibility.round_trip_button} onChange={(checked) => updateComponentVisibility('round_trip_button', checked)} />
                </SettingRow>
                <SettingRow label="Add Waypoint Button">
                    <ToggleSwitch checked={layoutSettings.components_visibility.add_waypoint_button} onChange={(checked) => updateComponentVisibility('add_waypoint_button', checked)} />
                </SettingRow>
                <SettingRow label="Extra Options Button">
                    <ToggleSwitch checked={layoutSettings.components_visibility.extra_options_button} onChange={(checked) => updateComponentVisibility('extra_options_button', checked)} />
                </SettingRow>
                <SettingRow label="Hourly Notes Button">
                    <ToggleSwitch checked={layoutSettings.components_visibility.notes_button} onChange={(checked) => updateComponentVisibility('notes_button', checked)} />
                </SettingRow>
                <SettingRow label="Payment Icons Section">
                     <ToggleSwitch checked={layoutSettings.components_visibility.payment_icons} onChange={(checked) => updateComponentVisibility('payment_icons', checked)} />
                </SettingRow>
            </AccordionItem>

            <AccordionItem title="Waypoint Button Settings">
                 <SettingRow label="Enable for Booking Types" description="Show 'Add Waypoint' button for these booking types.">
                    <div className="grid grid-cols-2 gap-2">
                        {(['distance', 'on_demand', 'flat_rate'] as BookingType[]).map(type => (
                            <button key={type} type="button" onClick={() => handleWaypointBookingTypeChange(type)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${ layoutSettings.waypoint_button_config.enabled_for_types.includes(type) ? 'bg-[var(--accent-color)] text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200' }`}>
                                {type.replace('_', '-')}
                            </button>
                        ))}
                    </div>
                </SettingRow>
                <SettingRow label="Display After Field" description="The button will appear after this field in the form.">
                    <select value={layoutSettings.waypoint_button_config.display_after_field}
                        onChange={(e) => updateWaypointConfig('display_after_field', e.target.value)}
                        className="w-48 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/50">
                        {allFields.map(field => ( <option key={field.value} value={field.value}>{field.label}</option> ))}
                    </select>
                </SettingRow>
            </AccordionItem>

            <AccordionItem title="Localization & Payments">
                 <SettingRow label="Default Language">
                     <select
                        value={customizations.defaultLanguage}
                        onChange={(e) => updateCustomization('defaultLanguage', e.target.value)}
                        className="w-48 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/50"
                    >
                        {LANGUAGES.map(lang => ( <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option> ))}
                    </select>
                </SettingRow>
                <div>
                    <Label>Supported Languages</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {LANGUAGES.map(lang => (
                            <button key={lang.code} type="button" onClick={() => handleLanguageChange(lang.code)} className={`p-2 border rounded-lg transition-all text-sm flex items-center gap-2 ${customizations.selectedLanguages.includes(lang.code) ? 'border-[var(--accent-color)] ring-1 ring-[var(--accent-color)]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800' }`}>
                                {lang.flag} <span className="truncate">{lang.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                 <div>
                    <Label>Accepted Payment Icons</Label>
                    <div className="mt-2">
                        <CheckboxGroup options={PAYMENT_ICONS} selected={customizations.paymentIcons} onChange={handlePaymentIconChange} />
                    </div>
                </div>
            </AccordionItem>

            <AccordionItem title="Booking Types">
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 mb-4">Select which booking types are available on your form. At least one must be selected.</p>
                <div className="grid grid-cols-2 gap-2">
                    {(['distance', 'hourly', 'flat_rate', 'on_demand', 'charter', 'airport_transfer', 'event_shuttle'] as BookingType[]).map(type => (
                         <button key={type} type="button" onClick={() => handleBookingTypeChange(type)} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors capitalize text-center ${customizations.enabledBookingTypes.includes(type) ? 'bg-[var(--accent-color)] text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200' }`}>
                             {type.replace('_', '-')}
                         </button>
                    ))}
                </div>
            </AccordionItem>
        </div>
    );
};
