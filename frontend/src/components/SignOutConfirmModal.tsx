import React from 'react';
import { LogOut, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  pendingSyncCount: number;
  language: LanguageCode;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  isOpen,
  pendingSyncCount,
  language,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;
  const t = getTranslation(language);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <LogOut className="w-6 h-6" />
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.signOutConfirmTitle}
          </h3>
          <p className="text-sm text-gray-600 dark:text-dark-muted mt-1 leading-relaxed">
            {t.signOutConfirmDesc}
          </p>
        </div>

        {/* Offline Safety Assurance Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
            <strong>Local Storage Protected:</strong> All patient records, visit histories, and voice recordings remain safely stored in your device's IndexedDB database.
          </div>
        </div>

        {/* Warning if records are pending cloud sync */}
        {pendingSyncCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>{pendingSyncCount} {t.pendingSync}:</strong> {t.signOutPendingWarning}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-700 dark:text-dark-muted bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border transition-colors touch-target"
          >
            {t.signOutCancelBtn}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-colors touch-target"
          >
            {t.signOutConfirmBtn}
          </button>
        </div>

      </div>
    </div>
  );
};
