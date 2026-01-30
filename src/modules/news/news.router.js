const express = require('express');
const router = express.Router();
const newsCtrl = require('./news.controller');
const { newsCreateDTO, newsUpdateDTO } = require('./news.dto');
const { bodyValidator } = require('../../middleware/validator.middleware');
const auth = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');
const { uploader, setPath } = require('../../middleware/uploader.middleware');

// Public routes
router.get('/public/active', newsCtrl.getActiveNews);

// Admin routes (require authentication and admin role)
router.use(auth);
router.use(allowRole(['admin']));

// News management routes
router.post('/', 
    setPath('news'),
    uploader.single('image'), 
    bodyValidator(newsCreateDTO, ['image']), 
    newsCtrl.createNews
);

router.get('/', newsCtrl.getAllNews);

router.get('/:id', newsCtrl.getNewsById);

router.put('/:id', 
    setPath('news'),
    uploader.single('image'), 
    bodyValidator(newsUpdateDTO, ['image']), 
    newsCtrl.updateNews
);

router.delete('/:id', newsCtrl.deleteNews);

router.patch('/:id/status', newsCtrl.updateNewsStatus);

module.exports = router; 