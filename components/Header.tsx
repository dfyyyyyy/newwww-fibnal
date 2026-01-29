import React, { useState, useEffect, useRef } from 'react';
import { View, Theme, AccentColor, SidebarStyle } from '../types';
import type { User } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { ICONS, LANGUAGES, LANGUAGE_FLAG_SVGS } from '../constants';
import { supabase } from '../services/supabase';
import { Tooltip } from './shared/Tooltip';

interface HeaderProps {
    user: User;
    onSignOut: () => void;
    setActiveView: (view: View) => void;
    isSigningOut: boolean;
    onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut, setActiveView, isSigningOut, onOpenProfile }) => {
    const { theme, setTheme, isDarkMode, t, language, setLanguage, accentColor, setAccentColor, sidebarStyle, setSidebarStyle } = useTheme();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [isCustomizeMenuOpen, setIsCustomizeMenuOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const userMenuRef = useRef<HTMLDivElement>(null);
    const themeMenuRef = useRef<HTMLDivElement>(null);
    const languageMenuRef = useRef<HTMLDivElement>(null);
    const customizeMenuRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setIsUserMenuOpen(false);
        }
        if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
            setIsThemeMenuOpen(false);
        }
        if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
            setIsLanguageMenuOpen(false);
        }
        if (customizeMenuRef.current && !customizeMenuRef.current.contains(event.target as Node)) {
            setIsCustomizeMenuOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!user?.id) return;
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('uid', user.id)
                .eq('is_read', false);
            
            if (!error && count !== null) {
                setUnreadNotifications(count);
            }
        };

        fetchUnreadCount();

        const channel = supabase.channel('public:notifications:header')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `uid=eq.${user.id}` }, fetchUnreadCount)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const userEmail = user.email || 'user@example.com';
    const userName = user.user_metadata?.full_name || userEmail.split('@')[0];
    const userAvatarUrl = user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&color=fff`;
    
    const accentColorOptions: { name: AccentColor, color: string }[] = [
        { name: 'orange', color: '#f97316' },
        { name: 'rose', color: '#f43f5e' },
        { name: 'blue', color: '#0ea5e9' },
        { name: 'green', color: '#22c55e' },
        { name: 'indigo', color: '#6366f1' },
        { name: 'slate', color: '#64748b' },
    ];

    return (
        <header className="flex items-center justify-end px-4 sm:px-6 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center space-x-3">
                {/* Language Selector */}
                <div className="relative" ref={languageMenuRef}>
                    <Tooltip content={t('change_language', 'Change Language')}>
                        <button onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Globe}</svg>
                        </button>
                    </Tooltip>
                    {isLanguageMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-1 z-50 border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsLanguageMenuOpen(false);
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

                {/* Customize Theme */}
                <div className="relative" ref={customizeMenuRef}>
                    <Tooltip content={t('customize_appearance', 'Customize Appearance')}>
                        <button onClick={() => setIsCustomizeMenuOpen(!isCustomizeMenuOpen)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Appearance}</svg>
                        </button>
                    </Tooltip>
                    {isCustomizeMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-2 z-50 border border-slate-200 dark:border-slate-700">
                            <div className="px-4 py-2">
                                <div className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('accent_color', 'Accent Color')}</div>
                                <div className="grid grid-cols-6 gap-2">
                                    {accentColorOptions.map(color => (
                                        <button
                                            key={color.name}
                                            onClick={() => setAccentColor(color.name)}
                                            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentColor === color.name ? 'ring-2 ring-offset-2' : ''}`}
                                            style={{ 
                                                backgroundColor: color.color, 
                                                '--tw-ring-color': color.color, 
                                                '--tw-ring-offset-color': isDarkMode ? '#1e293b' : '#fff' 
                                            } as React.CSSProperties}
                                            title={color.name.charAt(0).toUpperCase() + color.name.slice(1)}
                                        ></button>
                                    ))}
                                </div>
                            </div>
                            <div className="px-4 py-2 mt-2">
                                <div className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('sidebar_style', 'Sidebar Style')}</div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSidebarStyle('light')}
                                        className={`flex-1 flex items-center gap-2 p-2 rounded-md border-2 transition-colors ${sidebarStyle === 'light' ? 'border-primary-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
                                    >
                                        <div className="w-5 h-5 rounded-sm bg-white border border-slate-300"></div>
                                        <span className="text-sm">{t('light', 'Light')}</span>
                                    </button>
                                    <button
                                        onClick={() => setSidebarStyle('dark')}
                                        className={`flex-1 flex items-center gap-2 p-2 rounded-md border-2 transition-colors ${sidebarStyle === 'dark' ? 'border-primary-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
                                    >
                                        <div className="w-5 h-5 rounded-sm bg-slate-800 border border-slate-600"></div>
                                        <span className="text-sm">{t('dark', 'Dark')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Selector */}
                <div className="relative" ref={themeMenuRef}>
                    <Tooltip content={t('change_theme', 'Change Theme')}>
                        <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{isDarkMode ? ICONS.Moon : ICONS.Sun}</svg>
                        </button>
                    </Tooltip>
                    {isThemeMenuOpen && (
                         <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-2 z-50 border border-slate-200 dark:border-slate-700">
                             <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">{t('theme', 'Theme')}</div>
                             <button onClick={() => { setTheme(Theme.Light); setIsThemeMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${theme === Theme.Light ? 'font-semibold text-primary-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Sun}</svg>
                                {t('light', 'Light')}
                             </button>
                             <button onClick={() => { setTheme(Theme.Dark); setIsThemeMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${theme === Theme.Dark ? 'font-semibold text-primary-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Moon}</svg>
                                {t('dark', 'Dark')}
                             </button>
                             <button onClick={() => { setTheme(Theme.System); setIsThemeMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${theme === Theme.System ? 'font-semibold text-primary-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Laptop}</svg>
                                {t('system', 'System')}
                             </button>
                         </div>
                    )}
                </div>

                {/* Notifications */}
                <Tooltip content={t('notifications', 'Notifications')}>
                    <button 
                        onClick={() => setActiveView(View.Notifications)} 
                        className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {unreadNotifications > 0 && (
                            <span className="absolute top-1 right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-white text-[8px] items-center justify-center">{unreadNotifications}</span>
                            </span>
                        )}
                    </button>
                </Tooltip>
                
                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <img className="w-9 h-9 rounded-full" src={userAvatarUrl} alt="User avatar" />
                        <div className="ml-3 hidden sm:block text-left">
                            <div className="font-semibold text-sm text-slate-800 dark:text-white">{userName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{t('administrator', 'Administrator')}</div>
                        </div>
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-1 z-50 border border-slate-200 dark:border-slate-700">
                             <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
                            </div>
                            <a href="#" onClick={(e) => { e.preventDefault(); onOpenProfile(); setIsUserMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('company_profile', 'Company Profile')}</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView(View.Settings); setIsUserMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('settings', 'Settings')}</a>
                            <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                            <button onClick={(e) => { e.preventDefault(); onSignOut(); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" disabled={isSigningOut}>
                                {isSigningOut ? t('signing_out', 'Signing Out...') : t('sign_out', 'Sign out')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};