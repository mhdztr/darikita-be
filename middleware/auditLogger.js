const AuditLog = require("../models/AuditLog");

// Middleware to log important actions
exports.logAudit = (action, targetType) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override res.json to capture response
    res.json = function (data) {
      // Only log successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        AuditLog.create({
          actor: req.user.id,
          action,
          targetType,
          targetId: req.params.id || data?.data?._id,
          changes: {
            method: req.method,
            path: req.path,
            body: req.body,
          },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            description: `${action} performed by ${req.user.name}`,
          },
        }).catch((err) => console.error("Audit log error:", err));
      }

      return originalJson.call(this, data);
    };

    next();
  };
};
