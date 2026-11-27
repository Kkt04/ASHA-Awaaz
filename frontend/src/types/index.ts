export type LanguageCode = 'en' | 'hi' | 'ta' | 'bho';

export interface BloodPressure {
  systolic?: number | null;
  diastolic?: number | null;
}

export interface Vitals {
  blood_pressure?: BloodPressure | null;
  weight_kg?: number | null;
  temperature_f?: number | null;
  pulse_bpm?: number | null;
}

export interface MedicineItem {
  name: string;
  status: 'taken' | 'missed' | 'prescribed' | 'unknown';
  notes?: string;
}

export interface StructuredVisitData {
  patient_name?: string | null;
  category: 'pregnant_woman' | 'newborn' | 'child' | 'lactating_mother' | 'general' | 'unknown';
  pregnancy_month?: number | null;
  newborn_age_days?: number | null;
  child_age_years?: number | null;
  vitals: Vitals;
  symptoms: string[];
  medicines: MedicineItem[];
  baby_movement?: 'normal' | 'reduced' | 'none' | 'unknown';
  other_observations?: string | null;
  missing_fields: string[];
  uncertain_fields: string[];
  original_transcript: string;
  confidence?: number;
}

export interface RiskFlag {
  rule_name: string;
  severity: 'danger' | 'warning' | 'info';
  message_en: string;
  message_hi: string;
  message_ta: string;
  action_required: string;
}

export interface RiskEvaluation {
  is_high_risk: boolean;
  danger_flags: RiskFlag[];
  emergency_action?: string | null;
  call_anm_phone?: string | null;
  spoken_warning_hi?: string | null;
  spoken_warning_ta?: string | null;
}

export interface LocalVisitRecord {
  id?: number;
  visit_id: string;
  patient_id?: string;
  patient_name: string;
  worker_id: string;
  original_transcript: string;
  language: LanguageCode;
  structured_data: StructuredVisitData;
  risk_evaluation: RiskEvaluation;
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface LocalPatientRecord {
  id?: number;
  patient_id: string;
  worker_id: string;
  name: string;
  category: string;
  age?: number;
  village?: string;
  phone?: string;
  total_visits: number;
  latest_risk_status?: 'normal' | 'danger';
  created_at: string;
  updated_at: string;
}

export type AppScreen = 
  | 'landing'
  | 'login'
  | 'signup'
  | 'language_select'
  | 'home'
  | 'recording'
  | 'visit_card'
  | 'confirmation'
  | 'saved'
  | 'history'
  | 'patients'
  | 'visits';
