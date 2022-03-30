/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       04 May 2016     bfeliciano	   initial
 * 1.10       18 May 2016     mjpascual        Suitescipt v.2
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/error'],
    function (record, runtime, error)
    {
        function beforeSubmit_resetItemSync(context)
        {
        	try
    		{
        		var stLogTitle = 'beforeSubmit_resetItemSync';
    			log.debug(stLogTitle, '>> Entry Log <<');
    			log.debug(stLogTitle, 'context.type = ' + context.type + ' | runtime.executionContext = ' + runtime.executionContext);

    			if (runtime.executionContext != runtime.ContextType.USER_INTERFACE)
    			{
    				return true;
    			}
    			
    			if (context.type != context.UserEventType.CREATE && context.type != context.UserEventType.COPY && context.type != context.UserEventType.EDIT )
    			{
    				return true;
    			}
    			
    			//Role checking
    			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role');
    			var objUser = runtime.getCurrentUser();
    			
    			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
    			if(objUser.role == stRestrictedRole)
    			{
    				log.debug(stLogTitle, 'exiting...');
    				return;
    			}
    			
    			var rec = context.newRecord;
    			rec.setValue('custitem_synced', false);
    			log.debug(stLogTitle, 'custitem_synced = false');
    			
    			return true;
    		}
    		catch (e)
    		{
    			if (e.message != undefined)
    			{
    				log.error('ERROR' , e.name + ' ' + e.message);
    				throw e.name + ' ' + e.message;
    			}
    			else
    			{
    				log.error('ERROR', 'Unexpected Error' , e.toString()); 
    				throw error.create({
    					name: '99999',
    					message: e.toString()
    				});
    			}
    		}
    		finally
    		{
    			log.debug(stLogTitle, '>> Exit Log <<');
    		}

        }
       
	    return {
	        beforeSubmit: beforeSubmit_resetItemSync
	    };
});

