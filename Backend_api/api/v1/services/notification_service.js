const { Notification} = require('../repos/notification_repo');
const { Note_Status } = require('../enum_ish');
/**
 * Contains the NotificationService class
 * handles all notification operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class NotificationService {

  async notify(obj) {
    // only for notifications
    if (!obj.to || !obj.subject || !obj.comment) { return }
    try {
      obj.status = Note_Status.sent;
      return await Notification.create(obj);
    } catch (error) {
      throw error;
    }
  }

  async notify_all(receivers, comment, subject) {
    // only for notifications
    if (!receivers || !comment || !subject) { return }
    try {
      const all = await Notification.insertMany(receivers.map((user) => {
        return {
          to: user,
          subject: subject,
          comment: comment,
          status: Note_Status.sent,
        };
      }));
      return all;
    } catch (error) {
      throw error;
    }
  }
}


const notification_service = new NotificationService(); 

module.exports = { notification_service };
