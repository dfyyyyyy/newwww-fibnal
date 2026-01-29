

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Notification, Session } from '../types';
import { Modal } from './shared/Modal';
import { useTheme } from '../contexts/ThemeContext';
import { Database } from '../services/database.types';
import { ICONS } from '../constants';
import { Tooltip } from './shared/Tooltip';

const SafeHtmlRenderer: React.FC<{ html: string }> = ({ html }) => {
    const parts = html.split(/<br\s*\/?>/gi);

    return (
        <div className="space-y-2">
            {parts.map((part, index) => {
                const subParts = part.split(/<\/?strong>/gi);
                return (
                    <p key={index} className="text-slate-700 dark:text-slate-300">
                        {subParts.map((subPart, subIndex) =>
                            subIndex % 2 === 1
                                ? <strong key={subIndex}>{subPart}</strong>
                                : <React.Fragment key={subIndex}>{subPart}</React.Fragment>
                        )}
                    </p>
                );
            })}
        </div>
    );
};

export const Notifications: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
        if (!session) {
            setError("User not authenticated.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('notifications')
                .select('*')
                .eq('uid', session.user.id)
                .order('created_at', { ascending: false });
            
            if (signal?.aborted) return;
            if (dbError) throw dbError;
            
            setNotifications(data || []);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                const errorMessage = (err && typeof err.message === 'string') ? err.message : 'An unexpected error occurred.';
                setError(`${t('fetch_fail_prefix', 'Failed to load notifications:')} ${errorMessage}`);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [session, t]);

    useEffect(() => {
        const controller = new AbortController();
        fetchNotifications(controller.signal);
        
        return () => {
            controller.abort();
        };
    }, [fetchNotifications]);

    const handleViewNotification = async (notification: Notification) => {
        setSelectedNotification(notification);
        setIsModalOpen(true);

        if (!notification.is_read) {
            const payload: Database['public']['Tables']['notifications']['Update'] = { is_read: true };
            const { error } = await supabase
                .from('notifications')
                .update(payload)
                .eq('id', notification.id);

            if (error) {
                console.error("Failed to mark notification as read:", error.message);
            } else {
                setNotifications(prev => 
                    prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
                );
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!session) return;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .match({ uid: session.user.id, is_read: false });

        if (error) {
            showNotification(`Error: ${error.message}`, 'error');
        } else {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            showNotification('All notifications marked as read.', 'success');
        }
    };

    const handleDeleteNotification = async (notificationId: number) => {
        if (!session) return;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .match({ id: notificationId, uid: session.user.id });

        if (error) {
            showNotification(`Error: ${error.message}`, 'error');
        } else {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            showNotification('Notification deleted.', 'success');
        }
    };
    
    const handleDeleteAllRead = async () => {
        if (!session) return;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .match({ uid: session.user.id, is_read: true });
        
        if (error) {
            showNotification(`Error: ${error.message}`, 'error');
        } else {
            setNotifications(prev => prev.filter(n => !n.is_read));
            showNotification('Read notifications cleared.', 'success');
        }
    };

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
    const readCount = useMemo(() => notifications.filter(n => n.is_read).length, [notifications]);
    
    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl"></div>)}
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button 
                    onClick={() => fetchNotifications()}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    {t('try_again', 'Try Again')}
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('notification_center_title', 'Notification Center')}</h1>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                        className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Mark all as read
                    </button>
                    <button 
                        onClick={handleDeleteAllRead}
                        disabled={readCount === 0}
                        className="px-3 py-1.5 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Clear read
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {notifications.length > 0 ? notifications.map(notification => (
                    <div 
                        key={notification.id} 
                        onClick={() => handleViewNotification(notification)}
                        className={`relative group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow duration-300 ${!notification.is_read ? 'border-primary-300 dark:border-primary-500/50' : 'border-slate-200/70 dark:border-slate-800/70'}`}
                    >
                         <div className="p-5 flex items-center gap-5">
                            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${!notification.is_read ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                <div className="text-slate-400">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className={`font-semibold truncate ${!notification.is_read ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {t('to', 'To')}: {notification.recipient_email}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-500 flex-shrink-0 ml-4">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <p className={`mt-1 text-sm truncate ${!notification.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {notification.subject}
                                </p>
                            </div>
                        </div>
                        <Tooltip content="Delete Notification">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                                className="absolute top-1/2 -translate-y-1/2 right-4 p-1.5 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                            </button>
                        </Tooltip>
                    </div>
                )) : (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-slate-800 dark:text-white">{t('no_notifications', 'No notifications')}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('notifications_appear_here', 'Notifications sent to drivers will appear here.')}</p>
                    </div>
                )}
            </div>

            {selectedNotification && (
                 <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedNotification.subject}>
                    <div className="space-y-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                           <p><strong>{t('to', 'To')}:</strong> {selectedNotification.recipient_email}</p>
                           <p><strong>{t('sent', 'Sent')}:</strong> {new Date(selectedNotification.created_at).toLocaleString()}</p>
                        </div>
                        <hr className="dark:border-slate-700"/>
                        <SafeHtmlRenderer html={selectedNotification.body} />
                         <div className="flex justify-end space-x-2 mt-6">
                             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('close', 'Close')}</button>
                         </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};