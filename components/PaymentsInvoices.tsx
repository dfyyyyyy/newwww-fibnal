import React, { useState, useEffect } from 'react';
import type { Payment, PaymentStatus, Session } from '../types';
import type { Database } from '../services/database.types';
import { Modal } from './shared/Modal';
import { supabase } from '../services/supabase';
import { ICONS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

const InvoiceCard: React.FC<{
    payment: Payment;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onViewDetails: (payment: Payment) => void;
    onToggleStatus: (payment: Payment) => void;
}> = ({ payment, isSelected, onSelect, onViewDetails, onToggleStatus }) => {
    const { t } = useTheme();
    const getStatusClass = (status: PaymentStatus) => {
        return status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
    };

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 ${isSelected ? 'border-primary-500 ring-2 ring-primary-500' : 'border-slate-200/70 dark:border-slate-800/70'}`}>
            <div className="p-5 flex items-center gap-5">
                 <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-900 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 flex-shrink-0" checked={isSelected} onChange={() => onSelect(payment.id)} aria-label={`Select invoice ${payment.id}`} />
                <div className="text-primary-500 flex-shrink-0">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Payments}</svg>
                </div>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 items-center">
                    {/* Column 1: ID & Driver */}
                    <div className="md:col-span-1">
                        <p className="font-mono font-bold text-slate-800 dark:text-white">INV-{payment.id}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{payment.driver}</p>
                    </div>
                    {/* Column 2: Status & Amount */}
                    <div className="md:col-span-1 flex items-center gap-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(payment.status as PaymentStatus)}`}>{payment.status}</span>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('col_amount', 'Amount')}</p>
                            <p className="font-bold text-lg text-primary-600 dark:text-primary-400">${payment.amount}</p>
                        </div>
                    </div>
                    {/* Column 3: Actions */}
                    <div className="md:col-span-1 flex justify-end items-center gap-2">
                        <button onClick={() => onToggleStatus(payment)} className="font-medium rounded-lg px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {payment.status === 'Pending' ? t('mark_as_paid', 'Mark as Paid') : t('mark_as_pending', 'Mark as Pending')}
                        </button>
                        <button onClick={() => onViewDetails(payment)} className="font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg text-xs px-3 py-1.5">{t('view_button', 'View')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const PaymentsInvoices: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);

    const fetchPayments = async () => {
        const controller = new AbortController();
        await fetchPaymentsWithSignal(controller.signal);
        return () => controller.abort();
    };

    const fetchPaymentsWithSignal = async (signal: AbortSignal) => {
        if (!session) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('payments').select('*').abortSignal(signal)
                .eq('uid', session.user.id)
                .order('date', { ascending: false });

            if (dbError) throw dbError;
            if (signal.aborted) return;
            
            if (data) {
                setPayments(data);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Error fetching payments:', err);
                const errorMessage = (err && typeof err.message === 'string') ? err.message : 'An unexpected error occurred.';
                setError(`${t('fetch_fail_prefix', 'Failed to fetch payments:')} ${errorMessage}`);
            }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (session) {
            fetchPaymentsWithSignal(controller.signal);
        }
        return () => {
            controller.abort();
        };
    }, [session, t]);

    const getStatusClass = (status: PaymentStatus) => {
        return status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
    };

    const handleTogglePaidStatus = async (payment: Payment) => {
        if (!session) return;
        const newStatus: PaymentStatus = payment.status === 'Paid' ? 'Pending' : 'Paid';
        const payload: Database['public']['Tables']['payments']['Update'] = { status: newStatus };
        const { error } = await supabase.from('payments').update(payload)
            .eq('id', payment.id)
            .eq('uid', session.user.id);
        if (error) {
            console.error('Error updating payment status:', error);
            showNotification(`${t('status_update_fail', 'Failed to update status:')} ${error.message}`, 'error');
        } else {
            fetchPayments();
        }
    };

    const handleViewDetails = (payment: Payment) => {
        setSelectedInvoice(payment);
        setIsDetailModalOpen(true);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPaymentIds(payments.map(p => p.id));
        } else {
            setSelectedPaymentIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedPaymentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRemove = async () => {
        if (selectedPaymentIds.length === 0 || !session) return;
        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedPaymentIds.length} ${t('payment_record_plural', 'payment record(s)')}?`)) {
            const { count, error } = await supabase.from('payments').delete()
                .eq('uid', session.user.id)
                .in('id', selectedPaymentIds);
            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove payments:')} ${error.message}`, 'error');
            } else if (count === null || count === 0) {
                showNotification(t('remove_permission_error', 'The selected items were not removed. Please check your admin permissions (Row Level Security) in Supabase and try again.'), 'error');
            } else {
                showNotification(`${count} ${t('payment_record_plural', 'payment record(s)')} removed.`, 'success');
                fetchPayments();
                setSelectedPaymentIds([]);
            }
        }
    };

    const areAllSelected = payments.length > 0 && selectedPaymentIds.length === payments.length;

    if (loading) {
       return null;
    }
    
    if (error) {
        return (
             <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button 
                    onClick={() => { fetchPayments(); }}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    {t('try_again', 'Try Again')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('payments_invoices_title', 'Payments & Invoices')}</h1>
            </div>
             <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-payments" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-900 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" checked={areAllSelected} onChange={handleSelectAll} disabled={payments.length === 0} aria-label="Select all payments" />
                    <label htmlFor="select-all-payments" className="text-sm font-semibold">
                        {areAllSelected ? 'Deselect All' : `Select All (${payments.length})`}
                    </label>
                </div>
                {selectedPaymentIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedPaymentIds.length} selected</p>
                        <button onClick={handleBulkRemove} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                            Remove Selected
                        </button>
                    </div>
                )}
            </div>
            {loading ? (
                <div className="grid grid-cols-1 gap-6 animate-pulse">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-2xl"></div>)}
                </div>
            ) : payments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {payments.map(payment => (
                        <InvoiceCard key={payment.id} payment={payment} isSelected={selectedPaymentIds.includes(payment.id)} onSelect={handleSelectOne} onViewDetails={handleViewDetails} onToggleStatus={handleTogglePaidStatus} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
                    <p className="font-semibold">No payment records found.</p>
                </div>
            )}

            {selectedInvoice && (
                <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`${t('invoice_details_title', 'Invoice Details')} - INV-${selectedInvoice.id}`}>
                    <div className="space-y-3 text-slate-600 dark:text-slate-300">
                        <p><strong>{t('col_driver', 'Driver')}:</strong> {selectedInvoice.driver}</p>
                        <p><strong>{t('col_amount', 'Amount')}:</strong> ${selectedInvoice.amount}</p>
                        <p><strong>{t('col_payout_date', 'Payout Date')}:</strong> {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                        <p><strong>{t('col_status', 'Status')}:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(selectedInvoice.status as PaymentStatus)}`}>{selectedInvoice.status}</span></p>
                        <hr className="dark:border-slate-700 pt-2"/>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t('earnings_breakdown_placeholder', 'Earnings Breakdown (Placeholder)')}</h3>
                        <ul className="text-sm text-slate-500 dark:text-slate-400 list-disc list-inside">
                            <li>{t('total_fares_placeholder', 'Total Fares: $1800.00')}</li>
                            <li>{t('tips_placeholder', 'Tips: $50.25')}</li>
                            <li>{t('commission_placeholder', 'Company Commission (30%): -$540.00')}</li>
                        </ul>
                        <p className="font-bold text-lg text-slate-800 dark:text-white pt-2 border-t dark:border-slate-700">{t('final_payout', 'Final Payout')}: ${selectedInvoice.amount}</p>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button type="button" onClick={() => setIsDetailModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('close', 'Close')}</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
