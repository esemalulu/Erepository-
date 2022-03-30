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
	 * methods of util
	 */
    function validateRequire(value, fieldName) {
        if (!value) {
        	var err = new diError.DiError(diMess.ERR.REQUIRED.Code,	
        			dicUtilString.stringFormat(diMess.ERR.REQUIRED.Message, fieldName));
            throw err;
        }
        return true;
    }
	/**
	 * Define entry point module
	 */
    return {
    	validateRequire: validateRequire
    };
    
});
