import jwt from "jsonwebtoken";
import User from "../model/UserModel.js";

export const protect = async (req, res, next) => {
  try {
   
    let token =  req.headers.authorization;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, please log in" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired, please log in again" });
    }
    console.log(error.message)
    res.status(401).json({ message: "Invalid token, please log in" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only" });
  }
};
