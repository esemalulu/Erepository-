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
define(['N/util',
        './dic.cs.util.string',
        '../dic.cs.mess',
        './dic.cs.util.date',
        '../dic.cs.dierror',
        'N/error'],

function (util,
	dicUtilString,
    diMess, 
    diUtilDate,
    diError,
    nserror) {
           
   
    /**
     * Process exception
     * @param {DiError/...} e: instance of exception, such  as DiError, Error,...
     * @param {object}: options :{
     * 	title: the title in log .
     * 
     * }
     * @returns: message is refined.
     */
    
    function processException(e, options){
    	var msgErr;
    	var titleError = options.title || "EDI Error";
    	
		switch(e.type){
			case nserror.SuiteScriptError :
				msgErr = dicUtilString.stringFormat("Name: {0}. Message: {1}.", e.name, e.message);
				break;
			case nserror.UserEventError:
				msgErr = dicUtilString.stringFormat("Name: {0}. Event type: {1}. Message: {2}", e.name, e.eventType, e.message);
				break;
		
	
    	}
    	if(!msgErr){
    		switch(e.type.toString){
    		case "DiError":
				msgErr = dicUtilString.stringFormat("Error code: {0}. Message: {1}", e.code, e.mess);
				break;
			
			default:
				msgErr = dicUtilString.stringFormat("Error: Undertermine. Message: {0}", e.toString());
				break;
    		}
    		
    	}

    	//log.error({title: titleError,details: msgErr});
    	return msgErr;
    }
         
    /**
	 * end methods of util
	 */
    
    return {
       processException: processException
       
    };

});
