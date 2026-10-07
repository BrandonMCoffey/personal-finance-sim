Each Level is defined by a single JSON file. By dropping a properly formatted JSON file into a category subfolder, it is automatically parsed, given an ID matching its filename, and injected into the Level Select menu.

## Directory Structure

Levels must be placed in a subfolder matching a valid Category ID defined in registry.ts.

src/data/levels/

- registry.ts
- foundations/
  - foundations1.json
  - foundations2.json
- debt/
  - debt1.json

## JSON Schema Documentation

### 1. Top-Level Metadata

Defines how the level appears in the menu and controls global simulation variables.

- title (String): The display title shown in the Level Select menu.
- desc (String): A brief summary of the scenario's objective.
- subCategoryIndex (Number): The index matching the ordered subCategories array in registry.ts (e.g. 0 for the first subcategory).
- forecastMonths (Number): How many months the simulation projects into the future (e.g., 6 or 12).
- hints (Array): Optional. Sequential hints the player can reveal in the Input Panel.

### 2. Client Configuration (client)

Defines the narrative presentation in the left-hand Input Panel.

- name (String): The client's display name.
- description (String): Background context outlining the client's financial situation.
- prompt (String): A first-person quote describing their immediate problem.
- portraitId (String): Reference ID for the avatar asset.

### 3. Starting State (startingState)

Populates the initial React Flow canvas. Every node requires a unique id.

- Accounts
  - Valid Types: "cash", "checking", "savings", "credit", "bank", "brokerage".
  - Example: { "id": "acc_01", "name": "Checking", "type": "checking", "balance": 1000, "apy": 0 }
- Income
  - Example: { "id": "inc_01", "name": "Salary", "amount": 4000, "taxRate": 20, "frequency": "monthly", "routings": [ { "destinationId": "acc_01", "amount": 100, "type": "percentage", "isAuto": false } ] }
- Expenses
  - Notes: Variable expenses must set "isFixed": false and provide a "minValue". "occurrenceMonth" makes an expense trigger only on a specific month (e.g., an emergency car repair).
  - Example: { "id": "exp_01", "name": "Groceries", "amount": 800, "isFixed": false, "minValue": 400, "requiresCard": true, "frequency": 1, "occurrenceMonth": 1 }
- Goals
  - Example: { "id": "goal_01", "name": "Vacation", "targetAmount": 2000, "targetMonths": 6 }
- Cards
  - Example: { "id": "card_01", "name": "Visa", "type": "credit", "linkedAccountId": "", "balance": 500, "limit": 5000, "apr": 24.99 }
- Loans
  - Example: { "id": "loan_01", "name": "Car Loan", "balance": 12000, "apr": 6.5, "minimumPayment": 300 }
- Retirement
  - Example: { "id": "ret_01", "name": "401k", "type": "401k", "balance": 0, "expectedApy": 7.0, "employerMatchPercent": 5.0 }
- Transfer Rules (Pre-existing node connections)
  - Example: { "id": "rule_01", "sourceId": "acc_01", "destinationId": "exp_01", "amount": 1200, "type": "fixed", "isAuto": false }

### 4. Allowed Actions (allowedActions)

Restricts what tools the player has access to in the top Canvas Control bar.

- canCreateAccounts (Boolean): Whether the player can spawn new nodes.
- canDeleteAccounts (Boolean): Whether the player can delete existing nodes.
- maxNewAccounts (Number): Limits the total number of new accounts that can be spawned.
- allowedAccountTypes (Array): Permitted account types (e.g., ["checking", "savings"]).
- allowedCardTypes (Array): Permitted card types (e.g., ["debit", "credit"]).

### 5. Win Conditions (winConditions)

Defines the parameters evaluated by the Validation Engine when the user clicks "Submit Plan".

- requiredAccounts (Array): Fails the level if these node types aren't present (e.g., ["savings"]).
- maxCashBalance (Number): Fails the level if unsecured "cash" node balances exceed this limit.
- goalsFundedWithinMonths (Object): Ensures the specific goal reaches its target amount before the deadline. Example: { "goalId": "goal_01", "months": 6 }.
- optimalDebtRouting (String): "avalanche" or "snowball". Analyzes edge weights to ensure the mathematically optimal debt-paydown strategy is followed.
