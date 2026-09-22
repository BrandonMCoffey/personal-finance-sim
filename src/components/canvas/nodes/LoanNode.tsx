import { BaseNode } from './BaseNode';
import { useFinanceStore } from '../../../store/financeStore';

interface LoanNodeProps {
    data: {
        id: string;
        name: string;
        balance: number;
        apr: number;
        minimumPayment: number;
        forecastBalance: number;
    };
}

export function LoanNode({ data }: LoanNodeProps) {
    const { renameAccount } = useFinanceStore();
    const isPaidOff = data.forecastBalance <= 0;

    return (
        <BaseNode
            title={data.name}
            subtitle="LOAN"
            bgColor="bg-orange-50"
            borderColor={isPaidOff ? "border-green-400" : "border-orange-400"}
            titleColor="text-orange-900"
            targetHandle={{ color: 'bg-orange-500' }}
            onRename={(newName) => renameAccount(data.id, newName)}
            headerElement={<span className="text-[10px] text-orange-600 font-bold">{data.apr}% APR</span>}
        >
            <div className="flex justify-between items-end w-full mt-2">
                <div>
                    <div className="text-[10px] opacity-75 text-orange-800">Forecasted Debt</div>
                    <div className={`text-sm font-bold ${isPaidOff ? 'text-green-600' : 'text-orange-700'}`}>
                        ${Math.max(0, data.forecastBalance).toFixed(2)}
                    </div>
                </div>
                <div className="text-[10px] text-orange-700 font-medium bg-orange-100 px-1.5 py-0.5 rounded">
                    Min: ${data.minimumPayment}/mo
                </div>
            </div>
        </BaseNode>
    );
}