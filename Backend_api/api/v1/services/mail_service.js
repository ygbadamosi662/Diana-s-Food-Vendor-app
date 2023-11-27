const nodemailer = require('nodemailer');
require('dotenv').config();
/**
 * Handles all mail operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

// console.log(process.env.APP_EMAIL, process.env.APP_PWD)
const Mail_sender = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PWD
  },
});


module.exports = { Mail_sender };
