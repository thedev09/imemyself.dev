const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const USD_TO_INR = 84.0;

// Daily scheduled function to create net worth snapshots
exports.createDailyNetWorthSnapshots = functions.pubsub
  .schedule("0 1 * * *") // Run at 1:00 AM daily
  .timeZone("Asia/Kolkata") // IST timezone
  .onRun(async (context) => {
    console.log("🔄 Starting daily net worth snapshot creation...");

    try {
      // Get all users who have accounts
      const usersSnapshot = await db.collectionGroup("accounts")
        .where("isDeleted", "==", false)
        .get();

      const userIds = [...new Set(usersSnapshot.docs.map((doc) =>
        doc.data().userId))];
      console.log(`📊 Found ${userIds.length} users with accounts`);

      const batch = db.batch();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      for (const userId of userIds) {
        // Get all active accounts for this user
        const accountsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("accounts")
          .where("isDeleted", "==", false)
          .get();

        if (accountsSnapshot.empty) {
          console.log(`⚠️ No accounts found for user ${userId}`);
          continue;
        }

        let totalNetWorth = 0;
        const accountBreakdown = {};

        // Calculate net worth
        accountsSnapshot.docs.forEach((accountDoc) => {
          const account = accountDoc.data();
          const balanceInINR = account.currency === "USD" ?
            account.balance * USD_TO_INR :
            account.balance;

          totalNetWorth += balanceInINR;

          accountBreakdown[accountDoc.id] = {
            balance: account.balance,
            currency: account.currency,
            accountName: account.name,
            balanceInINR: balanceInINR,
          };
        });

        // Create snapshot document
        const snapshotRef = db
          .collection("users")
          .doc(userId)
          .collection("netWorthSnapshots")
          .doc(today);

        batch.set(snapshotRef, {
          date: today,
          totalNetWorth: totalNetWorth,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userId: userId,
          accountBreakdown: accountBreakdown,
          createdBy: "daily-cron",
        });

        console.log(`💰 Prepared snapshot for user ${userId}: ` +
          `₹${totalNetWorth.toLocaleString()}`);
      }

      // Commit all snapshots
      await batch.commit();
      console.log("✅ Successfully created daily net worth snapshots");
    } catch (error) {
      console.error("❌ Error creating daily snapshots:", error);
      throw error;
    }
  });

// Function to create snapshot when account balance changes
exports.createSnapshotOnBalanceChange = functions.firestore
  .document("users/{userId}/accounts/{accountId}")
  .onUpdate(async (change, context) => {
    const {userId} = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only create snapshot if balance actually changed
    if (beforeData.balance === afterData.balance) {
      return null;
    }

    console.log(`💳 Balance changed for user ${userId}, creating snapshot...`);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Get all active accounts for this user
      const accountsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("accounts")
        .where("isDeleted", "==", false)
        .get();

      let totalNetWorth = 0;
      const accountBreakdown = {};

      accountsSnapshot.docs.forEach((accountDoc) => {
        const account = accountDoc.data();
        const balanceInINR = account.currency === "USD" ?
          account.balance * USD_TO_INR :
          account.balance;

        totalNetWorth += balanceInINR;

        accountBreakdown[accountDoc.id] = {
          balance: account.balance,
          currency: account.currency,
          accountName: account.name,
          balanceInINR: balanceInINR,
        };
      });

      // Update today's snapshot (or create if doesn't exist)
      const snapshotRef = db
        .collection("users")
        .doc(userId)
        .collection("netWorthSnapshots")
        .doc(today);

      await snapshotRef.set({
        date: today,
        totalNetWorth: totalNetWorth,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId,
        accountBreakdown: accountBreakdown,
        createdBy: "balance-change",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      console.log(`📈 Updated snapshot for user ${userId}: ` +
        `₹${totalNetWorth.toLocaleString()}`);
    } catch (error) {
      console.error("❌ Error creating snapshot on balance change:", error);
    }
  });

// Manual function to create snapshots on demand
exports.manualCreateSnapshot = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
      "User must be authenticated");
  }

  const userId = context.auth.uid;
  console.log(`🔧 Manual snapshot creation for user ${userId}`);

  try {
    const today = new Date().toISOString().split("T")[0];

    // Get user's accounts
    const accountsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("accounts")
      .where("isDeleted", "==", false)
      .get();

    if (accountsSnapshot.empty) {
      return {success: false, message: "No accounts found"};
    }

    let totalNetWorth = 0;
    const accountBreakdown = {};

    accountsSnapshot.docs.forEach((accountDoc) => {
      const account = accountDoc.data();
      const balanceInINR = account.currency === "USD" ?
        account.balance * USD_TO_INR :
        account.balance;

      totalNetWorth += balanceInINR;

      accountBreakdown[accountDoc.id] = {
        balance: account.balance,
        currency: account.currency,
        accountName: account.name,
        balanceInINR: balanceInINR,
      };
    });

    // Create snapshot
    const snapshotRef = db
      .collection("users")
      .doc(userId)
      .collection("netWorthSnapshots")
      .doc(today);

    await snapshotRef.set({
      date: today,
      totalNetWorth: totalNetWorth,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: userId,
      accountBreakdown: accountBreakdown,
      createdBy: "manual",
    }, {merge: true});

    return {
      success: true,
      message: `Snapshot created for ${today}`,
      netWorth: totalNetWorth,
      accounts: Object.keys(accountBreakdown).length,
    };
  } catch (error) {
    console.error("❌ Error in manual snapshot creation:", error);
    throw new functions.https.HttpsError("internal",
      "Failed to create snapshot");
  }
});