/**
 * Author: js@Audaxium
 * User event deployed for Contract Item
 * 
 */

function userEventAfterSubmit(type){
	if (type == 'create') {
		try {
			//when type is create, search to see if Contract Room exists. if it doesn't create one
			var roomId = nlapiGetFieldValue('custrecord_acmci_locatedroom');
			var contractId = nlapiGetFieldValue('custrecord_itemcontractid');
			
			var contractRoomFlt = [new nlobjSearchFilter('custrecord_siteroom', null, 'anyof',roomId),
			                       new nlobjSearchFilter('custrecord_contractroom', null, 'anyof',contractId)];
			var contractRoomCol = [new nlobjSearchColumn('internalid')];
			var contractRoomRslt = nlapiSearchRecord('customrecord_acm_contractroom', null, contractRoomFlt, contractRoomCol);
			
			if (!contractRoomRslt) {
				//create one
				var croom = nlapiCreateRecord('customrecord_acm_contractroom');
				croom.setFieldValue('custrecord_siteroom',roomId);
				croom.setFieldValue('custrecord_contractroom',contractId);
				nlapiSubmitRecord(croom, true, true);
			}
		} catch (croomCreateError) {
			//send error email
			var sbj = 'Error Creating Contract Room';
			var msg = 'Error Checking/Creating Contract Room<br/>'+
					  'Contract Item ID: '+nlapiGetRecordId()+'<br/>'+
					  'Error Message:<br/>'+
					  getErrText(croomCreateError);
			nlapiSendEmail(-5, 'joe.son@audaxium.com', sbj, msg);
			log('error','Error creating Contract Room',getErrText(croomCreateError));
		}
		
	}
}
