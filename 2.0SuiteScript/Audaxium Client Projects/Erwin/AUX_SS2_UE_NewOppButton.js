/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 
/**
* SCRIPT EXPLANATION:
*  - The purpose of this script is to show a button and navigate to a New Opportunity page upon click
*/ 
define(['N/url',
		'N/log',
		'N/record'],

function(url, log, record){
	
	function beforeLoad(context) {
		
		try{
			var recLead = context.newRecord;
			var stLeadId = recLead.id;
			var stSalesRepId = recLead.getValue({
				fieldId : 'salesrep'
			});
			
			var stFuncName = 'newOppBtnClick(';
			if(stLeadId){
				stFuncName += stLeadId;
			} else {
				stFuncName += 'null';
			}
			if(stSalesRepId){
				stFuncName += ',' + stSalesRepId;
			} else {
				stFuncName += ',null';
			}
			stFuncName += ')';
			
			//log.debug('stLeadId', stLeadId);
			//log.debug('stSalesRepId', stSalesRepId);
			//log.debug('stFuncName', stFuncName);
			
			//Show custom button
			context.form.addButton({
				id : 'custpage_btn_newopp',
				label : 'New Opportunity',
				functionName : stFuncName
			});
			
			context.form.clientScriptFileId = 37267; //file cabinet id of the CS file
			
		} catch(ex){
			log.debug('error', ex.toString());
		}
	}

    return {
		beforeLoad : beforeLoad
    };

});
