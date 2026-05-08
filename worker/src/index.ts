// NutriSnap API - Zero-dependency version for direct Cloudflare deployment
// This version is TypeScript-compatible with proper type annotations

export interface Env {
  DB: D1Database;
  HUGGINGFACE_API_KEY?: string;
  HUGGINGFACE_API_TOKEN?: string;
  USDA_API_KEY?: string;
  JWT_SECRET: string;
}

type DetectionResult = {
  label: string;
  score: number;
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
  source?: 'local' | 'usda' | 'openfoodfacts' | 'ocr' | 'manual' | 'estimate';
  needsReview?: boolean;
};

const HUGGINGFACE_MODEL = 'nateraw/vit-base-food101';
const OBJECT_DETECTION_MODEL = 'facebook/detr-resnet-50';
const OCR_MODEL = 'microsoft/trocr-base-printed';

const LOCAL_NUTRITION: NutritionResult[] = [
  { food_name: 'rice', calories: 200, protein: 4, carbs: 45, fat: 0.5, serving: '1 cup cooked', source: 'local' },
  { food_name: 'roti', calories: 80, protein: 3, carbs: 15, fat: 0.5, serving: '1 piece', source: 'local' },
  { food_name: 'dal', calories: 150, protein: 9, carbs: 20, fat: 5, serving: '1 cup', source: 'local' },
  { food_name: 'chicken curry', calories: 250, protein: 25, carbs: 8, fat: 12, serving: '1 cup', source: 'local' },
  { food_name: 'paneer tikka', calories: 265, protein: 18, carbs: 6, fat: 20, serving: '100 g', source: 'local' },
  { food_name: 'idli', calories: 120, protein: 4, carbs: 24, fat: 0.5, serving: '2 pieces', source: 'local' },
  { food_name: 'dosa', calories: 180, protein: 4, carbs: 30, fat: 6, serving: '1 piece', source: 'local' },
  { food_name: 'samosa', calories: 260, protein: 4, carbs: 30, fat: 14, serving: '1 piece', source: 'local' },
  { food_name: 'biryani', calories: 350, protein: 12, carbs: 45, fat: 12, serving: '1 cup', source: 'local' },
  { food_name: 'egg', calories: 70, protein: 6, carbs: 0.6, fat: 5, serving: '1 boiled egg', source: 'local' },
  { food_name: 'banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, serving: '1 medium', source: 'local' },
  { food_name: 'milk', calories: 150, protein: 8, carbs: 12, fat: 8, serving: '1 cup', source: 'local' },
  { food_name: 'oats', calories: 150, protein: 5, carbs: 27, fat: 2.5, serving: '1 cup cooked', source: 'local' },
  { food_name: 'apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving: '1 medium', source: 'local' },
  { food_name: 'yogurt', calories: 150, protein: 12, carbs: 17, fat: 4, serving: '1 cup', source: 'local' },
  { food_name: 'pizza', calories: 285, protein: 12, carbs: 36, fat: 10, serving: '1 slice', source: 'local' },
  { food_name: 'burger', calories: 354, protein: 17, carbs: 29, fat: 18, serving: '1 burger', source: 'local' },
  { food_name: 'salad', calories: 120, protein: 3, carbs: 12, fat: 7, serving: '1 bowl', source: 'local' },
  { food_name: 'sandwich', calories: 300, protein: 14, carbs: 36, fat: 11, serving: '1 sandwich', source: 'local' },
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
      if (path === '/api/nutrition-label' && request.method === 'POST') return await handleNutritionLabel(request, env);
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

  const objectWarning = classifyObjectWarning(objects, food);
  if (objectWarning) return jsonResponse(objectWarning);

  const packagedFromObject = classifyPackagedFood(objects, '', food);
  if (packagedFromObject) return jsonResponse(packagedFromObject);

  if (food && food.score >= 0.5) return jsonResponse({ ...food, kind: 'food' });

  const ocrText = await extractTextWithHuggingFace(body, imageType, env);
  const packaged = classifyPackagedFood(objects, ocrText, food);
  if (packaged) return jsonResponse(packaged);

  if (food) return jsonResponse({ ...food, kind: 'food' });

  return jsonResponse({
    label: '',
    score: 0,
    kind: 'manual',
    needsReview: true,
    message: 'AI detection is temporarily unavailable. Enter the food name manually.',
  } satisfies DetectionResult);
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
    source: rawText ? 'ocr' : 'manual',
    needsReview: true,
  } satisfies NutritionResult);
}

async function handleNutrition(request: Request, env: Env): Promise<Response> {
  const { foodName } = await request.json() as any;
  if (!foodName || typeof foodName !== 'string') return jsonResponse({ message: 'Food name is required' }, 400);

  const local = getLocalNutrition(foodName);
  if (local) return jsonResponse(local);

  const usda = await getUsdaNutrition(foodName, env.USDA_API_KEY);
  if (usda) return jsonResponse(usda);

  const openFoodFacts = await getOpenFoodFactsNutrition(foodName);
  if (openFoodFacts) return jsonResponse(openFoodFacts);

  return jsonResponse(estimateNutrition(foodName));
}

async function handleLog(request: Request, env: Env, userId: number): Promise<Response> {
  const data = await request.json() as any;
  const result = await env.DB.prepare('INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, meal_type, image_url, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date(\'now\'))')
    .bind(
      userId,
      data.food_name,
      Math.round(Number(data.calories) || 0),
      Number(data.protein) || 0,
      Number(data.carbs) || 0,
      Number(data.fat) || 0,
      data.meal_type || 'snack',
      data.image_url || null,
    ).run();
  return jsonResponse({ id: result.meta.last_row_id });
}

async function handleDashboard(request: Request, env: Env, userId: number): Promise<Response> {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first() as any;
  const totals = await env.DB.prepare('SELECT SUM(calories) as calories, SUM(protein) as protein, SUM(carbs) as carbs, SUM(fat) as fat FROM meals WHERE user_id = ? AND date = date(\'now\')').bind(userId).first() as any;
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
    protein_goal: Number(user?.protein_goal) || 150,
    carbs_goal: Number(user?.carbs_goal) || 250,
    fat_goal: Number(user?.fat_goal) || 70,
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

  const person = objects.find((item) => item.label === 'person' && item.score >= 0.45);
  if (person) {
    return {
      label: 'human face or person',
      objectLabel: person.label,
      score: person.score,
      kind: 'not_food',
      needsReview: true,
      message: 'This looks like a human face or person, not food. Please upload a meal or food package only.',
    };
  }

  const top = objects[0];
  if (!top || top.score < 0.55 || FOOD_OBJECTS.has(top.label)) return null;
  if ((food?.score || 0) >= 0.45) return null;
  if (!NON_FOOD_OBJECTS.has(top.label)) return null;

  return {
    label: top.label,
    objectLabel: top.label,
    score: top.score,
    kind: 'not_food',
    needsReview: true,
    message: `This looks like ${articleFor(top.label)} ${top.label}, not a food item. Please scan a meal or packaged food.`,
  };
}

function classifyPackagedFood(objects: Array<{ label: string; score: number }> | null, rawText: string, food: DetectionResult | null): DetectionResult | null {
  const topPackage = objects?.find((item) => PACKAGED_OBJECTS.has(item.label) && item.score >= 0.55);
  const textLooksPackaged = PACKAGED_TEXT_HINTS.some((hint) => rawText.toLowerCase().includes(hint));

  if (!topPackage && !textLooksPackaged) return null;

  return {
    label: food?.label || 'packaged food',
    objectLabel: topPackage?.label,
    score: Math.max(food?.score || 0, topPackage?.score || 0.6),
    kind: 'packaged_food',
    needsLabel: true,
    needsReview: true,
    message: 'This looks like packaged food. Upload the back side of the package with the ingredients or nutrition label so macros can be calculated from the label.',
  };
}

function parseNutritionLabel(rawText: string, productName: string): NutritionResult | null {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const calories = findNutrientValue(normalized, ['calories', 'kcal', 'energy']);
  const protein = findNutrientValue(normalized, ['protein']);
  const carbs = findNutrientValue(normalized, ['total carbohydrate', 'carbohydrate', 'carbs']);
  const fat = findNutrientValue(normalized, ['total fat', 'fat']);
  const sugar = findNutrientValue(normalized, ['total sugars', 'sugars', 'sugar']);
  const fiber = findNutrientValue(normalized, ['dietary fiber', 'fibre', 'fiber']);
  const sodium = findNutrientValue(normalized, ['sodium', 'salt']);
  const serving = findServingText(normalized);

  if ([calories, protein, carbs, fat].every((value) => value === null)) return null;

  return {
    food_name: titleCase(productName),
    calories: Math.round(calories || 0),
    protein: protein || 0,
    carbs: carbs || 0,
    fat: fat || 0,
    sugar: sugar || undefined,
    fiber: fiber || undefined,
    sodium: sodium || undefined,
    serving: serving || 'from package label',
    rawText,
    source: 'ocr',
    needsReview: [calories, protein, carbs, fat].some((value) => value === null),
  };
}

function findNutrientValue(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}[^0-9]{0,24}(\\d+(?:\\.\\d+)?)`, 'i'));
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

function findServingText(text: string): string | undefined {
  const match = text.match(/serving size\s*[:\-]?\s*([a-z0-9 .()/-]{2,40})/i);
  return match?.[1]?.trim();
}

function articleFor(label: string) {
  return /^[aeiou]/i.test(label) ? 'an' : 'a';
}

async function getUsdaNutrition(foodName: string, apiKey?: string): Promise<NutritionResult | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrient = (name: string) => Number(food.foodNutrients?.find((n: any) => n.nutrientName?.includes(name))?.value) || 0;
    return {
      food_name: food.description || foodName,
      calories: Math.round(nutrient('Energy') || 200),
      protein: nutrient('Protein'),
      carbs: nutrient('Carbohydrate'),
      fat: nutrient('Total lipid'),
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
  const match = LOCAL_NUTRITION.find((item) => normalized.includes(normalizeFoodName(item.food_name)));
  return match ? { ...match, food_name: titleCase(match.food_name) } : null;
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

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
