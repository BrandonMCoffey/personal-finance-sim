import { useFinanceStore } from '../../store/financeStore';
import level1Data from '../../data/levels/level1.json';
import level2Data from '../../data/levels/level2.json';
import level3Data from '../../data/levels/level3.json';
import level4Data from '../../data/levels/level4.json';
import level5Data from '../../data/levels/level5.json';

const LEVEL_MANIFEST = [
  { id: 1, title: "Level 1: Cash Flow Basics", desc: "Track income and expenses.", data: level1Data },
  { id: 2, title: "Level 2: Banking 101", desc: "Open accounts to secure physical cash.", data: level2Data },
  { id: 3, title: "Level 3: Short vs Long Term", desc: "Split savings into multiple buckets.", data: level3Data },
  { id: 4, title: "Level 4: Account Interest", desc: "Maximize APY gains.", data: level4Data },
  { id: 5, title: "Level 5: Credit & Debt", desc: "Manage high-APR liabilities.", data: level5Data },
];

export function LevelSelectMenu() {
  const { 
    levelScores, 
    isAllUnlocked, 
    loadLevel, 
    setCurrentScreen, 
    unlockAllLevels, 
    clearProgress 
  } = useFinanceStore();

  const handlePlay = (levelData: any) => {
    if (levelData) {
      loadLevel(levelData);
      setCurrentScreen('game');
    } else {
      alert("This level's JSON data is not built yet!");
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col overflow-y-auto">
      <header className="bg-white border-b py-8 px-12 shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Advisor Simulator</h1>
        <p className="text-gray-600">Select a client profile to begin building their financial plan.</p>
      </header>

      <main className="flex-1 p-12 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEVEL_MANIFEST.map((level, index) => {
            const score = levelScores[level.id];
            const isCompleted = score >= 60;
            const isUnlocked = isAllUnlocked || index === 0 || (levelScores[LEVEL_MANIFEST[index - 1].id] >= 60);

            return (
              <div 
                key={level.id} 
                className={`p-6 rounded-xl border-2 transition-all ${
                  isUnlocked 
                    ? 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer' 
                    : 'bg-gray-100 border-gray-200 opacity-60 grayscale cursor-not-allowed'
                }`}
                onClick={() => isUnlocked && handlePlay(level.data)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="font-bold text-lg text-gray-800">{level.title}</h2>
                  {isCompleted && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      ✓ {score}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-6">{level.desc}</p>
                
                <button 
                  disabled={!isUnlocked}
                  className={`w-full py-2 rounded font-medium text-sm transition-colors ${
                    isUnlocked ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isUnlocked ? (isCompleted ? 'Replay Level' : 'Start Plan') : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="p-4 flex justify-end gap-3 border-t bg-white shrink-0">
        <button onClick={clearProgress} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200">
          Clear Data
        </button>
        <button onClick={unlockAllLevels} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300">
          Unlock All Levels
        </button>
      </footer>
    </div>
  );
}