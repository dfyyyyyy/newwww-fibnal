
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FormStructure, CustomizationOptions, BookingType } from '../../types';
import { generateStaticHTML } from '../../services/geminiService';

interface PreviewProps {
    formStructure: FormStructure;
    customizations: CustomizationOptions;
    userId: string | undefined;
    forceBookingType?: BookingType | 'full';
    disableTypeSelector?: boolean;
    isPreview?: boolean;
    padding?: string;
}

export const Preview: React.FC<PreviewProps> = ({
    formStructure,
    customizations,
    userId,
    forceBookingType = 'full',
    disableTypeSelector = false,
    isPreview = true,
    padding,
}) => {
    const staticHtml = useMemo(() => {
        let previewCustomizations = customizations;
        if (disableTypeSelector) {
            previewCustomizations = {
                ...customizations,
                layout_settings: {
                    ...customizations.layout_settings,
                    components_visibility: {
                        ...(customizations.layout_settings?.components_visibility || {}),
                        booking_type_selector: false,
                    },
                },
            };
        }

        return generateStaticHTML(
            formStructure,
            previewCustomizations,
            forceBookingType as BookingType | 'full',
            userId,
            isPreview,
            padding
        );
    }, [formStructure, customizations, userId, forceBookingType, disableTypeSelector, isPreview, padding]);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeHeight, setIframeHeight] = useState('750px');

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== iframeRef.current?.contentWindow) {
                return;
            }
            if (event.data && event.data.type === 'form-resize' && typeof event.data.height === 'number') {
                // Add a small buffer to prevent scrollbars from appearing due to sub-pixel rendering issues.
                setIframeHeight(`${event.data.height + 5}px`);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <iframe
            ref={iframeRef}
            srcDoc={staticHtml}
            style={{ width: '100%', height: iframeHeight, minHeight: '600px', border: 'none', transition: 'height 0.2s ease-out' }}
            title="Form Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
        />
    );
};
