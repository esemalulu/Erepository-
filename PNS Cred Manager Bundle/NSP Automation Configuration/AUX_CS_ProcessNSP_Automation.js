/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Jul 2013     AnJoe
 *
 */
/**
nspc definition. JavaScript variable is loaded on edit, create and copy
var nspc = {
	"context":nlapiGetContext().getExecutionContext(),
	"user":nlapiGetContext().getUser(),
	"haserror":false,
	"errmsg":"",
	"action":"",
	"recordtype":"",
	"recordid":"",
	"createinpardot":false,
	"pardot":{
		"credmgrid":pardotCredMgrId,
		"user":"",
		"pass":"",
		"userkey":""
	},
	"config":{
		"hasconfig":false,
		"details":{
			//-T or -F indicates isPerson
			"email-T":{
					"configid":"xx",
					"trackfldid":"xx",
					"isperson":"", //Only returns T if it needs to be an individual. A if applicable to both person and company types
					"stage":"[prospect|lead|customer]",
					"queuereview":true,
					"autoupdatepardot":false,
					"dupuiwarn":true,
					"dupaserr":true,
					"stopsync":false,
					"unsubs":false
			},
			...
		}
	}
};
*/

var origEmail = '';
var origInactive = '';

function nspAutoPageInit(type) {
	origEmail = nlapiGetFieldValue('email');
	origInactive = (nlapiGetFieldValue('inactive')=='T')?'T':'F';
}

function nspAutoValidateField(type, name, linenum){

	//check to see if we need to do any real time NSP automation for email field in UI context
	if (nlapiGetContext().getExecutionContext()=='userinterface' && name == 'email') {
		var isPersonFlag = (nlapiGetFieldValue('isperson')=='T')?'T':'F';
		if (nlapiGetContext().getExecutionContext()=='userinterface' && nspc && !nspc.haserror && nspc.config.hasconfig && 
			(nspc.config.details[name+'-A'] || nspc.config.details[name+'-'+isPersonFlag])) {
			
			//on client side, ONLY check for duplicate warn
			if (( (nspc.config.details[name+'-'+isPersonFlag] && nspc.config.details[name+'-'+isPersonFlag].dupuiwarn) || 
				  (nspc.config.details[name+'-A'] && nspc.config.details[name+'-A'].dupuiwarn))
				&& nlapiGetFieldValue(name) && origEmail != nlapiGetFieldValue(name)) {
				
				var validateAsError = false;

				if (nspc.config.details[name+'-A']) {
					validateAsError = nspc.config.details[name+'-A'].dupaserr;
				} else {
					validateAsError = nspc.config.details[name+'-'+isPersonFlag].dupuaserr;
				}
				
				var lookupres = pardotDuplicateEmail(nspc, nlapiGetFieldValue('email'));
				if (lookupres.err) {
					alert(lookupres.msg);
					return true;
				}			
				
				if (lookupres.hasdup) {
					
					//depending on NSP Config, return as warning or error
					if (validateAsError) {
						alert("Unable to validate Email: "+lookupres.msg);
						return false;
					} else {
						alert("WARNING: Email exists in Pardot: "+lookupres.msg);
						return true;
					}
				}
			}		
		}
	}
	
	return true;
}


