'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Sparkles, Loader2, Package, FileText, Images, Clock, CheckCircle2, Utensils } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { analyzeMeal, analyzeNutritionLabel, detectFood, getNutrition, logMeal } from '@/lib/api';
import { cacheMeal } from '@/lib/offline';

type Detection = {
  label: string;
  score: number;
  kind?: 'food' | 'packaged_food' | 'not_food' | 'manual';
  needsReview?: boolean;
  needsLabel?: boolean;
  message?: string;
  objectLabel?: string;
};

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
};

type SnapGalleryItem = {
  id: string;
  image: string;
  foodName: string;
  mealType: string;
  capturedAt: string;
  status: 'Processing' | 'Auto-Tracked' | 'Needs Review';
};

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string>('');
  const [labelImage, setLabelImage] = useState<string | null>(null);
  const [detected, setDetected] = useState<Detection | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'detect' | 'confirm' | 'label' | 'nutrition' | 'done'>('upload');
  const [customFood, setCustomFood] = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
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
    const items = Array.isArray(data?.items)
      ? data.items.map((item: any) => ({
        name: String(item?.name || 'Food'),
        portion: String(item?.portion || 'estimated portion'),
        calories: Math.round(toNumber(item?.calories)),
        protein: roundMacro(item?.protein),
        carbs: roundMacro(item?.carbs),
        fat: roundMacro(item?.fat),
        confidence: toNumber(item?.confidence),
      })).filter((item: NonNullable<Nutrition['items']>[number]) => item.name && (item.calories || item.protein || item.carbs || item.fat))
      : [];

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
    return {
      label: String(data?.label || data?.food_name || '').trim(),
      score: toNumber(data?.score ?? data?.confidence),
      kind: data?.kind || 'food',
      needsReview: Boolean(data?.needsReview),
      needsLabel: Boolean(data?.needsLabel),
      message: data?.message,
      objectLabel: data?.objectLabel,
    };
  }

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    setSnapOverlayOpen(false);
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
    setCustomFood('');
    setManualIngredients('');
    setManualNutrition({ calories: '', protein: '', carbs: '', fat: '', sugar: '', fiber: '', sodium: '' });
    setError('');
  }

  const detectedLabel = detected?.label?.trim() || '';
  const confirmedFood = customFood.trim() || detectedLabel;
  const needsManualReview = Boolean(detected?.needsReview || !detectedLabel);
  const isPackagedFood = detected?.kind === 'packaged_food' || detected?.needsLabel;
  const isNotFood = detected?.kind === 'not_food';
  const doneFoodName = confirmedFood || nutrition?.food_name || 'Meal';
  const progressSteps = ['upload', 'detect', 'confirm', ...(isPackagedFood || step === 'label' ? ['label'] : []), 'nutrition', 'done'];
  const currentStepIndex = progressSteps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#f5faf7] pb-24">
      <div className="rounded-b-[2.5rem] bg-[#0f3f27] px-6 pb-8 pt-12 text-white">
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
            <div className="rounded-[2rem] bg-[#0f3f27] p-5 text-white shadow-[0_18px_45px_rgba(15,65,38,0.18)]">
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
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-[#0f7a3b] shadow-lg shadow-black/10"
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

            <SnapGallery items={snapGallery} />
          </div>
        )}

        {snapOverlayOpen && (
          <div className="fixed inset-0 z-[80] flex items-end bg-[#071b12]/80 p-4 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-lg rounded-[2rem] bg-white p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f7a3b]">Snap Food</p>
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
                  className="flex flex-col items-center justify-center rounded-[1.5rem] bg-[#0f7a3b] p-5 text-white"
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
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="text-white mx-auto mb-2 animate-pulse" size={32} />
                      <p className="text-white font-semibold">Analyzing with AI...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                      {detected.message || 'This does not look like food. Please upload a meal or packaged food.'}
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
          <div className="animate-slide-up">
            <div className="card">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Nutrition Facts</h3>
              {nutrition.needsReview && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                  {nutrition.message || 'Review the scanned totals before logging.'}
                </p>
              )}

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <label className="text-xs text-gray-500 font-medium mb-2 block">Food name</label>
                <input
                  type="text"
                  value={nutrition.food_name || customFood}
                  onChange={(e) => updateNutritionFoodName(e.target.value)}
                  className="input-field text-sm bg-white"
                />
                {(nutrition.serving || nutrition.source || nutrition.confidence) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {nutrition.serving && (
                      <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500">
                        {nutrition.serving}
                      </span>
                    )}
                    {nutrition.source && (
                      <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500 capitalize">
                        {nutrition.source}
                      </span>
                    )}
                    {Boolean(nutrition.confidence) && (
                      <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500">
                        {Math.round((nutrition.confidence || 0) * 100)}% confidence
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <label className="text-xs text-gray-500 font-medium mb-2 block">Ingredients and amounts</label>
                <textarea
                  value={manualIngredients}
                  onChange={(e) => setManualIngredients(e.target.value)}
                  placeholder="Example: chicken 120g, fried oil 7ml, cornflour 1 tbsp, green chillies 3 pcs"
                  className="input-field text-sm min-h-[88px] resize-none bg-white"
                />
                <button
                  onClick={handleRecalculateFromIngredients}
                  disabled={loading || !manualIngredients.trim()}
                  className="btn-secondary w-full mt-3"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={18} /> Calculating...
                    </span>
                  ) : 'Calculate Breakdown'}
                </button>
              </div>

              {nutrition.ingredientsText && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Ingredients read from label</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{nutrition.ingredientsText}</p>
                </div>
              )}

              {nutrition.items && nutrition.items.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-3">Ingredient breakdown</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="py-2 pr-3 font-semibold">Ingredient</th>
                          <th className="py-2 px-2 text-right font-semibold">Calories</th>
                          <th className="py-2 px-2 text-right font-semibold">Protein</th>
                          <th className="py-2 px-2 text-right font-semibold">Carbs</th>
                          <th className="py-2 pl-2 text-right font-semibold">Fat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {nutrition.items.map((item, index) => (
                          <tr key={`${item.name}-${index}`}>
                            <td className="py-2 pr-3">
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              <p className="text-[11px] text-gray-400">{item.portion}</p>
                            </td>
                            <td className="py-2 px-2 text-right font-semibold text-gray-900">{Math.round(item.calories)} kcal</td>
                            <td className="py-2 px-2 text-right text-gray-600">{roundMacro(item.protein)}g</td>
                            <td className="py-2 px-2 text-right text-gray-600">{roundMacro(item.carbs)}g</td>
                            <td className="py-2 pl-2 text-right text-gray-600">{roundMacro(item.fat)}g</td>
                          </tr>
                        ))}
                        <tr className="bg-white/70">
                          <td className="py-2 pr-3 font-bold text-gray-900">Total</td>
                          <td className="py-2 px-2 text-right font-bold text-gray-900">{Math.round(nutrition.calories)} kcal</td>
                          <td className="py-2 px-2 text-right font-bold text-gray-900">{roundMacro(nutrition.protein)}g</td>
                          <td className="py-2 px-2 text-right font-bold text-gray-900">{roundMacro(nutrition.carbs)}g</td>
                          <td className="py-2 pl-2 text-right font-bold text-gray-900">{roundMacro(nutrition.fat)}g</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <input
                    type="number"
                    min="0"
                    value={Math.round(nutrition.calories)}
                    onChange={(e) => updateNutritionField('calories', e.target.value)}
                    className="w-full bg-transparent text-center text-2xl font-bold text-orange-600 outline-none"
                  />
                  <p className="text-xs text-orange-400 font-medium mt-1">Calories (kcal)</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="flex items-baseline justify-center">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={nutrition.protein}
                      onChange={(e) => updateNutritionField('protein', e.target.value)}
                      className="w-20 bg-transparent text-center text-2xl font-bold text-blue-600 outline-none"
                    />
                    <span className="text-blue-600 font-bold">g</span>
                  </div>
                  <p className="text-xs text-blue-400 font-medium mt-1">Protein</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <div className="flex items-baseline justify-center">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={nutrition.carbs}
                      onChange={(e) => updateNutritionField('carbs', e.target.value)}
                      className="w-20 bg-transparent text-center text-2xl font-bold text-yellow-600 outline-none"
                    />
                    <span className="text-yellow-600 font-bold">g</span>
                  </div>
                  <p className="text-xs text-yellow-400 font-medium mt-1">Carbs</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="flex items-baseline justify-center">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={nutrition.fat}
                      onChange={(e) => updateNutritionField('fat', e.target.value)}
                      className="w-20 bg-transparent text-center text-2xl font-bold text-red-600 outline-none"
                    />
                    <span className="text-red-600 font-bold">g</span>
                  </div>
                  <p className="text-xs text-red-400 font-medium mt-1">Fat</p>
                </div>
              </div>

              {(nutrition.sugar !== undefined || nutrition.fiber !== undefined || nutrition.sodium !== undefined) && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {nutrition.sugar !== undefined && (
                    <div className="bg-pink-50 rounded-xl p-3 text-center">
                      <p className="font-bold text-pink-600">{Math.round(nutrition.sugar)}g</p>
                      <p className="text-[10px] text-pink-400 font-medium mt-1">Sugar</p>
                    </div>
                  )}
                  {nutrition.fiber !== undefined && (
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="font-bold text-emerald-600">{Math.round(nutrition.fiber)}g</p>
                      <p className="text-[10px] text-emerald-400 font-medium mt-1">Fiber</p>
                    </div>
                  )}
                  {nutrition.sodium !== undefined && (
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="font-bold text-slate-600">{Math.round(nutrition.sodium)}mg</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Sodium</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setMealType(type)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                        mealType === type
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                {['lunch', 'snack'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleQuickLog(type)}
                    disabled={loading}
                    className="rounded-2xl bg-[#0f3f27] px-3 py-3 text-sm font-black capitalize text-white transition-all active:scale-95 disabled:opacity-60"
                  >
                    {type === 'snack' ? 'Log as Morning Snack' : 'Log as Lunch'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleLogMeal}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={18} /> Log This Meal
                  </span>
                )}
              </button>
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

      <BottomNav />
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
        <CheckCircle2 className="text-[#0f7a3b]" size={18} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-[#dce8e1] bg-[#f8fcfa]">
            <div className="relative h-28">
              <img src={item.image} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#0f7a3b] shadow-sm">
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
