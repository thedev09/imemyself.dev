// Notifications Module - notifications.js

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    // Initialize notification system
    init() {
        // Create notification container if it doesn't exist
        this.container = document.getElementById('notification');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification';
            this.container.className = 'notification hidden';
            document.body.appendChild(this.container);
        }
    }

    // Show notification
    show(message, type = 'info', duration = 5000) {
        if (!this.container) this.init();

        // Clear any existing timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }

        // Set message and type
        this.container.textContent = message;
        this.container.className = `notification ${type}`;
        this.container.classList.remove('hidden');

        // Auto hide after duration
        if (duration > 0) {
            this.currentTimeout = setTimeout(() => {
                this.hide();
            }, duration);
        }

        // Add to notifications history
        this.notifications.push({
            message,
            type,
            timestamp: new Date(),
            id: Date.now()
        });

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(-50);
        }

        return this.notifications[this.notifications.length - 1].id;
    }

    // Hide notification
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
    }

    // Show success notification
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    // Show error notification
    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    // Show warning notification
    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    // Show info notification
    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    // Show loading notification
    loading(message) {
        return this.show(message, 'info', 0); // 0 duration = persistent
    }

    // Update existing notification
    update(id, message, type = null) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.message = message;
            if (type) notification.type = type;
            
            // Update display if this is the current notification
            if (this.container && !this.container.classList.contains('hidden')) {
                this.container.textContent = message;
                if (type) {
                    this.container.className = `notification ${type}`;
                }
            }
        }
    }

    // Clear all notifications
    clear() {
        this.hide();
        this.notifications = [];
    }

    // Get notification history
    getHistory() {
        return [...this.notifications];
    }

    // Show confirmation dialog
    confirm(message, onConfirm, onCancel = null) {
        const confirmed = window.confirm(message);
        if (confirmed && onConfirm) {
            onConfirm();
        } else if (!confirmed && onCancel) {
            onCancel();
        }
        return confirmed;
    }

    // Show prompt dialog
    prompt(message, defaultValue = '', onSubmit = null, onCancel = null) {
        const result = window.prompt(message, defaultValue);
        if (result !== null && onSubmit) {
            onSubmit(result);
        } else if (result === null && onCancel) {
            onCancel();
        }
        return result;
    }

    // Show custom confirmation with styled modal
    showCustomConfirm(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn-danger',
            onConfirm = null,
            onCancel = null
        } = options;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content compact">
                <h2>${title}</h2>
                <p style="margin: 20px 0; color: #ccc;">${message}</p>
                <div class="form-buttons">
                    <button type="button" class="btn btn-secondary cancel-btn">${cancelText}</button>
                    <button type="button" class="btn ${confirmClass} confirm-btn">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Handle confirm
        modal.querySelector('.confirm-btn').addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });

        // Handle cancel
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });

        // Handle click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        });

        return modal;
    }

    // Show custom prompt with styled modal
    showCustomPrompt(options = {}) {
        const {
            title = 'Enter Value',
            message = 'Please enter a value:',
            placeholder = '',
            defaultValue = '',
            inputType = 'text',
            confirmText = 'Submit',
            cancelText = 'Cancel',
            onSubmit = null,
            onCancel = null,
            validator = null
        } = options;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content compact">
                <h2>${title}</h2>
                <p style="margin: 20px 0; color: #ccc;">${message}</p>
                <div class="form-group">
                    <input type="${inputType}" class="prompt-input" placeholder="${placeholder}" value="${defaultValue}" style="width: 100%; padding: 12px; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 10px; background: rgba(255, 255, 255, 0.08); color: #fff; font-size: 0.9rem;">
                </div>
                <div class="error-message" style="display: none; color: #ff4757; margin: 10px 0; font-size: 0.8rem;"></div>
                <div class="form-buttons">
                    <button type="button" class="btn btn-secondary cancel-btn">${cancelText}</button>
                    <button type="button" class="btn btn-primary submit-btn">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        const input = modal.querySelector('.prompt-input');
        const errorDiv = modal.querySelector('.error-message');
        
        // Focus input
        setTimeout(() => input.focus(), 100);

        // Handle submit
        const handleSubmit = () => {
            const value = input.value.trim();
            
            if (validator) {
                const validation = validator(value);
                if (!validation.valid) {
                    errorDiv.textContent = validation.message;
                    errorDiv.style.display = 'block';
                    return;
                }
            }

            modal.remove();
            if (onSubmit) onSubmit(value);
        };

        modal.querySelector('.submit-btn').addEventListener('click', handleSubmit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });

        // Handle cancel
        const handleCancel = () => {
            modal.remove();
            if (onCancel) onCancel();
        };

        modal.querySelector('.cancel-btn').addEventListener('click', handleCancel);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Escape') handleCancel();
        });

        // Handle click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleCancel();
        });

        return modal;
    }

    // Show toast notification (bottom right corner)
    toast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);

        return toast;
    }

    // Get toast background color based on type
    getToastColor(type) {
        const colors = {
            success: 'linear-gradient(45deg, #2ed573 0%, #1e90ff 100%)',
            error: 'linear-gradient(45deg, #ff4757 0%, #ff3838 100%)',
            warning: 'linear-gradient(45deg, #ffa502 0%, #ff6348 100%)',
            info: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
        };
        return colors[type] || colors.info;
    }

    // Progress notification for long operations
    showProgress(message, initialProgress = 0) {
        const progressId = Date.now();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content compact" style="text-align: center;">
                <h2>Processing</h2>
                <p style="margin: 20px 0; color: #ccc;">${message}</p>
                <div class="progress-container" style="margin: 20px 0;">
                    <div class="progress-bar" style="height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
                        <div class="progress-fill" style="height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); width: ${initialProgress}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
                <div class="progress-text" style="color: #888; font-size: 0.9rem;">${initialProgress}%</div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        const progressFill = modal.querySelector('.progress-fill');
        const progressText = modal.querySelector('.progress-text');

        return {
            id: progressId,
            update: (progress, newMessage = null) => {
                if (progressFill) {
                    progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
                }
                if (progressText) {
                    progressText.textContent = `${Math.round(progress)}%`;
                }
                if (newMessage && modal.querySelector('p')) {
                    modal.querySelector('p').textContent = newMessage;
                }
            },
            complete: (successMessage = 'Operation completed successfully!') => {
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
                if (progressText) {
                    progressText.textContent = '100%';
                }
                setTimeout(() => {
                    modal.remove();
                    this.success(successMessage);
                }, 1000);
            },
            error: (errorMessage = 'Operation failed') => {
                modal.remove();
                this.error(errorMessage);
            },
            close: () => {
                modal.remove();
            }
        };
    }

    // Batch notification for multiple operations
    showBatch(operations = []) {
        const batchId = Date.now();
        let completed = 0;
        const total = operations.length;

        const progress = this.showProgress(`Processing ${total} operations...`, 0);

        const results = {
            success: [],
            errors: [],
            total,
            completed: 0
        };

        const updateProgress = () => {
            const percentage = (results.completed / total) * 100;
            progress.update(percentage, `Completed ${results.completed} of ${total} operations`);
            
            if (results.completed === total) {
                const successCount = results.success.length;
                const errorCount = results.errors.length;
                
                if (errorCount === 0) {
                    progress.complete(`All ${successCount} operations completed successfully!`);
                } else if (successCount === 0) {
                    progress.error(`All operations failed. ${errorCount} errors occurred.`);
                } else {
                    progress.close();
                    this.warning(`${successCount} operations succeeded, ${errorCount} failed.`);
                }
            }
        };

        return {
            id: batchId,
            success: (operation, result = null) => {
                results.success.push({ operation, result });
                results.completed++;
                updateProgress();
            },
            error: (operation, error = null) => {
                results.errors.push({ operation, error });
                results.completed++;
                updateProgress();
            },
            getResults: () => ({ ...results })
        };
    }
}

// Create and export singleton instance
const notifications = new NotificationManager();
export default notifications;