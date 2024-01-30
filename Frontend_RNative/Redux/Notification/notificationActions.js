import { LOG_NOTIFICATIONS, LOG_NOTIFICATION } from "./notificationTypes";

export const logNotification = (payLoad={}) => {
    return {
        type: LOG_NOTIFICATION,
        notification: payLoad,
    }
}

export const logNotifications = (payLoad=[]) => {
    return {
        type: LOG_NOTIFICATIONS,
        notifications: payLoad,
    }
}
