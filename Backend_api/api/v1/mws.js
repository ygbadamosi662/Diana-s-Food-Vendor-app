const { Role } = require('./enum_ish');

const authenticate_admin = async (req, res, next) => {
  try {
    const permitted_roles = [Role.admin, Role.super_admin];
    if (!permitted_roles.includes(req.user.role)) {
      return res.status(400).json({
        msg: 'Forbidden, Invalid Credentials',
      });
    }
    next();
  } catch (error) {
    throw error;
  }
}

const authenticate_super_admin = async (req, res, next) => {
  try {
    if (!(req.user.role === Role.super_admin)) {
      return res.status(400).json({
        msg: 'Forbidden, Invalid Credentials',
      });
    }
    next();
  } catch (error) {
    throw error;
  }
}

module.exports = { authenticate_admin, authenticate_super_admin };
