'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Sparkles, Loader2, Package, FileText } from 'lucide-react';
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
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

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
      source: data?.source,
      confidence: toNumber(data?.confidence ?? data?.score),
      needsReview: Boolean(data?.needsReview),
      message: data?.message,
      items,
    };
  }

  function setNutritionResult(data: any, fallbackName?: string) {
    setNutrition(normalizeNutritionResult(data, fallbackName));
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
    try {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);

      setStep('detect');
      const scanRes = await analyzeMeal(file);
      const nextDetection = detectionFromAnalysis(scanRes);
      setDetected(nextDetection);

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
        setStep('confirm');
      } catch {
        setDetected({
          label: '',
          score: 0,
          kind: 'manual',
          needsReview: true,
          message: 'I could not identify this meal confidently. Add its name and main ingredients so calories and macros can still be estimated.',
        });
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

  async function handleLogMeal() {
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
        meal_type: mealType,
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
        meal_type: mealType,
        image_url: imageUrl,
        date: new Date().toISOString().split('T')[0],
      });
      setStep('done');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white pt-12 pb-8 px-6 rounded-b-[2.5rem]">
        <h1 className="text-2xl font-bold">AI Food Scanner</h1>
        <p className="text-primary-100 text-sm mt-1">Snap a photo and let AI detect your food</p>
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
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Camera className="text-primary-600" size={36} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Take a Photo</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Point your camera at your meal. Our AI will identify the food and estimate calories.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="btn-primary w-full max-w-xs"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload size={18} /> Choose Photo
                </span>
              )}
            </button>
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
                      <p className="text-xs text-gray-500 font-medium mb-2">Product name</p>
                      <input
                        type="text"
                        value={customFood}
                        onChange={(e) => setCustomFood(e.target.value)}
                        placeholder={detected.label || 'Packaged food name'}
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
                <p className="text-xs text-gray-500 font-medium mb-2">Product name</p>
                <input
                  type="text"
                  value={customFood}
                  onChange={(e) => setCustomFood(e.target.value)}
                  placeholder={detected?.label || 'Packaged food name'}
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

function friendlyScanError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (
    /json|position|unexpected token|syntaxerror|failed to fetch|meal scan failed|detection failed/i.test(message)
  ) {
    return fallback;
  }

  return message || fallback;
}
