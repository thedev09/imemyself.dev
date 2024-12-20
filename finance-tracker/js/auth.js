// Auth state observer
let currentUser = null;

// Sign in with Google
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        currentUser = result.user;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        await loadUserData();
    } catch (error) {
        console.error("Error signing in:", error);
        alert('Error signing in. Please try again.');
    }
}

// Sign out
async function signOut() {
    try {
        await firebase.auth().signOut();
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        currentUser = null;
    } catch (error) {
        console.error("Error signing out:", error);
    }
}

// Auth state change listener
firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        loadUserData();
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    }
});