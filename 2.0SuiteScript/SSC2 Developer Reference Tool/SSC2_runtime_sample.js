/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
/**
 * In NetSuite Debugger
 * 	require(['N/runtime']
 * 
 * In Normal Execution
 * 	define(['N/runtime']
 * 
 * This sample script is related specifically for N/runtime module. Includes reference to all ENUM related to this function.
 * _runtime represents module required/defined and passed in as object by NetSuite
 * 
 * This sample code is created as Scheduled Script and executed
 */
define(['N/runtime'],

function(_runtime) 
{
	/**
	 * --- RELATEd ENUM ---
	 * 
	 * _runtime.ContextType
	 *  This ENUM represents Execution Context. 
	 *  In SuiteScript 1.0, value is returned from nlapiGetContext().getExecutionContext() API Call
	 * 		CSV_IMPORT
	 * 		SUITELET
	 * 		WEBSERVICES
	 * 		CUSTOM_MASSUPDATE
	 * 		USEREVENT
	 * 		WEBSTORE
	 * 		SCHEDULED
	 * 		USER_INTERFACE
	 * 		WORKFLOW
	 * 
	 * Sample: _runtime.ContextType.USER_INTERFACE
	 */
	
	/**
	 * _runtime.EnvType
	 *  This ENUM represents NetSuite Enviornment.
	 *  In SuiteScript 1.0, value is return from nlapiGetContext().getEnvironment() API Call
	 * 		SANDBOX
	 * 		PRODUCTION
	 * 		BETA
	 * 		INTERNAL
	 * 
	 * Sample: _runtime.EnvType.SANDBOX
	 */
	
	/**
	 * _runtime.Permission
	 *  This ENUM represents NetSuite Permission value.
	 *  In SuiteScript 1.0, value is return from nlapiGetContext().getPermission() API Call
	 * 		FULL
	 * 		EDIT
	 * 		CREATE
	 * 		VIEW
	 * 		NONE
	 * 
	 * Sample: _runtime.Permission.FULL
	 */
	
	function execSchSct(context)
	{
		//-------- 1. Accessing NetSuite Account ID
		//SuiteScript 1.0
		// nlapiGetContext().getCompany()
		var accountId = _runtime.accountId;
		log.debug('Account ID/Company ID', accountId);
		
		//-------- 2. Accessing NetSuite Environment Info
		//SuiteScript 1.0
		//	nlapiGetContext().getEnvironment()
		var nsEnvType = _runtime.envType;
		log.debug('NetSuite Environment', nsEnvType);
				
		//Example usage of runtime.EnvType ENUM
		if (nsEnvType == _runtime.EnvType.PRODUCTION)
		{
			log.debug('It is Production', _runtime.EnvType.PRODUCTION);
		}
		else if (nsEnvType == _runtime.EnvType.SANDBOX)
		{
			log.debug('It is Sandbox', _runtime.EnvType.SANDBOX);
		}
		
		//-------- 3. Accessing Execution context value
		//SuiteScript 1.0
		// nlapiGetContext().getExecutionContext()
		var execContextValue = _runtime.executionContext;
		
		//Value returns _runtime.ContextType ENUM value
		log.debug('Execution Context', execContextValue);
		
		if (execContextValue == _runtime.ContextType.SCHEDULED)
		{
			log.debug('This is Scheduled Script Context',execContextValue);
		}
		
		//-------- 4. Accessing Queue Count
		//SuiteScript 1.0
		// nlapiGetContext().getQueueCount()
		var queueCount = _runtime.queueCount;
		log.debug('Queue Count', queueCount);
		
		//-------- 5. Accessing NetSuite Version
		//SuiteScript 1.0
		// nlapiGetContext().getVersion()
		var nsVersion = _runtime.version;
		log.debug('NS Version', nsVersion);
		
		//-------- 6. Accessing Currently Executing Script related runtime values
		var curScript = _runtime.getCurrentScript();
		
		//6a. Getting Script Parameter
		//SuiteScript 1.0
		//	nlapiGetContext().getSetting('SCRIPT','[Script_Param_ID]')
		/**
		 * Options for getParameter
		 * 	
		 * 		name
		 */
		var sctParamValue = curScript.getParameter({
			'name':'custscript_s86_sampeparam'
		});
		log.debug('Script Param Value', sctParamValue);
		
		//6b. Getting Remaining Usage
		//SuiteScript 1.0
		// nlapiGetContext().getRemainingUsage()
		var remainingUsage = curScript.getRemainingUsage();
		log.debug('Remaining Usage', remainingUsage);
		
		
		
		
		
		
	}
	
	//Depending on what script you are building,
	//	below section will return specific entry functions
    return {
    	execute:execSchSct
    };
    
});
