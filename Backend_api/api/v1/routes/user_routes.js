const UserController = require('../controllers/UserController.js');
const express = require('express');
const userRoutes = express.Router();
/**
 * Binds the routes to the appropriate handler in the
 * given Express application.
 * @param {Express} app The Express application.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

userRoutes.get('/get/:id', UserController.get_user);
userRoutes.post('/update', UserController.update_user);
userRoutes.post('/food/get/foods', UserController.get_foods);
userRoutes.get('/food/get/:id', UserController.get_food);
userRoutes.post('/food/get/reviews', UserController.get_food_reviews);
userRoutes.post('/food/fave-or-not', UserController.fave_food_or_not);
userRoutes.post('/food/review', UserController.review_food);
userRoutes.get('/review/:id', UserController.get_review);
userRoutes.get('/review/delete/:id', UserController.delete_review);
userRoutes.post('/notification/notifications', UserController.get_notifications);
userRoutes.post('/notification/read-notifications', UserController.read_notifications);
userRoutes.get('/notification/:id', UserController.get_notification);
userRoutes.get('/pwt/test', UserController.test_pwt);



module.exports = { userRoutes };
