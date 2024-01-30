const { Role, userStatus } = require('./enum_ish');

/**
 * Authenticates if the user has admin or super admin role.
 *
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next middleware function
 * @return {void} 
 */
const authenticate_admin = async (req, res, next) => {
  const permitted_roles = [Role.admin, Role.super_admin];
  if (!permitted_roles.includes(req.user.role)) {
    return res.status(400).json({
      msg: 'Forbidden, Invalid Credentials',
    });
  }
  next();
}

/**
 * Authenticates if the user is a super admin.
 *
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @param {Function} next - the next function
 * @return {void}
 */
const authenticate_super_admin = async (req, res, next) => {
  if (!(req.user.role === Role.super_admin)) {
    return res.status(400).json({
      msg: 'Forbidden, Invalid Credentials',
    });
  }
  next();
}

/**
 * Middleware to authenticate user status and handle unauthorized user statuses.
 *
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @return {void}
 */
const authenticate_userStatus = async (req, res, next) => {
  const unauthorized_userStatus = [userStatus.deleted, userStatus.banned, userStatus.deactivated];
  if(unauthorized_userStatus.includes(req.user.status)) {
    const inactive_permitted_paths = ['/logout', '/user/reactivate', '/user/delete_or_deactivate'];
    if((req.user.status === userStatus.deactivated) && (inactive_permitted_paths.includes(req.path))) {
      return next();
    }

    return res.status(403).json({
      msg: 'Forbidden, Invalid Credentials',
    });
  }

  next();
};

module.exports = { authenticate_admin, authenticate_super_admin, authenticate_userStatus };
