const { storage } = require('../models/engine/db_storage');
const { Collections } = require('../enum_ish');
/**
 * defines the FoodRepo class
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class FoodRepo {
  constructor () {
    try {
      this._repo = storage.get_a_repo(Collections.Food);
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

  async get_recs (filter, page=1, size=5) {
    if (!filter) { return }
    

    const recs =  await this._repo
      .find(filter)
      .skip((page - 1) * size)
      .limit(size)
      .sort({createdAt: -1})
      .exec();
    return recs;
  }

  async has_next_page(filter, page, page_size=this._page_size) {
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

const food_repo = new FoodRepo();

module.exports = { Food: food_repo.repo, food_repo };
