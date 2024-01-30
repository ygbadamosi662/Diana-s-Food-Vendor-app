/**
 * Contains the FoodScheduleService class
 * handles all food schedule operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { Food } = require('../models/engine/db_storage');
const { Time_share, Schedule_type } = require('../enum_ish')



class FoodScheduleService {

    constructor() {
      this.schedules = [];
    }

    /**
     * A function to create a schedule for food orders, with optional parameters to customize the schedule.
     *
     * @param {array} schedule - the schedule object
     * @param {object} food - the food object for which the schedule is being created
     * @param {boolean} useThisSchechules - a boolean to indicate whether to return the new_schedule or push it to this.schedules
     * @return {object} an object containing the status of the schedule creation and the new schedule if the useThisSchedules is false, else it returns an object containing the status of the schedule creation and pushes the new schedule to the this.schedules array
     */
    create_a_schedule(schedule={}, food={}, useThisSchechules=true) {
      if((!schedule.type || !schedule.for_when) || (!food.name)) {
        return null;
      }
      try {
        const { for_when, type, hashtag, total_qty } = schedule;
        const data = {
          reasonable: false,
          hashtag_exists: false,
          schedule_exists: false,
          msg: "",
        };

        let new_schedule =  {
          for_when: for_when,
          type: type,
          total_qty: total_qty,
          available_qty: total_qty
        };

        let expiry_time = this.get_schedule_expiry(schedule);
        const reasonable = (expiry_time.getTime() - Time_share.hour) > Date.now(); //this means time to set expiration of schedule and for users to have ample time to preorder have been set to 1hour b4 schedule expiration.
        data.reasonable = reasonable;
        // if schedule time is reasonable
        if(reasonable) {
          new_schedule['expiry_time'] = expiry_time;
          new_schedule.hashtag = hashtag ? `#${food.name+hashtag.toLocaleLowerCase()}` : null;
          // validate if schedule exists or hashtag already exists if hashtag is not null...if food.schedules is not empty
          if(food.schedules.length > 0) {
            if(food.schedules.length === 1) {
                const lone_schedule = food.schedules[0];
                // if schedule exists
                if((lone_schedule.for_when === for_when) && (lone_schedule.type === type)) {
                    data.schedule_exists = true;
                    data.msg = `schedule ${for_when} with type: ${type} for ${food.name} already exists`;
                    return {
                      data: data,
                    };
                }
                // if hashtag exists
                if((new_schedule.hashtag) && (food.schedules[0].hashtag === new_schedule.hashtag)) {
                    data.hashtag_exists = true;
                    data.msg = `hashtag ${new_schedule.hashtag} for ${food.name} already exists`;
                    return {
                      data: data,
                    };
                }

                // if useThisSchechules, i.e an array of schedules
                if(useThisSchechules) {
                  const no_problem = this.schedules.every((schedule) => {
                    if((schedule.for_when === for_when) && (schedule.type === type)) {
                        data.schedule_exists = true;
                        data.msg = `schedule ${for_when} with type: ${type} for ${food.name} already exists`;
                        return false;
                    }
                    if((new_schedule.hashtag) && (schedule.hashtag === new_schedule.hashtag)) {
                        data.hashtag_exists = true;
                        data.msg = `hashtag ${new_schedule.hashtag} for ${food.name} already exists`;
                        return false;
                    }
                    return true;
                  });

                  if(no_problem === false) {
                    return {
                      data: data,
                    };
                  }
                }
            }
            if(food.schedules.length > 1) {
                food.schedules.map((schedule) => {
                  // if schedule exists
                  if((schedule.for_when === for_when) && (schedule.type === type)) {
                    data.schedule_exists = true;
                    data.msg = `schedule ${for_when} with type: ${type} for ${food.name} already exists`;
                    return {
                      data: data,
                    };
                  }
                  // if hashtag exists
                  if((new_schedule.hashtag) && (schedule.hashtag === new_schedule.hashtag)) {
                    data.hashtag_exists = true;
                    data.msg = `hashtag ${new_schedule.hashtag} for ${food.name} already exists`;
                    return {
                      data: data,
                    };
                  }

                  // if useThisSchechules, i.e an array of schedules
                  if(useThisSchechules) {
                    const no_problem = this.schedules.every((schedule) => {
                      if((schedule.for_when === for_when) && (schedule.type === type)) {
                          data.schedule_exists = true;
                          data.msg = `schedule ${for_when} with type: ${type} for ${food.name} already exists`;
                          return false;
                      }
                      if((new_schedule.hashtag) && (schedule.hashtag === new_schedule.hashtag)) {
                          data.hashtag_exists = true;
                          data.msg = `hashtag ${new_schedule.hashtag} for ${food.name} already exists`;
                          return false;
                      }
                      return true;
                    });

                    if(no_problem === false) {
                      return {
                        data: data,
                      };
                    }
                  }
                });
            }
          }

          if(useThisSchechules) {
            this.schedules.push(new_schedule);
            return {
              data: data
            };
          }

          if(!useThisSchechules) {
            return {
              data: data,
              new_schedule
            };
          }
        }
        // if schedule time is not reasonable
        if(!reasonable) {
          data.msg = `The time set for schedule ${for_when.toISOString()} is not reasonable. Please set a time in the future`;
          return {
            data: data,
          };
        }
      } catch (error) {
        throw error;
      }
    }
    
    /**
     * Validate and create schedules.
     *
     * @param {Array} schedules - array of schedules
     * @param {string} food_id - the id of the food
     * @return {Object} an object containing food and collectData
     */
    async validate_and_create_schedules(schedules=[], food_id="")  {
      if(schedules.length === 0 || food_id === "") {
        return null;
      }
      try {
        let collectData = {};
        const food = await Food
          .findById(food_id)
          .select('schedules _id name')
          .exec();

        if(!food) {
          return  {
            food_exists: false,
          };
        }

        if(schedules.length === 1) {
          const { data, new_schedule } = this.create_a_schedule(schedules[0], food, false);
          const { hashtag_exists, schedule_exists, reasonable } = data;
          if(!reasonable || !schedule_exists || hashtag_exists) {
            food.schedules.push(new_schedule);
          }
          collectData = data;
        }

        if(schedules.length > 1) {
          const no_problem = schedules.every((schedule) => {
            const { data } = this.create_a_schedule(schedule, food);
            const { hashtag_exists, schedule_exists, reasonable } = data;
            if(!reasonable || schedule_exists || hashtag_exists) {
              collectData = data
              return false;
            }
            collectData = data
            return true;
          });

          if(no_problem) {
            food.schedules = food.schedules.concat(this.schedules);
            this.schedules = [];
          }
        }

        // save food
        await food.save();

        return {
          food: food,
          food_exists: true,
          ...collectData
        };
        
      } catch (error) {
        throw error;
      }
    }

    /**
     * Updates the food schedules if necessary and saves the changes.
     *
     * @param {Object} food - the food object to update schedules for
     * @return {Object} the updated food object
     */
    async update_food_schedules(food=null) {
      if(!food || food.schedules?.length === 0) {
        return food;
      }
      const now = new Date();
      // flag to check if any schedule is updated
      let updated = false;
      try {
        if(food.schedules.length === 1) {
          const { type, for_when } = food.schedules[0];
          // sets schedule.for_when to the next day or week or month if schedule.for_when is less than now
          if((type !== Schedule_type.one_off) && (for_when < now)) {
            if(Schedule_type.daily) {
                food.schedules[0].for_when = food.schedules[0].for_when.setDate(food.schedules[0].for_when.getDate() + 1);
            }
            if(Schedule_type.weekly) {
                food.schedules[0].for_when = food.schedules[0].for_when.setDate(food.schedules[0].for_when.getDate() + 7);
            }
            if(Schedule_type.monthly) {
                food.schedules[0].for_when = food.schedules[0].for_when.setMonth(food.schedules[0].for_when.getMonth() + 1);
            }

            // set expiry time
            food.schedules[0].expiry_time = this.get_schedule_expiry({
              type: type,
              for_when: food.schedules[0].for_when
            });
            // flags that a schedule is updated
            updated = true
          }
        }

        if(food.schedules.length > 1) {
          food.schedules = food.schedules.map((schedule) => {
            const { type, for_when } = schedule;
            
            // sets schedule.for_when to the next day or week or month if schedule.for_when is less than now
            if((type !== Schedule_type.one_off) && (for_when < now)) {
              if(Schedule_type.daily) {
                schedule.for_when = schedule.for_when.setDate(schedule.for_when.getDate() + 1);
              }
              if(Schedule_type.weekly) {
                schedule.for_when = schedule.for_when.setDate(schedule.for_when.getDate() + 7);
              }
              if(Schedule_type.monthly) {
                schedule.for_when = schedule.for_when.setMonth(schedule.for_when.getMonth() + 1);
              }

              // set expiry time
              schedule.expiry_time = this.get_schedule_expiry({
                type: type,
                for_when: schedule.for_when
              });

              // flags that a schedule is updated
              if(!updated) {
                updated = true;
              }
            }
            return schedule;
          });
          
        }
        updated && await food.save();
      } catch (error) {
        throw error;
      }
    }

    /**
     * Calculates the expiry time for a given schedule.
     *
     * @param {object} schedule - The schedule object.
     * @param {string|null} prefix - The prefix value.
     * @param {string} expiry_prefix - The expiry prefix value. Defaults to "1 hour".
     * @return {Date || null} The expiry time or null.
     */
    get_schedule_expiry(schedule={}, time_share=Time_share.hour, times=1) {
      try {
        if((!schedule.type) || (!schedule.for_when)) {
          return null;
        }
        // if daily
        if(schedule.type === Schedule_type.daily) {
          return new Date(schedule.for_when.getTime() - (4 * Time_share.hour));
        }
        // one off
        if(schedule.type === Schedule_type.one_off) {
          return new Date(schedule.for_when.getTime() - (times * Time_share[time_share]));
        }
        // if weekly
        if((schedule.type === Schedule_type.weekly) || (schedule.type === Schedule_type.monthly)) {
          return new Date(schedule.for_when.getTime() - (Time_share.day));
        }
        return null;
      } catch (error) {
        throw error;
      }
    }
}

const food_schedule_service = new FoodScheduleService();

module.exports = { food_schedule_service };
