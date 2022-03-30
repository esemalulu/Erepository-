define(['N/error'],

function(_error) {
   
	/**
	 * Helper function that returns formatted Error message
	 */
	function getErrDetail(error) 
	{
		try {
			
            var errorJSON = JSON.parse(error);
            var sctCause = 'No Cause';
            if (errorJSON.type == 'error.UserEventScript' || errorJSON.type == 'error.SuiteScriptError')
            {
            	if (errorJSON.cause)
            	{
            		if (errorJSON.cause.stackTrace)
            		{
            			sctCause = JSON.stringify(errorJSON.cause.stackTrace);
            		}
            		else if (errorJSON.stack)
            		{
            			sctCause = JSON.stringify(errorJSON.stack);
            		}
            		else
            		{
            			sctCause = '';
            		}
            	}
            }
            
            if (errorJSON.type == 'error.UserEventScript')
            {
            	return 'UserEvent NS Error: '+
            			errorJSON.name+' // '+
            			errorJSON.message+' // '+
            			'Cause: '+sctCause;

            } 
            else if (errorJSON.type == 'error.SuiteScriptError')
            {
            	return 'SuiteScript NS Error: '+
            			errorJSON.name+' // '+
            			errorJSON.message+' // '+
            			'Cause: '+sctCause;
            }
            else 
            {
            	return 'JS Error: '+error;
            }
        }
        catch (e)
        {
        	return 'JS Error: '+e;
        }
	}
	
	/**
	 * Helper function that returns formatted Error message to be displayed to the user
	 */
	function getErrDetailUi(error) 
	{
		try {
			
            var errorJSON = JSON.parse(error);
 
            log.debug('Error',error);
            
            var sctCause = 'No Cause';
            if (errorJSON.type == 'error.UserEventScript' || errorJSON.type == 'error.SuiteScriptError')
            {
            	if (errorJSON.cause)
            	{
            		if (errorJSON.cause.stackTrace)
            		{
            			sctCause = JSON.stringify(errorJSON.cause.stackTrace);
            		}
            		else if (errorJSON.stack)
            		{
            			sctCause = JSON.stringify(errorJSON.stack);
            		}
            		else
            		{
            			sctCause = '';
            		}
            	}
            }
        	
            
            if (errorJSON.type == 'error.UserEventScript')
            {
            	
            	return 'UserEvent NS Error:<br/>'+
		     		   'Error Name: '+errorJSON.name+'<br/>'+
		    		   'Error Message: '+errorJSON.message+'<br/>'+
		    		   'Error Cause: '+sctCause;

            } 
            else if (errorJSON.type == 'error.SuiteScriptError')
            {
            	return 'SuiteScript NS Error: <br/>'+
            		   'Error Name: '+errorJSON.name+'<br/>'+
            		   'Error Message: '+errorJSON.message+'<br/>'+
            		   'Error Cause: '+sctCause;
            }
            else 
            {
            	return 'JS Error:<br/> '+
            		   'Error Detail:'+error;
            }
        }
        catch (e)
        {
        	return 'JS Error:<br/>'+
        		   'Error Detail: '+e;
        }
	}
	
	/**
	 * Function to trim out before and after empty strings of given value
	 */
	function strTrim(stringToTrim) {
		if (!stringToTrim) {
			return '';
		}
		return stringToTrim.replace(/^\s+|\s+$/g,"");	
	}
	
	/**
	 * Helper function to GLOBALLY search and replace char or word with provided char or word
	 * @param _fullString - Original String Value
	 * @param _searchChar - Char or Word to search for
	 * @param _replaceChar - Char or Word to replace with.
	 * @returns
	 */
	function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
		var jsrs = new RegExp(_searchChar, "g");
		
		return _fullString.replace(jsrs,_replaceChar);
	}
	
	function getParameterByName(name, url)
	{
		if (!url) url = window.location.href;
	    name = name.replace(/[\[\]]/g, "\\$&");
	    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	        results = regex.exec(url);
	    if (!results) return null;
	    if (!results[2]) return '';
	    return decodeURIComponent(results[2].replace(/\+/g, " "));
	}
	
	
	/**
	 * Below return statement contains list of all functions return.
	 * KEY will be used to call the functions
	 */
    return {
    	'getErrDetail': getErrDetail,
    	'getErrDetailUi': getErrDetailUi,
    	'strTrim':strTrim,
    	'strGlobalReplace': strGlobalReplace,
    	'getParameterByName': getParameterByName
    };
    
});
