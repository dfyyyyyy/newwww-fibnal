import React, { useState, useEffect, useMemo } from 'react';
import type { Vehicle, VehicleStatus, Session } from '../types';
import type { Database } from '../services/database.types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import imageCompression from 'browser-image-compression';
import { Tooltip } from './shared/Tooltip';


const getStatusInfo = (status: VehicleStatus) => {
    switch (status) {
        case 'Active': return { text: "Active", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400", dotColor: "bg-green-500" };
        case 'Maintenance': return { text: "Maintenance", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400", dotColor: "bg-yellow-500" };
        default: return { text: "Unknown", color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", dotColor: "bg-slate-400" };
    }
};

const VehicleTableRow: React.FC<{
    vehicle: Vehicle;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onEdit: (vehicle: Vehicle) => void;
}> = ({ vehicle, isSelected, onSelect, onEdit }) => {
    const statusInfo = getStatusInfo(vehicle.status as VehicleStatus);

    return (
        <tr className={`transition-colors duration-200 ${isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'even:bg-white odd:bg-slate-50 dark:even:bg-slate-900 dark:odd:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <td className="w-4 px-6 py-4 align-middle">
                <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500" checked={isSelected} onChange={() => onSelect(vehicle.id)} aria-label={`Select vehicle ${vehicle.name}`} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                <div className="flex items-center gap-3">
                    <img className="w-16 h-12 rounded-lg object-cover" src={vehicle.image_url || `https://ui-avatars.com/api/?name=${vehicle.name.replace(/\s/g, "+")}&background=random&color=fff`} alt={vehicle.name} />
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs" title={vehicle.name}>{vehicle.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs" title={vehicle.type}>{vehicle.type}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle">{vehicle.model}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 align-middle font-mono">{vehicle.license}</td>
            <td className="px-6 py-4 whitespace-nowrap align-middle">
                <Tooltip content={`Current status: ${statusInfo.text}`}>
                    <span className={`inline-flex items-center gap-2 text-xs font-semibold rounded-full px-2.5 py-1 ${statusInfo.color}`}>
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></span>
                        {statusInfo.text}
                    </span>
                </Tooltip>
            </td>
            <td className="px-6 py-4 text-right align-middle">
                <Tooltip content="Edit Vehicle Details">
                    <button
                        onClick={() => onEdit(vehicle)}
                        aria-label="Edit vehicle"
                        className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Edit}</svg>
                    </button>
                </Tooltip>
            </td>
        </tr>
    );
};

export const VehicleManagement: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [vehicleFormData, setVehicleFormData] = useState<Partial<Vehicle>>({});
    const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const userId = session?.user?.id;

    const previewUrl = useMemo(() => {
        if (!imageFile) return null;
        return URL.createObjectURL(imageFile);
    }, [imageFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const fetchVehicles = async (signal?: AbortSignal) => {
        if (!userId) { setError('User not authenticated.'); setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('vehicles').select('*').abortSignal(signal).eq('uid', userId).order('created_at', { ascending: false });
            if (dbError) throw dbError;
            if (signal?.aborted) return;
            if (data) setAllVehicles(data);
        } catch (err: any) {
            if (err.name !== 'AbortError') setError(`${t('fetch_fail_prefix', 'Failed to fetch vehicles:')} ${err.message}`);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (userId) fetchVehicles(controller.signal);
        return () => controller.abort();
    }, [userId]);

    useEffect(() => {
        if (isModalOpen) {
            setImageFile(null);
            if (editingVehicle) {
                setVehicleFormData(editingVehicle);
            } else {
                setVehicleFormData({
                    name: '', type: 'Sedan', model: '', license: '', status: 'Active',
                    max_passengers: 4, max_luggage: 2, max_carry_on: 2,
                    base_fare: 2.50, rate_per_km: 1.75, cost_per_min: 0.30, cost_per_hour: 50.00,
                    image_url: null,
                });
            }
        }
    }, [editingVehicle, isModalOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number';
        setVehicleFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setVehicleFormData(prev => ({ ...prev, image_url: null }));
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setVehicleFormData(prev => ({ ...prev, image_url: null }));
    };

    const handleSaveVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setIsSaving(true);

        let finalImageUrl = vehicleFormData.image_url || null;

        if (imageFile) {
            try {
                const compressedFile = await imageCompression(imageFile, { maxSizeMB: 1, maxWidthOrHeight: 1024 });
                const filePath = `${userId}/vehicles/${Date.now()}-${compressedFile.name}`;
                const { error: uploadError } = await supabase.storage.from('vehicle-images').upload(filePath, compressedFile);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
                if (!data.publicUrl) throw new Error("Could not get public URL for image.");
                finalImageUrl = data.publicUrl;
            } catch (error: any) {
                showNotification(error.message || "Failed to upload image.", 'error');
                setIsSaving(false);
                return;
            }
        }

        try {
            const payload: any = {
                uid: userId,
                name: vehicleFormData.name || '',
                type: vehicleFormData.type || 'Sedan',
                model: vehicleFormData.model || '',
                license: vehicleFormData.license || '',
                status: vehicleFormData.status || 'Active',
                max_passengers: vehicleFormData.max_passengers || 0,
                max_luggage: vehicleFormData.max_luggage || 0,
                max_carry_on: vehicleFormData.max_carry_on || 0,
                base_fare: vehicleFormData.base_fare || 0,
                rate_per_km: vehicleFormData.rate_per_km || 0,
                cost_per_min: vehicleFormData.cost_per_min || 0,
                cost_per_hour: vehicleFormData.cost_per_hour || 0,
                image_url: finalImageUrl,
            };
            if (editingVehicle) {
                payload.id = editingVehicle.id;
            }

            const { error } = await supabase.from('vehicles').upsert([payload], { onConflict: 'id' });
            if (error) throw error;
            
            setIsModalOpen(false);
            setEditingVehicle(null);
            fetchVehicles();
            showNotification(editingVehicle ? 'Vehicle updated successfully.' : 'Vehicle added successfully.', 'success');
        } catch (err: any) {
            showNotification(`${t('save_fail_prefix', 'Failed to save vehicle:')} ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkRemove = async () => {
        if (selectedVehicleIds.length === 0 || !userId) return;
        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${selectedVehicleIds.length} ${t('vehicle_plural', 'vehicle(s)')}?`)) {
            const { count, error } = await supabase.from('vehicles').delete().eq('uid', userId).in('id', selectedVehicleIds);
            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove vehicles:')} ${error.message}`, 'error');
            } else if (!count) {
                showNotification(t('remove_permission_error', 'The selected items could not be removed due to insufficient permissions.'), 'error');
            } else {
                showNotification(`${count} ${t('vehicle_plural', 'vehicle(s)')} removed.`, 'success');
                fetchVehicles();
                setSelectedVehicleIds([]);
            }
        }
    };

    const filteredVehicles = useMemo(() => allVehicles.filter(v => {
        const searchLower = searchTerm.toLowerCase();
        return !searchLower || v.name.toLowerCase().includes(searchLower) || v.model.toLowerCase().includes(searchLower) || v.license.toLowerCase().includes(searchLower) || v.type.toLowerCase().includes(searchLower);
    }), [allVehicles, searchTerm]);

    const areAllSelected = filteredVehicles.length > 0 && selectedVehicleIds.length === filteredVehicles.length;
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedVehicleIds(e.target.checked ? filteredVehicles.map(d => d.id) : []);
    const handleSelectOne = (id: number) => setSelectedVehicleIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    if (error) return <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl"><h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2><p className="text-slate-600">{error}</p><button onClick={() => fetchVehicles()} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('try_again', 'Try Again')}</button></div>;
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('vehicles', 'Vehicle Management')}</h1>
                <button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }} className="flex items-center bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition text-sm font-semibold" disabled={!userId}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Add}</svg>
                    {t('add_new_vehicle', 'Add New Vehicle')}
                </button>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <input type="text" placeholder="Search by name, model, license, or type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 rounded-lg placeholder:text-slate-400 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
             <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-vehicles" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500" checked={areAllSelected} onChange={handleSelectAll} disabled={filteredVehicles.length === 0} aria-label="Select all vehicles" />
                    <label htmlFor="select-all-vehicles" className="text-sm font-semibold">{areAllSelected ? 'Deselect All' : `Select All (${filteredVehicles.length})`}</label>
                </div>
                {selectedVehicleIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedVehicleIds.length} selected</p>
                        <Tooltip content={`Permanently delete ${selectedVehicleIds.length} selected vehicle(s).`}>
                            <button onClick={handleBulkRemove} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                                Remove Selected
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
            {loading ? (
                 <div className="grid grid-cols-1 gap-6 animate-pulse"><div className="h-48 bg-white dark:bg-slate-900 rounded-xl"></div></div>
            ) : filteredVehicles.length > 0 ? (
                 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4 w-4"></th>
                                    <th className="px-6 py-4 font-semibold text-left">Vehicle</th>
                                    <th className="px-6 py-4 font-semibold text-left">Model</th>
                                    <th className="px-6 py-4 font-semibold text-left">License</th>
                                    <th className="px-6 py-4 font-semibold text-left">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredVehicles.map(v => <VehicleTableRow key={v.id} vehicle={v} isSelected={selectedVehicleIds.includes(v.id)} onSelect={handleSelectOne} onEdit={(vehicle) => { setEditingVehicle(vehicle); setIsModalOpen(true); }} />)}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="font-semibold">{t('no_vehicles_found', 'No vehicles found.')}</p>
                    <p className="text-sm mt-1">Click 'Add New Vehicle' to get started.</p>
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVehicle ? t('edit_vehicle', 'Edit Vehicle') : t('add_new_vehicle', 'Add New Vehicle')}>
                <form onSubmit={handleSaveVehicle} className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm">Name</label><input type="text" name="name" value={vehicleFormData.name || ''} onChange={handleInputChange} className="mt-1 w-full" required/></div>
                            <div><label className="block text-sm">Type</label><input type="text" name="type" value={vehicleFormData.type || ''} onChange={handleInputChange} className="mt-1 w-full" placeholder="e.g., Sedan, SUV" required/></div>
                            <div><label className="block text-sm">Model</label><input type="text" name="model" value={vehicleFormData.model || ''} onChange={handleInputChange} className="mt-1 w-full" required/></div>
                            <div><label className="block text-sm">License Plate</label><input type="text" name="license" value={vehicleFormData.license || ''} onChange={handleInputChange} className="mt-1 w-full" required/></div>
                            <div><label className="block text-sm">Status</label><select name="status" value={vehicleFormData.status || 'Active'} onChange={handleInputChange} className="mt-1 w-full"><option>Active</option><option>Maintenance</option></select></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Capacity</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-sm">Passengers</label><input type="number" name="max_passengers" value={vehicleFormData.max_passengers || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                            <div><label className="block text-sm">Luggage</label><input type="number" name="max_luggage" value={vehicleFormData.max_luggage || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                            <div><label className="block text-sm">Carry-on</label><input type="number" name="max_carry_on" value={vehicleFormData.max_carry_on || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Pricing (Tiered)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="block text-sm">Base Fare ($)</label><input type="number" step="0.01" name="base_fare" value={vehicleFormData.base_fare || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                            <div><label className="block text-sm">Rate / KM ($)</label><input type="number" step="0.01" name="rate_per_km" value={vehicleFormData.rate_per_km || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                            <div><label className="block text-sm">Cost / Min ($)</label><input type="number" step="0.01" name="cost_per_min" value={vehicleFormData.cost_per_min || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                            <div><label className="block text-sm">Cost / Hour ($)</label><input type="number" step="0.01" name="cost_per_hour" value={vehicleFormData.cost_per_hour || 0} onChange={handleInputChange} className="mt-1 w-full" /></div>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Image</h3>
                        <div className="flex items-center gap-4">
                            <img src={previewUrl || vehicleFormData.image_url || `https://ui-avatars.com/api/?name=${vehicleFormData.name || 'V'}&background=random&color=fff`} alt="Vehicle" className="w-24 h-20 rounded-lg object-cover bg-slate-200"/>
                            <div className="flex-1">
                                <label className="block text-sm">Image URL</label>
                                <input 
                                    type="text" 
                                    placeholder="Or paste image URL" 
                                    value={vehicleFormData.image_url || ''} 
                                    onChange={(e) => {
                                        setVehicleFormData(p => ({...p, image_url: e.target.value || null}));
                                        if (e.target.value) {
                                            setImageFile(null);
                                        }
                                    }} 
                                    className="mt-1 w-full" 
                                />
                                <div className="flex items-center gap-4 mt-2">
                                    <label htmlFor="image-upload" className="cursor-pointer text-sm font-medium text-primary-600 hover:underline">
                                        {isSaving && imageFile ? 'Uploading...' : 'Upload Image'}
                                    </label>
                                    <input id="image-upload" type="file" className="sr-only" onChange={handleImageFileChange} accept="image/png, image/jpeg, image/webp" disabled={isSaving}/>
                                    {(previewUrl || vehicleFormData.image_url) && (
                                        <button type="button" onClick={handleRemoveImage} className="text-sm font-medium text-red-500 hover:underline">
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('cancel', 'Cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center disabled:opacity-70 w-36">
                            {isSaving 
                                ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {t('saving', 'Saving...')}</>
                                : (editingVehicle ? t('save_changes', 'Save Changes') : t('add_vehicle', 'Add Vehicle'))}
                       </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
