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

// Sign in with Google
window.signInWithGoogle = async function() {
    toggleLoading(true);
    try {
        // Make sure Firebase is initialized
        if (!firebase.apps.length) {
            throw new Error('Firebase is not initialized');
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        currentUser = result.user;
        
        // After successful sign-in
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        // Create/update user document in Firestore
        if (window.db) {
            await window.db.collection('users').doc(currentUser.uid).set({
                email: currentUser.email,
                lastLogin: new Date().toISOString()
            }, { merge: true });
        }

        showToast('Successfully signed in!');
    } catch (error) {
        console.error("Error signing in:", error);
        showToast(error.message || 'Error signing in. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Sign out
window.signOut = async function() {
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
document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            if (typeof loadUserData === 'function') {
                loadUserData();
            }
        } else {
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('mainContent').style.display = 'none';
        }
    });
});