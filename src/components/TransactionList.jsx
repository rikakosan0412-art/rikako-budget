import React from 'react';

const TransactionList = ({ transactions, onDeleteTransaction, onEditTransaction, settings, title }) => {
  const person1 = settings?.person1Name || 'Rikako';
  const person2 = settings?.person2Name || 'Sanari';

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

  const getCategoryDisplay = (t) => {
    if (t.category) return t.category;
    if (t.majorCategory) {
      return t.subCategory ? `${t.majorCategory} (${t.subCategory})` : t.majorCategory;
    }
    return '未分類';
  };

  // 日付ごとにグループ化
  const groupedTransactions = transactions.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  // 日付を新しい順にソート
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="glass-panel">
      <h3 className="mb-4 text-gradient">{title || '最近の記録'}</h3>
      {sortedDates.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>記録がありません</p>
      ) : (
        <div className="flex flex-col">
          {sortedDates.map(date => {
            const dayTx = groupedTransactions[date];
            const dayTotal = dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            const dayIncome = dayTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);

            return (
              <div key={date} className="mb-6">
                <div className="flex justify-between items-end mb-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                  <div className="flex gap-3">
                    {dayIncome > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--income)' }}>+{formatter.format(dayIncome)}</span>}
                    {dayTotal > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--expense)' }}>-{formatter.format(dayTotal)}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {dayTx.map((t) => (
                    <div 
                      key={t.id} 
                      className="list-item flex justify-between items-center"
                      style={{ 
                        borderLeftColor: getBorderColor(t), 
                        borderLeftWidth: '4px', 
                        borderLeftStyle: 'solid',
                        background: 'rgba(255,255,255,0.6)', 
                        padding: '12px 16px', 
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{getCategoryDisplay(t)}</span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            background: t.payer === 'person1' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                            color: t.payer === 'person1' ? 'var(--primary)' : 'var(--secondary)', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 600 
                          }}>
                            {getPayerName(t)}払
                          </span>
                          {t.type === 'expense' && t.forWhom && t.forWhom !== 'both' && (
                            <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--expense)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {getForWhomName(t)}用
                            </span>
                          )}
                        </div>
                        {t.memo && (
                          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                            {t.memo}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end mr-1">
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {t.type === 'income' ? '+' : '-'}{formatter.format(t.amount)}
                          </span>
                        </div>
                        {onEditTransaction && (
                          <button 
                            onClick={() => onEditTransaction(t)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', fontSize: '1.1rem' }}
                            title="編集"
                          >
                            ✎
                          </button>
                        )}
                        {onDeleteTransaction && (
                          <button 
                            onClick={() => onDeleteTransaction(t.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', fontSize: '1.1rem' }}
                            title="削除"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
