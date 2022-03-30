/**
 * Before Submit Fired against AUX:SolidWorks Lead Stage (customrecord_ax_solidworks_leadstage) ONLY on EDIT
 * 
 * @param type
 */
function autoUpdateSolidWorksStatus(type) {
	
	try {
	
		if (type=='edit') {
			
			//grab old record and current value for comparison.
			var oldRec = nlapiGetOldRecord();
			
			//Fire ONLY if both matched fields are set
			if (nlapiGetFieldValue('custrecord_axswls_matchedclient') && nlapiGetFieldValue('custrecord_axswls_matchedcontact')) {
				
				//ONLY if previous status is NOT exact matched, set it as exact matched
				// ID of 1 = Complete Match
				if (oldRec.getFieldValue('custrecord_axswls_procstatus') != '1') {
					nlapiSetFieldValue('custrecord_axswls_procstatus','1');
				}
			}
		}
		
	} catch (updstatuserr) {
		log('error','Error Occured Auto setting SolidWorks Load Status', getErrText(updstatuserr));
	}
}