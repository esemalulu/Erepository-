/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function expectedCloseDatePageInit(type){
    if(type == 'create') {
        var date = new Date(); // Now
        date.setDate(date.getDate() + 30);
        
	    nlapiSetFieldValue('expectedclosedate', nlapiDateToString(date));
    }
}