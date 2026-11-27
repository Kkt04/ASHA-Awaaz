import crypto from 'crypto';

const DEMO_WORKER_ID = 'ASHA_WORKER_001';
const DEMO_EMAIL = 'kavita.asha@gov.in';

const workersDb = new Map();

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

export default async function handler(req, res) {
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

  // 6. Logout
  if ((path === '/api/v1/auth/logout' || path === '/api/auth/logout') && req.method === 'POST') {
    return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
  }

  // Fallback
  return sendJson(res, 404, {
    success: false,
    detail: `Endpoint '${path}' not found.`
  });
}
