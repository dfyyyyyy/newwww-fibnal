import React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className = '' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={`relative group inline-flex ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute z-50 px-2.5 py-1.5 text-sm font-normal text-white bg-slate-800 rounded-md shadow-lg whitespace-nowrap
                   opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-1 transition-all duration-200 ease-in-out pointer-events-none
                   ${positionClasses[position]}`}
      >
        {content}
      </div>
    </div>
  );
};
