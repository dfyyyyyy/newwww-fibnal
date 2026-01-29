import React, { useState, useEffect } from 'react';
import { DriverLoginPage } from './DriverLoginPage';
import { DriverApp } from './DriverApp';
import { supabase } from '../../services/supabase';
import type { Session } from '../../types';

const SkeletonLoader = () => (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 animate-pulse">
        <header className="bg-white dark:bg-slate-900 p-4 flex justify-between items-center shadow-sm sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
            <div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-1.5"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
            </div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-24"></div>
        </header>
        <div className="p-4 sm:p-6 space-y-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl shadow-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 h-64"></div>
            ))}
        </div>
    </div>
);

export const DriverAppContainer: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        supabase.auth.getSession().then(({ data: { session }}) => {
             setSession(session);
             setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };
    
    if (loading) {
        return <SkeletonLoader />;
    }

    if (session) {
        return <DriverApp session={session} onSignOut={handleSignOut} />;
    }

    return <DriverLoginPage />;
};