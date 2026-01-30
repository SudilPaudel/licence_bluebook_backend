const electricBluebookModel = require('./electricBluebook.model');
class ElectricBluebookService {
    transformCreateData = (req)=>{
        try{
            const payload = req.body;
            console.log('Service transformCreateData - incoming payload:', payload);
            console.log('Service transformCreateData - vehicleModel value:', payload.vehicleModel);
            console.log('Service transformCreateData - vehicleModel type:', typeof payload.vehicleModel);
            
            // Calculate tax expire date as 1 year after tax pay date
            if (payload.taxPayDate) {
                const payDate = new Date(payload.taxPayDate);
                const expireDate = new Date(payDate);
                expireDate.setFullYear(payDate.getFullYear() + 1);
                payload.taxExpireDate = expireDate;
            }
            
            payload.status = 'pending';
            console.log('Service transformCreateData - transformed payload:', payload);
            return payload;
        }catch(exception){
            throw exception;
        }
    }
    createBluebook = (data)=>{
        try{
            console.log('Service createBluebook - data to save:', data);
            console.log('Service createBluebook - vehicleModel in data:', data.vehicleModel);
            const electricBluebook = new electricBluebookModel(data);
            console.log('Service createBluebook - model instance:', electricBluebook);
            console.log('Service createBluebook - vehicleModel in model:', electricBluebook.vehicleModel);
            return electricBluebook.save();
        }catch(exception){
            console.error('Service createBluebook - error:', exception);
            throw exception;
        }
    }
    findOneBluebook = async (filter)=>{
        try{
            const electricBluebookObj = await electricBluebookModel.findOne(filter);
            return electricBluebookObj;
        }catch(exception){
            throw exception;
        }
    }
    verifydata = async (data, bluebookId)=>{
        try{
            const result = await electricBluebookModel.findByIdAndUpdate(bluebookId, {
                $set: data
            });
            return result;
        }catch(exception){
            throw exception
        }
    }
     findManyBluebooks = async (filter) => {
            try {
                const bluebooks = await electricBluebookModel.find(filter);
                return bluebooks;
            } catch (error) {
                throw error;
            }
        };
        updateBluebook = async (data, bluebookId) => {
        try {
            const result = await electricBluebookModel.findByIdAndUpdate(bluebookId, {
                $set: data
            }, { new: true });
            return result;
        } catch (exception) {
            throw exception;
        }
    }
}

const electricBluebookSvc = new ElectricBluebookService();
module.exports = electricBluebookSvc;