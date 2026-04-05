import jwt from "jsonwebtoken";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "1234";
    const secret = process.env.JWT_SECRET;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION",
        message: "Email and password are required",
      });
    }

    if (!secret) {
      return res.status(500).json({
        success: false,
        data: null,
        error: "SERVER_CONFIG",
        message: "JWT_SECRET is not configured",
      });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ role: "admin", sub: email }, secret, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      data: { token, role: "admin" },
      error: null,
      message: "Login successful",
    });
  } catch (error) {
    console.error("loginUser:", error);
    return res.status(500).json({
      success: false,
      data: null,
      error: "SERVER_ERROR",
      message: "Server error",
    });
  }
};
