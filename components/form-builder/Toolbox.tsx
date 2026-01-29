import React from 'react';
import { FormField, FormFieldType } from '../../types';
import { FIELD_TYPE_ICONS } from '../../constants';
import { useTheme } from '../../contexts/ThemeContext';

interface ToolboxProps {
    onAddField: (field: FormField) => void;
}

const createField = (type: FormFieldType, label: string, key?: string, placeholder?: string, required = false): FormField => ({
    id: `${key || label.toLowerCase().replace(/\s/g, '_')}-${Date.now()}`,
    key: key || label.toLowerCase().replace(/ /g, '_'),
    type,
    label,
    placeholder: placeholder ?? (type === FormFieldType.Text || type === FormFieldType.Textarea ? `Enter ${label.toLowerCase()}` : undefined),
    required,
    options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined
});

const standardFields: Record<string, () => FormField> = {
    "Text Input": () => createField(FormFieldType.Text, 'New Text Input'),
    "Textarea": () => createField(FormFieldType.Textarea, 'New Textarea'),
    "Number Input": () => createField(FormFieldType.Number, 'New Number Input', undefined, 'e.g., 123'),
    "Date/Time Input": () => createField(FormFieldType.DateTime, 'New Date/Time Picker'),
    "Dropdown": () => createField(FormFieldType.Dropdown, 'New Dropdown'),
    "Checkbox": () => createField(FormFieldType.Checkbox, 'New Checkbox'),
    "Vehicle Type": () => createField(FormFieldType.VehicleType, 'Vehicle Type', 'vehicle_type', undefined, true),
};

const ToolButton: React.FC<{ icon: React.ReactNode, onClick: () => void, children: React.ReactNode }> = ({ icon, onClick, children }) => (
    <button
        onClick={onClick}
        className="flex items-center p-3 text-left bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70"
    >
        <div className="w-8 h-8 flex items-center justify-center text-[var(--accent-color)] mr-3 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">{icon}</svg>
        </div>
        <span className="text-sm font-medium">{children}</span>
    </button>
);

export const Toolbox: React.FC<ToolboxProps> = ({ onAddField }) => {
    const { t } = useTheme();
    return (
        <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">{t('toolbox', 'Toolbox')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('toolbox_subtitle', 'Click to add a new field to the active form section below.')}</p>
            
            <div className="grid grid-cols-1 gap-2">
                 {Object.entries(standardFields).map(([label, fieldFactory]) => (
                    <ToolButton key={label} icon={FIELD_TYPE_ICONS[label]} onClick={() => onAddField(fieldFactory())}>
                        {label}
                    </ToolButton>
                ))}
            </div>
        </div>
    );
};