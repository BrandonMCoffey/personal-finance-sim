## Required Engine Updates & New Logic Implementation

To fully support the 75-level curriculum and adhere to comprehensive financial literacy standards, the simulation engine requires the following specific updates to its validation and calculation logic.

### 1. The Debt Snowball Validation

**Trigger:** `winConditions.optimalDebtRouting: "snowball"`
**Functionality:** The Validation Engine must be updated to parse `"snowball"` alongside the existing `"avalanche"` parameter. When a player clicks "Submit Plan," the engine will verify that:

1. All `minimumPayment` thresholds for active loans and credit cards are met via incoming transfer rules.
2. 100% of the remaining surplus cash flow explicitly routed to debt is directed to the liability node with the **lowest numerical `balance**`, regardless of its `apr` value.

### 2. Inflation Mechanics

**Trigger:** `startingState.inflationRate: <Number>`
**Functionality:** If the `inflationRate` property (e.g., `5.0`) exists in the JSON, the forecast simulator must apply an annualized decay to the real purchasing power of uninvested capital.

1. During the month-by-month projection (`forecastMonths`), the engine calculates a monthly inflation drag `(inflationRate / 12)`.
2. This drag is subtracted from the real value of `cash` nodes and `checking` accounts earning 0% APY.
3. To successfully fund a `Goal` under these conditions, the player must route funds to a `brokerage` or `savings` account where the `apy` meets or exceeds the `inflationRate`.

### 3. Insurance Nodes and Risk Mitigation

**Trigger:** New Account/Expense Type: `Insurance`
**Functionality:** The engine needs a mechanic to simulate risk transfer.

1. An `Insurance` entity requires a `premium` (acting as a fixed monthly transfer rule requirement) and a `deductible` (a numeric cap).
2. If a player routes funds to cover the monthly `premium`, they receive policy coverage.
3. When a sudden expense strikes on an `occurrenceMonth` (e.g., a $2,000 medical bill), the engine checks for active coverage. If covered, the engine caps the financial impact on the player's accounts at the `deductible` amount (e.g., $500), rather than the full $2,000.

### 4. Granular Tax Structures

**Trigger:** `income.taxDeductions: Array`
**Functionality:** Replace the simple, flat `taxRate` integer on the `Income` node with an array of specific tax objects to teach progressive and regressive taxation.

1. Allow inputs such as `[{ name: "Social Security", rate: 6.2, limit: 168600 }, { name: "Federal", type: "bracket", brackets: [...] }]`.
2. The engine will calculate Net Pay by sequentially applying these deductions to the Gross Income before the remainder can be routed by the player.

---

## Leveraging Existing Logic for the New Curriculum

The newly generated JSON files immediately exploit the existing simulation mechanics to teach foundational financial principles.

- **Gross vs Net Pay & Cash Flow:** Levels utilize the `Income` node's existing `taxRate` and `routings` arrays. By forcing players to manipulate `"percentage"` and `"fixed"` transfer rules, they organically learn to build budgets based on net take-home pay rather than gross salary.

- **Flexible Budgeting (50/30/20 Rule):** The engine's `isFixed` boolean and `minValue` variables on `Expense` nodes act as the core teaching tool for variable budgeting. Players learn they cannot alter a fixed `Rent` payment, but they can and must adjust the percentage routing to their `minValue` on flexible `Groceries` or `Entertainment` to prevent overdrafts.

- **Sinking Funds & Goal Tracking:** Short-term savings and emergency funds rely on the `goals` array and `winConditions.goalsFundedWithinMonths`. The engine inherently evaluates if a player successfully routed enough monthly surplus into a designated `savings` node to hit a specific dollar amount before the simulation deadline.

- **Compound Interest & Exponential Growth:** The `apy` property on bank accounts and `expectedApy` on retirement and brokerage accounts naturally calculate compounding returns over the `forecastMonths` horizon. This visually demonstrates to the player why high-yield savings and 401ks outpace standard checking accounts over a 12-to-24 month period.

- **Debt Payoff Constraints:** The existing `minimumPayment` field on `loans` and minimums calculated via `apr` on `cards` enforce strict constraints. The player will instantly fail a level if they attempt an aggressive payoff strategy without first satisfying baseline mandatory minimums across all their liabilities.
