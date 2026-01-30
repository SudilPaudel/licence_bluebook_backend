const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupDatabase() {
    try {
        // Connect to MongoDB
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
        const dbName = process.env.MONGO_DB_NAME || 'bluebook_renewal';
        const fullUrl = `${mongoUrl}/${dbName}`;
        
        await mongoose.connect(fullUrl);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        
        // Clean up payments collection
        const paymentsCollection = db.collection('payments');
        
        // Count documents with null transactionId
        const nullCount = await paymentsCollection.countDocuments({ transactionId: null });
        console.log(`📊 Found ${nullCount} documents with null transactionId`);
        
        if (nullCount > 0) {
            // Delete all documents with null transactionId
            const result = await paymentsCollection.deleteMany({ transactionId: null });
            console.log(`🗑️  Deleted ${result.deletedCount} documents with null transactionId`);
        }
        
        // Drop problematic indexes
        try {
            await paymentsCollection.dropIndex('transactionId_1');
            console.log('✅ Dropped problematic transactionId_1 index');
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  Index transactionId_1 does not exist, skipping...');
            } else {
                console.log('⚠️  Error dropping index:', error.message);
            }
        }
        
        // Create new sparse index
        try {
            await paymentsCollection.createIndex(
                { transactionId: 1 }, 
                { 
                    unique: true, 
                    sparse: true
                }
            );
            console.log('✅ Created new sparse index for transactionId');
        } catch (error) {
            console.log('⚠️  Error creating new index:', error.message);
        }
        
        // Clean up users collection (remove any test users if needed)
        const usersCollection = db.collection('users');
        const userCount = await usersCollection.countDocuments();
        console.log(`👥 Found ${userCount} users in database`);
        
        console.log('✅ Database cleanup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning up database:', error.message);
        process.exit(1);
    }
}

cleanupDatabase(); 