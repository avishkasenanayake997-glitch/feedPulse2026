export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 🔥 simple demo auth
    if (role === "admin") {
      if (email === "admin@gmail.com" && password === "1234") {
        return res.status(200).json({
          success: true,
          role: "admin",
          message: "Admin login successful",
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }
    }

    // 🔥 user login (simple)
    if (role === "user") {
      return res.status(200).json({
        success: true,
        role: "user",
        message: "User login successful",
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};