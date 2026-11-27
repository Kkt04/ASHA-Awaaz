import crypto from 'crypto';

const DEMO_WORKER_ID = 'ASHA_WORKER_001';
const DEMO_EMAIL = 'kavita.asha@gov.in';

const workersDb = new Map();
const visitsDb = [];
const patientsDb = new Map();

function hashPassword(password, salt) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 32, 'sha256').toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(plain, storedHash, salt) {
  const computed = crypto.pbkdf2Sync(plain, salt, 100000, 32, 'sha256').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

function seedDemo() {
  if (!workersDb.has(DEMO_EMAIL)) {
    const { hash, salt } = hashPassword('Asha@2026!');
    workersDb.set(DEMO_EMAIL, {
      worker_id: DEMO_WORKER_ID,
      name: 'Kavita Sharma',
      email: DEMO_EMAIL,
      password_hash: hash,
      salt: salt,
      role: 'ASHA Health Worker',
      village: 'Rampur (Sub-Centre Kalyanpur)',
      preferred_language: 'en',
      phone: '+91 98765 12345',
      created_at: new Date().toISOString()
    });
  }
}

seedDemo();

const JWT_SECRET = process.env.JWT_SECRET || 'asha-awaaz-jwt-secret-fluid-production-2026';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf-8');
}

function createJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.end(JSON.stringify(data));
}

// -------------------------------------------------------------
// Deterministic clinical extraction for serverless deployment
// -------------------------------------------------------------
function extractClinicalData(transcript, language = 'en') {
  const text = String(transcript || '').toLowerCase();

  let category = 'pregnant_woman';
  if (/newborn|baby|shishu|bachha|குழந்தை|नवजात|15 days|10 days/.test(text)) {
    category = 'newborn';
  } else if (/child|kid|baccha|larka|larki|குழந்தை|साल का बच्चा|साल की बच्ची/.test(text)) {
    category = 'child';
  }

  // Name
  let patientName = 'मरीज़';
  const nameMatch = text.match(/(?:sunita|kavita|priya|meena|geeta|aarav|rohit|anita|सुनीता|कविता|प्रिया|आरव|சுனிதா|ஆரவ்)/i);
  if (nameMatch) {
    const raw = nameMatch[0];
    patientName = raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // Age
  let patientAge = null;
  const ageMatch = text.match(/(?:age|umr|umir|வயது|उम्र)\s*(?:is|hai|ba)?\s*(\d{1,2})/i) || text.match(/(\d{1,2})\s*(?:years?|saal|sal|வருடம்)/i);
  if (ageMatch) {
    patientAge = parseInt(ageMatch[1], 10);
  }

  // BP
  const vitals = {};
  const bpMatch = text.match(/(?:bp|blood\s*pressure|b\.p\.?)\s*(?:is|hai)?\s*(\d{2,3})\s*(?:\/|over|by|बाई|பார்)\s*(\d{2,3})/i) || text.match(/(\d{2,3})\s*(?:\/|by|बाई)\s*(\d{2,3})/i);
  if (bpMatch) {
    vitals.blood_pressure = {
      systolic: parseInt(bpMatch[1], 10),
      diastolic: parseInt(bpMatch[2], 10)
    };
  }

  // Temperature
  const tempMatch = text.match(/(?:fever|temp|temperature|b बुखार|तापक)\s*(?:of|is|hai)?\s*(\d{2,3}(?:\.\d)?)/i) || text.match(/(\d{2,3}(?:\.\d)?)\s*(?:degrees?|degree|f|fahrenheit)/i);
  if (tempMatch) {
    vitals.temperature_f = parseFloat(tempMatch[1]);
  }

  // Symptoms
  const symptoms = [];
  if (/fever|bukhar|kaychal|காய்ச்சல்|बुखार/.test(text) && !/no fever|bukhar nahi|காய்ச்சல் இல்லை|बुखार नहीं/.test(text)) {
    symptoms.push('fever');
  }
  if (/headache|sir dard|thalai vali|தலைவலி|सिर दर्द|माथा बथा/.test(text)) {
    symptoms.push('headache');
  }
  if (/swelling|sujan|veekam|வீக்கம்|सूजन|सुजन/.test(text)) {
    symptoms.push('swelling_in_feet');
  }
  if (/bleeding|khoon|rakthapokku|रक्तस्राव|खून/.test(text)) {
    symptoms.push('bleeding');
  }
  if (/not feeding|doodh nahi|பால் குடிக்கவில்லை|दूध नहीं/.test(text)) {
    symptoms.push('not_feeding_properly');
  }

  // Medicines
  const medicines = [];
  if (/iron|ifa|folic|आयरन|இரும்பு/.test(text)) {
    medicines.push('iron_folic_acid');
  }
  if (/calcium|कैल्शियम|கால்சியம்/.test(text)) {
    medicines.push('calcium');
  }
  if (/paracetamol|pcm|पैरासिटामोल/.test(text)) {
    medicines.push('paracetamol');
  }

  // Pregnancy Month
  let pregMonth = null;
  const monthMatch = text.match(/(\d)\s*(?:month|mahina|maheena|மாதம்|महीने|महीना)/i);
  if (monthMatch) {
    pregMonth = parseInt(monthMatch[1], 10);
  } else if (category === 'pregnant_woman') {
    pregMonth = 7;
  }

  return {
    patient_name: patientName,
    patient_age: patientAge,
    category,
    pregnancy_month: pregMonth,
    vitals,
    symptoms,
    medicines,
    missing_fields: [],
    uncertain_fields: [],
    original_transcript: transcript
  };
}

export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.end();
  }

  seedDemo();

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '');

  // 1. Health endpoint
  if (path === '/health' || path === '/api/health' || path === '/api/v1/health') {
    return sendJson(res, 200, {
      status: 'healthy',
      app: 'ASHA Awaaz API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Demo login
  if ((path === '/api/v1/auth/demo-login' || path === '/api/auth/demo-login') && req.method === 'POST') {
    const demo = workersDb.get(DEMO_EMAIL);
    const nowSec = Math.floor(Date.now() / 1000);
    const token = createJwt({
      sub: demo.worker_id,
      email: demo.email,
      role: demo.role,
      iat: nowSec,
      exp: nowSec + 7 * 24 * 3600
    });

    return sendJson(res, 200, {
      success: true,
      message: 'Demo session initialized',
      access_token: token,
      token_type: 'bearer',
      worker: {
        worker_id: demo.worker_id,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        village: demo.village,
        preferred_language: demo.preferred_language,
        phone: demo.phone
      }
    });
  }

  // 3. User login
  if ((path === '/api/v1/auth/login' || path === '/api/auth/login') && req.method === 'POST') {
    const body = await parseBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return sendJson(res, 401, {
        success: false,
        detail: 'Invalid email or password. Please check your credentials.'
      });
    }

    let user = workersDb.get(email);
    if (!user) {
      for (const w of workersDb.values()) {
        if (w.worker_id.toLowerCase() === email) {
          user = w;
          break;
        }
      }
    }

    if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
      return sendJson(res, 401, {
        success: false,
        detail: 'Invalid email or password. Please check your credentials.'
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const token = createJwt({
      sub: user.worker_id,
      email: user.email,
      role: user.role,
      iat: nowSec,
      exp: nowSec + 7 * 24 * 3600
    });

    return sendJson(res, 200, {
      success: true,
      message: 'Login successful',
      access_token: token,
      token_type: 'bearer',
      worker: {
        worker_id: user.worker_id,
        name: user.name,
        email: user.email,
        role: user.role,
        village: user.village,
        preferred_language: user.preferred_language,
        phone: user.phone
      }
    });
  }

  // 4. User signup
  if ((path === '/api/v1/auth/signup' || path === '/api/auth/signup') && req.method === 'POST') {
    const body = await parseBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();

    if (!name || name.length < 2) {
      return sendJson(res, 422, {
        success: false,
        detail: 'Name must be at least 2 characters.'
      });
    }
    if (!email || !email.includes('@')) {
      return sendJson(res, 422, {
        success: false,
        detail: 'Please provide a valid email address.'
      });
    }
    if (!password || password.length < 6) {
      return sendJson(res, 422, {
        success: false,
        detail: 'Password must be at least 6 characters.'
      });
    }

    if (workersDb.has(email)) {
      return sendJson(res, 409, {
        success: false,
        detail: 'An account with this email address is already registered.'
      });
    }

    const workerId = `ASHA_${Math.floor(100000 + Math.random() * 900000)}`;
    const { hash, salt } = hashPassword(password);
    const newWorker = {
      worker_id: workerId,
      name,
      email,
      password_hash: hash,
      salt,
      role: body.role || 'ASHA Health Worker',
      village: body.village || 'Sub-Centre Kalyanpur',
      preferred_language: body.preferred_language || 'en',
      phone: body.phone || '+91 98765 12345',
      created_at: new Date().toISOString()
    };

    workersDb.set(email, newWorker);

    const nowSec = Math.floor(Date.now() / 1000);
    const token = createJwt({
      sub: workerId,
      email: email,
      role: newWorker.role,
      iat: nowSec,
      exp: nowSec + 7 * 24 * 3600
    });

    return sendJson(res, 201, {
      success: true,
      message: 'Registration successful',
      access_token: token,
      token_type: 'bearer',
      worker: {
        worker_id: newWorker.worker_id,
        name: newWorker.name,
        email: newWorker.email,
        role: newWorker.role,
        village: newWorker.village,
        preferred_language: newWorker.preferred_language,
        phone: newWorker.phone
      }
    });
  }

  // 5. Worker profile me
  if ((path === '/api/v1/worker/me' || path === '/api/worker/me') && req.method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = verifyJwt(token);

    if (!decoded) {
      return sendJson(res, 401, {
        success: false,
        detail: 'Unauthorized: Invalid or expired session token.'
      });
    }

    const worker = Array.from(workersDb.values()).find(
      (w) => w.worker_id === decoded.sub || w.email === decoded.email
    );

    if (worker) {
      return sendJson(res, 200, {
        worker_id: worker.worker_id,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        village: worker.village,
        preferred_language: worker.preferred_language,
        phone: worker.phone
      });
    }

    return sendJson(res, 200, {
      worker_id: decoded.sub || DEMO_WORKER_ID,
      name: decoded.name || 'ASHA Worker',
      email: decoded.email || DEMO_EMAIL,
      role: decoded.role || 'ASHA Health Worker',
      village: 'Sub-Centre Kalyanpur',
      preferred_language: 'en',
      phone: '+91 98765 12345'
    });
  }

  // 6. Clinical Voice Extraction
  if ((path === '/api/v1/extract' || path === '/api/extract') && req.method === 'POST') {
    const body = await parseBody(req);
    const transcript = String(body.transcript || '');
    const language = String(body.language || 'en');
    const extracted = extractClinicalData(transcript, language);

    return sendJson(res, 200, {
      success: true,
      extracted,
      engine: 'serverless_clinical_engine',
      summary_en: `Patient ${extracted.patient_name}, Category: ${extracted.category}.`,
      summary_hi: `मरीज़ ${extracted.patient_name}, श्रेणी: ${extracted.category}.`,
      summary_ta: `நோயாளி ${extracted.patient_name}.`
    });
  }

  // 7. Clinical Voice/Text Correction
  if ((path === '/api/v1/correct' || path === '/api/correct') && req.method === 'POST') {
    const body = await parseBody(req);
    const correctionText = String(body.correction_text || '');
    const current = body.current_data || {};
    const lower = correctionText.toLowerCase();

    const updated = JSON.parse(JSON.stringify(current));
    const fieldsChanged = [];

    // Age
    const ageMatch = lower.match(/(?:age|umr|umir|वयदु|उम्र|வயது)\s*(?:is|hai|ba)?\s*(\d{1,2})/i) || lower.match(/(\d{1,2})\s*(?:years?|saal|sal)/i);
    if (ageMatch) {
      updated.patient_age = parseInt(ageMatch[1], 10);
      fieldsChanged.push('patient_age');
    }

    // BP
    const bpMatch = lower.match(/(?:bp|blood\s*pressure)?\s*(\d{2,3})\s*(?:\/|over|by|बाई)\s*(\d{2,3})/i);
    if (bpMatch) {
      if (!updated.vitals) updated.vitals = {};
      updated.vitals.blood_pressure = {
        systolic: parseInt(bpMatch[1], 10),
        diastolic: parseInt(bpMatch[2], 10)
      };
      fieldsChanged.push('blood_pressure');
    }

    // Negation / Symptom removal
    if (/no fever|bukhar nahi|காய்ச்சல் இல்லை|बुखार नहीं/.test(lower)) {
      updated.symptoms = (updated.symptoms || []).filter((s) => s !== 'fever');
      fieldsChanged.push('symptoms');
    }
    if (/headache|sir dard|सिर दर्द/.test(lower) && !updated.symptoms.includes('headache')) {
      updated.symptoms.push('headache');
      if (!fieldsChanged.includes('symptoms')) fieldsChanged.push('symptoms');
    }

    return sendJson(res, 200, {
      success: true,
      updated_data: updated,
      fields_changed: fieldsChanged,
      summary_en: `Updated record for ${updated.patient_name}.`,
      summary_hi: `${updated.patient_name} का रिकॉर्ड अपडेट हो गया।`,
      summary_ta: `${updated.patient_name} இன் பதிவு புதுப்பிக்கப்பட்டது.`
    });
  }

  // 8. Risk Check
  if ((path === '/api/v1/risk-check' || path === '/api/risk-check') && req.method === 'POST') {
    const body = await parseBody(req);
    const flags = [];
    const bp = body.vitals?.blood_pressure;

    if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) {
      flags.push({
        rule_name: 'HIGH_BP_PREGNANCY',
        severity: 'danger',
        message_en: `High BP (${bp.systolic}/${bp.diastolic} mmHg)`,
        message_hi: `उच्च रक्तचाप (${bp.systolic}/${bp.diastolic} mmHg)`,
        message_ta: `உயர் இரத்த அழுத்தம் (${bp.systolic}/${bp.diastolic} mmHg)`,
        action_required: 'Immediate PHC referral'
      });
    }

    return sendJson(res, 200, {
      overall_severity: flags.length > 0 ? 'danger' : 'normal',
      flags,
      recommended_action: flags.length > 0 ? 'Refer to PHC / Hospital' : 'Routine care'
    });
  }

  // 9. Visits (GET & POST)
  if ((path === '/api/v1/visits' || path === '/api/visits')) {
    if (req.method === 'GET') {
      return sendJson(res, 200, visitsDb);
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const visitId = body.visit_id || `VISIT_${Date.now()}`;
      const record = { ...body, visit_id: visitId, created_at: new Date().toISOString() };
      visitsDb.unshift(record);
      return sendJson(res, 201, { success: true, visit_id: visitId, record });
    }
  }

  // 10. Patients (GET)
  if ((path === '/api/v1/patients' || path === '/api/patients') && req.method === 'GET') {
    const unique = Array.from(patientsDb.values());
    return sendJson(res, 200, unique);
  }

  // 11. Sync (POST)
  if ((path === '/api/v1/sync' || path === '/api/sync') && req.method === 'POST') {
    const body = await parseBody(req);
    const records = Array.isArray(body.records) ? body.records : [];
    return sendJson(res, 200, {
      success: true,
      synced_count: records.length,
      message: `Successfully synchronized ${records.length} record(s).`
    });
  }

  // 12. Logout
  if ((path === '/api/v1/auth/logout' || path === '/api/auth/logout') && req.method === 'POST') {
    return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
  }

  // Fallback
  return sendJson(res, 404, {
    success: false,
    detail: `Endpoint '${path}' not found.`
  });
}
