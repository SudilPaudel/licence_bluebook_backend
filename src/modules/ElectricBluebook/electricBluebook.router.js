const auth = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');
const { bodyValidator } = require('../../middleware/validator.middleware');
const electricBluebookCtrl = require('./electricBluebook.controller');
const { electricBluebookCreateDTO } = require('./electricBluebook.dto');

const electricBluebookRoute = require('express').Router()


electricBluebookRoute.post('/', bodyValidator(electricBluebookCreateDTO), auth, electricBluebookCtrl.createBluebook);
electricBluebookRoute.get('/my-bluebooks', auth, electricBluebookCtrl.getMyBluebook)

// Download route must come before the general :id route
electricBluebookRoute.get('/:id/download', auth, electricBluebookCtrl.downloadBluebook )

// Admin routes
electricBluebookRoute.get('/admin/all', auth, allowRole('admin'), electricBluebookCtrl.getAllBluebooks)
electricBluebookRoute.get('/admin/pending', auth, allowRole('admin'), electricBluebookCtrl.getPendingBluebooks)
electricBluebookRoute.get('/admin/verified', auth, allowRole('admin'), electricBluebookCtrl.getVerifiedBluebooks)

// Only admins can verify bluebooks
electricBluebookRoute.put('/:id/verify', auth, allowRole('admin'), electricBluebookCtrl.verifyBluebook)
electricBluebookRoute.put('/:id/reject', auth, allowRole('admin'), electricBluebookCtrl.rejectBluebook)
electricBluebookRoute.put('/admin/:id', auth, allowRole('admin'), electricBluebookCtrl.updateBluebook)

// General routes - these must come last to avoid conflicts
electricBluebookRoute.get('/fetch/:id', auth, electricBluebookCtrl.fetchBluebookById )
electricBluebookRoute.get('/:id', auth, electricBluebookCtrl.fetchBluebookById )

module.exports = electricBluebookRoute