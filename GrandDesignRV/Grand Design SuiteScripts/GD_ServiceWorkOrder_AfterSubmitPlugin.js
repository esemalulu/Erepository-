/**
 * Default implementation for the SRV SWO After Submit plugin
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */
var SRV_OPLINE_SUBLIST = 'recmachcustrecordsrv_opline_swo';
var SRV_OP_PARTLINE_SUBLIST = 'recmachcustrecordsrv_partline_opline';
var SRV_OP_TIMEENTRY_SUBLIST = 'recmachcustrecordsrv_swo_timeentry_opline';

define(['N/record', 'N/search', 'N/runtime', 'N/format', 'N/task', '/.bundle/159149/SRV_Constants', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @paran {format} format
 * @param {task} task
 */
function(record, search, runtime, format, task, SRV_Constants, SSLib_Util, SSLib_Task) {
	
	function SRV_SWO_AfterSubmit(scriptContext) {
		if (scriptContext.type != 'delete') {
			//Update the sublists
			var opLineInfo = SRV_SWO_UpdateSublists(scriptContext);
            var totalsOverrideValue = scriptContext.newRecord.getValue({fieldId: 'custrecordgd_swo_totalsoverride'}) || 0;
            
            var oldRecord = scriptContext.oldRecord;
            
			//If the status is Released, then create the parts order
			if (scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_stage'}) == SRV_Constants.SRV_SWOSTAGE_RELEASED) {
				SRV_SWO_DoReleasedActions(scriptContext, opLineInfo);
			}
			else if (scriptContext.oldRecord != null){
                if (oldRecord.getValue({fieldId: 'custrecordgd_swo_totalsoverride'}) != scriptContext.newRecord.getValue({fieldId: 'custrecordgd_swo_totalsoverride'})) {
                    // passing the warranty and the customer orders so they can be checked in the function if they should be updated (the order exist), or not (order does not exist).
                    SRV_SWO_UpsertPartsOrders(scriptContext, opLineInfo, scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_warrpartsorder'}) || null, scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_custpartsorder'}) || null);
                }
            }
			
			//If the status updated to be Complete, then create the claim and update the parts order.
			if ((scriptContext.oldRecord == null || scriptContext.oldRecord.getValue({fieldId: 'custrecordsrv_swo_stage'}) != SRV_Constants.SRV_SWOSTAGE_COMPLETE) &&
					scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_stage'}) == SRV_Constants.SRV_SWOSTAGE_COMPLETE) {
				SRV_SWO_DoCompletedActions(scriptContext, opLineInfo);
			}
		}
	}
	
	/**
	 * Creates sublist records to match what was submitted through the KO tab.
	 * This does not modify the SWO record, but instead creates Op Line records that have a parent of the current record. See below for why.
	 * 
	 * @param scriptContext The script context from the After Submit entry point
	 */
	function SRV_SWO_UpdateSublists(scriptContext) {
		
		var opLineInfo = {hasCustomerLines: false, hasWarrantyLines: false}; //We'll return this object so we don't have to re-process the op lines when creating the parts orders.

		//Get KO data.
		var koDataStr = scriptContext.newRecord.getValue({fieldId: 'custpage_srvkodata'}) || '';
		if (koDataStr != '') {
			var koData = JSON.parse(koDataStr);
			
			//Get all of the operation lines currently on the SWO record so we can delete them later if they were removed in knockout.
			var allOpIds = [];
			if (scriptContext.oldRecord != null) {
				for (var i = 0; i < scriptContext.oldRecord.getLineCount({sublistId: SRV_OPLINE_SUBLIST}); i++) {
					allOpIds.push(scriptContext.oldRecord.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'id', line: i}));
				}
			}
            
			var originalAmount = 0;
			var originalSubletAmount = 0;
			
			//Loop over the op lines from the ko tab and submit actual op line records. You must do this instead of submitting records on the SWO
			// b/c the part line is both a child and a grandchild of the SWO. It is also a child of the Op Line, which would make it
			// impossible to link the part line to the op line if the op line is new (b/c then the op line doesn't have an id).
			//We also have to do this in AfterSubmit so that the SWO actually has an ID, which it doesn't have on BeforeSubmit if it is new.
			for (var i = 0; i < koData.operationLines.length; i++) {
				
				//Load/create the op line record
				var curOpLine = koData.operationLines[i];
				var opId = SSLib_Util.convertNSFieldToString(curOpLine.id);
				var oplineRec = opId.length > 0 ? record.load({type: 'customrecordsrv_opline', id: opId, isDynamic: true}) : record.create({type: 'customrecordsrv_opline', isDynamic: true});
				if (opId.length > 0) {
					var curOpIdx = allOpIds.indexOf(opId);
					if (curOpIdx > -1) allOpIds.splice(curOpIdx, 1);
				}
				
				//Set the flat rate code. Don't set it if it hasn't changed. If it changed and it's inactive, 
				//briefly activate to set it on the op line, then re-inactivate it. 
				var flatRateCode = curOpLine.selectedFlatRateCode.id;
				if(flatRateCode != oplineRec.getValue({fieldId: 'custrecordsrv_opline_code'})) {
					if(search.lookupFields({type: 'customrecordrvsflatratecodes', id: flatRateCode, columns: 'isinactive'}).isinactive) {
						record.submitFields({type: 'customrecordrvsflatratecodes', id: flatRateCode, values: {isinactive: 'F'}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
						oplineRec.setValue({fieldId: 'custrecordsrv_opline_code', value: flatRateCode});
						record.submitFields({type: 'customrecordrvsflatratecodes', id: flatRateCode, values: {isinactive: 'T'}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
					} 
					else {
						oplineRec.setValue({fieldId: 'custrecordsrv_opline_code', value: flatRateCode});
					}
				}
				
				// Get the operation line original amount and the original sublet amount before they get overridden.
				originalAmount = oplineRec.getValue({fieldId: 'custrecordsrv_opline_amt'});
				originalSubletAmount = oplineRec.getValue({fieldId: 'custrecordsrv_opline_subletamt'});
				
				//Set the rest of the body fields
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_swo', value: scriptContext.newRecord.id});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_paymenttype', value: curOpLine.selectedPaymentType.id});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_faultcode', value: curOpLine.selectedFaultCode.id});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_itemcat1', value: curOpLine.selectedItemCat1 ? curOpLine.selectedItemCat1.id : ''});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_itemcat2', value: curOpLine.selectedItemCat2 ? curOpLine.selectedItemCat2.id : ''});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_complaint', value: curOpLine.complaint});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_cause', value: curOpLine.cause});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_correction', value: curOpLine.correction});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_manufacturer', value: curOpLine.manufacturer});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_modelnum', value: curOpLine.modelNumber});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_serialnum', value: curOpLine.serialNumber});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_time', value: parseFloat(curOpLine.timeAllowed)});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_timerequired', value: parseFloat(curOpLine.timeRequired)});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_amt', value: curOpLine.amount});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_subletamt', value: curOpLine.subletAmount});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_techinfo', value: curOpLine.techInfo});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_notes', value: curOpLine.notes});
				oplineRec.setValue({fieldId: 'custrecordsrv_opline_sortorder', value: i});
				// Set original amount here so that if the customer wants to reset the override back to original, the operation line amount can be recovered.
				oplineRec.setValue({fieldId: 'custrecordgd_opline_originalamount', value: originalAmount}); 
				oplineRec.setValue({fieldId: 'custrecordgd_opline_origsubletamnt', value: originalSubletAmount}); 
				
				//Update whether or not we found a customer or warranty line.
				if (curOpLine.selectedPaymentType.id == SRV_Constants.SRV_PAYMENTTYPE_CUSTOMER || curOpLine.selectedPaymentType.id == SRV_Constants.SRV_PAYMENTTYPE_INSURANCE) {
					opLineInfo.hasCustomerLines = true;
				}
				else {
					opLineInfo.hasWarrantyLines = true;
				}
				
				//Do a smart delete/update on part lines.
				
				//First, create a dictionary of the current NS part lines and their indices so later we can remove the ones that aren't in the knockout.
				var nsPartLineDict = {};
				//We also need an array of part line ids because the order matters when we're removing, and this way we can be sure to remove in reverse order of line # when we do that below.
				var nsPartLines = [];
				for (var j = 0; j < oplineRec.getLineCount({sublistId: SRV_OP_PARTLINE_SUBLIST}); j++) {
					var id = oplineRec.getSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'id', line: j});
					nsPartLineDict[id] = j;
					nsPartLines.push(id);
				}
				
				//Then loop through the knockout data and update each NetSuite line item accordingly.
				for (var j = 0; j < curOpLine.partLines.length; j++) {

					var curPartLine = curOpLine.partLines[j];
					//Get the index of this part line from our dictionary
					var partLineIdx = nsPartLineDict[curPartLine.id];

					//Select the NetSuite sublist line or create a new one.
					if (partLineIdx != undefined) {
						oplineRec.selectLine({sublistId: SRV_OP_PARTLINE_SUBLIST, line: partLineIdx});
						
						//delete it from the nsPartLines array, to indicate that we've processed the line.
						nsPartLines.splice(nsPartLines.indexOf(curPartLine.id),1);
					}
					else {
						oplineRec.selectNewLine({sublistId: SRV_OP_PARTLINE_SUBLIST});
						oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_swo', value: scriptContext.newRecord.id});
					}
					
					//Set or update the values from the knockout data, and commit the line.
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_item', value: curPartLine.item.id});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_desc', value: curPartLine.description});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_qty', value: curPartLine.quantity});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_uom', value: (curPartLine.selectedUOM ? curPartLine.selectedUOM.id : null)});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_rate', value: SSLib_Util.convertNSFieldToFloat(curPartLine.rate).toFixed(2)});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_amt', value: SSLib_Util.convertNSFieldToFloat(curPartLine.amount).toFixed(2)});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_isvcb', value: curPartLine.isVCB});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_isdiscount', value: curPartLine.item.isDiscount})
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_notes', value: curPartLine.notes});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_sortorder', value: j});
					oplineRec.commitLine({sublistId: SRV_OP_PARTLINE_SUBLIST});
				}
				
				//Remove the part lines we didn't encounter.
				//Since the part line record is set up with "Allow Delete" checked, removing them from their parent sublist deletes them.
				for (var j = nsPartLines.length - 1; j >= 0; j--) {
					oplineRec.removeLine({sublistId: SRV_OP_PARTLINE_SUBLIST, line: nsPartLineDict[nsPartLines[j]]});
				}

				
				//Do a smart delete/update on time entry lines.
				
				//Go through the knockout time entry data and group entries by tech (for this op line). 
				var consolidatedTimeEntries = {};
				var consolidatedTechs = [];
				for (var j = 0; j < curOpLine.timeEntries.length; j++) {
					
					var curTimeEntry = curOpLine.timeEntries[j];
					var timeEntryId = SSLib_Util.convertNSFieldToString(curTimeEntry.id); //Internal id of the time entry record.
					var koTech = curTimeEntry.tech || ''; //Tech can be empty
					var time = parseFloat(curTimeEntry.time);
					
					if(consolidatedTimeEntries.hasOwnProperty(koTech))
						consolidatedTimeEntries[koTech] += time;
					else{
						consolidatedTimeEntries[koTech]= time;
						consolidatedTechs.push(koTech);
					}
				}
				
				//Set the number of techs. This is used in efficiency reports, and is only updated here. 
				oplineRec.setValue('custrecordsrv_opline_numberoftechs',consolidatedTechs.length);
				
				//Walk through the existing NetSuite time entry lines in reverse, updating or removing based on what's in the consolidated KO data.
				for (var j = oplineRec.getLineCount({sublistId: SRV_OP_TIMEENTRY_SUBLIST}) - 1; j >= 0; j--) {
					
					//Select the line and read the tech.
					oplineRec.selectLine({sublistId: SRV_OP_TIMEENTRY_SUBLIST, line: j});
					var nsTech = oplineRec.getCurrentSublistValue({sublistId: SRV_OP_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_tech', line: j});
					
					//If this NetSuite tech isn't in the Knockout, remove this time entry line.
					//Since the time entry record is set up with "Allow Delete" checked, removing them from their parent sublist deletes them.
					//Otherwise, update this time entry line with the the amount from the knockout, and commit the line.
					if(consolidatedTechs.indexOf(nsTech) == -1){
						oplineRec.removeLine({sublistId: SRV_OP_TIMEENTRY_SUBLIST, line: j});
					}
					else{
						oplineRec.setCurrentSublistValue({sublistId: SRV_OP_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_time', value: consolidatedTimeEntries[nsTech]});
						oplineRec.commitLine({sublistId: SRV_OP_TIMEENTRY_SUBLIST});
						
						//We've taken care of this tech, so remove them from the list.
						consolidatedTechs.splice(consolidatedTechs.indexOf(nsTech), 1);
					}
				}
				
				//Then go through the remaining consolidated techs, and create a line for each.
				for (var j = 0; j < consolidatedTechs.length; j++) {
					oplineRec.selectNewLine({sublistId: SRV_OP_TIMEENTRY_SUBLIST}); 
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_swo', value: scriptContext.newRecord.id});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_tech', value: consolidatedTechs[j]});
					oplineRec.setCurrentSublistValue({sublistId: SRV_OP_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_time', value: consolidatedTimeEntries[consolidatedTechs[j]]});
					oplineRec.commitLine({sublistId: SRV_OP_TIMEENTRY_SUBLIST});				
				}

				//Submit the operation line record
				oplineRec.save();
			}
			
			//The only values left in the allOpIds array are those operation lines that did not exist in the koData. This means they were removed by the 
			//user, and we need to delete them and any child records.
			for(var i = 0; i < allOpIds.length; i++) {

				//We load the op line and remove all of the part and time entry sublist lines before deleting the operation line. 
				//Since these child records are set up with "Allow Delete" checked, removing them from their parent sublist deletes them.
				var oplineRec = record.load({type: 'customrecordsrv_opline', id: allOpIds[i], isDynamic: true})
				
				for (var j = oplineRec.getLineCount({sublistId: SRV_OP_PARTLINE_SUBLIST}) - 1; j >= 0; j--) {
					oplineRec.removeLine({sublistId: SRV_OP_PARTLINE_SUBLIST, line: j});
				}
				
				for (var j = oplineRec.getLineCount({sublistId: SRV_OP_TIMEENTRY_SUBLIST}) - 1; j >= 0; j--) {
					oplineRec.removeLine({sublistId: SRV_OP_TIMEENTRY_SUBLIST, line: j});
				}

				//Save the operation line, thus deleting all the child records, and then go ahead and delete that operation line record.
				oplineRec.save();
				eval("record.delete({type: 'customrecordsrv_opline', id: allOpIds[i]})");
			}
			
		}
		return opLineInfo;
	}
	
	/**
	 * Creates a parts order for the Service Work Order.
	 * 
	 * @param scriptContext The script context from the After Submit entry point
	 */
	function SRV_SWO_DoReleasedActions(scriptContext, opLineInfo) {
		//Create/update the parts order
		SRV_SWO_UpsertPartsOrders(scriptContext, opLineInfo);
	}
	
	/**
	 * Creates the Claim from the Service Work Order and updates the sub-parts order.
	 */
	function SRV_SWO_DoCompletedActions(scriptContext, opLineInfo) {
		//Create/Update the parts order
		SRV_SWO_UpsertPartsOrders(scriptContext, opLineInfo);
		
		//Create the claim from any Warranty op lines. Automatically mark it as Approved.
		SRV_SWO_CreateClaimFromSWO(scriptContext);
	}
	
	/**
	 * Creates/Updates the parts sales order for the current SWO with the new parts information.
	 * 
	 * @param scriptContext User Event script context for the record
	 * @param {Object} opLineInfo Object with properties hasCustomerLines and hasWarrantyLines that determines which parts orders are created.
	 */
	function SRV_SWO_UpsertPartsOrders(scriptContext, opLineInfo, warrPartsOrderExist, custPartsOrderExist) {
		var curScript = runtime.getCurrentScript();
		var lineAddedDate = new Date();//format.format({value: new Date(), type: format.Type.DATE}).toString();
		var locationId = scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_location'});
		
		//Create/load the Warranty Order. If there are no lines, delete the order.
		var warrPartsOrder = null;
		var warrPartsOrderId = SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_warrpartsorder'})) || '';
		// only process if there are warrantyLines and either there is an order already created, or there isn't an order but this is not a totals override processing
		if (opLineInfo.hasWarrantyLines && (warrPartsOrderId != '' || warrPartsOrderExist == null)) {
			if (warrPartsOrderId.length > 0) {
				warrPartsOrder = record.load({type: 'salesorder', id: warrPartsOrderId, isDynamic: true});
			}
			else {
				warrPartsOrder = record.create({type: 'salesorder', isDynamic: true});
			}
			//Set the body fields.
			warrPartsOrder.setValue({fieldId: 'customform', id: curScript.getParameter({name: 'custscriptpartsorderform'})});
			warrPartsOrder.setValue({fieldId: 'entity', value: curScript.getParameter({name: 'custscriptsrv_internalwarrantydealer'})});
			warrPartsOrder.setValue({fieldId: 'otherrefnum', value: 'SWO #' + scriptContext.newRecord.id});
			warrPartsOrder.setValue({fieldId: 'location', value: locationId});
			warrPartsOrder.setValue({fieldId: 'custbodyrvsunit', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_unit'})});
			warrPartsOrder.setValue({fieldId: 'custbodysrv_serviceworkorder', value: scriptContext.newRecord.id});
			warrPartsOrder.setValue({fieldId: 'custbodyrvsordertype', value: 1}); //Parts
			warrPartsOrder.setValue({fieldId: 'custbodyrvsactiontype', value: 7}); //PartsOrder
			warrPartsOrder.setValue({fieldId: 'department', value: scriptContext.newRecord.getValue({fieldId: 'custrecorddepartment' })}); //Department

			//Get all of the information for the parts and labor lines. Store it in an array to use later.
			var goodwillDiscountTotal = 0;
			var warrantyDiscountTotal = 0;
			var itemLines = [];
			search.create({
				type: 'customrecordsrv_partline',
				filters: [['isinactive', 'is', false], 'AND', ['custrecordsrv_partline_swo', 'is', scriptContext.newRecord.id], 'AND',
				          ['custrecordsrv_partline_opline.custrecordsrv_opline_paymenttype', 'anyof', [SRV_Constants.SRV_PAYMENTTYPE_WARRANTY, SRV_Constants.SRV_PAYMENTTYPE_GOODWILL]]],
				columns: [search.createColumn({name: 'custrecordsrv_opline_sortorder', join: 'custrecordsrv_partline_opline', sort: search.Sort.ASC}),
				          search.createColumn({name: 'custrecordsrv_partline_sortorder', sort: search.Sort.ASC}), 
				          search.createColumn({name: 'custrecordsrv_partline_item'}),
				          search.createColumn({name: 'custrecordsrv_partline_desc'}),
				          search.createColumn({name: 'custrecordsrv_partline_qty'}),
				          search.createColumn({name: 'custrecordsrv_partline_uom'}),
				          search.createColumn({name: 'custrecordsrv_partline_amt'}),
				          search.createColumn({name: 'custrecordsrv_partline_notes'}),
				          search.createColumn({name: 'custrecordsrv_opline_paymenttype', join: 'custrecordsrv_partline_opline'})]
			}).run().each(function(result) {
				itemLines.push({
					item: result.getValue({name: 'custrecordsrv_partline_item'}),
					units: result.getValue({name: 'custrecordsrv_partline_uom'}),
					desc: result.getValue({name: 'custrecordsrv_partline_desc'}),
					qty: SSLib_Util.convertNSFieldToFloat(result.getValue({name: 'custrecordsrv_partline_qty'})),
					amount: SSLib_Util.convertNSFieldToFloat(result.getValue({name: 'custrecordsrv_partline_amt'})),
					notes: result.getValue({name: 'custrecordsrv_partline_notes'}),
					paymentType: result.getValue({name: 'custrecordsrv_opline_paymenttype', join: 'custrecordsrv_partline_opline'}),
					partLineId: result.id
				});
				return true;
			});
			search.create({
				type: 'customrecordsrv_opline',
				filters: [['isinactive', 'is', false], 'AND', ['custrecordsrv_opline_swo', 'is', scriptContext.newRecord.id], 'AND',
				          ['custrecordsrv_opline_paymenttype', 'anyof', [SRV_Constants.SRV_PAYMENTTYPE_WARRANTY, SRV_Constants.SRV_PAYMENTTYPE_GOODWILL]]],
				columns: [search.createColumn({name: 'custrecordsrv_opline_sortorder', sort: search.Sort.ASC}),
				          search.createColumn({name: 'custrecordsrv_opline_paymenttype'}),
				          search.createColumn({name: 'custrecordsrv_opline_amt'}),
				          search.createColumn({name: 'custrecordsrv_opline_subletamt'})]
			}).run().each(function(result) {
				var curLabor = SSLib_Util.convertNSFieldToFloat(result.getValue('custrecordsrv_opline_amt'));
				if (curLabor > 0) {
					itemLines.push({
						item: curScript.getParameter({name: 'custscriptsrv_laboritem'}),
						qty: 1,
						amount: curLabor,
						paymentType: result.getValue({name: 'custrecordsrv_opline_paymenttype'}),
						partLineId: ''
					});
				}
				
				var curSublet = SSLib_Util.convertNSFieldToFloat(result.getValue('custrecordsrv_opline_subletamt'));
				if (curSublet > 0) {
					itemLines.push({
						item: curScript.getParameter({name: 'custscriptsrv_subletitem'}),
						qty: 1,
						amount: curSublet,
						paymentType: result.getValue({name: 'custrecordsrv_opline_paymenttype'}),
						partLineId: ''
					});
				}
				
				return true;
			});
			
			//Loop over all of the part lines in the order. If we don't find an item that matches this line, then delete it.
			// Otherwise update the line with the new information.
			for (var i = warrPartsOrder.getLineCount({sublistId: 'item'}) - 1; i > -1; i--) {
				//Get the search result that matches this line.
				warrPartsOrder.selectLine({sublistId: 'item', line: i});
				var itemId = warrPartsOrder.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'});
				var partLineRecId = warrPartsOrder.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_partlinerecord'});
				var curItemResult = null;
				if(itemId == curScript.getParameter({name: 'custscriptsrv_subletitem'}) || itemId == curScript.getParameter({name: 'custscriptsrv_laboritem'}))
				{
					curItemResult = findItemResultObjectByItemId(itemLines, itemId);
				}
				else if(partLineRecId != null && partLineRecId != '')
				{
					curItemResult = findItemResultObjectByPartLineId(itemLines, partLineRecId);
				}
				
				if (curItemResult == null) {
					//If we didn't find an item, then we need to delete the line
					try {
						warrPartsOrder.removeLine({sublistId: 'item', line: i});
					}
					catch(err) {}
				}
				else {
					//If we did find an item, update the line.
					//Keep track of the discount totals for the end.
					var curAmount = curItemResult.amount;
					if (curItemResult.paymentType == SRV_Constants.SRV_PAYMENTTYPE_WARRANTY) warrantyDiscountTotal += curAmount;
					else if (curItemResult.paymentType == SRV_Constants.SRV_PAYMENTTYPE_GOODWILL) goodwillDiscountTotal += curAmount;
					
					//Set the line item values
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'}); //custom price
					if(curItemResult.units) warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'units', value: curItemResult.units});
					if(curItemResult.desc) warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: curItemResult.desc});
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: curItemResult.qty});
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: curAmount});
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolrvspartsnotes', value: curItemResult.notes});
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_servicepaymenttype', value: curItemResult.paymentType});
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_partlinerecord', value: curItemResult.partLineId});
					warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: locationId});
					warrPartsOrder.commitLine({sublistId: 'item'});
				}
			}
			
			//Loop over the remaining objects in the itemLines array and add them to the order.
			// The items in the array are the ones that didn't match any of the lines already on the order.
			for (var i = 0; i < itemLines.length; i++) {
				var curItemResult = itemLines[i];
				
				//Keep track of the discount totals for the end.
				var curAmount = curItemResult.amount;
				if (curItemResult.paymentType == SRV_Constants.SRV_PAYMENTTYPE_WARRANTY) warrantyDiscountTotal += curAmount;
				else if (curItemResult.paymentType == SRV_Constants.SRV_PAYMENTTYPE_GOODWILL) goodwillDiscountTotal += curAmount;
				
				//Add a new line.
				warrPartsOrder.selectNewLine({sublistId: 'item'});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curItemResult.item});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'}); //custom price
				if(curItemResult.units) warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'units', value: curItemResult.units});
				if(curItemResult.desc) warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: curItemResult.desc});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: curItemResult.qty});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: curAmount});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolrvspartsnotes', value: curItemResult.notes});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_servicepaymenttype', value: curItemResult.paymentType});
				//warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolgd_lineaddeddate', value: lineAddedDate});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_partlinerecord', value: curItemResult.partLineId});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: locationId});
				warrPartsOrder.commitLine({sublistId: 'item'});
			}
			
			//Add the warranty and/or goodwill discounts if they are greater than 0.
			if(warrantyDiscountTotal > 0) {
				warrPartsOrder.selectNewLine({sublistId: 'item'});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curScript.getParameter({name: 'custscriptsrv_warrantydiscount'})});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'}); //custom price
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: -1 * warrantyDiscountTotal});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_servicepaymenttype', value: SRV_Constants.SRV_PAYMENTTYPE_WARRANTY});
				//warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolgd_lineaddeddate', value: lineAddedDate});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: locationId});
				warrPartsOrder.commitLine({sublistId: 'item'});
			}
			if(goodwillDiscountTotal > 0) {
				warrPartsOrder.selectNewLine({sublistId: 'item'});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curScript.getParameter({name: 'custscriptsrv_goodwilldiscount'})});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'}); //custom price
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: -1 * goodwillDiscountTotal});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_servicepaymenttype', value: SRV_Constants.SRV_PAYMENTTYPE_GOODWILL});
				//warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolgd_lineaddeddate', value: lineAddedDate});
				warrPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: locationId});
				warrPartsOrder.commitLine({sublistId: 'item'});
			}
			
			//Submit the order and set it on the SWO.
			if (warrPartsOrder.getLineCount({sublistId: 'item'}) > 0) {
				var partsOrderId = warrPartsOrder.save({ignoreMandatoryFields: true});
				record.submitFields({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id, values: {custrecordsrv_swo_warrpartsorder: partsOrderId}});
			}
			else if (SSLib_Util.convertNSFieldToString(warrPartsOrder.id).length > 0) {
				//If there are no longer any lines on the order and we're editing the order, then delete the parts order.
				try {
					eval("record.delete({type: 'salesorder', id: warrPartsOrder.id});");
				}
				catch(err) {}
			}
		}
		else if (warrPartsOrderId.length > 0) {
			try {
				eval("record.delete({type: 'salesorder', id: warrPartsOrderId});");
			}
			catch(err) {}
		}
		
		//Do the same with the Customer Order...
		var custPartsOrder = null;
		var custPartsOrderId = SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_custpartsorder'})) || '';

		// Only process if there are customer lines and either there is an order already created, or there isn't an order but this is not a totals override processing.
		if (opLineInfo.hasCustomerLines && (custPartsOrderId != '' || custPartsOrderExist == null)) {
			if (custPartsOrderId.length > 0) {
				custPartsOrder = record.load({type: 'salesorder', id: custPartsOrderId, isDynamic: true});
			}
			else {
				custPartsOrder = record.create({type: 'salesorder', isDynamic: true});
			}
			//Set the body fields.
			var urcDealer = scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_retailcustdealer'});
			custPartsOrder.setValue({fieldId: 'customform', id: curScript.getParameter({name: 'custscriptpartsorderform'})});
			custPartsOrder.setValue({fieldId: 'entity', value: urcDealer});
			custPartsOrder.setValue({fieldId: 'otherrefnum', value: 'SWO #' + scriptContext.newRecord.id});
			custPartsOrder.setValue({fieldId: 'location', value: locationId});
			custPartsOrder.setValue({fieldId: 'custbodyrvsunit', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_unit'})});
			custPartsOrder.setValue({fieldId: 'custbodysrv_serviceworkorder', value: scriptContext.newRecord.id});
			custPartsOrder.setValue({fieldId: 'custbodyrvsordertype', value: 1}); //Parts
			custPartsOrder.setValue({fieldId: 'custbodyrvsactiontype', value: 7}); //PartsOrder
			custPartsOrder.setValue({fieldId: 'department', value: scriptContext.newRecord.getValue({fieldId: 'custrecorddepartment' })}); //Department

			//Set the customer order to be taxable and set the tax information on the order if the customer is taxable (doesn't have a tax ID)
			//The company preference must also be set in order for tax to 
			var customerIsTaxable = false;
			var compPrefTaxItem = SSLib_Util.convertNSFieldToString(curScript.getParameter({name: 'custscriptsrv_defaulttaxcode'}));
			if(compPrefTaxItem.length > 0 && SSLib_Util.convertNSFieldToString(search.lookupFields({type: 'customer', id: urcDealer, columns: 'vatregnumber'}).vatregnumber).length == 0) {
				customerIsTaxable = true;
				custPartsOrder.setValue({fieldId: 'istaxable', value: true});
				custPartsOrder.setValue({fieldId: 'taxitem', value: compPrefTaxItem});
			}
			
			//Get all of the information for the parts and labor lines. Store it in an array to use later.
			var itemLines = [];
			search.create({
				type: 'customrecordsrv_partline',
				filters: [['isinactive', 'is', false], 'AND', ['custrecordsrv_partline_swo', 'is', scriptContext.newRecord.id], 'AND',
				          ['custrecordsrv_partline_opline.custrecordsrv_opline_paymenttype', 'anyof', [SRV_Constants.SRV_PAYMENTTYPE_CUSTOMER, SRV_Constants.SRV_PAYMENTTYPE_INSURANCE]]],
				columns: [search.createColumn({name: 'custrecordsrv_opline_sortorder', join: 'custrecordsrv_partline_opline', sort: search.Sort.ASC}),
				          search.createColumn({name: 'custrecordsrv_partline_sortorder', sort: search.Sort.ASC}), 
				          search.createColumn({name: 'custrecordsrv_partline_item'}),
				          search.createColumn({name: 'custrecordsrv_partline_desc'}),
				          search.createColumn({name: 'custrecordsrv_partline_qty'}),
				          search.createColumn({name: 'custrecordsrv_partline_uom'}),
				          search.createColumn({name: 'custrecordsrv_partline_amt'}),
				          search.createColumn({name: 'custrecordsrv_partline_notes'}),
				          search.createColumn({name: 'custrecordsrv_opline_paymenttype', join: 'custrecordsrv_partline_opline'})]
			}).run().each(function(result) {
				itemLines.push({
					item: result.getValue({name: 'custrecordsrv_partline_item'}),
					units: result.getValue({name: 'custrecordsrv_partline_uom'}),
					desc: result.getValue({name: 'custrecordsrv_partline_desc'}),
					qty: SSLib_Util.convertNSFieldToFloat(result.getValue({name: 'custrecordsrv_partline_qty'})),
					amount: SSLib_Util.convertNSFieldToFloat(result.getValue({name: 'custrecordsrv_partline_amt'})),
					notes: result.getValue({name: 'custrecordsrv_partline_notes'}),
					paymentType: result.getValue({name: 'custrecordsrv_opline_paymenttype', join: 'custrecordsrv_partline_opline'}),
					isTaxable: customerIsTaxable,
					partLineId: result.id
				});
				return true;
			});
			search.create({
				type: 'customrecordsrv_opline',
				filters: [['isinactive', 'is', false], 'AND', ['custrecordsrv_opline_swo', 'is', scriptContext.newRecord.id], 'AND',
				          ['custrecordsrv_opline_paymenttype', 'anyof', [SRV_Constants.SRV_PAYMENTTYPE_CUSTOMER, SRV_Constants.SRV_PAYMENTTYPE_INSURANCE]]],
				columns: [search.createColumn({name: 'custrecordsrv_opline_sortorder', sort: search.Sort.ASC}),
				          search.createColumn({name: 'custrecordsrv_opline_paymenttype'}),
				          search.createColumn({name: 'custrecordsrv_opline_amt'}),
				          search.createColumn({name: 'custrecordsrv_opline_subletamt'})]
			}).run().each(function(result) {
				var curLabor = SSLib_Util.convertNSFieldToFloat(result.getValue('custrecordsrv_opline_amt'));
				if (curLabor > 0) {
					itemLines.push({
						item: curScript.getParameter({name: 'custscriptsrv_laboritem'}),
						qty: 1,
						amount: curLabor,
						paymentType: result.getValue({name: 'custrecordsrv_opline_paymenttype'}),
						isTaxable: false, //never tax labor
						partLineId: ''
					});
				}
				
				var curSublet = SSLib_Util.convertNSFieldToFloat(result.getValue('custrecordsrv_opline_subletamt'));
				if (curSublet > 0) {
					itemLines.push({
						item: curScript.getParameter({name: 'custscriptsrv_subletitem'}),
						qty: 1,
						amount: curSublet,
						paymentType: result.getValue({name: 'custrecordsrv_opline_paymenttype'}),
						isTaxable: false, //never tax labor
						partLineId: ''
					});
				}
				
				return true;
			});
			
			//Loop over all of the part lines in the order. If we don't find an item that matches this line, then delete it.
			// Otherwise update the line with the new information.
			for (var i = custPartsOrder.getLineCount({sublistId: 'item'}) - 1; i > -1; i--) {
				//Get the search result that matches this line.
				custPartsOrder.selectLine({sublistId: 'item', line: i});
				var itemId = custPartsOrder.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'});
				var curItemResult = null;
				if(itemId == curScript.getParameter({name: 'custscriptsrv_subletitem'}) || itemId == curScript.getParameter({name: 'custscriptsrv_laboritem'}))
				{
					curItemResult = findItemResultObjectByItemId(itemLines, itemId);
				}
				else
				{
					curItemResult = findItemResultObjectByPartLineId(itemLines, custPartsOrder.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_partlinerecord'}));
				}
				
				if (curItemResult == null) {
					//If we didn't find an item, then we need to delete the line
					try {
						custPartsOrder.removeLine({sublistId: 'item', line: i});
					}
					catch(err) {}
				}
				else {
					//Set the line item values
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'}); //custom price
					if(curItemResult.units) custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'units', value: curItemResult.units});
					if(curItemResult.desc) custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: curItemResult.desc});
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: curItemResult.qty});
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: curItemResult.amount});
					if(curItemResult.isTaxable) custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'istaxable', value: true});
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolrvspartsnotes', value: curItemResult.notes});
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_servicepaymenttype', value: curItemResult.paymentType});
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_partlinerecord', value: curItemResult.partLineId});
					custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: locationId});
					custPartsOrder.commitLine({sublistId: 'item'});
				}
			}
			
			//Loop over the remaining objects in the itemLines array and add them to the order.
			// The items in the array are the ones that didn't match any of the lines already on the order.
			for (var i = 0; i < itemLines.length; i++) {
				var curItemResult = itemLines[i];
				//Add a new line.
				custPartsOrder.selectNewLine({sublistId: 'item'});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curItemResult.item});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'}); //custom price
				if(curItemResult.units) custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'units', value: curItemResult.units});
				if(curItemResult.desc) custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: curItemResult.desc});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: curItemResult.qty});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: curItemResult.amount});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolrvspartsnotes', value: curItemResult.notes});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'istaxable', value: curItemResult.isTaxable});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_servicepaymenttype', value: curItemResult.paymentType});
				//custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolgd_lineaddeddate', value: lineAddedDate});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolsrv_partlinerecord', value: curItemResult.partLineId});
				custPartsOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: locationId});
				custPartsOrder.commitLine({sublistId: 'item'});
			}
			
			//Submit the order and set it on the SWO.
			if (custPartsOrder.getLineCount({sublistId: 'item'}) > 0) {
				var partsOrderId = custPartsOrder.save({ignoreMandatoryFields: true});
				record.submitFields({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id, values: {custrecordsrv_swo_custpartsorder: partsOrderId}});
			}
			else if (SSLib_Util.convertNSFieldToString(custPartsOrder.id).length > 0) {
				//If there are no longer any lines on the order and we're editing the order, then delete the parts order.
				try {
					eval("record.delete({type: 'salesorder', id: custPartsOrder.id});");
				}
				catch(err) {}
			}
		}
		else if (custPartsOrderId.length > 0) {
			try {
				eval("record.delete({type: 'salesorder', id: custPartsOrderId});");
			}
			catch(err) {}
		}
	}
	
	/**
	 * Creates a claim based on the operation lines on the SWO marked as Warranty.
	 * Note that we can't use scriptContext.newRecord to get any of the sublist value, since we just submitted the sublist records as actual records
	 *  just prior to this. So the records don't exist in scriptContext.
	 *  
	 * Will not create a Claim if no warranty op lines are found. 
	 */
	function SRV_SWO_CreateClaimFromSWO(scriptContext) {
		//Because op lines may or may not contain parts, we cannot simply search on the part lines. We also don't want to load records in a loop, so do two searches.
		//We need to search on the op lines and then search on the parts for those op lines.
		var opLineIds = [];
		var opLineResults = [];
		search.create({
			type: 'customrecordsrv_opline',
			filters: [['isinactive', 'is', false], 'AND', ['custrecordsrv_opline_swo', 'is', scriptContext.newRecord.id], 'AND', ['custrecordsrv_opline_paymenttype', 'is', SRV_Constants.SRV_PAYMENTTYPE_WARRANTY]],
			columns: [search.createColumn({name: 'custrecordsrv_opline_sortorder', sort: search.Sort.ASC}),
			          search.createColumn({name: 'custrecordsrv_opline_code'}),
			          search.createColumn({name: 'custrecordsrv_opline_faultcode'}),
			          search.createColumn({name: 'custrecordsrv_opline_complaint'}),
			          search.createColumn({name: 'custrecordsrv_opline_cause'}),
			          search.createColumn({name: 'custrecordsrv_opline_correction'}),
			          search.createColumn({name: 'custrecordsrv_opline_manufacturer'}),
			          search.createColumn({name: 'custrecordsrv_opline_modelnum'}),
			          search.createColumn({name: 'custrecordsrv_opline_serialnum'}),
			          search.createColumn({name: 'custrecordsrv_opline_time'}),
			          search.createColumn({name: 'custrecordsrv_opline_amt'}),
			          search.createColumn({name: 'custrecordsrv_opline_subletamt'}),
			          search.createColumn({name: 'custrecordsrv_swo_unit', join: 'custrecordsrv_opline_swo'})] 
		}).run().each(function(result) {
			opLineIds.push(result.id);
			opLineResults.push(result);
			return true;
		});
		
		//Only create the claim and search for part lines if we found warranty op lines.
		if (opLineIds.length > 0) {
			//Create the claim
			var claimRec = record.create({type: 'customrecordrvsclaim', isDynamic: true});
			var curScript = runtime.getCurrentScript();
			
			//look up the retail customer name if the retail customer is set.
			var retailCustomerId = scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_unitretailcust'}) || '';
			if(retailCustomerId != '') {
            	var retailCustomerName = search.lookupFields({  
	            	type: 'customrecordrvsunitretailcustomer',
	                id: retailCustomerId,
	                columns: 'name',
            	}).name;
    			claimRec.setText({fieldId: 'custrecordclaim_retailcustomername', text: retailCustomerName});
    			claimRec.setValue({fieldId: 'custrecordclaim_retailcustomer', value: retailCustomerId});
			}
			
			//Set the rest of the body fields
			claimRec.setValue({fieldId: 'custrecordclaim_customer', value: curScript.getParameter({name: 'custscriptsrv_internalwarrantydealer'})});
			claimRec.setValue({fieldId: 'custrecordclaim_unit', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_unit'})});
			claimRec.setValue({fieldId: 'custrecordclaim_status', value: SRV_Constants.CLAIM_STATUS_APPROVED});
			claimRec.setValue({fieldId: 'custrecordclaim_datedroppedoff', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_arriveddate'})});
			claimRec.setValue({fieldId: 'custrecordclaim_dateworkstarted', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_startdate'})});
			claimRec.setValue({fieldId: 'custrecordclaim_dateworkcompleted', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_completedate'})});
			claimRec.setValue({fieldId: 'custrecordclaim_dealernotes', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_comments'})});
			claimRec.setValue({fieldId: 'custrecordclaim_transportcompany', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_transpocompany'})});
			claimRec.setValue({fieldId: 'custrecordclaim_location', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_location'})});
			claimRec.setValue({fieldId: 'custrecordclaim_approveddate', value: new Date()});
			claimRec.setValue({fieldId: 'custrecordclaim_dealerclaimnumber', value: scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_custordernum'})});
			claimRec.setValue({fieldId: 'custrecordgd_claim_unitmileage', value: scriptContext.newRecord.getValue({fieldId: 'custrecordgd_swo_unitmileage'}) || ''});  
			
			//Add the operation lines. Keep track of the internal ID <-> line number pairing so we can hook up the part lines
			// to the correct operation line. This will happen later when we search on the part lines.
			var reqLaborTotal = 0;
			var reqSubletTotal = 0;
			var opLineDict = {};
			var opSublist = 'recmachcustrecordclaimoperationline_claim';
			for (var i = 0; i < opLineResults.length; i++) {
				var curResult = opLineResults[i];
				
				//Add the requested labor and sublet into the totals.
				var reqAmount = curResult.getValue({name: 'custrecordsrv_opline_amt'});
				var reqSublet = SSLib_Util.convertNSFieldToFloat(curResult.getValue({name: 'custrecordsrv_opline_subletamt'}));
				reqLaborTotal += SSLib_Util.convertNSFieldToFloat(reqAmount);
				reqSubletTotal += reqSublet;
				
				//Set the value in the dictionary
				opLineDict[curResult.id.toString()] = i+1;
				
				//Create all of the lines. Mark all of the lines as Approved
				claimRec.selectNewLine({sublistId: opSublist});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_linenumber', value: i+1});
				
				//We may need to quickly activate and re-inactivate the flat rate code to set it here. 
				var flatRateCode = curResult.getValue({name: 'custrecordsrv_opline_code'});
				if(search.lookupFields({type: 'customrecordrvsflatratecodes', id: flatRateCode, columns: 'isinactive'}).isinactive) {
					record.submitFields({type: 'customrecordrvsflatratecodes', id: flatRateCode, values: {isinactive: 'F'}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
					claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_flatratecod', value: curResult.getValue({name: 'custrecordsrv_opline_code'})});
					record.submitFields({type: 'customrecordrvsflatratecodes', id: flatRateCode, values: {isinactive: 'T'}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
				} 
				else {
					claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_flatratecod', value: curResult.getValue({name: 'custrecordsrv_opline_code'})});
				}
				
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_faultcode', value: curResult.getValue({name: 'custrecordsrv_opline_faultcode'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_problem', value: curResult.getValue({name: 'custrecordsrv_opline_complaint'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_cause', value: curResult.getValue({name: 'custrecordsrv_opline_cause'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_remedy', value: curResult.getValue({name: 'custrecordsrv_opline_correction'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_manufnumber', value: curResult.getValue({name: 'custrecordsrv_opline_manufacturer'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_modelnumber', value: curResult.getValue({name: 'custrecordsrv_opline_modelnum'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_serialnum', value: curResult.getValue({name: 'custrecordsrv_opline_serialnum'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordoperationline_timerequested', value: curResult.getValue({name: 'custrecordsrv_opline_time'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_hours', value: curResult.getValue({name: 'custrecordsrv_opline_time'})});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_reqamount', value: reqAmount});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_amount', value: reqAmount});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_reqsublet', value: reqSublet});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_sublet', value: reqSublet});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimoperationline_status', value: SRV_Constants.CLAIM_LINE_STATUS_APPROVED});
				claimRec.setCurrentSublistValue({sublistId: opSublist, fieldId: 'custrecordclaimopline_unit', value: curResult.getValue({name: 'custrecordsrv_swo_unit', join: 'custrecordsrv_opline_swo'})});
				claimRec.commitLine({sublistId: opSublist});
			}
			
			//Search to get all of the part lines for the selected operation lines.
			//Add the lines, keeping track of the requested totals.
			var reqPartsTotal = 0;
			var partSublist = 'recmachcustrecordclaimpartline_claim';
			search.create({
				type: 'customrecordsrv_partline',
				filters: [['isinactive', 'is', false], 'AND', ['custrecordsrv_partline_opline', 'anyof', opLineIds]],
				columns: [search.createColumn({name: 'custrecordsrv_opline_sortorder', join: 'custrecordsrv_partline_opline', sort: search.Sort.ASC}),
				          search.createColumn({name: 'custrecordsrv_partline_sortorder', sort: search.Sort.ASC}), 
				          search.createColumn({name: 'custrecordsrv_partline_item'}), 
				          search.createColumn({name: 'custrecordsrv_partline_desc'}),
				          search.createColumn({name: 'custrecordsrv_partline_qty'}),
				          search.createColumn({name: 'custrecordsrv_partline_uom'}),
				          search.createColumn({name: 'custrecordsrv_partline_amt'}),
				          search.createColumn({name: 'custrecordsrv_partline_notes'}),
				          search.createColumn({name: 'custrecordsrv_partline_opline'})]
			}).run().each(function(result) {
				//Add the parts total into the total
				var reqParts = result.getValue({name: 'custrecordsrv_partline_amt'});
				reqPartsTotal += SSLib_Util.convertNSFieldToFloat(reqParts);
				
				//Add the part lines and link them to their corresponding operations.
				claimRec.selectNewLine({sublistId: partSublist});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_operationlinenum', value: opLineDict[result.getValue({name: 'custrecordsrv_partline_opline'})]});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_item', value: result.getValue({name: 'custrecordsrv_partline_item'})});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_description', value: result.getValue({name: 'custrecordsrv_partline_desc'})});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_quantity', value: result.getValue({name: 'custrecordsrv_partline_qty'})});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_units', value: result.getValue({name: 'custrecordsrv_partline_uom'})});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_notes', value: result.getValue({name: 'custrecordsrv_partline_notes'})});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_amount', value: reqParts});
				claimRec.setCurrentSublistValue({sublistId: partSublist, fieldId: 'custrecordclaimpartline_appvdamt', value: reqParts});
				claimRec.commitLine({sublistId: partSublist});
				
				return true;
			});
			
			//Set the requested totals
			claimRec.setValue({fieldId: 'custrecordclaim_operationstotal', value: reqLaborTotal.toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_partstotal', value: reqPartsTotal.toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_sublettotal', value: reqSubletTotal.toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_claimtotal', value: (reqLaborTotal + reqPartsTotal + reqSubletTotal).toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_requestedlabortotal', value: reqLaborTotal.toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_requestedpartstotal', value: reqPartsTotal.toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_requestedsublettotal', value: reqSubletTotal.toFixed(2)});
			claimRec.setValue({fieldId: 'custrecordclaim_claimrequestedtotal', value: (reqLaborTotal + reqPartsTotal + reqSubletTotal).toFixed(2)});
			
			//Submit the claim.
			var claimId = claimRec.save({ignoreMandatoryFields: true});
			record.submitFields({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id, values: {custrecordsrv_swo_claim: claimId}});

			//Create the credit memo from the claim and set its ID on the claim
			SRV_SWO_CreateCreditMemoFromClaim(scriptContext, claimRec, claimId);

			//We need the user event code from the Claim to fire after we submit the Claim. But since we're already on a User Event script,
			// the User Event script won't fire. So start a scheduled script that simply loads and submits the claim.
			SSLib_Task.scheduleScript('customscriptsrv_submitclaim_sch', null, {custscriptsrv_submitclaim_claimid: claimId});
		}
	}
	
	/**
	 * Takes in a Claim record and generates a credit memo from it.
	 * Basically does what the Credit Memo before load code does.
	 */
	function SRV_SWO_CreateCreditMemoFromClaim(scriptContext, claimRec, claimId) {
		//Set the header data from the claim. We need to find the "credit" subdealer for the dealer on the claim
		var creditOnlyDealerId = null;
		var claimDealerId = claimRec.getValue({fieldId: 'custrecordclaim_customer'});
		var curScript = runtime.getCurrentScript();
		var creditDealerType = curScript.getParameter({name: 'custscriptdealertypewarrantyonly'});
		search.create({
			type: 'customer',
			filters: [['parent', 'is', claimDealerId], 'AND', ['custentityrvsdealertype', 'is', creditDealerType]],
			columns: 'internalid'
		}).run().each(function(result) {creditOnlyDealerId = result.id;});

		//If no credit only dealer is found, then create one
		if (creditOnlyDealerId == null)
		{
			var dealer = record.create({type: 'customer'});
			dealer.setValue({fieldId: 'entityid', value: 'Credit'});
			dealer.setValue({fieldId: 'companyname', value: 'Credit'});
			dealer.setValue({fieldId: 'custentityrvsdealertype', value: creditDealerType});
			dealer.setValue({fieldId: 'parent', value: claimDealerId});
			dealer.setValue({fieldId: 'printoncheckas', value: search.lookupFields({type: 'customer', id: claimDealerId, columns: 'companyname'}).companyname});
			dealer.setValue({fieldId: 'custentityrvscreditdealer', value: true});
			creditOnlyDealerId = dealer.save({ignoreMandatoryFields: true});
		}
		
		//Create the credit memo and set the body fields
		var creditMemoRec = record.create({type: record.Type.CREDIT_MEMO, isDynamic: true});
		creditMemoRec.setValue({fieldId: 'entity', value: creditOnlyDealerId});
		creditMemoRec.setValue({fieldId: 'otherrefnum', value: claimRec.getValue({fieldId: 'custrecordclaim_dealerclaimnumber'})});
		creditMemoRec.setValue({fieldId: 'custbodyrvsunit', value: claimRec.getValue({fieldId: 'custrecordclaim_unit'})});
		creditMemoRec.setValue({fieldId: 'custbodyrvscreditmemotype', value: curScript.getParameter({name: 'custscriptcreditmemotypewarrantyclaim'})});
		creditMemoRec.setValue({fieldId: 'location', value: curScript.getParameter({name: 'custscriptpartsandwarrantylocation'})});
		creditMemoRec.setValue({fieldId: 'custbodyrvscreatedfromclaim', value: claimId});
		creditMemoRec.setValue({fieldId: 'department', value: scriptContext.newRecord.getValue({fieldId: 'custrecorddepartment' })}); //Department

		//Set the billing address to the billing address of the parent.
		var parentDealerRec = record.load({type: 'customer', id: claimDealerId});
		creditMemoRec.setValue({fieldId: 'billaddress', value: parentDealerRec.getValue({fieldId: 'defaultaddress'})});
		
		//Add the labor, parts, and sublet charges
		var laborTotal = SSLib_Util.convertNSFieldToFloat(claimRec.getValue({fieldId: 'custrecordclaim_operationstotal'}));
		var subletTotal = SSLib_Util.convertNSFieldToFloat(claimRec.getValue({fieldId: 'custrecordclaim_sublettotal'}));
		var partsTotal = SSLib_Util.convertNSFieldToFloat(claimRec.getValue({fieldId: 'custrecordclaim_partstotal'}));
		if (laborTotal != 0)
		{
			creditMemoRec.selectNewLine({sublistId: 'item'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curScript.getParameter({name: 'custscriptrvsclaimlabornoninvt'})});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: laborTotal});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: laborTotal});
			creditMemoRec.commitLine({sublistId: 'item'});
		}
		
		if (subletTotal != 0)
		{
			creditMemoRec.selectNewLine({sublistId: 'item'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curScript.getParameter({name: 'custscriptrvsclaimsubletnoninvt'})});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: subletTotal});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: subletTotal});
			creditMemoRec.commitLine({sublistId: 'item'});
		}
		
		if (partsTotal != 0)
		{
			creditMemoRec.selectNewLine({sublistId: 'item'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: curScript.getParameter({name: 'custscriptrvsclaimpartsnoninvt'})});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: '-1'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: partsTotal});
			creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: partsTotal});
			creditMemoRec.commitLine({sublistId: 'item'});
		}
		
		//Save the credit memo if it has at least one line.
		if (creditMemoRec.getLineCount({sublistId: 'item'}) > 0) {
			creditMemoRec.save({ignoreMandatoryFields: true});
		}
	}
		
	/**
	 * Returns the object in the itemLines array with a part line ID that matches the specified partLineId.
	 * Splices the itemLines array to no longer include that object and returns the object.
	 * Returns null if no object is found.
	 */
	function findItemResultObjectByPartLineId(itemLines, partLineId) {
		for(var i = itemLines.length - 1; i > -1; i--) {
			if (itemLines[i].partLineId == partLineId) {
				return itemLines.splice(i, 1)[0];
			}
		}
		return null;
	}
	
    /**
     * Returns the object in the itemLines array with an item ID that matches the specified itemId.
     * Splices the itemLines array to no longer include that object and returns the object.
     * Returns null if no object is found.
     */
    function findItemResultObjectByItemId(itemLines, itemId) {
    	for(var i = itemLines.length - 1; i > -1; i--) {
			if (itemLines[i].item == itemId) {
				return itemLines.splice(i, 1)[0];
			}
		}
		return null;
    }

	return {
		SRV_SWO_AfterSubmit: SRV_SWO_AfterSubmit
    };
    
});
