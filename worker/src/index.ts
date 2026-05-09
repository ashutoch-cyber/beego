// NutriSnap API - Zero-dependency version for direct Cloudflare deployment
// This version is TypeScript-compatible with proper type annotations

export interface Env {
  DB: D1Database;
  HUGGINGFACE_API_KEY?: string;
  HUGGINGFACE_API_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OPENAI_VISION_MODEL?: string;
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
  source?: 'local' | 'usda' | 'openfoodfacts' | 'ocr' | 'manual' | 'estimate' | 'vision';
  needsReview?: boolean;
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

type MealAnalysisResult = NutritionResult & DetectionResult & {
  confidence?: number;
  items?: MealComponent[];
};

type LocalNutrition = NutritionResult & {
  aliases?: string[];
};

const HUGGINGFACE_MODEL = 'nateraw/vit-base-food101';
const OBJECT_DETECTION_MODEL = 'facebook/detr-resnet-50';
const OCR_MODEL = 'microsoft/trocr-base-printed';

const LOCAL_NUTRITION: LocalNutrition[] = [
  { food_name: 'rice', aliases: ['white rice', 'steamed rice', 'cooked rice'], calories: 200, protein: 4, carbs: 45, fat: 0.5, serving: '1 cup cooked', source: 'local' },
  { food_name: 'fried rice', aliases: ['veg fried rice', 'vegetable fried rice'], calories: 330, protein: 9, carbs: 48, fat: 11, serving: '1 bowl', source: 'local' },
  { food_name: 'roti', aliases: ['chapati', 'phulka'], calories: 80, protein: 3, carbs: 15, fat: 0.5, serving: '1 piece', source: 'local' },
  { food_name: 'paratha', aliases: ['aloo paratha'], calories: 260, protein: 6, carbs: 36, fat: 10, serving: '1 piece', source: 'local' },
  { food_name: 'dal', aliases: ['daal', 'lentils', 'lentil curry'], calories: 150, protein: 9, carbs: 20, fat: 5, serving: '1 cup', source: 'local' },
  { food_name: 'chicken curry', aliases: ['chicken gravy', 'chicken masala'], calories: 250, protein: 25, carbs: 8, fat: 12, serving: '1 cup', source: 'local' },
  { food_name: 'grilled chicken', aliases: ['chicken breast', 'roast chicken'], calories: 165, protein: 31, carbs: 0, fat: 4, serving: '100 g', source: 'local' },
  { food_name: 'paneer tikka', aliases: ['paneer', 'paneer curry'], calories: 265, protein: 18, carbs: 6, fat: 20, serving: '100 g', source: 'local' },
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
  { food_name: 'yogurt', aliases: ['curd', 'dahi'], calories: 150, protein: 12, carbs: 17, fat: 4, serving: '1 cup', source: 'local' },
  { food_name: 'pizza', calories: 285, protein: 12, carbs: 36, fat: 10, serving: '1 slice', source: 'local' },
  { food_name: 'burger', aliases: ['hamburger', 'cheeseburger'], calories: 354, protein: 17, carbs: 29, fat: 18, serving: '1 burger', source: 'local' },
  { food_name: 'salad', aliases: ['green salad', 'caesar salad'], calories: 120, protein: 3, carbs: 12, fat: 7, serving: '1 bowl', source: 'local' },
  { food_name: 'sandwich', aliases: ['toast sandwich'], calories: 300, protein: 14, carbs: 36, fat: 11, serving: '1 sandwich', source: 'local' },
  { food_name: 'pasta', aliases: ['spaghetti', 'macaroni'], calories: 320, protein: 11, carbs: 52, fat: 8, serving: '1 bowl', source: 'local' },
  { food_name: 'noodles', aliases: ['chow mein', 'hakka noodles'], calories: 360, protein: 9, carbs: 52, fat: 13, serving: '1 bowl', source: 'local' },
  { food_name: 'french fries', aliases: ['fries'], calories: 365, protein: 4, carbs: 48, fat: 17, serving: '1 medium serving', source: 'local' },
  { food_name: 'cake', aliases: ['chocolate cake', 'cheesecake'], calories: 350, protein: 5, carbs: 45, fat: 18, serving: '1 slice', source: 'local' },
  { food_name: 'ice cream', calories: 210, protein: 4, carbs: 24, fat: 11, serving: '1 cup', source: 'local' },
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

async function handleAnalyzeMeal(request: Request, env: Env): Promise<Response> {
  try {
    const image = await readImageFromRequest(request);
    if (!image) return jsonResponse({ message: 'No image data' }, 400);

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

    const objectWarning = classifyObjectWarning(objects, food);
    if (objectWarning) return jsonResponse(objectWarning);

    const packagedFromObject = classifyPackagedFood(objects, '', food);
    if (packagedFromObject) return jsonResponse(packagedFromObject);

    if (food && food.score >= 0.5) return jsonResponse({ ...food, kind: 'food' });

    const ocrText = await extractTextWithHuggingFace(body, imageType, env);
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

async function analyzeMealWithFallbackModels(body: ArrayBuffer, imageType: string, env: Env): Promise<MealAnalysisResult> {
  const [food, objects] = await Promise.all([
    detectWithHuggingFace(body, imageType, env),
    detectObjectsWithHuggingFace(body, imageType, env),
  ]);

  const objectWarning = classifyObjectWarning(objects, food);
  if (objectWarning) return detectionToMealAnalysis(objectWarning);

  const packagedFromObject = classifyPackagedFood(objects, '', food);
  if (packagedFromObject) return detectionToMealAnalysis(packagedFromObject);

  let ocrText = '';
  if (!food || food.score < 0.75 || objects?.some((item) => PACKAGED_OBJECTS.has(item.label))) {
    ocrText = await extractTextWithHuggingFace(body, imageType, env);
    const packaged = classifyPackagedFood(objects, ocrText, food);
    if (packaged) return detectionToMealAnalysis(packaged);
  }

  if (!food?.label) return manualMealAnalysisResponse();

  const nutrition = await resolveNutrition(food.label, env);
  const needsReview = Boolean(nutrition.needsReview || food.score < 0.7 || nutrition.source === 'estimate');
  return normalizeMealAnalysis({
    ...nutrition,
    label: food.label,
    score: food.score,
    confidence: food.score,
    kind: 'food',
    needsReview,
    message: needsReview ? 'This is an estimate. Review the food name and totals before logging.' : '',
    items: [{
      name: nutrition.food_name,
      portion: nutrition.serving || 'estimated serving',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      confidence: food.score,
    }],
  });
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
            content: 'You estimate calories and macros from food photos for a calorie tracker. Return realistic estimates for the whole visible edible portion. Identify each visible food component and portion. If the image is not food, mark it not_food. If it is a packaged product without a readable nutrition facts panel, mark it packaged_food and ask for the back label. If a nutrition label is visible, read the label values. Be conservative and mark needsReview when uncertain. Never return negative numbers.',
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Analyze this scan and return calories, protein, carbs, and fat for the full meal shown.' },
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

function manualDetectionResponse(message = 'AI detection is temporarily unavailable. Enter the food name manually.') {
  return jsonResponse({
    label: '',
    score: 0,
    kind: 'manual',
    needsReview: true,
    message,
  } satisfies DetectionResult);
}

function manualMealAnalysisResponse(message = 'AI meal analysis is temporarily unavailable. Enter the food name manually.'): MealAnalysisResult {
  return {
    food_name: '',
    label: '',
    score: 0,
    confidence: 0,
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

function detectionToMealAnalysis(detection: DetectionResult): MealAnalysisResult {
  const foodName = detection.kind === 'not_food' ? detection.label : (detection.label || 'Packaged food');
  return normalizeMealAnalysis({
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
  const kind = ['food', 'packaged_food', 'not_food', 'manual'].includes(String(input.kind))
    ? input.kind
    : 'food';
  const label = String(input.label || input.food_name || '').trim();
  const foodName = String(input.food_name || label || (kind === 'packaged_food' ? 'Packaged Food' : 'Food')).trim();
  const calories = nonNegativeNumber(input.calories);
  const protein = nonNegativeNumber(input.protein);
  const carbs = nonNegativeNumber(input.carbs);
  const fat = nonNegativeNumber(input.fat);
  const score = clamp01(input.score ?? input.confidence ?? 0);
  const items = Array.isArray(input.items)
    ? input.items.map((item) => ({
      name: titleCase(String(item?.name || 'Food')),
      portion: String(item?.portion || 'estimated portion'),
      calories: Math.round(nonNegativeNumber(item?.calories)),
      protein: roundMacro(item?.protein),
      carbs: roundMacro(item?.carbs),
      fat: roundMacro(item?.fat),
      confidence: clamp01(item?.confidence ?? score),
    })).filter((item) => item.name && (item.calories || item.protein || item.carbs || item.fat))
    : [];

  return {
    food_name: titleCase(foodName),
    label: label.toLowerCase(),
    score,
    confidence: score,
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
    source: input.source || 'estimate',
    needsReview: Boolean(input.needsReview || kind !== 'food' || score < 0.65 || !calories),
    needsLabel: Boolean(input.needsLabel),
    message: String(input.message || '').trim(),
    items,
  };
}

async function handleNutrition(request: Request, env: Env): Promise<Response> {
  const { foodName } = await request.json() as any;
  if (!foodName || typeof foodName !== 'string') return jsonResponse({ message: 'Food name is required' }, 400);

  return jsonResponse(await resolveNutrition(foodName, env));
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

async function handleExport(request: Request, env: Env, userId: number): Promise<Response> {
  const [profile, meals, weights, water] = await Promise.all([
    env.DB.prepare('SELECT id, email, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, current_weight, created_at FROM users WHERE id = ?').bind(userId).first(),
    env.DB.prepare('SELECT id, food_name, calories, protein, carbs, fat, meal_type, date, created_at FROM meals WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 2000').bind(userId).all(),
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

async function resolveNutrition(foodName: string, env: Env): Promise<NutritionResult> {
  const local = getLocalNutrition(foodName);
  if (local) return local;

  const usda = await getUsdaNutrition(foodName, env.USDA_API_KEY);
  if (usda) return usda;

  const openFoodFacts = await getOpenFoodFactsNutrition(foodName);
  if (openFoodFacts) return openFoodFacts;

  return estimateNutrition(foodName);
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

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
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

function mealAnalysisJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
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
      'items',
    ],
  };
}
