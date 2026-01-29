import React, { useState, useEffect } from 'react';
import type { AdminRole, Session } from '../types';
import type { Database } from '../services/database.types';
import { Modal } from './shared/Modal';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Tooltip } from './shared/Tooltip';

const RoleCard: React.FC<{
    role: AdminRole;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onEdit: (role: AdminRole) => void;
}> = ({ role, isSelected, onSelect, onEdit }) => {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 ${isSelected ? 'border-primary-500 ring-2 ring-primary-500' : 'border-slate-200/70 dark:border-slate-800/70'}`}>
            <div className="p-5 grid grid-cols-[auto_1fr_auto] items-center gap-5">
                 <input type="checkbox" className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 flex-shrink-0" checked={isSelected} onChange={() => onSelect(role.id)} aria-label={`Select role ${role.name}`} />
                <div className="flex items-center gap-4 min-w-0">
                    <div className="text-primary-500 flex-shrink-0">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Permissions}</svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white">{role.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate" title={role.permissions}>
                            {role.permissions}
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <Tooltip content="Edit Role">
                        <button onClick={() => onEdit(role)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Edit}</svg>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export const AdminPermissions: React.FC<{ session: Session; showNotification: (message: string, type: 'success' | 'error') => void; }> = ({ session, showNotification }) => {
    const { t } = useTheme();
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
    const [roleFormData, setRoleFormData] = useState({ name: '', permissions: '' });
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

    const fetchRoles = async () => {
        const controller = new AbortController();
        await fetchRolesWithSignal(controller.signal);
        return () => controller.abort();
    };

    const fetchRolesWithSignal = async (signal: AbortSignal) => {
        if (!session) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase.from('admin_roles').select('*').abortSignal(signal)
                .eq('uid', session.user.id)
                .order('created_at', { ascending: false });

            if(dbError) throw dbError;
            if (signal.aborted) return;
            
            if (data) {
                setRoles(data);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Error fetching admin roles:', err);
                const errorMessage = (err && typeof err.message === 'string') ? err.message : 'An unexpected error occurred.';
                setError(`${t('fetch_fail_prefix', 'Failed to fetch admin roles:')} ${errorMessage}`);
            }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    };
    
    useEffect(() => {
        const controller = new AbortController();
        if (session) {
            fetchRolesWithSignal(controller.signal);
        }
        return () => {
            controller.abort();
        };
    }, [session]);

    useEffect(() => {
        if (editingRole) {
            setRoleFormData({ name: editingRole.name, permissions: editingRole.permissions });
        } else {
            setRoleFormData({ name: '', permissions: '' });
        }
    }, [editingRole, isModalOpen]);

    const openAddModal = () => {
        setEditingRole(null);
        setIsModalOpen(true);
    };

    const openEditModal = (role: AdminRole) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session) {
            showNotification(t('save_fail_no_user', "Cannot save: User is not logged in."), 'error');
            return;
        }
        const userId = session.user.id;
        
        try {
            if (editingRole) {
                const payload: Database['public']['Tables']['admin_roles']['Update'] = { permissions: roleFormData.permissions, name: roleFormData.name };
                const { error } = await supabase
                    .from('admin_roles')
                    .update(payload)
                    .eq('id', editingRole.id)
                    .eq('uid', userId);
                if (error) throw error;
            } else {
                const { data: existingRoles } = await supabase.from('admin_roles').select('name').eq('name', roleFormData.name).eq('uid', userId);
                if (existingRoles && existingRoles.length > 0) {
                    showNotification(`${t('role_exists_prefix', 'A role with the name')} "${roleFormData.name}" ${t('role_exists_suffix', 'already exists for your account.')}`, 'error');
                    return;
                }
                const payload: Database['public']['Tables']['admin_roles']['Insert'] = { ...roleFormData, uid: userId };
                const { error } = await supabase.from('admin_roles').insert([payload]);
                if (error) throw error;
            }
    
            setIsModalOpen(false);
            setEditingRole(null);
            fetchRoles();
            showNotification(editingRole ? 'Role updated successfully.' : 'Role created successfully.', 'success');
        } catch (err: any) {
            console.error('Error saving role:', err);
            const errorMessage = err.message || t('unknown_error', 'An unknown error occurred.');
            showNotification(`${t('save_fail_prefix', 'Failed to save role:')} ${errorMessage}`, 'error');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRoleIds(roles.map(r => r.id));
        } else {
            setSelectedRoleIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedRoleIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRemove = async () => {
        if (selectedRoleIds.length === 0 || !session) return;
        const userId = session.user.id;

        const superAdminRole = roles.find(r => r.name === 'Super Admin');
        const idsToRemove = selectedRoleIds.filter(id => id !== superAdminRole?.id);

        if (selectedRoleIds.includes(superAdminRole?.id || -1)) {
            showNotification(t('cannot_remove_super_admin', 'The "Super Admin" role cannot be removed. It has been excluded from this operation.'), 'error');
        }
        
        if (idsToRemove.length === 0) {
            setSelectedRoleIds([]);
            return;
        }

        if (window.confirm(`${t('confirm_remove_prefix', 'Are you sure you want to remove')} ${idsToRemove.length} ${t('role_plural', 'role(s)')}?`)) {
            const { count, error } = await supabase.from('admin_roles').delete()
                .eq('uid', userId)
                .in('id', idsToRemove);
            if (error) {
                showNotification(`${t('remove_fail_prefix', 'Failed to remove roles:')} ${error.message}`, 'error');
            } else if (count === null || count === 0) {
                showNotification(t('remove_permission_error', 'The selected roles were not removed. Please check your admin permissions (Row Level Security) in Supabase and try again.'), 'error');
            } else {
                showNotification(`${count} ${t('role_plural', 'role(s)')} removed.`, 'success');
                fetchRoles();
                setSelectedRoleIds([]);
            }
        }
    };
    
    const areAllSelected = roles.length > 0 && selectedRoleIds.length === roles.length;

    if (loading) {
        return null;
    }
    
    if (error) {
        return (
             <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">{t('error', 'Error')}</h2>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button 
                    onClick={() => { fetchRoles(); }}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    {t('try_again', 'Try Again')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('admin_permissions_title', 'Admin Roles & Permissions')}</h1>
                <button onClick={openAddModal} className="flex items-center bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition text-sm font-semibold" disabled={!session}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Add}</svg>
                    {t('create_new_role', 'Create New Role')}
                </button>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="select-all-roles" className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" checked={areAllSelected} onChange={handleSelectAll} disabled={roles.length === 0} aria-label="Select all roles" />
                    <label htmlFor="select-all-roles" className="text-sm font-semibold">
                        {areAllSelected ? 'Deselect All' : `Select All (${roles.length})`}
                    </label>
                </div>
                {selectedRoleIds.length > 0 && (
                     <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold">{selectedRoleIds.length} selected</p>
                        <Tooltip content={`Permanently delete ${selectedRoleIds.length} selected role(s).`}>
                            <button onClick={handleBulkRemove} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICONS.Delete}</svg>
                                Remove Selected
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
             
             {loading ? (
                <div className="grid grid-cols-1 gap-6 animate-pulse">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-2xl"></div>)}
                </div>
            ) : roles.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {roles.map((role) => (
                        <RoleCard key={role.id} role={role} isSelected={selectedRoleIds.includes(role.id)} onSelect={handleSelectOne} onEdit={openEditModal} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
                    <p className="font-semibold">No admin roles found.</p>
                    <p className="text-sm mt-1">Click 'Create New Role' to get started.</p>
                </div>
            )}

             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRole ? t('edit_role', 'Edit Role') : t('create_new_role', 'Create New Role')}>
                <form onSubmit={handleSaveRole}>
                    <div className="mb-4">
                        <label htmlFor="roleName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('col_role_name', 'Role Name')}</label>
                        <input type="text" id="roleName" value={roleFormData.name} onChange={e => setRoleFormData({...roleFormData, name: e.target.value})} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required readOnly={!!editingRole && editingRole.name === 'Super Admin'}/>
                         {!!editingRole && editingRole.name === 'Super Admin' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('super_admin_name_no_change', 'The Super Admin role name cannot be changed.')}</p>}
                    </div>
                     <div className="mb-4">
                        <label htmlFor="permissions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('col_permissions_summary', 'Permissions Summary')}</label>
                        <input type="text" id="permissions" value={roleFormData.permissions} onChange={e => setRoleFormData({...roleFormData, permissions: e.target.value})} placeholder={t('permissions_placeholder', 'e.g., View/Edit Bookings, Manage Promos')} className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div className="flex justify-end space-x-2 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('cancel', 'Cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{editingRole ? t('save_changes', 'Save Changes') : t('create_role', 'Create Role')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};