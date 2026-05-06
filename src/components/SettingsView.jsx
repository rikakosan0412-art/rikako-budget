import React, { useState } from 'react';
import { EXPENSE_CATEGORIES } from '../constants/categories';

const SettingsView = ({ settings, onUpdateSettings, transactions, onClearData }) => {
  const [budget, setBudget] = useState(settings.monthlyBudget || 150000);
  const [person1, setPerson1] = useState(settings.person1Name || 'Rikako');
  const [person2, setPerson2] = useState(settings.person2Name || 'Sanari');
  
  const [payer, setPayer] = useState(settings.defaultPayer || 'person1');
  const [forWhom, setForWhom] = useState(settings.defaultForWhom || 'both');
  const [expenseMajor, setExpenseMajor] = useState(settings.defaultExpenseMajor || '食費');
  const [expenseMinor, setExpenseMinor] = useState(settings.defaultExpenseMinor || '食料品');

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      monthlyBudget: Number(budget),
      person1Name: person1,
      person2Name: person2,
      defaultPayer: payer,
      defaultForWhom: forWhom,
      defaultExpenseMajor: expenseMajor,
      defaultExpenseMinor: expenseMinor
    });
    alert('設定を保存しました');
  };

  const handleMajorChange = (e) => {
    const val = e.target.value;
    setExpenseMajor(val);
    const minors = EXPENSE_CATEGORIES[val] || [];
    setExpenseMinor(minors.length > 0 ? minors[0] : '');
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }
    const headers = ['id', 'type', 'date', 'payer', 'amount', 'category', 'forWhom', 'memo'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => {
        const payerName = t.payer === 'person1' ? person1 : t.payer === 'person2' ? person2 : t.payer;
        const forWhomName = t.forWhom === 'person1' ? person1 : t.forWhom === 'person2' ? person2 : t.forWhom === 'both' ? 'ふたり' : (t.forWhom || '');
        return [
          t.id, t.type, t.date, payerName, t.amount, t.category, forWhomName, `"${t.memo || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rikako_budget_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    if (window.confirm('本当にすべてのデータを削除しますか？この操作は取り消せません。')) {
      onClearData();
      alert('データをすべて削除しました。');
    }
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
            <label className="form-label">支払った人</label>
            <select value={payer} onChange={e => setPayer(e.target.value)}>
              <option value="person1">{person1}</option>
              <option value="person2">{person2}</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">誰のため</label>
            <select value={forWhom} onChange={e => setForWhom(e.target.value)}>
              <option value="both">ふたり</option>
              <option value="person1">{person1}</option>
              <option value="person2">{person2}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">支出カテゴリ (大)</label>
            <select value={expenseMajor} onChange={handleMajorChange}>
              {Object.keys(EXPENSE_CATEGORIES).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">支出カテゴリ (小)</label>
            <select value={expenseMinor} onChange={e => setExpenseMinor(e.target.value)}>
              {(EXPENSE_CATEGORIES[expenseMajor] || []).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary mt-4" onClick={handleSave}>
          設定を保存する
        </button>
      </div>

      <div className="glass-panel mb-6">
        <h3 className="mb-4">データ管理</h3>
        
        <button className="btn btn-secondary mb-4" onClick={handleExportCSV}>
          📥 データをCSVで書き出す
        </button>
        
        <button 
          className="btn mb-2" 
          style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}
          onClick={handleClear}
        >
          🗑️ すべてのデータを削除する (リセット)
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
