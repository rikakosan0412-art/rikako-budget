import React, { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';

const SettingsView = ({ settings, onUpdateSettings, transactions, onClearData }) => {
  const [budget, setBudget] = useState(settings.monthlyBudget || 150000);
  const [person1, setPerson1] = useState(settings.person1Name || 'Rikako');
  const [person2, setPerson2] = useState(settings.person2Name || 'Sanari');
  
  const [payer, setPayer] = useState(settings.defaultPayer || 'person1');
  const [forWhom, setForWhom] = useState(settings.defaultForWhom || 'both');
  const [expenseMajor, setExpenseMajor] = useState(settings.defaultExpenseMajor || '食費');
  const [expenseMinor, setExpenseMinor] = useState(settings.defaultExpenseMinor || '食料品');

  // Categories state
  const [expenseCategories, setExpenseCategories] = useState(settings.expenseCategories || EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState(settings.incomeCategories || INCOME_CATEGORIES);
  
  // Category Editor state
  const [catTab, setCatTab] = useState('expense'); // 'expense' or 'income'
  const [selectedMajorCat, setSelectedMajorCat] = useState('食費');
  const [newMajor, setNewMajor] = useState('');
  const [newMinor, setNewMinor] = useState('');

  const currentCategories = catTab === 'expense' ? expenseCategories : incomeCategories;
  const setCurrentCategories = catTab === 'expense' ? setExpenseCategories : setIncomeCategories;

  // Sync selectedMajorCat when tab changes
  React.useEffect(() => {
    const keys = Object.keys(currentCategories);
    if (keys.length > 0 && !keys.includes(selectedMajorCat)) {
      setSelectedMajorCat(keys[0]);
    } else if (keys.length === 0) {
      setSelectedMajorCat('');
    }
  }, [catTab, currentCategories]);

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      monthlyBudget: Number(budget),
      person1Name: person1,
      person2Name: person2,
      defaultPayer: payer,
      defaultForWhom: forWhom,
      defaultExpenseMajor: expenseMajor,
      defaultExpenseMinor: expenseMinor,
      expenseCategories,
      incomeCategories
    });
    alert('設定を保存しました');
  };

  const handleMajorChange = (e) => {
    const val = e.target.value;
    setExpenseMajor(val);
    const minors = expenseCategories[val] || [];
    setExpenseMinor(minors.length > 0 ? minors[0] : '');
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }
    const headers = ['日付', '誰が', '誰の', '金額', 'カテゴリ', '詳細', 'メモ'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => {
        const payerName = t.payer === 'person1' ? person1 : t.payer === 'person2' ? person2 : t.payer;
        const forWhomName = t.forWhom === 'person1' ? person1 : t.forWhom === 'person2' ? person2 : t.forWhom === 'both' ? 'ふたり' : (t.forWhom || '');
        return [
          t.date, payerName, forWhomName, t.amount, t.majorCategory || '', t.subCategory || '', `"${t.memo || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rikako_budget_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Category Editor Handlers
  const handleAddMajor = () => {
    if (!newMajor.trim()) return;
    if (currentCategories[newMajor]) {
      alert('そのカテゴリは既に存在します。');
      return;
    }
    setCurrentCategories(prev => ({ ...prev, [newMajor.trim()]: [] }));
    setSelectedMajorCat(newMajor.trim());
    setNewMajor('');
  };

  const handleDeleteMajor = () => {
    if (!window.confirm(`大カテゴリ「${selectedMajorCat}」を削除してもよろしいですか？`)) return;
    setCurrentCategories(prev => {
      const next = { ...prev };
      delete next[selectedMajorCat];
      return next;
    });
  };

  const handleAddMinor = () => {
    if (!newMinor.trim() || !selectedMajorCat) return;
    if (currentCategories[selectedMajorCat].includes(newMinor.trim())) {
      alert('その小カテゴリは既に存在します。');
      return;
    }
    setCurrentCategories(prev => ({
      ...prev,
      [selectedMajorCat]: [...prev[selectedMajorCat], newMinor.trim()]
    }));
    setNewMinor('');
  };

  const handleDeleteMinor = (minorName) => {
    setCurrentCategories(prev => ({
      ...prev,
      [selectedMajorCat]: prev[selectedMajorCat].filter(m => m !== minorName)
    }));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '20px' }}>
      <h2 className="text-gradient mb-6">設定</h2>

      <div className="glass-panel mb-6">
        <h3 className="mb-4">アプリ設定</h3>
        
        <div className="flex gap-4">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">ユーザー1の名前</label>
            <input 
              type="text" 
              value={person1} 
              onChange={e => setPerson1(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">ユーザー2の名前</label>
            <input 
              type="text" 
              value={person2} 
              onChange={e => setPerson2(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">月間目標予算 (円)</label>
          <input 
            type="number" 
            value={budget} 
            onChange={e => setBudget(e.target.value)}
          />
        </div>

        <h4 className="mt-6 mb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px' }}>入力フォームのデフォルト値</h4>
        
        <div className="flex gap-4">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">誰が</label>
            <select value={payer} onChange={e => setPayer(e.target.value)}>
              <option value="person1">{person1}</option>
              <option value="person2">{person2}</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">誰の</label>
            <select value={forWhom} onChange={e => setForWhom(e.target.value)}>
              <option value="both">ふたり</option>
              <option value="person1">{person1}</option>
              <option value="person2">{person2}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">カテゴリ</label>
            <select value={expenseMajor} onChange={handleMajorChange}>
              {Object.keys(expenseCategories).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">詳細</label>
            <select value={expenseMinor} onChange={e => setExpenseMinor(e.target.value)}>
              {(expenseCategories[expenseMajor] || []).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary mt-4" onClick={handleSave}>
          設定を保存する
        </button>
      </div>

      <div className="glass-panel mb-6">
        <h3 className="mb-4">カテゴリ設定</h3>
        <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>※ここで追加・削除した内容は「設定を保存する」ボタンを押すと反映されます。</p>
        <div className="tab-container mb-4">
          <div className={`tab-button ${catTab === 'expense' ? 'active' : 'inactive'}`} onClick={() => setCatTab('expense')}>支出カテゴリ</div>
          <div className={`tab-button ${catTab === 'income' ? 'active' : 'inactive'}`} onClick={() => setCatTab('income')}>収入カテゴリ</div>
        </div>

        <div className="form-group">
           <label className="form-label">大カテゴリ</label>
           <select value={selectedMajorCat} onChange={e => setSelectedMajorCat(e.target.value)}>
             {Object.keys(currentCategories).map(k => <option key={k} value={k}>{k}</option>)}
           </select>
           <div className="flex gap-2 mt-2">
             <input type="text" placeholder="新しい大カテゴリ" value={newMajor} onChange={e => setNewMajor(e.target.value)} />
             <button className="btn btn-secondary" style={{width: 'auto', flexShrink: 0}} onClick={handleAddMajor}>追加</button>
             {selectedMajorCat && (
               <button className="btn btn-secondary" style={{width: 'auto', flexShrink: 0, color: 'var(--danger)'}} onClick={handleDeleteMajor}>削除</button>
             )}
           </div>
        </div>

        {selectedMajorCat && currentCategories[selectedMajorCat] && (
          <div className="form-group mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <label className="form-label">小カテゴリ ({selectedMajorCat})</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {currentCategories[selectedMajorCat].length === 0 && <span className="text-muted" style={{ fontSize: '0.85rem' }}>小カテゴリはありません</span>}
              {currentCategories[selectedMajorCat].map(minor => (
                <span key={minor} style={{background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(0,0,0,0.1)'}}>
                  {minor}
                  <button onClick={() => handleDeleteMinor(minor)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: '1rem'}}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="新しい小カテゴリ" value={newMinor} onChange={e => setNewMinor(e.target.value)} />
              <button className="btn btn-secondary" style={{width: 'auto', flexShrink: 0}} onClick={handleAddMinor}>追加</button>
            </div>
          </div>
        )}
        
        <button className="btn btn-primary mt-6" onClick={handleSave}>
          設定を保存する
        </button>
      </div>

      <div className="glass-panel mb-6">
        <h3 className="mb-4">データ管理</h3>
        
        <button className="btn btn-secondary mb-4" onClick={handleExportCSV}>
          📥 データをCSVで書き出す
        </button>
        
      </div>
    </div>
  );
};

export default SettingsView;
