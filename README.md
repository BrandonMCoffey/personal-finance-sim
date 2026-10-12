# Personal Finance Simulator 💸

An interactive, node-based personal finance simulator and educational strategy game built with **React**, **TypeScript**, **@xyflow/react**, and **Tailwind CSS**.

Players learn and practice real-world financial literacy principles by engineering automated cash flow systems—connecting income streams, bank accounts, credit cards, loans, investments, insurance policies, and living expenses on an interactive visual canvas.

---

## 🌟 Key Features & Game Modes

### 1. Interactive Flow Sandbox
- **Node-Based Cash Flow Graph:** Model money flow dynamically using nodes and animated transfer rules.
- **Node Types:**
  - **Incomes:** Gross income with realistic federal/state tax deduction brackets and automated take-home routing.
  - **Accounts:** Physical Cash, Checking, High-Yield Savings (APY), CDs, and Brokerage accounts.
  - **Debt Liabilities:** Credit Cards (APR, credit limits, minimum payments) and Fixed Loans (Car, Student, Mortgage).
  - **Goals:** Short-term and long-term milestones (Emergency Fund, Down Payment, Vacation, etc.) with inflation-drag detection.
  - **Living Expenses:** Fixed mandatory obligations (Rent, Utilities) and discretionary variable budgets (Groceries, Dining, Entertainment).
  - **Retirement & Protection:** 401(k) with company match mechanics, Roth IRA, and Insurance policies (premiums & deductibles).
- **Interactive Wire Connectors:** Drag between node ports, configure fixed-dollar ($) or percentage (%) routings, and inspect real-time monthly flow summaries.

### 2. Multi-Mode Educational Campaign
- **Category Levels:** Over 30 structured pedagogical challenges spanning:
  - **Budgeting:** 50/30/20 rule, pay-yourself-first, cash-to-checking deposits, living expense coverage.
  - **Debt Management:** Avalanche method (highest APR first) vs. Snowball method (lowest balance first), avoiding minimum-payment interest traps.
  - **Saving & Investing:** Beating inflation with high-yield yields, compounding returns, dollar-cost averaging.
  - **Insurance & Protection:** Emergency fund buffers, health/auto/renters deductibles vs. catastrophic out-of-pocket shocks.
- **Financial Advisor Story Mode:** Step into the shoes of a fiduciary advisor guiding diverse clients through dynamic multi-year life stages (e.g., college graduates, young families, mid-career career switchers).
- **Endless Simulation Mode:** Sandbox mode with dynamic monthly life events (market downturns, car repairs, salary bonuses, medical emergencies).

---

## 🧮 Simulation & Validation Mechanics

The simulation runs deterministic, monthly discrete-time simulations through two core engines:

### Forecast Engine (`src/engines/forecast.ts`)
1. **Net Income Routing:** Calculates net take-home pay after progressive taxes; percentage splits execute against actual available net income.
2. **Account Sweep:** Physical cash accounts automatically sweep into designated bank accounts to simulate cash deposits.
3. **Debt Payoff Capping:** Debt payments are capped at the remaining owed balance, accurately amortizing principal and interest without draining accounts or driving loan balances negative.
4. **401(k) Match:** Automatically awards employer matching dollars ("free money") when retirement contributions meet company criteria.
5. **Inflation Tracking:** Accounts for purchasing power erosion against target savings goals over multi-year horizons.

### Validation Engine (`src/engines/validation.ts`)
- **Solvency & Overdraft Protection:** Detects if any bank account drops negative ($\le -\$0.01$) over the forecast period, providing instant feedback to replace fixed outflows with percentage-based rules.
- **Mandatory Expense Solvency:** Ensures 100% funding for essential living costs before certifying a financial plan.
- **Debt Optimization Verification:** Enforces strict execution of Avalanche or Snowball prioritization rules and verifies target payoff balances.
- **Retirement & Insurance Checkpoints:** Audits employer-match capture and emergency-fund liquidity ratios.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **npm** (v9+)

### Installation
```bash
git clone https://github.com/your-username/personal-finance-sim.git
cd personal-finance-sim
npm install
```

### Development
Start the local Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```

### Running Tests
Execute the unit test suite powered by [Vitest](https://vitest.dev/):
```bash
npm run test
```

### Linting
Run static analysis via [Oxlint](https://oxc.rs/):
```bash
npm run lint
```

### Production Build
Type-check with TypeScript and build the minified production bundle:
```bash
npm run build
```

---

## 📂 Project Architecture

```
src/
├── components/
│   ├── canvas/          # FlowSandbox canvas, custom nodes, edge renderers
│   ├── layout/          # TopBar, InputPanel, ForecastPanel, TimelineManager
│   ├── modals/          # PlanEvaluationModal, ClientProfileModal, GoalManager
│   └── screens/         # MainMenu, LevelSelect, StoryScreen, EndlessScreen
├── data/
│   ├── levels/          # Level definitions (budgeting, debt, investing, protecting)
│   └── stories/         # Narrative story arcs, clients, and dialogue trees
├── engines/
│   ├── forecast.ts      # Multi-period monthly cash flow & balance projection
│   ├── validation.ts    # Scoring rubrics, constraint solver, educational feedback
│   ├── storyEngine.ts   # Client progression and advice session state
│   ├── lifeEventEngine.ts # Stochastic and scripted life event generator
│   └── __tests__/       # Vitest unit test suites
├── store/
│   ├── financeStore.ts  # Central Zustand store for accounts, nodes, and rules
│   └── storyStore.ts    # Zustand store for campaign & narrative progression
└── types/               # TypeScript interfaces for nodes, rules, and levels
```

---

## 📄 License
MIT
