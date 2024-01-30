import { combineReducers } from "redux";
import { userReducer } from './User/userReducer'
import { recipeReducer } from "./Recipe/recipeReducer";
import { notificationReducer } from "./Notification/notificationReducer";
import { reviewReducer } from "./Review/reviewReducer";
import { RESET_STORE } from "./reset/reset_action";
/**
* Initializes rootReducer
* @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
*/

const appReducer = combineReducers({
    user: userReducer,
    recipe: recipeReducer,
    notification: notificationReducer,
    review: reviewReducer
});

const rootReducer = (state, action) => {
  if (action.type === RESET_STORE) {
    state = undefined;
  }
  return appReducer(state, action);
};

export { rootReducer };
