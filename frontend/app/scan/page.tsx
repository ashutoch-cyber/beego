'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { uploadImage, detectFood, getNutrition, logMeal } from '@/lib/api';
import { cacheMeal } from '@/lib/offline';

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string>('');
  const [detected, setDetected] = useState<{ label: string; score: number } | null>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'detect' | 'confirm' | 'nutrition' | 'done'>('upload');
  const [customFood, setCustomFood] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);

      setStep('detect');
      const detectRes = await detectFood(file);
      setDetected(detectRes);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleConfirmFood(foodName: string) {
    setLoading(true);
    setError('');
    try {
      const nutri = await getNutrition(foodName);
      setNutrition(nutri);
      setStep('nutrition');
    } catch (err: any) {
      setError('Failed to fetch nutrition. Using estimates.');
      setNutrition({
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 8,
        serving: '1 serving',
      });
      setStep('nutrition');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogMeal() {
    setLoading(true);
    try {
      const foodName = detected?.label || customFood;
      const meal = {
        food_name: foodName,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        meal_type: mealType,
        image_url: image || undefined,
        date: new Date().toISOString().split('T')[0],
      };
      await logMeal(meal);
      await cacheMeal(meal);
      setStep('done');
    } catch (err: any) {
      await cacheMeal({
        food_name: detected?.label || customFood,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        meal_type: mealType,
        image_url: image || undefined,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      });
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImage(null);
    setImageKey('');
    setDetected(null);
    setNutrition(null);
    setStep('upload');
    setCustomFood('');
    setError('');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white pt-12 pb-8 px-6 rounded-b-[2.5rem]">
        <h1 className="text-2xl font-bold">AI Food Scanner</h1>
        <p className="text-primary-100 text-sm mt-1">Snap a photo and let AI detect your food</p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['upload', 'detect', 'confirm', 'nutrition', 'done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-primary-600 text-white scale-110' :
                ['upload', 'detect', 'confirm', 'nutrition', 'done'].indexOf(step) > i ? 'bg-primary-200 text-primary-700' :
                'bg-gray-200 text-gray-400'
              }`}>
                {['upload', 'detect', 'confirm', 'nutrition', 'done'].indexOf(step) > i ? <Check size={14} /> : i + 1}
              </div>
              {i < 4 && (
                <div className={`w-6 h-0.5 rounded-full ${
                  ['upload', 'detect', 'confirm', 'nutrition', 'done'].indexOf(step) > i ? 'bg-primary-400' : 'bg-gray-200'
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
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Sparkles className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">AI Detected</p>
                    <h3 className="font-bold text-gray-900 text-lg capitalize">{detected.label}</h3>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-bold">
                      {Math.round(detected.score * 100)}%
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Not correct?</p>
                  <input
                    type="text"
                    value={customFood}
                    onChange={(e) => setCustomFood(e.target.value)}
                    placeholder="Enter food name manually..."
                    className="input-field text-sm"
                  />
                </div>

                <button
                  onClick={() => handleConfirmFood(customFood || detected.label)}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={18} /> Fetching nutrition...
                    </span>
                  ) : (
                    `Confirm: ${customFood || detected.label}`
                  )}
                </button>
                <button
                  onClick={reset}
                  className="btn-secondary w-full mt-2"
                >
                  <X size={16} className="inline mr-1" /> Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Nutrition Step */}
        {step === 'nutrition' && nutrition && (
          <div className="animate-slide-up">
            <div className="card">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Nutrition Facts</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{Math.round(nutrition.calories)}</p>
                  <p className="text-xs text-orange-400 font-medium mt-1">Calories (kcal)</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{Math.round(nutrition.protein)}g</p>
                  <p className="text-xs text-blue-400 font-medium mt-1">Protein</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{Math.round(nutrition.carbs)}g</p>
                  <p className="text-xs text-yellow-400 font-medium mt-1">Carbs</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{Math.round(nutrition.fat)}g</p>
                  <p className="text-xs text-red-400 font-medium mt-1">Fat</p>
                </div>
              </div>

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
              {detected?.label || customFood} has been added to your daily log.
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
