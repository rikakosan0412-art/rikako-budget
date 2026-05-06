import React, { useState, useEffect } from 'react';
import RecordView from './components/RecordView';
import AnalysisView from './components/AnalysisView';
import SettingsView from './components/SettingsView';
import { supabase } from './lib/supabaseClient';

const IconRecord = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconAnalysis = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12"></line>
    <line x1="4" y1="6" x2="20" y2="6"></line>
    <line x1="4" y1="18" x2="20" y2="18"></line>
  </svg>
);
function App() {
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'analysis' | 'settings'
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [settings, setSettings] = useState({
    monthlyBudget: 150000,
    defaultPayer: 'person1',
    defaultForWhom: 'both',
    defaultExpenseMajor: '食費',
    defaultExpenseMinor: '食料品',
    person1Name: 'Rikako',
    person2Name: 'Sanari',
  });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch settings
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (settingsData) {
        setSettings({
          monthlyBudget: settingsData.monthly_budget || 150000,
          defaultPayer: settingsData.default_payer || 'person1',
          defaultForWhom: settingsData.default_for_whom || 'both',
          defaultExpenseMajor: settingsData.default_expense_major || '食費',
          defaultExpenseMinor: settingsData.default_expense_minor || '食料品',
          person1Name: settingsData.person1_name || 'Rikako',
          person2Name: settingsData.person2_name || 'Sanari',
        });
      }

      // Fetch transactions
      const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (txData) {
        setTransactions(txData.map(t => ({
          id: t.id,
          type: t.type,
          date: t.date,
          amount: t.amount,
          majorCategory: t.major_category,
          subCategory: t.minor_category,
          memo: t.memo,
          payer: t.payer,
          forWhom: t.for_whom
        })));
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleAddTransaction = async (transaction) => {
    setTransactions(prev => [transaction, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date)));
    
    const { error } = await supabase.from('transactions').insert({
      id: transaction.id,
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      major_category: transaction.majorCategory,
      minor_category: transaction.subCategory || '',
      memo: transaction.memo || '',
      payer: transaction.payer,
      for_whom: transaction.forWhom
    });
    if (error) {
      console.error("Error adding transaction", error);
      alert("【保存エラー】\n" + error.message + "\n詳細: " + error.details + "\nヒント: " + error.hint);
    }
  };

  const handleDeleteTransaction = async (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const handleClearData = async () => {
    setTransactions([]);
    // UUIDはハイフン付きの36文字でなければならないため、0のUUIDを指定してそれ以外を削除
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  };

  const handleUpdateSettings = async (newSettings) => {
    setSettings(newSettings);
    await supabase.from('settings').upsert({
      id: 1,
      monthly_budget: newSettings.monthlyBudget,
      default_payer: newSettings.defaultPayer,
      default_for_whom: newSettings.defaultForWhom,
      default_expense_major: newSettings.defaultExpenseMajor,
      default_expense_minor: newSettings.defaultExpenseMinor,
      person1_name: newSettings.person1Name,
      person2_name: newSettings.person2Name,
      updated_at: new Date().toISOString()
    });
  };

  const navigateTo = (tab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  // Determine title based on active tab
  let pageTitle = "Rikako Budget";
  if (activeTab === 'analysis') pageTitle = "分析";
  if (activeTab === 'settings') pageTitle = "設定";

  return (
    <>
      {/* Menu Overlay */}
      {isMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: '250px',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-gradient" style={{ margin: '0 0 16px 0', fontSize: '1.5rem' }}>Menu</h2>
            <button 
              className={`btn ${activeTab === 'record' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textAlign: 'left', padding: '12px 16px', fontSize: '1rem', display: 'flex', gap: '12px', alignItems: 'center' }}
              onClick={() => navigateTo('record')}
            >
              <IconRecord /> 記録
            </button>
            <button 
              className={`btn ${activeTab === 'analysis' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textAlign: 'left', padding: '12px 16px', fontSize: '1rem', display: 'flex', gap: '12px', alignItems: 'center' }}
              onClick={() => navigateTo('analysis')}
            >
              <IconAnalysis /> 分析
            </button>
            <button 
              className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textAlign: 'left', padding: '12px 16px', fontSize: '1rem', display: 'flex', gap: '12px', alignItems: 'center' }}
              onClick={() => navigateTo('settings')}
            >
              <IconSettings /> 設定
            </button>
            
            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Rikako Budget v1.0
            </div>
          </div>
        </div>
      )}

      <header className="mb-6" style={{ paddingTop: '20px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div 
          onClick={() => setIsMenuOpen(true)}
          style={{ 
            position: 'absolute', 
            left: '20px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--text-main)',
            background: 'var(--glass-bg)',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--glass-border)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
          }}
        >
          <IconMenu />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>
          {pageTitle}
        </h1>
      </header>
      
      <main style={{ paddingBottom: '20px' }}>
        {activeTab === 'record' && (
          <RecordView 
            transactions={transactions} 
            onAddTransaction={handleAddTransaction} 
            onDeleteTransaction={handleDeleteTransaction} 
            settings={settings}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisView 
            transactions={transactions} 
            settings={settings}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView 
            settings={settings} 
            onUpdateSettings={handleUpdateSettings} 
            transactions={transactions}
            onClearData={handleClearData}
          />
        )}
      </main>
    </>
  );
}

export default App;
