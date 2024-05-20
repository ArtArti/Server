const { compare } = require("bcrypt");
const userModel = require("../Model/userSchema");
const sendEmail = require("../Utility/sendEmail");
const EmailValidator = require("email-validator");
const bcrypt = require('bcrypt');
const crypto = require('crypto');



// 1: controller for registration
const signUp = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  console.log(name, email, password, confirmPassword);

  // all fields validations
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Every filed is required",
    });
  }

  // email validation
  const validEmail = EmailValidator.validate(email);
  if (!validEmail) {
    return res.status(400).json({
      success: false,
      message: "Inavalid Email",
    });
  }

  // password validation
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "your password and confirmPassword doesn't match",
    });
  }

  try {
    const userInfo = new userModel(req.body);
    const result = await userInfo.save();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Account already exist with the provided email ${email} 😒`,
      });
    }

    return res.status(400).json({
      message: e.message,
    });
  }
};



//2: controller for SignIn for user
const signIn = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Every filed is required",
    });
  }

  try {
    const user = await userModel
      .findOne({
        email,
      })
      .select('+password');

    if (!user || !(await bcrypt.compare(password,user.password))) {
      return res.status(400).json({
        success: false,
        message: "invalid credentials",
      });
    }

    const token = user.jwtToken();
    user.password = undefined;

    const cookieOption = {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    };

    res.cookie("token", token, cookieOption);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// 3: controller to get the user information
const getUser = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const user = await userModel.findById(userId);
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


//4: controller for logout the user
const logOut=(req, res)=>{

    try {
      const cookieOption={
        expires:new Date,
        httpOnly: true
      }
      res.cookie("token", null , cookieOption);
      res.status(200).json({
        success: true,
        message: "logged Out"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
}


//5:  controller for forgot password
const forgotPassword = async (req, res, next) => {
  const {email} = req.body;

  // return response with error message If email is undefined
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

    // retrieve user using given email.
    const user = await userModel.findOne({email});
 
    // return response with error message user not found
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "user not register🙅"
      });
    }

    // Generate the token with userSchema method getForgotPasswordToken().
    const resetToken = await user.generatePasswordResetToken();
    console.log(resetToken);

    // Saving the forgotPassword* to DB
    await user.save();
  
   
    const resetPasswordURL = `${process.env.CLIENT_URL}/resetpassword/:${resetToken}`;

    const subject ="Reset password";
    const message =`You can reset you password by clicking on this link 
      <a href=${resetPasswordURL} target="_blank"> reset your passwod</a>`

  try{
     await sendEmail(email, subject, message);
     res.status(200).json({
      success: true,
      message: `reset password token has been sent to ${email}`
     })
  } catch (error) {

    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiryDate = undefined;
    await user.save();

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



//6: controller of reset password 
const resetPassword = async (req, res, next) => {
  const { resetToken } = req.params;
  const { password, confirmPassword } = req.body;

  // return error message if password or confirmPassword is missing
  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "password and confirmPassword is required"
    });
  }

  // return error message if password and confirmPassword  are not same
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "password and confirm Password does not match ❌"
    });
  }

  const forgotPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await userModel.findOne({
      forgotPasswordToken,
      forgotPasswordExpiryDate: {
        $gt: Date.now() 
      }
    });

    // return the message if user not found
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Token or token is expired"
      });
    }

    user.password = password;

    user.forgotPasswordExpiryDate = undefined;
    user.forgotPasswordToken = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "successfully reset the password"
    });

};


//7: controller for change password
const changePassword = async (req, res, next) => {

  // Destructuring the necessary data from the req object
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user; // because of the middleware isLoggedIn

  // Check if the values are there or not
  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: true,
      message: "plzz enter old password and new mpassword"
    });

  }

  // Finding the user by ID and selecting the password
  const user = await userModel.findById(id).select('+password');

  // If no user then throw an error message
  if (!user) {
     return res.status(400).json({
      success: true,
      message: "Invalid user id or user does not exist"
    });
    // return next(new AppError('Invalid user id or user does not exist', 400));
  }

  // Check if the old password is correct
  const isPasswordValid = await user.comparePassword(oldPassword);

  // If the old password is not valid then throw an error message
  if (!isPasswordValid) {
      return res.status(400).json({
      success: true,
      message: "Invalid password"
    });
  }

  // Setting the new password
  user.password = newPassword;

  // Save the data in DB
  await user.save();

  // Setting the password undefined so that it won't get sent in the response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
};



module.exports = {
  signUp,
  signIn,
  getUser,
  logOut,
  forgotPassword,
  resetPassword,
  changePassword,
};
