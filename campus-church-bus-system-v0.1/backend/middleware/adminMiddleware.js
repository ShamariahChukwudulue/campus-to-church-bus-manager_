/**
 * Restricts access to administrator accounts only.
 * Must be placed after the `protect` authentication middleware.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin privileges are required to access this resource.'
    });
  }
  next();
};

module.exports = { requireAdmin };
