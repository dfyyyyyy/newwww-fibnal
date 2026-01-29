import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
    const { t } = useTheme();
    if (!isOpen) return null;

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
    };


    return (
        <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-enter"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className={`bg-white dark:bg-slate-900 rounded-2xl w-full m-4 transform transition-all modal-panel-enter ${sizeClasses[size]} flex flex-col max-h-[90vh]`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
                    <h2 id="modal-title" className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                    <button onClick={onClose} aria-label={t('close', 'Close')} className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};