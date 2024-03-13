/**
 * Contains the PaymentService class
 * handles all payment operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { storage, Transaction } = require('../models/engine/db_storage');
const axios = require('axios');
const { Transaction_Status, Transaction_type} = require('../enum_ish');
require('dotenv').config();

class PaymentService {
  constructor (){
    this.secret_key = process.env.PAYSTACK_SECRET_KEY;
    this.acc_expires_in = 30;
    this.appAx = axios.create({
      baseURL: `http://127.0.0.1:${process.env.APP_PORT || 5000}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secret_key}`
      }
    });
  }

  async initiate_payment(payload, res, pwt_off=true) {
    const { user, email, amount } = payload;
    try {
      if(!pwt_off) {
          return {
            acc_name: 'Test service',
            acc_number: '000000000000000',
            bank_name: 'Test Bank',
            amnt: 5000,
          };
      }
      let expires = new Date();
      expires.setMinutes(expires.getMinutes() + this.acc_expires_in);

      const { data, status } = await this.appAx.post('https://api.paystack.co/charge', { 
        email: email ? email : user.email,
        amount: amount,
        bank_transfer: {
          "account_expires_at": expires.toISOString(),
        }
       });
      
       const { status: realStatus, data: realData } = data;
      if (status !== 200) {
        return res
          .status(500)
          .json({
            msg: 'Something went wrong, charge attempt failed, please try again',
          });
      }

      if(!realStatus) {
        return res
          .status(400)
          .json({
            msg: data.message,
          });
      }

      return realData;
    } catch (error) {
      res
        .status(500)
        .json({
          msg: 'Something went wrong, charge attempt failed, please try again',
        })
      console.log(error);
    }
    
  }

  async createTransaction(dataFromService, payload) {
    const { user, order, amount } = payload;
    const bank = {
      bank_name: dataFromService.bank.name,
      account_name: dataFromService.account_name,
      account_number: dataFromService.account_number,
    };

    const transaction = await Transaction.create({
      user: user._id,
      order: order._id,
      amount,
      credit_account: bank,
      debit_account: null,
      data_from_payment_service: dataFromService,
      status: Transaction_Status.initiated,
      type: Transaction_type.credit
    });
    
    return transaction;
  }

}

const payment_service = new PaymentService();

module.exports = { payment_service };
