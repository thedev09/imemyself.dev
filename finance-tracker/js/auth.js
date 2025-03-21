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
        
        try {
            // First create/update the user document
            await db.collection('users')
                .doc(currentUser.uid)
                .set({
                    email: currentUser.email,
                    lastLogin: new Date().toISOString(),
                    displayName: currentUser.displayName || currentUser.email.split('@')[0],
                    photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}`,
                    updatedAt: new Date().toISOString(),
                    createdAt: isNewUser ? new Date().toISOString() : firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            // Update UI and show login success message
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            updateUserProfile(currentUser);
            showToast(isNewUser ? 'Account created successfully!' : 'Successfully signed in!');

            // Load user data after successful authentication
            if (typeof window.loadUserData === 'function') {
                await window.loadUserData(true);
            }
        } catch (error) {
            console.error('Error in handleAuthResult:', error);
            showToast('Error initializing user data. Please try again.', 'error');
        }
    }
    toggleLoading(false);
}


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
        if (isLoginMode) {
            // Sign In logic
            try {
                const result = await firebase.auth().signInWithEmailAndPassword(email, password);
                await handleAuthResult(result);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // Check if user exists with Google
                    const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
                    if (methods.includes('google.com')) {
                        showToast('Please sign in with Google for this email address.', 'error');
                    } else {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        } else {
            // Sign Up logic
            try {
                // First try to sign in with Google if account exists
                const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
                
                if (methods.includes('google.com')) {
                    const shouldLink = confirm('This email is already associated with a Google account. Do you want to link your password to it? You\'ll need to sign in with Google first.');
                    
                    if (shouldLink) {
                        // First sign in with Google
                        const googleProvider = new firebase.auth.GoogleAuthProvider();
                        googleProvider.setCustomParameters({
                            login_hint: email // Pre-fill the email
                        });
                        
                        try {
                            const googleResult = await firebase.auth().signInWithPopup(googleProvider);
                            
                            // Now link password auth
                            const credential = firebase.auth.EmailAuthProvider.credential(email, password);
                            await googleResult.user.linkWithCredential(credential);
                            
                            showToast('Successfully linked email/password to your Google account!');
                            await handleAuthResult(googleResult);
                            return;
                        } catch (linkError) {
                            if (linkError.code === 'auth/credential-already-in-use') {
                                showToast('This email is already registered. Please sign in instead.', 'error');
                            } else {
                                throw linkError;
                            }
                        }
                    } else {
                        showToast('Please use a different email or sign in with Google.', 'error');
                        return;
                    }
                } else {
                    // No existing account, create new one
                    const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
                    await handleAuthResult(result);
                }
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    showToast('This email is already registered. Please sign in instead.', 'error');
                } else {
                    throw error;
                }
            }
        }
        
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Auth error:', error);
        showToast(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const googleBtn = document.querySelector('.google-signin-btn');
    
    try {
        googleBtn.disabled = true;
        toggleLoading(true);
        
        const result = await firebase.auth().signInWithPopup(provider);
        await handleAuthResult(result);
    } catch (error) {
        console.error("Error signing in:", error);
        showToast(error.message || 'Error signing in. Please try again.', 'error');
        
        // If the error is due to permissions, show a more specific message
        if (error.code === 'permission-denied') {
            showToast('Access denied. Please try signing in again.', 'error');
        }
    } finally {
        googleBtn.disabled = false;
        toggleLoading(false);
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
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Update the auth state observer
firebase.auth().onAuthStateChanged(async (user) => {
    try {
        currentUser = user;
        const loginSection = document.getElementById('loginSection');
        const mainContent = document.getElementById('mainContent');
        
        if (user) {
            // User is signed in
            if (loginSection) loginSection.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            updateUserProfile(user);
            
            // Then load user data
            if (typeof window.loadUserData === 'function') {
                await window.loadUserData(true);
            }
        } else {
            // User is signed out
            if (loginSection) {
                loginSection.style.display = 'flex'; // Changed from 'block' to 'flex'
                loginSection.style.justifyContent = 'center';
                loginSection.style.alignItems = 'center';
            }
            if (mainContent) mainContent.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in auth state change:', error);
        showToast('Error loading user data. Please try signing in again.', 'error');
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