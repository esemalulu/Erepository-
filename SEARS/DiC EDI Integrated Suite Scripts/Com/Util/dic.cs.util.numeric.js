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
define([],

function() {
    /**
     *parse a string to int in radix decimal
     *@param {String} a string need to convert to numeric
     *@param {Numeric} a default value when convert failed 
     */
    
    function tryParseInt(str, defaultVal){
    	defaultVal = defaultVal || 0;
    
    	if (/^\d+$/g.test(str) === true && str.length < 9)
    		return parseInt(str);
   		return defaultValue;
    }
    
    
    /**
     *The entry points
     */
    
    return {
    	tryParseInt: tryParseInt
    };
    
});
