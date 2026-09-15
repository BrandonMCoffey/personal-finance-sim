import { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import type { Connection, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFinanceStore } from '../../store/financeStore';
import { generateForecast } from '../../engines/forecast';
import { CanvasControls } from './CanvasControls';
import { OutputEditorPanel } from './OutputEditorPanel';
import { AccountNode } from './nodes/AccountNode';
import { IncomeNode } from './nodes/IncomeNode';
import { GoalNode } from './nodes/GoalNode';
import { ExpenseNode } from './nodes/ExpenseNode';

const nodeTypes = {
  account: AccountNode,
  income: IncomeNode,
  goal: GoalNode,
  expense: ExpenseNode,
};

export function FlowSandbox() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const {
    accounts, incomes, goals, expenses, transferRules, forecastMonths,
    addIncomeRoute, addTransferRule,
    removeIncomeRoute, removeTransferRule
  } = useFinanceStore();

  useEffect(() => {
    const forecasts = generateForecast(accounts, incomes, transferRules, goals, expenses, forecastMonths);
    const finalSnapshot = forecasts[forecasts.length - 1];

    const newNodes: Node[] = [
      ...incomes.map((inc, i) => ({
        id: inc.id, type: 'income', position: { x: 50, y: 50 + i * 100 }, data: { name: inc.name, amount: inc.amount }
      })),
      ...accounts.map((acc, i) => ({
        id: acc.id, type: 'account', position: { x: 350, y: 50 + i * 120 },
        data: {
          name: acc.name,
          balance: acc.balance,
          forecastBalance: finalSnapshot ? finalSnapshot.accountBalances[acc.id] : acc.balance,
          forecastMonths
        }
      })),
      ...goals.map((goal, i) => ({
        id: goal.id, type: 'goal', position: { x: 650, y: 50 + i * 100 },
        data: {
          name: goal.name, targetAmount: goal.targetAmount,
          currentAmount: finalSnapshot ? finalSnapshot.goalProgress[goal.id] : 0,
          hitMonth: finalSnapshot ? finalSnapshot.goalHitMonths[goal.id] : undefined
        }
      })),
      ...expenses.map((exp, i) => ({
        id: exp.id, type: 'expense', position: { x: 650, y: 50 + (goals.length + i) * 100 },
        data: {
          id: exp.id,
          name: exp.name, targetAmount: exp.amount,
          currentAmount: finalSnapshot ? finalSnapshot.expenseProgress[exp.id] : 0,
          isFixed: exp.isFixed,
          maxValue: exp.maxValue
        }
      }))
    ];

    setNodes((currentNodes) => newNodes.map(newNode => {
      const existing = currentNodes.find(n => n.id === newNode.id);
      return existing ? { ...newNode, position: existing.position } : newNode;
    }));

    const newEdges: Edge[] = [];

    incomes.forEach(inc => {
      if (inc.routings) {
        inc.routings.forEach((route) => {
          newEdges.push({
            id: `inc|${inc.id}|${route.destinationId}`,
            source: inc.id,
            target: route.destinationId,
            animated: true,
            label: route.type === 'percentage' ? `${route.amount}%` : `$${route.amount}`,
          });
        });
      }
    });

    transferRules.forEach(rule => {
      newEdges.push({
        id: `rule|${rule.id}`,
        source: rule.sourceId,
        target: rule.destinationId,
        animated: true,
        label: rule.type === 'percentage' ? `${rule.amount}%` : `$${rule.amount}`,
      });
    });

    setEdges(newEdges);
  }, [accounts, incomes, goals, expenses, transferRules, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const { source, target } = params;
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    if (!sourceNode || !targetNode) return;

    const isValidTarget = ['account', 'goal', 'expense'].includes(targetNode.type || '');

    if (sourceNode.type === 'income' && isValidTarget) {
      const targetExpense = expenses.find(e => e.id === target);
      if (targetExpense) {
        addIncomeRoute(source, target, targetExpense.amount, 'fixed');
      } else {
        addIncomeRoute(source, target);
      }
    } else if (sourceNode.type === 'account' && isValidTarget) {
      const targetExpense = expenses.find(e => e.id === target);
      if (targetExpense) {
        addTransferRule(source, target, targetExpense.amount, 'fixed');
      } else {
        addTransferRule(source, target, 10, 'percentage');
      }
    }
  }, [nodes, expenses, addIncomeRoute, addTransferRule]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      if (edge.id.startsWith('inc|')) {
        const parts = edge.id.split('|');
        const incomeId = parts[1];
        const destId = parts[2];
        removeIncomeRoute(incomeId, destId);
      } else if (edge.id.startsWith('rule|')) {
        const parts = edge.id.split('|');
        removeTransferRule(parts[1]);
      }

      if (edge.id === selectedEdgeId) {
        setSelectedEdgeId(null);
      }
    });
  }, [removeIncomeRoute, removeTransferRule, selectedEdgeId]);

  return (
    <div className="w-full h-full" tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode={['Backspace', 'Delete']}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        <CanvasControls />
        <OutputEditorPanel
          selectedEdgeId={selectedEdgeId}
          onClose={() => setSelectedEdgeId(null)}
        />
      </ReactFlow>
    </div>
  );
}