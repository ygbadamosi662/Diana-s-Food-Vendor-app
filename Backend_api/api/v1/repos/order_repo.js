const { storage } = require('../models/engine/db_storage');
const { Collections } = require('../enum_ish');
/**
 * defines the OrderRepo class
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class OrderRepo {
  constructor () {
    try {
      this._repo = storage.get_a_repo(Collections.Order);
      this._page_size = 20;
    } catch (error) {
      throw error;
    }
     
  }

  get repo() {
    return this._repo;
  }

  get page_size() {
    return this._page_size;
  }

  async get_orders (filter, page=1, size=this._page_size) {
    const revs =  await this._repo
      .find(filter)
      .populate('user', 'name _id')
      .skip((page - 1) * size)
      .limit(size)
      .sort({ stars: 1 })
      .exec();
    return revs;
  }

  async has_next_page(filter, page=1, page_size=this._page_size) {
    try {
      const totalCount = await this._repo
        .countDocuments(filter)
        .exec();

      let totalPages = Math.floor(totalCount / page_size);
      if((totalCount % page_size) > 0) {
        totalPages = totalPages + 1;
      }
      const hasNextPage = page < totalPages;

      return hasNextPage;
    } catch (error) {
      throw error;
    }
  }

  async total_pages(filter, page_size=this._page_size) {
    try {
      const totalCount = await this._repo
        .countDocuments(filter)
        .exec();

      let totalPages = Math.floor(totalCount / page_size);
      
      if((totalCount % page_size) > 0) {
        totalPages = totalPages + 1;
      }

      return totalPages;
    } catch (error) {
      throw error;
    }
  }
}

const order_repo = new OrderRepo();

module.exports = { Order: order_repo.repo, order_repo };