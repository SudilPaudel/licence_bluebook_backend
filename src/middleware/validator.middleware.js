const bodyValidator = (schema, fileUploadField)=>{
  return async (req, res, next) =>{
    try{
        const data = req.body;
        if(fileUploadField){
          fileUploadField.map((uploadField)=>{
            if(!data[uploadField]){
              data[uploadField]= null
            }
          })
        }

        // Parse tags if it's a JSON string
        if (data.tags && typeof data.tags === 'string') {
          try {
            data.tags = JSON.parse(data.tags);
          } catch (error) {
            data.tags = [];
          }
        }

        // Convert priority to number if it's a string
        if (data.priority && typeof data.priority === 'string') {
          data.priority = parseInt(data.priority, 10);
        }

        console.log('Validation data:', JSON.stringify(data, null, 2));
        const result = await schema.validateAsync(data, {abortEarly: false});
        console.log('Validation passed:', result);
        next()
    }catch(exception){
        console.log('Validation error:', exception.message);
        console.log('Validation details:', exception.details);
        next(exception)
    }
  }
}

module.exports = {bodyValidator}