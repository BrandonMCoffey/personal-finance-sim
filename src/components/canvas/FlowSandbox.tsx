import { useEffect, useCallback, useState } from "react";
import { ReactFlow, MiniMap, Controls, Background, Panel, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import type { Connection, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFinanceStore } from "../../store/financeStore";
import { generateForecast } from "../../engines/forecast";
import { CanvasControls } from "./CanvasControls";
import { OutputEditorPanel } from "./OutputEditorPanel";
import { AccountNode } from "./nodes/AccountNode";
import { IncomeNode } from "./nodes/IncomeNode";
import { GoalNode } from "./nodes/GoalNode";
import { ExpenseNode } from "./nodes/ExpenseNode";
import { CardNode } from "./nodes/CardNode";
import { LoanNode } from "./nodes/LoanNode";
import { RetirementNode } from "./nodes/RetirementNode";
import { InsuranceNode } from "./nodes/InsuranceNode";
import { calculateIncomeTaxes } from "../../store/financeStore";

const nodeTypes = {
	account: AccountNode,
	income: IncomeNode,
	goal: GoalNode,
	expense: ExpenseNode,
	card: CardNode,
	loan: LoanNode,
	retirement: RetirementNode,
	insurance: InsuranceNode
};

function FlowSandboxInner() {
	const { getIntersectingNodes } = useReactFlow();
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
	const [snapTrigger, setSnapTrigger] = useState(0);

	const {
		levelId,
		accounts,
		incomes,
		goals,
		expenses,
		transferRules,
		cards,
		loans,
		insurances,
		retirements,
		inflationRate,
		allowedActions,
		forecastMonths,
		addIncomeRoute,
		addTransferRule,
		updateCardLink,
		removeIncomeRoute,
		removeTransferRule,
		removeAccount,
		updateIncomeRoute,
		updateTransferRule
	} = useFinanceStore();

	useEffect(() => {
		const accountRequiredSums: Record<string, number> = {};

		accounts.forEach((a) => {
			let sum = 0;
			// 1. Direct transfer rules from account to connected expenses
			transferRules
				.filter((r) => r.sourceId === a.id)
				.forEach((r) => {
					const exp = expenses.find((e) => e.id === r.destinationId);
					if (exp) sum += r.amount;
				});

			// 2. Transfer rules from debit cards linked to this checking account
			const linkedDebitCards = cards.filter((c) => c.type === "debit" && c.linkedAccountId === a.id);
			linkedDebitCards.forEach((card) => {
				transferRules
					.filter((r) => r.sourceId === card.id)
					.forEach((r) => {
						const exp = expenses.find((e) => e.id === r.destinationId);
						if (exp) sum += r.amount;
					});
			});

			accountRequiredSums[a.id] = sum;
		});

		incomes.forEach((inc) => {
			const routings = inc.routings || [];
			const isSingleOutput = routings.length === 1;

			routings.forEach((route) => {
				if (route.isAuto) {
					if (isSingleOutput) {
						if (route.amount !== 100 || route.type !== "percentage") {
							updateIncomeRoute(inc.id, route.destinationId, 100, "percentage", true);
						}
					} else {
						const required = accountRequiredSums[route.destinationId] || 0;
						if (route.amount !== required || route.type !== "fixed") {
							updateIncomeRoute(inc.id, route.destinationId, required, "fixed", true);
						}
					}
				}
			});
		});

		transferRules.forEach((rule) => {
			if (rule.isAuto) {
				const outgoingRules = transferRules.filter(
					(r) => r.sourceId === rule.sourceId && !goals.some((g) => g.id === r.destinationId)
				);
				const isSingleOutput = outgoingRules.length === 1;

				if (isSingleOutput) {
					if (rule.amount !== 100 || rule.type !== "percentage") {
						updateTransferRule(rule.id, 100, "percentage", true);
					}
				} else {
					const required = accountRequiredSums[rule.destinationId] || 0;
					if (rule.amount !== required || rule.type !== "fixed") {
						updateTransferRule(rule.id, required, "fixed", true);
					}
				}
			}
		});
	}, [expenses, transferRules, incomes, accounts, cards, goals, updateIncomeRoute, updateTransferRule]);

	useEffect(() => {
		const forecasts = generateForecast(
			accounts,
			incomes,
			transferRules,
			goals,
			expenses,
			cards,
			loans,
			retirements,
			forecastMonths,
			insurances,
			inflationRate
		);
		const finalSnapshot = forecasts[forecasts.length - 1];

		const sortedExpenses = [...expenses].sort((a, b) => {
			if (a.isFixed && !b.isFixed) return -1;
			if (!a.isFixed && b.isFixed) return 1;
			return 0;
		});

		const childrenMap: Record<string, string[]> = {};
		accounts.forEach((a) => (childrenMap[a.id] = []));
		cards.forEach((c) => (childrenMap[c.id] = []));

		const snappedMap: Record<string, { parentId: string; stackIndex: number; zIndex: number }> = {};
		const childSortRank = (id: string) => {
			if (expenses.find((e) => e.id === id && e.isFixed)) return 300;
			if (expenses.find((e) => e.id === id)) return 200;
			if (goals.find((g) => g.id === id)) return 100;
			return 0;
		};

		const isLockedExpense = (nodeId: string, snapped: boolean) =>
			Boolean(allowedActions?.lockExpenses && snapped && expenses.some((e) => e.id === nodeId));

		cards.forEach((c) => {
			if (c.type === "debit" && c.linkedAccountId && accounts.find((a) => a.id === c.linkedAccountId)) {
				snappedMap[c.id] = { parentId: c.linkedAccountId, stackIndex: childrenMap[c.linkedAccountId].length, zIndex: 400 };
				childrenMap[c.linkedAccountId].push(c.id);
			}
		});

		[...sortedExpenses, ...goals].forEach((item) => {
			const rules = transferRules.filter((r) => r.destinationId === item.id);
			if (rules.length === 1) {
				const pId = rules[0].sourceId;
				if (accounts.find((a) => a.id === pId) || cards.find((c) => c.id === pId)) {
					snappedMap[item.id] = { parentId: pId, stackIndex: childrenMap[pId].length, zIndex: childSortRank(item.id) };
					childrenMap[pId].push(item.id);
				}
			}
		});

		const accountHeight = 95;
		const childHeight = 60;

		let currentMainY = 50;
		const mainNodesY: Record<string, number> = {};

		[...accounts, ...loans, ...retirements, ...insurances].forEach((item) => {
			mainNodesY[item.id] = currentMainY;
			const childCount = childrenMap[item.id]?.length || 0;
			currentMainY += accountHeight + childCount * childHeight + 30; // Reduced bottom padding
		});

		cards.forEach((card) => {
			if (!snappedMap[card.id]) {
				mainNodesY[card.id] = currentMainY;
				const childCount = childrenMap[card.id]?.length || 0;
				currentMainY += accountHeight + childCount * childHeight + 30;
			}
		});

		const newNodes: Node[] = [
			...incomes.map((inc, i) => {
				let totalUsed = 0;
				let overAllocated = false;
				const { totalTax, netAmount, breakdown } = calculateIncomeTaxes(inc.amount, inc.taxRate, inc.taxDeductions);

				if (inc.routings) {
					inc.routings.forEach((route, idx) => {
						if (idx === inc.routings!.length - 1) return;
						let intended = route.type === "fixed" ? route.amount : netAmount * (route.amount / 100);
						totalUsed += intended;
					});
				}
				if (totalUsed > netAmount + 0.01) overAllocated = true;
				const isBalanced = inc.routings && inc.routings.length > 0 && !overAllocated;

				return {
					id: inc.id,
					type: "income",
					position: { x: 50, y: 50 + i * 140 },
					data: {
						name: inc.name,
						amount: inc.amount,
						netAmount,
						taxRate: inc.taxRate || 0,
						taxAmount: totalTax,
						taxDeductionBreakdown: breakdown,
						isBalanced
					}
				};
			}),
			...accounts.map((acc) => {
				const isDepositedRule = transferRules.find((r) => r.sourceId === acc.id && accounts.some((a) => a.id === r.destinationId));
				const isDeposited = !!isDepositedRule;

				let adjustedStartBalance = acc.balance;
				transferRules.forEach((rule) => {
					if (rule.destinationId === acc.id && accounts.some((a) => a.id === rule.sourceId)) {
						const sourceAcc = accounts.find((a) => a.id === rule.sourceId);
						if (sourceAcc && sourceAcc.type === "cash") {
							adjustedStartBalance += sourceAcc.balance;
						}
					}
				});

				const history = forecasts.map((snap) => ({
					month: snap.month,
					balance: snap.accountBalances[acc.id],
					goal: snap.accountGoalAllocations[acc.id] || 0,
					in: snap.accountFlows[acc.id].in,
					out: snap.accountFlows[acc.id].out
				}));

				return {
					id: acc.id,
					type: "account",
					position: { x: 350, y: mainNodesY[acc.id] },
					data: {
						id: acc.id,
						name: acc.name,
						balance: adjustedStartBalance,
						originalBalance: acc.balance,
						forecastBalance: finalSnapshot ? finalSnapshot.accountBalances[acc.id] : acc.balance,
						realForecastBalance: finalSnapshot ? finalSnapshot.realAccountBalances[acc.id] : acc.balance,
						interestEarned: finalSnapshot ? finalSnapshot.accountInterestEarned[acc.id] : 0,
						inflationDrag: finalSnapshot ? finalSnapshot.inflationDrag[acc.id] : 0,
						forecastMonths,
						accountType: acc.type,
						apy: acc.apy,
						history,
						isDeposited
					}
				};
			}),
			...insurances.map((ins) => {
				const isCovered = finalSnapshot ? (finalSnapshot.insuranceCoverage[ins.id] ?? false) : false;
				const directFunding = transferRules
					.filter((r) => r.destinationId === ins.id)
					.reduce((s, r) => {
						if (r.type === "fixed") return s + r.amount;
						const src = accounts.find((a) => a.id === r.sourceId);
						return s + (src ? Math.max(0, src.balance) * (r.amount / 100) : 0);
					}, 0);
				const incomeFunding = incomes
					.flatMap((i) => {
						const { netAmount } = calculateIncomeTaxes(i.amount, i.taxRate, i.taxDeductions);
						return (i.routings || []).map((r) => ({ netAmount, r }));
					})
					.filter(({ r }) => r.destinationId === ins.id)
					.reduce((s, { netAmount, r }) => s + (r.type === "fixed" ? r.amount : netAmount * (r.amount / 100)), 0);

				return {
					id: ins.id,
					type: "insurance",
					position: { x: 350, y: mainNodesY[ins.id] },
					data: {
						id: ins.id,
						name: ins.name,
						premium: ins.premium,
						deductible: ins.deductible,
						isCovered,
						fundedAmount: directFunding + incomeFunding,
						coveredExpenseIds: ins.coveredExpenseIds
					}
				};
			}),
			...cards.map((card) => {
				const snap = snappedMap[card.id];
				return {
					id: card.id,
					type: "card",
					parentId: snap?.parentId,
					zIndex: snap?.zIndex,
					position: snap ? { x: 0, y: accountHeight + snap.stackIndex * childHeight } : { x: 350, y: mainNodesY[card.id] },
					data: {
						id: card.id,
						name: card.name,
						type: card.type,
						forecastBalance: finalSnapshot ? finalSnapshot.cardBalances[card.id] : card.balance,
						interestPaid: finalSnapshot ? finalSnapshot.cardInterestPaid[card.id] : 0, // <-- Added
						apr: card.apr,
						isSnapped: !!snap
					}
				};
			}),
			...loans.map((loan) => ({
				id: loan.id,
				type: "loan",
				position: { x: 350, y: mainNodesY[loan.id] },
				data: {
					id: loan.id,
					name: loan.name,
					balance: loan.balance,
					apr: loan.apr,
					minimumPayment: loan.minimumPayment,
					forecastBalance: finalSnapshot ? finalSnapshot.loanBalances[loan.id] : loan.balance,
					interestPaid: finalSnapshot ? finalSnapshot.loanInterestPaid[loan.id] : 0 // <-- Added
				}
			})),
			...retirements.map((ret) => ({
				id: ret.id,
				type: "retirement",
				position: { x: 350, y: mainNodesY[ret.id] },
				data: {
					id: ret.id,
					name: ret.name,
					balance: ret.balance,
					expectedApy: ret.expectedApy,
					employerMatchPercent: ret.employerMatchPercent,
					forecastBalance: finalSnapshot ? finalSnapshot.retirementBalances[ret.id] : ret.balance,
					employerMatchTotal: finalSnapshot ? finalSnapshot.retirementEmployerMatch[ret.id] : 0 // <-- Added
				}
			})),
			...goals.map((goal, i) => {
				const snap = snappedMap[goal.id];
				return {
					id: goal.id,
					type: "goal",
					parentId: snap?.parentId,
					zIndex: snap?.zIndex,
					position: snap ? { x: 0, y: accountHeight + snap.stackIndex * childHeight } : { x: 650, y: 50 + i * 100 },
					data: {
						id: goal.id,
						name: goal.name,
						targetAmount: goal.targetAmount,
						targetMonths: goal.targetMonths,
						currentAmount: finalSnapshot ? finalSnapshot.goalProgress[goal.id] : 0,
						hitMonth: finalSnapshot ? finalSnapshot.goalHitMonths[goal.id] : undefined,
						isSnapped: !!snap
					}
				};
			}),
			...sortedExpenses.map((exp, i) => {
				const snap = snappedMap[exp.id];
				const isActiveThisMonth = finalSnapshot ? finalSnapshot.activeExpenses[exp.id] : true;
				return {
					id: exp.id,
					type: "expense",
					parentId: snap?.parentId,
					zIndex: snap?.zIndex,
					draggable: !isLockedExpense(exp.id, !!snap),
					position: snap ? { x: 0, y: accountHeight + snap.stackIndex * childHeight } : { x: 650, y: 50 + (goals.length + i) * 100 },
					data: {
						id: exp.id,
						name: exp.name,
						targetAmount: exp.defaultAmount !== undefined ? exp.defaultAmount : exp.amount,
						defaultAmount: exp.defaultAmount !== undefined ? exp.defaultAmount : exp.amount,
						maxAmount: exp.maxAmount !== undefined ? exp.maxAmount : (exp.defaultAmount !== undefined ? exp.defaultAmount : exp.amount) * 1.5,
						currentAmount: finalSnapshot ? finalSnapshot.expenseProgress[exp.id] : 0,
						isFixed: exp.isFixed,
						minValue: exp.minValue,
						frequency: exp.frequency,
						occurrenceMonth: exp.occurrenceMonth,
						isActiveThisMonth,
						isSnapped: !!snap,
						isLocked: isLockedExpense(exp.id, !!snap)
					}
				};
			})
		];

		setNodes((currentNodes) =>
			newNodes.map((newNode) => {
				const existing = currentNodes.find((n) => n.id === newNode.id);
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
								const p = currentNodes.find((n) => n.id === current.parentId);
								if (p) {
									absX += p.position.x;
									absY += p.position.y;
									current = p;
								} else break;
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
			})
		);

		const newEdges: Edge[] = [];
		incomes.forEach((inc) => {
			if (inc.routings) {
				const { netAmount } = calculateIncomeTaxes(inc.amount, inc.taxRate, inc.taxDeductions);
				let available = netAmount;
				let prevType = "fixed";

				inc.routings.forEach((route, idx) => {
					const isLast = idx === inc.routings!.length - 1;
					let edgeLabel = "";

					if (isLast && !route.isAuto) {
						let remainder = Math.max(0, available);
						if (inc.routings!.length === 1) {
							edgeLabel = "100%";
						} else if (prevType === "percentage") {
							let pct = (remainder / netAmount) * 100;
							edgeLabel = `${pct.toFixed(0)}%`;
						} else {
							edgeLabel = `$${remainder.toFixed(0)}`;
						}
					} else {
						prevType = route.type;
						let intended = route.type === "fixed" ? route.amount : netAmount * (route.amount / 100);
						edgeLabel = route.type === "percentage" ? `${route.amount}%` : `$${route.amount}`;
						if (route.isAuto) {
							edgeLabel = route.type === "percentage" ? `Auto (${route.amount}%)` : `Auto ($${route.amount})`;
						}
						available -= intended;
					}

					const edgeId = `inc|${inc.id}|${route.destinationId}`;
					const isSelected = selectedEdgeId === edgeId;
					newEdges.push({
						id: edgeId,
						source: inc.id,
						target: route.destinationId,
						animated: true,
						label: edgeLabel,
						interactionWidth: 30,
						style: { strokeWidth: isSelected ? 3 : 2, stroke: isSelected ? "#2563eb" : "#3b82f6", cursor: "pointer" },
						labelStyle: { cursor: "pointer", fontWeight: 700, fontSize: 11, fill: isSelected ? "#1d4ed8" : "#2563eb" }
					});
				});
			}
		});

		transferRules.forEach((rule) => {
			if (!snappedMap[rule.destinationId]) {
				const isCash = accounts.find((a) => a.id === rule.sourceId)?.type === "cash";
				const isGoal = goals.some((g) => g.id === rule.destinationId);

				let edgeLabel = rule.type === "percentage" ? `${rule.amount}%` : `$${rule.amount}`;
				if (rule.isAuto) {
					edgeLabel = rule.type === "percentage" ? `Auto (${rule.amount}%)` : `Auto ($${rule.amount})`;
				}
				if (isCash) edgeLabel = "Deposit";
				if (isGoal) edgeLabel = "Monitors";

				const edgeId = `rule|${rule.id}`;
				const isSelected = selectedEdgeId === edgeId;
				newEdges.push({
					id: edgeId,
					source: rule.sourceId,
					target: rule.destinationId,
					animated: true,
					label: edgeLabel,
					interactionWidth: 30,
					style: { strokeWidth: isSelected ? 3 : 2, stroke: isSelected ? "#4f46e5" : "#6b7280", cursor: "pointer" },
					labelStyle: { cursor: "pointer", fontWeight: 700, fontSize: 11, fill: isSelected ? "#4338ca" : "#374151" }
				});
			}
		});

		setEdges(newEdges);
	}, [levelId, accounts, incomes, goals, expenses, cards, loans, retirements, insurances, inflationRate, transferRules, forecastMonths, snapTrigger, allowedActions, selectedEdgeId, setNodes, setEdges]);

	const onConnect = useCallback(
		(params: Connection) => {
			const { source, target } = params;
			const sourceNode = nodes.find((n) => n.id === source);
			const targetNode = nodes.find((n) => n.id === target);
			if (!sourceNode || !targetNode) return;

			const isValidTarget = ["account", "card", "goal", "expense", "insurance"].includes(targetNode.type || "");

			if (sourceNode.type === "card" && targetNode.type === "account") {
				const sourceCard = cards.find((c) => c.id === source);
				if (sourceCard?.type === "credit") return;
			}

			if (sourceNode.type === "income" && ["account", "card", "expense", "insurance"].includes(targetNode.type || "")) {
				const targetExpense = expenses.find((e) => e.id === target);
				const targetAcc = accounts.find((a) => a.id === target);
				const targetIns = insurances.find((i) => i.id === target);

				if (targetExpense) addIncomeRoute(source, target, targetExpense.defaultAmount !== undefined ? targetExpense.defaultAmount : targetExpense.amount, "fixed");
				else if (targetIns) addIncomeRoute(source, target, targetIns.premium, "fixed");
				else if (targetAcc?.type === "checking") {
					const currentInc = incomes.find((i) => i.id === source);
					const willBeSingle = (currentInc?.routings?.length || 0) === 0;
					addIncomeRoute(source, target, willBeSingle ? 100 : 0, willBeSingle ? "percentage" : "fixed", true);
				}
				else addIncomeRoute(source, target);
			} else if ((sourceNode.type === "account" || sourceNode.type === "card") && isValidTarget) {
				const sourceAcc = accounts.find((a) => a.id === source);
				const targetCard = cards.find((c) => c.id === target);
				const targetExpense = expenses.find((e) => e.id === target);
				const targetGoal = goals.find((g) => g.id === target);
				const targetIns = insurances.find((i) => i.id === target);
				const targetAcc = accounts.find((a) => a.id === target);

				if (sourceAcc?.type === "cash") addTransferRule(source, target, 100, "percentage");
				else if (targetCard && targetCard.type === "credit") addTransferRule(source, target, 100, "fixed");
				else if (targetExpense) addTransferRule(source, target, targetExpense.defaultAmount !== undefined ? targetExpense.defaultAmount : targetExpense.amount, "fixed");
				else if (targetIns) addTransferRule(source, target, targetIns.premium, "fixed");
				else if (targetGoal) addTransferRule(source, target, Math.min(100, targetGoal.targetAmount), "fixed");
				else if (targetAcc?.type === "checking") {
					const currentRules = transferRules.filter(
						(r) => r.sourceId === source && !goals.some((g) => g.id === r.destinationId)
					);
					const willBeSingle = currentRules.length === 0;
					addTransferRule(source, target, willBeSingle ? 100 : 0, willBeSingle ? "percentage" : "fixed", true);
				}
				else addTransferRule(source, target, 10, "percentage");
			}
		},
		[nodes, expenses, goals, accounts, cards, insurances, incomes, transferRules, addIncomeRoute, addTransferRule]
	);

	const onNodeDragStop = useCallback(
		(_event: any, node: Node) => {
			if (node.type !== "expense" && node.type !== "goal" && node.type !== "card") return;

			const intersections = getIntersectingNodes(node);

			let targetParentId: string | null = null;
			const directParent = intersections.find((n) => n.type === "account" || n.type === "card");

			if (directParent) {
				targetParentId = directParent.id;
			} else {
				const siblingNode = intersections.find((n) => n.parentId);
				if (siblingNode && siblingNode.parentId) {
					targetParentId = siblingNode.parentId;
				}
			}

			if (node.type === "card") {
				const cardData = cards.find((c) => c.id === node.id);
				if (cardData?.type === "debit") {
					if (targetParentId && node.parentId !== targetParentId) updateCardLink(node.id, targetParentId);
					else if (!targetParentId && node.parentId) updateCardLink(node.id, "");
					else if (targetParentId && node.parentId === targetParentId) setSnapTrigger((s) => s + 1); // NEW: Force snap-back
				}
				return;
			}

			if (targetParentId) {
				if (node.parentId === targetParentId) {
					setSnapTrigger((s) => s + 1);
					return;
				}

				if (node.type === "expense") {
					const expenseData = expenses.find((e) => e.id === node.id);
					const parentType = accounts.find((a) => a.id === targetParentId) ? "account" : "card";
					if (expenseData?.requiresCard && parentType === "account") {
						setSnapTrigger((s) => s + 1); // Force snap-back on rejection
						return;
					}
				}

				const existingRules = transferRules.filter((r) => r.destinationId === node.id);
				existingRules.forEach((r) => removeTransferRule(r.id));

				const foundExp = expenses.find((e) => e.id === node.id);
				const targetAmount =
					node.type === "expense"
						? (foundExp?.defaultAmount !== undefined ? foundExp.defaultAmount : foundExp?.amount)
						: goals.find((g) => g.id === node.id)?.targetAmount;
				addTransferRule(targetParentId, node.id, targetAmount ? Math.min(10000, targetAmount) : 100, "fixed");
			} else {
				if (node.parentId) {
					const existingRules = transferRules.filter((r) => r.destinationId === node.id);
					existingRules.forEach((r) => removeTransferRule(r.id));
				}
			}
		},
		[getIntersectingNodes, transferRules, expenses, goals, cards, accounts, removeTransferRule, addTransferRule, updateCardLink]
	);

	const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
		setSelectedEdgeId(edge.id);
	}, []);

	const onEdgesDelete = useCallback(
		(deletedEdges: Edge[]) => {
			deletedEdges.forEach((edge) => {
				if (edge.id.startsWith("inc|")) removeIncomeRoute(edge.id.split("|")[1], edge.id.split("|")[2]);
				else if (edge.id.startsWith("rule|")) removeTransferRule(edge.id.split("|")[1]);
				if (edge.id === selectedEdgeId) setSelectedEdgeId(null);
			});
		},
		[removeIncomeRoute, removeTransferRule, selectedEdgeId]
	);

	const onNodesDelete = useCallback(
		(deletedNodes: Node[]) => {
			deletedNodes.forEach((node) => {
				if (node.type === "account") removeAccount(node.id);
			});
		},
		[removeAccount]
	);

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onNodesDelete={onNodesDelete}
			onConnect={onConnect}
			onNodeDragStop={onNodeDragStop}
			onEdgeClick={onEdgeClick}
			onEdgesDelete={onEdgesDelete}
			deleteKeyCode={["Backspace", "Delete"]}
			nodeTypes={nodeTypes}
			fitView
			zIndexMode="manual"
			elevateNodesOnSelect={false}
		>
			<Controls />
			<MiniMap />
			<Background gap={12} size={1} />
			<CanvasControls />
			<OutputEditorPanel selectedEdgeId={selectedEdgeId} onClose={() => setSelectedEdgeId(null)} />
			<Panel position="bottom-left" className="bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs text-[11px] text-gray-600 flex items-center gap-1.5 select-none pointer-events-none mb-2 ml-2">
				<span>💡</span>
				<span>Click any connection line to edit outputs & priority</span>
			</Panel>
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
