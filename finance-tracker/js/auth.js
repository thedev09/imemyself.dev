// Auth state observer
let currentUser = null;
let isLoginMode = true;

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
        const isNewUser = result.additionalUserInfo?.isNewUser;
        
        if (window.db) {
            const userData = {
                email: currentUser.email,
                lastLogin: new Date().toISOString(),
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}`,
                updatedAt: new Date().toISOString()
            };
            
            if (isNewUser) {
                userData.createdAt = new Date().toISOString();
            }

            await window.db.collection('users').doc(currentUser.uid).set(userData, { merge: true });
        }

        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        updateUserProfile(currentUser);
        showToast(isNewUser ? 'Account created successfully!' : 'Successfully signed in!');
        
        if (typeof window.loadUserData === 'function') {
            await window.loadUserData();
        }
    }
    toggleLoading(false);
}

// Handle redirect result
firebase.auth().getRedirectResult().then(async (result) => {
    if (result.user) {
        await handleAuthResult(result);
    }
}).catch((error) => {
    console.error("Redirect error:", error);
    showToast(error.message, 'error');
    toggleLoading(false);
});

// Toggle between login and signup modes
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const form = document.getElementById('loginForm');
    const authSwitch = document.querySelector('.auth-switch');
    const submitButton = form.querySelector('button[type="submit"]');
    const formTitle = document.querySelector('.login-card h2');
    const formSubtitle = document.querySelector('.login-card p');
    
    if (isLoginMode) {
        submitButton.textContent = 'Sign In';
        formTitle.textContent = 'Welcome Back';
        formSubtitle.textContent = 'Sign in to continue your financial journey';
        authSwitch.innerHTML = 'Don\'t have an account? <button type="button" class="link-button" onclick="toggleAuthMode()">Sign Up</button>';
    } else {
        submitButton.textContent = 'Sign Up';
        formTitle.textContent = 'Create Account';
        formSubtitle.textContent = 'Start your financial journey with us';
        authSwitch.innerHTML = 'Already have an account? <button type="button" class="link-button" onclick="toggleAuthMode()">Sign In</button>';
    }
}

// Handle email/password authentication
async function handleEmailAuth(e) {
    e.preventDefault();
    toggleLoading(true);
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        let result;
        if (isLoginMode) {
            // Sign In
            result = await firebase.auth().signInWithEmailAndPassword(email, password);
        } else {
            // Sign Up
            result = await firebase.auth().createUserWithEmailAndPassword(email, password);
        }
        
        await handleAuthResult(result);
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Auth error:', error);
        showToast(error.message, 'error');
        toggleLoading(false);
    }
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await firebase.auth().signInWithRedirect(provider);
    } catch (error) {
        console.error("Error signing in:", error);
        showToast(error.message || 'Error signing in. Please try again.', 'error');
    }
}

// Reset password functionality
async function resetPassword(email) {
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showToast('Password reset email sent. Please check your inbox.', 'success');
    } catch (error) {
        console.error('Reset password error:', error);
        showToast(error.message, 'error');
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
        console.error("Error signing out:", error);
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
        });
    });
}

// Auth state change listener
firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        try {
            // Update profile UI
            updateUserProfile(user);
            
            // Update user's last login time
            await window.db.collection('users').doc(user.uid).set({
                lastLogin: new Date().toISOString(),
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`
            }, { merge: true });

            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';

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
    }
});

// Initialize auth-related event listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleEmailAuth);
    }

    // Initialize forgot password link
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            if (email) {
                await resetPassword(email);
            } else {
                showToast('Please enter your email address first', 'error');
            }
        });
    }
});

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.toggleAuthMode = toggleAuthMode;
window.resetPassword = resetPassword;