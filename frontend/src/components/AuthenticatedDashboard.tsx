import React, { useState } from 'react';
import {
  Mic,
  Users,
  ClipboardList,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Plus,
  Sparkles,
  Heart,
  Baby,
  PhoneCall,
  Activity,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  X
} from 'lucide-react';
import { LocalVisitRecord, LanguageCode } from '../types';
import { WorkerUser } from '../services/auth';
import { getTranslation } from '../i18n';

interface AuthenticatedDashboardProps {
  language: LanguageCode;
  currentUser: WorkerUser | null;
  visits: LocalVisitRecord[];
  pendingSyncCount: number;
  onStartRecording: () => void;
  onViewPatients: (filter?: string) => void;
  onSelectVisit: (visitId: string) => void;
  onOpenDemoModal: () => void;
  onSyncNow?: () => void;
}

export const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  language,
  currentUser,
  visits,
  pendingSyncCount,
  onStartRecording,
  onViewPatients,
  onSelectVisit,
  onOpenDemoModal,
  onSyncNow
}) => {
  const [showReportsModal, setShowReportsModal] = useState(false);
  const t = getTranslation(language);

  // Compute actual real-world metrics from stored visits (NO fabricated data)
  const totalVisitsCount = visits.length;

  const distinctPatients = new Set<string>();
  visits.forEach((v) => {
    if (v.patient_name && v.patient_name.trim()) {
      distinctPatients.add(v.patient_name.trim().toLowerCase());
    }
  });
  const totalPatientsCount = distinctPatients.size;

  // Filter high-risk visits for health alerts
  const highRiskVisits = visits.filter((v) => v.risk_evaluation?.is_high_risk);
  const highRiskCount = highRiskVisits.length;

  // Derive follow-ups from visit data:
  // High-risk cases need follow-up within 24-48 hours; routine cases within 14-30 days
  const followUpItems = visits.map((v) => {
    const isHigh = v.risk_evaluation?.is_high_risk;
    const visitDate = new Date(v.created_at);
    // Follow-up target: 2 days for high-risk, 14 days for normal ANC/PNC
    const dueDays = isHigh ? 2 : 14;
    const dueDate = new Date(visitDate.getTime() + dueDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const isOverdue = dueDate < now;
    return {
      visitId: v.visit_id,
      patientName: v.patient_name,
      category: v.structured_data?.category || 'general',
      isHighRisk: isHigh,
      dueDate,
      isOverdue
    };
  });

  const dueFollowUpsCount = followUpItems.filter((f) => f.dueDate <= new Date(Date.now() + 7 * 24 * 3600 * 1000)).length;

  // Recent visits (latest 5)
  const recentVisits = [...visits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  // Friendly date formatting
  const todayFormatted = (() => {
    try {
      const now = new Date();
      const locale = language === 'ta' ? 'ta-IN' : language === 'en' ? 'en-IN' : 'hi-IN';
      return now.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return new Date().toDateString();
    }
  })();

  const workerDisplayName = currentUser?.name || 'Kavita Sharma';
  const isDemoAccount = currentUser?.worker_id === 'ASHA_WORKER_001';

  return (
    <div className="space-y-6 text-left">
      {/* ================= 1. WELCOME SECTION ================= */}
      <section className="bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-dark-card dark:via-dark-card dark:to-emerald-950/20 rounded-3xl p-5 sm:p-6 border border-emerald-100 dark:border-dark-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Namaste, {workerDisplayName} 👋
            </h1>
            <p className="text-sm font-semibold text-gray-600 dark:text-dark-muted mt-1">
              Your community health workspace is ready. Let's keep your community's health records up to date.
            </p>
          </div>

          {/* Quick Demo Trigger or Village Badge */}
          <div className="flex items-center space-x-2 shrink-0">
            {isDemoAccount ? (
              <button
                type="button"
                onClick={onOpenDemoModal}
                className="py-2 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center space-x-1.5 transition-all touch-target"
              >
                <Sparkles className="w-4 h-4 animate-spin text-emerald-200" />
                <span>{t.demoModeBtn || 'Evaluation Demo'}</span>
              </button>
            ) : (
              <div className="py-1.5 px-3 rounded-2xl bg-white dark:bg-dark-surface border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{currentUser?.village || 'Sub-Centre Kalyanpur'}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= 2. KEY STATISTICS CARDS ================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Patients */}
        <div
          onClick={() => onViewPatients('all')}
          className="bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-5 border border-emerald-100 dark:border-dark-border shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Total Patients
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-health-primary dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {totalPatientsCount}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-muted block mt-0.5">
              {totalPatientsCount === 0 ? 'Ready for first patient' : 'Unique registered'}
            </span>
          </div>
        </div>

        {/* Card 2: Visits Recorded */}
        <div
          onClick={() => onViewPatients('all')}
          className="bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-5 border border-teal-100 dark:border-dark-border shadow-sm hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Visits Recorded
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-teal-900 dark:text-teal-300">
              {totalVisitsCount}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-muted block mt-0.5">
              {totalVisitsCount === 0 ? '0 visits recorded' : 'Home visits logged'}
            </span>
          </div>
        </div>

        {/* Card 3: Follow-ups Due */}
        <div
          onClick={() => onViewPatients('all')}
          className="bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-5 border border-amber-100 dark:border-dark-border shadow-sm hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Follow-ups Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-300">
              {dueFollowUpsCount}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-muted block mt-0.5">
              {dueFollowUpsCount === 0 ? 'All caught up' : 'Due this week'}
            </span>
          </div>
        </div>

        {/* Card 4: Pending Sync Records */}
        <div
          onClick={onSyncNow}
          className="bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-5 border border-blue-100 dark:border-dark-border shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Pending Sync
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RefreshCw className={`w-5 h-5 ${pendingSyncCount > 0 ? 'animate-spin' : ''}`} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-300">
              {pendingSyncCount}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-muted block mt-0.5">
              {pendingSyncCount === 0 ? 'Fully synced to cloud' : 'Offline local records'}
            </span>
          </div>
        </div>
      </section>

      {/* ================= 3. QUICK ACTIONS (START VOICE RECORDING AS HERO) ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
          Quick Actions
        </h2>

        {/* Primary Hero: Start Voice Recording */}
        <div className="bg-gradient-to-r from-health-dark via-health-primary to-emerald-800 text-white rounded-3xl p-6 sm:p-7 shadow-elevated relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-md space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold text-emerald-100">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Voice-First Clinical Capture</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Record Patient Visit via Voice
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Speak naturally in Hindi, Tamil, English, or Bhojpuri. AI automatically transcribes vitals, symptoms, and checks danger signs.
              </p>
            </div>

            <button
              type="button"
              onClick={onStartRecording}
              className="py-4 px-8 rounded-2xl bg-white hover:bg-emerald-50 active:scale-95 text-health-dark font-black text-base shadow-xl flex items-center justify-center space-x-3 transition-all shrink-0 touch-target"
            >
              <div className="w-8 h-8 rounded-full bg-health-primary text-white flex items-center justify-center animate-pulse">
                <Mic className="w-5 h-5" />
              </div>
              <span>Start Voice Recording</span>
            </button>
          </div>

          {/* Background Decorative Rings */}
          <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-24 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        </div>

        {/* Supporting Secondary Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          <button
            type="button"
            onClick={onStartRecording}
            className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500 shadow-sm flex items-center space-x-2.5 text-left transition-all touch-target"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-health-primary dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white block">Add Patient</span>
              <span className="text-[10px] text-gray-500 dark:text-dark-muted font-medium">New visit file</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onViewPatients('all')}
            className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500 shadow-sm flex items-center space-x-2.5 text-left transition-all touch-target"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white block">Patient Records</span>
              <span className="text-[10px] text-gray-500 dark:text-dark-muted font-medium">View all ({totalPatientsCount})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onViewPatients('all')}
            className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500 shadow-sm flex items-center space-x-2.5 text-left transition-all touch-target"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white block">Follow-ups</span>
              <span className="text-[10px] text-gray-500 dark:text-dark-muted font-medium">Schedule ({dueFollowUpsCount})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowReportsModal(true)}
            className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500 shadow-sm flex items-center space-x-2.5 text-left transition-all touch-target"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white block">View Reports</span>
              <span className="text-[10px] text-gray-500 dark:text-dark-muted font-medium">Clinical metrics</span>
            </div>
          </button>
        </div>
      </section>

      {/* ================= 4. HEALTH ALERTS (CLINICAL DECISION SUPPORT) ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Health Alerts & Clinical Risks
            </h2>
          </div>
          {highRiskCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              {highRiskCount} High Priority
            </span>
          )}
        </div>

        {highRiskVisits.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-200 dark:border-dark-border shadow-sm flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-health-primary dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                No active risk alerts
              </h4>
              <p className="text-xs text-gray-500 dark:text-dark-muted">
                All registered patient records are stable. New alerts trigger automatically during voice visits.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {highRiskVisits.slice(0, 3).map((v) => {
              const riskEval = v.risk_evaluation;
              return (
                <div
                  key={v.visit_id}
                  onClick={() => onSelectVisit(v.visit_id)}
                  className="bg-red-50/70 dark:bg-red-950/30 rounded-2xl p-4 border border-red-200 dark:border-red-900/60 shadow-sm hover:border-red-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900 text-danger-primary flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-300" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                          {v.patient_name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-900/80 text-red-900 dark:text-red-200">
                          High Priority
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-danger-deep dark:text-red-300 mt-0.5">
                        {riskEval?.danger_flags?.map(f => language === 'hi' ? f.message_hi : language === 'ta' ? f.message_ta : f.message_en).join(' • ') || 'Potential maternal/neonatal danger sign detected'}
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-dark-muted mt-1 italic line-clamp-1">
                        "{v.original_transcript}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
                    <a
                      href="tel:+919876543210"
                      onClick={(e) => e.stopPropagation()}
                      className="py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm touch-target"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call ANM</span>
                    </a>
                    <button
                      type="button"
                      className="py-1.5 px-3 rounded-xl bg-white dark:bg-dark-card border border-red-200 dark:border-red-800 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-red-100/50 flex items-center space-x-1 touch-target"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clinical Disclaimer */}
        <p className="text-[11px] text-gray-500 dark:text-dark-muted italic px-1">
          * Clinical risk alerts are decision-support observations for frontline ASHA workers. They do not constitute a medical diagnosis.
        </p>
      </section>

      {/* ================= 5. RECENT ACTIVITY & FOLLOW-UP OVERVIEW ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Recent Activity */}
        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 border border-gray-200 dark:border-dark-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Recent Patient Visits
            </h3>
            <button
              type="button"
              onClick={() => onViewPatients('all')}
              className="text-xs font-bold text-health-primary dark:text-emerald-400 hover:underline flex items-center"
            >
              <span>View All ({totalVisitsCount})</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {recentVisits.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <ClipboardList className="w-10 h-10 text-gray-300 dark:text-dark-muted mx-auto" />
              <p className="text-xs font-bold text-gray-700 dark:text-dark-text">
                Your recorded visits will appear here.
              </p>
              <p className="text-[11px] text-gray-500 dark:text-dark-muted">
                Tap 'Start Voice Recording' to document your first home visit.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentVisits.map((v) => {
                const isDanger = v.risk_evaluation?.is_high_risk;
                const isSynced = v.sync_status === 'synced';
                return (
                  <div
                    key={v.visit_id}
                    onClick={() => onSelectVisit(v.visit_id)}
                    className="p-3 rounded-2xl bg-gray-50/70 dark:bg-dark-surface/60 border border-gray-100 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between touch-target"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                          {v.patient_name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDanger
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {isDanger ? '⚠️ High Risk' : '✓ Normal'}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-dark-muted line-clamp-1 italic mt-0.5">
                        "{v.original_transcript}"
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`text-[10px] font-semibold flex items-center ${
                        isSynced ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {isSynced ? 'Synced' : 'Local'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Follow-up Overview */}
        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 border border-gray-200 dark:border-dark-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Follow-up Schedule
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {dueFollowUpsCount} Pending
            </span>
          </div>

          {followUpItems.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CalendarClock className="w-10 h-10 text-gray-300 dark:text-dark-muted mx-auto" />
              <p className="text-xs font-bold text-gray-700 dark:text-dark-text">
                You're all caught up!
              </p>
              <p className="text-[11px] text-gray-500 dark:text-dark-muted">
                Follow-ups are automatically scheduled when patient visits are recorded.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {followUpItems.slice(0, 5).map((f) => (
                <div
                  key={f.visitId}
                  onClick={() => onSelectVisit(f.visitId)}
                  className="p-3 rounded-2xl bg-gray-50/70 dark:bg-dark-surface/60 border border-gray-100 dark:border-dark-border hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between touch-target"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      f.isHighRisk
                        ? 'bg-red-100 dark:bg-red-950 text-red-600'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    }`}>
                      <CalendarClock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                          {f.patientName}
                        </span>
                        {f.isHighRisk && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                            Urgent 48h
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-dark-muted block">
                        Due: {f.dueDate.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-health-primary dark:text-emerald-400 flex items-center">
                    Check <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= 6. CLINICAL REPORTS MODAL ================= */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-health-primary dark:text-emerald-400" />
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Community Health Reports
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-surface flex items-center justify-center text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-gray-700 dark:text-dark-text">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">Normal Visits</span>
                  <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                    {totalVisitsCount - highRiskCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                  <span className="text-[11px] text-red-800 dark:text-red-300 font-bold block">High Risk Identified</span>
                  <span className="text-2xl font-black text-red-900 dark:text-red-200">
                    {highRiskCount}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border space-y-2">
                <span className="font-bold text-gray-900 dark:text-white block">Offline-First Sync Status</span>
                <div className="flex justify-between text-xs">
                  <span>Synced to Cloud:</span>
                  <span className="font-bold text-emerald-600">{totalVisitsCount - pendingSyncCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Pending Sync in Local IndexedDB:</span>
                  <span className="font-bold text-blue-600">{pendingSyncCount}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReportsModal(false)}
              className="w-full py-3 rounded-2xl bg-health-primary hover:bg-health-dark text-white font-bold text-sm shadow-md"
            >
              Close Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
