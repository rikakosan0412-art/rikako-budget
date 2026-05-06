import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import TransactionList from './TransactionList';

const COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b', 
  '#84cc16', '#14b8a6'
];

const AnalysisView = ({ transactions, settings }) => {
  const person1 = settings?.person1Name || 'Rikako';
  const person2 = settings?.person2Name || 'Sanari';

  const [filterType, setFilterType] = useState('month'); // 'month' or 'year'
  const [personFilter, setPersonFilter] = useState('all'); // 'all', 'both', 'person1', 'person2'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter transactions by selected period
  const filteredTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    if (filterType === 'month') {
      return txDate.getFullYear() === currentDate.getFullYear() && 
             txDate.getMonth() === currentDate.getMonth();
    } else {
      return txDate.getFullYear() === currentDate.getFullYear();
    }
  });

  const allIncomes = filteredTransactions.filter(t => t.type === 'income');
  const allExpenses = filteredTransactions.filter(t => t.type === 'expense');

  let incomes = [];
  let expenses = [];

  if (personFilter === 'all') {
    incomes = allIncomes;
    expenses = allExpenses;
  } else if (personFilter === 'both') {
    incomes = [];
    expenses = allExpenses.filter(t => t.forWhom === 'both');
  } else {
    incomes = allIncomes.filter(t => t.payer === personFilter);
    allExpenses.forEach(t => {
      if (t.forWhom === personFilter) {
        expenses.push(t);
      } else if (t.forWhom === 'both') {
        // ふたりの支出は半分を個人の負担として計算する
        expenses.push({ ...t, amount: Number(t.amount) / 2 });
      }
    });
  }

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const remaining = totalIncome - totalExpense;

  // Monthly budget only makes sense for 'month' filter, but we can multiply by 12 for 'year'
  const budget = settings?.monthlyBudget || 150000;
  const targetBudget = filterType === 'month' ? budget : budget * 12;
  const budgetRemaining = targetBudget - totalExpense;

  // Category breakdown logic
  const categoryData = {};

  expenses.forEach(exp => {
    const amount = Number(exp.amount);
    const major = exp.majorCategory || exp.category || 'その他';
    const minor = exp.subCategory || 'その他';
    
    if (!categoryData[major]) {
      categoryData[major] = { total: 0, subs: {} };
    }
    categoryData[major].total += amount;

    if (!categoryData[major].subs[minor]) {
      categoryData[major].subs[minor] = 0;
    }
    categoryData[major].subs[minor] += amount;

    // Settlement calculation happens over ALL expenses
  });

  let balance = 0; 
  allExpenses.forEach(exp => {
    const amount = Number(exp.amount);
    const whom = exp.forWhom || 'both';
    
    let person1ShareAmount = 0;
    let person2ShareAmount = 0;

    if (whom === 'both') {
      person1ShareAmount = amount / 2;
      person2ShareAmount = amount / 2;
    } else if (whom === 'person1') {
      person1ShareAmount = amount;
      person2ShareAmount = 0;
    } else if (whom === 'person2') {
      person1ShareAmount = 0;
      person2ShareAmount = amount;
    }

    if (exp.payer === 'person1') {
      balance += person2ShareAmount;
    } else {
      balance -= person1ShareAmount;
    }
  });

  const formatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

  // State to track if we are viewing minor categories of a specific major category
  const [selectedMajor, setSelectedMajor] = useState(null);

  // Prepare data for Recharts
  let chartData = [];
  let monthlyChartData = [];
  const majorCategoriesSet = new Set();

  if (filterType === 'month') {
    if (selectedMajor === null) {
      chartData = Object.entries(categoryData)
        .map(([name, data]) => ({ name, value: data.total }))
        .sort((a, b) => b.value - a.value);
    } else {
      const subs = categoryData[selectedMajor]?.subs || {};
      chartData = Object.entries(subs)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }
  } else {
    const monthlyMap = {};
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      const monthKey = `${d.getMonth() + 1}月`;
      const major = exp.majorCategory || exp.category || 'その他';
      majorCategoriesSet.add(major);
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { name: monthKey };
      }
      if (!monthlyMap[monthKey][major]) {
        monthlyMap[monthKey][major] = 0;
      }
      monthlyMap[monthKey][major] += Number(exp.amount);
    });

    for (let i = 0; i < 12; i++) {
      const monthKey = `${i + 1}月`;
      if (!monthlyMap[monthKey]) {
        monthlyChartData.push({ name: monthKey });
      } else {
        monthlyChartData.push(monthlyMap[monthKey]);
      }
    }
  }

  const handlePieClick = (data, index) => {
    if (selectedMajor === null) {
      setSelectedMajor(data.name);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = selectedMajor === null ? totalExpense : categoryData[selectedMajor].total;
      const percentage = Math.round((data.value / total) * 100);
      return (
        <div className="glass-panel" style={{ padding: '8px 12px', borderRadius: '8px' }}>
          <p style={{ fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>{data.name}</p>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {formatter.format(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    if (percent < 0.05) return null; 
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.8rem', fontWeight: 'bold', textShadow: '0px 1px 3px rgba(0,0,0,0.5)' }}>
        {name}
      </text>
    );
  };

  const changePeriod = (offset) => {
    const newDate = new Date(currentDate);
    if (filterType === 'month') {
      newDate.setMonth(newDate.getMonth() + offset);
    } else {
      newDate.setFullYear(newDate.getFullYear() + offset);
    }
    setCurrentDate(newDate);
    setSelectedMajor(null);
  };

  const getTargetName = () => {
    if (personFilter === 'all') return '世帯の';
    if (personFilter === 'both') return 'ふたり用の';
    if (personFilter === 'person1') return `${person1}の`;
    return `${person2}の`;
  };

  const displayPeriod = filterType === 'month' 
    ? `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    : `${currentDate.getFullYear()}年`;

  let displayTransactions = filteredTransactions;
  
  if (personFilter !== 'all') {
    if (personFilter === 'both') {
      displayTransactions = displayTransactions.filter(t => t.type === 'expense' && t.forWhom === 'both');
    } else {
      displayTransactions = displayTransactions.filter(t => {
        if (t.type === 'income') return t.payer === personFilter;
        if (t.type === 'expense') return t.forWhom === personFilter || t.forWhom === 'both';
        return false;
      });
    }
  }

  if (selectedMajor !== null) {
    displayTransactions = displayTransactions.filter(t => t.type === 'expense' && (t.majorCategory || t.category || 'その他') === selectedMajor);
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* 期間フィルター UI */}
      <div className="glass-panel mb-6 flex flex-col items-center gap-4" style={{ padding: '16px' }}>
        <div className="tab-container" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
          <div 
            className={`tab-button ${filterType === 'month' ? 'active' : 'inactive'}`}
            onClick={() => { setFilterType('month'); setSelectedMajor(null); }}
            style={{ padding: '6px' }}
          >
            月単位
          </div>
          <div 
            className={`tab-button ${filterType === 'year' ? 'active' : 'inactive'}`}
            onClick={() => { setFilterType('year'); setSelectedMajor(null); }}
            style={{ padding: '6px' }}
          >
            年単位
          </div>
        </div>

        <div className="tab-container" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
          <div className={`tab-button ${personFilter === 'all' ? 'active' : 'inactive'}`} onClick={() => { setPersonFilter('all'); setSelectedMajor(null); }} style={{ padding: '4px', fontSize: '0.85rem' }}>全員</div>
          <div className={`tab-button ${personFilter === 'both' ? 'active' : 'inactive'}`} onClick={() => { setPersonFilter('both'); setSelectedMajor(null); }} style={{ padding: '4px', fontSize: '0.85rem' }}>ふたり</div>
          <div className={`tab-button ${personFilter === 'person1' ? 'active' : 'inactive'}`} onClick={() => { setPersonFilter('person1'); setSelectedMajor(null); }} style={{ padding: '4px', fontSize: '0.85rem' }}>{person1}</div>
          <div className={`tab-button ${personFilter === 'person2' ? 'active' : 'inactive'}`} onClick={() => { setPersonFilter('person2'); setSelectedMajor(null); }} style={{ padding: '4px', fontSize: '0.85rem' }}>{person2}</div>
        </div>
        
        <div className="flex justify-between items-center w-full" style={{ maxWidth: '300px' }}>
          <button className="btn btn-secondary" style={{ width: '40px', padding: '8px' }} onClick={() => changePeriod(-1)}>
            ◀
          </button>
          <h2 className="text-gradient" style={{ margin: 0 }}>{displayPeriod}</h2>
          <button className="btn btn-secondary" style={{ width: '40px', padding: '8px' }} onClick={() => changePeriod(1)}>
            ▶
          </button>
        </div>
      </div>

      {/* 収入・支出 サマリー */}
      <div className="flex gap-4 mb-4">
        <div className="glass-card" style={{ flex: 1 }}>
          <span className="form-label">{getTargetName()}総収入</span>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--income)' }}>{formatter.format(totalIncome)}</h3>
        </div>
        <div className="glass-card" style={{ flex: 1 }}>
          <span className="form-label">{getTargetName()}総支出</span>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--expense)' }}>{formatter.format(totalExpense)}</h3>
        </div>
      </div>

      <div className="glass-card mb-6" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
        <div className="flex justify-between items-end">
          <div>
            <span className="form-label" style={{ fontSize: '1rem' }}>{filterType === 'month' ? '月間' : '年間'}予算まであと</span>
            <h3 style={{ fontSize: '1.8rem', color: budgetRemaining >= 0 ? 'var(--primary)' : 'var(--danger)', marginTop: '4px' }}>
              {formatter.format(budgetRemaining)}
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>目標予算: {formatter.format(targetBudget)}</span>
          </div>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
          <div 
            style={{ 
              width: `${Math.min((totalExpense / targetBudget) * 100, 100)}%`, 
              height: '100%', 
              background: budgetRemaining >= 0 ? 'var(--primary-gradient)' : 'var(--danger)',
              borderRadius: '4px'
            }} 
          />
        </div>
      </div>

      {/* カテゴリ別の円グラフ・棒グラフ分析 */}
      <div className="glass-panel mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gradient" style={{ margin: 0 }}>
            支出の詳細分析 {selectedMajor && filterType === 'month' ? `(${selectedMajor}の内訳)` : ''}
          </h3>
          {selectedMajor && filterType === 'month' && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
              onClick={() => setSelectedMajor(null)}
            >
              ← 戻る
            </button>
          )}
        </div>

        {filterType === 'month' ? (
          chartData.length === 0 ? (
            <p className="text-muted text-center py-4">この期間の支出データがありません</p>
          ) : (
            <>
              {!selectedMajor && (
                <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: '8px' }}>
                  ※ グラフをタップすると内訳が見られます
                </p>
              )}
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={110}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={handlePieClick}
                      style={{ cursor: selectedMajor === null ? 'pointer' : 'default', outline: 'none' }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )
        ) : (
          <div style={{ width: '100%', height: '350px', marginTop: '16px' }}>
            {expenses.length === 0 ? (
              <p className="text-muted text-center py-4">この期間の支出データがありません</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `¥${(value/10000).toFixed(0)}万`} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    formatter={(value) => formatter.format(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', marginTop: '10px' }} />
                  {Array.from(majorCategoriesSet).map((category, index) => (
                    <Bar key={category} dataKey={category} stackId="a" fill={COLORS[index % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* 精算金額 */}
      <div className="glass-card mb-6" style={{ background: 'var(--primary-gradient)', textAlign: 'center', padding: '24px', color: 'white', border: 'none' }}>
        <span style={{ fontSize: '1rem', opacity: 0.9, display: 'block', marginBottom: '8px' }}>
          {displayPeriod}の精算金額
        </span>
        {balance === 0 ? (
          <h3 style={{ fontSize: '1.8rem', color: 'white', margin: 0 }}>貸し借りなし 🎉</h3>
        ) : balance > 0 ? (
          <div>
            <h3 style={{ fontSize: '1.6rem', color: 'white', margin: 0 }}>
              {person2} <span style={{ opacity: 0.7, fontSize: '1.2rem' }}>から</span> {person1} <span style={{ opacity: 0.7, fontSize: '1.2rem' }}>へ</span>
            </h3>
            <h2 style={{ fontSize: '2.2rem', margin: '8px 0 0' }}>{formatter.format(balance)}</h2>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.6rem', color: 'white', margin: 0 }}>
              {person1} <span style={{ opacity: 0.7, fontSize: '1.2rem' }}>から</span> {person2} <span style={{ opacity: 0.7, fontSize: '1.2rem' }}>へ</span>
            </h3>
            <h2 style={{ fontSize: '2.2rem', margin: '8px 0 0' }}>{formatter.format(Math.abs(balance))}</h2>
          </div>
        )}
      </div>

      {/* 取引一覧 (絞り込み連動) */}
      <div style={{ marginTop: '24px' }}>
        <TransactionList 
          title={selectedMajor ? `「${selectedMajor}」の取引` : 'この期間の取引一覧'}
          transactions={displayTransactions} 
          settings={settings} 
          // onDeleteTransaction は渡さないことで削除ボタンを非表示にする
        />
      </div>
    </div>
  );
};

export default AnalysisView;
