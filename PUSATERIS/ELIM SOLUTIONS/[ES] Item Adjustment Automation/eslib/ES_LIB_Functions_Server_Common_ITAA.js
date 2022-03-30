/*thisifilename="ES_LIB_Functions_Server_Common_ITAA.js";*/
/**************** This is for Common Functions, Server Side only***********************/
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.031      Aug. 24, 2015     richard@elimsolutions.ca	
 * Modified:
 * 1) added isShowAll to hl and hlte to fit isShowAll in sl()
 * 2) removed function removeSpecialChars()
 * 3) added addSpaceToCamelCase(), removeSecondFromHHMMSS()
 * 4) updated search() validation
 */
function Section_Browser_Compatibility____________________________________________(){};
////===================================================================================================Browser Compatibility, start (must be place at beginning)
Object.keys = Object.keys || (function(o) {
	if (o !== Object(o))
		throw new TypeError('Object.keys called on a non-object');
	var k=[];
	for (var p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
	return k;
});
String.prototype.trim = String.prototype.trim || (function() {
	return this.replace(/^\s+|\s+$/g, ''); 
});
////===================================================================================================Browser Compatibility, end (must be place at beginning)
function Section_Validate_Variable____________________________________________(){};
////===================================================================================================Validate Variable, start
/*
 * check empty if is null, undefined, empty, empty array, or empty object
 */
function isNOE(variable){
	if(variable===null)				return true;
	else if(typeof(variable)==="undefined")	return true; 
	else if(variable==="")			return true;
	else if(variable===0)			return false;
	
	var stType=Object.prototype.toString.call(variable);
	if(stType === '[object Undefined]')		return true;
	else if(stType === '[object Array]'){
		if(variable.length===1 && variable[0]==="") return true;
		else return Object.keys(variable).length===0;
	}
	else if(stType === '[object Object]')	return Object.keys(variable).length===0;
	else if(stType === '[object Date]')		return variable.length===0;
	else return false;
}
/*
 * isNOEOF is the advanced version of isNOE. 
 * It includes the case of function type element. 
 * It is useful to loop in object's keys to skip empty keys and function keys.
 */
function isNOEOF(variable){
	var stType=Object.prototype.toString.call(variable);
	if(stType === '[object Function]')		return true;
	else return isNOE(variable);
}
////===================================================================================================Validate Variable, end
function Section_Log_Related____________________________________________(){};
////===================================================================================================Log Related, start
function al(message, isShowAll){
	nsLog("AUDIT", message, isShowAll);
}
function dl(message, isShowAll){
	nsLog("DEBUG", message, isShowAll);
}
function sl(message, isShowAll){
	nsLog("DEBUG", message, isShowAll);
}
function nsLog(logLevel, message, isShowAll){
	if(isNOE(logLevel)) logLevel="DEBUG";
	if(isNOE(message)) return;
	if(isNOE(thisifilename)) thisifilename="";
	if(isNOE(thisifunctionname)) thisifunctionname="";
	if(isNOE(isShowAll)) isShowAll=false;
	
	if(isShowAll){
		var intCharLimit=3999;
		var intProtectLoopLimit=100;
		var intCurrLoopCount=0;
		if(message.length > intCharLimit){
			for(var i=0; i<message.length; i+=intCharLimit){
				nlapiLogExecution(logLevel, (thisifilename+"-"+thisifunctionname+" &ALL@"+intCurrLoopCount), message.slice(i, (i+intCharLimit)));
				intCurrLoopCount++;
				if(intCurrLoopCount > intProtectLoopLimit){
					nlapiLogExecution(logLevel, (thisifilename+"-"+thisifunctionname), "*****>>>(NOT Error) function sl: exceeded Log Loop Limit:"+intProtectLoopLimit+"|| for protection, Logs stop now.");
					break;
				}
			}
		}
		else{
			nlapiLogExecution(logLevel, (thisifilename+"-"+thisifunctionname+" &ALL-One"), message);
		}
	}
	else{
		nlapiLogExecution(logLevel, (thisifilename+"-"+thisifunctionname), message);
	}
}
/*
 * sls for Set Log and set Stage
 * stage is used to print out with the error message, so we know which stage the script stopped at
 */
function sls(message){
	if(isNOE(thisistage)) thisistage="";	
	thisistage=message;
	sl(thisistage);
}
/*
 * slte for sl() and te()
 * log and throw error with same error message
 */
function slte(stMessage){
	if(stMessage==undefined||stMessage==null||stMessage=="") stMessage="(message undefined)";
	
	sl(stMessage);
	te(stMessage);
}
/*
 * el is a easier way which uses slog, withno functionname param input all the time
 * returns an array of objects. Each object contains all columns of one result data
 */
function el(error, extraMsg){
	if(isNOE(thisifilename)) thisifilename="";
	if(isNOE(thisifunctionname)) thisifunctionname="";
	var currLocation=thisifilename+"-"+thisifunctionname;
    var stErrMsg=getNSErrorMsg(error);
	nlapiLogExecution('ERROR', currLocation, stErrMsg);
	if(extraMsg!=null) nlapiLogExecution('ERROR', currLocation, 'Extra Error Message>>> '+extraMsg);
}
/*
* te for Throw Error
*/
function te(message){
	throw nlapiCreateError('ERROR',message);
}
/*
* tes for Throw Error and set last Stage
*/
function tes(message){
	if(isNOE(thisistage)) thisistage="";	
	thisistage=message;
	throw nlapiCreateError('ERROR',message);
}
/*
 * print log to a file and save to a specified folder (folderId)
 * stFunctionname: let you know which function this file prints from
 * stTag: let you know which function what this print is about
 * strData: the data in string to print into the file
 */
function pl(folderId, stTag, strData, mode){
	if(isNOE(folderId))	folderId=-15;//default folder is in folder SuiteScripts
	if(isNOE(stTag))	stTag="unknownTag";
	if(isNOE(strData))	strData="";
	if(isNOE(mode))		mode="PLAINTEXT";
	if(isNOE(thisifunctionname)) thisifunctionname="unknownFunction";////default folder is in folder SuiteScripts
	var timeStamp=getNumericTimeMarkForFileName();
	
	var file = nlapiCreateFile(thisifunctionname+"-"+stTag+"-"+timeStamp+".txt", mode, strData );
	file.setFolder(folderId); ////folder path: SuiteScripts > [ES] Scheduling > Booking Availability > test print
	return nlapiSubmitFile(file);	
}
/*
 * wf for write file
 */
function wf(folderId, filename, strData, mode){
	if(isNOE(folderId)) folderId=-15;//default folder is in folder SuiteScripts
	if(isNOE(filename)){
		throw nlapiCreateError('ERROR',"function wf: no filename is provided");
		return;
	}
	if(isNOE(strData)) strData="";
	if(isNOE(mode)) mode="PLAINTEXT";
	////--------------------------------search for existing file with same name and same folder first, start
	var filters = [
				   ['name','is', filename]
	];
	var columns=[
		   new nlobjSearchColumn('internalid').setSort(),
		   new nlobjSearchColumn('folder')
	];
	var results=nlapiSearchRecord("file",null,filters,columns);

	var isFoundSameFile = false;
	var stSameFileInid = null;
	if(results !=null && results.length!=0){
		for ( var i = 0; results != null && i < results.length; i++ ){
			var result = results[ i ];
			var internalid = result.getValue('internalid');
			var folder= result.getValue('folder');
			
			if(folder == folderId){
				isFoundSameFile = true;
				stSameFileInid = internalid;
				break;
			}
	    }//for
	}
	////--------------------------------search for existing file with same name and same folder first, end	
	var file = null;
	////------------------if same file found, then just change value while keeping the settings unchanged
	if(isFoundSameFile){
		file = nlapiLoadFile(stSameFileInid);
		file.setValue(strData);
	}
	////------------------else, then create a new file
	else{
		file = nlapiCreateFile(filename, mode, strData);
		file.setFolder(folderId); ////folder path: SuiteScripts > [ES] Scheduling > Booking Availability > test print
	}
	////------------------submit
	return nlapiSubmitFile(file);
}
/*
////Sample Codes:
try{
}
catch(e){
	var errMsg="#195 "+getNSErrorMsg(e);
	sl(errMsg);
	te(errMsg);
}
*/
function getNSErrorMsg(err){
	if( err instanceof nlobjError ) return ('Error>>> '+err.getCode()+'\n'+err.getDetails());
	else return ('Uexpected Error>>> '+err.toString());	
}

function hl(stMsg, isShowAll){
	thisiarrhistorylogs.push(stMsg);
	sl(stMsg, isShowAll);
}
function hlte(stMsg, isShowAll){
	if(stMsg==undefined||stMsg==null||stMsg=="") stMsg="(message undefined)";
	
	thisiarrhistorylogs.push(stMsg);
	sl(stMsg, isShowAll);
	te(stMsg);
}
function hal(stMsg){
	thisiarrhistorylogs.push(stMsg);
	al(stMsg);
}
function halte(stMsg){
	if(stMsg==undefined||stMsg==null||stMsg=="") stMsg="(message undefined)";
	
	thisiarrhistorylogs.push(stMsg);
	al(stMsg);
	te(stMsg);
}
function getHistoryLogs(){
	var stLogs="";
	if(!isNOE(thisiarrhistorylogs)){
		stLogs+="\n\nLog History:\n";
		for(var i_ahl=0;thisiarrhistorylogs!=null&&i_ahl<thisiarrhistorylogs.length;i_ahl++){
			stLogs+=thisiarrhistorylogs[i_ahl]+"\n";
		}
	}
	else{
		stLogs+="\n\nNO Log History.\n";			
	}
	return stLogs;
}
function saveHistoryLogs(stFolderInid, stLogFileNamePrefix, stHistoryLogs){
	if(isNOE(stFolderInid)) stFolderInid="-15";
	if(isNOE(stLogFileNamePrefix)) stLogFileNamePrefix = "es_log";
	if(isNOE(stHistoryLogs)) stHistoryLogs = "(NO LOG)";
	////---------------------------------------save log file
	var stFileName = stLogFileNamePrefix+"__"+getNumericTimeMarkForFileName()+".txt";
	try{
		//------------print out all logs
		var objFile = nlapiCreateFile(stFileName, "PLAINTEXT", stHistoryLogs);
		objFile.setFolder(stFolderInid);
		var stFileInid = nlapiSubmitFile(objFile);
		return stFileInid;
	}
	catch(error){
		var stMsg=getNSErrorMsg(error);
		sl(stMsg);
		
		return null;
	}
}
////===================================================================================================Log Related, end
function Section_Time_Related____________________________________________(){};
////===================================================================================================Time Related, start
function formatAMPM(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;
	return strTime;
}
function HHMMSStoSeconds( time ) {
	var parts = time.split(':');
	return ((+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2])); 
}
function HHMMtoSeconds( time ) {
	var parts = time.split(':');
	return ((+parts[0]) * 60 * 60 + (+parts[1]) * 60); 
}
function HHtoSeconds( time ) {
	var parts = time.split(':');
	return ((+parts[0]) * 60 * 60); 
}
function HHMMSStoMilliseconds( time ) {
	var parts = time.split(':');
	return 1000*((+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2])); 
}
function HHMMtoMilliseconds( time ) {
	var parts = time.split(':');
	return 1000*((+parts[0]) * 60 * 60 + (+parts[1]) * 60); 
}
function HHtoMilliseconds( time ) {
	var parts = time.split(':');
	return 1000*((+parts[0]) * 60 * 60); 
}
function SecondstoHHMMSS(sec) {
	var sec_num = parseInt(sec, 10); // don't forget the second parm
	var hours   = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = sec_num - (hours * 3600) - (minutes * 60);
	if(hours   < 10){hours   = "0"+hours;}
	if(minutes < 10){minutes = "0"+minutes;}
	if(seconds < 10){seconds = "0"+seconds;}
	var time = hours+':'+minutes+':'+seconds;
	return time;
}
/*
* accept string in format: 
* 1) HH, HHMM, HHMMSS: e.g. "10AM", "10:30AM","10:30:10AM"
* 2) can have space before AM/PM: e.g. "10 AM"
* 3) small or capitalized AM/PM: e.g. "10:30 am","10:30:10 aM" 
*/
function AMPMtoHHMMSS(time){
	var isAM=false; var isPM=false;
	if(isNOE(time)) return "00:00:00";
	time=time.toLowerCase();
	if(time.indexOf("am")!=-1){isAM=true;time=time.replace("am","");}
	if(time.indexOf("AM")!=-1){isAM=true;time=time.replace("AM","");}
	if(time.indexOf("pm")!=-1){isPM=true;time=time.replace("pm","");}
	if(time.indexOf("PM")!=-1){isPM=true;time=time.replace("PM","");}
	if(!isAM && !isPM) return "00:00:00";
	time=time.replace(/\s/g,"");
	var parts = time.split(':');
	for(var i=0;i<parts.length;i++) parts[i]=parseInt(removePrefixZero(parts[i]));
	if(isPM){ if(parts[0]!=12) parts[0]=parts[0]+12; }////from 2:30 PM to 14:30
	if(isAM){ if(parts[0]==12) parts[0]=0; }////from 12:30 AM to 00:30
	for(var i=0;i<parts.length;i++) parts[i]=convertToTwoDigitFormat(parts[i]);////double check format
	if(parts.length==3) return parts[0]+":"+parts[1]+":"+parts[2];
	else if(parts.length==2) return parts[0]+":"+parts[1]+":00";
	else return parts[0]+":00:00";
}
function HHMMSStoAMPM(time, outputFormat){
	if(isNOE(time) || time.indexOf(":")==-1) return "00:00:00 AM";
	if(isNOE(outputFormat)) outputFormat="HHMMSS";
	time=time.replace(/\s/g,"");
	var AMPM="AM";////Notice there is a space
	var parts = time.split(':');
	for(var i=0;i<parts.length;i++) parts[i]=parseInt(removePrefixZero(parts[i]));////NetSuite randomly has parseInt error for some reason
	if(parts[0]==12){parts[0]=parts[0]; AMPM="PM";}
	else if(parts[0]>12){
		if(parts[0]>=24){parts[0]=parts[0]-12; AMPM="AM";}
		else{parts[0]=parts[0]-12; AMPM="PM";}
	}
	for(var i=0;i<parts.length;i++) parts[i]=convertToTwoDigitFormat(parts[i]);////double check format	
	if(outputFormat=="HHMM"){
		if(parts.length>=2) return parts[0]+":"+parts[1]+" "+AMPM;
		else return parts[0]+":00 "+AMPM;
	}
	else if(outputFormat=="HH"){
		return parts[0]+" "+AMPM;
	}
	else{
		if(parts.length==3) return parts[0]+":"+parts[1]+":"+parts[2]+" "+AMPM;
		else if(parts.length==2) return parts[0]+":"+parts[1]+":00 "+AMPM;
		else return parts[0]+":00:00 "+AMPM;
	}
}
function MMDDYYYYtoJsDate(stTime){////time in format as 7/23/2013
	var arrViewDate=stTime.split("/"); 
	return new Date(arrViewDate[2], arrViewDate[0] - 1, arrViewDate[1]);
}
function getDateDifference(startDate, endDate){
	var timeDiff = Math.abs((endDate.getTime() + (1000 * 60 * 60 * 24) ) - startDate.getTime());
	return Math.ceil(timeDiff / (1000 * 3600 * 24));
}
function getDateFromCurrDate(dtCurrDate){
	if(isNOE(dtCurrDate)) return null;	
	var stDate=nlapiDateToString(dtCurrDate);
	return stDate;
}
function getTimeFromCurrDate(dtCurrDate){
	if(isNOE(dtCurrDate)) return null;
	var stDateTime=nlapiDateToString(dtCurrDate, "datetime");
	var arrDateTime=stDateTime.split(" ");
	if(arrDateTime.length>=2){
		var stTime=arrDateTime[1]+" "+arrDateTime[2];
		return stTime;
	}
}
function regulateAMPM(time, outputFormat){////from 3:00 PM to 03:00:00 PM 
	if(isNOE(time) || time.indexOf(":")==-1) return "00:00:00 AM";
	if(isNOE(outputFormat)) outputFormat="HHMMSS";
	var sections = time.split(' ');
	var AMPM=(sections[1]).toUpperCase();
	var parts = sections[0].split(':');
	for(var i=0;i<parts.length;i++) parts[i]=convertToTwoDigitFormat(parseInt(parts[i]));  
	if(outputFormat=="HHMM"){
	    if(parts.length>=2) return parts[0]+":"+parts[1]+" "+AMPM;
	    else return parts[0]+":00 "+AMPM;
	}
	else if(outputFormat=="HH"){
	    return parts[0]+" "+AMPM;
	}
	else{////same as "HHMMSS"
		if(parts.length==3) return parts[0]+":"+parts[1]+":"+parts[2]+" "+AMPM;
		else if(parts.length==2) return parts[0]+":"+parts[1]+":00 "+AMPM;
		else return parts[0]+":00:00 "+AMPM;
	}
}
function addYears(dtTime, intYears){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intYears)) intYears = 1;
	return new Date(dtTime.setFullYear(new Date(dtTime.getFullYear()+intYears)) );
}
function addMonths(dtTime, intMonths){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intMonths)) intMonths = 1;
	return new Date(dtTime.setMonth(new Date(dtTime.getMonth()+intMonths)) );
}
function addDays(dtTime, intDays){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intDays)) intDays = 1;
	return new Date(dtTime.setDate(new Date(dtTime.getDate()+intDays)) );
}
function addHours(dtTime, intHours){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intHours)) intHours = 1;
	return new Date(dtTime.setHours(new Date(dtTime.getHours()+intHours)) );
}
function addMinutes(dtTime, intMinutes){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intMinutes)) intMinutes = 1;
	return new Date(dtTime.setMinutes(new Date(dtTime.getMinutes()+intMinutes)) );
}
function addSeconds(dtTime, intSeconds){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intSeconds)) intSeconds = 1;
	return new Date(dtTime.setSeconds(new Date(dtTime.getSeconds()+intSeconds)) );
}
function addMilliseconds(dtTime, intMilliseconds){
	if(isNOE(dtTime)) dtTime = new Date();
	if(isNOE(intMilliseconds)) intMilliseconds = 1;
	return new Date(dtTime.setMilliseconds(new Date(dtTime.getMilliseconds()+intMilliseconds)) );
}
/*
* this is support function to check a given timeRange against a set of time cells/grids to see how many time cells/grids this timeRange overlapped with
* Notes:
* 1) unit must be in integer or float
* 2) all params must be in same unit, can be second or milliseconds or others, but must be same for comparing
* 3) the time cell's endtime (e.g. for 19:00 in ms: 68399999) must be less than next time cell's starttime (e.g. 19:00 in ms: 68400000)
*/
function isTimeRangeInTimeCell(timeCell_starttime, timeCell_endtime, timeRange_starttime, timeRange_endtime){
	$s	=timeRange_starttime;
	$e	=timeRange_endtime;
	$cs	=timeCell_starttime;
	$ce	=timeCell_endtime;
	if(
		//==============================case 1: starttime IN		cell and endtime AFTER	cell
		($cs<=$s && $cs< $e && $ce>=$s && $ce<=$e) || 
		//==============================case 2: starttime BEFORE	cell and endtime AFTER	cell 
		($cs>=$s && $cs< $e && $ce>=$s && $ce<=$e) || 
		//==============================case 3: starttime IN		cell and endtime IN		cell 
		($cs<=$s && $cs< $e && $ce>=$s && $ce>=$e) || 
		//==============================case 4: starttime BEFORE	cell and endtime IN		cell
		($cs>=$s && $cs< $e && $ce>=$s && $ce>=$e)
	) return true;
	else return false;
}
/*
 * remove the second section because NetSuite throws error if the field is a datetime field which cannot accept second
 * "9/25/2015 10:11:54 AM" to "9/25/2015 10:11 AM"
 */
function removeSecondFromHHMMSS(datetimetz){
	var sections = datetimetz.split(' ');
	var time = sections[1];
	var sections_time = time.split(':');
	if(sections_time.length>1) time_new=sections_time[0]+":"+sections_time[1];
	
	return sections[0]+" "+time_new+" "+sections[2];
}
////===================================================================================================Time Related, end
function Section_Format_Related____________________________________________(){};
////===================================================================================================Format Related, start
function CommaFormattedFlt(amount){
	var i = parseFloat(amount);
	if(isNaN(i)) { i = 0.00; }
	var minus = '';
	if(i < 0) { minus = '-'; }
	i = Math.abs(i);
	i = parseInt((i + .005) * 100);
	i = i / 100;
	s = new String(i);
	if(s.indexOf('.') < 0) { s += '.00'; }
	if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
	amount = minus + s;
	
	var delimiter = ","; // replace comma if desired
	var a = amount.split('.',2);
	var d = a[1];
	var i = parseInt(a[0]);
	if(isNaN(i)) { return ''; }
	var minus = '';
	if(i < 0) { minus = '-'; }
	i = Math.abs(i);
	var n = new String(i);
	var a = [];
	while(n.length > 3){
		var nn = n.substr(n.length-3);
		a.unshift(nn);
		n = n.substr(0,n.length-3);
	}
	if(n.length > 0) { a.unshift(n); }
	n = a.join(delimiter);
	if(d.length < 1) { amount = n; }
	else { amount = n + '.' + d; }
	amount = minus + amount;
	
	return amount;
}
function CommaFormattedInt(amount){
	var i = parseFloat(amount);
	if(isNaN(i)) { i = 0.00; }
	var minus = '';
	if(i < 0) { minus = '-'; }
	i = Math.abs(i);
	i = parseInt((i + .005) * 100);
	i = i / 100;
	s = new String(i);	
	amount = minus + s;
	
	var delimiter = ","; // replace comma if desired
	var a = amount.split('.',2);
	var i = parseInt(a[0]);
	if(isNaN(i)) { return ''; }
	var minus = '';
	if(i < 0) { minus = '-'; }
	i = Math.abs(i);
	var n = new String(i);
	var a = [];
	while(n.length > 3){
		var nn = n.substr(n.length-3);
		a.unshift(nn);
		n = n.substr(0,n.length-3);
	}
	if(n.length > 0) { a.unshift(n); }
	n = a.join(delimiter);
	
	amount = n;
	amount = minus + amount;
	
	return amount;
}
function convertToTwoDigitFormat(number){
	if(isNOE(number)) return "00";
	if(number<10) return ("0"+number);
	else return (""+number);	
}
//check data type
function isArrayType(variable){
	if( Object.prototype.toString.call(variable) === '[object Array]') return true;
	else return false;	
}
function isObjectType(variable){
	if( Object.prototype.toString.call(variable) === '[object Object]') return true;
	else return false;	
}
function isStringType(variable){
	if( Object.prototype.toString.call(variable) === '[object String]') return true;
	else return false;	
}
function isDateType(variable){
	if( Object.prototype.toString.call(variable) === '[object Date]') return true;
	else return false;	
}
function isFunctionType(variable){
	if( Object.prototype.toString.call(variable) === '[object Function]') return true;
	else return false;	
}
/*
 * from '5' to '005'
 */
function padStr(str, max) {
	str = str.toString();
	return str.length < max ? padStr("0" + str, max) : str;
}
function removePrefixZero(str){
	if(str.substring(0,1)=="0") str=str.substring(1,str.length);
	return str;
}
/*
 * convert string or numeric to string as index (for object)
 * useage:
 * objData[toId(index)]="something";
 */
function toId(str){
	if(typeof(str)==="undefined" || str==='' || str===null) return null;
	if( Object.prototype.toString.call(str) === '[object String]') str=""+str;
	str=str.replace(/\s/g, '');
	str=str.toLowerCase();
	return str;
}
function toStr(variable){
	if(typeof(str)==="undefined" || str==='' || str===null) return "";
	else if( Object.prototype.toString.call(variable) === '[object String]') return variable;
	else return JSON.stringify(variable);
}
function toInt(variable){
	if(isNOE(variable) || typeof(variable)==='NaN') return 0;
	else return parseInt(variable);
}
function toFloat(variable){ //defaul float is in 2 decimal, as used for currency in most cases
	if(isNOE(variable) || typeof(variable)==='NaN') return 0.00;
	else return parseFloat(variable);
}
function toFixedFloat(variable, decimal){ //defaul float is in 2 decimal, as used for currency in most cases
	if(isNOE(variable) || typeof(variable)==='NaN'){
		return 0.00;
	}
	else{
		if(isNOE(decimal) || typeof(decimal)==='NaN') decimal=2;
		variable=toFloat(variable);
		return toFloat((variable.toFixed(decimal)));
	}
}
function toTitleCase(str){
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
////===================================================================================================Format Related, end
function Section_Miscellaneous____________________________________________(){};
////===================================================================================================Miscellaneous, start (sorted by alphabet)
function addTimeMarkIntoFileName(strFileName){
	if( (typeof(strFileName)==="undefined" || strFileName === null || strFileName === "") ) return "";
	var stFileNameWithoutExtension	=getFileWithoutExtension(strFileName);
	var stFileExtension				=getFileExtension(strFileName, false);
	var stNumericTimeMark			=getNumericTimeMarkForFileName();
	return (stFileNameWithoutExtension+'_'+stNumericTimeMark+'.'+stFileExtension);	
}
function addSpaceToCamelCase(stValue){
	if(( Object.prototype.toString.call(stValue) !== '[object String]')) return "";
	return stValue
	    // insert a space before all caps
	    .replace(/([A-Z])/g, ' $1')
	    // uppercase the first character
	    .replace(/^./, function(str){ return str.toUpperCase(); });
}
function checkFeatureEnabled(featureFieldId){
	var objContext = nlapiGetContext();
	var feature = objContext.getFeature(featureFieldId);
	if ( feature ) return true;
	else return false;
}
function cleanArray(dirtyArray){
	var newArray = [];
	for(var i = 0; i < dirtyArray.length; i++)
		if (dirtyArray[i]) newArray.push(dirtyArray[i]);
	return newArray;
}
function cloneArr(arr) {
	if(( Object.prototype.toString.call(arr) !== '[object Array]')) return [];
	return arr.slice(0);
}
////clone the object and return a copy
function cloneObj(obj) {
	// Handle the 3 simple types, and null or undefined
	if (null == obj || "object" != typeof obj) return obj;	
	// Handle Date
	if (obj instanceof Date) {
	    var copy = new Date();
	    copy.setTime(obj.getTime());
	    return copy;
	}	
	// Handle Array
	if (obj instanceof Array) {
	    var copy = [];
	    for (var i = 0, len = obj.length; i < len; i++) {
	        copy[i] = cloneObj(obj[i]);
	    }
	    return copy;
	}	
	// Handle Object
	if (obj instanceof Object) {
	    var copy = {};
	    for (var attr in obj) {
	        if (obj.hasOwnProperty(attr)) copy[attr] = cloneObj(obj[attr]);
	    }
	    return copy;
	}	
	throw new Error("Unable to copy obj! Its type isn't supported.");
}
function combineArrayOfObject(arrBaseSet, arrToCombineSet){
	if(typeof(arrBaseSet)=="undefined" || arrBaseSet==null || arrBaseSet=="") arrBaseSet=[];
	if(typeof(arrToCombineSet)=="undefined" || arrToCombineSet==null || arrToCombineSet=="") arrToCombineSet=[];

	if(arrBaseSet && arrBaseSet.length==0) return arrToCombineSet;
	if(arrToCombineSet && arrToCombineSet.length==0) return arrBaseSet;

	var arrCombinedSet = [];
	
	for(var i=0;i<arrBaseSet.length;i++){
		var objBase = arrBaseSet[i];
		
		for(var j=0;j<arrToCombineSet.length;j++){
			var objToCombine = arrToCombineSet[j];
			
			var objCombined = {};
			for(var key in objBase){
				objCombined[key] = objBase[key];
			}
			for(var key in objToCombine){
				////do NOT overwrite the key in objBase saved above
				if(typeof(objCombined[key])=="undefined" || objCombined[key]==null || objCombined[key]==""){
					objCombined[key] = objToCombine[key];
				}
			}
			arrCombinedSet.push(objCombined);
		}
	}
	return arrCombinedSet;
}
function createObjCssJs(stUrl,stName,blToAppend,blToCloneAndAppend){
	return {
			url:stUrl,
			name:stName,
			toAppend: blToAppend,////append a copy to the conainer's header
			toCloneAndAppend: blToCloneAndAppend////keep a copy where this css or js was, and append a clone to the conainer's header
	};
}
/*
 * The purpose of this script is search value from the array
 * do NOT use this if the array is large, because NetSuite scripts will be slow to process this
*/
function inArray(val, arr){	
    var bIsValueFound = false;	    
    for(var i = 0; i < arr.length; i++){
        if(val == arr[i]){ bIsValueFound = true; break; }
    }    
    return bIsValueFound;
}
function getImageNewSize(img_width, img_height, maxImgWidth, maxImgHeight){
	var finalSizeObj=new Object();
	if( !isNOE(img_width) && !isNOE(img_height) ){
		var ratio = parseFloat(img_width)/parseFloat(img_height);
		if(ratio >=1){////width is greater or equal to height
			if(parseFloat(img_width) > parseFloat(maxImgWidth)){
				img_height=parseFloat(maxImgWidth)/parseFloat(img_width)*parseFloat(img_height);
				img_width=parseFloat(maxImgWidth);
			}
		}
		else{
			if(parseFloat(img_height) > parseFloat(maxImgHeight)){
				img_width=parseFloat(maxImgHeight)/parseFloat(img_height)*parseFloat(img_width);
				img_height=parseFloat(maxImgHeight);
			}
		}		
		finalSizeObj.width=parseInt(img_width);
		finalSizeObj.height=parseInt(img_height);
	}
	else{
		finalSizeObj.width=maxImgWidth;
		finalSizeObj.height=maxImgHeight;
	}
	return finalSizeObj;
}

function getTimeMarkForFileName(){
	var monthname=new Array("January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December");
	var time=new Date();	
	var time_mark=monthname[time.getMonth()]+"_"+padStr(time.getDate(), 2)+"_"+time.getFullYear()+"-"+padStr(time.getHours(), 2)+"_"+padStr(time.getMinutes(), 2)+"_"+padStr(time.getSeconds(), 2);
	return time_mark;
}
function getNumericTimeMarkForFileName(){
	var time=new Date();
	var time_mark="-"+time.getFullYear()+"_"+padStr(time.getMonth()+1, 2)+padStr(time.getDate(), 2)+"_"+padStr(time.getHours(), 2)+padStr(time.getMinutes(), 2)+padStr(time.getSeconds(), 2);
	return time_mark;
}
function getFormatMDYForTime(){
	var monthname=new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
	var time=new Date();
	var time_mark=monthname[time.getMonth()]+"-"+padStr(time.getDate(), 2)+"-"+time.getFullYear();
	return time_mark;
}
function getNumericFormatMDYForTime(time){
	var current_time_mdy=padStr(time.getMonth()+1, 2)+"/"+padStr(time.getDate(), 2)+"/"+time.getFullYear();
	return current_time_mdy;
}
function getNumericFormatMDYForCurrent(){
	var time=new Date();
	var current_time_mdy=padStr(time.getMonth()+1, 2)+"/"+padStr(time.getDate(), 2)+"/"+time.getFullYear();
	return current_time_mdy;
}
/*
 * return the file name part before file extension. e.g. "ES_FILE_NAME.css" -> "ES_FILE_NAME"
 */
function getFileWithoutExtension(strFileName){
	if( (typeof(strFileName)==="undefined" || strFileName === null || strFileName === "") ) return "";
	var arrFileName=strFileName.split(".");
	if(arrFileName.length>1){
		var positionToSLice=strFileName.length-arrFileName[arrFileName.length-1].length-1;
		if(positionToSLice>=0) return (strFileName.slice(0, positionToSLice));
	}
	return "";
}
/*
 * return file extension. e.g. "css", "js", "html"
 * in Lower Case!
 */
function getFileExtension(strFileName, isInLowerCase){
	if( (typeof(strFileName)==="undefined" || strFileName === null || strFileName === "") ) return "";
	if( (typeof(isInLowerCase)==="undefined" || isInLowerCase === null || isInLowerCase === "") ) isInLowerCase=true;
	var arrFileName=strFileName.split(".");
	if(arrFileName.length>1) return (isInLowerCase) ? (arrFileName[arrFileName.length-1].toLowerCase()) : (arrFileName[arrFileName.length-1]);
	else return "";
}
function getLink(stURL, stContent, stExtraTag, isOpenNewWindow){
	if(isNOE(stExtraTag)) stExtraTag='';
	if(isNOE(isOpenNewWindow)) isOpenNewWindow=true;
	var stTargetTag=(isOpenNewWindow) ? "target='_blank'" : '';	
	if(isNOE(stURL)) return '';
	else return "<a href='"+stURL+"' "+stTargetTag+" "+stExtraTag+">"+stContent+"</a>";
}
function getURLParameter(url, name ){
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( url );
	if( results == null ) return "";
	else return results[1];
}
function objSize(obj) {
    return Object.keys(obj).length;
}
function refreshWindow(){
	window.location.reload();
}
////print all contents in the object o, except the functions
function ObjToSource(o, level, stTag){
	if(!o) return 'null';
	if(!level) level=0;
	if(!stTag) stTag="\n";
	if(typeof(o) == "object"){
		if(!ObjToSource.check) ObjToSource.check = new Array();
		for(var i=0, k=ObjToSource.check.length; i<k ; ++i){
			if(ObjToSource.check[i] == o){return '{}';}
		}
		ObjToSource.check.push(o);
	}
	var k="",str="",linebreak="",space="",na=typeof(o.length)==="undefined"?1:0;
	if(level==0) linebreak="==========================================="+stTag;
	
	for(var i=0;i<level;i++) space+="--";
	for(var p in o){
		if(na) k = linebreak+space+"'"+p+ "':";
		if(typeof o[p] == "string") str += k + "'" + o[p]+"',"+stTag;
		else if(typeof o[p] == "object") str += k + ObjToSource(o[p],level+1)+","+stTag;
		else if(typeof o[p] == "function") str += k;
		else str += k + o[p] + ","+stTag;
	}
	if(typeof(o) == "object") ObjToSource.check.pop();
	if(na) return "{"+stTag+str.slice(0,-1)+stTag+space+"}";
	else return "["+stTag+str.slice(0,-1)+stTag+space+"]";
}
////print all contents in the object o, except the functions
function ObjToSourceHTML(o, level){
	ObjToSource(o, level, "<br><br>");
}
function prepareURLForTemplate(stURL){
	if(stURL===undefined || stURL===null || stURL==="") return "";
	return stURL.replace(new RegExp("&", 'g'), "&amp;");;
}
function removeComments(stHTML){
	if(typeof(stHTML)==="undefined" || stHTML===null || stHTML==="") return "";
	stHTML=stHTML.replace(new RegExp("<!--(.*)-->", 'g'), "");
	stHTML=stHTML.replace(new RegExp("\>[\n\t ]+\<" , "g" ) , "><"); ////must remove all spaces between tags
}
function removeDoubleQuote(str){
	if( Object.prototype.toString.call(str) !== '[object String]') return "";
	return str.replace(/"/g, "'");
}
function removeSpace(str){
	if( Object.prototype.toString.call(str) !== '[object String]') return "";
	return str.replace(/\s/g, '');
}
function removeMultiSpace(str){
	if( Object.prototype.toString.call(str) !== '[object String]') return "";
	return str.replace(/\s{2,}/g, '');
}
function removeDupArrElement(array){
	var newArray = [];
	label:for (var i=0; i < array.length;i++){
		for (var j=0; j< newArray.length;j++ ) { if (newArray[j] == array[i]) { continue label; } }
		newArray[newArray.length] = array[i];
	}
	return newArray;
}
function removeEmpArrElement(array){
	for (var i=0; i < array.length;i++){
		var isToSplice=false;
		if(isNOE(array[i])) isToSplice=true;
		else if((Object.prototype.toString.call(array[i]) === '[object String]') && array[i].replace(/\s{2,}/g, '')=="") isToSplice=true;		
		if(isToSplice){ array.splice(i, 1); i--; }
	}
	return array;
}
/*
 * sort two strings by comparing each chars at same position
 * useage: 
 * var ary = ["1117", "715 aaaaaa", "667","715  a"]
 * ary.sort(sortByAlphaNum);
 */
function sortByAlphaNum(a, b) {
  function chunkify(t) {
    var tz = [], x = 0, y = -1, n = 0, i, j;
    while (i = (j = t.charAt(x++)).charCodeAt(0)) {
      var m = (i == 46 || (i >=48 && i <= 57));
      if (m !== n){ tz[++y] = ""; n = m; }
      tz[y] += j;
    }
    return tz;
  }
  var aa = chunkify(a);
  var bb = chunkify(b);
  for (var x = 0; aa[x] && bb[x]; x++) {
    if (aa[x] !== bb[x]) {
      var c = Number(aa[x]), d = Number(bb[x]);
      if (c == aa[x] && d == bb[x]) return c - d;
      else return (aa[x] > bb[x]) ? 1 : -1;
    }
  }
  return aa.length - bb.length;
}
function postProcessTrimpathPDF(stMappedHTML){
	if(stMappedHTML){
	    stMappedHTML = stMappedHTML.replace(new RegExp("&amp;", 'g'), "ampamp;"); ////preserve the &amp; (char of '&') by changing to a special word; or the & will be modified
	    stMappedHTML = stMappedHTML.replace(new RegExp(" & ", 'g'), " and ");
	    stMappedHTML = stMappedHTML.replace(new RegExp("&", 'g'), "&amp;");
	    stMappedHTML = stMappedHTML.replace(new RegExp("ampamp;", 'g'), "&amp;"); ////recover the &amp;
	}
	return stMappedHTML;	
}
function postProcessTrimpathXLS(stMappedHTML){
	if(stMappedHTML){
	    stMappedHTML = stMappedHTML.replace(/<br\/>/g,'&#10');
	}
	return stMappedHTML;	
}
function postProcessTrimpathCSV(stMappedHTML){
	if(stMappedHTML){
	    //do nothing for now
	}
	return stMappedHTML;	
}
function validateEmail(email){ 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function validateEmailArray(emailArr){
	if(isNOE(emailArr)) return [];
	var validatedEmailArr=[];
	for(var i=0;i<emailArr.length;i++){
	var email=emailArr[i];
	  if(validateEmail(email)) validatedEmailArr.push(email);
	}
	return validatedEmailArr;
}
////===================================================================================================Miscellaneous, end (sorted by alphabet)
function Section_Miscellaneous_for_NetSuite____________________________________________(){};
////===================================================================================================Miscellaneous for NetSuite, start (sorted by alphabet)
/*
 * return the first accounting period's internalid for the give date
 */
function getAccountPeriodForDate(stDate){
	if(stDate==undefined || stDate==null || stDate=="") return null;
	var results = nlapiSearchRecord('accountingperiod', null, 
			[
			 ['isyear', 'is', 'F'], 'and',
	         ['isquarter', 'is', 'F'], 'and',
	         ['enddate', 'onorafter', stDate], 'and',
	         ['startdate', 'onorbefore', stDate]
			]
			, [new nlobjSearchColumn('internalid')]);
		
	return (results && results[0])?results[0].getId():null;
}
/**notice:
1) not recommended, because now NS has two servers, regualr one and the new with na1
*/
function getCurrentNSDomain(){
	var ctxObj = nlapiGetContext();
	var ctxObjEnv = ctxObj.getEnvironment();
	var nsEnv =   (ctxObjEnv == 'PRODUCTION') ? 'https://system.na1.netsuite.com' 
				: (ctxObjEnv == 'SANDBOX') ? 'https://system.sandbox.netsuite.com'
				: (ctxObjEnv == 'BETA') ? 'https://system.beta.netsuite.com'
			   	:  'https://system.beta.netsuite.com';
	return nsEnv;
}
/**notice:
1)SERVER script only
2)this script takes some usage, so better use this in one-time setup script. Current Usage: 10+5+10*2=35
3)this script try to pin current parent script file url with different domains, the working one is the valid domain
*/
function getNSDomainServer(){
	var objContext = nlapiGetContext();
	var stEnvironment = objContext.getEnvironment();
	var arrServerIdSet=["",".na1"];
	var stNSstEnvironment = (stEnvironment=='SANDBOX') ? '.sandbox' : (stEnvironment=='BETA') ? '.beta' : '';////'' is for Production
	var arrNSDomainSet=[];
	for(var i=0;i<arrServerIdSet.length;i++) arrNSDomainSet.push('https://system'+arrServerIdSet[i]+stNSstEnvironment+'.netsuite.com');
	
	var results = nlapiSearchRecord('script',null,[['scriptid','is',objContext.getScriptId()]],[new nlobjSearchColumn('scriptfile')]);////usage: 10
	var stScriptFileInid=(results && results.length>0) ? results[0].getValue('scriptfile') : null;
	if(stScriptFileInid==null) return "";
	var stScriptFileUrl=nlapiLookupField("file", stScriptFileInid,"url");////Usage 5
	
	for(var i=0;arrNSDomainSet && i<arrNSDomainSet.length;i++) {
		try{
			stNSDomain=arrNSDomainSet[i];
			//nlapiLogExecution("DEBUG", "stURL", "@i:"+i+"||stURL:"+stURL);
			var objFileLoaded=nlapiLoadFile(stNSDomain+stScriptFileUrl);////Usage 10 per i
			break;
		}
		catch(error){/**do nothing*/}
	}
	return stNSDomain;
}
/**notice:
1)SERVER script only
*/
function getFileFullURL(fileId){
	var fileURL = '';
	try{
		fileURL = getCurrentNSDomain() + nlapiLookupField("file", fileId,"url");
	}
	catch(ex){
		fileURL = '';
	}
	return fileURL;
}
function getCurrFunctionName(){
   var stCurrFunctionName = arguments.callee.toString();
   stCurrFunctionName = stCurrFunctionName.substr('function '.length);
   stCurrFunctionName = stCurrFunctionName.substr(0, stCurrFunctionName.indexOf('('));
   return stCurrFunctionName;
}
/*
* returns an array of objects. Each object contains all columns of one result data
*/
function getSavedSearch(type, searchID, filters, columns){
	var results = nlapiSearchRecord(type, searchID, filters, columns);
	var arrResults = [];
	if(results && results.length>0){
		var columns=results[0].getAllColumns();		
		for ( var i = 0; results != null && i < results.length; i++ ){
			var result = results[i];		
			var objData = new Object();	
			
			for(var j=0;j<columns.length;j++){
				var stLabel=columns[j].label;
				var stName=columns[j].name;
				var stKey=stLabel ? stLabel : stName;
				stKey=removeSpace(stKey);
		
				objData[stKey]=result.getValue(columns[j]);
				if(result.getText(columns[j])) objData[stKey+'_t']=result.getText(columns[j]);
			}			
			arrResults.push(objData);
		}//for ( var i = 0; results != null && i < results.length; i++ )
	}
	return arrResults;
}
/*
 * search the Script Deployments's internalid by given a Script ID, or a Deployment's ID
 * e.g. given ('customscript_es_sog_sl_script_log_viewer', null), return ["41", "45"]
 * e.g. given ('customscript_es_sog_sl_script_log_viewer', 'customdeploy_es_sog_sl_script_log_viewer'), return  ["45"]
 * e.g. given (null, 'customdeploy_es_sog_sl_script_log_viewer') return  ["45"]
 */
function getScriptDeploymentInternalID(SciptID, DeploymentID){
	var filters=[['script.scriptid','is',SciptID]];
	if(DeploymentID){
		if(filters && filters.length>0) filters.push('AND');
		filters.push(['scriptid','is',DeploymentID]);
	}
	var columns = [new nlobjSearchColumn('internalid')];
	var results = nlapiSearchRecord('scriptdeployment',null,filters,columns);
	var arrInternalid=[];
	if(results && results.length>0) for(var i=0;i<columns.length;i++) arrInternalid.push(results[i].getValue('internalid'));
	return arrInternalid;
}
/*
 * search the Script's internalid by given a Script's script id
 * e.g. given 'customscript_es_sog_sl_script_log_viewer', return 49
 */
function getScriptInternalID(SciptID){
	var filters=[['scriptid','is',SciptID]];
	var columns = [new nlobjSearchColumn('internalid')];
	var results = nlapiSearchRecord('script',null,filters,columns);
	var arrInternalid=[];
	if(results && results.length>0) for(var i=0;i<columns.length;i++) arrInternalid.push(results[i].getValue('internalid'));
	return arrInternalid;
}
function insertSelectOption(fld, objSelArr, idName, valueName){
	if(!isNOE(objSelArr)){
		for ( var i = 0; objSelArr != null && i < objSelArr.length; i++ ){
			var objSel = objSelArr[i] ;
		    var id	 = objSel[idName];
		    var name = objSel[valueName];
			nlapiInsertSelectOption(fld, id, name, false);
		}//for
	}//if(results !=null)
	else{
		nlapiInsertSelectOption(fld,'(No Data)', '(No Data)', false);
	}//if(results !=null)
}
/*
 * load single file at a time, and then append to the header
 */
function lazyLoadJcCssFile(filename, filetype){
	var fileref="";
	if(filetype=="js"){ //if filename is a external JavaScript file
		fileref=document.createElement('script');
		fileref.setAttribute("type","text/javascript");
		fileref.setAttribute("src", filename);
	}
	else if (filetype=="css"){ //if filename is an external CSS file
		fileref=document.createElement("link");
		fileref.setAttribute("rel", "stylesheet");
		fileref.setAttribute("type", "text/css");
		fileref.setAttribute("href", filename);
	}
	if(typeof(fileref)!="undefined") document.getElementsByTagName("head")[0].appendChild(fileref);
}
function search(options){
	if (isNOE(options.type) && isNOE(options.search)) throw nlapiCreateError('REQD_PARM_MISS', 'Params type and search cannot be both empty!');
	if (isNOE(options.replaceColumns)) options.replaceColumns = false;
	if (isNOE(options.getAll)) options.getAll = false;
	if (isNOE(options.maxResult)) options.maxResult = 1000;
	if (isNOE(options.filters)) options.filters = new Array();
	if (isNOE(options.columns)) options.columns = new Array();
	var objSearch=null;
	//sl("search starts--------------------------------");
	if (isNOE(options.search))
	{
	    objSearch = nlapiCreateSearch(options.type, options.filters, options.columns);
	
	    if(!isNOE(options.filterExp))
	    {
	        objSearch.setFilterExpression(options.filterExp);
	    }
	}
	else
	{
	    objSearch = nlapiLoadSearch(options.type, options.search);
	    for ( var i in options.filters)
	    {
	        if (!isNOE(options.filters[i])) {
	            objSearch.addFilter(options.filters[i]);
	        }
	    }
	
	    if(!isNOE(options.filterExp))
	    {
	        objSearch.setFilterExpression(options.filterExp);
	    }
	    
	    if(options.replaceColumns)
	    {
	        objSearch.setColumns(options.columns);
	    }
	    else
	    {
	        for ( var i in options.columns)
	        {
	            objSearch.addColumn(options.columns[i]);
	        }
	    }
	}
	
	var objResultSet = objSearch.runSearch();
	var arrResults = new Array();
	
	for ( var idx = 0;; idx++)
	{
	    var bLastIteration = false;
	    var iLastIndexToGet = (1000 * idx) + 1000;
	    if (!options.getAll && iLastIndexToGet > options.maxResult)
	    {
	        bLastIteration = true;
	        iLastIndexToGet = options.maxResult;
	    }
	
	    var arrCurResults = objResultSet.getResults(1000 * idx, iLastIndexToGet);
	
	    if (isNOE(arrCurResults))
	        break;
	
	    if (arrCurResults.length==0)
	        break;
	
	    arrResults = arrResults.concat(arrCurResults);
	
	    if (bLastIteration)
	        break;
	}
	
	if (options.funcSort instanceof Function)
	{
	    arrResults = arrResults.sort(options.funcSort);
	}
	return arrResults;
}
////===================================================================================================Miscellaneous for NetSuite, end (sorted by alphabet)

