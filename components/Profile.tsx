import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Session, CompanySettings } from '../types';
import imageCompression from 'browser-image-compression';
import QRCode from 'qrcode';
import { useTheme } from '../contexts/ThemeContext';

const SectionCard: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode; }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">{title}</h2>
        <div className="p-4 sm:p-6">{children}</div>
        {footer && (
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl text-right">
                {footer}
            </div>
        )}
    </div>
);

const LogoUploader: React.FC<{
    logo: string | null;
    onUrlChange: (url: string | null) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    isUploading: boolean;
    uploadError: string;
    userId: string | null;
}> = ({ logo, onUrlChange, onFileChange, onRemove, isUploading, uploadError, userId }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
        <div className="flex items-start gap-4">
            <div className="w-20 h-20 flex-shrink-0 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                {logo ? (
                    <img src={logo} alt="Logo preview" className="h-full w-full object-contain p-1" />
                ) : (
                    <svg className="h-8 w-8 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
            </div>
            <div className="flex-grow">
                <input
                    type="text"
                    value={logo || ''}
                    onChange={(e) => onUrlChange(e.target.value || null)}
                    placeholder="Paste image URL"
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50"
                />
                <div className="flex items-center gap-4 mt-2">
                    <label htmlFor="logo-upload" className="cursor-pointer text-sm font-medium text-primary-600 hover:underline">
                        {isUploading ? 'Uploading...' : 'Upload Image'}
                    </label>
                    <input id="logo-upload" type="file" className="sr-only" onChange={onFileChange} accept="image/png, image/jpeg, image/webp" disabled={isUploading || !userId} />
                    {logo && (
                        <button type="button" onClick={onRemove} className="text-sm font-medium text-red-500 hover:underline">
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
        {uploadError && <p className="text-xs text-red-500 mt-2">{uploadError}</p>}
        {!userId && <p className="text-xs text-yellow-600 mt-2">Log in to enable uploads.</p>}
    </div>
);

const SOCIAL_PLATFORMS = {
    facebook: { name: 'Facebook', icon: <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /> },
    instagram: { name: 'Instagram', icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.264 0-3.628.014-4.9.071-2.91.132-4.143 1.34-4.275 4.275-.057 1.272-.07 1.636-.07 4.9s.013 3.628.07 4.9c.132 2.935 1.365 4.143 4.275 4.275 1.272.057 1.636.07 4.9.07 3.264 0 3.628-.014 4.9-.071 2.91-.132 4.143 1.34 4.275-4.275.057-1.272.07-1.636.07-4.9s-.013-3.628-.07-4.9c-.132-2.935-1.365-4.143-4.275-4.275-1.272-.057-1.636-.07-4.9-.07zm0 2.88c-2.484 0-4.493 2.01-4.493 4.493s2.01 4.493 4.493 4.493 4.493-2.01 4.493-4.493-2.009-4.493-4.493-4.493zm0 7.18c-1.483 0-2.686-1.203-2.686-2.686s1.203-2.686 2.686-2.686 2.686 1.203 2.686 2.686-1.203 2.686-2.686 2.686zm4.908-7.79c-.93 0-1.685.756-1.685 1.685s.756 1.685 1.685 1.685 1.685-.756 1.685-1.685-.755-1.685-1.685-1.685z"/> },
    twitter: { name: 'X (Twitter)', icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /> },
    linkedin: { name: 'LinkedIn', icon: <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/> },
    tiktok: { name: 'TikTok', icon: <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.66-1.2-6.02-3.12-1.36-1.92-1.95-4.24-1.52-6.52.41-2.19 1.97-4.14 3.86-5.32 1.9-1.18 4.11-1.71 6.32-1.58.02 2.73.02 5.46.02 8.19.02 1.54-.53 3.05-1.63 4.12-1.44 1.43-3.78 1.73-5.55.5-1.53-1.06-2.25-2.88-2.1-4.73.13-1.69 1.09-3.26 2.37-4.23.86-.68 1.83-1.13 2.87-1.39.01-2.5.01-5 .01-7.5z"/> },
    youtube: { name: 'YouTube', icon: <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/> },
    pinterest: { name: 'Pinterest', icon: <path d="M12.017 1.488c-5.913 0-8.544 4.34-8.544 8.544 0 3.743 2.14 6.777 5.167 6.777 1.053 0 1.83-.75 1.83-1.643 0-.903-.51-1.48-1.164-2.22-.59-.69-.99-1.24-.99-2.203 0-1.573 1.29-2.91 2.895-2.91 1.953 0 3.25 1.573 3.25 3.513 0 2.453-1.29 4.38-3.08 4.38-1.11 0-1.953-.933-1.74-2.053.253-1.373.82-2.733.82-3.663 0-.813-.39-1.573-1.33-1.573-.96 0-1.74.99-1.74 2.163 0 .533.16 1.02.39 1.413l-1.093 4.543c-.453 2.013.04 4.88 4.093 4.88 4.92 0 7.82-3.787 7.82-8.48 0-4.68-3.48-8.544-8.544-8.544z" /> },
    whatsapp: { name: 'WhatsApp', icon: <path d="M12 2a10 10 0 0 0-8.38 15.44l-1.42 3.54 3.64-1.42A10 10 0 1 0 12 2zm4.75 9.96c.27.13.42.4.42.69 0 .4-.24.78-.58 1.03a3.5 3.5 0 0 1-2.03.78c-1.2 0-2.31-.41-3.29-1.2a10.4 10.4 0 0 1-4.63-6.5C6.26 8.55 6 7.64 6 6.67c0-.9.23-1.78.67-2.58a3.5 3.5 0 0 1 1.9-1.42c.47-.19.98-.24 1.48-.14.54.1.98.37 1.33.77.34.4.5.87.52 1.37.03.66-.14 1.28-.48 1.82-.12.18-.26.35-.42.5l-.23.2a.6.6 0 0 0-.1.35c.02.13.07.26.15.37.2.27.44.52.7.75.53.47 1.1 1.02 1.76 1.4.1.06.2.1.3.14.28.12.58.1.8-.08l.2-.17c.18-.17.38-.32.6-.42.53-.25 1.12-.3 1.7-.12.5.14 1 .47 1.33.92.35.47.5 1.02.42 1.58-.09.62-.37 1.2-.82 1.63z" /> },
    snapchat: { name: 'Snapchat', icon: <path d="M19.43 12.98c.43-.53.64-1.2.64-1.95 0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5c0 .75.21 1.42.64 1.95-.31.13-.5.45-.5.82 0 .5.45.9 1 .9h1.7c.55 0 1-.4 1-.9 0-.37-.19-.69-.5-.82zM9.57 12.98c.43-.53.64-1.2.64-1.95 0-1.38-1.12-2.5-2.5-2.5S5.21 9.15 5.21 10.53c0 .75.21 1.42.64 1.95-.31.13-.5.45-.5.82 0 .5.45.9 1 .9h1.7c.55 0 1-.4 1-.9 0-.37-.19-.69-.5-.82zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.93 0 1.83-.13 2.68-.36.43-.12.87-.27 1.3-.43.43-.17.86-.36 1.28-.56.41-.2.82-.42 1.22-.64.4-.22.78-.46 1.16-.71.37-.25.73-.52 1.07-.8.35-.28.67-.58.98-.89.31-.31.59-.63.85-.97.26-.34.5-.7.71-1.08.21-.38.4-.78.56-1.19.16-.41.3-.84.41-1.28.11-.44.2-.89.26-1.35.06-.46.09-.92.09-1.4 0-5.52-4.48-10-10-10z"/> },
    threads: { name: 'Threads', icon: <path d="M12.001 2.001c-5.522 0-10 4.477-10 10 0 5.522 4.478 10 10 10 5.523 0 10-4.478 10-10s-4.477-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.493-9.5c-.24-1.41-1.4-2.5-2.8-2.5h-3.4c-1.4 0-2.56 1.09-2.8 2.5-.16.92 0 1.83.6 2.5.18.18.3.42.3.66s-.12.48-.3.66c-.6.67-.9 1.63-.6 2.5.24 1.41 1.4 2.5 2.8 2.5h3.4c1.4 0 2.56-1.09 2.8-2.5.16-.92 0-1.83-.6-2.5-.18-.18-.3-.42-.3-.66s.12-.48.3-.66c.6-.67.9-1.63.6-2.5z"/> },
};

interface CompanyProfileProps {
    session: Session;
    showNotification: (message: string, type: 'success' | 'error') => void;
    onClose: () => void;
}

export const CompanyProfile: React.FC<CompanyProfileProps> = ({ session, showNotification, onClose }) => {
    const { t, isDarkMode } = useTheme();
    const user = session.user;

    const [companySettings, setCompanySettings] = useState<Partial<CompanySettings>>({ logo_url: null, social_links: {}, gmb_url: null });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [email, setEmail] = useState(user.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [isSavingCompanyInfo, setIsSavingCompanyInfo] = useState(false);
    const [isSavingLoginDetails, setIsSavingLoginDetails] = useState(false);
    const userId = session?.user?.id;

    useEffect(() => {
        const fetchCompanySettings = async () => {
            if (!userId) return;
            setLoading(true);
            const { data, error } = await supabase.from('company_settings').select('*').eq('uid', userId).maybeSingle();
            if (error) showNotification('Failed to load company settings.', 'error');
            if (data) setCompanySettings(data);
            setLoading(false);
        };
        fetchCompanySettings();
    }, [userId, showNotification]);

    useEffect(() => {
        if (companySettings.gmb_url) {
            QRCode.toDataURL(companySettings.gmb_url, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 160,
                 color: {
                    dark: isDarkMode ? '#FFFFFF' : '#0f172a',
                    light: 'rgba(0,0,0,0)'
                }
            })
            .then(setQrCodeDataUrl)
            .catch(err => {
                console.error('Failed to generate QR code', err);
                setQrCodeDataUrl('');
            });
        } else {
            setQrCodeDataUrl('');
        }
    }, [companySettings.gmb_url, isDarkMode]);

    const handleCompanyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCompanySettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialLinkChange = (platform: string, value: string) => {
        setCompanySettings(prev => {
            const socialLinks = { ...(prev.social_links as object || {}) };
            if (value) {
                (socialLinks as any)[platform] = value;
            } else {
                delete (socialLinks as any)[platform];
            }
            return { ...prev, social_links: socialLinks };
        });
    };

    const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        setIsUploading(true);
        setUploadError('');
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 800 });
            const filePath = `${userId}/logo/logo-${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('vehicle-images').upload(filePath, compressedFile);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
            if (!data.publicUrl) throw new Error("Could not get public URL for logo.");
            setCompanySettings(prev => ({ ...prev, logo_url: data.publicUrl }));
        } catch (error: any) {
            setUploadError(error.message || "Failed to upload logo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCompanyInfoUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingCompanyInfo(true);
        if (!userId) return;

        const companyUpdatePromise = supabase.from('company_settings').upsert({
            uid: userId,
            company_name: companySettings.company_name || '',
            contact_email: companySettings.contact_email || '',
            contact_phone: companySettings.contact_phone || '',
            address: companySettings.address || '',
            logo_url: companySettings.logo_url || null,
            social_links: companySettings.social_links || null,
            gmb_url: companySettings.gmb_url || null,
        }, { onConflict: 'uid' });

        const userMetadataUpdatePromise = supabase.auth.updateUser({
            data: { full_name: companySettings.company_name || '' }
        });

        const [companyResult, userResult] = await Promise.allSettled([companyUpdatePromise, userMetadataUpdatePromise]);

        let success = true;
        if (companyResult.status === 'rejected') {
            showNotification(`Error saving company info: ${(companyResult.reason as Error).message}`, 'error');
            success = false;
        }
        if (userResult.status === 'rejected') {
            showNotification(`Error updating display name: ${(userResult.reason as Error).message}`, 'error');
            success = false;
        }
        
        if (success) {
            showNotification('Company information updated successfully!', 'success');
        }
        setIsSavingCompanyInfo(false);
    };

    const handleLoginDetailsUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingLoginDetails(true);
    
        const updates: { email?: string; password?: string } = {};
    
        if (email !== user.email) {
            updates.email = email;
        }
    
        if (password) {
            if (password.length < 6) {
                showNotification('Password must be at least 6 characters long.', 'error');
                setIsSavingLoginDetails(false);
                return;
            }
            if (password !== confirmPassword) {
                showNotification('Passwords do not match.', 'error');
                setIsSavingLoginDetails(false);
                return;
            }
            updates.password = password;
        }
    
        if (Object.keys(updates).length === 0) {
            showNotification('No changes to save.', 'success');
            setIsSavingLoginDetails(false);
            return;
        }
        
        const { error } = await supabase.auth.updateUser(updates);
    
        if (error) {
            showNotification(`Error updating login details: ${error.message}`, 'error');
        } else {
            showNotification('Login details updated successfully!', 'success');
            if (updates.email) {
                showNotification('Please check your new email for a confirmation link.', 'success');
            }
            if (updates.password) {
                setPassword('');
                setConfirmPassword('');
            }
        }
        setIsSavingLoginDetails(false);
    };
    
    const inputClasses = "mt-1 block w-full sm:text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500 text-slate-900 dark:text-white";
    const labelClasses = "block text-sm font-medium text-slate-700 dark:text-slate-300";

    if (loading) return null;

    return (
        <div className="space-y-6">
            <form onSubmit={handleCompanyInfoUpdate}>
                <SectionCard 
                    title="Company Information"
                    footer={
                        <button type="submit" disabled={isSavingCompanyInfo} className="inline-flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                            {isSavingCompanyInfo ? 'Saving...' : 'Save Company Info'}
                        </button>
                    }
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="company_name" className={labelClasses}>{t('company_name', 'Company Name')}</label>
                                <input type="text" name="company_name" id="company_name" className={inputClasses} value={companySettings.company_name || ''} onChange={handleCompanyInputChange}/>
                            </div>
                            <div>
                                <label htmlFor="contact_email" className={labelClasses}>{t('contact_email', 'Contact Email')}</label>
                                <input type="email" name="contact_email" id="contact_email" className={inputClasses} value={companySettings.contact_email || ''} onChange={handleCompanyInputChange}/>
                            </div>
                            <div>
                                <label htmlFor="contact_phone" className={labelClasses}>{t('contact_phone', 'Contact Phone')}</label>
                                <input type="tel" name="contact_phone" id="contact_phone" className={inputClasses} value={companySettings.contact_phone || ''} onChange={handleCompanyInputChange}/>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="address" className={labelClasses}>{t('address', 'Address')}</label>
                                <textarea name="address" id="address" rows={3} className={inputClasses} value={companySettings.address || ''} onChange={handleCompanyInputChange}></textarea>
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>Company Logo</label>
                            <LogoUploader 
                                logo={companySettings.logo_url || null}
                                onUrlChange={(url) => setCompanySettings(prev => ({...prev, logo_url: url}))}
                                onFileChange={handleLogoFileChange}
                                onRemove={() => setCompanySettings(prev => ({...prev, logo_url: null}))}
                                isUploading={isUploading}
                                uploadError={uploadError}
                                userId={userId || null}
                            />
                        </div>
                         <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-base font-medium text-slate-800 dark:text-white mb-2">Social Media Links</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(SOCIAL_PLATFORMS).map(([platform, { name, icon }]) => (
                                    <div key={platform}>
                                        <label htmlFor={platform} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" strokeWidth={0} viewBox="0 0 24 24">{icon}</svg>
                                            <span className="capitalize">{name}</span>
                                        </label>
                                        <input
                                            type="url"
                                            id={platform}
                                            name={platform}
                                            value={(companySettings.social_links as any)?.[platform] || ''}
                                            onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                                            className={inputClasses}
                                            placeholder={`https://www.${platform}.com/your-page`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-base font-medium text-slate-800 dark:text-white mb-2">Google My Business</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div className="md:col-span-2">
                                    <label htmlFor="gmb_url" className={labelClasses}>GMB Profile URL</label>
                                    <input
                                        type="url"
                                        name="gmb_url"
                                        id="gmb_url"
                                        className={inputClasses}
                                        value={companySettings.gmb_url || ''}
                                        onChange={handleCompanyInputChange}
                                        placeholder="Paste your Google My Business URL here"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">A QR code will be generated automatically when you enter a URL.</p>
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                    {qrCodeDataUrl ? (
                                        <img src={qrCodeDataUrl} alt="GMB QR Code" className="w-40 h-40 rounded-lg bg-white dark:bg-slate-700 p-2 border border-slate-200 dark:border-slate-600" />
                                    ) : (
                                        <div className="w-40 h-40 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-center text-sm text-slate-500 p-4">
                                            QR code for your GMB profile will appear here
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </form>

            <form id="login-details-form" onSubmit={handleLoginDetailsUpdate}>
                <SectionCard 
                    title="Login Details"
                    footer={
                         <button type="submit" form="login-details-form" disabled={isSavingLoginDetails} className="inline-flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                            {isSavingLoginDetails ? 'Saving...' : 'Save Login Details'}
                        </button>
                    }
                >
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="email" className={labelClasses}>Your Login Email</label>
                            <input type="email" name="email" id="email" className={inputClasses} value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-base font-medium text-slate-800 dark:text-white">Change Password</h3>
                             <div className="space-y-4 mt-4">
                                <div>
                                    <label htmlFor="new_password" className={labelClasses}>New Password</label>
                                    <input type="password" name="new_password" id="new_password" className={inputClasses} value={password} onChange={e => setPassword(e.target.value)} placeholder="Must be at least 6 characters" />
                                </div>
                                 <div>
                                    <label htmlFor="confirm_password" className={labelClasses}>Confirm New Password</label>
                                    <input type="password" name="confirm_password" id="confirm_password" className={inputClasses} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </form>

            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
};