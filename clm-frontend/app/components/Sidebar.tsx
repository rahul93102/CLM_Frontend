'use client';

import React, { useState } from 'react';

interface SidebarProps {
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const navItems = [
    { 
      name: 'Dashboard', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      active: true 
    },
    { 
      name: 'Lifecycle', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Analytics', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Calendar', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Globe', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Messages', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Templates', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
        </svg>
      ), 
      active: false 
    },
  ];

  return (
    <div 
      className={`fixed left-0 top-0 h-full bg-[#0F141F] flex flex-col items-center py-8 z-50 transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-[90px]'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="mb-12 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF7E5F] to-[#FEB47B] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          {isExpanded && (
            <span className="text-white font-bold text-lg whitespace-nowrap">CLM System</span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-4 w-full px-4">
        {navItems.map((item, index) => (
          <div
            key={index}
            className={`relative group cursor-pointer transition-all rounded-xl ${
              item.active 
                ? 'text-white bg-white/10' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            } ${isExpanded ? 'px-4 py-3' : 'px-0 py-3 flex justify-center'}`}
            onClick={() => {
              if (item.name === 'Dashboard') window.location.href = '/';
              if (item.name === 'Templates') window.location.href = '/templates';
              // Add more navigation as needed
            }}
          >
            {item.active && !isExpanded && (
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#FF7E5F] to-[#FEB47B] rounded-r-full"></div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">{item.icon}</div>
              {isExpanded && (
                <span className="font-medium whitespace-nowrap">{item.name}</span>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User Avatar & Logout */}
      <div className="mt-auto w-full px-4">
        {isExpanded && onLogout && (
          <button
            onClick={onLogout}
            className="w-full mb-4 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        )}
        
        <div className={`${isExpanded ? 'flex items-center gap-3 px-2' : 'flex justify-center'}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center cursor-pointer hover:ring-2 ring-white/20 transition flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          {isExpanded && (
            <div className="text-left">
              <p className="text-white text-sm font-medium">John Doe</p>
              <p className="text-gray-400 text-xs">Admin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
