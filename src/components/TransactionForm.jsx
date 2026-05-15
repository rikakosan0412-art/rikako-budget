// Trigger redeploy for Vercel Environment Variables
import React, { useState, useEffect, useRef } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { parseReceipt, parseText } from '../lib/geminiClient';

const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="12" rx="2" ry="2"></rect>
    <path d="M16 8v-2a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2"></path>
    <circle cx="12" cy="14" r="3"></circle>
  </svg>
);

const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
  </svg>
);

const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const TransactionForm = ({ onAddTransaction, onUpdateTransaction, initialData, settings }) => {
  const person1 = settings?.person1Name || 'Rikako';
  const person2 = settings?.person2Name || 'Sanari';

  const [type, setType] = useState(initialData?.type || 'expense'); // 'expense' or 'income'
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [payer, setPayer] = useState(initialData?.payer || settings?.defaultPayer || 'person1'); 
  const [forWhom, setForWhom] = useState(initialData?.forWhom || settings?.defaultForWhom || 'both'); 
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  
  const [majorCategory, setMajorCategory] = useState(initialData?.majorCategory || settings?.defaultExpenseMajor || '食費');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || settings?.defaultExpenseMinor || '食料品');
  const [memo, setMemo] = useState(initialData?.memo || '');

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);

  // Update defaults when settings change
  useEffect(() => {
    if (settings && !initialData) {
      if (type === 'expense') {
        setMajorCategory(settings.defaultExpenseMajor || '食費');
        setSubCategory(settings.defaultExpenseMinor || '食料品');
      }
      setPayer(settings.defaultPayer || 'person1');
      setForWhom(settings.defaultForWhom || 'both');
    }
  }, [settings, type]);

  // When type changes, update default categories
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'expense') {
      setMajorCategory(settings?.defaultExpenseMajor || '食費');
      setSubCategory(settings?.defaultExpenseMinor || '食料品');
    } else {
      setMajorCategory('収入');
      setSubCategory('給与');
    }
  };

  // When major category changes, update subcategory to the first available, or empty string
  const handleMajorCategoryChange = (e) => {
    const newMajor = e.target.value;
    setMajorCategory(newMajor);
    
    const categoryMap = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const subCats = categoryMap[newMajor] || [];
    
    if (subCats.length > 0) {
      setSubCategory(subCats[0]);
    } else {
      setSubCategory('');
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError('');
    
    try {
      const result = await parseReceipt(file);
      
      if (result.date) setDate(result.date);
      if (result.amount) setAmount(result.amount.toString());
      if (result.memo) setMemo(result.memo);
      
      // Update categories if predicted
      if (result.majorCategory) setMajorCategory(result.majorCategory);
      if (result.subCategory) setSubCategory(result.subCategory);
      
      if (type === 'income') {
        handleTypeChange('expense');
      }

    } catch (err) {
      setOcrError(err.message || 'レシートの読み取りに失敗しました。');
      console.error(err);
    } finally {
      setIsOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTextSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!textInput.trim()) return;

    setIsTextLoading(true);
    setOcrError('');
    
    try {
      const result = await parseText(textInput);
      
      if (result.date) setDate(result.date);
      if (result.amount) setAmount(result.amount.toString());
      if (result.memo) setMemo(result.memo);
      if (result.majorCategory) setMajorCategory(result.majorCategory);
      if (result.subCategory) setSubCategory(result.subCategory);
      if (result.payer) setPayer(result.payer);
      
      if (type === 'income') {
        handleTypeChange('expense');
      }

      setTextInput(''); // 成功したらクリア
    } catch (err) {
      setOcrError(err.message || '文章の読み取りに失敗しました。');
      console.error(err);
    } finally {
      setIsTextLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("お使いのブラウザは音声入力に対応していません。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTextInput((prev) => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const transaction = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      type,
      date,
      payer,
      forWhom: type === 'expense' ? forWhom : null,
      amount: Number(amount),
      majorCategory,
      subCategory,
      category: subCategory ? `${majorCategory} (${subCategory})` : majorCategory,
      memo
    };

    if (initialData) {
      onUpdateTransaction(transaction);
    } else {
      onAddTransaction(transaction);
      // Reset form partially
      setAmount('');
      setMemo('');
    }
  };

  const currentCategoryMap = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const majorKeys = Object.keys(currentCategoryMap);
  const currentSubCategories = currentCategoryMap[majorCategory] || [];

  return (
    <div className="glass-panel mb-6">
      <div className="tab-container">
        <div 
          className={`tab-button ${type === 'expense' ? 'active' : 'inactive'}`}
          onClick={() => handleTypeChange('expense')}
        >
          支出
        </div>
        <div 
          className={`tab-button ${type === 'income' ? 'active' : 'inactive'}`}
          onClick={() => handleTypeChange('income')}
        >
          収入
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* AI Input Section */}
        {type === 'expense' && !initialData && (
          <div className="form-group" style={{ marginBottom: '0.5rem', background: 'rgba(255,255,255,0.4)', padding: '16px', borderRadius: '12px' }}>
            
            {/* Receipt Button */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              style={{ display: 'none' }} 
              onChange={handleReceiptUpload}
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isOcrLoading || isTextLoading}
              style={{ 
                width: '100%', padding: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', 
                background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 600
              }}
            >
              {isOcrLoading ? <span style={{ opacity: 0.7 }}>⏳ 解析中...</span> : <><IconCamera /> レシート</>}
            </button>

            <div style={{ margin: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}></div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="例: 昨日スタバで600円" 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTextSubmit(); } }}
                disabled={isTextLoading || isOcrLoading}
                style={{ flex: 1, minWidth: 0, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.9rem', background: 'var(--glass-bg)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              />
              
              <button 
                type="button" 
                onClick={handleTextSubmit}
                disabled={isTextLoading || isOcrLoading || !textInput.trim()}
                style={{ 
                  width: '44px', height: '44px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0,
                  background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', opacity: (!textInput.trim() || isTextLoading || isOcrLoading) ? 0.4 : 1
                }}
              >
                {isTextLoading ? <span style={{ fontSize: '0.7rem' }}>⏳</span> : <IconSend />}
              </button>

              <button 
                type="button" 
                onClick={startListening}
                disabled={isListening || isOcrLoading || isTextLoading}
                style={{ 
                  width: '44px', height: '44px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0,
                  background: isListening ? '#fee2e2' : 'var(--glass-bg)', color: isListening ? '#ef4444' : 'var(--text-main)', border: '1px solid var(--glass-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', opacity: (isListening || isOcrLoading || isTextLoading) ? 0.4 : 1
                }}
              >
                <IconMic />
              </button>
            </div>

            {ocrError && <p style={{ color: 'red', fontSize: '0.85rem', marginTop: '12px', textAlign: 'center' }}>{ocrError}</p>}
          </div>
        )}

        {/* Toggle Buttons for Payer */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{type === 'expense' ? '誰が' : '対象者'}</label>
          <div className="flex gap-2">
            <button 
              type="button"
              className={`btn ${payer === 'person1' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
              onClick={() => setPayer('person1')}
            >
              {person1}
            </button>
            <button 
              type="button"
              className={`btn ${payer === 'person2' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
              onClick={() => setPayer('person2')}
            >
              {person2}
            </button>
          </div>
        </div>

        {/* Toggle Buttons for "For Whom" (Expense Only) */}
        {type === 'expense' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">誰の</label>
            <div className="flex gap-2">
              <button 
                type="button"
                className={`btn ${forWhom === 'person1' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                onClick={() => setForWhom('person1')}
              >
                {person1}
              </button>
              <button 
                type="button"
                className={`btn ${forWhom === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                onClick={() => setForWhom('both')}
              >
                ふたり
              </button>
              <button 
                type="button"
                className={`btn ${forWhom === 'person2' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                onClick={() => setForWhom('person2')}
              >
                {person2}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
            <label className="form-label">金額 (円)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              required 
              min="1"
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
            <label className="form-label">日付</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
            <label className="form-label">カテゴリ</label>
            <select value={majorCategory} onChange={handleMajorCategoryChange}>
              {majorKeys.map(key => <option key={key} value={key}>{key}</option>)}
            </select>
          </div>
          {currentSubCategories.length > 0 && (
            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label className="form-label">詳細</label>
              <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                {currentSubCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">メモ (任意)</label>
          <input 
            type="text" 
            placeholder="スーパーでの買い物 など" 
            value={memo} 
            onChange={(e) => setMemo(e.target.value)} 
          />
        </div>

        <button type="submit" className="btn btn-primary mt-2">
          {initialData ? '更新を保存' : (type === 'expense' ? '支出を記録' : '収入を記録')}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
