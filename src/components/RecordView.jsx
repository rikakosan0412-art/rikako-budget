import React from 'react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

const RecordView = ({ transactions, onAddTransaction, onDeleteTransaction, onEditTransaction, settings }) => {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <TransactionForm onAddTransaction={onAddTransaction} settings={settings} />
      <TransactionList transactions={transactions} onDeleteTransaction={onDeleteTransaction} onEditTransaction={onEditTransaction} settings={settings} />
    </div>
  );
};

export default RecordView;
