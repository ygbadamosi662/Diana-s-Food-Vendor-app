const { storage } = require('../models/engine/db_storage');
const { Collections } = require('../enum_ish');
/**
 * defines the ReviewRepo class
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class ReviewRepo {
  constructor () {
    try {
      this._repo = storage.get_a_repo(Collections.Review);
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

  async get_revs (filter, page=1, size=this._page_size) {
    const revs =  await this._repo
      .find(filter)
      .populate('user', 'name _id gender')
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

const review_repo = new ReviewRepo();

module.exports = { Review: review_repo.repo, review_repo };
