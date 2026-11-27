import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  RefreshCw, 
  HeartPulse, 
  LogOut, 
  Home
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { syncPendingVisits } from '../services/api';
import { db } from '../db/dexie';
import { LanguageDropdown } from './LanguageDropdown';
import { ThemeToggle } from './ThemeToggle';
import { WorkerUser } from '../services/auth';

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onHomeClick: () => void;
  onLandingClick?: () => void;
  user?: WorkerUser | null;
  onRequestSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onHomeClick,
  onLandingClick,
  user,
  onRequestSignOut,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  const t = getTranslation(language);

  const checkPending = async () => {
    try {
      const count = await db.visits.where('sync_status').equals('pending').count();
      setPendingCount(count);
    } catch {
      // Ignore during initial setup
    }
  };

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 4000);

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    await syncPendingVisits();
    await checkPending();
    setIsSyncing(false);
  };

  return (
    <header className="bg-health-dark dark:bg-dark-surface text-white px-3 sm:px-6 py-2.5 shadow-md sticky top-0 z-40 border-b border-emerald-800 dark:border-dark-border transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onHomeClick}
            className="flex items-center space-x-2 text-left focus:outline-none touch-target"
            title="Go to Register Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white dark:bg-dark-card flex items-center justify-center text-health-dark dark:text-emerald-400 shadow-sm">
              <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white">
                  {t.appName}
                </h1>
                <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 dark:bg-dark-card text-emerald-200 border border-emerald-700 dark:border-dark-border">
                  Field Register
                </span>
              </div>
              <span className="text-[11px] text-emerald-200 dark:text-dark-muted font-medium block truncate max-w-[160px] sm:max-w-none">
                {user ? `${user.name} • ${user.village}` : t.subCentreName}
              </span>
            </div>
          </button>
        </div>

        {/* Status Indicators, Theme, Language & User Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          
          {/* Landing page shortcut */}
          {onLandingClick && (
            <button
              onClick={onLandingClick}
              className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/80 text-emerald-100 text-xs font-semibold border border-emerald-700 touch-target"
              title="View Public Landing Page"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t.navHome}</span>
            </button>
          )}

          {/* Offline Warning Pill (Only displayed when network is offline; Online mark removed for clean navigation) */}
          {!isOnline && (
            <div
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/80 text-amber-200 border border-amber-600 animate-pulse"
              title="Offline - Records will be saved locally"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">Offline</span>
            </div>
          )}

          {/* Pending Sync Badge */}
          {pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-accent-primary text-white text-xs font-bold shadow-sm touch-target"
              title="Click to sync pending records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingCount}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Global Language Dropdown */}
          <LanguageDropdown
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
            variant="header"
          />

          {/* User Sign Out Button */}
          {onRequestSignOut && (
            <button
              type="button"
              onClick={onRequestSignOut}
              aria-label={t.signOut}
              title={t.signOut}
              className="flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-red-800/70 hover:bg-red-700 text-white text-xs font-bold border border-red-700/80 transition-colors touch-target shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
