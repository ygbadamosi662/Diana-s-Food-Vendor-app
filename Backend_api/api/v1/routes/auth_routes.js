const AppController = require("../controllers/AppController.js");
// const UserController = require('../controllers/UserController.js');
const { userRoutes } = require('./user_routes.js');
const { adminRoutes } = require('./admin_routes.js');
const { authenticate_admin } = require('../mws.js')
const express = require('express');

const authRoutes = express.Router();

/**
 * Binds the routes to the appropriate handler in the
 * given Express application.
 * @param {Express} app The Express application.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
authRoutes.get('/logout', AppController.logout);

// mapped Routes
authRoutes.use('/users', userRoutes);
// adminRoutes.use('/admin', authenticate_admin, adminRoutes);
authRoutes.use('/admin', authenticate_admin);
authRoutes.use('/admin', adminRoutes);



module.exports = { authRoutes };
