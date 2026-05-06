import React from 'react';

const TransactionList = ({ transactions, onDeleteTransaction, settings }) => {
  const person1 = settings?.person1Name || 'Rikako';
  const person2 = settings?.person2Name || 'Sanari';

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

  const getBorderColor = (t) => {
    if (t.payer === 'person1') return 'var(--primary)';
    if (t.payer === 'person2') return 'var(--secondary)';
    return 'transparent';
  };

  const getPayerName = (t) => {
    if (t.payer === 'person1') return person1;
    if (t.payer === 'person2') return person2;
    return t.payer;
  };

  const getForWhomName = (t) => {
    if (t.forWhom === 'person1') return person1;
    if (t.forWhom === 'person2') return person2;
    if (t.forWhom === 'both') return 'ふたり';
    return '';
  };

  return (
    <div className="glass-panel">
      <h3 className="mb-4 text-gradient">最近の記録</h3>
      {sortedTransactions.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>記録がありません</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedTransactions.map((t) => (
            <div 
              key={t.id} 
              className="list-item flex justify-between items-center"
              style={{ borderLeftColor: getBorderColor(t) }}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.category}</span>
                  {t.type === 'expense' && t.forWhom && t.forWhom !== 'both' && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      {getForWhomName(t)}用
                    </span>
                  )}
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                  {t.date} • {getPayerName(t)}が立替
                  {t.memo && ` • ${t.memo}`}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: 'var(--text-main)'
                  }}>
                    {t.type === 'income' ? '+' : '-'}{formatter.format(t.amount)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t.type === 'expense' ? '支出' : '収入'}
                  </span>
                </div>
                <button 
                  onClick={() => onDeleteTransaction(t.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
