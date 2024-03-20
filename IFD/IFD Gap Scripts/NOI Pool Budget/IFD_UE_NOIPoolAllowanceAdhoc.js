/**
 * Copyright (c) 1998-2020 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 * 
 * Version		Type    	Date            Author           		Remarks
 * 1.00    		Create  	22 Jan 2020		CMargallo				
 * 1.01			Update 		28 Feb 2020		CMargallo				Added retries and delay in calling M/R script.
 * 1.02         Update      09 Apr 2020     PRies                   Added random 1-15 second delay when calling the MR, for fewer simultaneous calls
 */

/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/task', 'N/runtime', 'SuiteScripts/IFD Gap Scripts/NOI Pool Budget/IFD_LIB_NOIFunctions'],

function(NS_Task, NS_Runtime, NS_IFDLibrary) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) 
    {
    	var stMethodName = 'afterSubmit';
    	log.debug(stMethodName, ' - Entry -');
    	try
    	{ 
    		if (scriptContext.type != scriptContext.UserEventType.CREATE)
    		{
    			log.debug(stMethodName,'User Event Type is not CREATE.');
    			return;
			}
			
			// v1.02 added
			NS_IFDLibrary.randomDelay();
    		
    	    if (NS_IFDLibrary.getNOIMRScriptRunning() > 0)
    	    {
    	        log.debug(stMethodName,'M/R Already Running');
    	    }
    	    else
    	    {
    	    	var objScript = NS_Runtime.getCurrentScript();
    	    	var stScriptRec = objScript.getParameter({name: 'custscript_ue_ifd_mr_noi_script_record'});
    	    	
    	    	if (stScriptRec)
    	    	{					
					// V.1.01 START
    	    		NS_IFDLibrary.callMapReduce({
    	    			scriptid : stScriptRec
    	    		});
    	    		// V.1.01 END
    	    	}
    	    	else
    	    	{
    	    		log.error(stMethodName, 'Missing Script Parameter.');
    	    	}
    	    }
    	}
    	catch(error)
		{
			var stError = error.name+' : '+error.message;
			log.error(stMethodName, 'Catch : ' + stError);
		}
    	finally
    	{
    		log.debug(stMethodName, ' - Exit -');
    	}
    }

    return {
        afterSubmit: afterSubmit
    };
    
});
