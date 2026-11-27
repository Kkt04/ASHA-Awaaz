import React, { useState } from 'react';
import { 
  Mic, 
  Sparkles, 
  Globe2, 
  ShieldCheck, 
  WifiOff, 
  Heart, 
  ArrowRight, 
  CheckCircle2, 
  Activity, 
  Users, 
  FileCheck2, 
  Menu, 
  X, 
  PhoneCall,
  Clock,
  ChevronDown
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { LanguageDropdown } from '../components/LanguageDropdown';
import { ThemeToggle } from '../components/ThemeToggle';
import { AshaHeroIllustration } from '../components/AshaHeroIllustration';

interface LandingPageProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onNavigateLogin: () => void;
  onNavigateSignup: () => void;
  onNavigateApp: () => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  language,
  onLanguageChange,
  onNavigateLogin,
  onNavigateSignup,
  onNavigateApp,
  isAuthenticated,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const t = getTranslation(language);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-warm dark:bg-dark-bg text-gray-900 dark:text-dark-text transition-colors duration-200">
      
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Brand Logo & Name */}
            <div 
              onClick={() => scrollToSection('hero')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-health-primary text-white flex items-center justify-center shadow-md shadow-health-primary/20 group-hover:bg-health-dark transition-colors">
                <Mic className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-health-dark dark:text-emerald-400">
                  {t.appName}
                </span>
                <span className="hidden sm:block text-[11px] font-semibold text-gray-500 dark:text-dark-muted">
                  Your voice. Their health. Better care.
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-700 dark:text-dark-muted">
              <button 
                onClick={() => scrollToSection('hero')} 
                className="hover:text-health-primary dark:hover:text-emerald-400 transition-colors"
              >
                {t.navHome}
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="hover:text-health-primary dark:hover:text-emerald-400 transition-colors"
              >
                {t.navHowItWorks}
              </button>
              <button 
                onClick={() => scrollToSection('features')} 
                className="hover:text-health-primary dark:hover:text-emerald-400 transition-colors"
              >
                {t.navFeatures}
              </button>
              <button 
                onClick={() => scrollToSection('impact')} 
                className="hover:text-health-primary dark:hover:text-emerald-400 transition-colors"
              >
                {t.navImpact}
              </button>
            </nav>

            {/* Desktop Actions: Theme, Language, Auth */}
            <div className="hidden lg:flex items-center space-x-3">
              <ThemeToggle />
              <LanguageDropdown currentLanguage={language} onLanguageChange={onLanguageChange} />
              
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onNavigateApp}
                  className="py-2.5 px-5 rounded-xl font-bold text-white bg-health-primary hover:bg-health-dark shadow-md shadow-health-primary/25 transition-all flex items-center space-x-1.5 touch-target"
                >
                  <span>{t.navDashboard}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="py-2.5 px-5 rounded-xl font-bold text-white bg-health-primary hover:bg-health-dark active:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md shadow-health-primary/20 transition-all touch-target flex items-center space-x-1"
                  >
                    <span>{t.navLogin}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateSignup}
                    className="py-2.5 px-5 rounded-xl font-bold text-health-dark dark:text-emerald-300 bg-health-mint dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-health-mintborder dark:border-emerald-800 transition-all touch-target"
                  >
                    {t.navGetStarted}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Controls: Language, Theme & Hamburger */}
            <div className="flex lg:hidden items-center space-x-2">
              <ThemeToggle />
              <LanguageDropdown currentLanguage={language} onLanguageChange={onLanguageChange} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-card touch-target"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2">
            <button
              onClick={() => scrollToSection('hero')}
              className="w-full text-left py-2 px-3 rounded-lg text-base font-semibold text-gray-700 dark:text-dark-muted hover:bg-emerald-50 dark:hover:bg-dark-card"
            >
              {t.navHome}
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left py-2 px-3 rounded-lg text-base font-semibold text-gray-700 dark:text-dark-muted hover:bg-emerald-50 dark:hover:bg-dark-card"
            >
              {t.navHowItWorks}
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="w-full text-left py-2 px-3 rounded-lg text-base font-semibold text-gray-700 dark:text-dark-muted hover:bg-emerald-50 dark:hover:bg-dark-card"
            >
              {t.navFeatures}
            </button>
            <button
              onClick={() => scrollToSection('impact')}
              className="w-full text-left py-2 px-3 rounded-lg text-base font-semibold text-gray-700 dark:text-dark-muted hover:bg-emerald-50 dark:hover:bg-dark-card"
            >
              {t.navImpact}
            </button>

            <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex flex-col gap-2.5">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onNavigateApp}
                  className="w-full py-3 rounded-xl font-bold text-white bg-health-primary hover:bg-health-dark shadow-md flex items-center justify-center space-x-2"
                >
                  <span>{t.navDashboard}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="w-full py-3 rounded-xl font-bold text-white bg-health-primary hover:bg-health-dark active:bg-emerald-900 shadow-md shadow-health-primary/20 transition-all flex items-center justify-center space-x-2 touch-target"
                  >
                    <span>{t.navLogin}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateSignup}
                    className="w-full py-3 rounded-xl font-bold text-health-dark dark:text-emerald-300 bg-health-mint dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-health-mintborder dark:border-emerald-800 transition-all flex items-center justify-center space-x-2 touch-target"
                  >
                    {t.navGetStarted}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Product Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin [animation-duration:8s]" />
                <span>{t.heroBadge}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-gray-900 dark:text-white">
                <span>{t.heroHeadline} </span>
                <span className="text-health-primary dark:text-emerald-400 block sm:inline">
                  {t.heroHeadlineSub}
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                {t.heroSupportingText}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  type="button"
                  onClick={isAuthenticated ? onNavigateApp : onNavigateSignup}
                  className="w-full sm:w-auto py-4 px-8 rounded-2xl font-bold text-base text-white bg-health-primary hover:bg-health-dark shadow-elevated hover:shadow-lg transition-all flex items-center justify-center space-x-2 touch-target"
                >
                  <span>{t.heroCtaPrimary}</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full sm:w-auto py-4 px-8 rounded-2xl font-bold text-base text-gray-800 dark:text-gray-100 bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-surface border border-gray-300 dark:border-dark-border shadow-sm transition-all flex items-center justify-center touch-target"
                >
                  {t.heroCtaSecondary}
                </button>
              </div>

              {/* Key Trust Signals */}
              <div className="pt-6 border-t border-gray-200/80 dark:border-dark-border grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto lg:mx-0 text-left">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-health-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-dark-muted">
                    No Typing
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <WifiOff className="w-5 h-5 text-health-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-dark-muted">
                    Offline First
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe2 className="w-5 h-5 text-health-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-dark-muted">
                    4 Languages
                  </span>
                </div>
              </div>

            </div>

            {/* Right Visual Column (5 cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <AshaHeroIllustration language={language} />
            </div>

          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-dark-surface border-y border-gray-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {t.howItWorksBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              {t.howItWorksTitle}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-dark-muted">
              {t.howItWorksSub}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="bg-surface-warm dark:bg-dark-card rounded-3xl p-8 border border-emerald-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all relative group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xl mb-6 group-hover:scale-105 transition-transform">
                <Mic className="w-7 h-7 text-health-primary dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t.step1Title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-warm dark:bg-dark-card rounded-3xl p-8 border border-emerald-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all relative group">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xl mb-6 group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-7 h-7 text-teal-700 dark:text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t.step2Title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-warm dark:bg-dark-card rounded-3xl p-8 border border-emerald-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all relative group">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xl mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7 text-amber-700 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t.step3Title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.step3Desc}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. FEATURES GRID SECTION */}
      <section id="features" className="py-20 bg-surface-warm dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {t.featuresBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              {t.featuresTitle}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-dark-muted">
              {t.featuresSub}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feat 1: Voice Recording */}
            <div className="bg-white dark:bg-dark-card rounded-3xl p-7 border border-gray-200 dark:border-dark-border shadow-card hover:shadow-elevated transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-health-primary dark:text-emerald-400 mb-5">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.feat1Title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.feat1Desc}
              </p>
            </div>

            {/* Feat 2: Indian Languages */}
            <div className="bg-white dark:bg-dark-card rounded-3xl p-7 border border-gray-200 dark:border-dark-border shadow-card hover:shadow-elevated transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-5">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.feat2Title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.feat2Desc}
              </p>
            </div>

            {/* Feat 3: Clinical Extraction */}
            <div className="bg-white dark:bg-dark-card rounded-3xl p-7 border border-gray-200 dark:border-dark-border shadow-card hover:shadow-elevated transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-700 dark:text-sky-400 mb-5">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.feat3Title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.feat3Desc}
              </p>
            </div>

            {/* Feat 4: Health-Risk Alerts */}
            <div className="bg-white dark:bg-dark-card rounded-3xl p-7 border border-gray-200 dark:border-dark-border shadow-card hover:shadow-elevated transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-5">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.feat4Title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.feat4Desc}
              </p>
            </div>

            {/* Feat 5: Offline Storage */}
            <div className="bg-white dark:bg-dark-card rounded-3xl p-7 border border-gray-200 dark:border-dark-border shadow-card hover:shadow-elevated transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-5">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.feat5Title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.feat5Desc}
              </p>
            </div>

            {/* Feat 6: Patient History */}
            <div className="bg-white dark:bg-dark-card rounded-3xl p-7 border border-gray-200 dark:border-dark-border shadow-card hover:shadow-elevated transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.feat6Title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-muted leading-relaxed">
                {t.feat6Desc}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. IMPACT SECTION */}
      <section id="impact" className="py-20 bg-emerald-900 text-white relative overflow-hidden">
        {/* Subtle patterned background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-800 text-emerald-200 border border-emerald-700">
              {t.impactBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              {t.impactTitle}
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 font-medium">
              {t.impactSub}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-emerald-800/60 backdrop-blur-md rounded-3xl p-8 border border-emerald-700/60 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-700/80 flex items-center justify-center text-emerald-200">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {t.impactPoint1Title}
              </h3>
              <p className="text-sm text-emerald-100/80 leading-relaxed">
                {t.impactPoint1Desc}
              </p>
            </div>

            <div className="bg-emerald-800/60 backdrop-blur-md rounded-3xl p-8 border border-emerald-700/60 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-700/80 flex items-center justify-center text-emerald-200">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {t.impactPoint2Title}
              </h3>
              <p className="text-sm text-emerald-100/80 leading-relaxed">
                {t.impactPoint2Desc}
              </p>
            </div>

            <div className="bg-emerald-800/60 backdrop-blur-md rounded-3xl p-8 border border-emerald-700/60 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-700/80 flex items-center justify-center text-emerald-200">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {t.impactPoint3Title}
              </h3>
              <p className="text-sm text-emerald-100/80 leading-relaxed">
                {t.impactPoint3Desc}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. FINAL CTA BANNER */}
      <section className="py-20 bg-surface-warm dark:bg-dark-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-health-dark via-health-primary to-emerald-700 rounded-3xl p-8 sm:p-14 text-white text-center shadow-elevated relative overflow-hidden">
            <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black">
                {t.finalCtaTitle}
              </h2>
              <p className="text-base sm:text-lg text-emerald-100 leading-relaxed">
                {t.finalCtaSub}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={isAuthenticated ? onNavigateApp : onNavigateSignup}
                  className="py-4 px-9 rounded-2xl font-bold text-base text-health-dark bg-white hover:bg-emerald-50 shadow-lg transition-transform hover:scale-105 touch-target inline-flex items-center space-x-2"
                >
                  <span>{t.finalCtaButton}</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-gray-100 dark:border-dark-border">
            
            {/* Brand column */}
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-health-primary text-white flex items-center justify-center font-bold">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-xl font-black text-health-dark dark:text-emerald-400">
                  {t.appName}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-muted max-w-md leading-relaxed">
                {t.footerAboutText}
              </p>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                {t.footerNavTitle}
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-dark-muted">
                <li>
                  <button onClick={() => scrollToSection('hero')} className="hover:text-health-primary dark:hover:text-emerald-400">
                    {t.navHome}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-health-primary dark:hover:text-emerald-400">
                    {t.navHowItWorks}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-health-primary dark:hover:text-emerald-400">
                    {t.navFeatures}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('impact')} className="hover:text-health-primary dark:hover:text-emerald-400">
                    {t.navImpact}
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                {t.footerLegalTitle}
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-dark-muted">
                <li>
                  <button 
                    onClick={() => setLegalModal('privacy')} 
                    className="hover:text-health-primary dark:hover:text-emerald-400"
                  >
                    {t.privacyPolicy}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setLegalModal('terms')} 
                    className="hover:text-health-primary dark:hover:text-emerald-400"
                  >
                    {t.termsOfService}
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-dark-muted gap-4">
            <p>© 2026 {t.appName}. {t.allRightsReserved}</p>
            <p className="text-right">Wispr Flow Build for Bharat Prototype • Round 2</p>
          </div>

        </div>
      </footer>

      {/* Legal Dialog Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-dark-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {legalModal === 'privacy' ? t.privacyPolicy : t.termsOfService}
              </h3>
              <button 
                onClick={() => setLegalModal(null)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-dark-muted space-y-3 leading-relaxed">
              {legalModal === 'privacy' ? (
                <>
                  <p><strong>1. Data Minimization:</strong> ASHA Awaaz processes health documentation primarily on the local device. Patient visits are retained in browser IndexedDB.</p>
                  <p><strong>2. Audio Security:</strong> Spoken audio is converted to clinical text using the Web Speech API or Groq AI and is never permanently archived as voice recordings.</p>
                  <p><strong>3. Field Privacy:</strong> Health data stays accessible only to authorized community health workers at the assigned sub-centre.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Intended Use:</strong> ASHA Awaaz is designed for frontline ASHA health workers to assist with community health registers and ANC tracking.</p>
                  <p><strong>2. Clinical Decision Support:</strong> Danger sign alerts and threshold indicators are decision support aids and do not substitute medical officer diagnoses.</p>
                  <p><strong>3. Offline Reliability:</strong> Local records are stored in browser persistence. Regular synchronization upon internet availability is advised.</p>
                </>
              )}
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="py-2 px-5 rounded-xl font-semibold text-white bg-health-primary hover:bg-health-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
