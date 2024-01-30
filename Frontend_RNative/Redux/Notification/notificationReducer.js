import { LOG_NOTIFICATIONS, LOG_NOTIFICATION } from "./notificationTypes";

const initState = {
    notification: {},
    notifications: []
}

export const notificationReducer = (state = initState, action) => {
    switch (action.type) {
        case LOG_NOTIFICATION: return {
            ...state,
            notification: action.notification
        }

        case LOG_NOTIFICATIONS: return {
            ...state,
            notifications: action.notifications
        }

        default: return state
    }
}
