import { useState } from 'react';
import { FlowSandbox } from './components/canvas/FlowSandbox';
import { ForecastPanel } from './components/layout/ForecastPanel';
import { InputPanel } from './components/layout/InputPanel';
import { LevelSelectMenu } from './components/layout/LevelSelectMenu';
import { GradeModal } from './components/ui/GradeModal';
import { useFinanceStore } from './store/financeStore';
import { evaluatePlan, type ValidationReport } from './engines/validation';

export default function App() {
  const { 
    currentScreen,
    setCurrentScreen,
    saveLevelScore,
    levelId,
    client, 
    goals, 
    accounts, 
    incomes, 
    transferRules, 
    expenses,
    winConditions 
  } = useFinanceStore();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const primaryGoal = goals.length > 0 ? goals[0].name : 'No active goals';

  const handleSubmitPlan = () => {
    const results = evaluatePlan(accounts, incomes, transferRules, goals, expenses, winConditions);
    setReport(results);
    setIsModalOpen(true);
  };

  const handleRetry = () => {
    setIsModalOpen(false);
  };

  const handleContinue = () => {
    if (report && levelId) {
      saveLevelScore(levelId, report.score);
    }
    setIsModalOpen(false);
    setCurrentScreen('menu');
  };

  if (currentScreen === 'menu') {
    return <LevelSelectMenu />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-gray-50 text-gray-900 relative overflow-hidden">
      
      {/* Grade Modal Overlay */}
      <GradeModal 
        isOpen={isModalOpen} 
        report={report} 
        onRetry={handleRetry}
        onContinue={handleContinue}
      />

      {/* Top Bar */}
      <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm h-16 shrink-0">
        <div>
          <h1 className="text-xl font-bold">Client: {client ? client.name : 'None'}</h1>
          <p className="text-sm text-gray-600">Goal: {primaryGoal}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setCurrentScreen('menu')}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium"
          >
            ← Back to Menu
          </button>
          <button 
            onClick={handleSubmitPlan}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors"
          >
            Submit Plan
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-white border-r p-4 overflow-y-auto shrink-0">
          <InputPanel />
        </aside>
        <section className="flex-1 relative bg-gray-100 min-w-0">
          <FlowSandbox />
        </section>
        <aside className="w-80 bg-white border-l p-4 overflow-y-auto shrink-0">
          <ForecastPanel />
        </aside>
      </main>
    </div>
  );
}