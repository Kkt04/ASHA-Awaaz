import React, { useState } from 'react';
import { 
  Mic, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { LanguageDropdown } from '../components/LanguageDropdown';
import { ThemeToggle } from '../components/ThemeToggle';
import { authService, WorkerUser } from '../services/auth';
import { AshaHeroIllustration } from '../components/AshaHeroIllustration';

interface LoginPageProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onLoginSuccess: (user: WorkerUser) => void;
  onNavigateSignup: () => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  language,
  onLanguageChange,
  onLoginSuccess,
  onNavigateSignup,
  onNavigateHome,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = getTranslation(language);

  const handleFillDemo = () => {
    setEmail('kavita.asha@gov.in');
    setPassword('AshaCare@2026');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(t.emailOrUsername + ' is required');
      return;
    }
    if (!password) {
      setErrorMessage(t.passwordLabel + ' is required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({
        email: email.trim(),
        password,
      });
      onLoginSuccess(res.worker);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
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
              ASHA Register v1.0
            </span>
          </div>
        </div>

        {/* Central Graphic & Core Message */}
        <div className="relative z-10 my-8 sm:my-12 space-y-6 max-w-lg mx-auto lg:mx-0">
          
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
            <Mic className="w-8 h-8 text-emerald-300 animate-pulse" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            {t.loginSplitHeadline}
          </h1>

          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
            {t.loginSplitSub}
          </p>

          {/* Highlights checklist */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center space-x-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Speaks Hindi, Tamil, Bhojpuri & English</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Full offline storage with IndexedDB</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Instant high-risk maternal & newborn detection</span>
            </div>
          </div>

        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 text-xs text-emerald-200/80 pt-6 border-t border-emerald-800/80">
          <span>Wispr Flow Build for Bharat Prototype • ASHA Awaaz</span>
        </div>

      </div>

      {/* RIGHT AUTH FORM PANEL (50% width on desktop) */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between bg-white dark:bg-dark-surface">
        
        {/* Top Controls: Language & Theme */}
        <div className="flex items-center justify-end space-x-3 mb-8">
          <ThemeToggle />
          <LanguageDropdown currentLanguage={language} onLanguageChange={onLanguageChange} />
        </div>

        {/* Center: Form Container */}
        <div className="max-w-md w-full mx-auto space-y-6">
          
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {t.loginTitle}
            </h2>
            <p className="text-sm text-gray-600 dark:text-dark-muted mt-1">
              {t.loginSub}
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start space-x-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Autofill Card */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center">
                <Sparkles className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" />
                Demo Evaluation Account
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-xs font-bold text-health-primary dark:text-emerald-400 hover:underline py-1 px-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 transition-colors"
              >
                {t.quickDemoLogin}
              </button>
            </div>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
              {t.demoCredentialsNote}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email / Username field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-email" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.emailOrUsername}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kavita.asha@gov.in"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-password" 
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-gray-300 dark:border-dark-border bg-surface-warm dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-health-primary text-base transition-colors"
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center space-x-2.5 cursor-pointer text-gray-700 dark:text-dark-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-health-primary focus:ring-health-primary border-gray-300 dark:border-dark-border"
                />
                <span>{t.rememberMe}</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl font-bold text-base text-white bg-health-primary hover:bg-health-dark disabled:opacity-60 shadow-md shadow-health-primary/30 transition-all flex items-center justify-center space-x-2 touch-target"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t.loggingIn}</span>
                  </>
                ) : (
                  <>
                    <span>{t.loginButton}</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Switch to Signup */}
          <div className="pt-4 text-center text-sm text-gray-600 dark:text-dark-muted border-t border-gray-100 dark:border-dark-border">
            <span>{t.noAccountPrompt} </span>
            <button
              type="button"
              onClick={onNavigateSignup}
              className="font-bold text-health-primary dark:text-emerald-400 hover:underline"
            >
              {t.signUpLink}
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-8">
          <span>ASHA Awaaz • Secure Field Authentication</span>
        </div>

      </div>

    </div>
  );
};
