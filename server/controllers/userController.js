import userModel from "../models/userModel.js";

export const getUserData = async (req, res) => {
    try {
      const userId = req.user.id;
      console.log('User ID from token:', userId);  // Add this line for debugging

      const user = await userModel.findById(userId);

      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }

      res.json({
        success: true,
        userData: {
          name: user.name,
          isAccountVerified: user.isAccountVerified
        }
      });

    } catch (error) {
      return res.json({ success: false, message: error.message });
    }
};
