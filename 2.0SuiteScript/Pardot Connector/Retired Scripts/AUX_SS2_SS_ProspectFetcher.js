/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', '/SuiteScripts/AUX_pardot_lib', 'N/record'],

function(search, pardotLib, record) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	var adminEmail, adminPass, apiUserKey, syncContacts, syncInactiveContacts, syncAllContacts, contactCriteria, value;
    	var searchFilter = [
    	                    	["isinactive", "is", "F"],
    	                    	"AND",
    	                    	["custrecord_pi_config_key", "isnotempty", ""],
    	                    	"AND",
    	                    	["custrecord_pi_config_email", "isnotempty", ""],
    	                    	"AND",
    	                    	["custrecord_pi_config_pass", "isnotempty", ""],
    	                    	"AND",
    	                    	["custrecord_pi_config_status", "anyof", "1"]
    	                   ];
    	
    	var searchColumns = [
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_email'
    	                    	}),
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_pass'
    	                    	}),
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_key'
    	                    	}),
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_contact'
    	                    	}),
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_contact_inactive'
    	                    	}),
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_contact_sync'
    	                    	}),
    	                    	search.createColumn({
    	                    		name: 'custrecord_pi_config_contact_search'
    	                    	})
    	                   ];
    	
    	var configSearch = search.create
    	({
    		type: 'customrecord_pi_config',
    		filters: searchFilter,
    		columns: searchColumns
    	});
    	
    	var configResult = configSearch.run().getRange({
    		start: 0,
    		end: 1000
    	});
    	
    	for(var i = 0; i < configResult.length; i+=1)
    	{
    		 adminEmail           = configResult[i].getValue({ name: 'custrecord_pi_config_email'});
    		 adminPass            = configResult[i].getValue({ name: 'custrecord_pi_config_pass' });
    		 apiUserKey           = configResult[i].getValue({ name: 'custrecord_pi_config_key'  });
    		 syncContacts         = configResult[i].getValue({ name: 'custrecord_pi_config_contact'});
    		 syncInactiveContacts = configResult[i].getValue({ name: 'custrecord_pi_config_contact_inactive'});
    		 syncAllContacts      = configResult[i].getValue({ name: 'custrecord_pi_config_contact_sync'});
    		 contactCriteria      = configResult[i].getValue({ name: 'custrecord_pi_config_contact_search'});
    	}
    	
    	var pass               = pardotLib.decodeAdminPassword(adminPass);
    		value              = "login";
    	var connectionResponse = pardotLib.login(value, adminEmail, pass, apiUserKey);
    	var responseBody       = JSON.parse(connectionResponse.body);
    	var apiKey             = responseBody.api_key;
    		value              = "prospects";
    	var payload            = 'user_key=' + apiUserKey + '&api_key=' + apiKey + '&format=json&deleted=false&score_greater_than=0';
    	var prospectResponse   = pardotLib.retrieveProspects(value, payload);
    	var pResp              = JSON.parse(prospectResponse.body);
    	var prospectsJSON      = JSON.stringify(pResp.result.prospect);
    	var prospects          = JSON.parse(prospectsJSON);
    }

    return {
        execute: execute
    };
    
});
