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

  async initiate_payment(payload, pwt_off=true) {
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
        return {
          msg: 'Something went wrong, charge attempt failed, please try again',
          data: null
        }
      }

      if(!realStatus) {
        return {
          msg: data.message,
          data: null
        }
      }

      return {
        data: realData
      };
    } catch (error) {
      throw error;
    }
    
  }

  async finalizePayment(transaction) {
    if(!transaction) {
      return null;
    }
    try {
      let { data_from_payment_service } = transaction;
      const { reference } = data_from_payment_service;
      const response = await this.appAx.get(`https://api.paystack.co/charge/${reference}`);
      
      const { data, status } = response;

      const { status: realStatus, data: realData } = data;
      if (status !== 200) {
        return {
          data: null,
          msg: 'Something went wrong, charge verification failed, please try again'
        };
      }

      if(!realStatus) {
        return {
          data: null,
          msg: data.message
        };
      }

      const { realDataStatus } = realData;
      if(realData.status === 'failed') {
        return {
          data: null,
          msg: realData.message
        };
      } else if(realData.status === 'pending') {
        transaction.status = Transaction_Status.pending;
        await transaction.save();
        
        return {
          data: null,
          msg: "Payment is still pending, please try again later"
        };
      } else if(realData.status === 'success') {
        return {
          data: realData
        };
      }
    } catch (error) {
      throw error;
    }
    
  }

  async createTransaction(dataFromService, payload) {
    try {
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
    } catch (error) {
      throw error;
    }
  }

}

const payment_service = new PaymentService();

module.exports = { payment_service };
