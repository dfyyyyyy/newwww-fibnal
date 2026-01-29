import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { ICONS } from '../../constants';

export const SignIn: React.FC = () => {
    const { t } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError(t('password_reset_enter_email', "Please enter your email address to reset your password."));
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
             redirectTo: `${window.location.origin}${window.location.pathname}`,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage(t('password_reset_link_sent', "Password reset link sent! Please check your email."));
        }
        setLoading(false);
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-6">{t('sign_in', 'Sign In')}</h2>
            <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('email_address', 'Email address')}</label>
                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                           className="mt-1 block w-full px-3 py-2 border border-slate-300/70 dark:border-slate-700 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-200 transition" />
                </div>
                <div>
                    <label htmlFor="password"
                           className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('password', 'Password')}</label>
                    <div className="relative">
                        <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                           value={password} onChange={e => setPassword(e.target.value)}
                           className="pr-10 mt-1 block w-full px-3 py-2 border border-slate-300/70 dark:border-slate-700 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-200 transition"/>
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                            aria-label={showPassword ? t('hide_password', 'Hide password') : t('show_password', 'Show password')}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {showPassword ? ICONS.HidePassword : ICONS.ShowPassword}
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input id="remember-me" name="remember-me" type="checkbox"
                               checked={rememberMe}
                               onChange={e => setRememberMe(e.target.checked)}
                               className="h-4 w-4 text-[var(--accent-color)] focus:ring-[var(--accent-color)] border-slate-300 rounded"/>
                        <label htmlFor="remember-me"
                               className="ml-2 block text-sm text-slate-900 dark:text-slate-300">{t('stay_logged_in', 'Stay logged in')}</label>
                    </div>
                    <div className="text-sm">
                        <button type="button" onClick={handlePasswordReset} className="font-medium text-[var(--accent-color)] hover:opacity-80">
                            {t('forgot_password', 'Forgot your password?')}
                        </button>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {message && <p className="text-green-500 text-sm text-center">{message}</p>}

                <div>
                    <button type="submit" disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--accent-color)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-color)] disabled:opacity-50">
                        {loading ? t('signing_in', 'Signing In...') : t('sign_in', 'Sign In')}
                    </button>
                </div>
            </form>
        </div>
    );
};