import { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
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

function FlowSandboxInner() {
  const { getIntersectingNodes } = useReactFlow();
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

    const childrenMap: Record<string, string[]> = {};
    accounts.forEach(a => childrenMap[a.id] = []);
    
    const snappedMap: Record<string, { parentId: string, stackIndex: number }> = {};
    
    [...expenses, ...goals].forEach(item => {
      const rules = transferRules.filter(r => r.destinationId === item.id);
      if (rules.length === 1 && accounts.find(a => a.id === rules[0].sourceId)) {
        const pId = rules[0].sourceId;
        snappedMap[item.id] = { parentId: pId, stackIndex: childrenMap[pId].length };
        childrenMap[pId].push(item.id);
      }
    });

    const newNodes: Node[] = [
      ...incomes.map((inc, i) => ({
        id: inc.id, type: 'income', position: { x: 50, y: 50 + i * 100 }, data: { name: inc.name, amount: inc.amount }
      })),
      ...accounts.map((acc, i) => {
        const history = forecasts.map(snap => ({
          month: snap.month, balance: snap.accountBalances[acc.id],
          in: snap.accountFlows[acc.id].in, out: snap.accountFlows[acc.id].out
        }));

        return {
          id: acc.id, type: 'account', position: { x: 350, y: 50 + i * 120 }, 
          data: { 
            name: acc.name, balance: acc.balance, forecastBalance: finalSnapshot ? finalSnapshot.accountBalances[acc.id] : acc.balance,
            forecastMonths, accountType: acc.type, history 
          }
        };
      }),
      ...goals.map((goal, i) => {
        const snap = snappedMap[goal.id];
        return {
          id: goal.id, type: 'goal', parentId: snap?.parentId,
          position: snap ? { x: 0, y: 130 + snap.stackIndex * 90 } : { x: 650, y: 50 + i * 100 },
          data: { 
            id: goal.id, name: goal.name, targetAmount: goal.targetAmount, 
            currentAmount: finalSnapshot ? finalSnapshot.goalProgress[goal.id] : 0,
            hitMonth: finalSnapshot ? finalSnapshot.goalHitMonths[goal.id] : undefined,
            isSnapped: !!snap
          }
        };
      }),
      ...expenses.map((exp, i) => {
        const snap = snappedMap[exp.id];
        return {
          id: exp.id, type: 'expense', parentId: snap?.parentId,
          position: snap ? { x: 0, y: 130 + snap.stackIndex * 130 } : { x: 650, y: 50 + (goals.length + i) * 100 },
          data: {
            id: exp.id, name: exp.name, targetAmount: exp.amount,
            currentAmount: finalSnapshot ? finalSnapshot.expenseProgress[exp.id] : 0,
            isSnapped: !!snap
          }
        };
      })
    ];

    setNodes((currentNodes) => newNodes.map(newNode => {
      const existing = currentNodes.find(n => n.id === newNode.id);
      if (existing) {
        const wasChild = !!existing.parentId;
        const isChild = !!newNode.parentId;

        if (wasChild && !isChild && (existing as any).positionAbsolute) {
          return { ...newNode, position: (existing as any).positionAbsolute };
        }
        if (isChild) {
          return { ...newNode };
        }
        return { ...newNode, position: existing.position };
      }
      return newNode;
    }));

    const newEdges: Edge[] = [];
    
    incomes.forEach(inc => {
      if (inc.routings) {
        inc.routings.forEach((route) => {
          newEdges.push({
            id: `inc|${inc.id}|${route.destinationId}`, source: inc.id, target: route.destinationId,
            animated: true, label: route.type === 'percentage' ? `${route.amount}%` : `$${route.amount}`,
          });
        });
      }
    });

    transferRules.forEach(rule => {
      if (!snappedMap[rule.destinationId]) {
        const isCash = accounts.find(a => a.id === rule.sourceId)?.type === 'cash';
        newEdges.push({
          id: `rule|${rule.id}`, source: rule.sourceId, target: rule.destinationId,
          animated: true, label: isCash ? 'Deposit' : (rule.type === 'percentage' ? `${rule.amount}%` : `$${rule.amount}`),
        });
      }
    });

    setEdges(newEdges);
  }, [accounts, incomes, goals, expenses, transferRules, forecastMonths, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const { source, target } = params;
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    if (!sourceNode || !targetNode) return;

    const isValidTarget = ['account', 'goal', 'expense'].includes(targetNode.type || '');

    if (sourceNode.type === 'income' && isValidTarget) {
      const targetExpense = expenses.find(e => e.id === target);
      if (targetExpense) addIncomeRoute(source, target, targetExpense.amount, 'fixed');
      else addIncomeRoute(source, target);
    } 
    else if (sourceNode.type === 'account' && isValidTarget) {
      const sourceAcc = accounts.find(a => a.id === source);
      const targetExpense = expenses.find(e => e.id === target);
      const targetGoal = goals.find(g => g.id === target);

      if (sourceAcc?.type === 'cash') addTransferRule(source, target, 100, 'percentage');
      else if (targetExpense) addTransferRule(source, target, targetExpense.amount, 'fixed');
      else if (targetGoal) addTransferRule(source, target, Math.min(100, targetGoal.targetAmount), 'fixed');
      else addTransferRule(source, target, 10, 'percentage');
    }
  }, [nodes, expenses, goals, accounts, addIncomeRoute, addTransferRule]);

  const onNodeDragStop = useCallback((event: any, node: Node) => {
    if (node.type !== 'expense' && node.type !== 'goal') return;

    const intersections = getIntersectingNodes(node);
    const accountNode = intersections.find(n => n.type === 'account');

    if (accountNode) {
      if (node.parentId === accountNode.id) return;

      const existingRules = transferRules.filter(r => r.destinationId === node.id);
      existingRules.forEach(r => removeTransferRule(r.id));

      const targetAmount = node.type === 'expense' ? expenses.find(e=>e.id===node.id)?.amount : goals.find(g=>g.id===node.id)?.targetAmount;
      addTransferRule(accountNode.id, node.id, targetAmount ? Math.min(10000, targetAmount) : 100, 'fixed');
    } else {
      if (node.parentId) {
        const existingRules = transferRules.filter(r => r.destinationId === node.id);
        existingRules.forEach(r => removeTransferRule(r.id));
      }
    }
  }, [getIntersectingNodes, transferRules, expenses, goals, removeTransferRule, addTransferRule]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => { setSelectedEdgeId(edge.id); }, []);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      if (edge.id.startsWith('inc|')) removeIncomeRoute(edge.id.split('|')[1], edge.id.split('|')[2]);
      else if (edge.id.startsWith('rule|')) removeTransferRule(edge.id.split('|')[1]);
      if (edge.id === selectedEdgeId) setSelectedEdgeId(null);
    });
  }, [removeIncomeRoute, removeTransferRule, selectedEdgeId]);

  return (
    <>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick} onEdgesDelete={onEdgesDelete}
        deleteKeyCode={['Backspace', 'Delete']} nodeTypes={nodeTypes} fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        <CanvasControls />
        <OutputEditorPanel selectedEdgeId={selectedEdgeId} onClose={() => setSelectedEdgeId(null)} />
      </ReactFlow>
    </>
  );
}

export function FlowSandbox() {
  return (
    <div className="w-full h-full" tabIndex={0}>
      <ReactFlowProvider>
        <FlowSandboxInner />
      </ReactFlowProvider>
    </div>
  );
}