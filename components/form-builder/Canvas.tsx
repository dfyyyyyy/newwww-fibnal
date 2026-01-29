import React, { useState, useRef, useMemo } from 'react';
import { FormField, FormFieldType } from '../../types';
import { ICONS, DEFAULT_FORM_FIELDS } from '../../constants';
import { useTheme } from '../../contexts/ThemeContext';

interface CanvasProps {
    fields: FormField[];
    onUpdateField: (index: number, field: FormField) => void;
    onDeleteField: (index: number) => void;
    onReorderFields: (startIndex: number, endIndex: number) => void;
}

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

interface EditableFieldProps {
    field: FormField;
    index: number;
    allFields: FormField[];
    isDefault: boolean;
    isDragging: boolean;
    dragOverIndex: number | null;
    dragItemIndex: number | null;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (field: FormField) => void;
    onDelete: () => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
}

const EditableField: React.FC<EditableFieldProps> = ({ field, index, allFields, isDefault, isDragging, dragOverIndex, dragItemIndex, isExpanded, onToggleExpand, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd, onDragLeave }) => {
    const { t } = useTheme();
    const isDragOver = dragOverIndex === index;
    
    const inputClasses = "w-full mt-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] disabled:bg-slate-100 dark:disabled:bg-slate-700";
    const labelClasses = "block text-xs font-medium text-slate-500 dark:text-slate-400";
    const inlineInputClasses = "font-semibold text-slate-800 dark:text-white truncate bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] rounded px-1 -ml-1 w-full";
    
    const potentialControllingFields = allFields.filter(f => 
        f.id !== field.id &&
        (f.type === FormFieldType.Dropdown || f.type === FormFieldType.Checkbox || f.type === FormFieldType.Radio) &&
        f.key 
    );
    
    const selectedControllingField = potentialControllingFields.find(f => f.key === field.conditionalLogic?.fieldKey);

    const handleConditionalLogicChange = (key: 'fieldKey' | 'value' | 'enabled', value: any) => {
        if (key === 'enabled') {
            if (value === false) {
                onUpdate({ ...field, conditionalLogic: undefined });
            } else {
                const defaultController = potentialControllingFields[0];
                if (defaultController) {
                    onUpdate({ ...field, conditionalLogic: { fieldKey: defaultController.key || '', value: defaultController.options?.[0] || '' } });
                } else {
                    onUpdate({ ...field, conditionalLogic: { fieldKey: '', value: '' } });
                }
            }
        } else {
            const newLogic = { ...(field.conditionalLogic || { fieldKey: '', value: '' }), [key]: value };
            if (key === 'fieldKey') {
                const newController = potentialControllingFields.find(f => f.key === value);
                newLogic.value = newController?.options?.[0] || '';
            }
            onUpdate({ ...field, conditionalLogic: newLogic });
        }
    };

    return (
        <div 
            className="relative transition-transform duration-200"
            onDragEnter={(e) => !isDefault && onDragEnter(e, index)}
            onDragLeave={onDragLeave}
        >
            {isDragOver && dragItemIndex !== null && dragItemIndex < index && <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-[var(--accent-color)] rounded-full z-10 opacity-70"></div>}
            
            <div 
                draggable={!isDefault}
                onDragStart={(e) => !isDefault && onDragStart(e, index)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`
                    bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/70 transition-all duration-200
                    ${isDragging ? 'opacity-50 shadow-2xl scale-105' : 'shadow-sm'}
                    ${field.required ? 'border-l-4 border-l-[var(--accent-color)]' : ''}
                `}
            >
                {/* Field Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                        <span 
                            className={`flex-shrink-0 ${isDefault ? 'text-slate-400 dark:text-slate-500' : 'cursor-move text-slate-400 dark:text-slate-500'}`}
                            title={isDefault ? t('default_field_no_reorder', "Default field, cannot be reordered") : t('drag_to_reorder', "Drag to reorder")}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isDefault ? ICONS.Lock : ICONS.DragHandle}
                            </svg>
                        </span>
                        <div className="flex items-center w-full">
                             <input
                                type="text"
                                value={field.label}
                                onChange={e => {
                                    const newLabel = e.target.value;
                                    const oldCalculatedPlaceholder = `Enter ${field.label.toLowerCase()}`;
                                    const newCalculatedPlaceholder = `Enter ${newLabel.toLowerCase()}`;
                                    
                                    const isPlaceholderAuto = !field.placeholder || field.placeholder === oldCalculatedPlaceholder;
                                    
                                    onUpdate({
                                        ...field,
                                        label: newLabel,
                                        ...((isPlaceholderAuto && (field.type === FormFieldType.Text || field.type === FormFieldType.Textarea)) && { placeholder: newCalculatedPlaceholder })
                                    });
                                }}
                                className={inlineInputClasses}
                                placeholder={t('untitled_field', 'Untitled Field')}
                            />
                            {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                        </div>
                    </div>
                     <div className="flex items-center gap-1">
                        {!isDefault && <button onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1 rounded-full flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg></button>}
                        <button onClick={onToggleExpand} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={isExpanded ? t('collapse', 'Collapse') : t('expand', 'Expand')}>
                            <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isExpanded ? ICONS.ChevronUp : ICONS.ChevronDown}
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Collapsible Field Body/Settings */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 modal-enter">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClasses}>{t('field_key', 'Field Key (for submission)')}</label>
                                    <input type="text" value={field.key || ''} onChange={e => onUpdate({...field, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} className={inputClasses} disabled={isDefault} />
                                </div>
                                {field.type !== 'datetime-local' && field.type !== 'checkbox' &&
                                <div>
                                    <label className={labelClasses}>{t('placeholder', 'Placeholder')}</label>
                                    <input type="text" value={field.placeholder || ''} onChange={e => onUpdate({...field, placeholder: e.target.value})} className={inputClasses} placeholder={`${t('e_g_enter_prefix', 'e.g., Enter')} ${field.label.toLowerCase()}`} />
                                </div>
                                }
                            </div>
                            {field.type === 'dropdown' && (
                                <div>
                                    <label className={labelClasses}>{t('options_comma_separated', 'Options (comma-separated)')}</label>
                                    <input type="text" value={field.options?.join(', ') || ''} onChange={e => onUpdate({...field, options: e.target.value.split(',').map(s => s.trim())})} className={inputClasses} />
                                </div>
                            )}

                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('required', 'Required')}</label>
                                <ToggleSwitch checked={field.required} onChange={checked => onUpdate({...field, required: checked})} />
                            </div>
                        </div>

                        {!isDefault && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('conditional_logic', 'Conditional Logic')}</label>
                                    <ToggleSwitch 
                                        checked={!!field.conditionalLogic} 
                                        onChange={(checked) => handleConditionalLogicChange('enabled', checked)}
                                    />
                                </div>
                                {field.conditionalLogic && (
                                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md space-y-3">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('conditional_logic_desc', 'Show this field only when...')}</p>
                                        <div>
                                            <label className={labelClasses}>{t('field', 'Field')}</label>
                                            <select 
                                                value={field.conditionalLogic.fieldKey} 
                                                onChange={(e) => handleConditionalLogicChange('fieldKey', e.target.value)}
                                                className={inputClasses}
                                            >
                                                <option value="">{t('select_a_field', 'Select a field...')}</option>
                                                {potentialControllingFields.map(f => (
                                                    <option key={f.id} value={f.key}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>{t('is_equal_to', 'Is equal to')}</label>
                                            {selectedControllingField && selectedControllingField.options ? (
                                                <select
                                                    value={field.conditionalLogic.value}
                                                    onChange={(e) => handleConditionalLogicChange('value', e.target.value)}
                                                    className={inputClasses}
                                                >
                                                    {selectedControllingField.options.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    value={field.conditionalLogic.value}
                                                    onChange={(e) => handleConditionalLogicChange('value', e.target.value)}
                                                    className={inputClasses}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
             {isDragOver && dragItemIndex !== null && dragItemIndex > index && <div className="absolute -top-1 left-0 right-0 h-1.5 bg-[var(--accent-color)] rounded-full z-10 opacity-70"></div>}
        </div>
    );
};

export const Canvas: React.FC<CanvasProps> = ({ fields, onUpdateField, onDeleteField, onReorderFields }) => {
    const { t } = useTheme();
    const dragItem = useRef<number | null>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const defaultFieldIds = useMemo(() => {
        const allDefaultFields: FormField[] = (Object.values(DEFAULT_FORM_FIELDS) as FormField[][]).flat();
        return new Set(allDefaultFields.map(field => field.id));
    }, []);

    const isDefaultField = (field: FormField) => defaultFieldIds.has(field.id);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        if (dragItem.current !== index) {
            setDragOverIndex(index);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
            onReorderFields(dragItem.current, dragOverIndex);
        }
        dragItem.current = null;
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('form_fields', 'Form Fields')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 -mt-2">{t('canvas_subtitle', 'Click to expand and edit fields. Custom fields can be reordered by dragging.')}</p>
            {fields.length === 0 ? (
                 <div className="text-center text-slate-500 py-10 border-2 border-dashed border-slate-300 rounded-lg">
                    <p>{t('no_fields_for_type', 'No fields for this booking type.')}</p>
                    <p className="text-xs mt-1">{t('no_fields_for_type_subtitle', 'Add fields from the Toolbox above.')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {fields.map((field, index) => {
                         const isDefault = isDefaultField(field);
                         return (
                            <EditableField
                                key={field.id}
                                field={field}
                                index={index}
                                allFields={fields}
                                isDefault={isDefault}
                                isDragging={draggingIndex === index}
                                dragOverIndex={dragOverIndex}
                                dragItemIndex={dragItem.current}
                                isExpanded={expandedIndex === index}
                                onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                onUpdate={(updatedField) => onUpdateField(index, updatedField)}
                                onDelete={() => onDeleteField(index)}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragEnd={handleDragEnd}
                                onDragLeave={handleDragLeave}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    );
};