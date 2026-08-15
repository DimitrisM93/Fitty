import { useState, useRef, useCallback } from 'react';
import { analyzeMealViaServer } from '../services/api';
import { imageFileToBase64 } from '../services/gemini';
import { saveMeal } from '../services/db';
import { useToast } from '../context/ToastContext';
import './LogMeal.css';

const MACRO_COLORS = {
  protein: 'var(--color-primary)',
  carbs: 'var(--color-secondary)',
  fat: 'var(--color-accent)',
};

function MacroChip({ label, value, color }) {
  return (
    <div className="macro-chip" style={{ borderColor: color + '44', background: color + '12' }}>
      <span className="macro-chip-value" style={{ color }}>{Math.round(value)}g</span>
      <span className="macro-chip-label">{label}</span>
    </div>
  );
}

function AnalysisResult({ result, onSave, onRetry, imageUrl }) {
  return (
    <div className="result-container animate-fade-in-up">
      {/* Image preview */}
      {imageUrl && (
        <div className="result-image-wrapper">
          <img src={imageUrl} alt="Analyzed meal" className="result-image"/>
          <div className="result-image-overlay">
            <span className={`chip chip-${result.confidence === 'high' ? 'green' : result.confidence === 'medium' ? 'violet' : 'orange'}`}>
              {result.confidence} confidence
            </span>
          </div>
        </div>
      )}

      {/* Total calories */}
      <div className="result-total glass-card p-6">
        <p className="section-title">Total Calories</p>
        <div className="result-cal-big gradient-text">{result.total_calories}</div>
        <p className="text-muted text-sm">kcal · {result.meal_type}</p>

        {/* Macro row */}
        <div className="macro-row mt-4">
          <MacroChip label="Protein" value={result.total_protein} color={MACRO_COLORS.protein}/>
          <MacroChip label="Carbs"   value={result.total_carbs}   color={MACRO_COLORS.carbs}/>
          <MacroChip label="Fat"     value={result.total_fat}     color={MACRO_COLORS.fat}/>
        </div>
      </div>

      {/* Item breakdown */}
      <div className="glass-card p-6 mt-4">
        <p className="section-title">Item Breakdown</p>
        <div className="item-list">
          {result.items.map((item, i) => (
            <div key={i} className="food-item">
              <div className="food-item-header">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-muted text-xs">{item.portion}</p>
                </div>
                <span className="gradient-text font-bold">{item.calories} kcal</span>
              </div>
              <div className="food-item-macros">
                <span className="text-xs" style={{ color: MACRO_COLORS.protein }}>P {Math.round(item.protein)}g</span>
                <span className="text-xs" style={{ color: MACRO_COLORS.carbs }}>C {Math.round(item.carbs)}g</span>
                <span className="text-xs" style={{ color: MACRO_COLORS.fat }}>F {Math.round(item.fat)}g</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {result.notes && (
        <div className="result-notes glass-card p-4 mt-4">
          <p className="text-xs text-muted">💡 {result.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button onClick={onRetry} className="btn btn-ghost w-full">Try Again</button>
        <button onClick={onSave}  className="btn btn-primary w-full">Save Meal ✓</button>
      </div>
    </div>
  );
}

export default function LogMeal() {
  const [step, setStep] = useState('upload'); // upload | analyzing | result | saved
  const [inputMode, setInputMode] = useState('photo'); // photo | text
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [textQuery, setTextQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const cameraInputRef = useRef();
  const showToast = useToast();

  const handleFileSelect = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setStep('preview');
    setError('');
  }, []);

  const handleDropzone = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const analyze = useCallback(async () => {
    if (inputMode === 'photo' && !imageFile) return;
    if (inputMode === 'text' && !textQuery.trim()) return;

    setStep('analyzing');
    setError('');
    try {
      let base64 = '';
      let mime = '';
      
      if (inputMode === 'photo' && imageFile) {
        const parsed = await imageFileToBase64(imageFile);
        base64 = parsed.base64;
        mime = parsed.mimeType;
      }

      const analysis = await analyzeMealViaServer(base64, mime, textQuery.trim());
      setResult(analysis);
      setStep('result');
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
      setStep('upload'); // back to beginning so they can fix text or image
    }
  }, [imageFile, textQuery, inputMode]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    try {
      await saveMeal({ ...result, imageUrl });
      showToast('Meal saved! 🎉', 'success');
      setStep('saved');
    } catch {
      showToast('Failed to save meal', 'error');
    }
  }, [result, imageUrl, showToast]);

  const reset = useCallback(() => {
    setStep('upload');
    setImageFile(null);
    setImageUrl('');
    setResult(null);
    setError('');
  }, []);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1><span className="gradient-text">AI</span> Meal Analyzer</h1>
        <p className="text-muted text-sm mt-2">Take a photo of your meal or describe it, and let Gemini calculate the calories</p>
      </div>

      {/* Upload step */}
      {step === 'upload' && (
        <div className="upload-container glass-card p-6 animate-fade-in">
          
          <div className="input-mode-tabs mb-6">
            <button 
              className={`mode-tab ${inputMode === 'photo' ? 'active' : ''}`}
              onClick={() => setInputMode('photo')}
            >
              📷 Photo
            </button>
            <button 
              className={`mode-tab ${inputMode === 'text' ? 'active' : ''}`}
              onClick={() => setInputMode('text')}
            >
              ⌨️ Text
            </button>
          </div>

          {inputMode === 'photo' ? (
            <>
              <div className="upload-circle">
                <div className="upload-icon">📸</div>
              </div>
              <h2 className="text-xl font-bold mt-4">Log a Meal</h2>
              <p className="text-muted text-sm text-center mt-2 mb-6">
                Take a photo or upload an image to automatically track calories and macros.
              </p>

              {error && <p className="text-danger text-sm text-center mb-4">{error}</p>}

              <div className="upload-actions">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden-input"
                />
                <button
                  className="btn btn-primary w-full"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Take Photo
                </button>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden-input"
                />
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload from Gallery
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-2">Describe your meal</h2>
              <p className="text-muted text-sm mb-4">
                Enter ingredients and portions (e.g., "200g roast potatoes and 1 chicken breast").
              </p>
              
              {error && <p className="text-danger text-sm text-center mb-4">{error}</p>}

              <textarea 
                className="input text-input-area mb-4"
                rows={5}
                placeholder="200g roast potatoes..."
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
              />
              <button 
                className="btn btn-primary w-full"
                onClick={analyze}
                disabled={!textQuery.trim()}
              >
                Analyze Meal ✨
              </button>
            </>
          )}
        </div>
      )}

      {/* Preview (only for images) */}
      {step === 'preview' && inputMode === 'photo' && (
        <div className="preview-container animate-fade-in">
          <img src={imageUrl} alt="Meal preview" className="preview-image"/>
          <div className="flex gap-3 mt-4">
            <button onClick={reset} className="btn btn-ghost w-full">Retake</button>
            <button onClick={analyze} className="btn btn-primary w-full">Analyze ✨</button>
          </div>
          {error && <p className="text-danger text-sm text-center mt-4">{error}</p>}
        </div>
      )}

      {/* Analyzing step */}
      {step === 'analyzing' && (
        <div className="analyzing-state animate-fade-in">
          <div className="analyzing-glow"/>
          <div className="analyzing-content">
            <div className="gemini-logo">✨</div>
            <h2>Analyzing your meal…</h2>
            <p className="text-muted mt-2">Gemini AI is identifying ingredients<br/>and calculating nutritional values</p>
            <div className="analyzing-dots mt-6">
              <span/><span/><span/>
            </div>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Meal being analyzed" className="analyzing-thumb"/>
          )}
        </div>
      )}

      {/* Result step */}
      {step === 'result' && result && (
        <AnalysisResult
          result={result}
          imageUrl={imageUrl}
          onSave={handleSave}
          onRetry={reset}
        />
      )}

      {/* Saved step */}
      {step === 'saved' && (
        <div className="saved-state animate-scale-in">
          <div className="saved-check">✓</div>
          <h2 className="mt-4">Meal Saved!</h2>
          <p className="text-muted mt-2">Added {result?.total_calories} kcal to today's log</p>
          <button onClick={reset} className="btn btn-primary mt-8">Log Another Meal</button>
        </div>
      )}
    </div>
  );
}
