import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Volume2, Globe, HeartPulse } from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../utils/translations';
import { syncPendingVisits } from '../services/api';
import { db } from '../db/dexie';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onHomeClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onHomeClick,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const t = getTranslation(language);

  const checkPending = async () => {
    try {
      const count = await db.visits.where('sync_status').equals('pending').count();
      setPendingCount(count);
    } catch (e) {
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

  const handleToggleLang = () => {
    const nextLang: LanguageCode = language === 'hi' ? 'ta' : 'hi';
    onLanguageChange(nextLang);
    voiceSynthesizer.speak(
      nextLang === 'hi' ? 'भाषा हिन्दी चुनी गई' : 'மொழி தமிழ் தேர்ந்தெடுக்கப்பட்டது',
      nextLang
    );
  };

  return (
    <header className="bg-health-dark text-white px-4 py-3 shadow-md sticky top-0 z-30">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <button
          onClick={onHomeClick}
          className="flex items-center space-x-2.5 text-left focus:outline-none touch-target"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-health-dark shadow-sm">
            <HeartPulse className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-white">
              {t.appName}
            </h1>
            <span className="text-xs text-green-200 font-medium">
              Build for Bharat
            </span>
          </div>
        </button>

        {/* Status Indicators & Language Toggle */}
        <div className="flex items-center space-x-2">
          {/* Network connectivity pill */}
          <div
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-600'
                : 'bg-amber-900/80 text-amber-200 border border-amber-600'
            }`}
            title={isOnline ? t.online : t.offline}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {isOnline ? t.online : 'Offline'}
            </span>
          </div>

          {/* Pending Sync Badge */}
          {pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-accent-primary text-white text-xs font-bold shadow-sm touch-target"
              title="Click to sync pending records"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>{pendingCount}</span>
            </button>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={handleToggleLang}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-xs font-bold text-white border border-white/20 touch-target"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'தமிழ்' : 'हिन्दी'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
