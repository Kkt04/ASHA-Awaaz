import Dexie, { Table } from 'dexie';
import { LocalVisitRecord, LocalPatientRecord } from '../types';

export class AshaDatabase extends Dexie {
  visits!: Table<LocalVisitRecord, number>;
  patients!: Table<LocalPatientRecord, number>;

  constructor() {
    super('AshaAwaazDB');
    this.version(1).stores({
      visits: '++id, visit_id, patient_id, patient_name, sync_status, created_at',
      patients: '++id, patient_id, name, category, latest_risk_status'
    });
    // Version 2 adds worker_id index for strict multi-user data isolation
    this.version(2).stores({
      visits: '++id, visit_id, patient_id, patient_name, worker_id, sync_status, created_at',
      patients: '++id, patient_id, name, worker_id, category, latest_risk_status'
    });
  }
}

export const db = new AshaDatabase();

/**
 * Pre-seed demo patients and visits ONLY for the demo account (ASHA_WORKER_001).
 * Never seeds data for newly registered worker accounts.
 */
export async function seedLocalDemoPatients(workerId: string = 'ASHA_WORKER_001') {
  if (workerId !== 'ASHA_WORKER_001') {
    return;
  }

  const existingDemoPatients = await db.patients.where('worker_id').equals('ASHA_WORKER_001').count();
  const now = new Date();
  const nowIso = now.toISOString();
  const threeWeeksAgoIso = new Date(now.getTime() - 21 * 24 * 3600 * 1000).toISOString();

  if (existingDemoPatients === 0) {
    await db.patients.bulkAdd([
      {
        patient_id: 'PAT_001',
        worker_id: 'ASHA_WORKER_001',
        name: 'Sunita Devi',
        category: 'pregnant_woman',
        age: 24,
        village: 'Rampur Ward 3',
        phone: '9871234560',
        total_visits: 2,
        latest_risk_status: 'danger',
        created_at: threeWeeksAgoIso,
        updated_at: nowIso
      },
      {
        patient_id: 'PAT_002',
        worker_id: 'ASHA_WORKER_001',
        name: 'Aarav Kumar (Navjat)',
        category: 'newborn',
        age: 0,
        village: 'Rampur Ward 1',
        phone: '9871234561',
        total_visits: 1,
        latest_risk_status: 'danger',
        created_at: nowIso,
        updated_at: nowIso
      },
      {
        patient_id: 'PAT_003',
        worker_id: 'ASHA_WORKER_001',
        name: 'Meena Kumari',
        category: 'child',
        age: 3,
        village: 'Rampur Ward 2',
        phone: '9871234562',
        total_visits: 1,
        latest_risk_status: 'normal',
        created_at: nowIso,
        updated_at: nowIso
      }
    ]);
  }

  // Also ensure demo visits exist and link to these patients
  const existingDemoVisits = await db.visits.where('worker_id').equals('ASHA_WORKER_001').count();
  if (existingDemoVisits === 0) {
    await db.visits.bulkAdd([
      {
        visit_id: 'VISIT_001_EARLIER',
        patient_id: 'PAT_001',
        patient_name: 'Sunita Devi',
        worker_id: 'ASHA_WORKER_001',
        language: 'en',
        original_transcript: 'Sunita 6th month routine ANC visit, BP 120 by 80, fetal heart rate normal, taking IFA tablets regularly.',
        structured_data: {
          patient_name: 'Sunita Devi',
          category: 'pregnant_woman',
          pregnancy_month: 6,
          vitals: {
            blood_pressure: { systolic: 120, diastolic: 80 },
            weight_kg: 54,
            temperature_f: 98.4
          },
          symptoms: [],
          medicines: [
            { name: 'iron_folic_acid', status: 'taken', notes: 'Daily after lunch' },
            { name: 'calcium', status: 'taken' }
          ],
          baby_movement: 'normal',
          missing_fields: [],
          uncertain_fields: [],
          original_transcript: 'Sunita 6th month routine ANC visit, BP 120 by 80, fetal heart rate normal, taking IFA tablets regularly.'
        },
        risk_evaluation: {
          is_high_risk: false,
          danger_flags: []
        },
        sync_status: 'synced',
        created_at: threeWeeksAgoIso,
        updated_at: threeWeeksAgoIso
      },
      {
        visit_id: 'VISIT_001_CURRENT',
        patient_id: 'PAT_001',
        patient_name: 'Sunita Devi',
        worker_id: 'ASHA_WORKER_001',
        language: 'en',
        original_transcript: 'Sunita is 7 months pregnant, BP is 150 by 100, severe swelling in feet and missed iron tablets.',
        structured_data: {
          patient_name: 'Sunita Devi',
          category: 'pregnant_woman',
          pregnancy_month: 7,
          vitals: {
            blood_pressure: { systolic: 150, diastolic: 100 },
            weight_kg: 56.5,
            temperature_f: 98.6
          },
          symptoms: ['swelling_feet', 'headache', 'blurred_vision'],
          medicines: [
            { name: 'iron_folic_acid', status: 'missed', notes: 'Reports stomach discomfort' }
          ],
          baby_movement: 'reduced',
          missing_fields: [],
          uncertain_fields: [],
          original_transcript: 'Sunita is 7 months pregnant, BP is 150 by 100, severe swelling in feet and missed iron tablets.'
        },
        risk_evaluation: {
          is_high_risk: true,
          danger_flags: [
            {
              rule_name: 'gestational_hypertension',
              severity: 'danger',
              message_en: 'Gestational Hypertension: BP is 150/100 mmHg with severe pedal edema.',
              message_hi: 'उच्च रक्तचाप: बीपी 150/100 mmHg और पैरों में गंभीर सूजन है।',
              message_ta: 'உயர் இரத்த அழுத்தம்: இரத்த அழுத்தம் 150/100 mmHg மற்றும் வீக்கம்.',
              action_required: 'Immediate referral to PHC/CHC and alert ANM for pre-eclampsia screening.'
            }
          ],
          emergency_action: 'Immediate referral to PHC/CHC',
          call_anm_phone: '+919876543210'
        },
        sync_status: 'synced',
        created_at: nowIso,
        updated_at: nowIso
      },
      {
        visit_id: 'VISIT_002_CURRENT',
        patient_id: 'PAT_002',
        patient_name: 'Aarav Kumar (Navjat)',
        worker_id: 'ASHA_WORKER_001',
        language: 'en',
        original_transcript: 'Aarav is 15 days old newborn, high fever 101.5 degrees, poor feeding and lethargic.',
        structured_data: {
          patient_name: 'Aarav Kumar (Navjat)',
          category: 'newborn',
          newborn_age_days: 15,
          vitals: {
            temperature_f: 101.5,
            weight_kg: 2.8
          },
          symptoms: ['fever', 'poor_feeding', 'lethargy'],
          medicines: [],
          missing_fields: [],
          uncertain_fields: [],
          original_transcript: 'Aarav is 15 days old newborn, high fever 101.5 degrees, poor feeding and lethargic.'
        },
        risk_evaluation: {
          is_high_risk: true,
          danger_flags: [
            {
              rule_name: 'neonatal_fever',
              severity: 'danger',
              message_en: 'Neonatal Sepsis Alert: Fever 101.5°F and refusal to feed in 15-day neonate.',
              message_hi: 'नवजात शिशु को तेज बुखार (101.5°F) और स्तनपान न करना - सेप्सिस का खतरा।',
              message_ta: 'புதிதாகப் பிறந்த குழந்தைக்கு காய்ச்சல் (101.5°F) மற்றும் தாய்ப்பால் அருந்தாமை.',
              action_required: 'Emergency transfer to District Hospital / Special Newborn Care Unit (SNCU).'
            }
          ],
          emergency_action: 'Immediate SNCU referral',
          call_anm_phone: '+919876543210'
        },
        sync_status: 'synced',
        created_at: nowIso,
        updated_at: nowIso
      },
      {
        visit_id: 'VISIT_003_CURRENT',
        patient_id: 'PAT_003',
        patient_name: 'Meena Kumari',
        worker_id: 'ASHA_WORKER_001',
        language: 'en',
        original_transcript: 'Meena Kumari is 3 years old, routine child wellness checkup, weight 13.5 kg, alert and healthy.',
        structured_data: {
          patient_name: 'Meena Kumari',
          category: 'child',
          child_age_years: 3,
          vitals: {
            weight_kg: 13.5,
            temperature_f: 98.4
          },
          symptoms: [],
          medicines: [],
          missing_fields: [],
          uncertain_fields: [],
          original_transcript: 'Meena Kumari is 3 years old, routine child wellness checkup, weight 13.5 kg, alert and healthy.'
        },
        risk_evaluation: {
          is_high_risk: false,
          danger_flags: []
        },
        sync_status: 'synced',
        created_at: nowIso,
        updated_at: nowIso
      }
    ]);
  }
}

/**
 * Ensures existing historical records have linked patient_ids and synced visit counts.
 * Non-destructive and safe for existing data.
 */
export async function syncPatientsAndVisits(workerId: string) {
  if (!workerId) return;

  const visits = await db.visits.where('worker_id').equals(workerId).toArray();
  const patients = await db.patients.where('worker_id').equals(workerId).toArray();

  const patientMapByName = new Map<string, LocalPatientRecord>();
  patients.forEach((p) => {
    patientMapByName.set(p.name.trim().toLowerCase(), p);
  });

  for (const v of visits) {
    if (!v.patient_id) {
      const pNameLower = v.patient_name.trim().toLowerCase();
      let matchedPatient = patientMapByName.get(pNameLower);

      if (!matchedPatient) {
        const newPatientId = `PAT_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
        const newPatient: LocalPatientRecord = {
          patient_id: newPatientId,
          worker_id: workerId,
          name: v.patient_name,
          category: v.structured_data?.category || 'pregnant_woman',
          village: 'Rampur',
          total_visits: 1,
          latest_risk_status: v.risk_evaluation?.is_high_risk ? 'danger' : 'normal',
          created_at: v.created_at,
          updated_at: v.updated_at
        };
        const id = await db.patients.add(newPatient);
        newPatient.id = id;
        patientMapByName.set(pNameLower, newPatient);
        matchedPatient = newPatient;
      }

      await db.visits.update(v.id!, { patient_id: matchedPatient.patient_id });
    }
  }

  // Update total visits count for all patients accurately
  for (const patient of patientMapByName.values()) {
    const count = await db.visits
      .where('worker_id')
      .equals(workerId)
      .filter((v) => v.patient_id === patient.patient_id || v.patient_name.trim().toLowerCase() === patient.name.trim().toLowerCase())
      .count();

    const latestVisit = await db.visits
      .where('worker_id')
      .equals(workerId)
      .filter((v) => v.patient_id === patient.patient_id || v.patient_name.trim().toLowerCase() === patient.name.trim().toLowerCase())
      .reverse()
      .sortBy('created_at');

    const latestRisk = latestVisit[0]?.risk_evaluation?.is_high_risk ? 'danger' : 'normal';

    if (patient.id) {
      await db.patients.update(patient.id, {
        total_visits: count,
        latest_risk_status: latestRisk
      });
    }
  }
}
