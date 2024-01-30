import { LOG_USERS, LOG_USER, LOG_EMAIL, LOG_PHONE, LOG_NOT_AUTH, LOG_STARS } from "./userTypes";

export const logUser = (payLoad={}) => {
  return {
    type: LOG_USER,
    user: payLoad,
  };
}

export const logUsers = (payLoad=[]) => {
  return {
    type: LOG_USERS,
    users: payLoad,
  };
}

export const logEmail = (payLoad='') => {
  return {
    type: LOG_EMAIL,
    email: payLoad,
  };
}

export const logPhone = (payLoad='') => {
  return {
    type: LOG_PHONE,
    phone: payLoad,
  };
}

export const logStars = (payLoad=0) => {
  return {
    type: LOG_STARS,
    stars: payLoad,
  };
}

export const logNot_Auth = (payload=true) => {
  return {
    type: LOG_NOT_AUTH,
    not_auth: payload,
  };
}
