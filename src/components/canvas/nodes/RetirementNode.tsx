import { BaseNode } from './BaseNode';
import { useFinanceStore } from '../../../store/financeStore';
import { Position } from '@xyflow/react';

interface RetirementNodeProps {
    data: {
        id: string;
        name: string;
        balance: number;
        expectedApy: number;
        employerMatchPercent: number;
        forecastBalance: number;
    };
}

export function RetirementNode({ data }: RetirementNodeProps) {
    const { renameAccount } = useFinanceStore();

    return (
        <BaseNode
            title={data.name}
            subtitle="401K/IRA"
            bgColor="bg-emerald-50"
            borderColor="border-emerald-400"
            titleColor="text-emerald-900"
            targetHandle={{ color: 'bg-emerald-500' }}
            sourceHandle={{ color: 'bg-emerald-500', position: Position.Right }}
            onRename={(newName) => renameAccount(data.id, newName)}
            headerElement={<span className="text-[10px] font-bold text-emerald-600">~{data.expectedApy}% APY</span>}
        >
            <div className="flex justify-between items-end w-full mt-2">
                <div>
                    <div className="text-[10px] opacity-75 text-emerald-800">Forecasted Value</div>
                    <div className="text-sm font-bold text-emerald-700">
                        ${Math.max(0, data.forecastBalance).toFixed(2)}
                    </div>
                </div>
                {data.employerMatchPercent > 0 && (
                    <div className="text-[10px] text-emerald-700 font-medium bg-emerald-100 px-1.5 py-0.5 rounded" title="Employer Match">
                        Match: {data.employerMatchPercent}%
                    </div>
                )}
            </div>
        </BaseNode>
    );
}