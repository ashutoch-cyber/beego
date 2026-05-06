// NutriSnap API - Zero-dependency version for direct Cloudflare deployment
// This version is TypeScript-compatible with proper type annotations

export interface Env {
  DB: D1Database;
  HUGGINGFACE_API_KEY: string;
  USDA_API_KEY: string;
  JWT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/auth/register' && request.method === 'POST') return await handleRegister(request, env);
      if (path === '/api/auth/login' && request.method === 'POST') return await handleLogin(request, env);

      // Public health check and welcome
      if (path === '/health') return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      if (path === '/') return jsonResponse({ message: 'Welcome to NutriSnap API', version: '1.0.0' });

      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) return jsonResponse({ message: 'Unauthorized' }, 401);

      const token = authHeader.split(' ')[1];
      const userId = await verifyToken(token, env.JWT_SECRET);
      if (!userId) return jsonResponse({ message: 'Invalid token' }, 401);

      if (path === '/api/upload' && request.method === 'POST') return await handleUpload(request, env, userId);
      if (path === '/api/detect' && request.method === 'POST') return await handleDetect(request, env);
      if (path === '/api/nutrition' && request.method === 'POST') return await handleNutrition(request, env);
      if (path === '/api/log' && request.method === 'POST') return await handleLog(request, env, userId);
      if (path === '/api/dashboard' && request.method === 'GET') return await handleDashboard(request, env, userId);
      if (path === '/api/history' && request.method === 'GET') return await handleHistory(request, env, userId);
      if (path === '/api/weight') return request.method === 'POST' ? await handleWeight(request, env, userId) : await handleGetWeight(request, env, userId);
      if (path === '/api/water') return request.method === 'POST' ? await handleWater(request, env, userId) : await handleGetWater(request, env, userId);
      if (path === '/api/profile') return request.method === 'GET' ? await handleProfile(request, env, userId) : await handleUpdateProfile(request, env, userId);

      return jsonResponse({ message: 'Not found' }, 404);
    } catch (error: any) {
      return jsonResponse({ message: error.message || 'Internal error' }, 500);
    }
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'nutrisnap-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createToken(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Url = (str: string) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedHeader = base64Url(JSON.stringify(header));
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
  const encodedPayload = base64Url(JSON.stringify({ ...payload, exp }));
  const tokenData = `${encodedHeader}.${encodedPayload}`;
  const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(tokenData));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${tokenData}.${encodedSignature}`;
}

async function verifyToken(token: string, secret: string): Promise<number | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const tokenData = `${headerB64}.${payloadB64}`;
    const base64UrlDecode = (str: string) => atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signature = Uint8Array.from(base64UrlDecode(signatureB64), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', hmacKey, signature, new TextEncoder().encode(tokenData));
    if (!isValid) return null;
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload.userId;
  } catch (e) { return null; }
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json() as any;
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return jsonResponse({ message: 'Email already registered' }, 409);
  const result = await env.DB.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').bind(email, await hashPassword(password)).run();
  const userId = result.meta.last_row_id;
  return jsonResponse({ token: await createToken({ userId, email }, env.JWT_SECRET), userId, email });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json() as any;
  const user = await env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').bind(email).first() as any;
  if (!user || (await hashPassword(password)) !== user.password_hash) return jsonResponse({ message: 'Invalid credentials' }, 401);
  return jsonResponse({ token: await createToken({ userId: user.id, email: user.email }, env.JWT_SECRET), userId: user.id, email: user.email });
}

async function handleUpload(request: Request, env: Env, userId: number): Promise<Response> {
  // Since R2 is disabled, we don't save the image. 
  // We'll just return a success message. The frontend will pass the image to /api/detect next.
  return jsonResponse({ message: 'Image received (not saved)', key: 'temporary' });
}

async function handleDetect(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';
  let body;
  
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    body = await image.arrayBuffer();
  } else {
    const { imageUrl } = await request.json() as any;
    // If it's a URL, we'd need to fetch it, but without R2 we'll mostly be receiving direct uploads
    if (imageUrl && imageUrl.startsWith('http')) {
      const res = await fetch(imageUrl);
      body = await res.arrayBuffer();
    }
  }

  if (!body) return jsonResponse({ message: 'No image data' }, 400);

  const res = await fetch('https://api-inference.huggingface.co/models/nateraw/food', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/octet-stream' },
    body: body,
  });
  const result = await res.json() as any;
  const top = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0][0] : result[0]) : result;
  return jsonResponse({ label: top?.label || 'unknown food', score: top?.score || 0.5 });
}

async function handleNutrition(request: Request, env: Env): Promise<Response> {
  const { foodName } = await request.json() as any;
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${env.USDA_API_KEY}`);
  const data = await res.json() as any;
  const f = data.foods?.[0];
  return jsonResponse({
    food_name: f?.description || foodName,
    calories: Math.round(f?.foodNutrients?.find((n: any) => n.nutrientName?.includes('Energy'))?.value || 200),
    protein: f?.foodNutrients?.find((n: any) => n.nutrientName?.includes('Protein'))?.value || 0,
    carbs: f?.foodNutrients?.find((n: any) => n.nutrientName?.includes('Carbohydrate'))?.value || 0,
    fat: f?.foodNutrients?.find((n: any) => n.nutrientName?.includes('Total lipid'))?.value || 0,
  });
}

async function handleLog(request: Request, env: Env, userId: number): Promise<Response> {
  const data = await request.json() as any;
  const result = await env.DB.prepare('INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, date) VALUES (?, ?, ?, ?, ?, ?, date(\'now\'))')
    .bind(userId, data.food_name, data.calories, data.protein || 0, data.carbs || 0, data.fat || 0).run();
  return jsonResponse({ id: result.meta.last_row_id });
}

async function handleDashboard(request: Request, env: Env, userId: number): Promise<Response> {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first() as any;
  const totals = await env.DB.prepare('SELECT SUM(calories) as cal FROM meals WHERE user_id = ? AND date = date(\'now\')').bind(userId).first() as any;
  const meals = await env.DB.prepare('SELECT * FROM meals WHERE user_id = ? AND date = date(\'now\') ORDER BY created_at DESC LIMIT 5').bind(userId).all();
  return jsonResponse({ today_calories: totals?.cal || 0, calorie_goal: user?.calorie_goal || 2000, recent_meals: meals.results || [] });
}

async function handleHistory(request: Request, env: Env, userId: number): Promise<Response> {
  const date = new URL(request.url).searchParams.get('date') || new Date().toISOString().split('T')[0];
  const meals = await env.DB.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ?').bind(userId, date).all();
  return jsonResponse({ meals: meals.results || [] });
}

async function handleWeight(request: Request, env: Env, userId: number): Promise<Response> {
  const { weight } = await request.json() as any;
  await env.DB.prepare('INSERT INTO weight_logs (user_id, weight, date) VALUES (?, ?, date(\'now\'))').bind(userId, weight).run();
  return jsonResponse({ message: 'Logged' });
}

async function handleGetWeight(request: Request, env: Env, userId: number): Promise<Response> {
  const res = await env.DB.prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT 30').bind(userId).all();
  return jsonResponse({ weights: res.results || [] });
}

async function handleWater(request: Request, env: Env, userId: number): Promise<Response> {
  const { amount } = await request.json() as any;
  await env.DB.prepare('INSERT INTO water_logs (user_id, amount, date) VALUES (?, ?, date(\'now\'))').bind(userId, amount).run();
  return jsonResponse({ message: 'Logged' });
}

async function handleGetWater(request: Request, env: Env, userId: number): Promise<Response> {
  const res = await env.DB.prepare('SELECT SUM(amount) as total FROM water_logs WHERE user_id = ? AND date = date(\'now\')').bind(userId).first() as any;
  return jsonResponse({ total: res?.total || 0 });
}

async function handleProfile(request: Request, env: Env, userId: number): Promise<Response> {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  return jsonResponse(user);
}

async function handleUpdateProfile(request: Request, env: Env, userId: number): Promise<Response> {
  const data = await request.json() as any;
  const fields = Object.keys(data).filter(k => ['calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal', 'water_goal', 'weight_goal'].includes(k));
  await env.DB.prepare(`UPDATE users SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`).bind(...fields.map(f => data[f]), userId).run();
  return jsonResponse({ message: 'Updated' });
}
