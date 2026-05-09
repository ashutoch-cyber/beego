'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Sparkles, Loader2, Package, FileText, Images, Clock, CheckCircle2, Utensils, ScanBarcode, Eye, Layers3, Wand2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { analyzeMeal, analyzeMealFast, analyzeNutritionLabel, detectFood, getNutrition, logMeal } from '@/lib/api';
import { cacheMeal } from '@/lib/offline';

type Detection = {
  label: string;
  score: number;
  is_food?: boolean;
  kind?: 'food' | 'packaged_food' | 'not_food' | 'manual';
  needsReview?: boolean;
  needsLabel?: boolean;
  message?: string;
  objectLabel?: string;
};

type AnalysisPhase = 'idle' | 'detecting' | 'detailing';

type Nutrition = {
  food_name?: string;
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
  source?: string;
  confidence?: number;
  needsReview?: boolean;
  message?: string;
  items?: Array<{
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence?: number;
  }>;
  ingredients?: Array<{
    name: string;
    serving: string;
    macros: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    confidence?: number;
  }>;
};

type SnapGalleryItem = {
  id: string;
  image: string;
  foodName: string;
  mealType: string;
  capturedAt: string;
  status: 'Processing' | 'Auto-Tracked' | 'Needs Review';
};

const NO_FOOD_MESSAGE = 'No food detected. Please snap a picture of a meal or packaged food.';

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string>('');
  const [labelImage, setLabelImage] = useState<string | null>(null);
  const [detected, setDetected] = useState<Detection | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle');
  const [step, setStep] = useState<'upload' | 'detect' | 'confirm' | 'label' | 'nutrition' | 'done'>('upload');
  const [customFood, setCustomFood] = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
  const [aiEditOpen, setAiEditOpen] = useState(false);
  const [manualNutrition, setManualNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '', sugar: '', fiber: '', sodium: '' });
  const [mealType, setMealType] = useState('breakfast');
  const [snapOverlayOpen, setSnapOverlayOpen] = useState(false);
  const [snapGallery, setSnapGallery] = useState<SnapGalleryItem[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSnapGallery(loadSnapGallery());
  }, []);

  function normalizeNutritionResult(data: any, fallbackName = 'Food'): Nutrition {
    const rawItems = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.ingredients)
        ? data.ingredients.map((ingredient: any) => ({
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
      .map((item: any) => ({
        name: String(item?.name || 'Food'),
        portion: String(item?.portion || 'estimated portion'),
        calories: Math.round(toNumber(item?.calories)),
        protein: roundMacro(item?.protein),
        carbs: roundMacro(item?.carbs),
        fat: roundMacro(item?.fat),
        confidence: toNumber(item?.confidence),
      })).filter((item: NonNullable<Nutrition['items']>[number]) => item.name && (item.calories || item.protein || item.carbs || item.fat))
    const ingredients = items.map((item: NonNullable<Nutrition['items']>[number]) => ({
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
      food_name: String(data?.food_name || fallbackName || 'Food'),
      calories: Math.round(toNumber(data?.calories)),
      protein: roundMacro(data?.protein),
      carbs: roundMacro(data?.carbs),
      fat: roundMacro(data?.fat),
      serving: data?.serving ? String(data.serving) : undefined,
      sugar: data?.sugar === undefined ? undefined : roundMacro(data.sugar),
      fiber: data?.fiber === undefined ? undefined : roundMacro(data.fiber),
      sodium: data?.sodium === undefined ? undefined : Math.round(toNumber(data.sodium)),
      rawText: data?.rawText ? String(data.rawText) : undefined,
      ingredientsText: data?.ingredientsText ? String(data.ingredientsText) : undefined,
      source: data?.source,
      confidence: toNumber(data?.confidence ?? data?.score),
      needsReview: Boolean(data?.needsReview),
      message: data?.message,
      items,
      ingredients,
    };
  }

  function setNutritionResult(data: any, fallbackName?: string) {
    const normalized = normalizeNutritionResult(data, fallbackName);
    setNutrition(normalized);
    if (normalized.food_name && !/^food$|^packaged food$/i.test(normalized.food_name)) {
      setCustomFood(normalized.food_name);
    }
  }

  function detectionFromAnalysis(data: any): Detection {
    const explicitNonFood = data?.is_food === false || data?.kind === 'not_food';
    return {
      label: String(data?.label || data?.food_name || '').trim(),
      score: toNumber(data?.score ?? data?.confidence),
      is_food: data?.is_food,
      kind: explicitNonFood ? 'not_food' : (data?.kind || 'food'),
      needsReview: Boolean(data?.needsReview),
      needsLabel: Boolean(data?.needsLabel),
      message: explicitNonFood ? NO_FOOD_MESSAGE : data?.message,
      objectLabel: data?.objectLabel,
    };
  }

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    setAnalysisPhase('detecting');
    setSnapOverlayOpen(false);
    setNutrition(null);
    setDetected(null);
    setAiEditOpen(false);
    const capturedAt = new Date(file.lastModified || Date.now());
    const inferredMeal = inferMealType(capturedAt);
    let snapId = '';
    try {
      const imageData = await readFileAsDataUrl(file);
      setImage(imageData);
      setMealType(inferredMeal);
      snapId = addSnapGalleryItem({
        image: imageData,
        foodName: 'Analyzing food',
        mealType: inferredMeal,
        capturedAt: capturedAt.toISOString(),
        status: 'Processing',
      });
      setSnapGallery(loadSnapGallery());

      setStep('detect');
      let fastDetection: Detection | null = null;
      try {
        const fastRes = await analyzeMealFast(file);
        fastDetection = detectionFromAnalysis(fastRes);
        setDetected(fastDetection);
        if (fastDetection.label && fastDetection.kind === 'food') setCustomFood(fastDetection.label);
        updateSnapGalleryItem(snapId, {
          foodName: fastRes?.food_name || fastDetection.label || 'Food scan',
          mealType: inferredMeal,
          status: fastDetection.kind === 'food' && !fastDetection.needsLabel ? 'Processing' : 'Needs Review',
        });
        setSnapGallery(loadSnapGallery());

        if (fastDetection.kind === 'not_food' || fastDetection.is_food === false) {
          setStep('confirm');
          return;
        }

        if (fastDetection.kind === 'packaged_food' || fastDetection.needsLabel) {
          setStep('confirm');
          return;
        }
      } catch {
        fastDetection = null;
      }

      setAnalysisPhase('detailing');
      const scanRes = await analyzeMeal(file);
      const nextDetection = detectionFromAnalysis(scanRes);
      setDetected(nextDetection);
      updateSnapGalleryItem(snapId, {
        foodName: scanRes?.food_name || nextDetection.label || 'Food scan',
        mealType: inferredMeal,
        status: nextDetection.kind === 'food' && !nextDetection.needsLabel ? 'Auto-Tracked' : 'Needs Review',
      });
      setSnapGallery(loadSnapGallery());

      if (nextDetection.kind === 'not_food' || nextDetection.kind === 'packaged_food' || nextDetection.needsLabel || nextDetection.kind === 'manual') {
        setStep('confirm');
        return;
      }

      const foodName = scanRes?.food_name || nextDetection.label || 'Food';
      setCustomFood(foodName);
      setNutritionResult(scanRes, foodName);
      setStep('nutrition');
    } catch (err: any) {
      try {
        setAnalysisPhase('detecting');
        const detectRes = await detectFood(file);
        setDetected(detectRes);
        if (snapId) {
          updateSnapGalleryItem(snapId, {
            foodName: detectRes?.label || 'Food scan',
            mealType: inferredMeal,
            status: detectRes?.kind === 'food' ? 'Auto-Tracked' : 'Needs Review',
          });
          setSnapGallery(loadSnapGallery());
        }
        setStep('confirm');
      } catch {
        setDetected({
          label: '',
          score: 0,
          kind: 'manual',
          needsReview: true,
          message: 'I could not identify this meal confidently. Add its name and main ingredients so calories and macros can still be estimated.',
        });
        if (snapId) {
          updateSnapGalleryItem(snapId, { foodName: 'Food scan', status: 'Needs Review' });
          setSnapGallery(loadSnapGallery());
        }
        setError('');
        setStep('confirm');
      }
    } finally {
      setLoading(false);
      setAnalysisPhase('idle');
    }
  }, []);

  async function handleConfirmFood(foodName: string, ingredients = '') {
    setLoading(true);
    setError('');
    try {
      const nutri = await getNutrition(foodName, ingredients);
      setNutritionResult(nutri, foodName);
      setStep('nutrition');
    } catch (err: any) {
      setError('Failed to fetch nutrition. Using estimates.');
      setNutritionResult({
        food_name: foodName,
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 8,
        serving: '1 serving',
        source: 'estimate',
        needsReview: true,
      }, foodName);
      setStep('nutrition');
    } finally {
      setLoading(false);
    }
  }

  const handleLabelFile = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setLabelImage(e.target?.result as string);
      reader.readAsDataURL(file);

      const productName = customFood.trim() || detected?.label || 'Packaged food';
      const nutri = await analyzeNutritionLabel(file, productName);
      setNutritionResult(nutri, productName);
      setStep('nutrition');
    } catch (err: any) {
      setError(friendlyScanError(err, 'Could not read the package label. Enter the nutrition values manually.'));
    } finally {
      setLoading(false);
    }
  }, [customFood, detected?.label]);

  function handleManualLabelNutrition() {
    const calories = Number(manualNutrition.calories);
    if (!calories || calories < 0) {
      setError('Enter calories from the package label to continue.');
      return;
    }

    setNutritionResult({
      food_name: customFood.trim() || detected?.label || 'Packaged food',
      calories,
      protein: Number(manualNutrition.protein) || 0,
      carbs: Number(manualNutrition.carbs) || 0,
      fat: Number(manualNutrition.fat) || 0,
      sugar: Number(manualNutrition.sugar) || undefined,
      fiber: Number(manualNutrition.fiber) || undefined,
      sodium: Number(manualNutrition.sodium) || undefined,
      serving: 'from package label',
      source: 'manual',
    });
    setError('');
    setStep('nutrition');
  }

  function updateNutritionField(field: keyof Pick<Nutrition, 'calories' | 'protein' | 'carbs' | 'fat'>, value: string) {
    setNutrition((current) => current ? {
      ...current,
      [field]: field === 'calories' ? Math.round(toNumber(value)) : roundMacro(value),
      needsReview: true,
    } : current);
  }

  function updateNutritionFoodName(value: string) {
    setNutrition((current) => current ? { ...current, food_name: value, needsReview: true } : current);
    setCustomFood(value);
  }

  async function handleRecalculateFromIngredients() {
    const foodName = nutrition?.food_name || customFood.trim() || detected?.label || 'Custom meal';
    if (!manualIngredients.trim()) {
      setError('Enter ingredients with amounts to calculate the breakdown.');
      return;
    }

    await handleConfirmFood(foodName, manualIngredients);
  }

  function startPackagedFlow() {
    setDetected((current) => ({
      label: current?.label || customFood.trim() || 'packaged food',
      score: current?.score || 0,
      kind: 'packaged_food',
      needsLabel: true,
      needsReview: true,
      message: 'Packaged food needs the back label for accurate calories and macros.',
    }));
    setError('');
    setStep('label');
  }

  async function saveMeal(selectedMealType: string) {
    if (!nutrition) return;

    setLoading(true);
    try {
      const foodName = nutrition.food_name || customFood.trim() || detected?.label || 'Food';
      const imageUrl = image && image.length < 180000 ? image : undefined;
      const meal = {
        food_name: foodName,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        meal_type: selectedMealType,
        image_url: imageUrl,
        date: new Date().toISOString().split('T')[0],
      };
      await logMeal(meal);
      await cacheMeal(meal);
      setStep('done');
    } catch (err: any) {
      const imageUrl = image && image.length < 180000 ? image : undefined;
      await cacheMeal({
        food_name: nutrition.food_name || customFood.trim() || detected?.label || 'Food',
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        meal_type: selectedMealType,
        image_url: imageUrl,
        date: new Date().toISOString().split('T')[0],
      });
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogMeal() {
    await saveMeal(mealType);
  }

  async function handleQuickLog(selectedMealType: string) {
    setMealType(selectedMealType);
    await saveMeal(selectedMealType);
  }

  function reset() {
    setImage(null);
    setImageKey('');
    setLabelImage(null);
    setDetected(null);
    setNutrition(null);
    setStep('upload');
    setAnalysisPhase('idle');
    setCustomFood('');
    setManualIngredients('');
    setAiEditOpen(false);
    setManualNutrition({ calories: '', protein: '', carbs: '', fat: '', sugar: '', fiber: '', sodium: '' });
    setError('');
  }

  const detectedLabel = detected?.label?.trim() || '';
  const confirmedFood = customFood.trim() || detectedLabel;
  const needsManualReview = Boolean(detected?.needsReview || !detectedLabel);
  const isPackagedFood = detected?.kind === 'packaged_food' || detected?.needsLabel;
  const isNotFood = detected?.kind === 'not_food' || detected?.is_food === false;
  const doneFoodName = confirmedFood || nutrition?.food_name || 'Meal';
  const progressSteps = ['upload', 'detect', 'confirm', ...(isPackagedFood || step === 'label' ? ['label'] : []), 'nutrition', 'done'];
  const currentStepIndex = progressSteps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#f5faf7] pb-24">
      <div className="rounded-b-[2.5rem] bg-[#1B4332] px-6 pb-8 pt-12 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9ed8b6]">Healthify Snap</p>
        <h1 className="mt-1 text-2xl font-black">AI Food Scanner</h1>
        <p className="mt-1 text-sm font-medium text-[#c7ead4]">Snap a meal and log segmented ingredients</p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {progressSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-primary-600 text-white scale-110' :
                currentStepIndex > i ? 'bg-primary-200 text-primary-700' :
                'bg-gray-200 text-gray-400'
              }`}>
                {currentStepIndex > i ? <Check size={14} /> : i + 1}
              </div>
              {i < progressSteps.length - 1 && (
                <div className={`w-6 h-0.5 rounded-full ${
                  currentStepIndex > i ? 'bg-primary-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="card bg-red-50 border-red-200 mb-4 flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="rounded-[2rem] bg-[#1B4332] p-5 text-white shadow-[0_18px_45px_rgba(27,67,50,0.18)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9ed8b6]">Healthify AI</p>
                  <h3 className="mt-2 text-2xl font-black">Snap Food</h3>
                  <p className="mt-1 text-sm font-medium text-[#c7ead4]">Detect food and segment visible ingredients.</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/12">
                  <Camera size={30} />
                </div>
              </div>
              <button
                onClick={() => setSnapOverlayOpen(true)}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-[#2D6A4F] shadow-lg shadow-black/10"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                Open Snap Food
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <AccuracyTips />
            <SnapGallery items={snapGallery} />
          </div>
        )}

        {snapOverlayOpen && (
          <div className="fixed inset-0 z-[80] flex items-end bg-[#071b12]/80 p-4 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-lg rounded-[2rem] bg-white p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2D6A4F]">Snap Food</p>
                  <h3 className="mt-1 text-xl font-black text-[#183c2a]">Choose photo source</h3>
                </div>
                <button
                  onClick={() => setSnapOverlayOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef6f2] text-[#315743]"
                  aria-label="Close snap food"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-[1.5rem] bg-[#2D6A4F] p-5 text-white"
                >
                  <Camera size={28} />
                  <span className="mt-3 text-sm font-black">Camera</span>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-[1.5rem] bg-[#eef6f2] p-5 text-[#183c2a]"
                >
                  <Images size={28} />
                  <span className="mt-3 text-sm font-black">Google Photos</span>
                </button>
              </div>
              <div className="mt-4">
                <AccuracyTips compact />
              </div>
              <p className="mt-4 text-center text-xs font-semibold text-[#7b9587]">
                Photo time is used to suggest Breakfast, Lunch, Dinner, or Snack.
              </p>
            </div>
          </div>
        )}

        {/* Image Preview + Detecting */}
        {(step === 'detect' || step === 'confirm') && image && (
          <div className="animate-slide-up">
            <div className="card p-3">
              <div className="relative rounded-xl overflow-hidden">
                <img src={image} alt="Food" className="w-full h-64 object-cover" />
                {step === 'detect' && (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#1B4332]/85 via-[#1B4332]/20 to-transparent p-4">
                    <div className="w-full rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5ee] text-[#2D6A4F]">
                          {analysisPhase === 'detailing' ? <Layers3 size={19} /> : <Sparkles className="animate-pulse" size={19} />}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b8b7a]">
                            {analysisPhase === 'detailing' ? 'Food detected' : 'Snap Food AI'}
                          </p>
                          <p className="text-sm font-black text-[#1B4332]">
                            {analysisPhase === 'detailing' && detected?.label ? detected.label : 'Detecting ingredients...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {step === 'detect' && (
              <DetectingIngredientsSkeleton
                phase={analysisPhase}
                label={detected?.label || customFood}
              />
            )}

            {step === 'confirm' && detected && (
              <div className="card mt-4 animate-slide-up">
                {isNotFood ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Scan Warning</p>
                        <h3 className="font-bold text-gray-900 text-lg capitalize">{detected.label}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                      {NO_FOOD_MESSAGE}
                    </p>
                    <button onClick={reset} className="btn-primary w-full">
                      Scan Food Instead
                    </button>
                  </>
                ) : isPackagedFood ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Package className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Packaged Food</p>
                        <h3 className="font-bold text-gray-900 text-lg capitalize">{confirmedFood || 'Packaged food'}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                      {detected.message || 'Upload the back side of the package with the ingredients or nutrition label.'}
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <p className="text-xs text-gray-500 font-medium mb-2">Product name (optional)</p>
                      <input
                        type="text"
                        value={customFood}
                        onChange={(e) => setCustomFood(e.target.value)}
                        placeholder={detected.label || 'AI will read this from the label if visible'}
                        className="input-field text-sm"
                      />
                    </div>
                    <button onClick={startPackagedFlow} className="btn-primary w-full">
                      <FileText size={16} className="inline mr-2" />
                      Upload Back Label
                    </button>
                    <button
                      onClick={() => handleConfirmFood(confirmedFood || 'packaged food')}
                      disabled={loading}
                      className="btn-secondary w-full mt-2"
                    >
                      Use Food Name Instead
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                        <Sparkles className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          {needsManualReview ? 'Needs Details' : 'AI Detected'}
                        </p>
                        <h3 className="font-bold text-gray-900 text-lg capitalize">
                          {needsManualReview ? (customFood || 'Tell Us What This Is') : detected.label}
                        </h3>
                      </div>
                      {!needsManualReview && (
                      <div className="ml-auto">
                        <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-bold">
                          {Math.round(detected.score * 100)}%
                        </span>
                      </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      {detected.message && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-3">
                          {detected.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 font-medium mb-2">
                        {needsManualReview ? 'Food name' : 'Not correct?'}
                      </p>
                      <input
                        type="text"
                        value={customFood}
                        onChange={(e) => setCustomFood(e.target.value)}
                        placeholder={needsManualReview ? 'Enter food name to continue...' : 'Enter food name manually...'}
                        className="input-field text-sm"
                      />
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 font-medium mb-2">Ingredients and amounts</p>
                        <textarea
                          value={manualIngredients}
                          onChange={(e) => setManualIngredients(e.target.value)}
                          placeholder="Example: chicken 120g, fried oil 7ml, cornflour 1 tbsp, green chillies 3 pcs"
                          className="input-field text-sm min-h-[88px] resize-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleConfirmFood(confirmedFood, manualIngredients)}
                      disabled={loading || !confirmedFood}
                      className="btn-primary w-full"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" size={18} /> Fetching nutrition...
                        </span>
                      ) : (
                        manualIngredients.trim()
                          ? 'Calculate From Ingredients'
                          : needsManualReview ? 'Continue' : `Confirm: ${confirmedFood}`
                      )}
                    </button>
                    <button onClick={startPackagedFlow} className="btn-secondary w-full mt-2">
                      <Package size={16} className="inline mr-2" />
                      This Is Packaged Food
                    </button>
                  </>
                )}
                <button onClick={reset} className="btn-secondary w-full mt-2">
                  <X size={16} className="inline mr-1" /> Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Package Label Step */}
        {step === 'label' && (
          <div className="animate-slide-up">
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <FileText className="text-amber-600" size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Back Label</p>
                  <h3 className="font-bold text-gray-900 text-lg">Upload Nutrition Label</h3>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Use the back side where ingredients, calories, protein, carbs, fat, sugar, fiber, or sodium are printed.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 font-medium mb-2">Product name (optional)</p>
                <input
                  type="text"
                  value={customFood}
                  onChange={(e) => setCustomFood(e.target.value)}
                  placeholder={detected?.label || 'AI will read this from the label if visible'}
                  className="input-field text-sm"
                />
              </div>

              {labelImage && (
                <img src={labelImage} alt="Package label" className="w-full h-48 object-cover rounded-xl mb-4" />
              )}

              <input
                ref={labelInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLabelFile(e.target.files[0])}
              />

              <button
                onClick={() => labelInputRef.current?.click()}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Reading label...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Upload size={18} /> Choose Back Label Photo
                  </span>
                )}
              </button>

              <div className="bg-gray-50 rounded-xl p-4 mt-4">
                <p className="text-xs text-gray-500 font-medium mb-3">Enter values manually if the label scan is unclear</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['calories', 'Calories'],
                    ['protein', 'Protein (g)'],
                    ['carbs', 'Carbs (g)'],
                    ['fat', 'Fat (g)'],
                    ['sugar', 'Sugar (g)'],
                    ['fiber', 'Fiber (g)'],
                    ['sodium', 'Sodium (mg)'],
                  ].map(([key, label]) => (
                    <input
                      key={key}
                      type="number"
                      value={manualNutrition[key as keyof typeof manualNutrition]}
                      onChange={(e) => setManualNutrition({ ...manualNutrition, [key]: e.target.value })}
                      placeholder={label}
                      className="input-field text-sm"
                    />
                  ))}
                </div>
                <button onClick={handleManualLabelNutrition} className="btn-secondary w-full mt-3">
                  Use Manual Label Values
                </button>
              </div>

              <button onClick={() => setStep('confirm')} className="btn-secondary w-full mt-2">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Nutrition Step */}
        {step === 'nutrition' && nutrition && (
          <div className="animate-slide-up pb-28">
            <div className="rounded-[1.75rem] border border-[#dce8e1] bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b8b7a]">Snap Food result</p>
                <input
                  type="text"
                  value={nutrition.food_name || customFood}
                  onChange={(e) => updateNutritionFoodName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#dce8e1] bg-[#f8fbf9] px-4 py-3 text-xl font-black text-[#1B4332] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#b7dfcb]"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {nutrition.serving && (
                    <span className="rounded-full border border-[#dce8e1] bg-white px-3 py-1 text-xs font-bold text-[#607869]">
                      {nutrition.serving}
                    </span>
                  )}
                  {nutrition.source && (
                    <span className="rounded-full border border-[#dce8e1] bg-white px-3 py-1 text-xs font-bold capitalize text-[#607869]">
                      {nutrition.source}
                    </span>
                  )}
                  {Boolean(nutrition.confidence) && (
                    <span className="rounded-full border border-[#dce8e1] bg-white px-3 py-1 text-xs font-bold text-[#607869]">
                      {Math.round((nutrition.confidence || 0) * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>

              {nutrition.needsReview && (
                <p className="mb-4 rounded-2xl border border-[#f3d89c] bg-[#fff8e7] p-3 text-xs font-semibold leading-relaxed text-[#8a5a00]">
                  {nutrition.message || 'Review the scanned totals before logging.'}
                </p>
              )}

              {aiEditOpen && (
                <div className="mb-4 rounded-[1.5rem] bg-[#f3f7f5] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Wand2 size={17} className="text-[#2D6A4F]" />
                    <p className="text-sm font-black text-[#1B4332]">Edit with AI</p>
                  </div>
                  <textarea
                    value={manualIngredients}
                    onChange={(e) => setManualIngredients(e.target.value)}
                    placeholder="Example: chicken 120g, fried oil 7ml, cornflour 1 tbsp, green chillies 3 pcs"
                    className="min-h-[96px] w-full resize-none rounded-2xl border border-[#dce8e1] bg-white px-4 py-3 text-sm font-semibold text-[#1B4332] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#b7dfcb]"
                  />
                  <button
                    onClick={handleRecalculateFromIngredients}
                    disabled={loading || !manualIngredients.trim()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2D6A4F] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={17} /> : <Layers3 size={17} />}
                    Calculate Breakdown
                  </button>
                </div>
              )}

              {nutrition.ingredientsText && (
                <div className="mb-4 rounded-[1.5rem] bg-[#f8fbf9] p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#6b8b7a]">Ingredients read from label</p>
                  <p className="text-sm font-semibold leading-relaxed text-[#315743]">{nutrition.ingredientsText}</p>
                </div>
              )}

              <IngredientBreakdownTable nutrition={nutrition} />
              <MacroCardGrid nutrition={nutrition} onChange={updateNutritionField} />

              {(nutrition.sugar !== undefined || nutrition.fiber !== undefined || nutrition.sodium !== undefined) && (
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {nutrition.sugar !== undefined && <MiniNutrient label="Sugar" value={`${roundMacro(nutrition.sugar)}g`} />}
                  {nutrition.fiber !== undefined && <MiniNutrient label="Fibre" value={`${roundMacro(nutrition.fiber)}g`} />}
                  {nutrition.sodium !== undefined && <MiniNutrient label="Sodium" value={`${Math.round(nutrition.sodium)}mg`} />}
                </div>
              )}

              <div className="mb-5">
                <label className="mb-2 block text-sm font-black text-[#1B4332]">Meal Type</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setMealType(type)}
                      className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-black capitalize transition-all ${
                        mealType === type
                          ? 'bg-[#2D6A4F] text-white shadow-lg shadow-[#2D6A4F]/20'
                          : 'bg-[#f0f3f1] text-[#315743]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickLog('lunch')}
                  disabled={loading}
                  className="rounded-2xl bg-[#1B4332] px-3 py-3 text-sm font-black text-white transition-all active:scale-95 disabled:opacity-60"
                >
                  Log as Lunch
                </button>
                <button
                  onClick={() => handleQuickLog('snack')}
                  disabled={loading}
                  className="rounded-2xl bg-[#1B4332] px-3 py-3 text-sm font-black text-white transition-all active:scale-95 disabled:opacity-60"
                >
                  Morning Snack
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <div className="card text-center py-12 animate-slide-up">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={40} />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">Meal Logged!</h3>
            <p className="text-gray-500 text-sm mb-6">
              {doneFoodName} has been added to your daily log.
            </p>
            <button onClick={reset} className="btn-primary w-full max-w-xs">
              Scan Another Meal
            </button>
          </div>
        )}
      </div>

      {step === 'nutrition' && nutrition ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#dce8e1] bg-white/95 px-4 py-3 shadow-[0_-14px_36px_rgba(27,67,50,0.12)] backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-[0.9fr_1.1fr] gap-3">
            <button
              onClick={() => setAiEditOpen((open) => !open)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#eef6f2] px-4 py-4 text-sm font-black text-[#1B4332]"
            >
              <Wand2 size={18} /> Edit with AI
            </button>
            <button
              onClick={handleLogMeal}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#2D6A4F] px-4 py-4 text-sm font-black text-white shadow-lg shadow-[#2D6A4F]/25 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Done
            </button>
          </div>
        </div>
      ) : (
        <BottomNav />
      )}
    </div>
  );
}

function AccuracyTips({ compact = false }: { compact?: boolean }) {
  const tips = [
    { icon: Eye, title: 'Side views', body: 'Keep the plate angled so portion height is visible.' },
    { icon: Layers3, title: 'Avoid top-down only', body: 'Show separate ingredients instead of a flat close crop.' },
    { icon: ScanBarcode, title: 'Use barcode or label', body: 'For packaged food, snap the back nutrition panel.' },
  ];

  return (
    <div className={`rounded-[1.5rem] border border-[#dce8e1] bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <p className="mb-3 text-sm font-black text-[#1B4332]">Tips for better accuracy</p>
      <div className={compact ? 'grid gap-2' : 'grid gap-3'}>
        {tips.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl bg-[#f8fbf9] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e5f3ec] text-[#2D6A4F]">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-[#1B4332]">{title}</p>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-[#6b8b7a]">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetectingIngredientsSkeleton({ phase, label }: { phase: AnalysisPhase; label?: string }) {
  const rows = phase === 'detailing' ? 5 : 3;

  return (
    <div className="card mt-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5ee] text-[#2D6A4F]">
          {phase === 'detailing' ? <Layers3 size={22} /> : <Sparkles className="animate-pulse" size={22} />}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b8b7a]">
            {phase === 'detailing' ? 'Pass 2' : 'Pass 1'}
          </p>
          <h3 className="text-lg font-black text-[#1B4332]">
            {phase === 'detailing' && label ? label : 'Detecting Ingredients...'}
          </h3>
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-[#f8fbf9] p-4">
        <div className="mb-3 h-4 w-40 animate-pulse rounded-full bg-[#dce8e1]" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="h-4 w-3/5 animate-pulse rounded-full bg-[#dce8e1]" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-[#e8efeb]" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-[#dce8e1]" />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#6b8b7a]">
        {phase === 'detailing'
          ? 'Dish name is ready. Building calories, protein, carbs, and fat per ingredient.'
          : 'Checking whether this is food before calculating nutrition.'}
      </p>
    </div>
  );
}

function IngredientBreakdownTable({ nutrition }: { nutrition: Nutrition }) {
  const items = nutrition.items?.length
    ? nutrition.items
    : [{
      name: nutrition.food_name || 'Meal',
      portion: nutrition.serving || 'estimated serving',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    }];

  return (
    <div className="mb-5 rounded-[1.5rem] bg-[#f8fbf9] p-4">
      <h3 className="mb-3 text-lg font-black text-[#1B4332]">Ingredient breakdown.</h3>
      <div className="overflow-hidden rounded-2xl border border-[#dce8e1] bg-white">
        <div className="grid grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 border-b border-[#dce8e1] bg-[#f3f7f5] px-3 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#6b8b7a]">
          <span>Ingredient</span>
          <span className="text-right">Cal</span>
          <span className="text-right">Protein</span>
          <span className="text-right">Carbs</span>
          <span className="text-right">Fat</span>
        </div>
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="grid grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 border-b border-[#eef3f0] px-3 py-3 text-xs last:border-b-0">
            <div className="min-w-0">
              <p className="truncate font-black text-[#1B4332]">{item.name}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-[#8aa093]">Estimated Serving: {item.portion}</p>
            </div>
            <span className="text-right font-black text-[#1B4332]">{Math.round(item.calories)}</span>
            <span className="text-right font-semibold text-[#315743]">{roundMacro(item.protein)}g</span>
            <span className="text-right font-semibold text-[#315743]">{roundMacro(item.carbs)}g</span>
            <span className="text-right font-semibold text-[#315743]">{roundMacro(item.fat)}g</span>
          </div>
        ))}
        <div className="grid grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 border-t-2 border-[#1B4332] bg-white px-3 py-3 text-sm font-black text-[#1B4332]">
          <span>Total</span>
          <span className="text-right">{Math.round(nutrition.calories)}</span>
          <span className="text-right">{roundMacro(nutrition.protein)}g</span>
          <span className="text-right">{roundMacro(nutrition.carbs)}g</span>
          <span className="text-right">{roundMacro(nutrition.fat)}g</span>
        </div>
      </div>
    </div>
  );
}

function MacroCardGrid({
  nutrition,
  onChange,
}: {
  nutrition: Nutrition;
  onChange: (field: keyof Pick<Nutrition, 'calories' | 'protein' | 'carbs' | 'fat'>, value: string) => void;
}) {
  const cards = [
    { field: 'calories' as const, label: 'Calories (kcal)', value: Math.round(nutrition.calories), unit: '', bg: 'bg-[#fff4e8]', text: 'text-[#f97316]' },
    { field: 'protein' as const, label: 'Protein', value: nutrition.protein, unit: 'g', bg: 'bg-[#eaf3ff]', text: 'text-[#2563eb]' },
    { field: 'carbs' as const, label: 'Carbs', value: nutrition.carbs, unit: 'g', bg: 'bg-[#fffbe6]', text: 'text-[#ca8a04]' },
    { field: 'fat' as const, label: 'Fat', value: nutrition.fat, unit: 'g', bg: 'bg-[#fff0f0]', text: 'text-[#dc2626]' },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.field} className={`${card.bg} rounded-[1.25rem] p-4 text-center`}>
          <div className="flex items-baseline justify-center gap-1">
            <input
              type="number"
              min="0"
              step={card.field === 'calories' ? '1' : '0.1'}
              value={card.value}
              onChange={(e) => onChange(card.field, e.target.value)}
              className={`w-20 bg-transparent text-center text-3xl font-black outline-none ${card.text}`}
            />
            {card.unit && <span className={`text-lg font-black ${card.text}`}>{card.unit}</span>}
          </div>
          <p className={`mt-1 text-xs font-black ${card.text}`}>{card.label}</p>
        </div>
      ))}
    </div>
  );
}

function MiniNutrient({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f3f7f5] p-3 text-center">
      <p className="font-black text-[#1B4332]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b8b7a]">{label}</p>
    </div>
  );
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundMacro(value: unknown) {
  return Math.round(toNumber(value) * 10) / 10;
}

function SnapGallery({ items }: { items: SnapGalleryItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-[1.5rem] border border-[#dce8e1] bg-white p-5 text-center">
        <Images className="mx-auto text-[#8aa093]" size={28} />
        <p className="mt-2 text-sm font-black text-[#183c2a]">Snap Gallery</p>
        <p className="mt-1 text-xs font-semibold text-[#7b9587]">Recent analyzed food photos will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[#dce8e1] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-[#183c2a]">Snap Gallery</p>
          <p className="text-xs font-semibold text-[#7b9587]">Recently captured food photos</p>
        </div>
        <CheckCircle2 className="text-[#2D6A4F]" size={18} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-[#dce8e1] bg-[#f8fcfa]">
            <div className="relative h-28">
              <img src={item.image} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#2D6A4F] shadow-sm">
                {item.status}
              </span>
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-black text-[#183c2a]">{item.foodName}</p>
              <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-[#7b9587]">
                <span className="flex items-center gap-1 capitalize">
                  <Utensils size={10} /> {item.mealType}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {formatSnapTime(item.capturedAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function inferMealType(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 19 || hour < 5) return 'dinner';
  return 'snack';
}

const SNAP_GALLERY_KEY = 'nutrisnap-snap-gallery';

function loadSnapGallery(): SnapGalleryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SNAP_GALLERY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveSnapGallery(items: SnapGalleryItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SNAP_GALLERY_KEY, JSON.stringify(items.slice(0, 8)));
}

function addSnapGalleryItem(item: Omit<SnapGalleryItem, 'id'>) {
  const id = `snap-${Date.now()}`;
  saveSnapGallery([{ ...item, id }, ...loadSnapGallery()]);
  return id;
}

function updateSnapGalleryItem(id: string, patch: Partial<SnapGalleryItem>) {
  if (!id) return;
  saveSnapGallery(loadSnapGallery().map((item) => item.id === id ? { ...item, ...patch } : item));
}

function formatSnapTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function friendlyScanError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (
    /json|position|unexpected token|syntaxerror|failed to fetch|meal scan failed|detection failed/i.test(message)
  ) {
    return fallback;
  }

  return message || fallback;
}
