import React from 'react';
import { View } from '../types';
import { ICONS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Tooltip } from './shared/Tooltip';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const NavItem: React.FC<{
  view: View;
  activeView: View;
  setActiveView: (view: View) => void;
  isCollapsed: boolean;
  children: React.ReactNode;
}> = ({ view, activeView, setActiveView, isCollapsed, children }) => {
    const { t, sidebarStyle } = useTheme();
    const translationKey = view.toLowerCase().replace(/ & /g, '_and_').replace(/ /g, '_');
    const isActive = activeView === view;
    const isSidebarDark = sidebarStyle === 'dark';

    const inactiveClasses = isSidebarDark 
        ? 'text-slate-400 hover:bg-slate-700/50 hover:text-white' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800';

    const activeTextClass = isSidebarDark ? 'text-primary-400' : 'text-primary-600';

    const iconInactiveClasses = isSidebarDark
        ? 'text-slate-400 group-hover:text-white'
        : 'text-slate-600 group-hover:text-slate-800';
        
    return (
        <li className="relative group">
            <a
            href="#"
            onClick={(e) => {
                e.preventDefault();
                setActiveView(view);
            }}
            className={`group relative flex items-center w-full py-2.5 font-normal transition-all duration-200 ease-in-out text-sm ${
                isActive 
                ? `${activeTextClass} font-semibold` 
                : inactiveClasses
            }`}
            >
            {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-primary-500 rounded-r-lg"></div>}
            <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'pl-8 pr-6'}`}>
              <svg 
                  className={`w-5 h-5 transition-colors duration-200 ease-in-out flex-shrink-0 ${
                      isActive ? activeTextClass : iconInactiveClasses
                  }`}
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth={isActive ? '2' : '1.5'}
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
              >
                  {children}
              </svg>
              {!isCollapsed && <span className="ml-4 whitespace-nowrap">{t(translationKey, view)}</span>}
            </div>
            </a>
            {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-normal rounded-md whitespace-nowrap
                                 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-[-8px] transition-all duration-200 ease-in-out pointer-events-none z-50 shadow-lg">
                    {t(translationKey, view)}
                </div>
            )}
        </li>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isCollapsed, setIsCollapsed }) => {
  const { t, sidebarStyle } = useTheme();
  const menuItems = Object.values(View);
  const isSidebarDark = sidebarStyle === 'dark';
  const sidebarBgClass = isSidebarDark ? 'bg-slate-800' : 'bg-white';
  
  return (
    <aside className={`relative sticky top-0 h-screen ${sidebarBgClass} ${isCollapsed ? 'w-20' : 'w-[250px]'} z-10 transition-all duration-300 ease-in-out shadow-lg`} aria-label="Sidebar">
      <div className="h-full flex flex-col">
        {/* Header Part with fixed height */}
        <div className={`relative flex items-center h-16 flex-shrink-0 border-b ${isSidebarDark ? 'border-slate-700' : 'border-slate-200'} ${isCollapsed ? 'justify-center' : 'justify-start px-6'}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? 'w-full justify-center' : ''}`}>
               <div className={`flex-shrink-0 ${isSidebarDark ? 'text-white' : 'text-primary-500'}`}>
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    {ICONS.Vehicles}
                </svg>
              </div>
              <h1 className={`text-lg font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarDark ? 'text-white' : 'text-slate-800'} ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-xs opacity-100 ml-3'}`}>
                {t('its_booking_system', 'ITS Booking System')}
              </h1>
          </div>
           <Tooltip content={isCollapsed ? t('expand_sidebar', "Expand sidebar") : t('collapse_sidebar', "Collapse sidebar")} position="right">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-6 rounded-full shadow-md border ${isSidebarDark ? 'border-slate-800' : 'border-white'} ${
                isSidebarDark 
                  ? 'bg-slate-700 hover:bg-slate-600'
                  : 'bg-white hover:bg-slate-100'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              <svg
                className={`w-4 h-4 ${isSidebarDark ? 'text-slate-300' : 'text-slate-600'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {ICONS[isCollapsed ? 'Expand' : 'Collapse']}
              </svg>
            </button>
          </Tooltip>
        </div>
        
        {/* Scrollable Navigation List */}
        <div className="flex-1 py-4 overflow-y-auto no-scrollbar">
          <ul className="space-y-0.5">
            {menuItems.map((item) => (
               <NavItem key={item} view={item} activeView={activeView} setActiveView={setActiveView} isCollapsed={isCollapsed}>
                 {ICONS[item]}
               </NavItem>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};