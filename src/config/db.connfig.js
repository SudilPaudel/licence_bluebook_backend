require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL, {
   dbName: process.env.MONGO_DB_NAME
})
.then(() => {
    console.log('✅ MongoDB connected successfully...');
})
.catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});
