require('dotenv').config()
const jwt = require("jsonwebtoken");
const authSvc = require('../modules/auth/auth.service');
const auth = async(req, res, next)=>{
    try{
        let token = req.headers['authorization'] || null;
        if(!token){
            return res.status(401).json({ message: "Token is required" });
        }
        
        // Check if token has the correct format (Bearer <token>)
        if (!token.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Invalid token format. Use 'Bearer <token>'" });
        }
        
        token = token.split(" ").pop();
        
        if (!token) {
            return res.status(401).json({ message: "Token is required" });
        }
        
        //token verify
        //sign and expiry, formatting
        const tokenData = jwt.verify(token, process.env.JWT_SECRET)
        const userDetail = await authSvc.findOneUser({
            _id: tokenData.sub
        })
        if(!userDetail){
            return res.status(400).json({ message: "User does not exists anymore" });
        }
        req.authUser = userDetail;
        next()// allow the user to access
    }catch(exception){
        console.log("Exception", exception)
        return res.status(401).json({ message: "Unauthorized Access" });
    }
}

module.exports = auth;