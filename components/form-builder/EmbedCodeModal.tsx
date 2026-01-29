import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import QRCode from 'qrcode';
import { useTheme } from '../../contexts/ThemeContext';

interface EmbedCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | undefined;
}

export const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({ isOpen, onClose, userId }) => {
    const { t } = useTheme();
    const [embedCopied, setEmbedCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [iframeWidth, setIframeWidth] = useState('100%');
    const [iframeHeight, setIframeHeight] = useState('750px');
    const [iframePadding, setIframePadding] = useState('1.5rem');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

    const shareableLink = useMemo(() => {
        if (!userId) return '';
        let link = `${window.location.origin}/form/${userId}`;
        if (iframePadding) {
            try {
                // Basic validation for padding value
                if (/^(\d+(\.\d+)?(px|em|rem|%|vw|vh)|0)$/.test(iframePadding)) {
                    link += `?padding=${encodeURIComponent(iframePadding)}`;
                }
            } catch (e) {
                // ignore invalid values
            }
        }
        return link;
    }, [userId, iframePadding]);

    const embedCode = useMemo(() => {
        if (!shareableLink) return '';
        const iframeId = `its-booking-form-${userId ? userId.substring(0, 8) : '1'}`;

        const iframeTag = `<iframe id="${iframeId}" src="${shareableLink}" width="${iframeWidth}" height="${iframeHeight}" style="border:none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);" title="Booking Form"></iframe>`;

        const scriptTag = `
<script>
  (function() {
    var iframe = document.getElementById('${iframeId}');
    if (iframe) {
      window.addEventListener('message', function(event) {
        // Optional: Add a security check for the message origin
        // if (event.origin !== '${new URL(window.location.origin).origin}') return;
        
        if (event.data && event.data.type === 'form-resize' && typeof event.data.height === 'number') {
          iframe.style.height = (event.data.height + 5) + 'px';
        }
      });
    }
  })();
</script>`;
        return `${iframeTag}\n${scriptTag.replace(/^  /gm, '')}`;
    }, [shareableLink, iframeWidth, iframeHeight, userId]);

    useEffect(() => {
        if (isQrModalOpen && shareableLink) {
            QRCode.toDataURL(shareableLink, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 256,
                color: {
                    dark: '#0f172a', // slate-900
                    light: '#ffffff'
                }
            })
            .then(url => {
                setQrCodeDataUrl(url);
            })
            .catch(err => {
                console.error('Failed to generate QR code', err);
            });
        }
    }, [isQrModalOpen, shareableLink]);


    const handleCopyEmbed = () => {
        if (navigator.clipboard && embedCode) {
            navigator.clipboard.writeText(embedCode).then(() => {
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 2000);
            });
        }
    };

    const handleCopyLink = () => {
        if (navigator.clipboard && shareableLink) {
            navigator.clipboard.writeText(shareableLink).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            });
        }
    };

    const handleDownloadQrCode = () => {
        if (!qrCodeDataUrl) return;
        const link = document.createElement('a');
        link.href = qrCodeDataUrl;
        link.download = `booking-form-qr-${userId?.substring(0, 8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('embed_share_form', 'Embed & Share Your Form')}>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t('shareable_link', 'Shareable Link')}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 text-sm">
                            {t('shareable_link_desc', 'Use this direct link to share your booking form with customers. It opens a full-page version of your form.')}
                        </p>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                readOnly
                                value={shareableLink}
                                className="w-full flex-1 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 rounded-md focus:outline-none"
                            />
                             <button
                                onClick={() => setIsQrModalOpen(true)}
                                disabled={!userId}
                                className="p-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200/70 dark:border-slate-600 transition-colors disabled:opacity-50"
                                title={t('generate_qr', 'Generate QR Code')}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A.75.75 0 0 1 4.5 3.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm0 9A.75.75 0 0 1 4.5 12.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm9-9A.75.75 0 0 1 13.5 3.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm4.5 7.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 .75-.75h4.5Z" /></svg>
                            </button>
                            <button
                                onClick={handleCopyLink}
                                disabled={!userId}
                                className="px-4 py-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200/70 dark:border-slate-600 transition-colors disabled:opacity-50"
                            >
                                {linkCopied ? t('copied', 'Copied!') : t('copy', 'Copy')}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t('embed_code', 'Embed Code')}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 text-sm">
                            {t('embed_code_desc', 'Copy and paste this iframe code into your website. Adjust the size as needed.')}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4">
                            <div>
                                <label htmlFor="iframe-width" className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('width', 'Width')}</label>
                                <input
                                    type="text"
                                    id="iframe-width"
                                    value={iframeWidth}
                                    onChange={(e) => setIframeWidth(e.target.value)}
                                    placeholder="e.g., 100% or 600px"
                                    className="w-full mt-1 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="iframe-height" className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('height', 'Height')}</label>
                                <input
                                    type="text"
                                    id="iframe-height"
                                    value={iframeHeight}
                                    onChange={(e) => setIframeHeight(e.target.value)}
                                    placeholder="e.g., 750px"
                                    className="w-full mt-1 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                             <div>
                                <label htmlFor="iframe-padding" className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t('inner_padding', 'Inner Padding')}</label>
                                <input
                                    type="text"
                                    id="iframe-padding"
                                    value={iframePadding}
                                    onChange={(e) => setIframePadding(e.target.value)}
                                    placeholder="e.g., 1.5rem"
                                    className="w-full mt-1 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                        
                        <div className="relative">
                            <textarea
                                readOnly
                                value={embedCode}
                                className="w-full h-40 p-3 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 rounded-md resize-none focus:outline-none"
                                placeholder={t('generating_embed_code', 'Generating embed code...')}
                            />
                            <button
                                onClick={handleCopyEmbed}
                                disabled={!embedCode}
                                className="absolute top-2 right-2 px-4 py-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200/70 dark:border-slate-600 transition-colors disabled:opacity-50"
                            >
                                {embedCopied ? t('copied', 'Copied!') : t('copy', 'Copy')}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title={t('qr_code_title', 'Booking Form QR Code')}>
                <div className="flex flex-col items-center justify-center space-y-4">
                    {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="Booking Form QR Code" className="w-64 h-64 rounded-lg bg-white p-2 border" />
                    ) : (
                        <div className="w-64 h-64 rounded-lg bg-slate-100 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                        </div>
                    )}
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 break-all">{shareableLink}</p>
                    <div className="flex w-full gap-2 pt-4">
                         <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="w-full px-4 py-2 text-sm bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                            {t('close', 'Close')}
                        </button>
                        <button
                            onClick={handleDownloadQrCode}
                            disabled={!qrCodeDataUrl}
                            className="w-full px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                        >
                            {t('download', 'Download')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};