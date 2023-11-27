const { db_storage } = require('../models/engine/db_storage');
const { Collections } = require('../enum_ish');
const { storage } = require('../models/engine/db_storage');
/**
 * defines the NotificationRepo class
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class NotificationRepo {
  constructor () {
    try {
      this._repo = storage.get_a_repo(Collections.Notification);
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

  async has_next_page(filter, page, page_size) {
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

const notification_repo = new NotificationRepo();

module.exports = { Notification: notification_repo.repo, notification_repo };
