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
userRoutes.post('/delete_or_deactivate', UserController.delete_or_deactivate_account);
userRoutes.post('/reactivate', UserController.reactivate_account);
userRoutes.post('/address/create', UserController.create_address);
userRoutes.post('/foods', UserController.get_foods);
userRoutes.get('/food/get/:id', UserController.get_food);
userRoutes.post('/food/reviews', UserController.get_food_reviews);
userRoutes.post('/food/fave-or-not', UserController.fave_food_or_not);
userRoutes.post('/food/review', UserController.review_food);
userRoutes.get('/review/:id', UserController.get_review);
userRoutes.get('/review/delete/:id', UserController.delete_my_review);
userRoutes.post('/notification/notifications', UserController.get_my_notifications);
userRoutes.post('/notification/read-notification/:id', UserController.read_my_notification);
userRoutes.get('/notification/:id', UserController.get_my_notification);
userRoutes.post('/food/cart/add', UserController.add_to_cart);
userRoutes.post('/transactions', UserController.get_my_transactions);
userRoutes.post('/transaction/:id', UserController.get_my_transaction);
userRoutes.post('/shipemnts', UserController.get_my_shipments);
userRoutes.post('/shipemnt/:id', UserController.get_my_shipment);
userRoutes.post('/addresses', UserController.get_my_addresses);
userRoutes.post('/address/:id', UserController.get_my_address);
userRoutes.post('/orders', UserController.get_my_orders);
userRoutes.post('/order/:id', UserController.get_my_order);
userRoutes.get('/pwt/test', UserController.test_pwt);



module.exports = { userRoutes };
