function validateItemChange()
{
   var oldRecord = nlapiGetOldRecord();
   var newRecord = nlapiGetNewRecord();
   if((newRecord) && (oldRecord)){
            var newItem = nullToString(newRecord.getFieldValue('custentity_bo_item'));
            var oldItem = nullToString(oldRecord.getFieldValue('custentity_bo_item'));
            if (newItem != undefined && newItem != oldItem) {
                var itemId = nlapiGetFieldValue('custentity_bo_item');
                var items = nlapiLoadRecord('serviceitem',itemId);
                if(!basePrice){
                    throw nlapiCreateError('ERROR',"An item cannot be changed on a booking without a valid item price. Please add a price to the item details and try again.",true);
                }
       }
   }
}

function nullToString(field) {
    return field == null ? '' : field;
}