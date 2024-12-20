// auth.js
let currentUser = null;

function toggleLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

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

// Make this a global function
async function signInWithGoogle() {
    toggleLoading(true);
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        currentUser = result.user;
        
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        if (db) {
            await db.collection('users').doc(currentUser.uid).set({
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

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.showToast = showToast;
window.toggleLoading = toggleLoading;