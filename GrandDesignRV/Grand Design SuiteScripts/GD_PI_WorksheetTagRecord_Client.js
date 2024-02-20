/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       7 March 2020		Jeffrey Bajit
 *
 */

//Keeps track of the previous tag value in order to set the next line tag # by adding one.  
var globalPreviousTagValue = 0;

/**
* Fills in the tag line column for the current line depending on the line above it.
 * @appliedtorecord customrecordpit_physicalinventorytags
 *   
 * @param {String} type Sublist internal id
 * @returns {Void}
 */
function GD_PIWorkSheetTagLineInit(type) {
    if (type == 'recmachcustrecordgd_physinvttagline_parent') {
    	var currentIndex = parseInt(nlapiGetCurrentLineItemIndex(type), 10);
    	var sublistCount = nlapiGetLineItemCount(type);
    	var currentTagValue = nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_tagnum') || '';
    	var previousTagValue = parseInt(nlapiGetLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', currentIndex - 1) || 0, 10);
    	var startTagNum = parseInt(nlapiGetFieldValue('custrecordgd_physinvtwrksht_starttagnum') || -1);

    	if (startTagNum != -1) {
	    	//previous tag has value.
	    	if (globalPreviousTagValue != 0) {
	    		previousTagValue = globalPreviousTagValue;
	    		globalPreviousTagValue = 0;
	    		nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', (previousTagValue || 0) + 1);
	    	} else if (currentIndex != 1 && currentIndex <= sublistCount) {
	    		// the focus is not the top nor the bottom of the list.
	    		if (currentTagValue == '' && previousTagValue == 0)
	    			nlapiSetLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', currentIndex, '');
	    		else if (currentTagValue == '')
	    			nlapiSetLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', currentIndex, previousTagValue + 1);
	    	} else if (currentIndex > sublistCount)	{
	    		//new line added to the bottom
	    		if (currentTagValue == '' && previousTagValue == 0)
	    			nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', '');
	    		else if (currentTagValue == '')
	    			nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', previousTagValue + 1);
	    	}
    	}
    }
}

/**
 * Stops users from inserting tag lines that are not sequentially correct with the two lines above and below it.
 * @param type
 * @returns {Boolean}
 */
function GD_PIWorkSheetTagValidateInsert(type) {
	if (type == 'recmachcustrecordgd_physinvttagline_parent') {
		var currentIndex = parseInt(nlapiGetCurrentLineItemIndex(type), 10);
		globalPreviousTagValue = parseInt(nlapiGetLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', currentIndex - 1), 10);
		
		if (globalPreviousTagValue + 1 == nlapiGetLineItemValue(type, 'custrecordgd_physinvttagline_tagnum', currentIndex)) {
			alert('You can only insert into missing tag.');
			return false;
		}
    }
	return true;
}

/**
 * Calculates tag cost on the current line and setting the abbreviation on the line.
 * @param type
 * @param name
 * @param linenum
 */
function GD_PIWorkSheetTagFieldChanged(type, name, linenum) {
	if (type == 'recmachcustrecordgd_physinvttagline_parent') {
		if (name == 'custrecordgd_physinvttagline_item') {
			nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_cost', '');
			nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_extendcost', '');
			
			if (nlapiGetLineItemValue(type, name, linenum) == GD_PI_TAG_VOID || nlapiGetLineItemValue(type, name, linenum) == GD_PI_TAG_UNUSED)
				nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_cost', 0);
		} else if (name == 'custrecordgd_physinvttagline_cost' || name == 'custrecordgd_physinvttagline_quantity') {
			if (nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_cost') != '') {
				var itemCost = nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_cost') || 0;
				var itemQuantity = nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_quantity') || 0;
				nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_extendcost', (parseFloat(itemCost) * parseFloat(itemQuantity)).toFixed(3));
			}
		} else if (name == 'custrecordgd_physinvttagline_tagnum') {
		    // check if there are any non number values in the text, remove any non-numeric values.
		    var tagNum = nlapiGetCurrentLineItemValue(type, name) || '';
		    if (!IsNumeric(tagNum)) {
		        nlapiSetCurrentLineItemValue(type, name, tagNum.replace(/\D/g,''));
		    }
		}
	}
	
	if (name == 'custrecordgd_physinvtwrksht_physinvtcnt') {
		var piCountId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt') || '';
		if (piCountId != '')
		{
			nlapiSetFieldValue('custrecordgd_physinvtwrksht_plant', '');
		}
	} else if (name == 'custrecordgd_physinvtwrksht_plant') {

//		var piId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt') || '';
//		var plantId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_plant') || '';
//
//		if (piId != '' && plantId != '') {
//			var minMaxTagResults = SearchRecord_Suitelet('customrecordgd_physinventloctags', 
//					null, 
//					[
//					 new nlobjSearchFilter('custrecordgd_physinvtloctag_parent', null, 'anyof', piId), 
//					 new nlobjSearchFilter('custrecordgd_physinvtloctag_plant', null, 'anyof', plantId)
//					], 
//					[
//                     new nlobjSearchColumn('custrecordgd_physinvtloctag_starttag', null, 'MIN'),
//                     new nlobjSearchColumn('custrecordgd_physinvtloctag_endtag', null, 'MAX')
//                    ]
//			) || [];
//
//			if (minMaxTagResults.length > 0) {
//				nlapiSetFieldValue('custrecordgd_physinvtwrksht_starttagnum', minMaxTagResults[0].columns.custrecordgd_physinvtloctag_starttag);
//				nlapiSetFieldValue('custrecordgd_physinvtwrksht_endtagnum', minMaxTagResults[0].columns.custrecordgd_physinvtloctag_endtag);
//				
//				nlapiCancelLineItem('recmachcustrecordgd_physinvttagline_parent');
//			}
//		}
	
	} else if (name == 'custpage_physicalinventorycountselect') {
		nlapiSetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt', nlapiGetFieldValue(name));
	} else if (name == 'custrecordgd_physinvtwrksht_taglocseq') {
//	    var piId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt') || '';
//        var plantId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_plant') || '';
        var tagLocationSequenceId = nlapiGetFieldValue(name) || '';
        if (tagLocationSequenceId != '') {
            var minMaxTagResults = SearchRecord_Suitelet('customrecordgd_physinventloctags', 
                    null, 
                    [
                     new nlobjSearchFilter('internalid', null, 'anyof', tagLocationSequenceId)
                    ], 
                    [
                     new nlobjSearchColumn('custrecordgd_physinvtloctag_starttag', null, 'MIN'),
                     new nlobjSearchColumn('custrecordgd_physinvtloctag_endtag', null, 'MAX')
                    ]
            ) || [];

            if (minMaxTagResults.length > 0) {
                nlapiSetFieldValue('custrecordgd_physinvtwrksht_starttagnum', minMaxTagResults[0].columns.custrecordgd_physinvtloctag_starttag);
                nlapiSetFieldValue('custrecordgd_physinvtwrksht_endtagnum', minMaxTagResults[0].columns.custrecordgd_physinvtloctag_endtag);
                
                nlapiCancelLineItem('recmachcustrecordgd_physinvttagline_parent');
            }
        }
	}
}

/**
 * validate cost of the line if it is a WIP or NP tags.
 * @param type
 * @returns {Boolean}
 */
function GD_PIWorkSheetTagValidateLine(type) {
	if (type == 'recmachcustrecordgd_physinvttagline_parent') {
		if (nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_item') == GD_PI_TAG_WIP || nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_item') == GD_PI_TAG_NPN) {
			var lineCost = nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_cost') || '';
			if (lineCost == '') {
				alert('Please enter a value for the Cost of item ' + nlapiGetCurrentLineItemText(type, 'custrecordgd_physinvttagline_item') + ' before proceeding. A value of zero(0) is accepted.');
				return false;
			}
		}
		
		// verify that the tag is within the minimum and maximum tag number range. 
		var tagNum = parseInt(nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_tagnum') || 0);
		var startTagNum = parseInt(nlapiGetFieldValue('custrecordgd_physinvtwrksht_starttagnum') || 0);
		var endTagNum = parseInt(nlapiGetFieldValue('custrecordgd_physinvtwrksht_endtagnum') || 0);
		
		if (startTagNum > tagNum || tagNum > endTagNum) {
			alert('The tag number is outside of the start and end tag range.  This line can not be saved.')
			return false;
		}
	}
	
	return true;
}

/**
 * Set the on the fly select field.
 * 
 * Run search on units type record and create JSON array of the unit conversion table for easy access later on.
 * Set the next lines tag number
 */
function GD_PIWorkSheetTagPageInit() {
	// If physical inventory count records exist, set it on the on the fly select field. 
	var picListFieldValue = nlapiGetFieldValue('custpage_physicalinvenotryobjecttext') || '';
	if (picListFieldValue != '') {
		var picListObjectOrdered = JSON.parse(picListFieldValue);
		
		for (var i = 0; i < picListObjectOrdered.length; i++) {
			nlapiInsertSelectOption(
					'custpage_physicalinventorycountselect', 
					picListObjectOrdered[i].internalid, 
					picListObjectOrdered[i].name, 
					nlapiGetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt') == picListObjectOrdered[i].internalid ? true : false
			);
		}
	}
	
	// If a line is present, set the next tag # on a new line.
	nlapiGetLineItemCount('recmachcustrecordgd_physinvttagline_parent') > 0 ? nlapiSelectNewLineItem('recmachcustrecordgd_physinvttagline_parent') : '';
	
	if (document.getElementById("tbl_newrec399") != null)
		document.getElementById("tbl_newrec399").style.visibility = 'hidden';
	
	var startTagNum = nlapiGetFieldValue('custpage_starttagnum') || '';
	var endTagNum = nlapiGetFieldValue('custpage_endtagnum') || '';
	
	if (startTagNum != '' && endTagNum != '') {
		nlapiSetFieldValue('custrecordgd_physinvtwrksht_starttagnum', startTagNum);
		nlapiSetFieldValue('custrecordgd_physinvtwrksht_endtagnum', endTagNum);
		
		nlapiCancelLineItem('recmachcustrecordgd_physinvttagline_parent');
	}
	
	nlapiDisableLineItemField('recmachcustrecordgd_physinvttagline_parent', 'custrecordgd_physinvttagline_extendcost', true);
}

/**
 * Source the assembly item rolled up cost for assembly items on the line.
 * @param type
 * @param name
 */
function GD_PIWorkSheetTagPostSourcing(type, name) {
	if (name == 'custrecordgd_physinvttagline_item') {
		if (nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_itemtype') == GD_ITEM_TYPE_ASSEMBLY_ITEM) {
			var itemRolledupCost = LookupSuitelet_LookupField('assemblyitem', nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_item'), 'custitemrvsrolledupcost') || 0;
			nlapiSetCurrentLineItemValue(type, 'custrecordgd_physinvttagline_cost', itemRolledupCost.toFixed(3));
		}
	}
}

/**
 * Validate Fields of the WorkSheet Tag Record
 * @param type
 * @param name
 * @param linenum
 */
function GD_PIWorkSheetTagValidateField(type, name, linenum) {
	if (name == 'custrecordgd_physinvtwrksht_physinvtcnt') {
		var piCountStatus = LookupSuitelet_LookupField('customrecordgd_physicalinventorycount', nlapiGetFieldValue(name), 'custrecordgd_physinvtcount_status');
		
		// Only status of Open PI Count records are allowed.
		if (piCountStatus == GD_PICOUNT_STATUS_NOT_STARTED || piCountStatus == GD_PICOUNT_STATUS_COMPLETE) {
			alert('Physical Inventory Count ' + nlapiGetFieldText(name) + ' is not available for Worksheet Tag entry as it is either NOT STARTED or already COMPLETE. Please choose one that is OPEN.');
			return false;
		}
	} else if (name == 'custpage_physicalinventorycountselect') {
		var piCountStatus = LookupSuitelet_LookupField('customrecordgd_physicalinventorycount', nlapiGetFieldValue(name), 'custrecordgd_physinvtcount_status');
		
		// Only status of Open PI Count records are allowed.
		if (piCountStatus == GD_PICOUNT_STATUS_NOT_STARTED || piCountStatus == GD_PICOUNT_STATUS_COMPLETE) {
			alert('Physical Inventory Count ' + nlapiGetFieldText(name) + ' is not available for Worksheet Tag entry as it is either NOT STARTED or already COMPLETE. Please choose one that is OPEN.');
			return false;
		}
	}
	
	// Validate that PI Count record is set before setting the plant field.
	if (name == 'custrecordgd_physinvtwrksht_plant') {
		var piCountId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt') || '';
		
		if (piCountId == '') {
			alert('Please set the Physical Inventory Count Field first before Setting the Plant.')
			return false;
		} else {
			var plantId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_plant') || '';
			
			if (plantId != '') {
				var filters = new Array();
				filters.push(new nlobjSearchFilter('internalid', null, 'is', piCountId));
				filters.push(new nlobjSearchFilter('custrecordgd_physinvtloctag_plant', 'custrecordgd_physinvtloctag_parent', 'is', plantId));
				filters.push(new nlobjSearchFilter('custrecordgd_physinvtloctag_locked', 'custrecordgd_physinvtloctag_parent', 'is', 'T'));
				
				// check if the location of the PI is locked via a search.
				var piCountVerifyPlantNotLockedSearch = SearchRecord_Suitelet('customrecordgd_physicalinventorycount', null, filters) || [];
				
				if (piCountVerifyPlantNotLockedSearch.length > 0)
				{
					alert('Plant ' + nlapiGetFieldText('custrecordgd_physinvtwrksht_plant') + ' is currently locked and can not be used on this worksheet.');
					return false;
				}
			}
		}
	}
	
	return true;
}
