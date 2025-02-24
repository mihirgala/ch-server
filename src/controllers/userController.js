import User from "../model/UserModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "details missing",
      });
    }
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ name, email, password, phone, role });

    await newUser.save();
    const token = jwt.sign(
      { id: newUser._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const logoutUser = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out successfully" });
};
export const searchUser = async (req, res) => {
  try {
    const { query, role } = req.query;

    let filter = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter).select("-password");

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ message: "Users found", users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const makeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "admin";
    await user.save();

    res.status(200).json({ message: "User promoted to admin", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const removeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "user";
    await user.save();

    res.status(200).json({ message: "Admin demoted to user", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getProfile = async (req, res) => {
  try {
    const user = req?.user;
    const userData = await User.findById(user._id).select("-password");
    return res.status(200).json({
      message: "Fetched Profile",
      userData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { email, name, phone, password } = req.body;
  try {
    const user = req?.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userData = await User.findById(user._id);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email) {
      const emailUsed = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });
      if (emailUsed) {
        return res
          .status(409)
          .json({ message: "An account already exists with this email" });
      }
      userData.email = email.toLowerCase().trim();
    }

    if (phone) userData.phone = phone.trim();
    if (name) userData.name = name.trim();
    if (password) userData.password = password;

    await userData.save();

    return res.status(200).json({ message: "User data updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
