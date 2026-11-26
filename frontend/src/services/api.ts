import { 
  StructuredVisitData, 
  RiskEvaluation, 
  LocalVisitRecord, 
  LanguageCode 
} from '../types';
import { extractLocally, generateSpokenSummaries } from './fallbackExtractor';
import { evaluateRiskLocally } from './riskEngine';
import { db } from '../db/dexie';

const API_BASE = '/api/v1';

export async function extractVisitVoice(
  transcript: string,
  language: LanguageCode = 'hi',
  existingData?: StructuredVisitData
): Promise<{ extracted: StructuredVisitData; engine: string; summaryHi: string; summaryTa: string; summaryEn: string }> {
  try {
    const res = await fetch(`${API_BASE}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, language }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        extracted: data.extracted,
        engine: data.engine_used,
        summaryHi: data.speech_summary_hi,
        summaryTa: data.speech_summary_ta,
        summaryEn: data.speech_summary_en || data.speech_summary_hi,
      };
    }
  } catch (err) {
    console.info('Backend API unavailable. Performing deterministic extraction locally:', err);
  }

  // Local offline extraction
  const extracted = extractLocally(transcript, existingData);
  const { hi, ta, en } = generateSpokenSummaries(extracted);
  return {
    extracted,
    engine: 'local_offline_deterministic',
    summaryHi: hi,
    summaryTa: ta,
    summaryEn: en,
  };
}

export async function evaluateRisk(data: StructuredVisitData): Promise<RiskEvaluation> {
  try {
    const res = await fetch(`${API_BASE}/risk-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.info('Backend risk check unavailable. Performing local risk evaluation.');
  }

  return evaluateRiskLocally(data);
}

export async function saveVisitRecord(
  structuredData: StructuredVisitData,
  riskEval: RiskEvaluation,
  transcript: string,
  language: LanguageCode
): Promise<LocalVisitRecord> {
  const visitId = `VISIT_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();
  const patientName = structuredData.patient_name || 'मरीज़';

  const record: LocalVisitRecord = {
    visit_id: visitId,
    patient_name: patientName,
    worker_id: 'ASHA_WORKER_001',
    original_transcript: transcript,
    language,
    structured_data: structuredData,
    risk_evaluation: riskEval,
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
  };

  // 1. Always save in IndexedDB first (guarantees zero data loss in field)
  const localId = await db.visits.add(record);
  record.id = localId;

  // 2. Also update or create local patient record in Dexie
  const existingPatient = await db.patients.where('name').equalsIgnoreCase(patientName).first();
  if (existingPatient && existingPatient.id) {
    await db.patients.update(existingPatient.id, {
      total_visits: (existingPatient.total_visits || 0) + 1,
      latest_risk_status: riskEval.is_high_risk ? 'danger' : existingPatient.latest_risk_status,
      updated_at: now,
    });
  } else {
    await db.patients.add({
      patient_id: `PAT_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      worker_id: 'ASHA_WORKER_001',
      name: patientName,
      category: structuredData.category || 'pregnant_woman',
      village: 'Rampur',
      total_visits: 1,
      latest_risk_status: riskEval.is_high_risk ? 'danger' : 'normal',
      created_at: now,
      updated_at: now,
    });
  }

  // 3. Attempt cloud synchronization if online
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        await db.visits.update(localId, { sync_status: 'synced' });
        record.sync_status = 'synced';
      }
    } catch (e) {
      console.info('Could not sync to cloud immediately. Kept in IndexedDB as Pending Sync.');
    }
  }

  return record;
}

export async function syncPendingVisits(): Promise<{ synced: number; skipped: number; total: number }> {
  const pending = await db.visits.where('sync_status').equals('pending').toArray();
  if (pending.length === 0) return { synced: 0, skipped: 0, total: 0 };

  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visits: pending,
        worker_id: 'ASHA_WORKER_001',
      }),
    });

    if (res.ok) {
      const result = await res.json();
      for (const id of result.synced_ids) {
        await db.visits.where('visit_id').equals(id).modify({ sync_status: 'synced' });
      }
      return {
        synced: result.synced_count,
        skipped: result.duplicates_skipped,
        total: pending.length,
      };
    }
  } catch (err) {
    console.warn('Sync failed due to network:', err);
  }

  return { synced: 0, skipped: 0, total: pending.length };
}
