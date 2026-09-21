import { Panel } from '@xyflow/react';
import { useFinanceStore } from '../../store/financeStore';
import type { AccountType } from '../../store/financeStore';

export function CanvasControls() {
  const { addAccount, addCard, allowedActions, accounts, cards, initialAccountCount } = useFinanceStore();

  if (!allowedActions) return null;

  const addedCount = accounts.length - initialAccountCount;
  const canAddMoreAccounts = allowedActions.maxNewAccounts === undefined || addedCount < allowedActions.maxNewAccounts;

  const handleAddAccount = (type: AccountType) => {
    const defaultName = type.charAt(0).toUpperCase() + type.slice(1) + ' Account';
    const accountName = window.prompt(`Enter a name for the ${type} account:`, defaultName);
    if (accountName && accountName.trim() !== '') addAccount(accountName.trim(), type);
  };

  const handleAddCard = (type: 'debit' | 'credit') => {
    const defaultName = type === 'credit' ? 'Rewards Credit Card' : 'Bank Debit Card';
    const cardName = window.prompt(`Enter a name for the ${type} card:`, defaultName);
    if (cardName && cardName.trim() !== '') {
      // Default to the first checking/bank account available for the linkedAccountId
      const defaultLinkedAcc = accounts.find(a => a.type === 'checking' || a.type === 'bank')?.id || accounts[0]?.id || '';
      addCard(cardName.trim(), type, defaultLinkedAcc);
    }
  };

  return (
    <Panel position="top-center" className="bg-white p-2 rounded-lg shadow-md border flex gap-2">
      <div className="flex items-center px-2 mr-2 border-r border-gray-200">
        <span className="text-sm font-semibold text-gray-600">Actions</span>
      </div>
      
      {/* Account Buttons */}
      {canAddMoreAccounts && allowedActions.canCreateAccounts && (
        <>
          {allowedActions.allowedAccountTypes.includes('checking') && (
            <button onClick={() => handleAddAccount('checking')} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded border border-blue-200 hover:bg-blue-100">+ Checking</button>
          )}
          {allowedActions.allowedAccountTypes.includes('savings') && (
            <button onClick={() => handleAddAccount('savings')} className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded border border-green-200 hover:bg-green-100">+ Savings</button>
          )}
          {allowedActions.allowedAccountTypes.includes('bank') && (
            <button onClick={() => handleAddAccount('bank')} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded border border-blue-200 hover:bg-blue-100">+ Bank Account</button>
          )}
        </>
      )}

      {/* Card Buttons */}
      {allowedActions.allowedCardTypes?.includes('debit') && (
        <button onClick={() => handleAddCard('debit')} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded border border-teal-200 hover:bg-teal-100">+ Debit Card</button>
      )}
      {allowedActions.allowedCardTypes?.includes('credit') && (
        <button onClick={() => handleAddCard('credit')} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded border border-indigo-200 hover:bg-indigo-100">+ Credit Card</button>
      )}
    </Panel>
  );
}