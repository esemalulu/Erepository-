/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Dec 2012     efagone
 *
 */

function beforeLoad(type, form, request){
 

 
}


function beforeSubmit(type){

	if (type == 'create' || type == 'copy') {
	
		nlapiSetFieldValue('custrecordr7lictemp_accesscode', getRandomString(10));
		
	}
	
}

function getRandomString(string_length){
    var chars = '123456789ABCDEFGHJKLMNOPQRSTUVWXTZabcdefghikmnpqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}