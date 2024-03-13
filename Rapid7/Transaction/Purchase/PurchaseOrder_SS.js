/*
 * @author efagone
 */

function beforeSubmit(type){

	if (type == 'create' || type == 'copy'){
		nlapiSetFieldValue('custbodyr7sid', getRandomString(20));
	}
	
}

function getRandomString(string_length){
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	var randomstring = '';
	for (var i = 0; i < string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum, rnum + 1);
	}
	return randomstring;
}