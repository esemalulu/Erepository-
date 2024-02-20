/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jun 2014     jeffrb
 *
 */


/*****************************************************************************************************
 * 									BEGIN USER EVENT
 *****************************************************************************************************/

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordpit_physicalinventorytags
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */	
function GD_PI_WosksheetBeforeLoad(type, form) {
	if (type != 'delete') {
		if (type == 'view') {
			var componentListTagLine = form.getSubList('recmachcustrecordgd_physinvttagline_parent') || '';
			if (componentListTagLine != '') {
				var attachButton = componentListTagLine.getButton('attach');
				if (attachButton != null)
					attachButton.setDisabled(true);
				
				var newButton = componentListTagLine.getButton('newrecrecmachcustrecordgd_physinvttagline_parent');
				if (newButton != null)
					newButton.setDisabled(true);
			}
		}
		
		if (type == 'edit') {
			
			// Check if the plant is locked
			var customrecordgd_physicalinventorycountSearch = nlapiSearchRecord("customrecordgd_physicalinventorycount",null,
				[
				   ["formulanumeric: CASE WHEN {custrecordgd_physinvtloctag_parent.custrecordgd_physinvtloctag_plant} = {custrecordgd_physinvtwrksht_physinvtcnt.custrecordgd_physinvtwrksht_plant} AND {custrecordgd_physinvtloctag_parent.custrecordgd_physinvtloctag_locked} = 'T' THEN 1 ELSE 0 END","equalto","1"]
				], 
				[
				   new nlobjSearchColumn("name").setSort(false), 
				   new nlobjSearchColumn("scriptid"), 
				   new nlobjSearchColumn("internalid","CUSTRECORDGD_PHYSINVTWRKSHT_PHYSINVTCNT",null)
				]
			) || [];
			
			if (customrecordgd_physicalinventorycountSearch.length > 0) {
				var result = customrecordgd_physicalinventorycountSearch.filter(function(data){return data.getValue("internalid","CUSTRECORDGD_PHYSINVTWRKSHT_PHYSINVTCNT",null) == nlapiGetRecordId}) || null;
				
				if (result != null)
					nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW', null);
			}
			var piCountId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_physinvtcnt') || '';
			if (piCountId != '') {
				var piCountRecord = nlapiLoadRecord('customrecordgd_physicalinventorycount', piCountId);
				if (piCountRecord.getFieldValue('custrecordgd_physinvtcount_status') == GD_PICOUNT_STATUS_COMPLETE) {
					nlapiSetFieldValue('custrecordgd_pilockmessage', '<div style="color:red;font-size: 25px">The Physical Inventory has been set to "Complete" status or the Plant is locked, worksheets can not be edited or add new ones.</div>');
				}
			}
		}
		
		if (type == 'edit' || type == 'copy') {
			var tagLocationSequenceId = nlapiGetFieldValue('custrecordgd_physinvtwrksht_taglocseq') || '';

			if (tagLocationSequenceId != '') {
				var minMaxTagResults = nlapiSearchRecord(
						'customrecordgd_physinventloctags', 
						null, 
						[
	                     ['internalid', 'anyof', tagLocationSequenceId]
	                    ], 
	                    [
	                     new nlobjSearchColumn('custrecordgd_physinvtloctag_starttag', null, 'MIN'),
	                     new nlobjSearchColumn('custrecordgd_physinvtloctag_endtag', null, 'MAX')
	                    ]
				) || [];

				if (minMaxTagResults.length > 0) {
					var field = form.addField('custpage_starttagnum', 'text', 'Satart Tag Num', null, null);
					field.setDisplayType('hidden');
					field.setDefaultValue(minMaxTagResults[0].getValue('custrecordgd_physinvtloctag_starttag', null, 'MIN'));
					field = form.addField('custpage_endtagnum', 'text', 'End Tag Num', null, null);
					field.setDisplayType('hidden');
					field.setDefaultValue(minMaxTagResults[0].getValue('custrecordgd_physinvtloctag_endtag', null, 'MAX'));
				}
			}
		}
		
		if (type == 'edit' || type == 'create') {
			//form.addFieldGroup('custpage_primary', '.', null);
			
			// Hide the physical inventory count field
			var realPicField = nlapiGetField('custrecordgd_physinvtwrksht_physinvtcnt');
			realPicField.setDisplayType('hidden');
			
			// show the on the fly physical inventory field to prevent users from creating new physical inventory count from this field.
			//custrecordgd_physinvtwrksht_date
			var selectField = form.addField('custpage_physicalinventorycountselect', 'select', 'Select Physical Inventory Count', null);
			form.insertField(selectField, 'custrecordgd_physinvtwrksht_date');
			if (nlapiGetContext().getExecutionContext() == 'userinterface')
				selectField.setMandatory(true);
			
			var picHiddenField = form.addField('custpage_physicalinvenotryobjecttext', 'longtext', 'PIC - hidden field', null, null);
			picHiddenField.setDisplayType('hidden');
			var physicalInventoryCountResults = nlapiSearchRecord(
					'customrecordgd_physicalinventorycount',
					null,
					[
                     ['isinactive', 'is', 'F'],
                    ],
                    [
                     new nlobjSearchColumn('internalid').setSort(true),
                     new nlobjSearchColumn('name')
                    ]
			) || [];
			
			var physicalInventoryCountArray = new Array();
			var listObject = new Object();
			if (physicalInventoryCountResults.length > 0) {
				for (var i = 0; i < physicalInventoryCountResults.length; i++) {
					listObject.name = physicalInventoryCountResults[i].getValue('name');
					listObject.internalid = physicalInventoryCountResults[i].getId();
					
					physicalInventoryCountArray.push(listObject);
					listObject = new Object();
				}
				
				picHiddenField.setDefaultValue(JSON.stringify(physicalInventoryCountArray));
			}
		}
	}
}

/**
 * Before submit of the worksheet record
 * @param type
 */
function GD_PI_WosksheetBeforeSubmit(type) {
	if (type == 'delete') {
		// Remove the tag lines before delete of te worksheet record.
		var subListType = 'recmachcustrecordgd_physinvttagline_parent';
		var loopCount = nlapiGetLineItemCount(subListType);
		for (var i = 1; i <= loopCount; i++)
		{
			nlapiDeleteRecord('customrecordgd_physinvttagline', nlapiGetLineItemValue(subListType, 'id', i));
		}
	} else if (type == 'edit') {
		var lineCount = nlapiGetLineItemCount('recmachcustrecordgd_physinvttagline_parent') || 0;
		if (lineCount == 0)
			nlapiSetFieldValue('custrecordgd_physinvtwrksht_totalextcost', 0);
	}
}

/**
 * After the record has been submitted, update the tag lines if necessary.
 * @appliedtorecord customrecordarbocchangeorder
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      
 * @returns {Void}
 */
function GD_PI_WosksheetAfterSubmit(type) {
	//MOVED PROCESING TO BE TRIGGERED BY A BUTTON INSTEAD OF ON SAVE
	// if (type == 'edit' || type == 'create'){
	// 	var tagLinesEmptyDataSearch = nlapiSearchRecord(
	// 		nlapiGetRecordType(), 
	// 		null, 
	// 		[
	// 		 ['internalid', 'is', nlapiGetRecordId()]
	// 		 ,"AND",
    //          [
    //           [['custrecordgd_physinvttagline_parent.custrecordgd_physinvttagline_lastinvpurc', 'isempty', '']
    //           ,"OR",
    //           ['custrecordgd_physinvttagline_parent.custrecordgd_physinvttagline_purchlast3', 'isempty', '']]
    //           ,"OR",
    //           ['custrecordgd_physinvttagline_parent.custrecordgd_physinvttagline_cost', 'isempty', '']
    //          ]
	// 		]
	// 	) || [];

	// 	if (tagLinesEmptyDataSearch.length > 0) {
	// 		// If one of the three columns: last inv + purchases last 3 months, purchases last 3 months, or cost is blank, run the scheduled script that sets these columns.
	// 		var lineCount = nlapiGetLineItemCount('recmachcustrecordgd_physinvttagline_parent') || 0;
	// 		if (lineCount > 0) {
	// 			// Only run the scheduled script if there are existing lines.
	// 			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordgd_pilockedforprocessing', 'T');
	// 			var params = new Object();
	// 			params['custscriptgd_piworksheetcountid'] = nlapiGetRecordId();
	// 			ScheduleScript('customscriptgd_piworksheettagupdate', null, params);
	// 		}
	// 	}
	// }
}