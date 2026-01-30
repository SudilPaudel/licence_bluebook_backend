const auth = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');
const { setPath, uploader } = require('../../middleware/uploader.middleware');
const { bodyValidator } = require('../../middleware/validator.middleware');
const bluebookCtrl = require('./bluebook.controller');
const { bluebookCreateDTO } = require('./bluebook.dto');

const blueBookRoute = require('express').Router();

// Allow regular users to create bluebooks
blueBookRoute.post('/', bodyValidator(bluebookCreateDTO), auth, bluebookCtrl.createBluebook);
blueBookRoute.get('/my-bluebooks', auth, bluebookCtrl.getMyBluebook)

// Download route must come before the general :id route
blueBookRoute.get('/:id/download', auth, bluebookCtrl.downloadBluebook )

// Admin routes
blueBookRoute.get('/admin/all', auth, allowRole('admin'), bluebookCtrl.getAllBluebooks)
blueBookRoute.get('/admin/pending', auth, allowRole('admin'), bluebookCtrl.getPendingBluebooks)
blueBookRoute.get('/admin/verified', auth, allowRole('admin'), bluebookCtrl.getVerifiedBluebooks)

// Only admins can verify bluebooks
blueBookRoute.put('/:id/verify', auth, allowRole('admin'), bluebookCtrl.verifyBluebook)
blueBookRoute.put('/:id/reject', auth, allowRole('admin'), bluebookCtrl.rejectBluebook)
blueBookRoute.put('/admin/:id', auth, allowRole('admin'), bluebookCtrl.updateBluebook)
blueBookRoute.get('/fetch/:id', auth, bluebookCtrl.fetchBluebookById )

module.exports = blueBookRoute