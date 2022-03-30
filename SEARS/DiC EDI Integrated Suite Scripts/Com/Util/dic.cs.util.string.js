/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 1199 NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * 

 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */
define([], DiCUtilString);


function DiCUtilString() {
	var _mod = {};
	_mod.entityMap = {
		    "&": "&amp;",
		    "<": "&lt;",
		    ">": "&gt;",
		    '"': '&quot;',
		    "'": '&#39;',
		    "/": '&#x2F;'
	};
	/**
     * simulate as String.Format function in CSharp.
     * 
     */
    _mod.stringFormat  = function(){
        // The string containing the format items (e.g. "{0}")
        // will and always has to be the first argument.

        var theString = arguments[0]; 
        
        // start with the second argument (i = 1)
        for (var i = 1; i < arguments.length; i++) {
            // "gm" = RegEx options for Global search (more than one instance)
            // and for Multiline search
            var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
            theString = theString.replace(regEx, arguments[i]);
        }
        
        return theString;
    };
    /**
     * Implemented as the following link: https://github.com/janl/mustache.js/blob/master/mustache.js#L82
     */
    _mod.escapeHtml = function(string){
    	 return String(string).replace(/[&<>"'\/]/g, function (s) {
    	      return _mod.entityMap[s];
    	    });
    };
    
    /*
     * http://www.w3schools.com/jsref/jsref_trim_string.asp
     */
    _mod.trim = function(str){
    	return str.replace(/^\s+|\s+$/gm,'');
    };
    
    return {
    	stringFormat: _mod.stringFormat,
    	escapeHtml: _mod.escapeHtml,
    	trim: _mod.trim
    };
    
};
