import { Panel } from '@xyflow/react';
import { useFinanceStore } from '../../store/financeStore';
import type { AccountType } from '../../store/financeStore';

export function CanvasControls() {
  const { addAccount, allowedActions, accounts, initialAccountCount } = useFinanceStore();

  // 1. If the level forbids creating accounts, render nothing.
  if (!allowedActions || !allowedActions.canCreateAccounts) {
    return null;
  }

  // 2. If the level has a cap on new accounts and we reached it, render nothing.
  const addedCount = accounts.length - initialAccountCount;
  if (allowedActions.maxNewAccounts !== undefined && addedCount >= allowedActions.maxNewAccounts) {
    return null;
  }

  const handleAddAccount = (type: AccountType) => {
    const defaultName = type.charAt(0).toUpperCase() + type.slice(1) + ' Account';
    const accountName = window.prompt(`Enter a name for the ${type} account:`, defaultName);
    
    if (accountName && accountName.trim() !== '') {
      addAccount(accountName.trim(), type);
    }
  };

  return (
    <Panel position="top-center" className="bg-white p-2 rounded-lg shadow-md border flex gap-2">
      <div className="flex items-center px-2 mr-2 border-r border-gray-200">
        <span className="text-sm font-semibold text-gray-600">Actions</span>
      </div>
      
      {/* Dynamically render only the allowed buttons */}
      {allowedActions.allowedAccountTypes.includes('checking') && (
        <button onClick={() => handleAddAccount('checking')} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded border border-blue-200 hover:bg-blue-100">
          + Add Checking
        </button>
      )}
      
      {allowedActions.allowedAccountTypes.includes('savings') && (
        <button onClick={() => handleAddAccount('savings')} className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded border border-green-200 hover:bg-green-100">
          + Add Savings
        </button>
      )}

      {/* Level 2 Generic Bank Account */}
      {allowedActions.allowedAccountTypes.includes('bank') && (
        <button onClick={() => handleAddAccount('bank')} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded border border-blue-200 hover:bg-blue-100">
          + Add Bank Account
        </button>
      )}
    </Panel>
  );
}