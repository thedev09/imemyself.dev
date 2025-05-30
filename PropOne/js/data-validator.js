// Data Validator Module - data-validator.js

class DataValidator {
    constructor() {
        this.rules = {
            required: (value) => value !== null && value !== undefined && value !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
            integer: (value) => Number.isInteger(Number(value)),
            positive: (value) => Number(value) > 0,
            nonNegative: (value) => Number(value) >= 0,
            percentage: (value) => Number(value) >= 0 && Number(value) <= 100,
            minLength: (min) => (value) => String(value).length >= min,
            maxLength: (max) => (value) => String(value).length <= max,
            min: (min) => (value) => Number(value) >= min,
            max: (max) => (value) => Number(value) <= max,
            range: (min, max) => (value) => Number(value) >= min && Number(value) <= max,
            oneOf: (options) => (value) => options.includes(value)
        };
    }

    // Validate account data
    validateAccount(accountData) {
        const errors = [];

        // Firm name validation
        if (!this.rules.required(accountData.firmName)) {
            errors.push('Firm name is required');
        } else if (!this.rules.minLength(1)(accountData.firmName)) {
            errors.push('Firm name must be at least 1 character');
        } else if (!this.rules.maxLength(50)(accountData.firmName)) {
            errors.push('Firm name must be less than 50 characters');
        }

        // Alias validation (optional)
        if (accountData.alias && !this.rules.maxLength(3)(accountData.alias)) {
            errors.push('Alias must be 3 characters or less');
        }

        // Account size validation
        if (!this.rules.required(accountData.accountSize)) {
            errors.push('Account size is required');
        } else if (!this.rules.number(accountData.accountSize)) {
            errors.push('Account size must be a valid number');
        } else if (!this.rules.positive(accountData.accountSize)) {
            errors.push('Account size must be positive');
        } else if (!this.rules.min(100)(accountData.accountSize)) {
            errors.push('Account size must be at least $100');
        } else if (!this.rules.max(10000000)(accountData.accountSize)) {
            errors.push('Account size cannot exceed $10,000,000');
        }

        // Current balance validation
        if (!this.rules.required(accountData.currentBalance)) {
            errors.push('Current balance is required');
        } else if (!this.rules.number(accountData.currentBalance)) {
            errors.push('Current balance must be a valid number');
        } else if (!this.rules.nonNegative(accountData.currentBalance)) {
            errors.push('Current balance cannot be negative');
        }

        // Phase validation
        const validPhases = ['Challenge Phase 1', 'Challenge Phase 2', 'Challenge Phase 3', 'Funded'];
        if (!this.rules.required(accountData.phase)) {
            errors.push('Phase is required');
        } else if (!this.rules.oneOf(validPhases)(accountData.phase)) {
            errors.push('Invalid phase selected');
        }

        // Profit target validation (for challenge phases)
        if (accountData.phase !== 'Funded') {
            if (!this.rules.required(accountData.profitTargetPercent)) {
                errors.push('Profit target percentage is required for challenge phases');
            } else if (!this.rules.number(accountData.profitTargetPercent)) {
                errors.push('Profit target percentage must be a valid number');
            } else if (!this.rules.range(0, 100)(accountData.profitTargetPercent)) {
                errors.push('Profit target percentage must be between 0 and 100');
            }
        }

        // Profit share validation (for funded accounts)
        if (accountData.phase === 'Funded') {
            if (!this.rules.required(accountData.profitShare)) {
                errors.push('Profit share is required for funded accounts');
            } else if (!this.rules.number(accountData.profitShare)) {
                errors.push('Profit share must be a valid number');
            } else if (!this.rules.range(0, 100)(accountData.profitShare)) {
                errors.push('Profit share must be between 0 and 100');
            }
        }

        // Max drawdown validation
        if (!this.rules.required(accountData.maxDrawdown)) {
            errors.push('Max drawdown is required');
        } else if (!this.rules.number(accountData.maxDrawdown)) {
            errors.push('Max drawdown must be a valid number');
        } else if (!this.rules.range(0, 100)(accountData.maxDrawdown)) {
            errors.push('Max drawdown must be between 0 and 100');
        }

        // Daily drawdown validation
        if (!this.rules.required(accountData.dailyDrawdown)) {
            errors.push('Daily drawdown is required');
        } else if (!this.rules.number(accountData.dailyDrawdown)) {
            errors.push('Daily drawdown must be a valid number');
        } else if (!this.rules.range(0, 100)(accountData.dailyDrawdown)) {
            errors.push('Daily drawdown must be between 0 and 100');
        }

        // Platform validation
        const validPlatforms = ['MT5', 'cTrader', 'TradeLocker', 'TradingView/ThinkTrader'];
        if (!this.rules.required(accountData.platform)) {
            errors.push('Platform is required');
        } else if (!this.rules.oneOf(validPlatforms)(accountData.platform)) {
            errors.push('Invalid platform selected');
        }

        // Logical validations
        if (accountData.dailyDrawdown && accountData.maxDrawdown && 
            Number(accountData.dailyDrawdown) > Number(accountData.maxDrawdown)) {
            errors.push('Daily drawdown cannot be higher than max drawdown');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validate user preferences
    validatePreferences(preferences) {
        const errors = [];

        // Default account size validation
        if (preferences.defaultAccountSize) {
            if (!this.rules.number(preferences.defaultAccountSize)) {
                errors.push('Default account size must be a valid number');
            } else if (!this.rules.positive(preferences.defaultAccountSize)) {
                errors.push('Default account size must be positive');
            }
        }

        // Currency display validation
        const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
        if (preferences.currencyDisplay && !this.rules.oneOf(validCurrencies)(preferences.currencyDisplay)) {
            errors.push('Invalid currency display option');
        }

        // Theme validation
        const validThemes = ['dark', 'light'];
        if (preferences.theme && !this.rules.oneOf(validThemes)(preferences.theme)) {
            errors.push('Invalid theme option');
        }

        // Notifications validation
        const validNotifications = ['all', 'important', 'none'];
        if (preferences.notifications && !this.rules.oneOf(validNotifications)(preferences.notifications)) {
            errors.push('Invalid notification option');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validate password
    validatePassword(password, confirmPassword = null) {
        const errors = [];

        if (!this.rules.required(password)) {
            errors.push('Password is required');
        } else {
            if (!this.rules.minLength(6)(password)) {
                errors.push('Password must be at least 6 characters long');
            }

            if (!this.rules.maxLength(128)(password)) {
                errors.push('Password must be less than 128 characters');
            }

            // Check for at least one letter and one number
            if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
                errors.push('Password must contain at least one letter and one number');
            }
        }

        // Confirm password validation
        if (confirmPassword !== null && password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        return {
            valid: errors.length === 0,
            errors,
            strength: this.getPasswordStrength(password)
        };
    }

    // Get password strength
    getPasswordStrength(password) {
        if (!password) return 'weak';

        let score = 0;
        
        // Length
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        
        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        
        // No common patterns
        if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
        if (!/123|abc|password|qwerty/i.test(password)) score += 1; // No common sequences

        if (score <= 3) return 'weak';
        if (score <= 5) return 'medium';
        if (score <= 7) return 'strong';
        return 'very strong';
    }

    // Validate email
    validateEmail(email) {
        const errors = [];

        if (!this.rules.required(email)) {
            errors.push('Email is required');
        } else if (!this.rules.email(email)) {
            errors.push('Please enter a valid email address');
        } else if (!this.rules.maxLength(254)(email)) {
            errors.push('Email address is too long');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validate import data
    validateImportData(data) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            errors.push('Invalid data format');
            return { valid: false, errors };
        }

        // Check for required structure
        if (!data.exportInfo) {
            errors.push('Missing export information');
        }

        if (!data.accounts || !Array.isArray(data.accounts)) {
            errors.push('Missing or invalid accounts data');
        } else {
            // Validate each account
            data.accounts.forEach((account, index) => {
                const validation = this.validateAccount(account);
                if (!validation.valid) {
                    errors.push(`Account ${index + 1}: ${validation.errors.join(', ')}`);
                }
            });
        }

        // Check version compatibility
        if (data.exportInfo && data.exportInfo.version) {
            const supportedVersions = ['1.0'];
            if (!supportedVersions.includes(data.exportInfo.version)) {
                errors.push(`Unsupported export version: ${data.exportInfo.version}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validate file upload
    validateFileUpload(file, options = {}) {
        const {
            maxSize = 10 * 1024 * 1024, // 10MB default
            allowedTypes = ['application/json'],
            allowedExtensions = ['.json']
        } = options;

        const errors = [];

        if (!file) {
            errors.push('No file selected');
            return { valid: false, errors };
        }

        // Check file size
        if (file.size > maxSize) {
            errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check file extension
        if (allowedExtensions.length > 0) {
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(extension)) {
                errors.push(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Generic field validation
    validateField(value, rules = []) {
        const errors = [];

        for (const rule of rules) {
            if (typeof rule === 'string' && this.rules[rule]) {
                if (!this.rules[rule](value)) {
                    errors.push(`Value fails ${rule} validation`);
                }
            } else if (typeof rule === 'object' && rule.rule && rule.message) {
                let ruleFunction = this.rules[rule.rule];
                if (rule.params) {
                    ruleFunction = this.rules[rule.rule](...rule.params);
                }
                if (!ruleFunction(value)) {
                    errors.push(rule.message);
                }
            } else if (typeof rule === 'function') {
                const result = rule(value);
                if (result !== true) {
                    errors.push(typeof result === 'string' ? result : 'Custom validation failed');
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Sanitize input
    sanitizeInput(input, type = 'string') {
        if (input === null || input === undefined) {
            return type === 'string' ? '' : null;
        }

        switch (type) {
            case 'string':
                return String(input).trim();
            case 'number':
                const num = parseFloat(input);
                return isNaN(num) ? 0 : num;
            case 'integer':
                const int = parseInt(input);
                return isNaN(int) ? 0 : int;
            case 'boolean':
                return Boolean(input);
            case 'email':
                return String(input).toLowerCase().trim();
            default:
                return input;
        }
    }
}

// Create and export singleton instance
const dataValidator = new DataValidator();
export default dataValidator;