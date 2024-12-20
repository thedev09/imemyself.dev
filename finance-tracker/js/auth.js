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

// Load user data function (moved from app.js)
async function loadUserData() {
    if (!currentUser) return;
    console.log('Loading user data for:', currentUser.uid);

    try {
        // Load accounts
        const accountsSnapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('accounts')
            .get();
        
        state.accounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('Loaded accounts:', state.accounts);

        // Load transactions
        const transactionsSnapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .get();
        
        state.transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('Loaded transactions:', state.transactions);

        renderAccounts();
        renderTransactions();
        renderCharts();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please refresh the page.');
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