// Auth state observer
let currentUser = null;

// Show/hide loading overlay
function toggleLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Show toast messages
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Get current authenticated user
function getCurrentUser() {
    return currentUser || firebase.auth().currentUser;
}

// Sign in with Google
async function signInWithGoogle() {
    toggleLoading(true);
    try {
        // Set persistence to LOCAL
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        currentUser = result.user;
        
        // After successful sign-in, update user document
        if (window.db) {
            await window.db.collection('users').doc(currentUser.uid).set({
                email: currentUser.email,
                lastLogin: new Date().toISOString(),
                displayName: currentUser.displayName,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        localStorage.setItem('isAuthenticated', 'true');
        showToast('Successfully signed in!');
        
        // Load user data if function exists
        if (typeof window.loadUserData === 'function') {
            await window.loadUserData();
        }
    } catch (error) {
        console.error("Error signing in:", error);
        showToast(error.message || 'Error signing in. Please try again.', 'error');
        localStorage.removeItem('isAuthenticated');
    } finally {
        toggleLoading(false);
    }
}

// Sign out
async function signOut() {
    toggleLoading(true);
    try {
        // Update last logout time
        const user = getCurrentUser();
        if (user && window.db) {
            await window.db.collection('users').doc(user.uid).update({
                lastLogout: new Date().toISOString()
            });
        }

        await firebase.auth().signOut();
        currentUser = null;
        localStorage.removeItem('isAuthenticated');
        
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        
        showToast('Successfully signed out!');
    } catch (error) {
        console.error("Error signing out:", error);
        showToast('Error signing out. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Check authentication state on page load
function checkAuthState() {
    toggleLoading(true);
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (isAuthenticated === 'true') {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    }
    toggleLoading(false);
}

// Auth state change listener
firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        try {
            // Update user's last login time
            await window.db.collection('users').doc(user.uid).set({
                lastLogin: new Date().toISOString(),
                email: user.email,
                displayName: user.displayName
            }, { merge: true });

            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            localStorage.setItem('isAuthenticated', 'true');

            if (typeof window.loadUserData === 'function') {
                await window.loadUserData();
            }
        } catch (error) {
            console.error('Error in auth state change:', error);
            showToast('Error updating user data', 'error');
        }
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        localStorage.removeItem('isAuthenticated');
    }
});

// Initialize auth state check on page load
document.addEventListener('DOMContentLoaded', checkAuthState);

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.showToast = showToast;
window.toggleLoading = toggleLoading;
window.getCurrentUser = getCurrentUser;