// Authentication Module - auth.js
import { auth } from './firebase-config.js';
import { 
    signOut, 
    onAuthStateChanged,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';


class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateCallbacks = [];
    }

    // Initialize auth state listener
    init() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.authStateCallbacks.forEach(callback => callback(user));
        });
    }

    // Add auth state change callback
    onAuthStateChange(callback) {
        this.authStateCallbacks.push(callback);
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get user profile information
    getUserProfile() {
        if (!this.currentUser) return null;

        const providerData = this.currentUser.providerData;
        let authMethod = 'Unknown';
        let canChangePassword = false;
        
        if (providerData.length > 0) {
            const provider = providerData[0].providerId;
            switch (provider) {
                case 'password':
                    authMethod = 'Email & Password';
                    canChangePassword = true;
                    break;
                case 'google.com':
                    authMethod = 'Google Sign-In';
                    break;
                default:
                    authMethod = provider;
            }
        }

        return {
            email: this.currentUser.email,
            uid: this.currentUser.uid,
            authMethod,
            canChangePassword,
            creationTime: this.currentUser.metadata.creationTime,
            lastSignInTime: this.currentUser.metadata.lastSignInTime
        };
    }

    // Logout user
    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, error: 'No user logged in' };
        }

        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(this.currentUser.email, currentPassword);
            await reauthenticateWithCredential(this.currentUser, credential);
            
            // Update password
            await updatePassword(this.currentUser, newPassword);
            
            return { success: true };
        } catch (error) {
            console.error('Error changing password:', error);
            
            let errorMessage = 'Error changing password';
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'New password is too weak';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please log out and log back in, then try again';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    // Delete user account
    async deleteAccount() {
        if (!this.currentUser) {
            return { success: false, error: 'No user logged in' };
        }

        try {
            await deleteUser(this.currentUser);
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Error deleting account:', error);
            
            let errorMessage = 'Error deleting account';
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please log out and log back in, then try again';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    // Redirect to login if not authenticated
    requireAuth(redirectPath = 'pages/login.html') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    // Get user creation date formatted
    getFormattedCreationDate() {
        if (!this.currentUser || !this.currentUser.metadata.creationTime) {
            return 'Unknown';
        }

        const creationDate = new Date(this.currentUser.metadata.creationTime);
        return creationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Get last sign in date formatted
    getFormattedLastSignIn() {
        if (!this.currentUser || !this.currentUser.metadata.lastSignInTime) {
            return 'Unknown';
        }

        const lastSignIn = new Date(this.currentUser.metadata.lastSignInTime);
        return lastSignIn.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Create and export singleton instance
const authManager = new AuthManager();
export default authManager;
