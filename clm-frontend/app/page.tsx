'use client';

import { useState, useEffect } from 'react';
import AuthPage from "./components/AuthPage";
import DashboardContent from "./components/DashboardContent";
import { tokenManager } from './lib/api';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = tokenManager.getAccessToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    tokenManager.clearTokens();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F0EB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-gray-600 font-medium">Loading CLM System...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {isAuthenticated ? (
        <DashboardContent onLogout={handleLogout} />
      ) : (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}


