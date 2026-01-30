const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        min: 5,
        max: 200
    },
    content: {
        type: String,
        required: true,
        min: 10,
        max: 2000
    },
    image: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft'],
        default: 'draft'
    },
    priority: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    tags: [{
        type: String,
        trim: true
    }],
    publishedAt: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    }
}, {
    timestamps: true,
    autoCreate: true,
    autoIndex: true
});

// Index for better query performance
NewsSchema.index({ status: 1, publishedAt: -1 });
NewsSchema.index({ priority: -1, createdAt: -1 });

const NewsModel = mongoose.model("News", NewsSchema);

module.exports = NewsModel; 