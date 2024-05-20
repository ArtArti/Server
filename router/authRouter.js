const express = require("express");
const { signUp, signIn, getUser, logOut, forgotPassword, resetPassword,changePassword } = require("../Controller/authController");
const jwtAuth = require("../MIddleWare/jwtAuth");
const authRouter = express.Router();

authRouter.post('/signup', signUp);
authRouter.post('/signin', signIn);
authRouter.get('/user',jwtAuth, getUser);
authRouter.get('/logout',jwtAuth, logOut);
authRouter.post("/forgotpassword", forgotPassword);
authRouter.post("/forgotpassword/:resetToken", resetPassword);
authRouter.post("/changepassword", jwtAuth, changePassword);


module.exports = authRouter;