/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Jan 2013     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */

function beforeSubmit(type){

	if (type == 'create' || type == 'copy') {
	
		nlapiSetFieldValue('custrecordr7marketingurlcode', getRandomString(5));
		
	}
	
}

function getRandomString(string_length){
    var chars = '123456789ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}