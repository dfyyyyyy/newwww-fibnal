import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { Session, Driver, Message } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface EnrichedDriver extends Driver {
    unread_count?: number;
}

export const Messages: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session }) => {
    const { t } = useTheme();
    const [drivers, setDrivers] = useState<EnrichedDriver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<EnrichedDriver | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const adminId = `user:${session.user.id}`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchDriversAndUnreadCounts = useCallback(async () => {
        const { data: driversData, error: driversError } = await supabase
            .from('drivers')
            .select('*')
            .eq('uid', session.user.id);
        if (driversError) return;

        const unreadCountsPromises = (driversData || []).map(driver =>
            supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('receiver_id', adminId)
                .eq('sender_id', `driver:${driver.id}`)
                .eq('is_read', false)
        );

        const unreadCountsResults = await Promise.all(unreadCountsPromises);
        const enrichedDrivers = (driversData || []).map((driver, index) => ({
            ...driver,
            unread_count: unreadCountsResults[index].count || 0,
        }));

        setDrivers(enrichedDrivers);
        setLoading(false);
    }, [session.user.id, adminId]);

    useEffect(() => {
        fetchDriversAndUnreadCounts();
    }, [fetchDriversAndUnreadCounts]);
    
    useEffect(() => {
        const channel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMessage = payload.new as Message;
                if (newMessage.receiver_id === adminId) {
                    // If it's for the currently selected driver, add it to the view
                    if (selectedDriver && newMessage.sender_id === `driver:${selectedDriver.id}`) {
                        setMessages(prev => [...prev, newMessage]);
                    } else {
                        // Otherwise, just update the unread count
                        setDrivers(prev => prev.map(d => 
                            `driver:${d.id}` === newMessage.sender_id 
                                ? { ...d, unread_count: (d.unread_count || 0) + 1 }
                                : d
                        ));
                    }
                }
            })
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [adminId, selectedDriver]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    const handleSelectDriver = async (driver: EnrichedDriver) => {
        setSelectedDriver(driver);
        setLoadingMessages(true);
        setMessages([]);

        const { data: messageData, error } = await supabase
            .from('messages')
            .select('*')
            .or(`(sender_id.eq.${adminId},receiver_id.eq.driver:${driver.id}),(sender_id.eq.driver:${driver.id},receiver_id.eq.${adminId})`)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error(error);
        } else {
            setMessages(messageData || []);
        }
        setLoadingMessages(false);

        // Mark messages as read
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', adminId)
            .eq('sender_id', `driver:${driver.id}`);
        
        setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, unread_count: 0 } : d));
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedDriver) return;

        const messageContent = newMessage;
        setNewMessage('');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                uid: session.user.id,
                sender_id: adminId,
                receiver_id: `driver:${selectedDriver.id}`,
                content: messageContent,
            })
            .select();

        if (error) {
            console.error("Error sending message:", error);
        } else if (data) {
             setMessages(prev => [...prev, data[0]]);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">{t('chat', 'Chat')}</h1>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/70 flex h-[calc(100vh-200px)]">
                {/* Driver List */}
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="font-semibold text-lg">Drivers</h2>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {loading ? <p className="p-4 text-sm text-slate-500">Loading drivers...</p> :
                            drivers.map(driver => (
                                <button key={driver.id} onClick={() => handleSelectDriver(driver)} className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${selectedDriver?.id === driver.id ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                    <img className="w-10 h-10 rounded-full" src={driver.profile_picture_url || `https://ui-avatars.com/api/?name=${driver.name.replace(/\s/g, "+")}&background=random&color=fff`} alt={driver.name} />
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800 dark:text-white">{driver.name}</p>
                                        <p className="text-sm text-slate-500">{driver.email}</p>
                                    </div>
                                    {driver.unread_count && driver.unread_count > 0 ? (
                                        <span className="bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{driver.unread_count}</span>
                                    ): null}
                                </button>
                            ))
                        }
                    </div>
                </div>

                {/* Chat Window */}
                <div className="w-2/3 flex flex-col">
                    {selectedDriver ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                <img className="w-10 h-10 rounded-full" src={selectedDriver.profile_picture_url || `https://ui-avatars.com/api/?name=${selectedDriver.name.replace(/\s/g, "+")}&background=random&color=fff`} alt={selectedDriver.name} />
                                <div>
                                    <h2 className="font-semibold text-lg">{selectedDriver.name}</h2>
                                    <p className="text-sm text-slate-500">{selectedDriver.status}</p>
                                </div>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                                {loadingMessages ? <p>Loading messages...</p> : messages.map(msg => (
                                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === adminId ? 'justify-end' : 'justify-start'}`}>
                                        {msg.sender_id !== adminId && <img className="w-6 h-6 rounded-full" src={selectedDriver.profile_picture_url || `https://ui-avatars.com/api/?name=${selectedDriver.name.replace(/\s/g, "+")}&background=random&color=fff`} alt={selectedDriver.name} />}
                                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender_id === adminId ? 'bg-primary-500 text-white rounded-br-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-lg'}`}>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="relative">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full p-3 pr-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-slate-500">
                            <div>
                                <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <p className="mt-2 font-semibold">Select a driver to start chatting</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
