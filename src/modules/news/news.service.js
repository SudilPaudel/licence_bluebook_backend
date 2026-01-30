const NewsModel = require('./news.model');

class NewsService {
    // Transforms request data for creating a news article: sets createdBy, handles status, image, tags, and priority.
    transformCreateData = (req) => {
        try {
            const payload = req.body;
            
            // Set createdBy to current user
            payload.createdBy = req.authUser._id;
            
            // If status is active, set publishedAt to current date
            if (payload.status === 'active' && !payload.publishedAt) {
                payload.publishedAt = new Date();
            }
            
            // Handle image upload
            if (req.file) {
                payload.image = req.file.filename;
            }
            
            // Parse tags if it's a JSON string
            if (payload.tags && typeof payload.tags === 'string') {
                try {
                    payload.tags = JSON.parse(payload.tags);
                } catch (error) {
                    payload.tags = [];
                }
            }
            
            // Convert priority to number if it's a string
            if (payload.priority && typeof payload.priority === 'string') {
                payload.priority = parseInt(payload.priority);
            }
            
            return payload;
        } catch (exception) {
            throw exception;
        }
    }

    // Transforms request data for updating a news article: sets updatedBy, handles status, image, tags, and priority.
    transformUpdateData = (req) => {
        try {
            const payload = req.body;
            
            // Set updatedBy to current user
            payload.updatedBy = req.authUser._id;
            
            // If status is being changed to active, set publishedAt
            if (payload.status === 'active' && !payload.publishedAt) {
                payload.publishedAt = new Date();
            }
            
            // Handle image upload
            if (req.file) {
                payload.image = req.file.filename;
            }
            
            // Parse tags if it's a JSON string
            if (payload.tags && typeof payload.tags === 'string') {
                try {
                    payload.tags = JSON.parse(payload.tags);
                } catch (error) {
                    payload.tags = [];
                }
            }
            
            // Convert priority to number if it's a string
            if (payload.priority && typeof payload.priority === 'string') {
                payload.priority = parseInt(payload.priority);
            }
            
            return payload;
        } catch (exception) {
            throw exception;
        }
    }

    // Creates a new news article in the database with the provided data.
    createNews = async (data) => {
        try {
            const news = new NewsModel(data);
            return await news.save();
        } catch (exception) {
            throw exception;
        }
    }

    // Finds a single news article based on the given filter and populates user info.
    findOneNews = async (filter) => {
        try {
            const newsObj = await NewsModel.findOne(filter)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');
            return newsObj;
        } catch (exception) {
            throw exception;
        }
    }

    // Finds multiple news articles with pagination, sorting, and populates user info.
    findManyNews = async (filter = {}, options = {}) => {
        try {
            const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
            
            const skip = (page - 1) * limit;
            
            const news = await NewsModel.find(filter)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit);
                
            const total = await NewsModel.countDocuments(filter);
            
            return {
                news,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (exception) {
            throw exception;
        }
    }

    // Updates a news article by ID with the provided data and populates user info.
    updateNews = async (data, newsId) => {
        try {
            const result = await NewsModel.findByIdAndUpdate(
                newsId, 
                { $set: data }, 
                { new: true, runValidators: true }
            ).populate('createdBy', 'name email')
             .populate('updatedBy', 'name email');
            return result;
        } catch (exception) {
            throw exception;
        }
    }

    // Deletes a news article from the database by its ID.
    deleteNews = async (newsId) => {
        try {
            const result = await NewsModel.findByIdAndDelete(newsId);
            return result;
        } catch (exception) {
            throw exception;
        }
    }

    // Retrieves a limited number of active news articles for public display, sorted by priority and published date.
    getActiveNews = async (limit = 5) => {
        try {
            const news = await NewsModel.find({ 
                status: 'active',
                publishedAt: { $lte: new Date() }
            })
            .sort({ priority: -1, publishedAt: -1 })
            .limit(limit)
            .populate('createdBy', 'name');
            
            return news;
        } catch (exception) {
            throw exception;
        }
    }
}

module.exports = new NewsService();