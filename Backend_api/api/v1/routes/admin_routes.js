const UserController = require('../controllers/UserController.js');
const AdminController = require('../controllers/AdminController.js');
const { authenticate_super_admin } = require('../mws.js')
const express = require('express');
const adminRoutes = express.Router();
/**
 * Defines the routes particular to admins only
 * given Express application.
 * @param {Express} app The Express application.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

adminRoutes.post('/role/switcheroo', authenticate_super_admin, AdminController.role_switcheroo);
adminRoutes.post('/find/user', AdminController.find_user);
adminRoutes.post('/users', AdminController.get_users);
adminRoutes.post('/orders', AdminController.get_orders);
adminRoutes.post('/reviews', AdminController.get_reviews);
adminRoutes.post('/transactions', AdminController.get_transactions);
adminRoutes.post('/shipments', AdminController.get_transactions);
adminRoutes.post('/addresses', AdminController.get_addresses);
adminRoutes.post('/food/create', authenticate_super_admin, AdminController.create_food);
adminRoutes.post('/food/update', authenticate_super_admin, AdminController.update_food);
adminRoutes.post('/foods', AdminController.get_foods);
adminRoutes.post('/food/reviews', AdminController.get_reviews);
adminRoutes.post('/food/schedules/add', authenticate_super_admin, AdminController.add_schedule_to_food);
adminRoutes.get('/food/delete/:id', authenticate_super_admin, AdminController.delete_food);
adminRoutes.post('/ban/user', AdminController.ban_account);


module.exports = { adminRoutes };
