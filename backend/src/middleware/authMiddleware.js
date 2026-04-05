import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      error: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({
        success: false,
        data: null,
        error: "SERVER_CONFIG",
        message: "Server misconfiguration",
      });
    }
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== "admin") {
      return res.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
        message: "Admin access required",
      });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      data: null,
      error: "INVALID_TOKEN",
      message: "Invalid or expired token",
    });
  }
}
