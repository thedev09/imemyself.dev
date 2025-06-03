// Cascading Sequential Hedging Calculator - sequential-hedging.js
class CascadingHedgingCalculator {
    constructor() {
        this.results = {
            estimatedFundedAccounts: 0,
            estimatedFundedDrawdown: 0
        };
    }

    // Calculate the ultimate funded potential through cascading analysis
    calculateUltimateFundedPotential(accounts) {
        // Step 1: Get current active accounts by phase
        const currentP1Accounts = this.getActiveAccountsByPhase(accounts, 'Challenge Phase 1');
        const currentP2Accounts = this.getActiveAccountsByPhase(accounts, 'Challenge Phase 2');
        const currentFundedAccounts = this.getActiveAccountsByPhase(accounts, 'Funded');
        
        console.log(`Starting with: ${currentP1Accounts.length} P1, ${currentP2Accounts.length} P2, ${currentFundedAccounts.length} Funded accounts`);
        
        // Step 2: Calculate P1 → P2 potential
        const p1Results = this.calculatePhaseTransition(currentP1Accounts, 'phase1');
        console.log(`P1 → P2: ${p1Results.canPass} accounts can pass to P2`);
        
        // Step 3: Create hypothetical P2 pool (current P2 + successful P1 accounts)
        const hypotheticalP2Pool = this.createHypotheticalP2Pool(
            currentP2Accounts, 
            p1Results.passedAccounts
        );
        
        console.log(`Total hypothetical P2 pool: ${hypotheticalP2Pool.length} accounts`);
        console.log(`Existing P2 DD: ~${this.calculateExistingDrawdown(currentP2Accounts)}k`);
        console.log(`New promoted P1 DD: ~${this.calculatePromotedDrawdown(p1Results.passedAccounts)}k`);
        
        // Step 4: Calculate P2 → Funded potential from the combined pool
        const p2Results = this.calculatePhaseTransition(hypotheticalP2Pool, 'phase2');
        console.log(`P2 → Funded: ${p2Results.canPass} accounts can become funded`);
        
        // Step 5: Calculate total funded drawdown (current + estimated)
        const totalFundedDrawdown = this.calculateTotalFundedDrawdown(
            currentFundedAccounts, 
            p2Results.canPass
        );
        
        return {
            estimatedFundedAccounts: p2Results.canPass,
            estimatedFundedDrawdown: totalFundedDrawdown,
            breakdown: {
                currentP1: currentP1Accounts.length,
                currentP2: currentP2Accounts.length,
                currentFunded: currentFundedAccounts.length,
                p1CanPass: p1Results.canPass,
                totalP2Pool: hypotheticalP2Pool.length,
                finalFunded: p2Results.canPass,
                totalFundedAfter: currentFundedAccounts.length + p2Results.canPass
            }
        };
    }

    // Get active accounts by phase (not breached)
    getActiveAccountsByPhase(accounts, phase) {
        return accounts.filter(doc => {
            const account = doc.data();
            const currentPnL = account.currentBalance - account.accountSize;
            const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
            const isBreached = currentPnL < -maxDrawdownAmount;
            
            return account.phase === phase && 
                   account.status === 'active' && 
                   !isBreached;
        });
    }

    // Calculate phase transition (P1→P2 or P2→Funded)
    calculatePhaseTransition(accountDocs, phaseType) {
        if (accountDocs.length === 0) {
            return { canPass: 0, totalPool: 0, remainingPool: 0, passedAccounts: [] };
        }

        // Convert account docs to calculation format
        let totalPool = 0;
        const accountDetails = accountDocs.map(doc => {
            const account = doc.data();
            const breachThreshold = account.accountSize * (1 - (account.maxDrawdown / 100));
            const availableDrawdown = account.currentBalance - breachThreshold;
            
            // Determine target based on phase
            let targetNeeded;
            if (phaseType === 'phase1') {
                // P1 → P2 target
                const p1Target = account.profitTargetAmount || (account.accountSize * (account.profitTargetPercent / 100));
                targetNeeded = Math.max(0, p1Target - (account.currentBalance - account.accountSize));
            } else {
                // P2 → Funded target
                const p2Target = account.profitTargetAmount || (account.accountSize * (account.profitTargetPercent / 100));
                targetNeeded = Math.max(0, p2Target - (account.currentBalance - account.accountSize));
            }
            
            totalPool += availableDrawdown;
            
            return {
                id: doc.id || account.id,
                firmName: account.firmName,
                alias: account.alias,
                currentBalance: account.currentBalance,
                accountSize: account.accountSize,
                availableDrawdown: availableDrawdown,
                targetNeeded: targetNeeded,
                totalCost: availableDrawdown + targetNeeded,
                originalAccount: account
            };
        });

        // Sort by target requirement (easiest first)
        accountDetails.sort((a, b) => a.targetNeeded - b.targetNeeded);

        // Sequential allocation
        let remainingPool = totalPool;
        let accountsPassed = 0;
        const passedAccounts = [];

        for (const account of accountDetails) {
            if (remainingPool >= account.totalCost) {
                remainingPool -= account.totalCost;
                accountsPassed++;
                passedAccounts.push(account);
            }
        }

        return {
            canPass: accountsPassed,
            totalPool: totalPool,
            remainingPool: remainingPool,
            passedAccounts: passedAccounts
        };
    }

    // Create hypothetical P2 pool (existing P2 + promoted P1 accounts)
    createHypotheticalP2Pool(currentP2Accounts, promotedP1Accounts) {
        const hypotheticalPool = [];
        
        // Add existing P2 accounts
        currentP2Accounts.forEach(doc => {
            hypotheticalPool.push(doc);
        });
        
        // Add promoted P1 accounts (now at P2 with reset balances at account size)
        promotedP1Accounts.forEach(promotedAccount => {
            // Create a hypothetical P2 account from the promoted P1
            const newP2Account = {
                id: promotedAccount.id + '_promoted',
                data: () => ({
                    ...promotedAccount.originalAccount,
                    phase: 'Challenge Phase 2',
                    currentBalance: promotedAccount.accountSize, // Reset to account size
                    // P2 targets are typically lower (e.g., 5% instead of 8%)
                    profitTargetPercent: this.getP2TargetPercent(promotedAccount.originalAccount),
                    profitTargetAmount: promotedAccount.accountSize * (this.getP2TargetPercent(promotedAccount.originalAccount) / 100)
                })
            };
            hypotheticalPool.push(newP2Account);
        });
        
        return hypotheticalPool;
    }

    // Calculate existing P2 drawdown for debugging
    calculateExistingDrawdown(p2Accounts) {
        let totalDD = 0;
        p2Accounts.forEach(doc => {
            const account = doc.data();
            const breachThreshold = account.accountSize * (1 - (account.maxDrawdown / 100));
            const availableDrawdown = account.currentBalance - breachThreshold;
            totalDD += availableDrawdown;
        });
        return Math.round(totalDD / 1000); // Return in thousands
    }

    // Calculate promoted P1 drawdown for debugging
    calculatePromotedDrawdown(promotedAccounts) {
        let totalDD = 0;
        promotedAccounts.forEach(account => {
            // Reset balance = account size, so available DD = 10% of account size
            const availableDrawdown = account.accountSize * (account.originalAccount.maxDrawdown / 100);
            totalDD += availableDrawdown;
        });
        return Math.round(totalDD / 1000); // Return in thousands
    }

    // Calculate total funded drawdown (current funded + estimated new funded)
    calculateTotalFundedDrawdown(currentFundedAccounts, estimatedNewFunded) {
        // Calculate drawdown from current funded accounts
        let currentFundedDD = 0;
        currentFundedAccounts.forEach(doc => {
            const account = doc.data();
            const breachThreshold = account.accountSize * (1 - (account.maxDrawdown / 100));
            const availableDrawdown = account.currentBalance - breachThreshold;
            currentFundedDD += Math.max(0, availableDrawdown);
        });

        // Calculate drawdown from estimated new funded accounts (assume 100k each with 10% DD)
        const estimatedNewFundedDD = estimatedNewFunded * 10000; // 10k per 100k account

        return Math.round(currentFundedDD + estimatedNewFundedDD);
    }

    // Get P2 target percentage based on firm (typically lower than P1)
    getP2TargetPercent(account) {
        const firmTargets = {
            'FundingPips': 5,
            'The5%ers': 5,
            'Alpha Capital': 5,
            'FunderPro': 8,
            'ThinkCapital': 5,
            'BrightFunded': 5,
            'PipFarm': 6,
            'FundedNext': 5,
            'Instant Funding': 5
        };
        
        return firmTargets[account.firmName] || 5; // Default to 5% for P2
    }

    // Generate simple summary for dashboard
    generateDashboardSummary(accounts) {
        const results = this.calculateUltimateFundedPotential(accounts);
        
        return {
            estimatedFundedAccounts: results.estimatedFundedAccounts,
            estimatedFundedDrawdown: Math.round(results.estimatedFundedDrawdown),
            breakdown: results.breakdown
        };
    }

    // Debug logging
    logDetailedBreakdown(accounts) {
        const results = this.calculateUltimateFundedPotential(accounts);
        
        console.log('=== CASCADING HEDGING ANALYSIS ===');
        console.log(`Current P1 accounts: ${results.breakdown.currentP1}`);
        console.log(`Current P2 accounts: ${results.breakdown.currentP2}`);
        console.log(`Current Funded accounts: ${results.breakdown.currentFunded}`);
        console.log(`P1 accounts that can reach P2: ${results.breakdown.p1CanPass}`);
        console.log(`Total P2 pool size: ${results.breakdown.totalP2Pool}`);
        console.log(`NEW ESTIMATED FUNDED ACCOUNTS: ${results.estimatedFundedAccounts}`);
        console.log(`TOTAL FUNDED AFTER: ${results.breakdown.totalFundedAfter} (${results.breakdown.currentFunded} current + ${results.estimatedFundedAccounts} new)`);
        console.log(`TOTAL FUNDED DRAWDOWN AVAILABLE: ${results.estimatedFundedDrawdown.toLocaleString()}`);
        console.log('=====================================');
        
        return results;
    }
}

// Create and export singleton instance
const cascadingHedging = new CascadingHedgingCalculator();
export default cascadingHedging;