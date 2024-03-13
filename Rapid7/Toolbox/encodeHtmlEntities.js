/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Feb 2013     mburstein
 *
 */
function encodeHtmlEntities(string){

/*
 * Replace all special characters with the appropriate html entity
 *  - Cannot replace & # ;
 */

	string = string.replace(/\!/g,"&#33;");	// exclamation mark
	string = string.replace(/\"/g,"&#34;");   // quotation mark
	//string = string.replace(/\#/g,"&#35;");	// number sign
	string = string.replace(/\$/g,"&#36;");	// dollar sign
	string = string.replace(/\%/g,"&#37;");	// percent sign
	string = string.replace(/&/g,'&#38;');	// ampersand
	string = string.replace(/\'/g,"&#39;");	// apostrophe
	string = string.replace(/\(/g,"&#40;");	// left parenthesis
	string = string.replace(/\)/g,"&#41;");	// right parenthesis
	string = string.replace(/\*/g,"&#42;");	// asterisk
	string = string.replace(/\+/g,"&#43;");	// plus sign
	string = string.replace(/\,/g,"&#44;");	// comma
	string = string.replace(/\-/g,"&#45;");	// hyphen
	string = string.replace(/\./g,"&#46;");	// period
	//string = string.replace(/\//g,"&#47;");	// slash
	
	string = string.replace(/\:/g,"&#58;");	// colon
	//string = string.replace(/\;/g,"&#59;");	// semicolon
	//string = string.replace(/\</g,"&#60;");	// less-than
	//string = string.replace(/\=/g,"&#61;");	// equals-to
	//string = string.replace(/\>/g,"&#62;");	// greater-than
	string = string.replace(/\?/g,"&#63;");	// question mark
	//string = string.replace(/\@/g,"&#64;");	// at sign
	
	//string = string.replace(/\[/g,"&#91;");	// left square bracket
	//string = string.replace(/\\/g,"&#92;");	// backslash
	//string = string.replace(/\]/g,"&#93;");	// right square bracket
	//string = string.replace(/\^/g,"&#94;");	// caret
	//string = string.replace(/\_/g,"&#95;");	// underscore
	//string = string.replace(/\`/g,"&#96;");	// grave accent
	//string = string.replace(/\{/g,"&#123;");	// left curly brace
	//string = string.replace(/\|/g,"&#124;");	// vertical bar
	//string = string.replace(/\}/g,"&#125;");	// right curly brace
	//string = string.replace(/\~/g,"&#126;");	// tilde*/
	return string;
}