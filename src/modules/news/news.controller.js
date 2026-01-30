const newsSvc = require('./news.service');

class NewsController {
    // Create new news article
    // Transforms request data, creates a news article, and returns the created article.
    createNews = async (req, res, next) => {
        try {
            const transformedData = newsSvc.transformCreateData(req);
            const news = await newsSvc.createNews(transformedData);
            
            res.status(201).json({
                result: news,
                message: "News article created successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    };

    // Get all news articles (admin)
    // Retrieves paginated news articles with optional status and search filters.
    getAllNews = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, status, search } = req.query;
            
            let filter = {};
            
            // Filter by status
            if (status && status !== 'all') {
                filter.status = status;
            }
            
            // Search functionality
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ];
            }
            
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sort: { createdAt: -1 }
            };
            
            const result = await newsSvc.findManyNews(filter, options);
            
            res.json({
                result: result.news,
                message: "News articles retrieved successfully",
                meta: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        } catch (exception) {
            next(exception);
        }
    };

    // Get single news article
    // Retrieves a single news article by its ID.
    getNewsById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const news = await newsSvc.findOneNews({ _id: id });
            
            if (!news) {
                throw { code: 404, message: "News article not found" };
            }
            
            res.json({
                result: news,
                message: "News article retrieved successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    };

    // Update news article
    // Updates a news article by ID with transformed request data.
    updateNews = async (req, res, next) => {
        try {
            const { id } = req.params;
            const transformedData = newsSvc.transformUpdateData(req);
            
            const news = await newsSvc.updateNews(transformedData, id);
            
            if (!news) {
                throw { code: 404, message: "News article not found" };
            }
            
            res.json({
                result: news,
                message: "News article updated successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    };

    // Delete news article
    // Deletes a news article by ID and returns a success message.
    deleteNews = async (req, res, next) => {
        try {
            const { id } = req.params;
            const news = await newsSvc.deleteNews(id);
            
            if (!news) {
                throw { code: 404, message: "News article not found" };
            }
            
            res.json({
                result: null,
                message: "News article deleted successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    };

    // Get active news for public display
    // Retrieves a limited number of active news articles for public view.
    getActiveNews = async (req, res, next) => {
        try {
            const { limit = 5 } = req.query;
            const news = await newsSvc.getActiveNews(parseInt(limit));
            
            res.json({
                result: news,
                message: "Active news retrieved successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    };

    // Update news status
    // Updates the status (active, inactive, draft) of a news article by ID.
    updateNewsStatus = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            if (!['active', 'inactive', 'draft'].includes(status)) {
                throw { code: 400, message: "Invalid status" };
            }
            
            const updateData = { status };
            if (status === 'active') {
                updateData.publishedAt = new Date();
            }
            
            const news = await newsSvc.updateNews(updateData, id);
            
            if (!news) {
                throw { code: 404, message: "News article not found" };
            }
            
            res.json({
                result: news,
                message: "News status updated successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    };
}

module.exports = new NewsController();