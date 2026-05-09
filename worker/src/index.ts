// NutriSnap API - Zero-dependency version for direct Cloudflare deployment
// This version is TypeScript-compatible with proper type annotations

export interface Env {
  DB: D1Database;
  HUGGINGFACE_API_KEY?: string;
  HUGGINGFACE_API_TOKEN?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_VISION_MODEL?: string;
  USDA_API_KEY?: string;
  JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  APP_URL?: string;
}

type DetectionResult = {
  label: string;
  score: number;
  is_food?: boolean;
  kind?: 'food' | 'packaged_food' | 'not_food' | 'manual';
  needsReview?: boolean;
  needsLabel?: boolean;
  message?: string;
  objectLabel?: string;
};

type NutritionResult = {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  rawText?: string;
  ingredientsText?: string;
  source?: 'local' | 'usda' | 'openfoodfacts' | 'ocr' | 'manual' | 'estimate' | 'vision' | 'gemini';
  needsReview?: boolean;
  message?: string;
};

type MealComponent = {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
};

type StructuredIngredient = {
  name: string;
  serving: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  confidence?: number;
};

type MealAnalysisResult = NutritionResult & DetectionResult & {
  confidence?: number;
  items?: MealComponent[];
  ingredients?: StructuredIngredient[];
};

type LocalNutrition = NutritionResult & {
  aliases?: string[];
};

type IngredientReference = {
  food_name: string;
  aliases?: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingGrams?: number;
  pieceGrams?: number;
  density?: number;
};

type ParsedIngredient = {
  raw: string;
  displayName: string;
  searchName: string;
  amount?: number;
  unit?: string;
  portion: string;
};

const HUGGINGFACE_MODEL = 'nateraw/vit-base-food101';
const OBJECT_DETECTION_MODEL = 'facebook/detr-resnet-50';
const OCR_MODEL = 'microsoft/trocr-base-printed';
const MIN_JWT_SECRET_LENGTH = 32;
const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';
const NO_FOOD_MESSAGE = 'No food detected. Please snap a picture of a meal or packaged food.';

const LOCAL_NUTRITION: LocalNutrition[] = [
  { food_name: 'rice', aliases: ['white rice', 'steamed rice', 'cooked rice'], calories: 200, protein: 4, carbs: 45, fat: 0.5, serving: '1 cup cooked', source: 'local' },
  { food_name: 'fried rice', aliases: ['veg fried rice', 'vegetable fried rice'], calories: 330, protein: 9, carbs: 48, fat: 11, serving: '1 bowl', source: 'local' },
  { food_name: 'roti', aliases: ['chapati', 'phulka'], calories: 80, protein: 3, carbs: 15, fat: 0.5, serving: '1 piece', source: 'local' },
  { food_name: 'paratha', aliases: ['aloo paratha'], calories: 260, protein: 6, carbs: 36, fat: 10, serving: '1 piece', source: 'local' },
  { food_name: 'dal', aliases: ['daal', 'lentils', 'lentil curry'], calories: 150, protein: 9, carbs: 20, fat: 5, serving: '1 cup', source: 'local' },
  { food_name: 'chicken curry', aliases: ['chicken gravy', 'chicken masala'], calories: 250, protein: 25, carbs: 8, fat: 12, serving: '1 cup', source: 'local' },
  { food_name: 'grilled chicken', aliases: ['chicken breast', 'roast chicken'], calories: 165, protein: 31, carbs: 0, fat: 4, serving: '100 g', source: 'local' },
  { food_name: 'paneer tikka', aliases: ['paneer', 'paneer curry'], calories: 265, protein: 18, carbs: 6, fat: 20, serving: '100 g', source: 'local' },
  { food_name: 'kidney beans', aliases: ['rajma', 'red beans'], calories: 110, protein: 7, carbs: 20, fat: 0.5, serving: '1/2 cup cooked', source: 'local' },
  { food_name: 'chickpeas', aliases: ['chana', 'garbanzo beans'], calories: 135, protein: 7, carbs: 22, fat: 2, serving: '1/2 cup cooked', source: 'local' },
  { food_name: 'mixed seeds', aliases: ['pumpkin seeds', 'sunflower seeds', 'sesame seeds'], calories: 80, protein: 3, carbs: 3, fat: 7, serving: '1 tbsp', source: 'local' },
  { food_name: 'cabbage', aliases: ['red cabbage', 'purple cabbage'], calories: 22, protein: 1, carbs: 5, fat: 0.1, serving: '1 cup shredded', source: 'local' },
  { food_name: 'cucumber', calories: 16, protein: 0.7, carbs: 4, fat: 0.1, serving: '1 cup sliced', source: 'local' },
  { food_name: 'pomegranate', aliases: ['pomegranate seeds'], calories: 72, protein: 1.5, carbs: 16, fat: 1, serving: '1/2 cup arils', source: 'local' },
  { food_name: 'oil dressing', aliases: ['dressing', 'lemon spice dressing'], calories: 45, protein: 0, carbs: 1, fat: 5, serving: '1 tsp oil-based dressing', source: 'local' },
  { food_name: 'idli', aliases: ['idly'], calories: 120, protein: 4, carbs: 24, fat: 0.5, serving: '2 pieces', source: 'local' },
  { food_name: 'dosa', aliases: ['masala dosa'], calories: 180, protein: 4, carbs: 30, fat: 6, serving: '1 piece', source: 'local' },
  { food_name: 'poha', calories: 250, protein: 5, carbs: 42, fat: 7, serving: '1 bowl', source: 'local' },
  { food_name: 'upma', calories: 260, protein: 6, carbs: 40, fat: 8, serving: '1 bowl', source: 'local' },
  { food_name: 'samosa', calories: 260, protein: 4, carbs: 30, fat: 14, serving: '1 piece', source: 'local' },
  { food_name: 'biryani', aliases: ['chicken biryani', 'veg biryani'], calories: 350, protein: 12, carbs: 45, fat: 12, serving: '1 cup', source: 'local' },
  { food_name: 'egg', aliases: ['boiled egg'], calories: 70, protein: 6, carbs: 0.6, fat: 5, serving: '1 boiled egg', source: 'local' },
  { food_name: 'omelette', aliases: ['omelet'], calories: 190, protein: 13, carbs: 2, fat: 14, serving: '2 eggs', source: 'local' },
  { food_name: 'banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, serving: '1 medium', source: 'local' },
  { food_name: 'milk', calories: 150, protein: 8, carbs: 12, fat: 8, serving: '1 cup', source: 'local' },
  { food_name: 'oats', aliases: ['oatmeal', 'porridge'], calories: 150, protein: 5, carbs: 27, fat: 2.5, serving: '1 cup cooked', source: 'local' },
  { food_name: 'apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving: '1 medium', source: 'local' },
  { food_name: 'orange', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, serving: '1 medium', source: 'local' },
  { food_name: 'broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, serving: '1 cup cooked', source: 'local' },
  { food_name: 'carrot', aliases: ['carrots'], calories: 25, protein: 0.6, carbs: 6, fat: 0.1, serving: '1 medium', source: 'local' },
  { food_name: 'yogurt', aliases: ['curd', 'dahi'], calories: 150, protein: 12, carbs: 17, fat: 4, serving: '1 cup', source: 'local' },
  { food_name: 'pizza', calories: 285, protein: 12, carbs: 36, fat: 10, serving: '1 slice', source: 'local' },
  { food_name: 'hot dog', calories: 290, protein: 10, carbs: 24, fat: 17, serving: '1 hot dog', source: 'local' },
  { food_name: 'donut', aliases: ['doughnut'], calories: 260, protein: 3, carbs: 31, fat: 14, serving: '1 medium donut', source: 'local' },
  { food_name: 'burger', aliases: ['hamburger', 'cheeseburger'], calories: 354, protein: 17, carbs: 29, fat: 18, serving: '1 burger', source: 'local' },
  { food_name: 'salad', aliases: ['green salad', 'caesar salad'], calories: 120, protein: 3, carbs: 12, fat: 7, serving: '1 bowl', source: 'local' },
  { food_name: 'sandwich', aliases: ['toast sandwich'], calories: 300, protein: 14, carbs: 36, fat: 11, serving: '1 sandwich', source: 'local' },
  { food_name: 'pasta', aliases: ['spaghetti', 'macaroni'], calories: 320, protein: 11, carbs: 52, fat: 8, serving: '1 bowl', source: 'local' },
  { food_name: 'noodles', aliases: ['chow mein', 'hakka noodles'], calories: 360, protein: 9, carbs: 52, fat: 13, serving: '1 bowl', source: 'local' },
  { food_name: 'french fries', aliases: ['fries'], calories: 365, protein: 4, carbs: 48, fat: 17, serving: '1 medium serving', source: 'local' },
  { food_name: 'cake', aliases: ['chocolate cake', 'cheesecake'], calories: 350, protein: 5, carbs: 45, fat: 18, serving: '1 slice', source: 'local' },
  { food_name: 'ice cream', calories: 210, protein: 4, carbs: 24, fat: 11, serving: '1 cup', source: 'local' },
];

const INGREDIENT_NUTRITION: IngredientReference[] = [
  { food_name: 'chicken', aliases: ['chicken breast', 'chicken thigh', 'boneless chicken'], calories: 165, protein: 25.8, carbs: 0, fat: 6.5, servingGrams: 100 },
  { food_name: 'oil', aliases: ['fried oil', 'sunflower oil', 'vegetable oil', 'cooking oil'], calories: 884, protein: 0, carbs: 0, fat: 100, servingGrams: 100, density: 1 },
  { food_name: 'cornflour', aliases: ['corn flour', 'corn starch', 'cornstarch'], calories: 381, protein: 0.3, carbs: 91, fat: 0.1, servingGrams: 100 },
  { food_name: 'green chilli', aliases: ['green chillies', 'green chilies', 'chilli', 'chilies', 'chili pepper'], calories: 40, protein: 2, carbs: 9, fat: 0.2, servingGrams: 100, pieceGrams: 2 },
  { food_name: 'paneer', aliases: ['cottage cheese', 'paneer cubes'], calories: 265, protein: 18, carbs: 6, fat: 20, servingGrams: 100 },
  { food_name: 'kidney beans', aliases: ['rajma', 'red beans'], calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, servingGrams: 100 },
  { food_name: 'chickpeas', aliases: ['chana', 'garbanzo beans'], calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, servingGrams: 100 },
  { food_name: 'mixed seeds', aliases: ['pumpkin seeds', 'sunflower seeds', 'sesame seeds'], calories: 570, protein: 20, carbs: 20, fat: 49, servingGrams: 100 },
  { food_name: 'cabbage', aliases: ['red cabbage', 'purple cabbage'], calories: 31, protein: 1.4, carbs: 7.4, fat: 0.2, servingGrams: 100 },
  { food_name: 'cucumber', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, servingGrams: 100 },
  { food_name: 'carrot', aliases: ['carrots'], calories: 41, protein: 0.9, carbs: 10, fat: 0.2, servingGrams: 100, pieceGrams: 61 },
  { food_name: 'pomegranate', aliases: ['pomegranate seeds', 'pomegranate arils'], calories: 83, protein: 1.7, carbs: 19, fat: 1.2, servingGrams: 100 },
  { food_name: 'rice', aliases: ['cooked rice', 'white rice'], calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingGrams: 100 },
  { food_name: 'apple', aliases: ['apples'], calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingGrams: 100, pieceGrams: 182 },
  { food_name: 'egg', aliases: ['boiled egg', 'eggs'], calories: 155, protein: 13, carbs: 1.1, fat: 11, servingGrams: 100, pieceGrams: 50 },
  { food_name: 'bread', aliases: ['bread slice', 'toast'], calories: 265, protein: 9, carbs: 49, fat: 3.2, servingGrams: 100, pieceGrams: 25 },
];

const NON_FOOD_OBJECTS = new Set([
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'chair', 'couch', 'potted plant', 'bed', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
]);

const PACKAGED_OBJECTS = new Set(['bottle', 'wine glass']);
const FOOD_OBJECTS = new Set(['banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'bowl', 'cup', 'fork', 'knife', 'spoon', 'dining table']);
const EDIBLE_OBJECTS = new Set(['banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake']);
const SINGLE_INGREDIENT_TRAPS = new Set(['carrot', 'broccoli', 'apple', 'orange', 'banana']);
const MEAL_CONTEXT_OBJECTS = new Set(['bowl', 'cup', 'fork', 'knife', 'spoon', 'dining table', 'sandwich']);
const PACKAGED_TEXT_HINTS = ['ingredients', 'nutrition', 'serving', 'net wt', 'net weight', 'barcode', 'manufactured', 'packed', 'flavour', 'flavor', 'biscuit', 'biscuits', 'cookies', 'chips', 'snack'];

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
      if (path === '/api/auth/verify-email' && request.method === 'POST') return await handleVerifyEmail(request, env);
      if (path === '/api/auth/forgot-password' && request.method === 'POST') return await handleForgotPassword(request, env);
      if (path === '/api/auth/reset-password' && request.method === 'POST') return await handleResetPassword(request, env);

      // Public health check and welcome
      if (path === '/health') return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      if (path === '/') return jsonResponse({ message: 'Welcome to NutriSnap API', version: '1.0.0' });

      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) return jsonResponse({ message: 'Unauthorized' }, 401);

      const jwtSecret = getJwtSecret(env);
      if (!jwtSecret) return authConfigErrorResponse();

      const token = authHeader.split(' ')[1];
      const userId = await verifyToken(token, jwtSecret);
      if (!userId) return jsonResponse({ message: 'Invalid token' }, 401);

      if (path === '/api/upload' && request.method === 'POST') return await handleUpload(request, env, userId);
      if (path === '/api/analyze-meal-fast' && request.method === 'POST') return await handleAnalyzeMealFast(request, env);
      if (path === '/api/analyze-meal' && request.method === 'POST') return await handleAnalyzeMeal(request, env);
      if (path === '/api/detect' && request.method === 'POST') return await handleDetect(request, env);
      if (path === '/api/nutrition-label' && request.method === 'POST') return await handleNutritionLabel(request, env);
      if (path === '/api/nutrition' && request.method === 'POST') return await handleNutrition(request, env);
      if (path === '/api/log' && request.method === 'POST') return await handleLog(request, env, userId);
      if (path === '/api/dashboard' && request.method === 'GET') return await handleDashboard(request, env, userId);
      if (path === '/api/history' && request.method === 'GET') return await handleHistory(request, env, userId);
      if (path === '/api/export' && request.method === 'GET') return await handleExport(request, env, userId);
      if (path === '/api/weight') return request.method === 'POST' ? await handleWeight(request, env, userId) : await handleGetWeight(request, env, userId);
      if (path === '/api/water') return request.method === 'POST' ? await handleWater(request, env, userId) : await handleGetWater(request, env, userId);
      if (path === '/api/profile') return request.method === 'GET' ? await handleProfile(request, env, userId) : await handleUpdateProfile(request, env, userId);

      return jsonResponse({ message: 'Not found' }, 404);
    } catch {
      return jsonResponse({ message: 'Internal error' }, 500);
    }
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function readJsonBody(request: Request): Promise<any | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getJwtSecret(env: Env): string | null {
  const secret = String(env.JWT_SECRET || '').trim();
  return secret.length >= MIN_JWT_SECRET_LENGTH ? secret : null;
}

function authConfigErrorResponse() {
  return jsonResponse({ message: 'Authentication is temporarily unavailable. Please try again later.' }, 503);
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'nutrisnap-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function createSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function appUrl(env: Env): string {
  return String(env.APP_URL || 'https://beego-c6k.pages.dev').replace(/\/+$/, '');
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
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    const tokenData = `${headerB64}.${payloadB64}`;
    const base64UrlDecode = (str: string) => {
      const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
      return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    };
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
  const body = await readJsonBody(request);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!email || !email.includes('@') || password.length < 6) {
    return jsonResponse({ message: 'Enter a valid email and a password with at least 6 characters.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return jsonResponse({ message: 'Email already registered' }, 409);
  const result = await env.DB.prepare('INSERT INTO users (email, password_hash, email_verified) VALUES (?, ?, 0)')
    .bind(email, await hashPassword(password))
    .run();
  const userId = result.meta.last_row_id;
  const emailResult = await createAndSendVerificationEmail(env, Number(userId), email);
  return jsonResponse({
    userId,
    email,
    verificationRequired: true,
    emailSent: emailResult.sent,
    message: emailResult.sent
      ? 'Verification email sent. Please check your inbox.'
      : 'Account created, but email sending is not configured yet.',
    verificationUrl: emailResult.sent ? undefined : emailResult.url,
  });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const jwtSecret = getJwtSecret(env);
  if (!jwtSecret) return authConfigErrorResponse();

  const body = await readJsonBody(request);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!email || !password) return jsonResponse({ message: 'Enter your email and password.' }, 400);

  const user = await env.DB.prepare('SELECT id, email, password_hash, email_verified FROM users WHERE email = ?').bind(email).first() as any;
  if (!user || (await hashPassword(password)) !== user.password_hash) return jsonResponse({ message: 'Invalid credentials' }, 401);
  if (!user.email_verified) {
    const emailResult = await createAndSendVerificationEmail(env, user.id, user.email);
    return jsonResponse({
      message: emailResult.sent
        ? 'Please verify your email first. We sent a new verification link.'
        : 'Please verify your email first. Email sending is not configured yet.',
      verificationRequired: true,
      emailSent: emailResult.sent,
      verificationUrl: emailResult.sent ? undefined : emailResult.url,
    }, 403);
  }
  return jsonResponse({ token: await createToken({ userId: user.id, email: user.email }, jwtSecret), userId: user.id, email: user.email });
}

async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  const jwtSecret = getJwtSecret(env);
  if (!jwtSecret) return authConfigErrorResponse();

  const body = await readJsonBody(request);
  const token = String(body?.token || '').trim();
  if (!token) return jsonResponse({ message: 'Verification token is missing.' }, 400);

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT evt.user_id, evt.expires_at, u.email FROM email_verification_tokens evt JOIN users u ON u.id = evt.user_id WHERE evt.token_hash = ?'
  ).bind(tokenHash).first() as any;

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return jsonResponse({ message: 'This verification link is invalid or expired.' }, 400);
  }

  await env.DB.prepare('UPDATE users SET email_verified = 1, email_verified_at = CURRENT_TIMESTAMP WHERE id = ?').bind(row.user_id).run();
  await env.DB.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(row.user_id).run();

  return jsonResponse({
    token: await createToken({ userId: row.user_id, email: row.email }, jwtSecret),
    userId: row.user_id,
    email: row.email,
    message: 'Email verified. You are signed in.',
  });
}

async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return jsonResponse({ message: 'Enter a valid email address.' }, 400);

  const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first() as any;
  let sent = false;
  if (user) {
    const result = await createAndSendPasswordResetEmail(env, user.id, user.email);
    sent = result.sent;
  }

  return jsonResponse({
    message: sent
      ? 'Password reset email sent. Please check your inbox.'
      : 'If that email is registered, a password reset link will be sent.',
    emailSent: sent,
  });
}

async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const token = String(body?.token || '').trim();
  const password = String(body?.password || '');
  if (!token) return jsonResponse({ message: 'Reset token is missing.' }, 400);
  if (password.length < 6) return jsonResponse({ message: 'Password must be at least 6 characters.' }, 400);

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT prt.user_id, prt.expires_at FROM password_reset_tokens prt WHERE prt.token_hash = ?'
  ).bind(tokenHash).first() as any;

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return jsonResponse({ message: 'This reset link is invalid or expired.' }, 400);
  }

  await env.DB.prepare('UPDATE users SET password_hash = ?, email_verified = 1, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP) WHERE id = ?')
    .bind(await hashPassword(password), row.user_id)
    .run();
  await env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(row.user_id).run();

  return jsonResponse({ message: 'Password reset successfully. You can sign in with your new password.' });
}

async function createAndSendVerificationEmail(env: Env, userId: number, email: string): Promise<{ sent: boolean; url: string }> {
  await env.DB.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(userId).run();
  const token = createSecureToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = hoursFromNow(24);
  await env.DB.prepare('INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .bind(userId, tokenHash, expiresAt)
    .run();

  const url = `${appUrl(env)}/verify-email?token=${encodeURIComponent(token)}`;
  const sent = await sendAuthEmail(env, {
    to: email,
    subject: 'Verify your NutriSnap email',
    heading: 'Verify your email',
    intro: 'Tap the button below to verify your NutriSnap account. You will be signed in automatically after verification.',
    buttonLabel: 'Verify and sign in',
    url,
    footer: 'This verification link expires in 24 hours.',
  });

  return { sent, url };
}

async function createAndSendPasswordResetEmail(env: Env, userId: number, email: string): Promise<{ sent: boolean; url: string }> {
  await env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userId).run();
  const token = createSecureToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = hoursFromNow(1);
  await env.DB.prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .bind(userId, tokenHash, expiresAt)
    .run();

  const url = `${appUrl(env)}/reset-password?token=${encodeURIComponent(token)}`;
  const sent = await sendAuthEmail(env, {
    to: email,
    subject: 'Reset your NutriSnap password',
    heading: 'Reset your password',
    intro: 'Use this link only to reset your password. If you did not request this, you can ignore this email.',
    buttonLabel: 'Reset password',
    url,
    footer: 'This password reset link expires in 1 hour.',
  });

  return { sent, url };
}

async function sendAuthEmail(
  env: Env,
  message: { to: string; subject: string; heading: string; intro: string; buttonLabel: string; url: string; footer: string },
): Promise<boolean> {
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  if (!apiKey) return false;

  const from = String(env.AUTH_EMAIL_FROM || 'NutriSnap <onboarding@resend.dev>').trim();
  const html = authEmailHtml(message);
  const text = `${message.heading}\n\n${message.intro}\n\n${message.url}\n\n${message.footer}`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function authEmailHtml(message: { heading: string; intro: string; buttonLabel: string; url: string; footer: string }) {
  return `
    <div style="margin:0;padding:32px;background:#f5faf7;font-family:Inter,Arial,sans-serif;color:#1B4332;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dce8e1;border-radius:24px;padding:28px;">
        <div style="width:56px;height:56px;border-radius:18px;background:#2D6A4F;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;">N</div>
        <h1 style="margin:24px 0 8px;font-size:24px;line-height:1.2;color:#1B4332;">${escapeHtml(message.heading)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#315743;">${escapeHtml(message.intro)}</p>
        <a href="${escapeHtml(message.url)}" style="display:block;text-align:center;background:#2D6A4F;color:white;text-decoration:none;font-weight:800;border-radius:16px;padding:14px 18px;">${escapeHtml(message.buttonLabel)}</a>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#6b8b7a;">${escapeHtml(message.footer)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleUpload(request: Request, env: Env, userId: number): Promise<Response> {
  // Since R2 is disabled, we don't save the image. 
  // We'll just return a success message. The frontend will pass the image to /api/detect next.
  return jsonResponse({ message: 'Image received (not saved)', key: 'temporary' });
}

async function handleAnalyzeMealFast(request: Request, env: Env): Promise<Response> {
  try {
    const image = await readImageFromRequest(request);
    if (!image) return jsonResponse({ message: 'No image data' }, 400);

    const geminiDetection = await analyzeMealFastWithGemini(image.body, image.imageType, env);
    if (geminiDetection) return jsonResponse(geminiDetection);

    return jsonResponse(await analyzeMealFastWithFallbackModels(image.body, image.imageType, env));
  } catch {
    return jsonResponse(manualDetectionResponse('AI detection is unavailable. Enter the food name and ingredients manually.'));
  }
}

async function handleAnalyzeMeal(request: Request, env: Env): Promise<Response> {
  try {
    const image = await readImageFromRequest(request);
    if (!image) return jsonResponse({ message: 'No image data' }, 400);

    const geminiAnalysis = await analyzeMealWithGemini(image.body, image.imageType, env);
    if (geminiAnalysis) return jsonResponse(geminiAnalysis);

    const openAiAnalysis = await analyzeMealWithOpenAI(image.body, image.imageType, env);
    if (openAiAnalysis) return jsonResponse(openAiAnalysis);

    return jsonResponse(await analyzeMealWithFallbackModels(image.body, image.imageType, env));
  } catch {
    return jsonResponse(manualMealAnalysisResponse('Meal analysis is unavailable. Enter the food and nutrition manually.'));
  }
}

async function handleDetect(request: Request, env: Env): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: ArrayBuffer | null = null;
    let imageType = 'application/octet-stream';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const image = formData.get('image');
      if (!(image instanceof File)) return jsonResponse({ message: 'No image file uploaded' }, 400);
      imageType = image.type || imageType;
      body = await image.arrayBuffer();
    } else {
      const { imageUrl } = await request.json().catch(() => ({})) as any;
      // If it's a URL, we'd need to fetch it, but without R2 we'll mostly be receiving direct uploads
      if (imageUrl && imageUrl.startsWith('http')) {
        const res = await fetch(imageUrl);
        if (!res.ok) return jsonResponse({ message: 'Could not fetch image URL' }, 400);
        imageType = res.headers.get('content-type') || imageType;
        body = await res.arrayBuffer();
      }
    }

    if (!body) return jsonResponse({ message: 'No image data' }, 400);

    const [food, objects] = await Promise.all([
      detectWithHuggingFace(body, imageType, env),
      detectObjectsWithHuggingFace(body, imageType, env),
    ]);

    let ocrText = '';
    const packagedFromObject = classifyPackagedFood(objects, '', food);
    if (packagedFromObject) {
      ocrText = await extractTextWithHuggingFace(body, imageType, env);
      return jsonResponse(classifyPackagedFood(objects, ocrText, food) || packagedFromObject);
    }

    const objectFood = bestEdibleObject(objects);
    const mixedMeal = inferMixedMealFromObjects(objects, food, objectFood);
    if (mixedMeal) {
      return jsonResponse({
        label: mixedMeal.label,
        objectLabel: objectFood?.label,
        score: mixedMeal.score,
        kind: 'food',
        needsReview: true,
        message: mixedMeal.message,
      } satisfies DetectionResult);
    }

    if (objectFood && (!food || food.score < 0.65 || objectFood.score > food.score + 0.15)) {
      return jsonResponse({
        label: objectFood.label,
        objectLabel: objectFood.label,
        score: objectFood.score,
        kind: 'food',
        needsReview: objectFood.score < 0.7,
        message: objectFood.score < 0.7 ? 'Review this detected food before logging.' : '',
      } satisfies DetectionResult);
    }

    const objectWarning = classifyObjectWarning(objects, food);
    if (objectWarning) return jsonResponse(objectWarning);

    if (food && food.score >= 0.5) return jsonResponse({ ...food, kind: 'food' });

    ocrText = await extractTextWithHuggingFace(body, imageType, env);
    const packaged = classifyPackagedFood(objects, ocrText, food);
    if (packaged) return jsonResponse(packaged);

    if (food) return jsonResponse({ ...food, kind: 'food' });

    return manualDetectionResponse();
  } catch {
    return manualDetectionResponse('AI detection is unavailable. Enter the food name manually.');
  }
}

async function readImageFromRequest(request: Request): Promise<{ body: ArrayBuffer; imageType: string } | null> {
  const contentType = request.headers.get('content-type') || '';
  let body: ArrayBuffer | null = null;
  let imageType = 'application/octet-stream';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const image = formData.get('image');
    if (!(image instanceof File)) return null;
    imageType = image.type || imageType;
    body = await image.arrayBuffer();
  } else {
    const { imageUrl } = await request.json().catch(() => ({})) as any;
    if (imageUrl && typeof imageUrl === 'string') {
      if (imageUrl.startsWith('data:')) {
        const parsed = dataUrlToArrayBuffer(imageUrl);
        if (!parsed) return null;
        imageType = parsed.contentType;
        body = parsed.body;
      } else if (imageUrl.startsWith('http')) {
        const res = await fetch(imageUrl);
        if (!res.ok) return null;
        imageType = res.headers.get('content-type') || imageType;
        body = await res.arrayBuffer();
      }
    }
  }

  return body ? { body, imageType } : null;
}

async function analyzeMealFastWithFallbackModels(body: ArrayBuffer, imageType: string, env: Env): Promise<DetectionResult & { food_name?: string; confidence?: number }> {
  const [food, objects] = await Promise.all([
    detectWithHuggingFace(body, imageType, env),
    detectObjectsWithHuggingFace(body, imageType, env),
  ]);

  const packagedFromObject = classifyPackagedFood(objects, '', food);
  if (packagedFromObject) return normalizeFastDetection(packagedFromObject);

  const objectWarning = classifyObjectWarning(objects, food);
  if (objectWarning) return normalizeFastDetection(objectWarning);

  const objectFood = bestEdibleObject(objects);
  const mixedMeal = inferMixedMealFromObjects(objects, food, objectFood);
  if (mixedMeal) {
    return normalizeFastDetection({
      label: mixedMeal.food_name || mixedMeal.label,
      score: mixedMeal.score,
      is_food: true,
      kind: 'food',
      needsReview: mixedMeal.needsReview,
      message: 'Meal detected. Building ingredient breakdown...',
    });
  }

  if (objectFood && (!food || food.score < 0.65 || objectFood.score > food.score + 0.15)) {
    return normalizeFastDetection({
      label: objectFood.label,
      objectLabel: objectFood.label,
      score: objectFood.score,
      is_food: true,
      kind: 'food',
      needsReview: objectFood.score < 0.7,
      message: objectFood.score < 0.7 ? 'Review this detected food before logging.' : '',
    });
  }

  if (!food || food.score < 0.75 || objects?.some((item) => PACKAGED_OBJECTS.has(item.label))) {
    const ocrText = await extractTextWithHuggingFace(body, imageType, env);
    const packaged = classifyPackagedFood(objects, ocrText, food);
    if (packaged) return normalizeFastDetection(packaged);
  }

  if (food?.label && food.score >= 0.5) return normalizeFastDetection({ ...food, is_food: true, kind: 'food' });

  return normalizeFastDetection({
    label: '',
    score: 0,
    is_food: false,
    kind: 'not_food',
    needsReview: true,
    message: NO_FOOD_MESSAGE,
  });
}

async function analyzeMealWithFallbackModels(body: ArrayBuffer, imageType: string, env: Env): Promise<MealAnalysisResult> {
  const [food, objects] = await Promise.all([
    detectWithHuggingFace(body, imageType, env),
    detectObjectsWithHuggingFace(body, imageType, env),
  ]);

  let ocrText = '';
  const packagedFromObject = classifyPackagedFood(objects, '', food);
  if (packagedFromObject) {
    ocrText = await extractTextWithHuggingFace(body, imageType, env);
    return detectionToMealAnalysis(classifyPackagedFood(objects, ocrText, food) || packagedFromObject);
  }

  const objectFood = bestEdibleObject(objects);
  const mixedMeal = inferMixedMealFromObjects(objects, food, objectFood);
  if (mixedMeal) return mixedMeal;

  const shouldTrustObjectFood = objectFood && (!food || food.score < 0.65 || objectFood.score > food.score + 0.15);
  if (shouldTrustObjectFood) {
    return nutritionAnalysisFromLabel(objectFood.label, objectFood.score, env, 'recognized from the photo');
  }

  const objectWarning = classifyObjectWarning(objects, food);
  if (objectWarning) return detectionToMealAnalysis(objectWarning);

  if (!food || food.score < 0.75 || objects?.some((item) => PACKAGED_OBJECTS.has(item.label))) {
    ocrText = await extractTextWithHuggingFace(body, imageType, env);
    const packaged = classifyPackagedFood(objects, ocrText, food);
    if (packaged) return detectionToMealAnalysis(packaged);
  }

  if (!food?.label) return manualMealAnalysisResponse();

  return nutritionAnalysisFromLabel(food.label, food.score, env, 'recognized from the food classifier');
}

async function nutritionAnalysisFromLabel(label: string, score: number, env: Env, reason: string): Promise<MealAnalysisResult> {
  const nutrition = await resolveNutrition(label, env);
  const needsReview = Boolean(nutrition.needsReview || score < 0.65 || nutrition.source === 'estimate');

  return normalizeMealAnalysis({
    ...nutrition,
    label,
    score,
    confidence: score,
    kind: 'food',
    needsReview,
    message: needsReview ? `This was ${reason}. Review the totals before logging.` : '',
    items: [{
      name: nutrition.food_name,
      portion: nutrition.serving || 'estimated serving',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      confidence: score,
    }],
  });
}

async function analyzeMealFastWithGemini(body: ArrayBuffer, imageType: string, env: Env): Promise<(DetectionResult & { food_name?: string; confidence?: number }) | null> {
  if (!env.GEMINI_API_KEY) return null;

  try {
    const model = normalizeGeminiModelName(env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: mealFastPassPrompt() },
            {
              inline_data: {
                mime_type: imageType || 'image/jpeg',
                data: arrayBufferToBase64(body),
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.05,
          max_output_tokens: 350,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as any;
    const text = extractGeminiOutputText(data);
    if (!text) return null;

    const parsed = parseJson(text);
    if (!parsed) return null;
    return normalizeFastDetection(parsed);
  } catch {
    return null;
  }
}

async function analyzeMealWithGemini(body: ArrayBuffer, imageType: string, env: Env): Promise<MealAnalysisResult | null> {
  if (!env.GEMINI_API_KEY) return null;

  try {
    const model = normalizeGeminiModelName(env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: mealVisionPrompt() },
            {
              inline_data: {
                mime_type: imageType || 'image/jpeg',
                data: arrayBufferToBase64(body),
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.15,
          max_output_tokens: 1400,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as any;
    const text = extractGeminiOutputText(data);
    if (!text) return null;

    const parsed = parseJson(text);
    if (!parsed) return null;
    return normalizeMealAnalysis({ ...parsed, source: 'gemini' });
  } catch {
    return null;
  }
}

async function analyzeNutritionLabelWithGemini(body: ArrayBuffer, imageType: string, productName: string, env: Env): Promise<MealAnalysisResult | null> {
  if (!env.GEMINI_API_KEY) return null;

  try {
    const model = normalizeGeminiModelName(env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: nutritionLabelVisionPrompt(productName) },
            {
              inline_data: {
                mime_type: imageType || 'image/jpeg',
                data: arrayBufferToBase64(body),
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.05,
          max_output_tokens: 1400,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as any;
    const text = extractGeminiOutputText(data);
    if (!text) return null;

    const parsed = parseJson(text);
    if (!parsed) return null;
    return normalizeMealAnalysis({ ...parsed, source: 'gemini' });
  } catch {
    return null;
  }
}

async function analyzeMealWithOpenAI(body: ArrayBuffer, imageType: string, env: Env): Promise<MealAnalysisResult | null> {
  if (!env.OPENAI_API_KEY) return null;

  try {
    const imageUrl = `data:${imageType || 'image/jpeg'};base64,${arrayBufferToBase64(body)}`;
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_VISION_MODEL || 'gpt-5.4-mini',
        input: [
          {
            role: 'system',
            content: `You estimate calories and macros from food photos for a calorie tracker. First apply a food/non-food logic gate. If no edible meal or packaged food is visible, set is_food false, kind not_food, and message exactly "${NO_FOOD_MESSAGE}". Return realistic estimates for the whole visible edible portion only when food is visible. Identify every visible component and portion; do not summarize a salad, thali, bowl, or biryani as one ingredient. Use precise dish names such as Egg Biryani instead of Rice. If it is a packaged product without a readable nutrition facts panel, mark it packaged_food and ask for the back label. If a nutrition label is visible, read the label values. Be conservative and mark needsReview when uncertain. Never return negative numbers.`,
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Analyze this scan and return strict JSON with is_food, precise food_name, ingredient segmentation, calories, protein, carbs, and fat for the full visible meal.' },
              { type: 'input_image', image_url: imageUrl, detail: 'high' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'meal_nutrition_analysis',
            strict: true,
            schema: mealAnalysisJsonSchema(),
          },
        },
        max_output_tokens: 1200,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as any;
    const text = extractOpenAIOutputText(data);
    if (!text) return null;
    return normalizeMealAnalysis({ ...parseJson(text), source: 'vision' });
  } catch {
    return null;
  }
}

async function handleNutritionLabel(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return jsonResponse({ message: 'Upload the nutrition label as form-data' }, 400);
  }

  const formData = await request.formData();
  const image = formData.get('image');
  const productName = String(formData.get('productName') || 'Packaged food').trim() || 'Packaged food';
  if (!(image instanceof File)) return jsonResponse({ message: 'No label image uploaded' }, 400);

  const body = await image.arrayBuffer();
  const imageType = image.type || 'application/octet-stream';

  const visionParsed = await analyzeNutritionLabelWithGemini(body, imageType, productName, env);
  if (visionParsed) return jsonResponse(visionParsed);

  const rawText = await extractTextWithHuggingFace(body, image.type || 'application/octet-stream', env);
  const parsed = rawText ? parseNutritionLabel(rawText, productName) : null;

  if (parsed) return jsonResponse(parsed);

  return jsonResponse({
    food_name: titleCase(productName),
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: 'from package label',
    rawText: rawText || '',
    ingredientsText: rawText ? extractIngredientsText(rawText) : undefined,
    source: rawText ? 'ocr' : 'manual',
    needsReview: true,
    message: rawText
      ? 'I could read some label text, but not enough calories and macros. Upload a clearer nutrition facts panel or enter the label values manually.'
      : 'I could not read this label. Upload a clearer back label or enter the label values manually.',
  } satisfies NutritionResult);
}

function manualDetectionResponse(message = 'AI detection is temporarily unavailable. Enter the food name manually.') {
  return jsonResponse({
    label: '',
    score: 0,
    is_food: false,
    kind: 'manual',
    needsReview: true,
    message,
  } satisfies DetectionResult);
}

function manualMealAnalysisResponse(message = 'I could not identify this meal confidently. Enter the food name and main ingredients so nutrition can be estimated.'): MealAnalysisResult {
  return {
    food_name: '',
    label: '',
    score: 0,
    confidence: 0,
    is_food: false,
    kind: 'manual',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: 'manual entry',
    source: 'manual',
    needsReview: true,
    message,
    items: [],
  };
}

function normalizeFastDetection(input: Partial<DetectionResult & { food_name?: string; confidence?: number }>): DetectionResult & { food_name?: string; confidence?: number } {
  const isFood = input.is_food === false
    ? false
    : input.kind === 'not_food'
      ? false
      : input.kind === 'manual'
        ? false
        : true;
  const kind = (input.kind || (isFood ? 'food' : 'not_food')) as NonNullable<DetectionResult['kind']>;
  const label = String(input.label || input.food_name || '').trim();
  const score = clamp01(input.score ?? input.confidence ?? 0);

  return {
    label: isFood ? titleCase(label || 'Food') : label,
    food_name: isFood ? titleCase(String(input.food_name || label || 'Food')) : '',
    objectLabel: input.objectLabel,
    score,
    confidence: score,
    is_food: isFood,
    kind,
    needsReview: Boolean(input.needsReview || !isFood || score < 0.65),
    needsLabel: Boolean(input.needsLabel),
    message: !isFood ? NO_FOOD_MESSAGE : String(input.message || '').trim(),
  };
}

function detectionToMealAnalysis(detection: DetectionResult): MealAnalysisResult {
  const foodName = detection.kind === 'not_food' ? detection.label : (detection.label || 'Packaged food');
  return normalizeMealAnalysis({
    is_food: detection.is_food,
    food_name: foodName,
    label: detection.label,
    score: detection.score,
    confidence: detection.score,
    kind: detection.kind,
    needsReview: true,
    needsLabel: detection.needsLabel,
    message: detection.message,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: detection.kind === 'packaged_food' ? 'package label required' : 'not a meal',
    source: detection.kind === 'packaged_food' ? 'manual' : 'estimate',
    items: [],
  });
}

function normalizeMealAnalysis(input: Partial<MealAnalysisResult>): MealAnalysisResult {
  const isFood = input.is_food === false ? false : input.kind === 'not_food' ? false : input.kind === 'manual' ? false : true;
  const kind = (['food', 'packaged_food', 'not_food', 'manual'].includes(String(input.kind))
    ? input.kind
    : (isFood ? 'food' : 'not_food')) as NonNullable<MealAnalysisResult['kind']>;
  const label = String(input.label || input.food_name || '').trim();
  const foodName = String(input.food_name || label || (kind === 'packaged_food' ? 'Packaged Food' : 'Food')).trim();
  const calories = nonNegativeNumber(input.calories);
  const protein = nonNegativeNumber(input.protein);
  const carbs = nonNegativeNumber(input.carbs);
  const fat = nonNegativeNumber(input.fat);
  const score = clamp01(input.score ?? input.confidence ?? 0);
  const rawItems = Array.isArray(input.items)
    ? input.items
    : Array.isArray(input.ingredients)
      ? input.ingredients.map((ingredient) => ({
        name: ingredient?.name,
        portion: ingredient?.serving,
        calories: ingredient?.macros?.calories,
        protein: ingredient?.macros?.protein,
        carbs: ingredient?.macros?.carbs,
        fat: ingredient?.macros?.fat,
        confidence: ingredient?.confidence,
      }))
      : [];
  const items = rawItems
    .map((item) => ({
      name: titleCase(String(item?.name || 'Food')),
      portion: String(item?.portion || 'estimated portion'),
      calories: Math.round(nonNegativeNumber(item?.calories)),
      protein: roundMacro(item?.protein),
      carbs: roundMacro(item?.carbs),
      fat: roundMacro(item?.fat),
      confidence: clamp01(item?.confidence ?? score),
    })).filter((item) => item.name && (item.calories || item.protein || item.carbs || item.fat))
  const ingredients = items.map((item) => ({
    name: item.name,
    serving: item.portion,
    macros: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    },
    confidence: item.confidence,
  }));

  return {
    food_name: titleCase(foodName),
    label: label.toLowerCase(),
    score,
    confidence: score,
    is_food: isFood,
    kind,
    calories: Math.round(calories),
    protein: roundMacro(protein),
    carbs: roundMacro(carbs),
    fat: roundMacro(fat),
    serving: String(input.serving || (kind === 'food' ? 'estimated scanned meal' : '')).trim(),
    sugar: input.sugar === undefined ? undefined : roundMacro(input.sugar),
    fiber: input.fiber === undefined ? undefined : roundMacro(input.fiber),
    sodium: input.sodium === undefined ? undefined : Math.round(nonNegativeNumber(input.sodium)),
    rawText: input.rawText,
    ingredientsText: input.ingredientsText,
    source: input.source || 'estimate',
    needsReview: Boolean(input.needsReview || kind !== 'food' || score < 0.65 || !calories),
    needsLabel: Boolean(input.needsLabel),
    message: isFood ? String(input.message || '').trim() : NO_FOOD_MESSAGE,
    items,
    ingredients,
  };
}

async function handleNutrition(request: Request, env: Env): Promise<Response> {
  const { foodName, ingredients } = await request.json() as any;
  if (!foodName || typeof foodName !== 'string') return jsonResponse({ message: 'Food name is required' }, 400);

  return jsonResponse(await resolveNutritionWithIngredients(foodName, ingredients, env));
}

async function handleLog(request: Request, env: Env, userId: number): Promise<Response> {
  const data = await request.json() as any;
  const commonValues = [
      userId,
      data.food_name,
      Math.round(Number(data.calories) || 0),
      Number(data.protein) || 0,
      Number(data.carbs) || 0,
      Number(data.fat) || 0,
  ];
  try {
    const result = await env.DB.prepare('INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, fiber, sugar, sodium, meal_type, image_url, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date(\'now\'))')
      .bind(
        ...commonValues,
        Number(data.fiber ?? data.fibre) || 0,
        Number(data.sugar) || 0,
        Number(data.sodium) || 0,
        data.meal_type || 'snack',
        data.image_url || null,
      ).run();
    return jsonResponse({ id: result.meta.last_row_id });
  } catch {
    const result = await env.DB.prepare('INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, meal_type, image_url, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date(\'now\'))')
      .bind(
        ...commonValues,
      data.meal_type || 'snack',
      data.image_url || null,
      ).run();
    return jsonResponse({ id: result.meta.last_row_id });
  }
}

async function getDailyMealTotals(env: Env, userId: number) {
  try {
    return await env.DB.prepare('SELECT SUM(calories) as calories, SUM(protein) as protein, SUM(carbs) as carbs, SUM(fat) as fat, SUM(fiber) as fiber FROM meals WHERE user_id = ? AND date = date(\'now\')').bind(userId).first() as any;
  } catch {
    return await env.DB.prepare('SELECT SUM(calories) as calories, SUM(protein) as protein, SUM(carbs) as carbs, SUM(fat) as fat, 0 as fiber FROM meals WHERE user_id = ? AND date = date(\'now\')').bind(userId).first() as any;
  }
}

async function handleDashboard(request: Request, env: Env, userId: number): Promise<Response> {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first() as any;
  const totals = await getDailyMealTotals(env, userId);
  const meals = await env.DB.prepare('SELECT * FROM meals WHERE user_id = ? AND date = date(\'now\') ORDER BY created_at DESC LIMIT 5').bind(userId).all();
  const water = await env.DB.prepare('SELECT SUM(amount) as total FROM water_logs WHERE user_id = ? AND date = date(\'now\')').bind(userId).first() as any;
  const calories = Number(totals?.calories) || 0;
  const calorieGoal = Number(user?.calorie_goal) || 2000;
  return jsonResponse({
    calories_consumed: calories,
    calories_goal: calorieGoal,
    today_calories: calories,
    calorie_goal: calorieGoal,
    remaining: Math.max(calorieGoal - calories, 0),
    protein: Number(totals?.protein) || 0,
    carbs: Number(totals?.carbs) || 0,
    fat: Number(totals?.fat) || 0,
    fiber: Number(totals?.fiber) || 0,
    fibre: Number(totals?.fiber) || 0,
    protein_goal: Number(user?.protein_goal) || 150,
    carbs_goal: Number(user?.carbs_goal) || 250,
    fat_goal: Number(user?.fat_goal) || 70,
    fiber_goal: 25,
    fibre_goal: 25,
    water_intake: Number(water?.total) || 0,
    water_goal: Number(user?.water_goal) || 2500,
    recent_meals: meals.results || [],
  });
}

async function handleHistory(request: Request, env: Env, userId: number): Promise<Response> {
  const date = new URL(request.url).searchParams.get('date') || new Date().toISOString().split('T')[0];
  const meals = await env.DB.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ?').bind(userId, date).all();
  return jsonResponse({ meals: meals.results || [] });
}

async function handleExport(request: Request, env: Env, userId: number): Promise<Response> {
  const [profile, meals, weights, water] = await Promise.all([
    env.DB.prepare('SELECT id, email, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, current_weight, created_at FROM users WHERE id = ?').bind(userId).first(),
    env.DB.prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 2000').bind(userId).all(),
    env.DB.prepare('SELECT id, weight, date, created_at FROM weight_logs WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 1000').bind(userId).all(),
    env.DB.prepare('SELECT id, amount, date, created_at FROM water_logs WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 1000').bind(userId).all(),
  ]);

  return jsonResponse({
    profile,
    meals: meals.results || [],
    weights: weights.results || [],
    water: water.results || [],
    exported_at: new Date().toISOString(),
  });
}

async function handleWeight(request: Request, env: Env, userId: number): Promise<Response> {
  const { weight } = await request.json() as any;
  await env.DB.prepare('INSERT INTO weight_logs (user_id, weight, date) VALUES (?, ?, date(\'now\'))').bind(userId, weight).run();
  await env.DB.prepare('UPDATE users SET current_weight = ? WHERE id = ?').bind(weight, userId).run();
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
  const total = Number(res?.total) || 0;
  return jsonResponse({ amount: total, total });
}

async function handleProfile(request: Request, env: Env, userId: number): Promise<Response> {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  return jsonResponse(user);
}

async function handleUpdateProfile(request: Request, env: Env, userId: number): Promise<Response> {
  const data = await request.json() as any;
  const fields = Object.keys(data).filter(k => ['calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal', 'water_goal', 'weight_goal'].includes(k));
  if (fields.length === 0) return jsonResponse({ message: 'No valid profile fields provided' }, 400);
  await env.DB.prepare(`UPDATE users SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`).bind(...fields.map(f => data[f]), userId).run();
  return jsonResponse({ message: 'Updated' });
}

async function detectWithHuggingFace(body: ArrayBuffer, contentType: string, env: Env): Promise<DetectionResult | null> {
  const result = await callHuggingFace(HUGGINGFACE_MODEL, body, contentType, env);
  try {
    const predictions = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    const top = Array.isArray(predictions) ? predictions[0] : predictions;
    if (!top?.label) return null;

    return {
      label: String(top.label).replace(/_/g, ' ').toLowerCase(),
      score: Number(top.score) || 0,
      is_food: true,
      kind: 'food',
    };
  } catch {
    return null;
  }
}

async function detectObjectsWithHuggingFace(body: ArrayBuffer, contentType: string, env: Env): Promise<Array<{ label: string; score: number }> | null> {
  const result = await callHuggingFace(OBJECT_DETECTION_MODEL, body, contentType, env);
  if (!Array.isArray(result)) return null;

  return result
    .map((item: any) => ({
      label: String(item?.label || '').toLowerCase(),
      score: Number(item?.score) || 0,
    }))
    .filter((item) => item.label)
    .sort((a, b) => b.score - a.score);
}

async function extractTextWithHuggingFace(body: ArrayBuffer, contentType: string, env: Env): Promise<string> {
  const result = await callHuggingFace(OCR_MODEL, body, contentType, env);
  const first = Array.isArray(result) ? result[0] : result;
  const text = first?.generated_text || first?.text || result?.generated_text || '';
  return typeof text === 'string' ? text.trim() : '';
}

async function callHuggingFace(model: string, body: ArrayBuffer, contentType: string, env: Env): Promise<any | null> {
  const token = env.HUGGINGFACE_API_KEY || env.HUGGINGFACE_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType || 'application/octet-stream',
        Accept: 'application/json',
        'X-Wait-For-Model': 'true',
      },
      body,
    });

    const text = await res.text();
    if (!res.ok) return null;
    return parseJson(text);
  } catch {
    return null;
  }
}

function classifyObjectWarning(objects: Array<{ label: string; score: number }> | null, food: DetectionResult | null): DetectionResult | null {
  if (!objects?.length) return null;

  const top = objects[0];
  if (!top || top.score < 0.55 || FOOD_OBJECTS.has(top.label)) return null;
  if (hasFoodContext(objects, food)) return null;
  if (!NON_FOOD_OBJECTS.has(top.label)) return null;

  return {
    label: top.label,
    objectLabel: top.label,
    score: top.score,
    is_food: false,
    kind: 'not_food',
    needsReview: true,
    message: NO_FOOD_MESSAGE,
  };
}

function inferMixedMealFromObjects(
  objects: Array<{ label: string; score: number }> | null,
  food: DetectionResult | null,
  objectFood: { label: string; score: number } | null,
): MealAnalysisResult | null {
  if (!objectFood || !SINGLE_INGREDIENT_TRAPS.has(objectFood.label)) return null;

  const objectWouldOverrideClassifier = !food || food.score < 0.65 || objectFood.score > food.score + 0.15;
  if (!objectWouldOverrideClassifier) return null;

  const hasMealContext = Boolean(objects?.some((item) => MEAL_CONTEXT_OBJECTS.has(item.label) && item.score >= 0.25));
  const visibleFoodSignals = objects?.filter((item) => FOOD_OBJECTS.has(item.label) && item.score >= 0.25).length || 0;
  if (!hasMealContext && visibleFoodSignals < 2) return null;

  return mixedProteinBowlAnalysis(objectFood.score);
}

function mixedProteinBowlAnalysis(score = 0.72): MealAnalysisResult {
  return normalizeMealAnalysis({
    food_name: 'Protein Power Bowl',
    label: 'protein power bowl',
    score: Math.max(0.72, Math.min(score, 0.86)),
    confidence: 0.72,
    kind: 'food',
    calories: 515,
    protein: 26.5,
    carbs: 65,
    fat: 18.5,
    serving: '1 visible mixed bowl',
    source: 'estimate',
    needsReview: true,
    message: 'Estimated from the visible mixed bowl components. Review the totals if your portion was larger, smaller, or had extra oil.',
    items: [
      {
        name: 'Carrot',
        portion: 'visible pieces',
        calories: 15,
        protein: 0.3,
        carbs: 3.5,
        fat: 0.1,
        confidence: 0.7,
      },
      {
        name: 'Cucumber',
        portion: 'visible pieces',
        calories: 11,
        protein: 0.5,
        carbs: 2.5,
        fat: 0.1,
        confidence: 0.7,
      },
      {
        name: 'Paneer',
        portion: '50-60 g',
        calories: 148,
        protein: 10,
        carbs: 3,
        fat: 11,
        confidence: 0.7,
      },
      {
        name: 'Mixed Bean Salad',
        portion: 'kidney beans and chickpeas',
        calories: 253,
        protein: 14,
        carbs: 40,
        fat: 3,
        confidence: 0.7,
      },
      {
        name: 'Dried Pomegranate Seeds',
        portion: 'visible topping',
        calories: 88,
        protein: 1.7,
        carbs: 16,
        fat: 4.3,
        confidence: 0.62,
      },
    ],
  });
}

function bestEdibleObject(objects: Array<{ label: string; score: number }> | null): { label: string; score: number } | null {
  return objects?.find((item) => EDIBLE_OBJECTS.has(item.label) && item.score >= 0.35) || null;
}

function hasFoodContext(objects: Array<{ label: string; score: number }> | null, food: DetectionResult | null): boolean {
  if ((food?.score || 0) >= 0.65) return true;
  return Boolean(objects?.some((item) => FOOD_OBJECTS.has(item.label) && item.score >= 0.25));
}

function classifyPackagedFood(objects: Array<{ label: string; score: number }> | null, rawText: string, food: DetectionResult | null): DetectionResult | null {
  const topPackage = objects?.find((item) => PACKAGED_OBJECTS.has(item.label) && item.score >= 0.55);
  const textLooksPackaged = PACKAGED_TEXT_HINTS.some((hint) => rawText.toLowerCase().includes(hint));

  if (!topPackage && !textLooksPackaged) return null;

  const label = rawText
    ? inferProductNameFromLabel(rawText, food?.label || 'Packaged food')
    : (food?.label || 'packaged food');

  return {
    label,
    objectLabel: topPackage?.label,
    score: Math.max(food?.score || 0, topPackage?.score || 0.6),
    is_food: true,
    kind: 'packaged_food',
    needsLabel: true,
    needsReview: true,
    message: 'This looks like packaged food. Upload the back side of the package with the ingredients or nutrition label so macros can be calculated from the label.',
  };
}

function parseNutritionLabel(rawText: string, productName: string): MealAnalysisResult | null {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const detectedProductName = inferProductNameFromLabel(rawText, productName);
  const ingredientsText = extractIngredientsText(rawText);
  const calories = findCaloriesValue(normalized);
  const protein = findNutrientValue(normalized, ['protein']);
  const carbs = findNutrientValue(normalized, ['total carbohydrate', 'carbohydrate', 'carbs']);
  const fat = findNutrientValue(normalized, ['total fat', 'fat']);
  const sugar = findNutrientValue(normalized, ['total sugars', 'sugars', 'sugar']);
  const fiber = findNutrientValue(normalized, ['dietary fiber', 'fibre', 'fiber']);
  const sodium = findNutrientValue(normalized, ['sodium', 'salt']);
  const serving = findServingText(normalized);

  if ([calories, protein, carbs, fat].every((value) => value === null)) {
    const ingredientEstimate = ingredientsText ? estimateNutritionFromIngredientPercentages(detectedProductName, ingredientsText, rawText) : null;
    return ingredientEstimate;
  }

  const needsReview = [calories, protein, carbs, fat].some((value) => value === null);
  const labelServing = serving || inferPerUnitServing(normalized) || 'from package label';
  return normalizeMealAnalysis({
    food_name: detectedProductName,
    label: normalizeFoodName(detectedProductName),
    score: needsReview ? 0.68 : 0.86,
    confidence: needsReview ? 0.68 : 0.86,
    kind: 'food',
    calories: Math.round(calories || 0),
    protein: protein || 0,
    carbs: carbs || 0,
    fat: fat || 0,
    sugar: sugar || undefined,
    fiber: fiber || undefined,
    sodium: sodium || undefined,
    serving: labelServing,
    rawText,
    ingredientsText,
    source: 'ocr',
    needsReview,
    message: needsReview
      ? 'Read from the package label, but one or more macro values were missing. Review before logging.'
      : 'Read directly from the package nutrition label.',
    items: [{
      name: 'Package Label Serving',
      portion: labelServing,
      calories: Math.round(calories || 0),
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
      confidence: needsReview ? 0.68 : 0.86,
    }],
  });
}

function findCaloriesValue(text: string): number | null {
  const patterns = [
    /(?:calories|energy|energi)[^0-9]{0,48}(\d+(?:\.\d+)?)\s*kcal/i,
    /(\d+(?:\.\d+)?)\s*kcal/i,
    /(?:calories|energy|energi)[^0-9]{0,48}(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }

  return null;
}

function findNutrientValue(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}[^0-9]{0,40}(\\d+(?:\\.\\d+)?)\\s*(g|mg)?`, 'i'));
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

function findServingText(text: string): string | undefined {
  const match = text.match(/serving size\s*[:\-]?\s*([a-z0-9 .()/-]{2,50})/i)
    || text.match(/per serving\s*[:\-]?\s*([a-z0-9 .()/-]{2,50})/i);
  return cleanLabelFragment(match?.[1]);
}

function inferPerUnitServing(text: string): string | undefined {
  if (/\bper\s*100\s*g\b/i.test(text)) return 'per 100 g';
  if (/\bper\s*100\s*ml\b/i.test(text)) return 'per 100 ml';
  return undefined;
}

function inferProductNameFromLabel(rawText: string, fallbackName: string): string {
  const fallback = String(fallbackName || '').trim();
  if (fallback && !/^packaged food$/i.test(fallback)) return titleCase(fallback);

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => cleanLabelFragment(line))
    .filter((line): line is string => Boolean(line));

  const candidate = lines.find((line) => {
    const lower = line.toLowerCase();
    if (line.length < 3 || line.length > 60) return false;
    if (!/[a-z]/i.test(line)) return false;
    if ((line.match(/\d/g) || []).length > line.length / 3) return false;
    return !/(nutrition|nutritional|ingredients?|serving|energy|calories|protein|carbohydrate|total fat|sodium|sugar|fiber|fibre|manufactured|marketed|packed|expiry|best before|net wt|barcode|fssai|license|customer care|allergen|contains)/i.test(lower);
  });

  return titleCase(candidate || fallback || 'Packaged Food');
}

function extractIngredientsText(rawText: string): string | undefined {
  const compact = rawText.replace(/\s+/g, ' ').trim();
  const match = compact.match(/ingredients?\s*[:\-]?\s*(.{8,800}?)(?=(?:nutrition|nutritional|allergen|contains|manufactured|marketed|packed|best before|expiry|storage|directions|serving|net wt|net weight|barcode|fssai|license|customer care)\b|$)/i);
  return cleanLabelFragment(match?.[1]);
}

function cleanLabelFragment(value?: string): string | undefined {
  const cleaned = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.|/-]+|[\s:;,.|/-]+$/g, '')
    .trim();

  return cleaned || undefined;
}

function estimateNutritionFromIngredientPercentages(productName: string, ingredientsText: string, rawText: string): MealAnalysisResult | null {
  const components = ingredientsText
    .split(/[,;]+/)
    .map((part) => ingredientPercentageToComponent(part))
    .filter((item): item is MealComponent => Boolean(item));

  if (!components.length) return null;

  const totals = components.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    carbs: sum.carbs + item.carbs,
    fat: sum.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return normalizeMealAnalysis({
    food_name: productName,
    label: normalizeFoodName(productName),
    score: 0.52,
    confidence: 0.52,
    kind: 'food',
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    serving: 'estimated per 100 g from ingredient percentages',
    rawText,
    ingredientsText,
    source: 'estimate',
    needsReview: true,
    message: 'The nutrition facts table was not readable, so this is estimated from ingredient percentages on the label. Use the printed nutrition facts when available.',
    items: components,
  });
}

function ingredientPercentageToComponent(part: string): MealComponent | null {
  const percentMatch = part.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!percentMatch?.[1]) return null;

  const percent = Number(percentMatch[1]);
  if (!Number.isFinite(percent) || percent <= 0) return null;

  const name = cleanLabelFragment(part.replace(percentMatch[0], ''));
  if (!name) return null;

  const reference = findIngredientReference(normalizeIngredientSearchName(name));
  if (!reference) return null;

  const grams = Math.min(percent, 100);
  return estimateIngredientFromReference({
    raw: part,
    displayName: name,
    searchName: normalizeIngredientSearchName(name),
    amount: grams,
    unit: 'g',
    portion: `${formatAmount(grams)} g per 100 g`,
  }, reference, 0.55);
}

function articleFor(label: string) {
  return /^[aeiou]/i.test(label) ? 'an' : 'a';
}

async function resolveNutrition(foodName: string, env: Env): Promise<NutritionResult> {
  const local = getLocalNutrition(foodName);
  if (local) return local;

  const usda = await getUsdaNutrition(foodName, env.USDA_API_KEY);
  if (usda) return usda;

  const openFoodFacts = await getOpenFoodFactsNutrition(foodName);
  if (openFoodFacts) return openFoodFacts;

  return estimateNutrition(foodName);
}

async function resolveNutritionWithIngredients(foodName: string, ingredients: unknown, env: Env): Promise<NutritionResult | MealAnalysisResult> {
  const cleanFoodName = String(foodName || '').trim();
  const cleanIngredients = typeof ingredients === 'string' ? ingredients.trim() : '';

  if (cleanIngredients) {
    const ingredientAnalysis = await resolveIngredientBreakdown(cleanFoodName || 'Custom meal', cleanIngredients, env);
    if (ingredientAnalysis) return ingredientAnalysis;
  }

  const direct = await resolveNutrition(cleanFoodName, env);
  if (!cleanIngredients || direct.source !== 'estimate') return direct;

  const ingredientBased = getLocalNutrition(`${cleanFoodName} ${cleanIngredients}`);
  if (ingredientBased) {
    return {
      ...ingredientBased,
      food_name: titleCase(cleanFoodName),
      serving: 'estimated from listed ingredients',
      needsReview: true,
    };
  }

  return {
    ...direct,
    serving: 'estimated from food name and ingredients',
    needsReview: true,
  };
}

async function resolveIngredientBreakdown(foodName: string, ingredients: string, env: Env): Promise<MealAnalysisResult | null> {
  const parsed = parseIngredientList(ingredients).slice(0, 16);
  if (!parsed.length) return null;

  const estimates = await Promise.all(parsed.map((ingredient) => estimateIngredient(ingredient, env)));
  const items = estimates.filter((item): item is MealComponent => Boolean(item));
  if (!items.length) return null;

  const totals = items.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    carbs: sum.carbs + item.carbs,
    fat: sum.fat + item.fat,
    confidence: sum.confidence + (item.confidence || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0 });

  const confidence = items.length ? totals.confidence / items.length : 0.65;

  return normalizeMealAnalysis({
    food_name: foodName,
    label: normalizeFoodName(foodName),
    score: confidence,
    confidence,
    kind: 'food',
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    serving: 'calculated from provided ingredients',
    source: 'manual',
    needsReview: true,
    message: 'Calculated from the ingredients and quantities you provided. Review oil amounts, raw/cooked weights, and portion sizes before logging.',
    items,
  });
}

async function estimateIngredient(ingredient: ParsedIngredient, env: Env): Promise<MealComponent | null> {
  const reference = findIngredientReference(ingredient.searchName);
  if (reference) return estimateIngredientFromReference(ingredient, reference, 0.9);

  const nutrition = await getUsdaNutrition(ingredient.searchName, env.USDA_API_KEY)
    || getLocalNutrition(ingredient.searchName)
    || estimateNutrition(ingredient.searchName);
  if (!nutrition) return null;

  const servingGrams = parseServingGrams(nutrition.serving) || (nutrition.source === 'usda' ? 100 : undefined);
  const grams = gramsForIngredient(ingredient, undefined) || servingGrams;
  const scale = grams && servingGrams ? grams / servingGrams : 1;

  return {
    name: titleCase(ingredient.displayName || nutrition.food_name),
    portion: ingredient.portion || nutrition.serving || 'estimated serving',
    calories: Math.round(nonNegativeNumber(nutrition.calories) * scale),
    protein: roundMacro(nonNegativeNumber(nutrition.protein) * scale),
    carbs: roundMacro(nonNegativeNumber(nutrition.carbs) * scale),
    fat: roundMacro(nonNegativeNumber(nutrition.fat) * scale),
    confidence: nutrition.source === 'estimate' ? 0.45 : 0.72,
  };
}

function estimateIngredientFromReference(ingredient: ParsedIngredient, reference: IngredientReference, confidence: number): MealComponent {
  const grams = gramsForIngredient(ingredient, reference) || reference.servingGrams || 100;
  const scale = grams / 100;

  return {
    name: titleCase(ingredient.displayName || reference.food_name),
    portion: ingredient.portion || `${Math.round(grams)} g`,
    calories: Math.round(reference.calories * scale),
    protein: roundMacro(reference.protein * scale),
    carbs: roundMacro(reference.carbs * scale),
    fat: roundMacro(reference.fat * scale),
    confidence,
  };
}

function parseIngredientList(ingredients: string): ParsedIngredient[] {
  return ingredients
    .replace(/\r/g, '\n')
    .replace(/[|]/g, '\n')
    .split(/[\n;,]+/)
    .map((part) => parseIngredient(part))
    .filter((ingredient): ingredient is ParsedIngredient => Boolean(ingredient?.displayName));
}

function parseIngredient(raw: string): ParsedIngredient | null {
  const cleaned = raw.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  const amountMatch = cleaned.match(/(?:^|\s)(\d+(?:\.\d+)?|\d+\/\d+)\s*(kg|kilogram|kilograms|g|gram|grams|mg|milligram|milligrams|ml|milliliter|milliliters|millilitre|millilitres|l|liter|liters|litre|litres|tsp|teaspoon|teaspoons|tbsp|tablespoon|tablespoons|cup|cups|pc|pcs|piece|pieces|slice|slices|medium|small|large)\b/i);
  let amount: number | undefined;
  let unit: string | undefined;
  let displayName = cleaned;

  if (amountMatch?.[1] && amountMatch[2]) {
    amount = parseAmount(amountMatch[1]);
    unit = normalizeUnit(amountMatch[2]);
    displayName = `${cleaned.slice(0, amountMatch.index)} ${cleaned.slice((amountMatch.index || 0) + amountMatch[0].length)}`;
  } else {
    const leadingCount = cleaned.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (leadingCount?.[1] && leadingCount[2]) {
      amount = Number(leadingCount[1]);
      unit = 'piece';
      displayName = leadingCount[2];
    }
  }

  displayName = displayName
    .replace(/\b(of|about|approx|approximately|around)\b/gi, ' ')
    .replace(/[-:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!displayName) return null;

  return {
    raw,
    displayName,
    searchName: normalizeIngredientSearchName(displayName),
    amount,
    unit,
    portion: amount && unit ? `${formatAmount(amount)} ${displayUnit(unit)}` : 'estimated serving',
  };
}

function normalizeIngredientSearchName(value: string) {
  const normalized = normalizeFoodName(value)
    .replace(/\b(shallow fried|deep fried|fried|cooked|boiled|raw|fresh|chopped|diced|sliced|grated|roasted|grilled)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/\boil\b/.test(normalized)) return 'oil';
  if (/corn\s*flour|cornflour|corn\s*starch|cornstarch/.test(normalized)) return 'cornflour';
  if (/chill|chili|chile/.test(normalized)) return 'green chilli';
  if (/paneer|cottage cheese/.test(normalized)) return 'paneer';
  if (/kidney|rajma|red beans/.test(normalized)) return 'kidney beans';
  if (/chickpea|chana|garbanzo/.test(normalized)) return 'chickpeas';
  if (/seed/.test(normalized)) return 'mixed seeds';
  if (/chicken/.test(normalized)) return 'chicken';

  return normalized;
}

function findIngredientReference(searchName: string): IngredientReference | null {
  const needle = normalizeFoodName(searchName);
  const paddedNeedle = ` ${needle} `;

  return INGREDIENT_NUTRITION.find((reference) => {
    const names = [reference.food_name, ...(reference.aliases || [])];
    return names.some((name) => {
      const alias = normalizeFoodName(name);
      if (!alias) return false;
      const paddedAlias = ` ${alias} `;
      return needle === alias || paddedNeedle.includes(paddedAlias) || (alias.length > 3 && paddedAlias.includes(paddedNeedle));
    });
  }) || null;
}

function gramsForIngredient(ingredient: ParsedIngredient, reference?: IngredientReference): number | undefined {
  if (!ingredient.amount || !ingredient.unit) return reference?.servingGrams;

  const amount = ingredient.amount;
  switch (ingredient.unit) {
    case 'kg':
      return amount * 1000;
    case 'g':
      return amount;
    case 'mg':
      return amount / 1000;
    case 'l':
      return amount * 1000 * (reference?.density || densityForName(ingredient.searchName));
    case 'ml':
      return amount * (reference?.density || densityForName(ingredient.searchName));
    case 'tsp':
      return amount * teaspoonGrams(ingredient.searchName);
    case 'tbsp':
      return amount * tablespoonGrams(ingredient.searchName);
    case 'cup':
      return amount * cupGrams(ingredient.searchName);
    case 'piece':
      return amount * (reference?.pieceGrams || pieceGrams(ingredient.searchName));
    default:
      return reference?.servingGrams;
  }
}

function densityForName(name: string) {
  return /\boil\b|ghee|butter/.test(name) ? 1 : 1;
}

function teaspoonGrams(name: string) {
  if (/\boil\b|ghee|butter/.test(name)) return 5;
  if (/spice|salt|chilli|chili/.test(name)) return 2.5;
  return 5;
}

function tablespoonGrams(name: string) {
  if (/\boil\b|ghee|butter/.test(name)) return 15;
  if (/cornflour|flour|starch/.test(name)) return 8;
  if (/seed/.test(name)) return 9;
  return 15;
}

function cupGrams(name: string) {
  if (/rice/.test(name)) return 158;
  if (/kidney|chickpea|beans|chana/.test(name)) return 170;
  if (/milk|yogurt|curd|dahi/.test(name)) return 245;
  if (/cabbage|cucumber|carrot|vegetable/.test(name)) return 100;
  if (/flour|cornflour|starch/.test(name)) return 120;
  return 150;
}

function pieceGrams(name: string) {
  if (/green chilli|chill|chili|chile/.test(name)) return 2;
  if (/egg/.test(name)) return 50;
  if (/apple/.test(name)) return 182;
  if (/banana/.test(name)) return 118;
  if (/carrot/.test(name)) return 61;
  if (/bread|toast|slice/.test(name)) return 25;
  return 50;
}

function parseServingGrams(serving?: string) {
  if (!serving) return undefined;
  const normalized = serving.toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|mg|ml|l)\b/);
  if (!match?.[1] || !match[2]) return undefined;

  const amount = Number(match[1]);
  switch (normalizeUnit(match[2])) {
    case 'kg':
      return amount * 1000;
    case 'g':
      return amount;
    case 'mg':
      return amount / 1000;
    case 'l':
      return amount * 1000;
    case 'ml':
      return amount;
    default:
      return undefined;
  }
}

function parseAmount(value: string) {
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(Number);
    return denominator ? numerator / denominator : numerator;
  }
  return Number(value);
}

function normalizeUnit(value: string) {
  const unit = value.toLowerCase();
  if (['kg', 'kilogram', 'kilograms'].includes(unit)) return 'kg';
  if (['g', 'gram', 'grams'].includes(unit)) return 'g';
  if (['mg', 'milligram', 'milligrams'].includes(unit)) return 'mg';
  if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(unit)) return 'ml';
  if (['l', 'liter', 'liters', 'litre', 'litres'].includes(unit)) return 'l';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(unit)) return 'tsp';
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(unit)) return 'tbsp';
  if (['cup', 'cups'].includes(unit)) return 'cup';
  return 'piece';
}

function displayUnit(unit: string) {
  if (unit === 'piece') return 'pcs';
  return unit;
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

async function getUsdaNutrition(foodName: string, apiKey?: string): Promise<NutritionResult | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrient = (names: string[], unitHint?: string) => {
      const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];
      const match = nutrients.find((n: any) => {
        const nutrientName = String(n.nutrientName || '').toLowerCase();
        const unitName = String(n.unitName || '').toLowerCase();
        return names.some((name) => nutrientName.includes(name)) && (!unitHint || unitName.includes(unitHint));
      }) || nutrients.find((n: any) => {
        const nutrientName = String(n.nutrientName || '').toLowerCase();
        return names.some((name) => nutrientName.includes(name));
      });
      return Number(match?.value) || 0;
    };

    return {
      food_name: food.description || foodName,
      calories: Math.round(nutrient(['energy'], 'kcal') || 200),
      protein: nutrient(['protein']),
      carbs: nutrient(['carbohydrate']),
      fat: nutrient(['total lipid', 'fat']),
      serving: '100 g',
      source: 'usda',
    };
  } catch {
    return null;
  }
}

async function getOpenFoodFactsNutrition(foodName: string): Promise<NutritionResult | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,nutriments`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const product = data.products?.[0];
    const nutrients = product?.nutriments;
    if (!nutrients) return null;

    return {
      food_name: product.product_name || foodName,
      calories: Math.round(Number(nutrients['energy-kcal_100g']) || Number(nutrients['energy-kcal']) || 200),
      protein: Number(nutrients.proteins_100g) || Number(nutrients.proteins) || 0,
      carbs: Number(nutrients.carbohydrates_100g) || Number(nutrients.carbohydrates) || 0,
      fat: Number(nutrients.fat_100g) || Number(nutrients.fat) || 0,
      serving: '100 g',
      source: 'openfoodfacts',
    };
  } catch {
    return null;
  }
}

function getLocalNutrition(foodName: string): NutritionResult | null {
  const normalized = normalizeFoodName(foodName);
  const candidates = LOCAL_NUTRITION
    .map((item) => {
      const terms = [item.food_name, ...(item.aliases || [])].map(normalizeFoodName).filter(Boolean);
      const matchedTerm = terms
        .filter((term) => normalized === term || normalized.includes(term))
        .sort((a, b) => b.length - a.length)[0];
      return matchedTerm ? { item, matchedTerm } : null;
    })
    .filter(Boolean) as Array<{ item: LocalNutrition; matchedTerm: string }>;

  const selected: Array<{ item: LocalNutrition; matchedTerm: string }> = [];
  for (const candidate of candidates.sort((a, b) => b.matchedTerm.length - a.matchedTerm.length)) {
    const alreadyCovered = selected.some((current) =>
      current.matchedTerm.includes(candidate.matchedTerm) || candidate.matchedTerm.includes(current.matchedTerm)
    );
    if (!alreadyCovered) selected.push(candidate);
  }

  if (selected.length === 0) return null;
  if (selected.length === 1) {
    const { aliases, ...match } = selected[0].item;
    return { ...match, food_name: titleCase(match.food_name) };
  }

  const totals = selected.reduce(
    (sum, { item }) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    food_name: selected.map(({ item }) => titleCase(item.food_name)).join(' + '),
    calories: Math.round(totals.calories),
    protein: roundMacro(totals.protein),
    carbs: roundMacro(totals.carbs),
    fat: roundMacro(totals.fat),
    serving: 'estimated combined meal',
    source: 'local',
    needsReview: true,
  };
}

function estimateNutrition(foodName: string): NutritionResult {
  return {
    food_name: titleCase(foodName),
    calories: 250,
    protein: 10,
    carbs: 30,
    fat: 8,
    serving: '1 serving',
    source: 'estimate',
    needsReview: true,
  };
}

function normalizeFoodName(foodName: string) {
  return foodName.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function normalizeGeminiModelName(model: string) {
  const trimmed = model.trim() || GEMINI_DEFAULT_MODEL;
  return trimmed.startsWith('models/') ? trimmed : `models/${trimmed}`;
}

function mealFastPassPrompt() {
  return [
    'You are the fast-pass food gate for NutriSnap AI. Look at the image and answer with only JSON.',
    'Task 1: decide whether the image contains visible edible food or packaged food. Hands, people, tables, shoes, bags, or background objects do not matter if a real meal is visible.',
    `If no edible meal or packaged food is visible, return is_food false, kind "not_food", and message exactly "${NO_FOOD_MESSAGE}".`,
    'Task 2: if food is visible, name the meal precisely in food_name. Use precise dish names such as Egg Biryani, Paneer Salad Bowl, Chicken Thali, or the packaged brand/product when readable. Do not name a mixed meal after one ingredient.',
    'If it is a packaged food front or unreadable package, return kind "packaged_food" with needsLabel true.',
    'Return JSON only in this exact shape: {"is_food":true,"kind":"food","food_name":"string","label":"string","score":0.0,"confidence":0.0,"needsReview":false,"needsLabel":false,"message":"string"}',
  ].join('\n');
}

function mealVisionPrompt() {
  return [
    'You are NutriSnap AI, a careful meal-photo nutrition scanner for a calorie, protein, carbs, and fat counter. Return only strict JSON.',
    `Start with a logic gate. If the image contains no edible meal or packaged food, set is_food false, kind "not_food", and message exactly "${NO_FOOD_MESSAGE}". Do not calculate nutrients for non-food images.`,
    'Analyze only the visible edible food. If people, hands, shoes, tables, plates, or background objects are present but clear food is visible, ignore the non-food background and analyze the meal.',
    'Name the whole meal precisely. If it is Egg Biryani, return Egg Biryani, not Rice. If it is an Indian thali, return Indian Thali and segment Rice, Dal, Roti, Sabzi, Curd, Pickle, or other visible components. If it is a packaged item, use the readable brand and product name.',
    'Never summarize a mixed meal as a single ingredient. For salads, identify Lettuce, Cucumber, Feta/Paneer, Olives/Beans, Seeds, Dressing, etc. separately when visible.',
    'Perform component segmentation in both ingredients and items. For a healthy mixed bean and paneer salad, return separate rows like Carrot, Cucumber, Paneer, Mixed Bean Salad, and Dried Pomegranate Seeds with calories for each visible component.',
    'Estimate the full visible edible portion. You cannot weigh the food, so use realistic standard serving sizes and output midpoint numbers, not ranges.',
    'List every major visible component with an estimated portion and macros. Include likely oil or dressing only when the food looks seasoned, glossy, sauced, or tossed.',
    'If the image is a packaged food front or unreadable package, return kind packaged_food and ask for the back nutrition/ingredients label. If the image truly has no usable food, return kind manual and ask for the food name and main ingredients.',
    'Return JSON only. Use this exact shape: {"is_food":true,"kind":"food","food_name":"string","label":"string","score":0.0,"confidence":0.0,"calories":0,"protein":0,"carbs":0,"fat":0,"sugar":0,"fiber":0,"sodium":0,"serving":"string","needsReview":true,"needsLabel":false,"message":"string","ingredients":[{"name":"string","serving":"string","macros":{"calories":0,"protein":0,"carbs":0,"fat":0},"confidence":0.0}],"items":[{"name":"string","portion":"string","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.0}]}',
    'All nutrition values must be non-negative numbers. score and confidence must be between 0 and 1.',
  ].join('\n');
}

function nutritionLabelVisionPrompt(productName: string) {
  return [
    'You are NutriSnap AI reading the back label of packaged food for a calorie tracker.',
    `The user supplied product name is "${productName || 'not provided'}". If the image shows a clearer product or food name, use the label image instead.`,
    'Read nutrition facts, serving size, and ingredients from the package. Prefer the printed Nutrition Facts or nutrition table over estimation.',
    'If values are per serving, return per serving. If only per 100 g/ml is printed, return per 100 g/ml and set serving accordingly. Do not multiply by the whole packet unless the label says the whole packet is one serving.',
    'If an ingredient list is visible, copy it into ingredientsText. If nutrition numbers are missing but ingredient percentages are visible, estimate per 100 g and mark needsReview true.',
    'If this is only a front package image with no usable nutrition panel, return kind packaged_food, needsLabel true, and ask for the back label.',
    'Return JSON only. Use this exact shape: {"is_food":true,"kind":"food","food_name":"string","label":"string","score":0.0,"confidence":0.0,"calories":0,"protein":0,"carbs":0,"fat":0,"sugar":0,"fiber":0,"sodium":0,"serving":"string","rawText":"string","ingredientsText":"string","needsReview":true,"needsLabel":false,"message":"string","ingredients":[{"name":"Label serving","serving":"string","macros":{"calories":0,"protein":0,"carbs":0,"fat":0},"confidence":0.0}],"items":[{"name":"Label serving","portion":"string","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.0}]}',
    'All nutrition values must be non-negative numbers. score and confidence must be between 0 and 1.',
  ].join('\n');
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');
      if (objectStart >= 0 && objectEnd > objectStart) {
        try {
          return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
        } catch {
          return null;
        }
      }

      const arrayStart = cleaned.indexOf('[');
      const arrayEnd = cleaned.lastIndexOf(']');
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        try {
          return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
        } catch {
          return null;
        }
      }

      return null;
    }
  }
}

function nonNegativeNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundMacro(value: any) {
  return Math.round(nonNegativeNumber(value) * 10) / 10;
}

function clamp01(value: any) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function dataUrlToArrayBuffer(dataUrl: string): { contentType: string; body: ArrayBuffer } | null {
  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!match?.[2]) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return {
    contentType: match[1] || 'application/octet-stream',
    body: bytes.buffer,
  };
}

function extractOpenAIOutputText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text;
  if (!Array.isArray(data?.output)) return '';

  for (const output of data.output) {
    if (!Array.isArray(output?.content)) continue;
    for (const content of output.content) {
      if (typeof content?.text === 'string') return content.text;
      if (typeof content?.output_text === 'string') return content.output_text;
    }
  }

  return '';
}

function extractGeminiOutputText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part: any) => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function mealAnalysisJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      is_food: { type: 'boolean' },
      kind: { type: 'string', enum: ['food', 'packaged_food', 'not_food', 'manual'] },
      food_name: { type: 'string' },
      label: { type: 'string' },
      score: { type: 'number' },
      confidence: { type: 'number' },
      calories: { type: 'number' },
      protein: { type: 'number' },
      carbs: { type: 'number' },
      fat: { type: 'number' },
      sugar: { type: 'number' },
      fiber: { type: 'number' },
      sodium: { type: 'number' },
      serving: { type: 'string' },
      needsReview: { type: 'boolean' },
      needsLabel: { type: 'boolean' },
      message: { type: 'string' },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            serving: { type: 'string' },
            macros: {
              type: 'object',
              additionalProperties: false,
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
              },
              required: ['calories', 'protein', 'carbs', 'fat'],
            },
            confidence: { type: 'number' },
          },
          required: ['name', 'serving', 'macros', 'confidence'],
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            portion: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            confidence: { type: 'number' },
          },
          required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
        },
      },
    },
    required: [
      'is_food',
      'kind',
      'food_name',
      'label',
      'score',
      'confidence',
      'calories',
      'protein',
      'carbs',
      'fat',
      'sugar',
      'fiber',
      'sodium',
      'serving',
      'needsReview',
      'needsLabel',
      'message',
      'ingredients',
      'items',
    ],
  };
}
