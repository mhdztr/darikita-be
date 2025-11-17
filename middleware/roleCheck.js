// Middleware to check user role
exports.roleCheck = (roles) => {
  return (req, res, next) => {
    // Check if user exists (from protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};
