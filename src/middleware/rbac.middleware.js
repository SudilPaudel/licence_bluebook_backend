const allowRole =(allowedRole)=>{
    return (req, res, next)=>{
        try{
            const loggedInUser = req.authUser || null
            if(!loggedInUser){
                next({code: 401, message: "Please Login first"})
            }else{
                const role = loggedInUser.role;
                if(typeof allowedRole === "string" && allowedRole === role){
                    next()
                }else if(Array.isArray(allowedRole) && allowedRole.includes(role)){
                    next()
                }else{
                    next({code: 403, message: "You donot have access to this page"})
                }
            }
        }catch(exception){
            next(exception)
        }
    }
}

module.exports = allowRole