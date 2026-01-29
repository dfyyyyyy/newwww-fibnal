// This service is now responsible for generating static HTML from a template.
// The AI-powered streaming generation has been deprecated in favor of this deterministic approach
// to ensure 100% accuracy and consistency with the form builder's preview.

import { FormStructure, CustomizationOptions, BookingType, FormField, FormFieldType, Vehicle, FlatRateRoute, ExtraOption } from '../types';
import { ICONS, PAYMENT_ICONS, TRANSLATIONS, LANGUAGES, LANGUAGE_FLAG_SVGS, DEFAULT_CUSTOMIZATIONS } from '../constants';

const getTranslation = (key: string, lang: string, defaultText?: string): string => {
    if (!key) return defaultText || '';
    const translationKey = key.toLowerCase().replace(/\s/g, '_');
    const translationSet = TRANSLATIONS[translationKey];
    if (translationSet && translationSet[lang]) return translationSet[lang];
    if (translationSet && translationSet['en']) return translationSet['en'];
    return defaultText || key;
};

const BOOKING_TYPE_ICONS: Record<string, string> = {
    distance: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    hourly: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
    flat_rate: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.432 0l6.568-6.568a2.426 2.426 0 0 0 0-3.432l-8.704-8.704z"></path><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"></circle>',
    on_demand: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>',
    charter: '<path stroke-linecap="round" stroke-linejoin="round" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />',
    airport_transfer: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 14-4-4m4 4 4-4M8 5h8M5 10h14"></path>',
    event_shuttle: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m3-3h-6"></path>',
};

const generateFieldHTML = (field: FormField, lang: string, customizations: CustomizationOptions, bookingType: BookingType) => {
    const formatLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const T = (key: string, defaultText?: string): string => {
        if (!key) return defaultText || '';
        const translationKey = key.toLowerCase().replace(/\s/g, '_');
        const translationSet = TRANSLATIONS[translationKey];
        const fallback = defaultText || formatLabel(key);
        if (translationSet && translationSet[lang]) return translationSet[lang];
        if (translationSet && translationSet['en']) return translationSet['en'];
        return fallback;
    };


    const layoutSettings = { ...DEFAULT_CUSTOMIZATIONS.layout_settings, ...(customizations.layout_settings || {}) };
    const visibility = { ...DEFAULT_CUSTOMIZATIONS.layout_settings.components_visibility, ...(layoutSettings.components_visibility || {}) };
    const waypointConfig = { ...DEFAULT_CUSTOMIZATIONS.layout_settings.waypoint_button_config, ...(layoutSettings.waypoint_button_config || {}) };
    
    const isOptional = field.required ? '' : `<span class="text-xs text-slate-500 dark:text-slate-400 ml-1">(${T('optional', 'Optional')})</span>`;
    const label = `<label for="field-${field.id}" class="block text-sm font-medium text-slate-700 dark:text-slate-300">${T(field.key, field.label)} ${isOptional}</label>`;
    
    const showWaypointButton = visibility.add_waypoint_button && 
                               waypointConfig.enabled_for_types.includes(bookingType) && 
                               field.key === waypointConfig.display_after_field;

    const isAddressField = ['pickup_location', 'dropoff_location', 'waypoint'].some(key => field.key?.includes(key));
    if (isAddressField) {
        const waypointButtonHtml = showWaypointButton ? `
            <div class="absolute inset-y-0 right-0 flex items-center pr-2 z-[1]">
                 <button type="button" data-action="add-waypoint" class="group relative text-slate-400 hover:text-[var(--accent-color)] transition-colors p-1 rounded-full">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                        <path d="M15 10h-6M12 7v6" stroke-linecap="round"/>
                    </svg>
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        ${T('add_waypoint', 'Add Waypoint')}
                    </div>
                </button>
            </div>
        ` : '';

        return `
            <div class="mb-4" data-field-key="${field.key}">
                ${label}
                <div class="relative">
                    <div id="geocoder-container-${field.id}" class="geocoder-container"></div>
                    ${waypointButtonHtml}
                </div>
                <input type="hidden" name="${field.key}" id="field-${field.id}" ${field.required ? 'required' : ''} />
            </div>
        `;
    }

    const hasClearButton = [FormFieldType.Text, FormFieldType.Textarea, FormFieldType.Number].includes(field.type) || ['email', 'phone_number'].includes(field.key || '');
    const hasExtraButton = hasClearButton || showWaypointButton;
    const paddingClass = showWaypointButton && hasClearButton ? 'pr-20' : (hasExtraButton ? 'pr-10' : '');

    const heightClass = field.type === FormFieldType.Textarea ? 'py-3' : 'h-12';
    const commonProps = `id="field-${field.id}" name="${field.key}" ${field.required ? 'required' : ''} class="mt-1 block w-full px-3 ${heightClass} border-[0.5px] border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)] transition-colors ${paddingClass}" placeholder="${T(`placeholder_${field.key}`, field.placeholder || `Enter ${field.label.toLowerCase()}`)}"`;

    let fieldInputHtml = '';
    switch (field.type) {
        case FormFieldType.Textarea:
            fieldInputHtml = `<textarea ${commonProps} rows="4"></textarea>`;
            break;
        case FormFieldType.Dropdown:
            const options = (field.options || []).map(opt => `<option value="${opt}">${T(opt, opt)}</option>`).join('');
            fieldInputHtml = `<select ${commonProps}><option value="">${T('select_option', 'Select an option')}</option>${options}</select>`;
            break;
        case FormFieldType.DateTime:
             return `
                <div class="mb-4" data-field-key="${field.key}">
                    ${label}
                    <div class="custom-datetime-picker" data-field-key-instance="${field.key}">
                        <input type="hidden" ${commonProps.replace(/class=".*?"/, '').replace(/placeholder=".*?"/, '')} />
                        <div class="datetime-display-wrapper">
                            <button type="button" data-action="toggle-calendar" class="datetime-date-button">
                                <svg class="h-6 w-6 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span data-date-display class="text-sm font-semibold"></span>
                            </button>
                            <button type="button" data-action="toggle-timepicker" class="datetime-time-button">
                                <svg class="h-6 w-6 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span data-time-display class="text-sm font-semibold"></span>
                            </button>
                        </div>
                        <div data-calendar-popover class="form-popover datetime-popover" style="display:none;"></div>
                        <div data-timepicker-popover class="form-popover datetime-popover-time right-0" style="display:none;"></div>
                    </div>
                </div>`;
        default:
            const inputType = field.key === 'email' ? 'email' : (field.key === 'phone_number' ? 'tel' : field.type);
            fieldInputHtml = `<input type="${inputType}" ${commonProps} />`;
    }

    let fieldHtml = fieldInputHtml;
    if (hasExtraButton) {
        const clearButtonHtml = hasClearButton ? `<button type="button" data-action="clear-field" data-field-key-clear="${field.key}" class="form-clear-button" style="display:none;">&times;</button>` : '';
        const waypointButtonHtml = showWaypointButton ? `
            <button type="button" data-action="add-waypoint" class="group relative text-slate-400 hover:text-[var(--accent-color)] transition-colors p-1 rounded-full">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                    <path d="M15 10h-6M12 7v6" stroke-linecap="round"/>
                </svg>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    ${T('add_waypoint', 'Add Waypoint')}
                </div>
            </button>
        ` : '';
        fieldHtml = `<div class="relative">${fieldInputHtml}<div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">${clearButtonHtml}${waypointButtonHtml}</div></div>`;
    }

    return `<div class="mb-4" data-field-key="${field.key}">${label}${fieldHtml}</div>`;
};


const generateFullFormHTML = (formStructure: FormStructure, customizations: CustomizationOptions, bookingType: BookingType | 'full') => {
    const lang = customizations.defaultLanguage || 'en';
    const formatLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const T = (key: string, defaultText?: string): string => {
        if (!key) return defaultText || '';
        const translationKey = key.toLowerCase().replace(/\s/g, '_');
        const translationSet = TRANSLATIONS[translationKey];
        const fallback = defaultText || formatLabel(key);
        if (translationSet && translationSet[lang]) return translationSet[lang];
        if (translationSet && translationSet['en']) return translationSet['en'];
        return fallback;
    };


    // Filter out disabled booking types to avoid errors
    const enabledTypes = customizations.enabledBookingTypes || ['distance', 'hourly', 'flat_rate', 'on_demand'];
    
    // Get a valid default type
    const defaultBookingType = (bookingType !== 'full' && enabledTypes.includes(bookingType)) 
        ? bookingType 
        : (enabledTypes[0] || 'distance');

    const layoutSettings = { ...DEFAULT_CUSTOMIZATIONS.layout_settings, ...(customizations.layout_settings || {}) };
    const visibility = { ...DEFAULT_CUSTOMIZATIONS.layout_settings.components_visibility, ...(layoutSettings.components_visibility || {}) };
    const waypointConfig = { ...DEFAULT_CUSTOMIZATIONS.layout_settings.waypoint_button_config, ...(layoutSettings.waypoint_button_config || {}) };
    const extraOptions = (customizations.extraOptions || []).filter((opt: ExtraOption) => opt.enabled);
    
    // Helper to generate a section of fields
    const generateFieldsForType = (type: BookingType) => {
        const fields = formStructure[type] || [];
        let html = '';
        let waypointRendered = false;

        // This logic determines if a waypoint button could possibly be rendered for this booking type.
        // It covers both the hardcoded logic for pickup fields and the user-configurable settings.
        const canHaveWaypoints = visibility.add_waypoint_button && (
            ['distance', 'hourly', 'on_demand'].includes(type) || 
            waypointConfig.enabled_for_types.includes(type)
        );
        
        fields.forEach(field => {
            html += generateFieldHTML(field, lang, customizations, type);
            // This part handles placing the container after a user-specified field.
            if(visibility.add_waypoint_button && waypointConfig.enabled_for_types.includes(type) && field.key === waypointConfig.display_after_field) {
                html += `<div data-waypoint-container></div>`;
                waypointRendered = true;
            }
        });

        // If the container hasn't been rendered yet, but this type can have waypoints, add it at the end.
        // This fixes the bug where a button appears (e.g., on pickup) but has no container to add waypoints to.
        if (canHaveWaypoints && !waypointRendered) {
             html += `<div data-waypoint-container></div>`;
        }

        return html;
    };
    
    // Generate vehicle cards
    const vehicleCards = (customizations.vehicles || []).map(v => `
        <div class="form-vehicle-card" data-action="select-vehicle" data-vehicle-id="${v.id}">
            <div class="selected-indicator">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div class="relative pt-[60%] w-full pointer-events-none">
                <img src="${v.image_url || `https://ui-avatars.com/api/?name=${v.name.replace(/\s/g, "+")}&background=random&color=fff`}" alt="${v.name}" class="absolute inset-0 w-full h-full object-cover"/>
            </div>
            <div class="p-4 flex flex-col flex-grow pointer-events-none">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-md text-slate-800 dark:text-white truncate">${v.name}</h4>
                        <p class="text-sm text-slate-500 dark:text-slate-400">${v.model}</p>
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                         <p class="font-bold text-slate-800 dark:text-white"><span class="text-lg">$${(v.rate_per_km || 0).toFixed(2)}</span></p>
                         <p class="text-xs font-normal text-slate-500 dark:text-slate-400 -mt-1">${T('rate_per_km_label','/km')}</p>
                    </div>
                </div>
                <div class="flex-grow"></div>
                <div class="flex justify-around items-start text-sm text-slate-600 dark:text-slate-300 pt-4 mt-auto border-t border-slate-200 dark:border-slate-700">
                    <div class="flex flex-col items-center text-center w-20">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                        <span class="font-medium mt-1">${v.max_passengers || 0}</span>
                        <span class="text-xs text-slate-500">${T('passengers_label', 'Passengers')}</span>
                    </div>
                    <div class="flex flex-col items-center text-center w-20">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                        <span class="font-medium mt-1">${v.max_luggage || 0}</span>
                        <span class="text-xs text-slate-500">${T('luggage_label', 'Luggage')}</span>
                    </div>
                    <div class="flex flex-col items-center text-center w-20">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" /></svg>
                        <span class="font-medium mt-1">${v.max_carry_on || 0}</span>
                        <span class="text-xs text-slate-500">${T('carry_on_label', 'Carry-on')}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    const paymentIconsHtml = (customizations.paymentIcons || [])
        .map(name => PAYMENT_ICONS.find(p => p.name === name))
        .filter(Boolean)
        .map(icon => `<div title="${icon.label}" class="w-12 h-8 bg-white rounded-md shadow flex items-center justify-center p-1 border border-slate-200 dark:border-slate-700"><svg viewBox="0 0 24 24" class="w-full h-full object-contain">${icon.icon}</svg></div>`)
        .join('');
    
    const paymentCategories = {
        credit_card: { label: 'Credit Card', icons: ['visa', 'mastercard', 'amex', 'stripe', 'googlepay', 'applepay'] },
        paypal: { label: 'PayPal', icons: ['paypal'] },
        cash: { label: 'Cash', icons: ['cash'] }
    };
    
    const enabledPaymentMethods = Object.keys(paymentCategories).filter(key => 
        (customizations.paymentIcons || []).some(icon => (paymentCategories as any)[key].icons.includes(icon))
    );
    const defaultPaymentMethod = enabledPaymentMethods.includes('cash') ? 'cash' : (enabledPaymentMethods[0] || 'cash');

    const paymentButtonsHtml = Object.entries(paymentCategories).map(([key, category]) => {
        const isEnabled = (customizations.paymentIcons || []).some(icon => category.icons.includes(icon));
        if (!isEnabled) return '';
        
        let iconSvg = '';
        if (key === 'credit_card') {
            iconSvg = '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'; // ICONS.Payments
        } else {
            const paymentIcon = PAYMENT_ICONS.find(p => p.name === key);
            if (paymentIcon) iconSvg = paymentIcon.icon;
        }

        const isSelected = key === defaultPaymentMethod;

        return `
            <button type="button" data-action="select-payment" data-payment-method="${key}" class="payment-method-button ${isSelected ? 'selected' : ''}">
                <div class="w-8 h-6 mr-3 flex-shrink-0 flex items-center justify-center"><svg viewBox="0 0 24 24" class="w-full h-full">${iconSvg}</svg></div>
                <span class="text-sm font-medium text-slate-800 dark:text-slate-200" data-translate="${key}">${T(key, category.label)}</span>
            </button>
        `;
    }).join('');

    const languageSelectorHtml = (customizations.selectedLanguages.length > 1 && visibility.language_selector) ? `
        <div class="absolute top-4 right-4 z-10">
            <div class="relative">
                <button type="button" data-action="toggle-popover" data-popover="language" class="p-2 text-sm font-medium rounded-full bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
                    <span data-language-flag></span>
                </button>
                <div data-popover-content="language" class="form-popover right-0">
                    ${LANGUAGES.filter(l => customizations.selectedLanguages.includes(l.code)).map(l => `
                        <button type="button" data-action="select-language" data-lang="${l.code}" class="form-popover-item flex items-center"><svg viewBox="0 0 21 15" width="21" height="15" class="mr-3 rounded-sm shadow-sm flex-shrink-0">${LANGUAGE_FLAG_SVGS[l.code] || ''}</svg><span>${l.name}</span></button>
                    `).join('')}
                </div>
            </div>
        </div>` : '';

    const bookingTypeButtonsHtml = (bookingType === 'full' && visibility.booking_type_selector) ? `
        <div class="relative">
            <div data-booking-type-scroller class="booking-type-button-container no-scrollbar scroll-smooth">
                ${enabledTypes.map(type => `
                    <button type="button" data-action="select-booking-type" data-type="${type}" class="booking-type-button ${type === defaultBookingType ? 'active' : ''}">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${BOOKING_TYPE_ICONS[type] || ''}</svg>
                        <span>${T(`${type}_booking`, type.replace(/_/g, ' '))}</span>
                    </button>
                `).join('')}
            </div>
            <button type="button" data-action="scroll-booking-type" data-direction="right" class="scroll-button -right-3 flex sm:hidden"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
        </div>` : '';
    
    const progressStepKeys = ['step1_label', 'step2_vehicle_label', 'step2_label', 'step3_label'];

    return `
        <div class="form-container" data-step="1" data-booking-type="${defaultBookingType}" data-lang="${lang}" id="booking-form-root">
            ${languageSelectorHtml}
            <div class="flex items-center justify-center gap-4 mb-4">
                ${customizations.logo ? `<img src="${customizations.logo}" alt="Company Logo" class="max-h-12 w-auto" />` : ''}
                <h2 class="text-xl font-semibold text-slate-800 dark:text-white">${customizations.title}</h2>
            </div>
            
            ${bookingTypeButtonsHtml}

            <!-- Progress Bar -->
            ${layoutSettings.progress_bar_visibility !== 'hidden' ? `
            <div class="form-progress-bar">
                ${progressStepKeys.map((key, index) => `
                    <div class="progress-step" data-step-id="${index + 1}">
                        <div class="progress-circle">${index + 1}</div>
                        ${layoutSettings.step_titles_visibility !== 'hidden' ? `<p class="progress-label" data-translate="${key}"></p>` : ''}
                         ${index < 3 ? `<div class="progress-connector"></div>` : ''}
                    </div>
                `).join('')}
            </div>` : ''
            }

            <!-- Step 1: Trip Details -->
            <div data-step-content="1">
                ${enabledTypes.map(type => `
                    <div class="booking-type-fields" data-type-fields="${type}" ${type !== defaultBookingType ? 'style="display:none;"' : ''}>
                        ${type === 'flat_rate' ? `
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300" data-translate="select_a_route"></label>
                                <select name="route_id" class="mt-1 block w-full px-3 py-2 border-[0.5px] border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)] transition-colors">
                                    <option value="" data-translate="select_option"></option>
                                    ${(customizations.routes || []).map(r => `<option value="${r.id}">${r.route_name}</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}
                        ${generateFieldsForType(type)}
                    </div>
                `).join('')}
                <!-- Fare & Actions -->
                <div data-fare-container class="mt-6 pt-4" style="display:none;"></div>
                <div data-action-buttons-wrapper class="mt-2"></div>
                <div data-return-trip-section style="display:none;" class="mt-6 pt-6"></div>
            </div>

            <!-- Step 2: Vehicle Selection -->
            <div data-step-content="2" style="display:none;">
                <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-4 text-center" data-translate="choose_your_vehicle"></h3>
                <div class="relative group -mx-4 px-4">
                    <div data-vehicle-scroller class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 no-scrollbar scroll-smooth">${vehicleCards}</div>
                    <button type="button" data-action="scroll-vehicle" data-direction="left" class="scroll-button -left-3 hidden sm:group-hover:flex"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
                    <button type="button" data-action="scroll-vehicle" data-direction="right" class="scroll-button -right-3 hidden sm:group-hover:flex"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
                </div>
            </div>

            <!-- Step 3: Passenger Info -->
            <div data-step-content="3" style="display:none;">
                <div class="space-y-4">${formStructure.common.map(f => generateFieldHTML(f, lang, customizations, 'common' as any)).join('')}</div>
                <div class="mt-6">
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300" data-translate="payment_method"></label>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">${paymentButtonsHtml}</div>
                </div>
            </div>
            
            <!-- Step 4: Summary -->
            <div data-step-content="4" style="display:none;" data-summary-container></div>

            <!-- Confirmation Screen -->
             <div data-step-content="5" style="display:none;" class="text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 class="text-2xl font-bold text-slate-800 dark:text-white" data-translate="booking_submitted"></h2>
            </div>

            <!-- Validation Error -->
            <p data-validation-error class="text-red-500 text-sm mt-4 text-center" style="display:none;"></p>

            <!-- Navigation -->
            <div data-nav-container class="mt-6 flex items-center"></div>

            <!-- Footer: Accepted Payments -->
             ${visibility.payment_icons && paymentIconsHtml ? `
            <div class="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider" data-translate="accepted_payments"></p>
                <div class="flex justify-center items-center gap-3 flex-wrap">${paymentIconsHtml}</div>
            </div>` : ''
            }
        </div>
    `;
};

export const generateStaticHTML = (
    formStructure: FormStructure,
    customizations: CustomizationOptions,
    bookingType: BookingType | 'full',
    userId: string | undefined,
    isPreview: boolean = false,
    padding?: string
): string => {
    
    const bodyHtml = generateFullFormHTML(formStructure, customizations, bookingType);

    const layoutSettings = { ...DEFAULT_CUSTOMIZATIONS.layout_settings, ...(customizations.layout_settings || {}) };
    
    const css = `
        :root {
            --accent-color: ${customizations.color || '#f43f5e'};
            --accent-color-light: color-mix(in srgb, ${customizations.color || '#f43f5e'} 15%, transparent);
            --selection-color: #22c55e;
            --container-bg-light: ${layoutSettings.container_color || 'rgba(255,255,255,1)'};
            --container-bg-dark: ${layoutSettings.container_color_dark || 'rgba(30,41,59,1)'};
        }
        html {
            background-color: transparent; 
            border-radius: ${layoutSettings.container_border_radius ?? 8}px;
            overflow: hidden;
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
            background-color: var(--container-bg-light); 
            color: #333; 
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            ${layoutSettings.container_style === 'card_with_shadow' ? `
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            ` : `
                box-shadow: none;
            `}
        }
        .dark body { 
            background-color: var(--container-bg-dark); 
            color: #cbd5e1; 
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .form-container {
            background-color: transparent;
            padding: ${padding || '1.5rem'};
            border: none;
            box-shadow: none;
            box-sizing: border-box;
        }
        .dark .form-container {
            background-color: transparent;
        }
        .booking-type-button-container { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 8px; }
        .booking-type-button { display: flex; align-items: center; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; border-radius: 9999px; transition: all 0.2s; text-transform: capitalize; cursor: pointer; border: none; background-color: #fafbfc; color: black; flex-shrink: 0; }
        .booking-type-button svg { color: black; }
        .dark .booking-type-button { background-color: #1e293b; color: #e5e7eb; }
        .dark .booking-type-button svg { color: #e5e7eb; }
        .booking-type-button:hover:not(.active) { background-color: #f1f5f9; }
        .dark .booking-type-button:hover:not(.active) { background-color: #374151; }
        .booking-type-button.active { background-color: var(--accent-color); color: white; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1); }
        .booking-type-button.active svg { color: white; }
        .form-popover { display: none; position: absolute; z-index: 10; margin-top: 0.5rem; border-radius: 0.375rem; background-color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); ring: 1px solid rgba(0,0,0,0.05); border: 0.5px solid #e5e7eb; }
        .dark .form-popover { background-color: #1e293b; border-color: #374151;}
        .form-popover-item { display: block; width: 100%; text-align: left; padding: 0.5rem 1rem; font-size: 0.875rem; color: #374151; }
        .form-popover-item:hover { background-color: #f3f4f6; }
        .dark .form-popover-item { color: #d1d5db; }
        .dark .form-popover-item:hover { background-color: #374151; }
        .form-progress-bar { display: flex; align-items: flex-start; justify-content: center; margin-bottom: 2rem; }
        .progress-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
        .progress-step:last-child { flex: 0; }
        .progress-circle { width: 2rem; height: 2rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; transition: all 0.3s; font-weight: bold; background-color: #e5e7eb; color: #6b7280; }
        .dark .progress-circle { background-color: #374151; color: #9ca3af; }
        .progress-step.active .progress-circle { border: 2px solid var(--accent-color); color: var(--accent-color); background-color: white; }
        .dark .progress-step.active .progress-circle { background-color: #1f2937; }
        .progress-step.completed .progress-circle { background-color: var(--accent-color); color: white; }
        .progress-label { margin-top: 0.5rem; text-align: center; transition: all 0.3s; font-size: 0.75rem; color: #6b7280; }
        .dark .progress-label { color: #9ca3af; }
        .progress-step.active .progress-label { font-weight: bold; color: var(--accent-color); }
        .progress-step.completed .progress-label { font-weight: 500; color: #374151; }
        .dark .progress-step.completed .progress-label { color: #d1d5db; }
        .progress-connector { position: absolute; top: 1rem; left: 50%; width: 100%; height: 2px; transform: translateX(0); transition: background-color 0.5s; background-color: #e5e7eb; z-index: -1;}
        .dark .progress-connector { background-color: #374151; }
        .progress-connector.active { background-color: var(--accent-color); }
        .form-vehicle-card { cursor: pointer; flex-shrink: 0; scroll-snap-align: center; width: 16rem; border-radius: 0.75rem; border: 2px solid #e5e7eb; transition: all 0.2s; background-color: white; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .dark .form-vehicle-card { background-color: #1f293799; border-color: #374151; }
        .form-vehicle-card:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border-color: var(--accent-color); }
        .form-vehicle-card.selected { border-color: var(--selection-color); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
        .selected-indicator { position: absolute; top: 0.5rem; right: 0.5rem; width: 1.5rem; height: 1.5rem; border-radius: 9999px; background-color: var(--selection-color); display: flex; align-items: center; justify-content: center; z-index: 10; transform: scale(0); transition: transform 0.2s ease-out; }
        .form-vehicle-card.selected .selected-indicator { transform: scale(1); }
        .scroll-button { position: absolute; top: 50%; transform: translateY(-50%); width: 2rem; height: 2rem; background-color: white; border-radius: 9999px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; color: #4b5563; transition: opacity 0.2s; z-index: 5; }
        .dark .scroll-button { background-color: #1f2937; color: #d1d5db; border: 1px solid #374151; }
        .scroll-button:disabled { opacity: 0.3; cursor: not-allowed; }
        .payment-method-button { display: flex; align-items: center; padding: 0.75rem; border-radius: 0.5rem; border: 2px solid #d1d5db; transition: all 0.2s; background-color: white; width: 100%; }
        .dark .payment-method-button { border-color: #374151; background-color: #1f293799; }
        .payment-method-button:hover { border-color: #9ca3af; }
        .dark .payment-method-button:hover { border-color: #6b7280; }
        .payment-method-button.selected { border-color: var(--accent-color); background-color: var(--accent-color-light); }
        .dark .payment-method-button.selected { background-color: color-mix(in srgb, var(--accent-color) 10%, #1f2937); }
        .summary-section { margin-bottom: 1.5rem; }
        .summary-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .summary-content { background-color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
        .dark .summary-content { background-color: #1f2937; }
        .summary-item { display: flex; justify-content: space-between; align-items: flex-start; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-close-button { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem; border-radius: 9999px; line-height: 1; }
        .form-stepper-button { width: 1.75rem; height: 1.75rem; display: flex; align-items: center; justify-content: center; border-radius: 0.375rem; border: 1px solid #d1d5db; background-color: white; }
        .dark .form-stepper-button { border-color: #4b5563; background-color: #374151; }
        .form-stepper-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .active-secondary-button { background-color: var(--accent-color) !important; color: white !important; }
        .custom-datetime-picker { position: relative; }
        .datetime-display-wrapper { margin-top: 0.25rem; display: flex; width: 100%; align-items: stretch; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .datetime-date-button, .datetime-time-button { position: relative; flex: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.75rem; transition: all 0.2s; background-color: white; border: 1px solid #d1d5db; }
        .dark .datetime-date-button, .dark .datetime-time-button { background-color: #1f2937; border-color: #374151; }
        .datetime-date-button { border-radius: 1rem 0 0 1rem; }
        .datetime-time-button { border-radius: 0 1rem 1rem 0; margin-left: -1px; }
        .datetime-date-button:focus, .datetime-time-button:focus { outline: none; }
        .datetime-date-button.active, .datetime-time-button.active { z-index: 1; border-color: var(--accent-color); box-shadow: 0 0 0 2px var(--accent-color); }
        .datetime-time-button.active { margin-left: -1px; }
        .datetime-popover { width: 18rem; padding: 1rem; }
        .datetime-popover-time { width: 12rem; }
        .datetime-calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .datetime-calendar-header button { padding: 0.25rem; border-radius: 9999px; }
        .datetime-calendar-header button:hover { background-color: #f3f4f6; }
        .dark .datetime-calendar-header button:hover { background-color: #374151; }
        .datetime-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; }
        .datetime-calendar-day { width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; border-radius: 9999px; font-size: 0.875rem; transition: background-color 0.2s; }
        .datetime-calendar-day:not(:disabled):hover { background-color: #f3f4f6; }
        .dark .datetime-calendar-day:not(:disabled):hover { background-color: #374151; }
        .datetime-calendar-day.selected { background-color: var(--accent-color); color: white; }
        .datetime-calendar-day.today:not(.selected) { background-color: #e5e7eb; }
        .dark .datetime-calendar-day.today:not(.selected) { background-color: #374151; }
        .datetime-calendar-day:disabled { color: #9ca3af; cursor: not-allowed; }
        .dark .datetime-calendar-day:disabled { color: #4b5563; }
        .timepicker-item { display: block; width: 100%; text-align: left; padding: 0.5rem 1rem; font-size: 0.875rem; }
        .timepicker-item:hover { background-color: #f3f4f6; }
        .dark .timepicker-item:hover { background-color: #374151; }
        .timepicker-item.selected { background-color: var(--accent-color-light); color: var(--accent-color); font-weight: 600; }
        .timepicker-item:disabled { color: #9ca3af; cursor: not-allowed; background-color: transparent; }
        .dark .timepicker-item:disabled { color: #4b5563; }
        .form-clear-button { display: flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 9999px; color: #9ca3af; font-size: 1.25rem; line-height: 1; cursor: pointer; transition: all 0.2s; }
        .form-clear-button:hover { color: #374151; background-color: #e5e7eb; }
        .dark .form-clear-button:hover { color: #e5e7eb; background-color: #374151; }
        .geocoder-container .mapboxgl-ctrl-geocoder { width: 100%; max-width: 100%; font-size: 1rem; line-height: 1.5; border-radius: 1rem; border: 0.5px solid #d1d5db; box-shadow: none; background-color: white; }
        .dark .geocoder-container .mapboxgl-ctrl-geocoder { border-color: #374151; background-color: #1e293b; }
        .geocoder-container .mapboxgl-ctrl-geocoder--input { color: #0f172a; padding: 0.5rem 2.5rem; height: 3rem; }
        .dark .geocoder-container .mapboxgl-ctrl-geocoder--input { color: #e2e8f0; }
        .dark .geocoder-container .mapboxgl-ctrl-geocoder--input::placeholder { color: #64748b; }
        .geocoder-container .mapboxgl-ctrl-geocoder--icon-search { top: 14px; left: 12px; }
        .geocoder-container .mapboxgl-ctrl-geocoder--button { top: 14px; right: 10px; }
        .geocoder-container .mapboxgl-ctrl-geocoder--suggestion-list { background: white; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
        .dark .geocoder-container .mapboxgl-ctrl-geocoder--suggestion-list { background: #1f2937; }
        .dark .geocoder-container .mapboxgl-ctrl-geocoder--suggestion { color: #d1d5db; }
        .dark .geocoder-container .mapboxgl-ctrl-geocoder--suggestion:hover { background-color: #374151; }
        .geocoder-container .mapboxgl-ctrl-geocoder.mapboxgl-ctrl-geocoder--focused .mapboxgl-ctrl-geocoder--input { box-shadow: none !important; }
        .geocoder-container .mapboxgl-ctrl-geocoder--input:focus { outline: none !important; }
        .collapsible-options { border-radius: 1rem; border: 1px solid #e5e7eb; background-color: #f1f5f9; transition: all 0.2s ease-out; }
        .dark .collapsible-options { border-color: #374151; background-color: #374151; }
        .collapsible-options button[data-action='toggle-advanced-options'] { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0.75rem 1rem; font-weight: 600; }
        .collapsible-options svg.chevron { transition: transform 0.2s; }
        .collapsible-options.open { border-color: var(--accent-color); }
        .collapsible-options.open svg.chevron { transform: rotate(180deg); }
        .collapsible-content { display: none; }
        .collapsible-options.open .collapsible-content { display: block; border-top: 1px solid #e5e7eb; }
        .dark .collapsible-options.open .collapsible-content { border-color: #4b5563; }
        @media (max-width: 640px) {
            .form-popover {
                left: 1rem !important;
                right: 1rem !important;
                width: auto !important;
                max-width: none !important;
                transform: translateX(0) !important;
            }
        }
    `;

    const javascript = `
    (function() {
        const root = document.getElementById('booking-form-root');
        if (!root) return;

        const IS_PREVIEW = ${isPreview};
        const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoia2hpemFyZG9nYXIiLCJhIjoiY21ld2ZhYWxkMDJqdjJpc2J5bTAxZWp5YSJ9.95ik-OG9i2bDA8QLys0GhQ';
        mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

        const SUPABASE_URL = 'https://usakivpjjvvzwobbwcbz.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYWtpdnBqanZ2endvYmJ3Y2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTAwNzMsImV4cCI6MjA2ODE2NjA3M30.HINUSbqgDg69Hma-6JH2AY34XdqkUDqxJj48vRCPO3I';
        const UID = '${userId || ''}';
        
        const translations = ${JSON.stringify(TRANSLATIONS)};
        const customizations = ${JSON.stringify(customizations)};
        const formStructure = ${JSON.stringify(formStructure)};
        const languageFlags = ${JSON.stringify(LANGUAGE_FLAG_SVGS)};
        const defaultPricing = { base_fare: 2.5, cost_per_km: 1.5, cost_per_min: 0.25, cost_per_hour: 50, surge_multiplier: 1 };
        const pricing = { ...defaultPricing, ...(customizations.pricing || {}) };
        const routes = customizations.routes || [];
        const vehicles = customizations.vehicles || [];
        const layoutSettings = { ...${JSON.stringify(DEFAULT_CUSTOMIZATIONS.layout_settings)}, ...(customizations.layout_settings || {}) };
        const extraOptions = ${JSON.stringify(customizations.extraOptions || [])};
        const paymentCategories = { 
            credit_card: { label: 'Credit Card', icons: ['visa', 'mastercard', 'amex', 'stripe', 'googlepay', 'applepay'] }, 
            paypal: { label: 'PayPal', icons: ['paypal'] }, 
            cash: { label: 'Cash', icons: ['cash'] } 
        };
        
        const enabledPaymentMethods = Object.keys(paymentCategories).filter(key => 
            (customizations.paymentIcons || []).some(icon => paymentCategories[key].icons.includes(icon))
        );
        const defaultPaymentMethod = enabledPaymentMethods.includes('cash') ? 'cash' : (enabledPaymentMethods[0] || 'cash');

        let state = {
            currentStep: 1,
            bookingType: root.dataset.bookingType,
            lang: root.dataset.lang,
            formData: { waypoints: {}, return_waypoints: {}, isRoundTrip: false, selectedExtras: {}, payment_method: defaultPaymentMethod },
            validationError: '',
            activePopover: null,
            selectedVehicle: vehicles.length > 0 ? vehicles[0].id : null,
            selectedPaymentMethod: defaultPaymentMethod,
            calculatedFare: null
        };
        let isSubmitting = false;
        
        const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
        const T = (key, defaultText = '') => {
            if (!key) return defaultText;
            const tKey = key.toLowerCase().replace(/\\s/g, '_').replace(/\\//g, '_');
            const set = translations[tKey];
            const fallback = defaultText || formatLabel(key);
            return (set && set[state.lang]) || (set && set['en']) || fallback;
        };


        const simpleHash = (str) => {
            if(!str) return 0;
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        };

        const setupGeocoder = (containerId, uniqueFieldIdentifier, placeholder) => {
            const container = document.getElementById(containerId);
            if (!container || container.querySelector('.mapboxgl-ctrl-geocoder')) return; 

            const geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                placeholder: placeholder,
                countries: 'PK,US,GB,CA,AE',
                proximity: 'ip',
                flyTo: false,
            });

            container.innerHTML = '';
            container.appendChild(geocoder.onAdd(null));

            geocoder.on('result', (e) => {
                const address = e.result.place_name;
                const hiddenInput = document.getElementById(\`field-\${uniqueFieldIdentifier}\`);
                if (hiddenInput) {
                    hiddenInput.value = address;
                    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            geocoder.on('clear', () => {
                const hiddenInput = document.getElementById(\`field-\${uniqueFieldIdentifier}\`);
                if (hiddenInput) {
                    hiddenInput.value = '';
                    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            return geocoder;
        };

        const initializeGeocodersForType = (type) => {
            const geocoderFields = (formStructure[type] || []).filter(field => 
                ['pickup_location', 'dropoff_location'].includes(field.key)
            );

            const typeFieldsContainer = root.querySelector(\`[data-type-fields="\${type}"]\`);
            if (!typeFieldsContainer) return;

            geocoderFields.forEach(field => {
                const containerId = \`geocoder-container-\${field.id}\`;
                const container = typeFieldsContainer.querySelector(\`#\${containerId}\`);
                
                if (container && !container.querySelector('.mapboxgl-ctrl-geocoder')) {
                    const placeholder = T(\`placeholder_\${field.key}\`, field.placeholder || '');
                    setupGeocoder(containerId, field.id, placeholder);
                }
            });
        };

        const renderWaypoints = () => {
            const container = root.querySelector(\`[data-type-fields="\${state.bookingType}"] [data-waypoint-container]\`);
            if (!container) return;
            const waypoints = state.formData.waypoints[state.bookingType] || [];
            container.innerHTML = waypoints.map((wp, index) => {
                const fieldKey = \`waypoint_\${index}\`;
                const uniqueId = \`waypoint_\${state.bookingType}_\${index}\`;
                return \`
                <div class="relative mb-4">
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">\${T('waypoint', 'Waypoint')} #\${index + 1}</label>
                    <div id="geocoder-container-\${uniqueId}" class="geocoder-container"></div>
                    <input type="hidden" name="\${fieldKey}" id="field-\${uniqueId}" value="\${wp || ''}" />
                    <button type="button" data-action="remove-waypoint" data-index="\${index}" class="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-red-500 z-10">
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
                \`
            }).join('');
            
            waypoints.forEach((_, index) => {
                const uniqueId = \`waypoint_\${state.bookingType}_\${index}\`;
                setupGeocoder(\`geocoder-container-\${uniqueId}\`, uniqueId, T('enter_stop_location', 'Enter a stop location'));
            });
        };
        
        const calculateFare = () => {
            let baseFare = null;
            switch (state.bookingType) {
                case 'distance':
                case 'on_demand':
                    const pickup = state.formData['pickup_location'] || '';
                    const dropoff = state.formData['dropoff_location'] || '';
                    if (pickup && dropoff) {
                        const mockDistance = 5 + (simpleHash(pickup + dropoff) % 50);
                        const mockDuration = 10 + (simpleHash(pickup + dropoff) % 90);
                        baseFare = (pricing.base_fare || 0) + (mockDistance * (pricing.cost_per_km || 0)) + (mockDuration * (pricing.cost_per_min || 0));
                    }
                    break;
                case 'hourly':
                    const hours = parseFloat(state.formData['rental_hours']);
                    if (!isNaN(hours) && hours > 0) baseFare = (pricing.cost_per_hour || 0) * hours;
                    break;
                case 'flat_rate':
                    const route = routes.find(r => String(r.id) === String(state.formData['route_id']));
                    if (route) baseFare = route.fixed_price;
                    break;
            }
            if (baseFare === null) return null;
            let finalFare = baseFare;
            if (state.formData.isRoundTrip && state.bookingType !== 'hourly') finalFare *= 2;
            const extrasPrice = Object.entries(state.formData.selectedExtras || {}).reduce((total, [name, qty]) => {
                const option = (extraOptions || []).find(opt => opt.name === name);
                return total + ((option?.price || 0) * qty);
            }, 0);
            return finalFare + extrasPrice;
        };

        const updateFareDisplay = () => {
            const fareContainer = root.querySelector('[data-fare-container]');
            if (!fareContainer) return;
            const fare = calculateFare();
            state.calculatedFare = fare;
        
            if (fare !== null) {
                fareContainer.style.display = 'block';
                fareContainer.innerHTML = \`
                    <div class="flex justify-between items-center text-lg font-bold">
                        <span class="text-slate-800 dark:text-white">\${T('total_fare', 'Total Fare')}</span>
                        <span style="color: \${customizations.color}">\$\${fare.toFixed(2)}</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 text-right mt-1">\${T('fare_is_estimate', '*This is an estimated fare and may vary.')}</p>
                \`;
            } else {
                fareContainer.innerHTML = '';
                fareContainer.style.display = 'none';
            }
        };
        
        const renderActionButtonsAndReturnTrip = () => {
            const wrapper = root.querySelector('[data-action-buttons-wrapper]');
            if (!wrapper) return;

            const visibility = layoutSettings.components_visibility;
            const baseButtonClasses = 'flex items-center justify-center gap-2 w-full py-2 px-3 text-sm font-semibold rounded-full transition-colors';
            const secondaryButtonClasses = \`\${baseButtonClasses} bg-[#fafbfc] text-black dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/50\`;

            const notesContentHtml = (customizations.hourlyNotes && Object.values(customizations.hourlyNotes).some(v => v)) ? Object.entries(customizations.hourlyNotes).filter(([_,v]) => v).map(([key, value]) => \`
                <li><span class="font-semibold">\${T(key, key.replace(/_/g, ' '))}</span>: \${value}</li>
            \`).join('') : \`<p class="text-sm text-slate-500 dark:text-slate-400">No notes available.</p>\`;

            const notesButtonOnlyHtml = visibility.notes_button ? \`
                <div class="flex-1">
                    <button type="button" data-action="toggle-popover" data-popover="notes" class="\${secondaryButtonClasses}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span data-translate="notes">Note</span>
                    </button>
                </div>
            \` : '';

            const notesPopoverHtml = visibility.notes_button ? \`
                <div data-popover-content="notes" class="form-popover left-0 right-0 w-full" style="display:none;">
                     <div class="relative p-4">
                        <button data-action="close-popover" class="form-close-button">&times;</button>
                        <h4 class="font-bold text-md text-slate-800 dark:text-white mb-2" data-translate="hourly_booking_notes_title"></h4>
                        <ul class="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300">\${notesContentHtml}</ul>
                    </div>
                </div>
            \` : '';

            const extrasButtonOnlyHtml = visibility.extra_options_button ? \`
                <div class="flex-1">
                    <button type="button" data-action="toggle-popover" data-popover="extras" class="\${secondaryButtonClasses}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                        <span data-translate="extra_options"></span>
                    </button>
                </div>
            \` : '';
            
            const extrasPopoverHtml = visibility.extra_options_button ? \`
                <div data-popover-content="extras" class="form-popover left-0 right-0 w-full" style="display:none;">
                     <div class="relative p-4">
                        <button data-action="close-popover" class="form-close-button">&times;</button>
                        <h4 class="font-bold text-md text-slate-800 dark:text-white mb-3" data-translate="extra_options"></h4>
                        <ul data-extras-content class="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-2">
                            \${extraOptions.length > 0 ? extraOptions.map(option => \`
                                <li class="flex items-center justify-between" data-option-name="\${option.name}">
                                    <div>
                                        <label class="text-sm text-slate-700 dark:text-slate-300">\${option.name}</label>
                                        <p class="text-xs text-slate-500 dark:text-slate-400">$ \${option.price.toFixed(2)}</p>
                                    </div>
                                    <div class="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                                        <button type="button" data-action="decrease-extra" class="form-stepper-button">&minus;</button>
                                        <span class="font-semibold w-6 text-center text-sm" data-extra-quantity>0</span>
                                        <button type="button" data-action="increase-extra" class="form-stepper-button">+</button>
                                    </div>
                                </li>
                            \`).join('') : \`<p class="text-sm text-slate-500 dark:text-slate-400">No extra options available.</p>\`}
                        </ul>
                    </div>
                </div>
            \` : '';
            
            const roundTripButtonHtml = visibility.round_trip_button ? \`
                 <div class="flex-1">
                    <button type="button" data-action="toggle-round-trip" class="\${secondaryButtonClasses} \${state.formData.isRoundTrip ? 'active-secondary-button' : ''}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">${ICONS.RoundTrip}</svg>
                        <span data-translate="round_trip"></span>
                    </button>
                </div>
            \` : '';
            
            let innerButtonsContent = '';
            if (state.bookingType === 'hourly') {
                innerButtonsContent = \`\${notesButtonOnlyHtml}\${extrasButtonOnlyHtml}\`;
            } else {
                if (visibility.round_trip_button) innerButtonsContent += roundTripButtonHtml;
                if (visibility.extra_options_button) innerButtonsContent += extrasButtonOnlyHtml;
            }

            let popoversContent = '';
            if (state.bookingType === 'hourly') {
                popoversContent = \`\${notesPopoverHtml}\${extrasPopoverHtml}\`;
            } else {
                if (visibility.extra_options_button) popoversContent += extrasPopoverHtml;
            }

            if (innerButtonsContent) {
                wrapper.innerHTML = \`
                <div class="collapsible-options mt-2">
                    <button type="button" data-action="toggle-advanced-options" class="text-slate-800 dark:text-slate-200">
                        <span data-translate="advanced_options"></span>
                        <svg class="w-5 h-5 chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="collapsible-content relative">
                        <div class="p-4">
                            <div class="flex gap-2">\${innerButtonsContent}</div>
                        </div>
                        \${popoversContent}
                    </div>
                </div>
                \`;
            } else {
                wrapper.innerHTML = '';
            }
            
            const returnTripSection = root.querySelector('[data-return-trip-section]');
            if (returnTripSection) {
                returnTripSection.style.display = state.formData.isRoundTrip && state.bookingType !== 'hourly' ? 'block' : 'none';
                if (state.formData.isRoundTrip && state.bookingType !== 'hourly') {
                    const returnWaypoints = state.formData.return_waypoints[state.bookingType] || [];
                    const returnWaypointInputsHtml = returnWaypoints.map((wp, index) => {
                        const fieldKey = \`return_waypoint_\${index}\`;
                        const uniqueId = \`return_waypoint_\${state.bookingType}_\${index}\`;
                        return \`
                        <div class="relative mb-4">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">\${T('waypoint', 'Waypoint')}</label>
                            <div id="geocoder-container-\${uniqueId}" class="geocoder-container"></div>
                            <input type="hidden" name="\${fieldKey}" id="field-\${uniqueId}" value="\${wp || ''}" />
                            <button type="button" data-action="remove-return-waypoint" data-index="\${index}" class="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-red-500 z-10">
                                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>
                        \`
                    }).join('');

                    const addReturnWaypointBtnHtml = visibility.add_waypoint_button ? \`
                        <div class="my-2 flex justify-end">
                            <button type="button" data-action="add-return-waypoint" class="group" title="\${T('add_waypoint', 'Add Waypoint')}">
                                <div class="bg-slate-200 dark:bg-slate-700 rounded-full p-1.5 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </div>
                            </button>
                        </div>
                    \` : '';
                    
                    const returnDropoffUniqueId = \`return_dropoff_\${state.bookingType}\`;

                    returnTripSection.innerHTML = \`
                        <h4 class="text-md font-semibold text-slate-800 dark:text-white mb-4" data-translate="return_trip"></h4>
                        \${returnWaypointInputsHtml}
                        \${addReturnWaypointBtnHtml}
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300" data-translate="dropoff_location"></label>
                            <div id="geocoder-container-\${returnDropoffUniqueId}" class="geocoder-container"></div>
                            <input type="hidden" name="return_dropoff" id="field-\${returnDropoffUniqueId}" value="\${state.formData.return_dropoff || ''}" />
                        </div>
                    \`;
                    
                    returnWaypoints.forEach((_, index) => {
                        const uniqueId = \`return_waypoint_\${state.bookingType}_\${index}\`;
                        setupGeocoder(\`geocoder-container-\${uniqueId}\`, uniqueId, T('enter_stop_location', 'Enter a stop location'));
                    });
                    setupGeocoder(\`geocoder-container-\${returnDropoffUniqueId}\`, returnDropoffUniqueId, T('enter_final_destination', 'Enter final destination'));
                }
            }
             wrapper.querySelectorAll('[data-translate]').forEach(el => {
                el.textContent = T(el.dataset.translate, el.textContent);
            });
            returnTripSection?.querySelectorAll('[data-translate]').forEach(el => {
                el.textContent = T(el.dataset.translate, el.textContent);
            });
        };

        const renderSummary = () => {
            const summaryContainer = root.querySelector('[data-summary-container]');
            if (!summaryContainer) return;

            const SummarySection = (titleKey, editStep, content) => \`
                <div class="summary-section">
                    <div class="summary-title">
                        <h4 class="text-md font-semibold text-slate-800 dark:text-white">\${T(titleKey)}</h4>
                        <button type="button" data-action="edit-step" data-step="\${editStep}" class="text-slate-500 hover:text-[var(--accent-color)] p-1 rounded-full flex items-center gap-1 text-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                            <span>\${T('edit', 'Edit')}</span>
                        </button>
                    </div>
                    <div class="summary-content space-y-2">\${content}</div>
                </div>
            \`;

            const SummaryItem = (label, value) => \`
                <div class="summary-item">
                    <span class="text-slate-600 dark:text-slate-400 whitespace-nowrap mr-2">\${label}:</span>
                    <span class="font-medium text-slate-800 dark:text-slate-200 text-right">\${value}</span>
                </div>
            \`;

            // Trip Details
            let tripContent = (formStructure[state.bookingType] || [])
                .filter(field => state.formData[field.key])
                .map(field => SummaryItem(T(field.key, field.label), state.formData[field.key]))
                .join('');
            if (state.formData.waypoints && state.formData.waypoints[state.bookingType] && state.formData.waypoints[state.bookingType].length > 0) {
                tripContent += SummaryItem(T('waypoints'), \`<ul class="list-disc list-inside text-right">\${state.formData.waypoints[state.bookingType].map(wp => \`<li>\${wp}</li>\`).join('')}</ul>\`);
            }
            if (state.formData.isRoundTrip) {
                tripContent += SummaryItem(T('return_pickup'), state.formData['dropoff_location']);
                if (state.formData.return_waypoints && state.formData.return_waypoints[state.bookingType] && state.formData.return_waypoints[state.bookingType].length > 0) {
                    tripContent += SummaryItem(T('return_waypoints'), \`<ul class="list-disc list-inside text-right">\${state.formData.return_waypoints[state.bookingType].map(wp => \`<li>\${wp}</li>\`).join('')}</ul>\`);
                }
                tripContent += SummaryItem(T('return_dropoff'), state.formData['return_dropoff']);
            }

            // Vehicle Details
            const vehicle = vehicles.find(v => String(v.id) === String(state.selectedVehicle));
            const vehicleContent = vehicle ? SummaryItem(vehicle.name, vehicle.model) : '';

            // Passenger Details
            let passengerContent = formStructure.common.filter(f => state.formData[f.key]).map(f => SummaryItem(T(f.key, f.label), state.formData[f.key])).join('');
            const selectedExtrasList = Object.keys(state.formData.selectedExtras || {});
            if (selectedExtrasList.length > 0) {
                 passengerContent += SummaryItem(T('extra_options'), \`<ul class="list-disc list-inside text-right">\${selectedExtrasList.map(name => {
                    const qty = state.formData.selectedExtras[name];
                    const option = (extraOptions || []).find(opt => opt.name === name);
                    const price = (option?.price || 0) * qty;
                    return \`<li>\${qty}x \${name} (+\$\${price.toFixed(2)})</li>\`
                 }).join('')}</ul>\`);
            }
            if (state.formData.payment_method) {
                passengerContent += SummaryItem(T('payment_method'), T(state.formData.payment_method, paymentCategories[state.formData.payment_method]?.label));
            }

            summaryContainer.innerHTML = \`
                \${SummarySection('trip_details', 1, tripContent)}
                \${SummarySection('your_vehicle', 2, vehicleContent)}
                \${SummarySection('passenger_contact_info', 3, passengerContent)}
                
                <div class="mb-6">
                    <h4 class="text-md font-semibold text-slate-800 dark:text-white mb-3">\${T('promo_code', 'Promo Code')}</h4>
                    <div class="flex gap-2">
                        <input id="promo-code-input" type="text" placeholder="\${T('enter_promo_code')}" class="mt-1 block w-full px-3 py-2 border-[0.5px] border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800" />
                        <button type="button" data-action="apply-promo" class="px-4 py-2 mt-1 text-sm font-semibold rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">\${T('apply')}</button>
                    </div>
                </div>

                \${state.calculatedFare !== null ? \`
                <div class="mt-6 pt-4">
                    <div class="flex justify-between items-center text-xl font-bold">
                        <span>\${T('total_fare')}</span>
                        <span style="color: \${customizations.color}">$\${state.calculatedFare.toFixed(2)}</span>
                    </div>
                </div>
                \` : ''}
            \`;
        };
        
        const isStep1Valid = () => {
            const currentFieldsContainer = root.querySelector(\`[data-type-fields="\${state.bookingType}"]\`);
            if (!currentFieldsContainer) return false;

            const requiredFields = (formStructure[state.bookingType] || []).filter(f => f.required);
            
            return requiredFields.every(field => {
                const inputElement = currentFieldsContainer.querySelector(\`[name="\${field.key}"]\`);
                if (!inputElement) {
                    console.warn(\`isStep1Valid: Could not find required field with name: \${field.key}\`);
                    return false;
                }
                return inputElement.value && String(inputElement.value).trim() !== '';
            });
        };

        const validateStep = (stepToValidate) => {
            let requiredFields = [];
            if (stepToValidate === 1) {
                requiredFields = (formStructure[state.bookingType] || []).filter(f => f.required);
            } else if (stepToValidate === 2) {
                if (!state.selectedVehicle) {
                    state.validationError = T('please_select_vehicle', 'Please select a vehicle to continue.');
                    return false;
                }
            } else if (stepToValidate === 3) {
                requiredFields = formStructure.common.filter(f => f.required);
            }
            
            for (const field of requiredFields) {
                const fieldKey = field.key;
                if (!state.formData[fieldKey] || String(state.formData[fieldKey]).trim() === '') {
                    state.validationError = T('fill_required_fields', 'Please fill out all required fields.');
                    return false;
                }
            }
            state.validationError = '';
            return true;
        };

        const handleSubmit = async () => {
            if (isSubmitting) return;

            if (IS_PREVIEW) {
                if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
                    updateUI();
                    return;
                }
                state.currentStep = 5; // Confirmation step
                updateUI();
                const confirmationContent = root.querySelector('[data-step-content="5"]');
                if (confirmationContent && !confirmationContent.querySelector('.preview-notice')) {
                    const notice = document.createElement('p');
                    notice.className = 'preview-notice text-sm text-slate-500 mt-4';
                    notice.textContent = 'This is a preview. No booking was created.';
                    confirmationContent.appendChild(notice);
                }
                return;
            }

            if (!UID) return;
            if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
                updateUI();
                return;
            };

            isSubmitting = true;
            updateUI(); 

            try {
                const { createClient } = supabase;
                const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const rpcArgs = {
                    uid_param: UID,
                    customer: state.formData.full_name,
                    driver: 'Unassigned',
                    pickup: state.formData.pickup_location,
                    dropoff: state.formData.dropoff_location,
                    status: 'Scheduled',
                    amount: String(state.calculatedFare?.toFixed(2) || '0.00'),
                    form_data_param: { ...state.formData, promo_code: root.querySelector('#promo-code-input')?.value || '' },
                    booking_type: state.bookingType,
                    rental_hours: state.formData.rental_hours ? parseFloat(state.formData.rental_hours) : null,
                };
                
                const { data: newBookingId, error: bookingError } = await supabaseClient
                    .rpc('create_public_booking', rpcArgs);

                if (bookingError) throw bookingError;

                if (newBookingId) {
                    // Asynchronously trigger the confirmation email. We don't need to wait for it.
                    supabaseClient.functions.invoke('send-booking-confirmation', {
                        body: { bookingId: newBookingId, uid: UID }
                    }).catch(err => console.error('Failed to send booking confirmation email:', err));
                }

                const mainButton = root.querySelector('[data-action="submit"]');

                if (state.selectedPaymentMethod === 'credit_card') {
                    if(mainButton) mainButton.textContent = 'Redirecting to Payment...';
                    const { data, error } = await supabaseClient.functions.invoke('create-stripe-checkout', {
                        body: JSON.stringify({
                            uid: UID,
                            amount: state.calculatedFare,
                            bookingId: newBookingId,
                            customerEmail: state.formData.email,
                        }),
                    });
                    if (error) throw error;
                    if (data.error) throw new Error(data.error);
                    if (data.sessionUrl) window.top.location.href = data.sessionUrl;
                    return;
                }
                
                if (state.selectedPaymentMethod === 'paypal') {
                    if(mainButton) mainButton.textContent = 'Redirecting to PayPal...';
                     const { data, error } = await supabaseClient.functions.invoke('create-paypal-order', {
                        body: {
                            uid: UID,
                            amount: state.calculatedFare,
                            bookingId: newBookingId,
                        }
                    });
                    if (error) throw error;
                    if (data.error) throw new Error(data.error);
                    if (data.approvalUrl) {
                        window.top.location.href = data.approvalUrl;
                    } else {
                        throw new Error('Could not retrieve PayPal payment link.');
                    }
                    return;
                }
                
                // For cash payments, just show confirmation
                state.currentStep = 5;
                updateUI();

            } catch (error) {
                state.validationError = error.message;
                console.error('Booking submission error:', error);
                const mainButton = root.querySelector('[data-action="submit"]');
                if (mainButton) mainButton.textContent = 'Try Again';
                isSubmitting = false;
                updateUI();
            }
        };

        const updateUI = () => {
            root.querySelectorAll('[data-step-content]').forEach(el => {
                el.style.display = el.dataset.stepContent == state.currentStep ? 'block' : 'none';
            });
            
            if (state.currentStep === 4) {
                renderSummary();
            }

            root.querySelectorAll('.progress-step').forEach((stepEl, i) => {
                const stepNum = i + 1;
                stepEl.classList.toggle('active', stepNum === state.currentStep);
                stepEl.classList.toggle('completed', stepNum < state.currentStep);
                const circle = stepEl.querySelector('.progress-circle');
                if(stepNum < state.currentStep) circle.innerHTML = '✓'; else circle.innerHTML = stepNum;
                if (i < 3) {
                    const connector = stepEl.querySelector('.progress-connector');
                    if(connector) connector.classList.toggle('active', stepNum < state.currentStep);
                }
            });

            const navContainer = root.querySelector('[data-nav-container]');
            const mainButtonClasses = layoutSettings.button_style === 'filled_rounded' ? 'w-full sm:w-auto px-8 py-3 text-white font-bold rounded-lg hover:opacity-90' : 'w-full sm:w-auto px-8 py-3 font-bold rounded-md border-2 border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_15%,transparent)]';
            const backButtonClasses = layoutSettings.button_style === 'filled_rounded' ? 'px-6 py-2 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' : 'px-6 py-2 text-sm font-semibold rounded-md border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';
            
            if (state.currentStep < 4) {
                const isNextDisabled = (state.currentStep === 1 && !isStep1Valid()) || isSubmitting;
                const mainButton = \`<button type="button" data-action="next" class="\${mainButtonClasses}" \${isNextDisabled ? 'disabled' : ''} style="background-color: \${layoutSettings.button_style === 'filled_rounded' ? customizations.color : 'transparent'};">\${T('next_button', 'Next')}</button>\`;
                const backButton = state.currentStep > 1 ? \`<button type="button" data-action="back" class="\${backButtonClasses}">\${T('back_button', 'Back')}</button>\` : '<div></div>';
                navContainer.innerHTML = (layoutSettings.button_position === 'right') ? \`\${backButton}\${mainButton}\` : \`\${mainButton}\${backButton}\`;
            } else if (state.currentStep === 4) {
                 const backButton = \`<button type="button" data-action="back" class="\${backButtonClasses}">\${T('back_button', 'Back')}</button>\`;
                 let mainActionHtml = '';
                 const buttonText = state.selectedPaymentMethod === 'cash' ? T('confirm_booking', 'Confirm Booking') : T('make_payment', 'Make Payment');
                 mainActionHtml = \`<button type="button" data-action="submit" class="\${mainButtonClasses}" style="background-color: \${layoutSettings.button_style === 'filled_rounded' ? customizations.color : 'transparent'};" \${isSubmitting ? 'disabled' : ''}>\${isSubmitting ? T('submitting', 'Submitting...') : buttonText}</button>\`;
                 navContainer.innerHTML = (layoutSettings.button_position === 'right') ? \`\${backButton}\${mainActionHtml}\` : \`\${mainActionHtml}\${backButton}\`;
            } else {
                 navContainer.innerHTML = '';
            }
            
            navContainer.className = \`mt-6 flex items-center \${{left: "justify-start space-x-2", right: "justify-end space-x-2 flex-row-reverse", space_between: "justify-between"}[layoutSettings.button_position || 'right']}\`;
            
            document.querySelectorAll('[data-translate]').forEach(el => {
                const defaultText = el.dataset.translate.replace(/_/g, ' ');
                el.textContent = T(el.dataset.translate, defaultText);
            });
            const langFlag = document.querySelector('[data-language-flag]');
            if(langFlag) langFlag.innerHTML = \`<svg viewBox="0 0 21 15" width="21" height="15" class="rounded-sm shadow-sm block">\${languageFlags[state.lang] || ''}</svg>\`;

            const validationEl = root.querySelector('[data-validation-error]');
            validationEl.textContent = state.validationError;
            validationEl.style.display = state.validationError ? 'block' : 'none';

            if (state.currentStep === 1) {
                renderWaypoints();
                updateFareDisplay();
                renderActionButtonsAndReturnTrip();
            }
        };

        const handleAction = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            e.preventDefault();
            const action = target.dataset.action;

            switch (action) {
                case 'scroll-booking-type': {
                    const scroller = root.querySelector('[data-booking-type-scroller]');
                    if (scroller) {
                        const scrollAmount = scroller.clientWidth * 0.8;
                        scroller.scrollBy({ left: target.dataset.direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
                    }
                    break;
                }
                case 'scroll-vehicle': {
                    const scroller = root.querySelector('[data-vehicle-scroller]');
                    if (scroller) {
                        const scrollAmount = scroller.clientWidth * 0.8;
                        scroller.scrollBy({ left: target.dataset.direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
                    }
                    break;
                }
                case 'toggle-advanced-options':
                    const container = target.closest('.collapsible-options');
                    if (container) {
                        container.classList.toggle('open');
                    }
                    break;
                case 'edit-step':
                    const step = parseInt(target.dataset.step, 10);
                    if (!isNaN(step)) {
                        state.currentStep = step;
                        updateUI();
                    }
                    break;
                case 'submit':
                    handleSubmit();
                    break;
                case 'select-payment':
                    const method = target.dataset.paymentMethod;
                    state.selectedPaymentMethod = method;
                    state.formData.payment_method = method;
                    root.querySelectorAll('[data-action="select-payment"]').forEach(btn => {
                        btn.classList.toggle('selected', btn.dataset.paymentMethod === method);
                    });
                    updateUI(); // To update the submit button text
                    break;
                case 'clear-field':
                    const fieldKeyToClear = target.dataset.fieldKeyClear;
                    const inputToClear = root.querySelector(\`[name="\${fieldKeyToClear}"]\`);
                    if (inputToClear) {
                        inputToClear.value = '';
                        inputToClear.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    break;
                case 'next':
                    if(target.disabled) return;
                    if (validateStep(state.currentStep)) {
                        state.currentStep++;
                        updateUI();
                    }
                    break;
                case 'back':
                    state.currentStep--;
                    updateUI();
                    break;
                case 'add-waypoint':
                    if (!state.formData.waypoints) state.formData.waypoints = {};
                    if (!state.formData.waypoints[state.bookingType]) state.formData.waypoints[state.bookingType] = [];
                    state.formData.waypoints[state.bookingType].push('');
                    renderWaypoints();
                    break;
                case 'remove-waypoint':
                    const wpIndex = parseInt(target.dataset.index, 10);
                    if (!isNaN(wpIndex) && state.formData.waypoints && state.formData.waypoints[state.bookingType]) {
                        state.formData.waypoints[state.bookingType].splice(wpIndex, 1);
                        renderWaypoints();
                    }
                    break;
                case 'add-return-waypoint':
                    if (!state.formData.return_waypoints) state.formData.return_waypoints = {};
                    if (!state.formData.return_waypoints[state.bookingType]) state.formData.return_waypoints[state.bookingType] = [];
                    state.formData.return_waypoints[state.bookingType].push('');
                    renderActionButtonsAndReturnTrip();
                    break;
                case 'remove-return-waypoint':
                    const returnWpIndex = parseInt(target.dataset.index, 10);
                    if (!isNaN(returnWpIndex) && state.formData.return_waypoints && state.formData.return_waypoints[state.bookingType]) {
                        state.formData.return_waypoints[state.bookingType].splice(returnWpIndex, 1);
                        renderActionButtonsAndReturnTrip();
                    }
                    break;
                case 'toggle-popover':
                    const popoverId = target.dataset.popover;
                    state.activePopover = state.activePopover === popoverId ? null : popoverId;
                    root.querySelectorAll('[data-popover-content]').forEach(p => {
                        p.style.display = p.dataset.popoverContent === state.activePopover ? 'block' : 'none';
                    });
                    const extrasPopover = root.querySelector('[data-popover-content="extras"]');
                    if (extrasPopover) extrasPopover.style.display = popoverId === 'extras' && state.activePopover === 'extras' ? 'block' : 'none';
                    break;
                case 'close-popover':
                    state.activePopover = null;
                    const popover = target.closest('.form-popover');
                    if (popover) popover.style.display = 'none';
                    break;
                case 'toggle-round-trip':
                    state.formData.isRoundTrip = !state.formData.isRoundTrip;
                    if (!state.formData.isRoundTrip) {
                        state.formData.return_dropoff = '';
                        if(state.formData.return_waypoints) {
                            state.formData.return_waypoints[state.bookingType] = [];
                        }
                    }
                    updateFareDisplay();
                    updateUI();
                    break;
                case 'increase-extra':
                case 'decrease-extra':
                    const li = target.closest('li');
                    const optionName = li.dataset.optionName;
                    const option = (extraOptions || []).find(o => o.name === optionName);
                    if (!option) return;
                    const currentQty = state.formData.selectedExtras[optionName] || 0;
                    const newQty = action === 'increase-extra' ? currentQty + 1 : currentQty - 1;
                    const min = option.min ?? 0;
                    const max = option.max ?? 5;
                    if (newQty >= min && newQty <= max) {
                        if (newQty === 0) {
                            delete state.formData.selectedExtras[optionName];
                        } else {
                            state.formData.selectedExtras[optionName] = newQty;
                        }
                        const qtyEl = li.querySelector('[data-extra-quantity]');
                        if (qtyEl) qtyEl.textContent = newQty;
                        updateFareDisplay();
                    }
                    break;
                case 'select-booking-type':
                    state.bookingType = target.dataset.type;
                    root.dataset.bookingType = state.bookingType;
                    root.querySelectorAll('[data-action="select-booking-type"]').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.type === state.bookingType);
                    });
                    root.querySelectorAll('[data-type-fields]').forEach(el => {
                        el.style.display = el.dataset.typeFields === state.bookingType ? 'block' : 'none';
                    });
                    initializeGeocodersForType(state.bookingType);
                    updateFareDisplay();
                    updateUI();
                    break;
                case 'select-language':
                    state.lang = target.dataset.lang;
                    state.activePopover = null;
                    document.querySelector('[data-popover-content="language"]').style.display = 'none';
                    updateUI();
                    break;
                case 'select-vehicle':
                    state.selectedVehicle = target.dataset.vehicleId;
                    root.querySelectorAll('.form-vehicle-card').forEach(c => c.classList.remove('selected'));
                    target.classList.add('selected');
                    state.validationError = '';
                    updateUI();
                    break;
            }
        };

        const handleInput = (e) => {
            const target = e.target;
            const parent = target.parentElement.classList.contains('relative') ? target.parentElement : target.closest('.relative');
            if (parent) {
                const clearButton = parent.querySelector('[data-action="clear-field"]');
                if (clearButton) {
                    clearButton.style.display = target.value ? 'flex' : 'none';
                }
            }

            if (target.name?.startsWith('waypoint_')) {
                const index = parseInt(target.name.split('_')[1], 10);
                if (!isNaN(index) && state.formData.waypoints && state.formData.waypoints[state.bookingType]) {
                    state.formData.waypoints[state.bookingType][index] = target.value;
                }
            } else if (target.name?.startsWith('return_waypoint_')) {
                const index = parseInt(target.name.split('_')[2], 10);
                if (!isNaN(index) && state.formData.return_waypoints && state.formData.return_waypoints[state.bookingType]) {
                    state.formData.return_waypoints[state.bookingType][index] = target.value;
                }
            } else if (target.name) {
                state.formData[target.name] = target.value;
            }
            
            if (state.currentStep === 1) {
                updateFareDisplay();
                const mainButton = root.querySelector('[data-action="next"]');
                if(mainButton) mainButton.disabled = !isStep1Valid() || isSubmitting;
            }
        };
        
        const initializeAllDateTimePickers = () => {
            document.querySelectorAll('.custom-datetime-picker').forEach(pickerEl => {
                let selectedDate = null;
                let calendarViewDate = new Date();
                let activePopover = null;
        
                const hiddenInput = pickerEl.querySelector('input[type="hidden"]');
                const dateButton = pickerEl.querySelector('[data-action="toggle-calendar"]');
                const timeButton = pickerEl.querySelector('[data-action="toggle-timepicker"]');
                const dateDisplay = pickerEl.querySelector('[data-date-display]');
                const timeDisplay = pickerEl.querySelector('[data-time-display]');
                const calendarPopover = pickerEl.querySelector('[data-calendar-popover]');
                const timepickerPopover = pickerEl.querySelector('[data-timepicker-popover]');
        
                const updateValueAndDisplay = () => {
                    if (selectedDate) {
                        const year = selectedDate.getFullYear();
                        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                        const day = selectedDate.getDate().toString().padStart(2, '0');
                        const hours = selectedDate.getHours().toString().padStart(2, '0');
                        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                        hiddenInput.value = \`\${year}-\${month}-\${day}T\${hours}:\${minutes}\`;
                        
                        dateDisplay.textContent = new Intl.DateTimeFormat(state.lang, { weekday: 'short', month: 'short', day: 'numeric' }).format(selectedDate);
                        timeDisplay.textContent = new Intl.DateTimeFormat(state.lang, { hour: '2-digit', minute: '2-digit', hour12: false }).format(selectedDate);
                    } else {
                        hiddenInput.value = '';
                        dateDisplay.textContent = T('select_date', 'Select Date');
                        timeDisplay.textContent = T('select_time', 'Select Time');
                    }
                    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                };
        
                const renderCalendar = () => {
                    const year = calendarViewDate.getFullYear();
                    const month = calendarViewDate.getMonth();
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const monthName = new Intl.DateTimeFormat(state.lang, { month: 'long', year: 'numeric' }).format(calendarViewDate);
                    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
                    const firstDay = new Date(year, month, 1).getDay();
                    const numDays = new Date(year, month + 1, 0).getDate();
        
                    let daysHtml = Array.from({ length: firstDay }).map(() => '<div></div>').join('');
                    for (let day = 1; day <= numDays; day++) {
                        const date = new Date(year, month, day);
                        date.setHours(0,0,0,0);
                        const isSelected = selectedDate && date.getTime() === new Date(selectedDate).setHours(0,0,0,0);
                        const isToday = date.getTime() === today.getTime();
                        const isPast = date < today;
                        const classes = ['datetime-calendar-day'];
                        if (isSelected) classes.push('selected');
                        if (isToday) classes.push('today');
                        daysHtml += \`<button type="button" class="\${classes.join(' ')}" data-day="\${day}" \${isPast ? 'disabled' : ''}>\${day}</button>\`;
                    }
        
                    calendarPopover.innerHTML = \`
                        <div class="datetime-calendar-header">
                            <button type="button" data-action="prev-month">&lt;</button>
                            <strong>\${monthName}</strong>
                            <button type="button" data-action="next-month">&gt;</button>
                        </div>
                        <div class="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400 mb-2">\${dayNames.map(d => \`<div>\${d}</div>\`).join('')}</div>
                        <div class="datetime-calendar-grid">\${daysHtml}</div>
                    \`;
                };
        
                const renderTimePicker = () => {
                    const now = new Date();
                    const isToday = selectedDate && selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth() && selectedDate.getDate() === now.getDate();
                    const selectedTime = selectedDate ? \`\${selectedDate.getHours().toString().padStart(2, '0')}:\${selectedDate.getMinutes().toString().padStart(2, '0')}\` : null;
        
                    let timeSlotsHtml = '';
                    for (let i = 0; i < 48; i++) {
                        const hours = Math.floor(i / 2);
                        const minutes = (i % 2) * 30;
                        const time = \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}\`;
                        const isPast = isToday && (hours < now.getHours() || (hours === now.getHours() && minutes < now.getMinutes()));
                        const isSelected = time === selectedTime;
                        const classes = ['timepicker-item'];
                        if (isSelected) classes.push('selected');
                        timeSlotsHtml += \`<button type="button" class="\${classes.join(' ')}" data-time="\${time}" \${isPast ? 'disabled' : ''}>\${time}</button>\`;
                    }
                    timepickerPopover.innerHTML = \`<div class="max-h-60 overflow-y-auto no-scrollbar">\${timeSlotsHtml}</div>\`;
                };
        
                const closeAllPopovers = () => {
                    if (!pickerEl) return;
                    pickerEl.querySelectorAll('.datetime-popover').forEach(p => p.style.display = 'none');
                    dateButton.classList.remove('active');
                    timeButton.classList.remove('active');
                    activePopover = null;
                };
        
                dateButton.addEventListener('click', (e) => { e.stopPropagation(); activePopover === 'calendar' ? closeAllPopovers() : (closeAllPopovers(), calendarPopover.style.display = 'block', dateButton.classList.add('active'), renderCalendar(), activePopover = 'calendar'); });
                timeButton.addEventListener('click', (e) => { e.stopPropagation(); activePopover === 'timepicker' ? closeAllPopovers() : (closeAllPopovers(), timepickerPopover.style.display = 'block', timeButton.classList.add('active'), renderTimePicker(), activePopover = 'timepicker'); });
                calendarPopover.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('button'); if (!target) return; if (target.dataset.action === 'prev-month') { calendarViewDate.setMonth(calendarViewDate.getMonth() - 1); renderCalendar(); } else if (target.dataset.action === 'next-month') { calendarViewDate.setMonth(calendarViewDate.getMonth() + 1); renderCalendar(); } else if (target.dataset.day) { if (!selectedDate) { selectedDate = new Date(); selectedDate.setHours(9,0,0,0); } selectedDate.setFullYear(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), parseInt(target.dataset.day, 10)); updateValueAndDisplay(); closeAllPopovers(); } });
                timepickerPopover.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('button'); if (target && target.dataset.time) { if (!selectedDate) { selectedDate = new Date(); } const [h, m] = target.dataset.time.split(':').map(Number); selectedDate.setHours(h, m); updateValueAndDisplay(); closeAllPopovers(); } });
                document.body.addEventListener('click', (e) => { if (activePopover && !pickerEl.contains(e.target)) { closeAllPopovers(); } });
                updateValueAndDisplay();
            });
        };

        root.addEventListener('click', handleAction);
        root.addEventListener('input', handleInput);
        
        document.addEventListener('click', (e) => {
            const popoverContainer = e.target.closest('[data-action="toggle-popover"], .form-popover');
            if (!popoverContainer && state.activePopover) {
                state.activePopover = null;
                document.querySelectorAll('[data-popover-content]').forEach(p => p.style.display = 'none');
            }
        });

        // Auto-resize logic
        const formRoot = document.getElementById('booking-form-root');
        if (formRoot) {
            const observer = new ResizeObserver(entries => {
                const height = formRoot.scrollHeight;
                window.parent.postMessage({ type: 'form-resize', height: height }, '*');
            });
            observer.observe(formRoot);
            
            setTimeout(() => {
                window.parent.postMessage({ type: 'form-resize', height: formRoot.scrollHeight }, '*');
            }, 150);
        }

        updateUI();
        initializeAllDateTimePickers();
        initializeGeocodersForType(state.bookingType);
    })();
    `;

    const masterTemplate = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${customizations.title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
            <script src='https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js'></script>
            <link href='https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css' rel='stylesheet' />
            <script src='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js'></script>
            <link rel='stylesheet' href='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css' type='text/css' />
            <style>${css}</style>
        </head>
        <body>
            ${bodyHtml}
            <script>${javascript}</script>
        </body>
    </html>`;
    return masterTemplate;
};