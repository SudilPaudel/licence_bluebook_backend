const {generateRandomString} = require('../../utils/helpers');
const bcrypt = require('bcryptjs');
const UserModel = require('../user/user.model');
class AuthService{
    // Transforms registration data: hashes passwords, sets status and activation token, and adds image if present.
    transformRegisterData=(req)=>{
        try{
            const payload = req.body;
            payload.password = bcrypt.hashSync(payload.password, 10);
            payload.confirmPassword = bcrypt.hashSync(payload.confirmPassword, 10);
            payload.status ="inactive";
            payload.activationToken = generateRandomString(100);
            if(req.file){
                payload.image = req.file.filename;
            }
            return payload;
        }catch(exception){
            throw exception;
        }

    }

    // Creates a new user in the database with the provided data.
    createUser = async (data)=>{
            try{
                const user = new UserModel(data);
                return await user.save();
            }catch(exception){
                throw exception;
            }
    }

    // Finds a single user based on the given filter.
    findOneUser = async(filter)=>{
        try{
            const userObj = await UserModel.findOne(filter);
            return userObj;
        }catch(exception){
            throw exception;
        }
    }
    updateUserPassword = async (userId, newPassword) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) throw new Error("User not found");
        user.password = newPassword;
        await user.save(); // triggers pre-save hook
        return user;
    } catch (exception) {
        throw exception;
    }
}

    // Finds all users matching the filter and excludes sensitive fields.
    findAllUsers = async(filter = {})=>{
        try{
            const users = await UserModel.find(filter).select('-password -activationToken');
            return users;
        }catch(exception){
            throw exception;
        }
    }

    // Updates a user's data by user ID.
    updateUser = async (data, userId)=>{
        try{
            const result = await UserModel.findByIdAndUpdate(userId, {$set: data})
            return result;
        }catch(exception){
            throw exception;
        }
    }
    
    // Deletes a user from the database by user ID.
    deleteUser = async (userId)=>{
        try{
            const result = await UserModel.findByIdAndDelete(userId);
            return result;
        }catch(exception){
            throw exception;
        }
    }
}

const authSvc = new AuthService();
module.exports = authSvc;
