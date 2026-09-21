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
import { CardNode } from './nodes/CardNode';

const nodeTypes = {
  account: AccountNode,
  income: IncomeNode,
  goal: GoalNode,
  expense: ExpenseNode,
  card: CardNode,
};

function FlowSandboxInner() {
  const { getIntersectingNodes } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [snapTrigger, setSnapTrigger] = useState(0);

  const { 
    levelId, accounts, incomes, goals, expenses, transferRules, cards, forecastMonths,
    addIncomeRoute, addTransferRule, updateCardLink,
    removeIncomeRoute, removeTransferRule, removeAccount
  } = useFinanceStore();

  useEffect(() => {
    const forecasts = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, forecastMonths);
    const finalSnapshot = forecasts[forecasts.length - 1];

    const sortedExpenses = [...expenses].sort((a, b) => {
      if (a.isFixed && !b.isFixed) return -1;
      if (!a.isFixed && b.isFixed) return 1;
      return 0;
    });

    const childrenMap: Record<string, string[]> = {};
    accounts.forEach(a => childrenMap[a.id] = []);
    cards.forEach(c => childrenMap[c.id] = []);
    
    const snappedMap: Record<string, { parentId: string, stackIndex: number, zIndex: number }> = {};
  	const childSortRank = (id: string) => {
  	  if (expenses.find(e => e.id === id && e.isFixed)) return 300;
  	  if (expenses.find(e => e.id === id)) return 200;
  	  if (goals.find(g => g.id === id)) return 100;
  	  return 0;
  	};

    const isLockedExpense = (nodeId: string, snapped: boolean) =>
      levelId === 1 && snapped && expenses.some(e => e.id === nodeId);
    
    cards.forEach(c => {
      if (c.type === 'debit' && c.linkedAccountId && accounts.find(a => a.id === c.linkedAccountId)) {
        snappedMap[c.id] = { parentId: c.linkedAccountId, stackIndex: childrenMap[c.linkedAccountId].length, zIndex: 400 };
        childrenMap[c.linkedAccountId].push(c.id);
      }
    });

    [...sortedExpenses, ...goals].forEach(item => {
      const rules = transferRules.filter(r => r.destinationId === item.id);
      if (rules.length === 1) {
        const pId = rules[0].sourceId;
        if (accounts.find(a => a.id === pId) || cards.find(c => c.id === pId)) {
          snappedMap[item.id] = { parentId: pId, stackIndex: childrenMap[pId].length, zIndex: childSortRank(item.id) };
          childrenMap[pId].push(item.id);
        }
      }
    });

    const accountHeight = forecastMonths > 1 ? 122 : 70; 
    const childHeight = 88; 

    const newNodes: Node[] = [
      ...incomes.map((inc, i) => {
        let totalUsed = 0;
        let overAllocated = false;

        if (inc.routings) {
          inc.routings.forEach((route, idx) => {
            if (idx === inc.routings!.length - 1) return; // Ignore the last one, it's just a passive bucket
            let intended = route.type === 'fixed' ? route.amount : inc.amount * (route.amount / 100);
            totalUsed += intended;
          });
        }
        
        if (totalUsed > inc.amount + 0.01) {
          overAllocated = true;
        }

        const isBalanced = (inc.routings && inc.routings.length > 0 && !overAllocated);
        
        return {
          id: inc.id, type: 'income', position: { x: 50, y: 50 + i * 100 }, 
          data: { name: inc.name, amount: inc.amount, isBalanced } 
        };
      }),
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
      ...cards.map((card, i) => {
        const snap = snappedMap[card.id];
        return {
          id: card.id, type: 'card', parentId: snap?.parentId, zIndex: snap?.zIndex,
          position: snap ? { x: 0, y: accountHeight + snap.stackIndex * childHeight } : { x: 350, y: 50 + (accounts.length + i) * 150 },
          data: {
            id: card.id, name: card.name, type: card.type,
            forecastBalance: finalSnapshot ? finalSnapshot.cardBalances[card.id] : card.balance,
            apr: card.apr, isSnapped: !!snap
          }
        };
      }),
     ...goals.map((goal, i) => {
        const snap = snappedMap[goal.id];
        return {
          id: goal.id, type: 'goal', parentId: snap?.parentId, zIndex: snap?.zIndex,
          position: snap ? { x: 0, y: accountHeight + snap.stackIndex * childHeight } : { x: 650, y: 50 + i * 100 },
          data: { 
            id: goal.id, name: goal.name, targetAmount: goal.targetAmount, 
            targetMonths: goal.targetMonths,
            currentAmount: finalSnapshot ? finalSnapshot.goalProgress[goal.id] : 0,
            hitMonth: finalSnapshot ? finalSnapshot.goalHitMonths[goal.id] : undefined,
            isSnapped: !!snap
          }
        };
      }),
      ...sortedExpenses.map((exp, i) => {
        const snap = snappedMap[exp.id];
        return {
          id: exp.id, type: 'expense', parentId: snap?.parentId, zIndex: snap?.zIndex,
          draggable: !isLockedExpense(exp.id, !!snap),
          position: snap ? { x: 0, y: accountHeight + snap.stackIndex * childHeight } : { x: 650, y: 50 + (goals.length + i) * 100 },
          data: {
            id: exp.id, name: exp.name, targetAmount: exp.amount,
            currentAmount: finalSnapshot ? finalSnapshot.expenseProgress[exp.id] : 0,
            isFixed: exp.isFixed,
            minValue: exp.minValue,
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

        if (wasChild && !isChild) {
          let dropPos = existing.position; 
          const absPos = (existing as any).computed?.positionAbsolute || (existing as any).positionAbsolute;
          
          if (absPos) {
            dropPos = absPos;
          } else {
            let current = existing;
            let absX = existing.position.x;
            let absY = existing.position.y;
            
            while (current.parentId) {
              const p = currentNodes.find(n => n.id === current.parentId);
              if (p) { absX += p.position.x; absY += p.position.y; current = p; } 
              else break;
            }
            dropPos = { x: absX, y: absY };
          }
          return { ...newNode, position: dropPos }; 
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
        let available = inc.amount;
        let prevType = 'fixed';
        
        inc.routings.forEach((route, idx) => {
          const isLast = idx === inc.routings!.length - 1;
          let edgeLabel = '';

          if (isLast) {
            let remainder = Math.max(0, available);
            if (inc.routings!.length === 1) {
              edgeLabel = '100%';
            } else if (prevType === 'percentage') {
              let pct = (remainder / inc.amount) * 100;
              edgeLabel = `${pct.toFixed(0)}%`;
            } else {
              edgeLabel = `$${remainder.toFixed(0)}`;
            }
          } else {
            prevType = route.type;
            let intended = route.type === 'fixed' ? route.amount : inc.amount * (route.amount / 100);
            edgeLabel = route.type === 'percentage' ? `${route.amount}%` : `$${route.amount}`;
            available -= intended;
          }

          newEdges.push({
            id: `inc|${inc.id}|${route.destinationId}`, source: inc.id, target: route.destinationId,
            animated: true, label: edgeLabel,
          });
        });
      }
    });

    transferRules.forEach(rule => {
      if (!snappedMap[rule.destinationId]) {
        const isCash = accounts.find(a => a.id === rule.sourceId)?.type === 'cash';
        const isGoal = goals.some(g => g.id === rule.destinationId);

        let edgeLabel = rule.type === 'percentage' ? `${rule.amount}%` : `$${rule.amount}`;
        if (isCash) edgeLabel = 'Deposit';
        if (isGoal) edgeLabel = 'Monitors';

        newEdges.push({
          id: `rule|${rule.id}`, source: rule.sourceId, target: rule.destinationId,
          animated: true, label: edgeLabel,
        });
      }
    });

    setEdges(newEdges);
  }, [levelId, accounts, incomes, goals, expenses, cards, transferRules, forecastMonths, snapTrigger, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const { source, target } = params;
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    if (!sourceNode || !targetNode) return;

    const isValidTarget = ['account', 'card', 'goal', 'expense'].includes(targetNode.type || '');

    if (sourceNode.type === 'income' && ['account', 'card', 'expense'].includes(targetNode.type || '')) {
      const targetExpense = expenses.find(e => e.id === target);
      if (targetExpense) addIncomeRoute(source, target, targetExpense.amount, 'fixed');
      else addIncomeRoute(source, target);
    }
    else if ((sourceNode.type === 'account' || sourceNode.type === 'card') && isValidTarget) {
      const sourceAcc = accounts.find(a => a.id === source);
      const targetCard = cards.find(c => c.id === target);
      const targetExpense = expenses.find(e => e.id === target);
      const targetGoal = goals.find(g => g.id === target);

      if (sourceAcc?.type === 'cash') addTransferRule(source, target, 100, 'percentage');
      else if (targetCard && targetCard.type === 'credit') addTransferRule(source, target, 100, 'fixed');
      else if (targetExpense) addTransferRule(source, target, targetExpense.amount, 'fixed');
      else if (targetGoal) addTransferRule(source, target, Math.min(100, targetGoal.targetAmount), 'fixed');
      else addTransferRule(source, target, 10, 'percentage');
    }
  }, [nodes, expenses, goals, accounts, cards, addIncomeRoute, addTransferRule]);

  const onNodeDragStop = useCallback((event: any, node: Node) => {
    if (node.type !== 'expense' && node.type !== 'goal' && node.type !== 'card') return;

    const intersections = getIntersectingNodes(node);

    let targetParentId: string | null = null;
    const directParent = intersections.find(n => n.type === 'account' || n.type === 'card');
    
    if (directParent) {
      targetParentId = directParent.id;
    } else {
      const siblingNode = intersections.find(n => n.parentId);
      if (siblingNode && siblingNode.parentId) {
        targetParentId = siblingNode.parentId;
      }
    }

    if (node.type === 'card') {
      const cardData = cards.find(c => c.id === node.id);
      if (cardData?.type === 'debit') {
        if (targetParentId && node.parentId !== targetParentId) updateCardLink(node.id, targetParentId);
        else if (!targetParentId && node.parentId) updateCardLink(node.id, ''); 
        else if (targetParentId && node.parentId === targetParentId) setSnapTrigger(s => s + 1); // NEW: Force snap-back
      }
      return;
    }

    if (targetParentId) {
      if (node.parentId === targetParentId) {
        setSnapTrigger(s => s + 1);
        return; 
      }

      if (node.type === 'expense') {
        const expenseData = expenses.find(e => e.id === node.id);
        const parentType = accounts.find(a => a.id === targetParentId) ? 'account' : 'card';
        if (expenseData?.requiresCard && parentType === 'account') {
          setSnapTrigger(s => s + 1); // Force snap-back on rejection
          return;
        }
      }

      const existingRules = transferRules.filter(r => r.destinationId === node.id);
      existingRules.forEach(r => removeTransferRule(r.id));

      const targetAmount = node.type === 'expense' ? expenses.find(e=>e.id===node.id)?.amount : goals.find(g=>g.id===node.id)?.targetAmount;
      addTransferRule(targetParentId, node.id, targetAmount ? Math.min(10000, targetAmount) : 100, 'fixed');
    } else {
      if (node.parentId) {
        const existingRules = transferRules.filter(r => r.destinationId === node.id);
        existingRules.forEach(r => removeTransferRule(r.id));
      }
    }
  }, [getIntersectingNodes, transferRules, expenses, goals, cards, accounts, removeTransferRule, addTransferRule, updateCardLink]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => { setSelectedEdgeId(edge.id); }, []);
  
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      if (edge.id.startsWith('inc|')) removeIncomeRoute(edge.id.split('|')[1], edge.id.split('|')[2]);
      else if (edge.id.startsWith('rule|')) removeTransferRule(edge.id.split('|')[1]);
      if (edge.id === selectedEdgeId) setSelectedEdgeId(null);
    });
  }, [removeIncomeRoute, removeTransferRule, selectedEdgeId]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    deletedNodes.forEach(node => {
      if (node.type === 'account') removeAccount(node.id);
    });
  }, [removeAccount]);

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodesDelete={onNodesDelete}
      onConnect={onConnect} onNodeDragStop={onNodeDragStop}
      onEdgeClick={onEdgeClick} onEdgesDelete={onEdgesDelete}
      deleteKeyCode={['Backspace', 'Delete']} nodeTypes={nodeTypes} fitView
      zIndexMode="manual" elevateNodesOnSelect={false}
    >
      <Controls />
      <MiniMap />
      <Background gap={12} size={1} />
      <CanvasControls />
      <OutputEditorPanel selectedEdgeId={selectedEdgeId} onClose={() => setSelectedEdgeId(null)} />
    </ReactFlow>
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