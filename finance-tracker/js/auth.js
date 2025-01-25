// Auth state observer
let currentUser = null;

// Get current authenticated user
function getCurrentUser() {
    return currentUser || firebase.auth().currentUser;
}

// Update user profile UI
function updateUserProfile(user) {
    if (!user) return;

    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    if (userAvatar) {
        userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User');
        userAvatar.onerror = () => {
            userAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User');
        };
    }

    if (userName) userName.textContent = user.displayName || 'User';
    if (userEmail) userEmail.textContent = user.email;
}

// Helper function to handle auth result
async function handleAuthResult(result) {
    if (result.user) {
        currentUser = result.user;

        if (window.db) {
            await window.db.collection('users').doc(currentUser.uid).set({
                email: currentUser.email,
                lastLogin: new Date().toISOString(),
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        updateUserProfile(currentUser);
        showToast('Successfully signed in!');

        if (typeof window.loadUserData === 'function') {
            await window.loadUserData();
        }
    }
    toggleLoading(false);
}

// Handle redirect result
firebase.auth().getRedirectResult().then(async (result) => {
    console.log("Redirect result:", result); // Debugging
    if (result.user) {
        await handleAuthResult(result);
    }
}).catch((error) => {
    console.error("Redirect error:", error); // Debugging
    showToast(error.message, 'error');
    toggleLoading(false);
});

// Sign in with Google using redirect (NO POPUPS)
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        // Set persistence to LOCAL (optional but recommended)
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        // Use signInWithRedirect (NO POPUPS)
        await firebase.auth().signInWithRedirect(provider);
    } catch (error) {
        console.error("Error signing in:", error); // Debugging
        showToast(error.message || 'Error signing in. Please try again.', 'error');
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

        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';

        showToast('Successfully signed out!');
    } catch (error) {
        console.error("Error signing out:", error); // Debugging
        showToast('Error signing out. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/finance-tracker/service-worker.js', {
            scope: '/finance-tracker/'
        }).then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch((error) => {
            console.error('Service Worker registration failed:', error);
        });
    });
}

// Auth state change listener
firebase.auth().onAuthStateChanged(async (user) => {
    console.log("Auth state changed. User:", user); // Debugging
    currentUser = user;
    if (user) {
        try {
            // Update profile UI
            updateUserProfile(user);

            // Update user's last login time
            await window.db.collection('users').doc(user.uid).set({
                lastLogin: new Date().toISOString(),
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            }, { merge: true });

            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';

            if (typeof window.loadUserData === 'function') {
                await window.loadUserData();
            }
        } catch (error) {
            console.error('Error in auth state change:', error); // Debugging
            showToast('Error updating user data', 'error');
        }
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    }
});

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;