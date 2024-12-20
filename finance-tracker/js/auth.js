// Auth state and user management
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

// Sign in with Google
async function signInWithGoogle() {
    toggleLoading(true);
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        currentUser = result.user;
        
        // Create or update user document
        await FirebaseService.setDocument('users', currentUser.uid, {
            email: currentUser.email,
            lastLogin: new Date().toISOString()
        });

        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        showToast('Successfully signed in!');
    } catch (error) {
        console.error("Error signing in:", error);
        showToast('Error signing in. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Sign out
async function signOut() {
    toggleLoading(true);
    try {
        await firebase.auth().signOut();
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        currentUser = null;
        showToast('Successfully signed out!');
    } catch (error) {
        console.error("Error signing out:", error);
        showToast('Error signing out. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Auth state change listener
firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        try {
            // Update user's last login time
            await FirebaseService.setDocument('users', user.uid, {
                lastLogin: new Date().toISOString()
            });

            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            
            // Load user data (function defined in app.js)
            if (window.loadUserData) {
                await window.loadUserData();
            }
        } catch (error) {
            console.error('Error in auth state change:', error);
            showToast('Error loading user data', 'error');
        }
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    }
});

// Export auth functions and state
window.auth = {
    currentUser: () => currentUser,
    signInWithGoogle,
    signOut,
    showToast,
    toggleLoading
};