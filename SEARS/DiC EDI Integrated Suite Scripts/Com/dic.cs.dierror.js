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
define(['./Util/dic.cs.util.string'],

function(dicUtilString) {
	/**
     * Define DiError class
     */
    function DiError(code, mess){
    	this.type = "DiError";
    	this.code = code;
    	this.mess = mess;
    }
    /**
     * override the method tostring to display the message for DiError class
     */
    DiError.prototype.toString =  function(){
    	return dicUtilString.stringFormat("Code: {0}. Error: {1}", this.code, this.mess);
    }
           
    return {
    	DiError: DiError
    };
    
});
