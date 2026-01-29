import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { BookingManagement } from './components/BookingManagement';
import { DriverManagement } from './components/DriverManagement';
import { VehicleManagement } from './components/VehicleManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { LiveMapTracking } from './components/LiveMapTracking';
import { PricingSettings } from './components/PricingSettings';
import { Notes } from './components/Notes';
import { RouteManagement } from './components/RouteManagement';
import { PromoCodeManagement } from './components/PromoCodeManagement';
import { Notifications } from './components/Notifications';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { PaymentsInvoices } from './components/PaymentsInvoices';
import { AdminPermissions } from './components/AdminPermissions';
import { FormTemplates } from './components/FormTemplates';
import { FormBuilder } from './components/form-builder/FormBuilder';
import { Integrations } from './components/Integrations';
import { Settings } from './components/Settings';
import { Messages } from './components/Messages';
import { CompanyProfile } from './components/Profile';
import { View, Session, Booking } from './types';
import { supabase } from './services/supabase';
import { ICONS } from './constants';
import * as notificationService from './services/notificationService';
import { Modal } from './components/shared/Modal';
import { useTheme } from './contexts/ThemeContext';
import { EmailTemplates } from './components/EmailTemplates';

interface AppProps {
    session: Session;
    onSignOut: () => Promise<void>;
}

const App: React.FC<AppProps> = ({ session, onSignOut }) => {
  const { t } = useTheme();
  const [activeView, setActiveView] = useState<View>(View.Dashboard);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
      setNotification({ message, type });
      setTimeout(() => {
          setNotification(null);
      }, 5000);
  };
  
    useEffect(() => {
        const handleShowNotification = (e: any) => {
            showNotification(e.detail.message, e.detail.type);
        };
        window.addEventListener('show-notification', handleShowNotification);
        return () => {
            window.removeEventListener('show-notification', handleShowNotification);
        };
    }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const handleNewBooking = async (payload: any) => {
        const newBooking = payload.new as Booking;
        
        // Show an immediate toast notification in the admin panel
        showNotification(`${t('new_booking', 'New Booking')} #${newBooking.id} ${t('from', 'from')} ${newBooking.customer}`, 'success');

        // Action 1: Log a notification for the admin's own UI
        if (session.user.email) {
            try {
                await notificationService.logAdminNewBookingNotification(session.user.id, session.user.email, newBooking);
            } catch(err) {
                console.error("Failed to log admin notification:", err);
            }
        }
    };
    
    const bookingsChannel = supabase.channel('public:bookings:all')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
            filter: `uid=eq.${session.user.id}`
        },
        handleNewBooking)
        .subscribe();
        
    return () => {
        supabase.removeChannel(bookingsChannel);
    };
}, [session, t]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
        await onSignOut();
    } catch (error: any) {
        console.error('Error during sign out:', error.message);
        showNotification(`${t('sign_out_failed', 'Sign Out Failed:')} ${error.message}.`, 'error');
        setIsSigningOut(false);
    }
  };

  const renderContent = () => {
    const commonProps = { session, showNotification };
    switch (activeView) {
      case View.Dashboard:
        return <Dashboard setActiveView={setActiveView} session={session} />;
      case View.Bookings:
        return <BookingManagement {...commonProps} />;
      case View.Drivers:
        return <DriverManagement {...commonProps} />;
      case View.Vehicles:
        return <VehicleManagement {...commonProps} />;
      case View.Customers:
        return <CustomerManagement {...commonProps} />;
      case View.LiveMap:
        return <LiveMapTracking {...commonProps} />;
      case View.Chat:
        return <Messages {...commonProps} />;
      case View.Pricing:
        return <PricingSettings {...commonProps} setActiveView={setActiveView} />;
      case View.NotesAndExtra:
        return <Notes {...commonProps} />;
      case View.RouteManagement:
        return <RouteManagement {...commonProps} />;
      case View.Promos:
        return <PromoCodeManagement {...commonProps} />;
      case View.Notifications:
        return <Notifications {...commonProps} />;
      case View.EmailTemplates:
        return <EmailTemplates {...commonProps} />;
      case View.Reports:
        return <ReportsAnalytics {...commonProps} />;
      case View.Payments:
        return <PaymentsInvoices {...commonProps} />;
      case View.Permissions:
        return <AdminPermissions {...commonProps} />;
      case View.Integrations:
        return <Integrations {...commonProps} />;
      case View.Settings:
        return <Settings {...commonProps} />;
      default:
        return <Dashboard setActiveView={setActiveView} session={session} />;
    }
  };

  if (activeView === View.FormBuilder) {
    return <FormBuilder session={session} setActiveView={setActiveView} />;
  }
  
  if (activeView === View.FormTemplates) {
    return <FormTemplates session={session} setActiveView={setActiveView} />;
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-900">
      {notification && (
          <div className={`fixed top-20 right-6 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg z-50 text-white toast-enter ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {notification.type === 'success' ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              </svg>
              <span className="font-semibold">{notification.message}</span>
          </div>
      )}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
            user={session.user}
            onSignOut={handleSignOut}
            setActiveView={setActiveView}
            isSigningOut={isSigningOut}
            onOpenProfile={() => setIsProfileModalOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
          {renderContent()}
        </main>
      </div>
      {isProfileModalOpen && (
        <Modal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            title={t('company_profile', 'Company Profile')}
            size="3xl"
        >
            <CompanyProfile
                session={session}
                showNotification={showNotification}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </Modal>
      )}
    </div>
  );
};

export default App;