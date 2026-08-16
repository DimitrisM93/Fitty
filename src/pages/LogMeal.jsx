import { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeMealViaServer, saveMeal, fetchFavorites, saveFavorite, deleteFavorite } from '../services/api';
import { imageFileToBase64 } from '../services/gemini';
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
  const [inputMode, setInputMode] = useState('photo'); // photo | text | quick | favorites
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [textQuery, setTextQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [quickForm, setQuickForm] = useState({
    meal_type: 'snack',
    total_calories: '',
    total_protein: '',
    total_carbs: '',
    total_fat: '',
    notes: '',
  });
  const [quickSaving, setQuickSaving] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();
  const showToast = useToast();

  const [favorites, setFavorites] = useState([]);
  const [isCreatingFav, setIsCreatingFav] = useState(false);
  const [favForm, setFavForm] = useState({ name: '', meal_type: 'snack', total_calories: '', total_protein: '', total_carbs: '', total_fat: '', notes: '' });

  useEffect(() => {
    if (inputMode === 'favorites') {
      fetchFavorites().then(setFavorites).catch(() => showToast('Failed to load favorites', 'error'));
    }
  }, [inputMode, showToast]);

  const handleCreateFavorite = useCallback(async () => {
    const cals = parseInt(favForm.total_calories);
    if (!favForm.name || !cals || cals <= 0) {
      setError('Please enter a name and calories');
      return;
    }
    setError('');
    try {
      const saved = await saveFavorite({ 
        ...favForm, 
        total_calories: cals, 
        total_protein: parseFloat(favForm.total_protein)||0, 
        total_carbs: parseFloat(favForm.total_carbs)||0, 
        total_fat: parseFloat(favForm.total_fat)||0 
      });
      setFavorites(prev => [saved, ...prev]);
      setIsCreatingFav(false);
      setFavForm({ name: '', meal_type: 'snack', total_calories: '', total_protein: '', total_carbs: '', total_fat: '', notes: '' });
      showToast('Favorite created!', 'success');
    } catch {
      showToast('Failed to create favorite', 'error');
    }
  }, [favForm, showToast]);

  const handleDeleteFavorite = useCallback(async (id) => {
    if (!window.confirm('Delete this favorite?')) return;
    try {
      await deleteFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
      showToast('Favorite deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    }
  }, [showToast]);

  const handleLogFavorite = useCallback(async (fav) => {
    try {
      const meal = {
        meal_type: fav.meal_type,
        total_calories: fav.total_calories,
        total_protein: fav.total_protein,
        total_carbs: fav.total_carbs,
        total_fat: fav.total_fat,
        total_fiber: fav.total_fiber,
        items: [],
        confidence: 'manual',
        notes: fav.name + (fav.notes ? ` - ${fav.notes}` : ''),
      };
      await saveMeal(meal);
      setResult(meal);
      showToast('Favorite logged! 🎉', 'success');
      setStep('saved');
    } catch {
      showToast('Failed to log favorite', 'error');
    }
  }, [showToast]);

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

  const handleQuickSave = useCallback(async () => {
    const cals = parseInt(quickForm.total_calories);
    if (!cals || cals <= 0) {
      setError('Please enter calories');
      return;
    }
    setQuickSaving(true);
    setError('');
    try {
      const meal = {
        meal_type: quickForm.meal_type,
        total_calories: cals,
        total_protein: parseFloat(quickForm.total_protein) || 0,
        total_carbs: parseFloat(quickForm.total_carbs) || 0,
        total_fat: parseFloat(quickForm.total_fat) || 0,
        total_fiber: 0,
        items: [],
        confidence: 'manual',
        notes: quickForm.notes || '',
      };
      await saveMeal(meal);
      setResult(meal);
      showToast('Calories saved! 🎉', 'success');
      setStep('saved');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setQuickSaving(false);
    }
  }, [quickForm, showToast]);

  const reset = useCallback(() => {
    setStep('upload');
    setImageFile(null);
    setImageUrl('');
    setResult(null);
    setError('');
    setQuickForm({ meal_type: 'snack', total_calories: '', total_protein: '', total_carbs: '', total_fat: '', notes: '' });
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
            <button 
              className={`mode-tab ${inputMode === 'quick' ? 'active' : ''}`}
              onClick={() => setInputMode('quick')}
            >
              🔢 Quick
            </button>
            <button 
              className={`mode-tab ${inputMode === 'favorites' ? 'active' : ''}`}
              onClick={() => setInputMode('favorites')}
            >
              ⭐ Favs
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
          ) : inputMode === 'text' ? (
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
          ) : inputMode === 'favorites' ? (
            <div className="favorites-container">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">Favorite Meals</h2>
                  <p className="text-muted text-sm">Quick-add your go-to meals.</p>
                </div>
                {!isCreatingFav && (
                  <button className="btn btn-sm btn-primary" onClick={() => setIsCreatingFav(true)}>+ New</button>
                )}
              </div>

              {error && <p className="text-danger text-sm text-center mb-4">{error}</p>}

              {isCreatingFav ? (
                <div className="quick-add-form slide-down">
                  <div className="input-group">
                    <label className="input-label">Meal Name *</label>
                    <input type="text" className="input" placeholder="e.g. Greek Yogurt Bowl" value={favForm.name} onChange={e => setFavForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Meal Type</label>
                    <select className="input" value={favForm.meal_type} onChange={e => setFavForm(f => ({ ...f, meal_type: e.target.value }))}>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Total Calories (kcal) *</label>
                    <input type="number" className="input quick-cal-input" placeholder="e.g. 350" value={favForm.total_calories} onChange={e => setFavForm(f => ({ ...f, total_calories: e.target.value }))} />
                  </div>
                  <div className="quick-macro-grid">
                    <div className="input-group">
                      <label className="input-label">Protein (g)</label>
                      <input type="number" className="input" placeholder="0" value={favForm.total_protein} onChange={e => setFavForm(f => ({ ...f, total_protein: e.target.value }))} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Carbs (g)</label>
                      <input type="number" className="input" placeholder="0" value={favForm.total_carbs} onChange={e => setFavForm(f => ({ ...f, total_carbs: e.target.value }))} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Fat (g)</label>
                      <input type="number" className="input" placeholder="0" value={favForm.total_fat} onChange={e => setFavForm(f => ({ ...f, total_fat: e.target.value }))} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Ingredients / Notes</label>
                    <input type="text" className="input" placeholder="e.g. 200g yogurt, 1 tsp honey..." value={favForm.notes} onChange={e => setFavForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="btn btn-ghost w-full" onClick={() => setIsCreatingFav(false)}>Cancel</button>
                    <button className="btn btn-primary w-full" onClick={handleCreateFavorite} disabled={!favForm.name || !favForm.total_calories}>Save Favorite ✓</button>
                  </div>
                </div>
              ) : (
                <div className="favorites-list">
                  {favorites.length === 0 ? (
                    <div className="text-center p-6 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.05)] mt-4">
                      <div className="text-4xl mb-2 opacity-50">⭐</div>
                      <p className="text-muted text-sm">You haven't saved any favorites yet.<br/>Create one to quickly log your daily staples!</p>
                    </div>
                  ) : (
                    favorites.map(fav => (
                      <div key={fav.id} className="favorite-card">
                        <div className="fav-info" onClick={() => handleLogFavorite(fav)}>
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg">{fav.name}</h3>
                            <span className="gradient-text font-bold text-lg">{fav.total_calories} kcal</span>
                          </div>
                          <p className="text-xs text-muted mb-2">{fav.meal_type} {fav.notes ? `· ${fav.notes}` : ''}</p>
                          <div className="flex gap-2">
                            <span className="text-xs" style={{ color: MACRO_COLORS.protein }}>P {fav.total_protein}g</span>
                            <span className="text-xs" style={{ color: MACRO_COLORS.carbs }}>C {fav.total_carbs}g</span>
                            <span className="text-xs" style={{ color: MACRO_COLORS.fat }}>F {fav.total_fat}g</span>
                          </div>
                        </div>
                        <button className="fav-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteFavorite(fav.id); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-2">Quick Add Calories</h2>
              <p className="text-muted text-sm mb-4">
                Manually log calories and macros without AI analysis.
              </p>

              {error && <p className="text-danger text-sm text-center mb-4">{error}</p>}

              <div className="quick-add-form">
                <div className="input-group">
                  <label className="input-label">Meal Type</label>
                  <select
                    className="input"
                    value={quickForm.meal_type}
                    onChange={e => setQuickForm(f => ({ ...f, meal_type: e.target.value }))}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Calories (kcal) *</label>
                  <input
                    type="number"
                    className="input quick-cal-input"
                    placeholder="e.g. 350"
                    value={quickForm.total_calories}
                    onChange={e => setQuickForm(f => ({ ...f, total_calories: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="quick-macro-grid">
                  <div className="input-group">
                    <label className="input-label">Protein (g)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={quickForm.total_protein}
                      onChange={e => setQuickForm(f => ({ ...f, total_protein: e.target.value }))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Carbs (g)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={quickForm.total_carbs}
                      onChange={e => setQuickForm(f => ({ ...f, total_carbs: e.target.value }))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Fat (g)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={quickForm.total_fat}
                      onChange={e => setQuickForm(f => ({ ...f, total_fat: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Optional notes..."
                    value={quickForm.notes}
                    onChange={e => setQuickForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <button
                  className="btn btn-primary w-full mt-4"
                  onClick={handleQuickSave}
                  disabled={quickSaving || !quickForm.total_calories}
                >
                  {quickSaving ? 'Saving…' : 'Save Calories ✓'}
                </button>
              </div>
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
