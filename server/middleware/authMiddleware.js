// server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // jwt.verify can throw — that's why it's inside try/catch
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach both req.user (payload) and a req.auth() function for compatibility.
    // userId detection tries common claims: sub, userId, id
    const userId = decoded.sub || decoded.userId || decoded.id || decoded._id || null;

    req.user = decoded;
    req.auth = () => ({ userId, payload: decoded, token });

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export default verifyToken;
