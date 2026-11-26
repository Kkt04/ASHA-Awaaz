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
  }
}

export const db = new AshaDatabase();

// Pre-seed demo patients if empty
export async function seedLocalDemoPatients() {
  const count = await db.patients.count();
  if (count === 0) {
    const now = new Date().toISOString();
    await db.patients.bulkAdd([
      {
        patient_id: 'PAT_001',
        worker_id: 'ASHA_WORKER_001',
        name: 'Sunita Devi',
        category: 'pregnant_woman',
        age: 24,
        village: 'Rampur Ward 3',
        phone: '9871234560',
        total_visits: 1,
        latest_risk_status: 'danger',
        created_at: now,
        updated_at: now
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
        created_at: now,
        updated_at: now
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
        created_at: now,
        updated_at: now
      }
    ]);
  }
}
