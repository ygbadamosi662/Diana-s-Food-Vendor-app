const AppController = require("../controllers/AppController.js");
const express = require('express');

const generalRoutes = express.Router();

/**
 * Binds the routes to the appropriate handler in the
 * given Express application.
 * @param {Express} app The Express application.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

generalRoutes.get('/', AppController.home);
generalRoutes.post('/register', AppController.register_user);
generalRoutes.post('/login', AppController.login);
generalRoutes.post('/refresh-token', AppController.refreshToken);
generalRoutes.post('/forget-password', AppController.forget_pwd); // not tested properly nodemailer problem
generalRoutes.get('/forget-password/validate-token/:token', AppController.validate_reset_pwd_token);
generalRoutes.post('/forget-password/update', AppController.reset_password);


module.exports = { generalRoutes };
