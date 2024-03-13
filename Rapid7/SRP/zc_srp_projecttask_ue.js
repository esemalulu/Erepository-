/*
 * @author efagone
 */

function zc_srp_projecttask_beforeSubmit(type){

	try {
		if (type == 'create' || (type == 'edit' && !nlapiGetFieldValue('custeventr7_projecttask_sid'))) {
			nlapiSetFieldValue('custeventr7_projecttask_sid', getRandomString(40));
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Problem zc_srp_projecttask_beforeSubmit', err);
	}
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz_';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}