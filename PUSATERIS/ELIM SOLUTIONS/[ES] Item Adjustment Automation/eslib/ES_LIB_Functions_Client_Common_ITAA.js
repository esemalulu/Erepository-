/*thisifilename="ES_LIB_Functions_Client_Common.js";*/
/**************** This is for Common Functions, Client Side only***********************/
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.030      May 27, 2015     richard@elimsolutions.ca	
 * Modified:
 * 1) updated getFormatMDYForTime, getNumericFormatMDYForTime, getNumericFormatMDYForCurrent
 */
function Section_Browser_Compatibility____________________________________________(){};
////===================================================================================================Browser Compatibility, start (must be place at beginning)
if(!(window.console && console.log)){////patch for IE
  console = {
	log: function(){},
	debug: function(){},
	info: function(){},
	warn: function(){},
	error: function(){}
  };
}
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
	if(variable===null)		return true;
	else if(typeof(variable)==="undefined")	return true; 
	else if(variable==="")	return true;
	else if(variable===0)	return false;
	
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
////client side log. First exam if current browser support the console.log. IE does not
function cl(message){
	if(window.console) console.log(message);
}
function cel(error){
	var message=getErrorMessage(error);
	if(window.console) console.log(message);
	else alert(message);
}
function dc(message, isDebugMode){
	if(typeof(isDebugMode)==="undefined" || isDebugMode==='' || isDebugMode===null) return;
	if(!isDebugMode) return;
	if(window.console) console.log(message);
}
function getErrorMessage(error){
	if( Object.prototype.toString.call(error) === '[object Error]'){
		var message="Error:";
		if(error.stack) message+="stack: "+error.stack+"\n";
		if(error.message) message+="message: "+error.message+"\n";
		return message;
	}
	else if( Object.prototype.toString.call(error) === '[object String]'){
		return error;
	}
	else{
		return JSON.stringify(error);
	}
}
////===================================================================================================Log Related, end
function Section_Time_Related____________________________________________(){};
////===================================================================================================Time Related, start
function SecondstoHHMMSS(sec) {
	var sec_num = parseInt(sec, 10); // don't forget the second parm
	var hours   = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = sec_num - (hours * 3600) - (minutes * 60);

	if (hours   < 10) {hours   = "0"+hours;}
	if (minutes < 10) {minutes = "0"+minutes;}
	if (seconds < 10) {seconds = "0"+seconds;}
	var time    = hours+':'+minutes+':'+seconds;
	return time;
	}
////===================================================================================================Time Related, end
function Section_Format_Related____________________________________________(){};
////===================================================================================================Format Related, start
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
////===================================================================================================Format Related, end
function Section_Miscellaneous____________________________________________(){};
////===================================================================================================Miscellaneous, start (sorted by alphabet)
function addEvent(obj, evType, fn){
	if(obj.addEventListener){
		obj.addEventListener(evType, fn,false);
		return true;
	}
	else if (obj.attachEvent){
		var r = obj.attachEvent("on"+evType, fn);
		return r;
	}
	else {
		return false;
	}
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

////The purpose of this script is search value from the array
function inArray(val, arr){	
    var bIsValueFound = false;	    
    for(var i = 0; i < arr.length; i++){
        if(val == arr[i]){ bIsValueFound = true; break; }
    }    
    return bIsValueFound;
}
/**notice:
1)CLIENT script only
*/
function getDomainClient(){
	return document.location.protocol + "//" + document.location.host;
}
function getLink(stURL, stContent, stExtraTag, isOpenNewWindow){
	if(isNOE(stExtraTag)) stExtraTag='';
	if(isNOE(isOpenNewWindow)) isOpenNewWindow=true;
	var stTargetTag=(isOpenNewWindow) ? "target='_blank'" : '';
	
	if(isNOE(stURL)) return '';
	else return "<a href='"+stURL+"' "+stTargetTag+" "+stExtraTag+">"+stContent+"</a>";
}
function getThisBrowserName(){	
	if(navigator.appName == "Microsoft Internet Explorer") return "msie";//IE	
	if((navigator.userAgent.toLowerCase().indexOf('chrome') > -1) && (navigator.userAgent.toLowerCase().indexOf('safari') > -1) && (navigator.appName == "Netscape")) return "chrome"; //Chrome
	if((navigator.userAgent.toLowerCase().indexOf('firefox') > -1) && (navigator.appName == "Netscape")) return "firefox"; //Firefox
	if((navigator.userAgent.toLowerCase().indexOf('safari') > -1) && !(navigator.userAgent.toLowerCase().indexOf('chrome') > -1) && (navigator.appName == "Netscape")) return "safari"; //Safari
	if(navigator.appName == "Opera") return "opera"; //Opera
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
function getURLParams(){
	////get an object of all params from the url
	var query_string = {};
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		// If first entry with this name
		if (typeof query_string[pair[0]] === "undefined"){
			query_string[pair[0]] = pair[1];
		}
		// If second entry with this name
		else if (typeof query_string[pair[0]] === "string"){
			var arr = [ query_string[pair[0]], pair[1] ];
			query_string[pair[0]] = arr;
		}
		// If third or later entry with this name
		else {
			query_string[pair[0]].push(pair[1]);
		}
	}
    return query_string;
}
/*
 * use createObjCssJs() function to define a group of JS and CSS files to load, then use this funciton to do the append process
 * use isToParentWindow to determine which header to go, current window OR parent window (if in iframe)
 * able to append (move file to the header), able to clone and then append (move a copy file to the header) 
 */
function lazyAppendJsCss(isToParentWindow){
	if(typeof(isToParentWindow)==="undefined" || isToParentWindow===null || isToParentWindow==="") isToParentWindow=true;
	////----------------------------------------------------define which header to go	
	var jQuery_Header = (isToParentWindow) ? jQuery("head",top.document) : jQuery("head");
	////----------------------------------------------------1: append a clone of the content by finding elements marked as 'toAppend'
	var toAppend=jQuery("link.toAppend");
	if(toAppend!=null && toAppend!="") toAppend.appendTo(jQuery_Header);
	var toAppend=jQuery("script.toAppend");
	if(toAppend!=null && toAppend!="") toAppend.appendTo(jQuery_Header);
	////----------------------------------------------------2: append the content itself by finding elements marked as 'toCloneAndAppend'
	var toAppend=jQuery("link.toCloneAndAppend");
	if(toAppend!=null && toAppend!="") toAppend.clone().appendTo(jQuery_Header);
	var toAppend=jQuery("script.toCloneAndAppend");
	if(toAppend!=null && toAppend!="") toAppend.clone().appendTo(jQuery_Header);
}
/*
 * define JS and/or CSS in fields, then use this function to append them to the header
 * use isToParentWindow to determine which header to go, current window OR parent window (if in iframe
 */
function lazyAppendJsCssFromFields(cssFieldId, jsFieldId, isToParentWindow){
	if(typeof(cssFieldId)==="undefined" || cssFieldId===null || cssFieldId==="" ) cssFieldId=null;
	if(typeof(jsFieldId)==="undefined" || jsFieldId===null || jsFieldId==="" ) jsFieldId=null;
	if(typeof(isToParentWindow)==="undefined" || isToParentWindow===null || isToParentWindow==="") isToParentWindow=true;
	////----------------------------------------------------define which header to go	
	var jQuery_Header = (isToParentWindow) ? jQuery("head",top.document) : jQuery("head");
	////----------------------------------------------------1: append by finding specified NetSuite fields'contents
	if(cssFieldId!=null){
		var headLast=jQuery_Header.find("link[rel='stylesheet']:last");
		if(headLast!=null && headLast!="") headLast.after( jQuery("#"+cssFieldId).val() );
	}
	if(jsFieldId!=null){
		var headLast=jQuery_Header.find("script:last");
		if(headLast!=null && headLast!="") headLast.after( jQuery("#"+jsFieldId).val() );
	}
}
/*
 * Sample Codes:
var arrFiles = new Array();
arrFiles[0] = ['scripts','https://system.netsuite.com/core/media/media.nl?id=5530&c=807082&h=458a791526067f6840b5&_xt=.js']; // JQuery
arrFiles[1] = ['links','https://system.netsuite.com/core/media/media.nl?id=5504&c=807082&h=1944647ae7f646f265d3&_xt=.css'];
lazyLoad(arrFiles, 'removeFields');
*/
function lazyLoad(file_array, callback){
	//reverse the array because we pop off the file we need
	file_array.reverse();
	remaining = file_array.length;
	if(remaining > 0){
		url_array = file_array.pop();
		file_array.reverse(); //put the array back in order
		var head = document.getElementsByTagName('head')[0];
		switch(url_array[0]){
			case "scripts":
				f = document.createElement('script');
				f.type = 'text/javascript';
				f.src = url_array[1];
			break;
			case "links":
				f = document.createElement('link');
				f.rel = 'stylesheet';
				f.href = url_array[1];
			break;
		}
		head.appendChild(f);
		//if there are no more files, then do the callback
		if(remaining == 1){
			if(f.rel == 'stylesheet'){ eval(callback + "()"); }
			else{
				if (navigator.appName != 'Netscape') 
					f.onreadystatechange = function(){ if(this.readyState == 'loaded' || this.readyState == 'complete') eval(callback + "()"); };
				else 
					f.onload = function(){ eval(callback + "()"); };
			}
		}
		//if there are more files, then load them
		else{
			if(f.rel == 'stylesheet'){ lazyLoad(file_array, callback); }
			else{
				if(navigator.appName != 'Netscape') 
					f.onreadystatechange = function(){ if(this.readyState == 'loaded' || this.readyState == 'complete') lazyLoad(file_array, callback); };
				else
					f.onload = function(){ lazyLoad(file_array, callback); };
			}
		}
	}
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
function objSize(obj){
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
/*
 * this function is to remove char "&" because PDF generator will have error on it by considering & and following chars as one standard HTML Character Entity Reference (e.g. &nbsp;)
 */
function removeSpecialChars(stHTML){
	stHTML = stHTML.replace(new RegExp("&amp;", 'g'), "ampamp;"); ////preserve the &amp; (char of '&') by changing to a special word; or the & will be modified
	stHTML = stHTML.replace(new RegExp(" & ", 'g'), " and ");
	stHTML = stHTML.replace(new RegExp("&", 'g'), "&amp;");
	stHTML = stHTML.replace(new RegExp("ampamp;", 'g'), "&amp;"); ////recover the &amp;
	stHTML = stHTML.replace(new RegExp("&nbsp;", 'g'), "");
	stHTML = stHTML.replace(new RegExp("&amp;nbsp;", 'g'), "");
	return stHTML;
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
function validateEmail(email) { 
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
////-----------------------------------------------iframe height adjustment, start
function setIframeHeight(intHeightMin,intHeightExtra){
	if(typeof(intHeightMin)==="undefined" || intHeightMin===null) intHeightMin=0;
	if(typeof(intHeightExtra)==="undefined" || intHeightExtra===null) intHeightExtra=0;
	o = document.getElementsByTagName('iframe');
	for(var i=0;i<o.length;i++){
		if (/\bautoHeight\b/.test(o[i].className)){
			setHeight(o[i],intHeightMin,intHeightExtra);
			addEvent(o[i],'load', setIframeHeight);
		}
	}
}
function setHeight(e,intHeightMin,intHeightExtra){
	if(typeof(intHeightMin)==="undefined" || intHeightMin===null) intHeightMin=0;
	if(typeof(intHeightExtra)==="undefined" || intHeightExtra===null) intHeightExtra=0;
	e.height = 0;
	if(e.contentDocument){
		e.height = e.contentDocument.body.offsetHeight + intHeightExtra;
	}
	else {
		e.height = e.contentWindow.document.body.scrollHeight+intHeightExtra;
	}
	if(intHeightMin!=null && !isNaN(intHeightMin) && intHeightMin>0 && e.height<intHeightMin) e.height=intHeightMin;
}
////-----------------------------------------------iframe height adjustment, end
////===================================================================================================Miscellaneous, end (sorted by alphabet)
