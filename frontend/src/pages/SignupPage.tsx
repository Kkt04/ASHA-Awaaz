import React, { useState } from 'react';
import { 
  Mic, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { LanguageDropdown } from '../components/LanguageDropdown';
import { ThemeToggle } from '../components/ThemeToggle';
import { authService, WorkerUser } from '../services/auth';

interface SignupPageProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onSignupSuccess: (user: WorkerUser) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  language,
  onLanguageChange,
  onSignupSuccess,
  onNavigateLogin,
  onNavigateHome,
}) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('ASHA Health Worker');
  const [village, setVillage] = useState<string>('Rampur Sub-Centre');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = getTranslation(language);

  // Compute password strength
  const getPasswordStrength = (pwd: string): { label: string; percent: number; colorClass: string } => {
    if (!pwd) return { label: '', percent: 0, colorClass: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: t.pwdWeak, percent: 30, colorClass: 'bg-red-500' };
    if (score <= 2) return { label: t.pwdMedium, percent: 65, colorClass: 'bg-amber-500' };
    return { label: t.pwdStrong, percent: 100, colorClass: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage(t.fullNameLabel + ' is required');
      return;
    }
    if (!email.trim()) {
      setErrorMessage(t.emailOrUsername + ' is required');
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t.pwdLengthError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t.pwdMismatchError);
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service & Privacy guidelines.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        village: village.trim() || 'Sub-Centre Kalyanpur',
        preferred_language: language,
      });
      onSignupSuccess(res.worker);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-warm dark:bg-dark-bg text-gray-900 dark:text-dark-text flex flex-col lg:flex-row transition-colors duration-200">
      
      {/* LEFT VISUAL PANEL (Split-screen on desktop: 50% width) */}
      <div className="lg:w-1/2 bg-gradient-to-br from-emerald-900 via-health-dark to-emerald-950 text-white p-6 sm:p-10 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        
        {/* Subtle patterned overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
        
        {/* Top bar on visual panel */}
        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-emerald-200 hover:text-white transition-colors py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 touch-target"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.navHome}</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700">
              New Worker Setup
            </span>
          </div>
        </div>

        {/* Central Graphic & Core Message */}
        <div className="relative z-10 my-8 sm:my-12 space-y-6 max-w-lg mx-auto lg:mx-0">
          
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-emerald-300" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            {t.signupSplitHeadline}
          </h1>

          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
            {t.signupSplitSub}
          </p>

          {/* Highlights checklist */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center space-x-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Instant setup for your assigned village sub-centre</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Automatic offline sync when working in remote areas</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Free, open and compliant with rural healthcare standards</span>
            </div>
          </div>

        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 text-xs text-emerald-200/80 pt-6 border-t border-emerald-800/80">
          <span>Wispr Flow Build for Bharat Prototype • ASHA Awaaz</span>
        </div>

      </div>

      {/* RIGHT AUTH FORM PANEL (50% width on desktop) */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between bg-white dark:bg-dark-surface overflow-y-auto">
        
        {/* Top Controls: Language & Theme */}
        <div className="flex items-center justify-end space-x-3 mb-6">
          <ThemeToggle />
          <LanguageDropdown currentLanguage={language} onLanguageChange={onLanguageChange} />
        </div>

        {/* Center: Form Container */}
        <div className="max-w-md w-full mx-auto space-y-5">
          
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {t.signupTitle}
            </h2>
            <p className="text-sm text-gray-600 dark:text-dark-muted mt-1">
              {t.signupSub}
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start space-x-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="signup-name" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.fullNameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kavita Sharma"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
                />
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="signup-email" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.emailOrUsername}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kavita@asha.org"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
                />
              </div>
            </div>

            {/* Role Dropdown */}
            <div className="space-y-1.5">
              <label 
                htmlFor="signup-role" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.roleLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <select
                  id="signup-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
                >
                  <option value="ASHA Health Worker">{t.roleAshaWorker}</option>
                  <option value="ANM Nurse">{t.roleAnmNurse}</option>
                  <option value="Medical Officer / Supervisor">{t.roleSupervisor}</option>
                </select>
              </div>
            </div>

            {/* Password field with Strength Meter */}
            <div className="space-y-1.5">
              <label 
                htmlFor="signup-password" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 touch-target"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password strength indicator bar */}
              {password && (
                <div className="pt-1 space-y-1">
                  <div className="w-full bg-gray-200 dark:bg-dark-border h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${strength.colorClass}`}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-medium text-gray-500 dark:text-dark-muted flex justify-between">
                    <span>{strength.label}</span>
                    <span>Min 6 chars</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="signup-confirm-password" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.confirmPasswordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
                />
              </div>
            </div>

            {/* Terms of Service Consent */}
            <div className="pt-1">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-gray-600 dark:text-dark-muted">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-health-primary focus:ring-health-primary border-gray-300 dark:border-dark-border"
                />
                <span>{t.agreeTerms}</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-base text-white bg-health-primary hover:bg-health-dark disabled:opacity-60 shadow-md shadow-health-primary/30 transition-all flex items-center justify-center space-x-2 touch-target"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t.signingUp}</span>
                  </>
                ) : (
                  <>
                    <span>{t.signupButton}</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Switch to Login */}
          <div className="pt-3 text-center text-sm text-gray-600 dark:text-dark-muted border-t border-gray-100 dark:border-dark-border">
            <span>{t.alreadyHaveAccount} </span>
            <button
              type="button"
              onClick={onNavigateLogin}
              className="font-bold text-health-primary dark:text-emerald-400 hover:underline"
            >
              {t.navLogin}
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-6">
          <span>ASHA Awaaz • Secure Field Registration</span>
        </div>

      </div>

    </div>
  );
};
