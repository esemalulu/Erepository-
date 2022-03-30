/**
* Opportunity User Event Script
*
* @require  sweet_opportunity_lib.js
*/

var SWEET_JOB_SCHEDULED_THRESHOLD = 10;

/**
 * 2/3/2015 - JS@Audaxium
 * Modified to include Before Load functions from Form_Opportunity workflow
 * @param type
 * @param form
 * @param request
 */




function auxUserEvent_BeforeLoad(type, form, request) {
	
	//Add Button to the Opportunity Record labled "Request Resource" and call the Suitelet "AUX-Opportunity Resource Email"
	var ResourceUrl = nlapiResolveURL('SUITELET', 'customscript_aux_opp_resource_email', 'customdeploy_aux_opp_resource_email', 'VIEW');
	form.addButton('custpage_requestResource', 'Request Resources', 'window.open(\''+ResourceUrl+'&custparam_tranid='+nlapiGetFieldValue('tranid')+'&custparam_rectype='+nlapiGetRecordType()+'&custparam_recid='+nlapiGetRecordId()+'\', \'\', \'width=400,height=200,resizable=no,scrollbars=no\');return true;');
	
		
	//default the form to Opportunity
	//nlapiSetFieldValue('customform', '193');
	//if department is empty, set default to client
	if (!nlapiGetFieldValue('department')) {
		nlapiSetFieldValue('department', '1');
	}
	
	//If type is create default lead source to *Please update* (6832)
	if (type == 'create') {
		nlapiSetFieldValue('leadsource','6832');
		
		var contact = request.getParameter('custbody_buyer');
		nlapiSetFieldValue('custbody_buyer', contact);
		
	}
}

/**
* AfterSubmit hookForm
*
* @param {String} type
* @return {Void}
* 
* 3/1/2015 - JS@Audax
* Due to Xedit issue of calculating value, afterSubmit is brought back.
*/
function userevent_afterSubmit(type) {

	if (type == 'delete') {
    	return;
    }
    
	var opprec = nlapiGetNewRecord();
	if (type == 'xedit') {
		opprec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	}
	
    //recalculate and update the value on custbody_op_forecastremainingtotal (FORECAST REMAINING TOTAL)
    var projectedTotalVal = opprec.getFieldValue('projectedtotal') || 0.0;
    var fcmVal = opprec.getFieldValue('custbody_op_forecastmonth') || 0.0;
    var fcmVal1 = opprec.getFieldValue('custbody_op_forecastmonth1') || 0.0;
    var fcmVal2 = opprec.getFieldValue('custbody_op_forecastmonth2') || 0.0;
    var fcmVal3 = opprec.getFieldValue('custbody_op_forecastmonth3') || 0.0;
    	
    //11/3/2015 - Ticket 1287 Changes
    	
    //31/12/2014  - replaced with custbody_op_quoteamount
    var quotedAmount = opprec.getFieldValue('custbody_op_quoteamount') || 0.0;
    	
    //31/12/2014  - replaced with custbody_op_soamount
    var salesOrderAmount = opprec.getFieldValue('custbody_op_soamount') || 0.0;
    	
    //custbody_op_forecastamount (UNBOOKED AMOUNT)
    //	= custbody_op_forecastmonth + custbody_op_forecastmonth1 + custbody_op_forecastmonth2 + custbody_op_forecastmonth3 
    var unBookedAmount = parseFloat(fcmVal)+
    				 	 parseFloat(fcmVal1)+
    				 	 parseFloat(fcmVal2)+
    				 	 parseFloat(fcmVal3);
    
    //custbody_op_bookedamount (Opportunity/Booked Amount) Hidden field
    //	= [Quote Amount] + [Sales Order Amount] 
    var bookedAmount = parseFloat(quotedAmount) + parseFloat(salesOrderAmount);
    var oppForecastRemainTotal = parseFloat(projectedTotalVal)- bookedAmount - unBookedAmount;
    var oppRemainTotal = parseFloat(projectedTotalVal)- bookedAmount;
    
    //Update Field
    var updfld = ['custbody_op_forecastremainingtotal',
                  'custbody_op_remainingamount',
                  'custbody_op_forecastamount',
                  'custbody_op_bookedamount'];
    var updval = [oppForecastRemainTotal,
                  oppRemainTotal,
                  unBookedAmount,
                  bookedAmount];
    nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), updfld, updval, true);
}

/**
* BeforeSubmit hook
* 3/1/2015 - JS@Audaxium
* NEW Version of THIS function = auxUserEvent_BeforeSubmit(type)
* Modifying codebse to make sure the self_updateRevRec process works properly.
* 	- Changes also include code flow update for prerformance enhancement as well for variable fix.
* 	- type parameter passed in from netsuite is being overriden within for loop if fields contains entitystatus, winlossreason or projectedtotal.
* 		It then tries to trigger updateDocumentStatus based on save variable type. THIS is an error that needs to be fixed
* 	- Call to  SWEET.Opportunity.self_updateRevenueRecognition(); to update custcol_revrec_amount is deemed irrelevant. 
* 		- It NEVER worked especially within context of inline edit.
* 		- Reference removed and library file unattached
* @param {String} type
* @return {Void}
* 
*/
function auxUserEvent_BeforeSubmit(type) {
	//Filtering inline edit event type 
	if (type == 'xedit') {
		var newRecord = nlapiGetNewRecord();
		var fields = newRecord.getAllFields();
		
		for ( var i = 0; i < fields.length; i++) {
			
			if (fields[i] == 'entitystatus' || fields[i] == 'winlossreason' || fields[i] == 'projectedtotal') {
				
				//IF any of the above fields are changed via xedit, load the record in question
				var rectype = nlapiGetRecordType();
				var recid = newRecord.getId();
				var record = nlapiLoadRecord(rectype, recid);
				
				//'Status' change to 'Win/Loss Reason' field validation
				if (fields[i] == 'entitystatus') {
					
					var status = nlapiGetFieldValue('entitystatus');
					
					if (status == '56' || status == '13' || status == '14') {
						var winLossReason = record.getFieldValue('winlossreason');
						if (!winLossReason)
							throw nlapiCreateError('ERROR',
									'Please select Win/Loss Reason.', true);
					}
				}
	
				//'Win/Loss Reason' change to 'Status' field validation
				if (fields[i] == 'winlossreason') {
					
					var winLossReason = nlapiGetFieldValue('winlossreason');
					if (!winLossReason) {
						var status = record.getFieldValue('entitystatus');
						if (status == '56' || status == '13' || status == '14')
							throw nlapiCreateError('ERROR',
									'Please select Win/Loss Reason.', true);
					}
				}
				
				//'Estimated Total Value' field validation
				/**
				if (fields[i] == 'projectedtotal') {
						
					// Get probability
					probability = record.getFieldValue('probability').match(
							'^(.+)%$');
					probability = parseFloat(probability[1]) / 100;
					if (probability < 0) {
						probability = 0;
					}
	
					var projectedTotal = nlapiGetFieldValue('projectedtotal');
					if (!projectedTotal) {
						nlapiSetFieldValue('projectedtotal', 0);
						projectedTotal = 0;
					}
					
					//Audaxium 31/12/2014 - Modify it to set the value using SO AMOUNT and QUOTE AMOUNT instead
					// Get booked total - LEgacy reference custbody_op_bookedtotal
					var bookedTotal = record.getFieldValue('custbody_op_soamount');
					if (!bookedTotal) {
						nlapiSetFieldValue('custbody_op_soamount', 0);
						bookedTotal = 0;
					}
					parseFloat(bookedTotal);
					// Get quoted total - Legacy Reference: custbody_op_quotedtotal
					var quotedtotal = record.getFieldValue('custbody_op_quoteamount');
					if (!quotedtotal) {
						nlapiSetFieldValue('custbody_op_quoteamount', 0);
						quotedtotal = 0;
					}
					parseFloat(quotedtotal);
	
					// Calculate remaining amount
					var remainingAmount = projectedTotal - bookedTotal
							- quotedtotal;
					if (remainingAmount < 0) {
						remainingAmount = 0;
					}
					nlapiSetFieldValue('custbody_op_remainingamount',
							remainingAmount);
	
					// Calculate weighted total
					//var weightedTotal = remainingAmount * probability;
					//nlapiSetFieldValue('custbody_op_weightedtotal', weightedTotal);
	
				}
				*/
			}
		}
		
		updateCustomDocumentStatus();
	}
	
	//Default values to 0 if Opp/Month related fields are null
	if (type != 'xedit' && type != 'delete') {
		//If Programme Contract start date doesnt' match expected close date, sync expected close date with programme contract start date
		if (nlapiGetFieldValue('custbody_op_contractstartdate') && nlapiGetFieldValue('custbody_op_contractstartdate') != nlapiGetFieldValue('expectedclosedate')) {
			nlapiSetFieldValue('expectedclosedate', nlapiGetFieldValue('custbody_op_contractstartdate'));
		}
	}
	
	type = type.toLowerCase();
    if (type == 'create' || type == 'edit' || type=='xedit') {
        updateCustomDocumentStatus();
    }
}


/**
* Update custom document status if the built-in status has been changed
*
* @return {Void}
*/
function updateCustomDocumentStatus() {

    var newRecord = nlapiGetNewRecord();
    var changedFields = newRecord.getAllFields();
    // Has status been changed?
    if (inArray('entitystatus', changedFields)) {

        // Get field value of Opportunity status
        var status = nlapiGetFieldValue('entitystatus');

        // Handle instance where Opportunity Status Field Value is either set or changed to an Open Status.
        /**
         * 3/6/2015 JS@Aux Modification
         * EntityStatus 1 - 5 (Issue match through Launch)
         * 	- Set custbody_document_status 1 (Open - Pending)
         * 
         * EntityStatus 6 (Execute) && winlossreason is NOT set (Null)
         *  - Set custbody_document_status 4 (Open - Won)
         *  
         * EntityStatus Internal IDs 14 or 13 && winlossreason is SET
         * 	- Set custbody_document_status 3 or 2 (Closed - Lost OR Closed - Won)
         */
        switch (status) {
            case '59': // 1 - Issue Match
            case '60': // 2 - Value Drivers
            case '61': // 3 - Consensus
            case '62': // 4 - Decision
            case '63': // 5 - Launch
                nlapiSetFieldValue('custbody_document_status', '1'); // Open - Pending
                break;
            case '64': // 6 - Execute
            	nlapiSetFieldValue('custbody_document_status', '4'); // Open - Won
                break;
            case '14': // * Closed Lost
                nlapiSetFieldValue('custbody_document_status', '3'); // Closed - Lost
                //nlapiSetFieldValue('custbody_op_closed', 'T');
                break;
            case '56': // * Won In Progress (Will become deprecated)
            case '13': // 7 - Closed Won
                nlapiSetFieldValue('custbody_document_status', '2'); // Closed - Won
                //nlapiSetFieldValue('custbody_op_closed', 'T');
                break;
        }
    }
}

/**
* Check if key exists in array
*
* @param key {String}
* @param array {Array}
* @return {Boolean}
*/
function inArray(key, array) {

    var i = 0;
    for (i; i < array.length; i++) {
        if (array[i].toLowerCase() == key.toLowerCase()) {
            return true;
        }
    }
    return false;
}

