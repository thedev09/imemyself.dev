import React from 'react';

function Transactions({ accounts, transactions }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold dark:text-white mb-4">Transactions</h1>
      <p className="text-gray-600 dark:text-gray-400">All your transactions will be displayed here.</p>
    </div>
  );
}

export default Transactions;