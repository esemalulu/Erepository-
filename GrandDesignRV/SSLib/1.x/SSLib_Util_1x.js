/**
 * Utility library file for Solution Source accounts.
 * Contains misc. functions, including conversions, formatting and date/time.
 * If you're not sure where else to look, look here.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Converts the specified value to a float value if the value is not null or empty.
 * If the value is null, returns 0 if blankIfNull is false, otherwise returns an empty string. 
 */
function ConvertNSFieldToFloat(value, blankIfNull) {
	if (value == null || value == '') {
		if (blankIfNull) return '';
		else return 0;
	}
	return parseFloat(value);
}

/**
 * Converts the specified value to a integer value if the value is not null or empty.
 * If the value is null, returns 0 if blankIfNull is false, otherwise returns an empty string. 
 */
function ConvertNSFieldToInt(value, blankIfNull) {
	if (value == null || value == '') {
		if (blankIfNull) return '';
		else return 0;
	}
	return parseInt(value);
}

/**
 * Converts specified value to a XML-safe string. Returns empty string if a null value is passed in.
 */
function ConvertNSFieldToString(value) {
	if (value == null)
		return '';
	else
		return xml.escape({xmlText: value.toString()});
}

/**
 * Converts pounds to kilograms
 */
function ConvertLbToKG(lb) {
	return lb * 0.453592;
}

/**
 * Converts gallons to pounds
 */
function ConvertGalToLb(gal) {
	return gal * 8.3;
}

/**
 * Converts gallons to kilograms
 */
function convertGalToKG(gal) {
	return gal * 3.765;
}

/**
 * Converts gallons to liters
 */
function convertGalToLT(gal) {
	return gal * 3.78541;
}

/**
 * Converts pounds per square inch to kiloPascals (kPa)
 */
function convertPSIToKPA(psi) {
	return psi * 6.8948;
}

/**
 * Round up to the next integer unless the value passed in is itself an integer, in which case it is returned as a float.
 * Example: If value = 100.01 then this method will return 101.00
 */
function GetNearestDollar(value) {
	if(parseInt(value) == value)
		return parseFloat(value);
	else {
		//Chop floating point portion. This will give us the dollar amount
		//if value is 100.01, this will return 100
		var dollars = Math.floor(value);  
		var cents  = Math.floor((value % 1) * 100); //Chop everything else. This will retun the cents	
		if(dollars != 0) {
			if(cents == 0)
				return parseFloat(dollars);
			else
				return parseFloat(dollars + 1); //This will round up the dollar amount to the nearest dollar.		
		}
		else
			return 0;
	}
}

/**
 * Converts a string currency representation to the english text you would pronounce the value.
 * Works up to 999,999,999,999,999 (i.e. 999 billion)
 */
function ConvertCurrencyToEnglish(s) {
	// Convert numbers to words
	// copyright 25th July 2006, by Stephen Chapman http://javascript.about.com
	// permission to use this Javascript on your web page is granted
	// provided that all of the code (including this copyright notice) is
	// used exactly as shown (you can change the numbering system if you wish)
	var dg = ['zero','one','two','three','four', 'five','six','seven','eight','nine']; 
	var tn = ['ten','eleven','twelve','thirteen', 'fourteen','fifteen','sixteen', 'seventeen','eighteen','nineteen']; 
	var tw = ['twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety']; 

	// American Numbering System
	var th = ['','thousand','million', 'billion','trillion'];
	s = s.toString(); s = s.replace(/[\, ]/g,''); if (s != parseFloat(s)) return 'not a number'; var x = s.indexOf('.'); if (x == -1) x = s.length; if (x > 15) return 'too big'; var n = s.split(''); var str = ''; var sk = 0; for (var i=0; i < x; i++) {if ((x-i)%3==2) {if (n[i] == '1') {str += tn[Number(n[i+1])] + ' '; i++; sk=1;} else if (n[i]!=0) {str += tw[n[i]-2] + ' ';sk=1;}} else if (n[i]!=0) {str += dg[n[i]] +' '; if ((x-i)%3==0) str += 'hundred ';sk=1;} if ((x-i)%3==1) {if (sk) str += th[(x-i-1)/3] + ' ';sk=0;}} if (x != s.length) {var y = s.length; str += 'point '; for (var i=x+1; i<y; i++) str += dg[n[i]] +' ';} return str.replace(/\s+/g,' ');
}

/**
 * Add n paddingChars to the string to the left.
 */
function AddLeftPadding(str, paddingChar, n) {
    if (! str || ! paddingChar || str.length >= n) {
        return str;
    }

    var max = (n - str.length)/paddingChar.length;
    for (var i = 0; i < max; i++) {
        str = paddingChar + str;
    }

    return str;
}

/**
 * Add n paddingChars to the string to the right.
 */
function AddRightPadding(str, paddingChar, n) {
    if (! str || ! paddingChar || str.length >= n) {
        return str;
    }

    var max = (n - str.length)/paddingChar.length;
    for (var i = 0; i < max; i++) {
    	str += paddingChar;
    }

    return str;
}

/**
 * Add commas to the specified string to format it as a number.
 * E.g. addCommas(10000) returns "10,000"
 */
function FormatStringAsNumber(nStr) {
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

/**
 * Check whether or not BOM Config bundle is installed.
 * To check if BOM Config bundle is installed or not, we search for a scheduled 
 * script that is supposed to run in that bundle when backlog is created. 
 * If the scheduled script is there, then BOM Config bundle is installed.
 */
function IsBOMConfigBundleInstalled()
{
    //If BOM Config bundle is installed in the account, then we also want to re-process backlog.
    //To check if BOM Config bundle is installed or not, we search for a scheduled script that
    //is supposed to run in that bundle when backlog is created. 
    //If the scheduled script is there, then BOM Config bundle is installed.
    //The scheduled script that is supposed to run is titled "BOM - Process Change Order (Sch)"
    var searchResults = nlapiSearchRecord('script', null, new nlobjSearchFilter('scriptid', null, 'is', 'customscriptbom_processchgord_sch'), null);
    return (searchResults != null && searchResults.length == 1); 
}

/**
 * Transforms the value passed through to be in currency format.
 * 
 * @param amount
 * @returns {String}
 */
function CurrencyFormatted(amount)
{
    var i = parseFloat(amount);
    if(isNaN(i)) { i = 0.00; }
    var minus = '';
    if(i < 0) { minus = '-'; }
    i = Math.abs(i);
    i = parseInt((i + .005) * 100);
    i = i / 100;
    var s = new String(i);
    if(s.indexOf('.') < 0) { s += '.00'; }
    if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
    s = minus + s;
    return s;
}