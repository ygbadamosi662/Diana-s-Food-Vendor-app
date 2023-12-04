const mongoose = require("mongoose");
const { userSchema } = require('../mongo_schemas/user');
const { foodSchema } = require('../mongo_schemas/food');
const { orderSchema } = require('../mongo_schemas/order');
const { transactionSchema } = require('../mongo_schemas/transaction');
const { notificationSchema } = require('../mongo_schemas/notification');
const { reviewSchema } = require('../mongo_schemas/review');
const { shipmentSchema } = require('../mongo_schemas/shipment');
const { addressSchema } = require('../mongo_schemas/address');
const { Collections } = require('../../enum_ish');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const db_name = process.env.DB;
const db_user = process.env.DB_USER;
const db_pwd = process.env.DB_PWD;
const db_host = process.env.DB_HOST;
const db_port = process.env.DB_PORT;

class DbStorage {
  constructor() {
    try {
      this._page_size = 20;
      // initializes a new DbStorage instance
      this._conn = mongoose
        .createConnection(`mongodb://${db_user}:${db_pwd}@${db_host}:${db_port}/${db_name}`, {minPoolSize: 2});
      this._conn.once('open', () => {
        console.log('Database connection successfull');
      });

      this._mongo_db = mongoose;
      this.mongo_repos = {};
      this._json_file = path.join(__dirname, 'blacklist.json');
    } catch (error) {
      console.log('Database connection failed');
      throw error;
    }

  }

  get mongo_db() {
    return this._mongo_db;
  }

  get page_size() {
    return this._page_size;
  }

  set mongo_db(value) {
    this._mongo_db = value;
  }

  get conn() {
    return this._conn;
  }

  get_a_repo (key) {
    if (key in this.mongo_repos) {
      return this.mongo_repos[key]; 
    }
    else {
      throw mongoose.Error(`${key} collection not in db`);
    }
  }

  async close_connection () {
    try {
      await this._conn.close()
      console.log('Database connection closed', new Date().getTime());
    } catch (error) {
      throw error;
    }
  }

  reload() {
    try {
      // set models
      const User = this._conn.model(Collections.User, userSchema);
      const Food = this._conn.model(Collections.Food, foodSchema);
      const Order = this._conn.model(Collections.Order, orderSchema);
      const Transaction = this._conn.model(Collections.Transaction, transactionSchema);
      const Review = this._conn.model(Collections.Review, reviewSchema);
      const Shipment = this._conn.model(Collections.Shipment, shipmentSchema);
      const Address = this._conn.model(Collections.Address, addressSchema);
      const Notification = this._conn.model(Collections.Notification, notificationSchema);

      // collect repos
      this.mongo_repos.User = User;
      this.mongo_repos.Food = Food;
      this.mongo_repos.Order = Order;
      this.mongo_repos.Transaction = Transaction;
      this.mongo_repos.Review = Review;
      this.mongo_repos.Shipment = Shipment;
      this.mongo_repos.Address = Address;
      this.mongo_repos.Notification = Notification;

    } catch (error) {
      throw error;
    }
  }

  async blacklist_jwt(jwtObj) {
    try {
      // Read data from blacklist.json
      const data = await fs.readFile(this._json_file, 'utf8');
      let jsonData;
      if (!data) {
        jsonData = {
          jwts: [],
        };
      } else {
        jsonData = JSON.parse(data);
      }
  
      jsonData.jwts.push(jwtObj);
  
      const updatedData = JSON.stringify(jsonData, null, 2);
  
      await fs.writeFile(this._json_file, updatedData, 'utf8');
  
      console.log('jwt blacklisted');
      
    } catch (error) {
      throw error;
    }
  }

  async get_jwt(token) {
    try {
      const jsonData = await fs.readFile(this._json_file, 'utf8');
      if (!jsonData) {
        return null;
      }
      const jwt = JSON.parse(jsonData).jwts.find((j) => j.token === token);
      return jwt;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async blacklist_reset_token(tokenObj) {
    try {
      // Read data from blacklist.json
      const data = await fs.readFile(this._json_file, 'utf8');
      let jsonData;
      if (!data) {
        jsonData = {
          reset_tokens: [],
        };
      } else {
        jsonData = JSON.parse(data);
      }
  
      jsonData.jwts.push(tokenObj);
  
      const updatedData = JSON.stringify(jsonData, null, 2);
  
      await fs.writeFile(this._json_file, updatedData, 'utf8');
  
      console.log('token blacklisted');
      
    } catch (error) {
      throw error;
    }
  }

  async get_reset_token(token) {
    try {
      const jsonData = await fs.readFile(this._json_file, 'utf8');
      if (!jsonData) {
        return null;
      }
      const blacklisted_token = JSON.parse(jsonData).reset_tokens.find((black) => black.token === token);
      return blacklisted_token;
    } catch (error) {
      throw error;
    }
  }

}

const db_storage = new DbStorage();
db_storage.reload(); //load Collections

/**
 * Returns information about pagination for a given filter and collection.
 * @param {object} filter - The filter to apply to the collection.
 * @param {string|null} collection - The name of the collection to query. If null, the default collection is used.
 * @param {number} page_size - The number of items per page.
 * @param {number} page - The current page number.
 * @returns {object} - An object containing pagination information, haveNextPage, currentPageExists, totalPages.
 * @throws {Error} - If there is an error while retrieving the pagination information.
 */
const page_info = async (filter, collection=null, page_size=10, page=1) => {
  try {
    
    const totalCount = await db_storage.get_a_repo(collection)
      .countDocuments(filter)
      .exec();

    let totalPages = Math.floor(totalCount / page_size);
    if((totalCount % page_size) > 0) {
      totalPages = totalPages + 1;
    }
    
    return {
      haveNextPage: page < totalPages,
      currentPageExists: page <= totalPages,
      totalPages: totalPages
    };
  } catch (error) {
    throw error;
  }
}

const { Food, Order, Transaction, User, Review, Shipment, Address, Notification } = db_storage.mongo_repos;

module.exports = { 
  storage: db_storage, 
  Connection: db_storage.conn, 
  Food, 
  Order, 
  Transaction, 
  User, 
  Review, 
  Shipment, 
  Address, 
  Notification,
  page_info,
};
