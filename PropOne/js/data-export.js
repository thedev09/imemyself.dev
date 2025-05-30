// Data Export Module - data-export.js

class DataExporter {
    constructor() {
        this.version = '1.0';
    }

    // Export data to JSON
    exportToJSON(data, filename = null) {
        const exportData = {
            exportInfo: {
                exportDate: new Date().toISOString(),
                version: this.version,
                ...data.exportInfo
            },
            ...data
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        if (!filename) {
            filename = `propone-backup-${new Date().toISOString().split('T')[0]}.json`;
        }
        
        this.downloadFile(blob, filename);
        return { success: true, filename };
    }

    // Export data to CSV
    exportToCSV(accounts, filename = null) {
        if (!accounts || accounts.length === 0) {
            return { success: false, error: 'No data to export' };
        }

        const headers = [
            'Firm Name',
            'Alias', 
            'Account Size',
            'Current Balance',
            'Phase',
            'Profit Target %',
            'Profit Target Amount',
            'Profit Share %',
            'Max Drawdown %',
            'Daily Drawdown %',
            'Platform',
            'Status',
            'Current P&L',
            'P&L %',
            'Created Date',
            'Updated Date'
        ];

        const csvRows = [headers.join(',')];

        accounts.forEach(account => {
            const currentPnL = account.currentBalance - account.accountSize;
            const pnlPercent = ((currentPnL / account.accountSize) * 100).toFixed(2);
            
            const row = [
                this.escapeCSV(account.firmName),
                this.escapeCSV(account.alias || ''),
                account.accountSize,
                account.currentBalance,
                this.escapeCSV(account.phase),
                account.profitTargetPercent || 0,
                account.profitTargetAmount || 0,
                account.profitShare || 0,
                account.maxDrawdown,
                account.dailyDrawdown,
                this.escapeCSV(account.platform),
                this.escapeCSV(account.status),
                currentPnL.toFixed(2),
                pnlPercent,
                this.formatDateForCSV(account.createdAt),
                this.formatDateForCSV(account.updatedAt)
            ];
            
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        if (!filename) {
            filename = `propone-accounts-${new Date().toISOString().split('T')[0]}.csv`;
        }
        
        this.downloadFile(blob, filename);
        return { success: true, filename };
    }

    // Export summary statistics to JSON
    exportSummaryStats(stats, filename = null) {
        const exportData = {
            exportInfo: {
                exportDate: new Date().toISOString(),
                type: 'summary_statistics',
                version: this.version
            },
            summaryStats: stats,
            generatedAt: new Date().toISOString()
        };

        if (!filename) {
            filename = `propone-summary-${new Date().toISOString().split('T')[0]}.json`;
        }

        return this.exportToJSON(exportData, filename);
    }

    // Import data from JSON
    async importFromJSON(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate import data structure
            if (!this.validateImportData(importData)) {
                throw new Error('Invalid backup file format');
            }

            return { success: true, data: importData };
        } catch (error) {
            console.error('Error importing JSON:', error);
            return { success: false, error: error.message };
        }
    }

    // Import data from CSV
    async importFromCSV(file) {
        try {
            const text = await file.text();
            const accounts = this.parseCSV(text);

            if (!accounts || accounts.length === 0) {
                throw new Error('No valid account data found in CSV');
            }

            return { success: true, accounts };
        } catch (error) {
            console.error('Error importing CSV:', error);
            return { success: false, error: error.message };
        }
    }

    // Validate import data structure
    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.accounts || !Array.isArray(data.accounts)) return false;
        if (!data.exportInfo || typeof data.exportInfo !== 'object') return false;
        
        // Check if accounts have required fields
        return data.accounts.every(account => 
            account.firmName && 
            typeof account.accountSize === 'number' && 
            typeof account.currentBalance === 'number' &&
            account.phase &&
            typeof account.maxDrawdown === 'number' &&
            typeof account.dailyDrawdown === 'number'
        );
    }

    // Parse CSV content
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const accounts = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;

            const account = {};
            headers.forEach((header, index) => {
                const value = values[index];
                
                switch (header) {
                    case 'Firm Name':
                        account.firmName = value;
                        break;
                    case 'Alias':
                        account.alias = value || null;
                        break;
                    case 'Account Size':
                        account.accountSize = parseFloat(value) || 0;
                        break;
                    case 'Current Balance':
                        account.currentBalance = parseFloat(value) || 0;
                        break;
                    case 'Phase':
                        account.phase = value;
                        break;
                    case 'Profit Target %':
                        account.profitTargetPercent = parseFloat(value) || 0;
                        break;
                    case 'Profit Target Amount':
                        account.profitTargetAmount = parseFloat(value) || 0;
                        break;
                    case 'Profit Share %':
                        account.profitShare = parseFloat(value) || 0;
                        break;
                    case 'Max Drawdown %':
                        account.maxDrawdown = parseFloat(value) || 0;
                        break;
                    case 'Daily Drawdown %':
                        account.dailyDrawdown = parseFloat(value) || 0;
                        break;
                    case 'Platform':
                        account.platform = value;
                        break;
                    case 'Status':
                        account.status = value || 'active';
                        break;
                }
            });

            // Validate required fields
            if (account.firmName && account.accountSize && account.currentBalance && account.phase) {
                accounts.push(account);
            }
        }

        return accounts;
    }

    // Parse a CSV line handling quoted values
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    // Escape CSV values
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    // Format date for CSV
    formatDateForCSV(date) {
        if (!date) return '';
        
        // Handle Firestore timestamp
        if (date.toDate && typeof date.toDate === 'function') {
            date = date.toDate();
        }
        
        // Handle ISO string
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (!(date instanceof Date) || isNaN(date)) return '';
        
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Download file
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Format bytes to human readable format
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Generate export summary
    generateExportSummary(accounts, userEmail) {
        const totalSize = accounts.length * 1024; // Rough estimate
        const phases = {};
        const firms = {};
        
        accounts.forEach(account => {
            phases[account.phase] = (phases[account.phase] || 0) + 1;
            firms[account.firmName] = (firms[account.firmName] || 0) + 1;
        });

        return {
            totalAccounts: accounts.length,
            estimatedSize: this.formatBytes(totalSize),
            userEmail,
            phaseBreakdown: phases,
            firmBreakdown: firms,
            exportDate: new Date().toISOString()
        };
    }
}

// Create and export singleton instance
const dataExporter = new DataExporter();
export default dataExporter;