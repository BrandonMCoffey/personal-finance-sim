import type { ValidationReport } from '../../engines/validation';

interface GradeModalProps {
  isOpen: boolean;
  report: ValidationReport | null;
  onRetry: () => void;
  onContinue: () => void;
}

const POSITIVE_FEEDBACK_PREFIXES = ['Great', 'Success', 'Excellent', 'Good habit'];

function isPositiveFeedback(message: string) {
  return POSITIVE_FEEDBACK_PREFIXES.some(prefix => message.startsWith(prefix));
}

export function GradeModal({ isOpen, report, onRetry, onContinue }: GradeModalProps) {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-transform">
        <div className={`px-6 py-4 border-b ${report.passed ? 'bg-green-500' : 'bg-red-500'}`}>
          <h2 className="text-2xl font-bold text-white flex justify-between items-center">
            {report.passed ? 'Plan Approved!' : 'Plan Needs Work'}
            <span className="text-3xl font-black opacity-80">{report.score}%</span>
          </h2>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Financial Advisor Feedback
          </h3>
          <ul className="space-y-3">
            {report.feedback.map((msg, idx) => {
              const positive = isPositiveFeedback(msg);
              return (
                <li key={idx} className="flex items-start gap-3 text-gray-700">
                  <span
                    className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                      positive ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className={positive ? 'font-medium' : ''}>{msg}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onRetry}
            className="px-4 py-2 text-gray-600 font-medium rounded hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
          {report.passed && (
            <button
              onClick={onContinue}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}