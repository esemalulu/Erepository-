/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Programmer		:Sagar Shah
Description		: Utility function repository
Date			: 07/21/2009
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// start - CH#SALES_STATUS
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}

function kana_NVL(str,replaceStr) {
	if(str==null || str =='')
		return replaceStr;
	else
		return str;
}

function kana_IsNull(val) {
	if(val==null || val == '')
		return true;
	else
		return false;
}