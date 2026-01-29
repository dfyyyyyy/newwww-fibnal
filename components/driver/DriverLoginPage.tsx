import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { ICONS } from '../../constants';

const DriverSignIn: React.FC = () => {
    const { t } = useTheme();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!email || !password) {
            setError(t('enter_email_password', "Please enter both email and password."));
            setLoading(false);
            return;
        }

        try {
            let user = null;

            if (isSignUp) {
                // Sign Up Flow
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                user = signUpData.user;
            } else {
                // Sign In Flow
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                user = signInData.user;
            }

            if (user) {
                // Verify if this user's email exists in the 'drivers' table.
                // If the admin added them to the table but the edge function failed, this step links them.
                const { data: driver, error: driverError } = await supabase
                    .from('drivers')
                    .select('id, user_id')
                    .eq('email', user.email)
                    .maybeSingle();

                if (driverError || !driver) {
                    // User is not in the drivers table
                    await supabase.auth.signOut();
                    setError(t('driver_access_denied', "Access denied. This email is not registered as a driver by the admin."));
                    setLoading(false);
                    return;
                }

                // If driver exists but user_id is null (because Edge function failed previously), update it now
                if (!driver.user_id) {
                    await supabase
                        .from('drivers')
                        .update({ user_id: user.id })
                        .eq('id', driver.id);
                }
                
                // Successful login/link will be handled by parent component's session listener
            } else if (isSignUp) {
                 setError("Check your email for the confirmation link.");
                 setLoading(false);
            }
            
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(err.message || t('unexpected_error', "An unexpected error occurred. Please try again."));
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-6">
                {isSignUp ? t('driver_register', 'Driver Registration') : t('driver_signin', 'Driver Sign In')}
            </h2>
            <form onSubmit={handleAuth} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('email_address', 'Email address')}</label>
                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                           className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                </div>
                 <div>
                    <label htmlFor="password-driver" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('password', 'Password')}</label>
                    <div className="relative">
                        <input id="password-driver" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? "new-password" : "current-password"} required
                           value={password} onChange={e => setPassword(e.target.value)}
                           className="pr-10 mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"/>
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
                
                {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
                
                <div>
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--accent-color)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-color)] disabled:opacity-50">
                        {loading ? (isSignUp ? t('registering', 'Registering...') : t('signing_in', 'Signing In...')) : (isSignUp ? t('register', 'Register') : t('sign_in', 'Sign In'))}
                    </button>
                </div>
            </form>
            
            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(''); }} 
                    className="text-sm font-medium text-primary-600 hover:underline focus:outline-none"
                >
                    {isSignUp 
                        ? t('already_have_account', "Already have an account? Sign In") 
                        : t('need_account', "Need to create an account? Register here")
                    }
                </button>
            </div>
        </div>
    );
};

export const DriverLoginPage: React.FC = () => {
    const { t } = useTheme();

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('driver_portal', 'Driver Portal')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">{t('driver_portal_subtitle', 'Sign in to manage your rides.')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-800/70">
                    <DriverSignIn />
                </div>
            </div>
        </div>
    );
};