import User from '../models/User.js';

// roleCheck: pass required roles, e.g. roleCheck('admin'), roleCheck('seller', 'admin')
function roleCheck(...roles) {
  return async (req, res, next) => {
    // [roleCheck] User and required roles
    // req.user is the full MongoDB user object
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.localUser = req.user; // Attach local user data for routes
    next();
  };
}

export default roleCheck;
