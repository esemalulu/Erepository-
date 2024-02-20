/**
 * Client scripts for the SWO for Grand Design
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Jan 2017     Jacob Shetler
 *
 */

//internal ids of the options for the stage field on the status record.
var SWO_STATUS_STAGE_RELEASED = '2';
var SWO_STATUS_STAGE_COMPLETE = '3';

var SWO_OPLINE_PAYMENTTYPE_CUSTOMER = '2';
var SWO_OPLINE_PAYMENTTYPE_INSURANCE = '3';

/**
 * Validate some stuff. There's some duplicate validation that happens on Before Submit. 
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function GD_SWO_SaveRecord()
{
	var newStage = nlapiLookupField('customrecordgd_srvswo_status', nlapiGetFieldValue('custrecordsrv_swo_gdstatus'), 'custrecordgd_srvswostatus_stage');
	
	//If the SWO is Released or going to be Released, make sure the Customer Dealer is set if they have any Customer/Insurance lines.
	if (newStage == SWO_STATUS_STAGE_RELEASED)
	{
		var retailCustomerDealer = nlapiGetFieldValue('custrecordsrv_swo_retailcustdealer') || ''; 
		var koDataStr = nlapiGetFieldValue('custpage_srvkodata') || '';

		if (retailCustomerDealer == '' && koDataStr != '') {
			
			var koData = JSON.parse(koDataStr);
			for (var i = 0; i < koData.operationLines.length; i++) {
				if (koData.operationLines[i].selectedPaymentType.id == SWO_OPLINE_PAYMENTTYPE_CUSTOMER || 
					koData.operationLines[i].selectedPaymentType.id == SWO_OPLINE_PAYMENTTYPE_INSURANCE) {
					
					alert('Please enter a value for Retail Customer Dealer.');
					return false;
				}
			}
		}
	}
	
	//If the SWO is Complete or going to be Complete, check fields that become required at this stage. 
	if (newStage == SWO_STATUS_STAGE_COMPLETE)
	{
		var arrivedDate = nlapiGetFieldValue('custrecordsrv_swo_arriveddate') || '';
		var startDate = nlapiGetFieldValue('custrecordsrv_swo_startdate') || '';
		var completeDate = nlapiGetFieldValue('custrecordsrv_swo_completedate') || '';

		if(arrivedDate == '') {
			alert('Please enter a value for Arrived Date.');
			return false;
		} else if(startDate == '') {
			alert('Please enter a value for Date Work Started.');
			return false;
		} else if(completeDate == '') {
			alert('Please enter a value for Date Work Completed.');
			return false;
		}

		//Make sure the associated Sub-Parts Order is completely fulfilled, if there is one.
		var soRecId = ConvertNSFieldToString(nlapiGetFieldValue('custrecordsrv_swo_subpartsorder'));
		if(soRecId != '')
		{
			var soResults = nlapiSearchRecord('salesorder', null, [new nlobjSearchFilter('internalid', null, 'is', soRecId),
			                                                       new nlobjSearchFilter('mainline', null, 'is', 'F'),
			                                                       new nlobjSearchFilter('shiprecvstatus', null, 'is', 'F')]);
			if (soResults == null)
			{
				alert('The attached parts order must be completely fulfilled before marking this order as Complete.');
				return false;
			}
		}
	}
    return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordsrv_serviceworkorder
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_SWO_FieldChanged(type, name, linenum) {
    if (name == 'custrecordgd_swo_totalsoverride') {
        var customerPay = parseFloat(nlapiGetFieldValue('custrecordsrv_swo_customerpay') || 0);
        var customerPayOverride = parseFloat(nlapiGetFieldValue(name) || 0);
        var customerPayOverrideOriginalValue = nlapiGetFieldValue('custpage_originaloverridevalue') || 0;
        
        if (customerPayOverrideOriginalValue > 0 && customerPayOverride > 0 && customerPayOverride != customerPayOverrideOriginalValue) {
            alert('The override has been used already, if you need to change the override value, please follow the steps below:\n\n1. Set the override value back to zero or blank then save the record.\n\n2.  ' +
                    ' After saving, the original values would be set automatically.  At this point, you can edit and enter a new override value.');
            nlapiSetFieldValue(name, customerPayOverrideOriginalValue);
        } else if (customerPayOverride > 0 && customerPayOverride > customerPay) {
            // Show an alert to let the user know they have entered a value larger than the regular customer pay field on the override field.
            alert('The Customer Pay Override Value is greater than the current Customer Pay value.  All values will be increased.');
        }
    }
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord customrecordsrv_serviceworkorder 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function GD_SWO_PageInit(type) {
    if (nlapiGetField('custrecordgd_swo_totalsoverride').disabled) {
        // If the field is disabled, the override field should be empty.
        nlapiSetFieldValue('custrecordgd_swo_totalsoverride', '');
    } else {
        var totalsOverride = nlapiGetFieldValue('custrecordgd_swo_totalsoverride') || 0;
        if (type == 'edit' && totalsOverride != 0) {
            nlapiSetFieldValue('custpage_originaloverridevalue', totalsOverride);
        }
    }
}