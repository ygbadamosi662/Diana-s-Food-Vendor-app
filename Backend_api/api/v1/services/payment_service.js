/**
 * Contains the PaymentService class
 * handles all payment operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { storage } = require('../models/engine/db_storage');
const { appAx } = require('../appAxios');
require('dotenv').config();

class PaymentService {
  constructor (){
    this.secret_key = process.env.APP_SECRET_KEY;
    this.acc_expires_in = 30;
  }

  async initiate_payment(payload, res, pwt_off=true) {
    try {
      if(!pwt_off) {
          return {
            acc_name: 'Test service',
            acc_number: '000000000000000',
            bank_name: 'Test Bank',
            amnt: 5000,
          };
      }
      let now = new Date();
      now.setMinutes(now.getMinutes() + this.acc_expires_in);

      const { response: { data, status } } = await appAx.post('https://api.paystack.co/charge', { 
        ...payload,
        bank_transfer: {
            account_expires_at: now.toISOString(),
          }
       });
      
      if (status !== 200) {
        return res
          .status(500)
          .json({
            msg: 'Something went wrong, charge attempt failed, please try again',
          });
      }

      if(!data.status) {
        return res
          .status(400)
          .json({
            msg: data.message,
          });
      }

      
      return {
        acc_name: data.data.account_name,
        acc_number: data.data.account_number,
        bank_name: data.data.bank.name,
        amnt: data.data.amount,
        from_payment_service: data,
      };
    } catch (error) {
      res
        .status(500)
        .json({
          msg: 'Something went wrong, charge attempt failed, please try again',
        })
      console.log(error);
    }
    
  }

}

const payment_service = new PaymentService();

module.exports = { payment_service };
