
import React, { useState, useRef, useEffect } from 'react';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';
import { useTheme } from '../../contexts/ThemeContext';
import { LANGUAGES, LANGUAGE_FLAG_SVGS, ICONS } from '../../constants';

export const AuthPage: React.FC = () => {
    const [showSignIn, setShowSignIn] = useState(true);
    const { language, setLanguage, t } = useTheme();
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
    const languageDropdownRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = (event: MouseEvent) => {
        if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
            setLanguageDropdownOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const wrapperClasses = "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden";
    const panelClasses = "relative w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg rounded-xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-lg";

    return (
        <div className={wrapperClasses}>
            <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-orange-400/30 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-orange-400/30 rounded-full blur-3xl opacity-50"></div>

            <div className="absolute top-4 right-4 z-10" ref={languageDropdownRef}>
                <button onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)} className="flex items-center p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Globe}</svg>
                    <span className="ml-2 text-sm">{t('languages', 'Languages')}</span>
                </button>
                {languageDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-1 z-50 border border-slate-200 dark:border-slate-700">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setLanguageDropdownOpen(false);
                                }}
                                className={`w-full text-left flex items-center p-2 text-sm text-slate-700 dark:text-slate-300 rounded-md ${language === lang.code ? 'bg-slate-100 dark:bg-slate-700' : ''} hover:bg-slate-100 dark:hover:bg-slate-700`}
                            >
                                <svg viewBox="0 0 21 15" width="21" height="15" className="mr-3 rounded-sm shadow-sm flex-shrink-0" dangerouslySetInnerHTML={{ __html: LANGUAGE_FLAG_SVGS[lang.code] || '' }} />
                                <span className="truncate">{lang.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
             <div className="relative text-center mb-8">
                <div className="text-primary-500 mx-auto mb-4 h-20 w-20">
                    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        {ICONS.Vehicles}
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('its_booking_system', 'ITS Booking System')}</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{t('auth_subtitle', 'Sign in or create an account to continue.')}</p>
            </div>
            
            <div className={panelClasses}>
                {showSignIn ? <SignIn /> : <SignUp />}
                <div className="text-center mt-6">
                    <button onClick={() => setShowSignIn(!showSignIn)} className="text-sm font-medium text-primary-600 hover:underline">
                        {showSignIn ? t('sign_up_link', "Don't have an account? Sign Up") : t('sign_in_link', "Already have an account? Sign In")}
                    </button>
                </div>
            </div>
        </div>
    );
};