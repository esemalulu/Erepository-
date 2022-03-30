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
define(['./dic.cs.util.string'],

function(dicUtilString) {
	/**
     * Determin url exclude querystring from url taskbar
     * 
     */
    function _getUrlExcludeQueryString(){
    	
    	if(window && window.location){
    		return window.location.protocol +
    			  "//" +//[http|https]:// 
    			  window.location.hostname + 
    			  window.location.pathname;
    	};
    	return null;
    }
    /**
     * Build a full url from absolute url with list querystring not including in exclude
     * Scope: ClientScript
     */
    function buildUrl(url, query, exclude){
    	url = url || _getUrlExcludeQueryString();
    	exclude = exclude || [];
    	query = query || {};
    	var addAmp= true;
    	if (url.indexOf("?") < 0){
    		url += "?";
    		addAmp =  false;
    	}
    	
       	for(var key in query){
    		if (exclude.indexOf(key)>= 0 || !query[key]) continue;
    		
    		if(addAmp) url += '&';
    		addAmp = true;
    		url += key + '=' + query[key];
    	}
    	return encodeURI(url);

    }
    
    
    /**
     * add querystring {ps}pagesize and {cp} current page
     * @param {String} url: url
     * @param {Numeric} ps|:pagesie
     * @param {Numeric} cp: current page
     */
    function buidlUrlPaging(url, cp){
    	return encodeURI(dicUtilString.stringFormat(url +"&cp={1}",ps,cp));
    }
    
    /**
     * Parse query tring to JSON
     * Implemented as the following link
     * http://stackoverflow.com/questions/8648892/convert-url-parameters-to-a-javascript-object
     */
    function parseQueryString(url){
    	var obj = {}; 
    	url.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
    	    obj[decodeURIComponent(key)] = decodeURIComponent(value);
    	}); 
    	return obj;
    }
    
    function buildUrlObjQuery(url, objQuery){
    
    	url = url || _getUrlExcludeQueryString();
    	
    	var addAmp = true;
    	if (url.indexOf("?") < 0){
    		url += "?";
    		addAmp =  false;
    	}
    	
    	Object.keys(objQuery).forEach(function(val){
    	
    		if (addAmp === true){
    			url+="&";
    		}else{
    			addAmp = true;
    		}
    		url += decodeURIComponent(val) +"=" + decodeURIComponent(objQuery[val]);
    	});
    	
    	return url;
    }
    /**
     * hook point
     */
    return {
    	buildUrl: buildUrl,
    	buidlUrlPaging: buidlUrlPaging,
    	buildUrlObjQuery: buildUrlObjQuery,
    	parseQueryString:parseQueryString
    };
    
});
