
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthPage } from './components/auth/AuthPage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { supabase } from './services/supabase';
import type { Session } from './types';
import { DriverAppContainer } from './components/driver/DriverAppContainer';
import { PublicBookingForm } from './components/public-form/PublicBookingForm';
import { PublicBookingStatus } from './components/public-status/PublicBookingStatus';

// Component for password reset, defined within index.tsx to avoid creating new files.
const PasswordResetPage: React.FC = () => {
    const { t } = useTheme();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError(t('password_reset_error_length', "Password must be at least 6 characters long."));
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setMessage(t('password_reset_success', "Your password has been reset successfully. You will be redirected to the login page shortly."));
            setTimeout(() => {
                // Fixed: Redirecting to origin root is safer than pathname which might be malformed in some dev environments
                window.location.assign(window.location.origin);
            }, 3000);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                 <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-300 dark:border-slate-800">
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-6">{t('password_reset_title', 'Set New Password')}</h2>
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label htmlFor="new-password"
                                   className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('new_password', 'New Password')}</label>
                            <input id="new-password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                   className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"/>
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        {message && <p className="text-green-500 text-sm text-center">{message}</p>}
                        <div>
                            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50">
                                {loading ? t('saving', 'Saving...') : t('save_new_password', 'Save New Password')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const Main = () => {
    const { t } = useTheme();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const isDriverApp = window.location.pathname.startsWith('/driver');

    const getSession = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                throw sessionError;
            }
            setSession(session);
        } catch (err: any) {
            console.error("Error fetching session:", err);
            if (!navigator.onLine) {
                setError(t('offline_error', "You are currently offline. Please check your internet connection and try again."));
            } else if (err.message && (err.message.toLowerCase().includes('failed to fetch') || err.message.toLowerCase().includes('network request failed'))) {
                setError(t('network_error', "Could not connect to the server. Please check your internet connection and ensure ad-blockers or firewalls are not interfering."));
            } else if (err.status && err.status >= 500) {
                setError(t('server_error', "The service is temporarily unavailable. We're working on it. Please try again in a few moments."));
            } else {
                setError(t('auth_error', "An unexpected authentication error occurred. Please try refreshing the page."));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            } else if (event === 'SIGNED_IN') {
                setIsPasswordRecovery(false);
                setError(null);
            }
            setSession(newSession);
        });

        getSession();

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const handleAdminSignOut = async () => {
        await supabase.auth.signOut();
    };


    if (loading) {
        return (
            <div className="flex min-h-screen animate-pulse bg-white dark:bg-slate-950">
                {/* Sidebar Skeleton */}
                <aside className="sticky top-0 h-screen bg-white dark:bg-slate-900 w-64 z-10 p-4">
                    <div className="flex items-center justify-center h-16 flex-shrink-0 mb-4">
                        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
                    </div>
                    <div className="space-y-2">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center p-2.5 rounded-lg h-10">
                                <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                                <div className="ml-3 h-3 bg-slate-200 dark:bg-slate-800 rounded w-36"></div>
                            </div>
                        ))}
                    </div>
                </aside>
                {/* Main Content Skeleton */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Skeleton */}
                    <header className="flex items-center justify-end px-6 h-16 bg-white dark:bg-slate-900">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                            <div className="flex items-center">
                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                                <div className="ml-3 hidden sm:block">
                                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-1.5"></div>
                                    <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                                </div>
                            </div>
                        </div>
                    </header>
                    {/* Page Content Skeleton */}
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="p-5 rounded-xl bg-white dark:bg-slate-800/50 h-28"></div>
                            ))}
                        </div>
                        <div className="h-80 bg-white dark:bg-slate-800/50 rounded-xl"></div>
                    </main>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 bg-white dark:bg-slate-950">
                <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-300 dark:border-slate-800">
                    <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <h1 className="mt-4 text-xl font-bold text-slate-800 dark:text-white">{t('connection_error', 'Connection Error')}</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">{error}</p>
                    <button onClick={getSession} className="mt-6 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition">
                        {t('try_again', 'Try Again')}
                    </button>
                </div>
            </div>
        );
    }
    
    const isPublicForm = window.location.pathname.startsWith('/form/');
    const isPublicStatus = window.location.pathname.startsWith('/booking/');

    if (isDriverApp) {
        return <DriverAppContainer />;
    }

    if (isPublicStatus) {
        const bookingId = window.location.pathname.split('/')[2];
        return <PublicBookingStatus bookingId={bookingId} />;
    }

    if (isPublicForm) {
        const tenantId = window.location.pathname.split('/')[2];
        return <PublicBookingForm tenantId={tenantId} />;
    }

    if (isPasswordRecovery) {
        return <PasswordResetPage />;
    }

    return session ? <App session={session} onSignOut={handleAdminSignOut} /> : <AuthPage />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <ThemeProvider>
                <Main />
            </ThemeProvider>
        </React.StrictMode>
    );
}
