/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Feb 2014     nathanah
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_ChangeModelsOnOrders(recType, recId) 
{
	var salesOrder = nlapiLoadRecord('salesorder', recId, null);
	
	var modelIdTable = {'29681':'37065','36391':'37067','34360':'37070','29682':'37071','29865':'37072','34565':'37073','29683':'37084','29684':'37085',
			'29686':'37086','28837':'37636','28848':'37637','32769':'37638','28981':'37640','29020':'37642','28987':'37643','36188':'37644',
			'33852':'37646','29169':'37649','28997':'37650','29190':'37651','36790':'37635','29652':'37412','29654':'37414','32704':'37415',
			'29680':'37629','29657':'37416','29669':'37633','33737':'37417','29675':'37630','30620':'37420','31794':'37631','30936':'37632',
			'36452':'37427','29671':'37428','29672':'37628','29463':'37110','29464':'37111','32275':'37115','33285':'37116','31359':'37117',
			'33286':'37119','30838':'37120','33287':'37121','32780':'37122','33288':'37125','31755':'37130','33289':'37133','33290':'37140',
			'33784':'37141','29643':'37143','29642':'37144'};
	
	var oldModelId = salesOrder.getFieldValue('custbodyrvsmodel');
	var newModelId = modelIdTable[oldModelId];
	
	/*
	if (oldModelId == '12190')
	{
		newModelId = '14876'; // 337RLS-2016
	}
	else if (oldModelId == '12185')
	{
		newModelId = '14873'; // 369RL-2016
	}
	else if (oldModelId == '12186')
	{
		newModelId = '14877'; // 379FL-2016
	}
	else if (oldModelId == '12181')
	{
		newModelId = '14875'; // 385TH-2016
	}*/
	
	
	if (newModelId != null)
	{
		salesOrder.setFieldValue('custbodyrvsmodel', newModelId);
		
		// loop through the lines items and find the old model line and change it to be the new model line
		var lineCount = salesOrder.getLineItemCount('item');
		
		for (var i=1; i<=lineCount; i++)
		{
			if (salesOrder.getLineItemValue('item', 'item', i) == oldModelId)
			{
				salesOrder.selectLineItem('item', i);
				salesOrder.setCurrentLineItemValue('item', 'item', newModelId);
				
				var msrp = 0;
				var filters = new Array();
				filters[filters.length] = new nlobjSearchFilter('pricelevel', 'pricing', 'is', 2, null);
				filters[filters.length] = new nlobjSearchFilter('internalid', null, 'is', newModelId, null);
				
				var cols = new Array();
				cols[cols.length] = new nlobjSearchColumn('unitprice', 'pricing', null);
				
				var results = nlapiSearchRecord('item', null, filters, cols);
				
				if (results != null && results.length > 0)
				{
					msrp = ConvertNSFieldToFloat(results[0].getValue('unitprice', 'pricing'));
				}
				
				salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', msrp);
				salesOrder.commitLineItem('item');
				
				break;
			}
		}
		
		nlapiSubmitRecord(salesOrder, true, false);
		
		// also need to update the unit to have the new model Id (this no longer happens automatically on the order)
		var unitId = salesOrder.getFieldValue('custbodyrvsunit');
		nlapiSubmitField('customrecordrvsunit', unitId, 'custrecordunit_model', newModelId, true);
	}
}
//run search on old model (2015) and add appliance templates to new model
function GD_ModelApplianceTemplate_Massupdate(recType, oldModelId)
{
	var modelIdTable = {'29681':'37065','36391':'37067','34360':'37070','29682':'37071','29865':'37072','34565':'37073','29683':'37084','29684':'37085',
			'29686':'37086','28837':'37636','28848':'37637','32769':'37638','28981':'37640','29020':'37642','28987':'37643','36188':'37644',
			'33852':'37646','29169':'37649','28997':'37650','29190':'37651','36790':'37635','29652':'37412','29654':'37414','32704':'37415',
			'29680':'37629','29657':'37416','29669':'37633','33737':'37417','29675':'37630','30620':'37420','31794':'37631','30936':'37632',
			'36452':'37427','29671':'37428','29672':'37628','29463':'37110','29464':'37111','32275':'37115','33285':'37116','31359':'37117',
			'33286':'37119','30838':'37120','33287':'37121','32780':'37122','33288':'37125','31755':'37130','33289':'37133','33290':'37140',
			'33784':'37141','29643':'37143','29642':'37144'};
	
	var newModelId = modelIdTable[oldModelId];
	if(newModelId != null && newModelId != '')
	{
		var oldModel = nlapiLoadRecord(recType, oldModelId);
		var newModel = nlapiLoadRecord(recType, newModelId);
		if(oldModel.getLineItemCount('recmachcustrecordunitappliancetemplate_model') > 0)
		{
			for(var i=0; i<oldModel.getLineItemCount('recmachcustrecordunitappliancetemplate_model'); i++)
			{
				newModel.selectNewLineItem('recmachcustrecordunitappliancetemplate_model');
				newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_type', 
						oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_type', i+1));
				newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_desc', 
						oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_desc', i+1));
				newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_brand', 
						oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_brand', i+1));
				newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_modelnum', 
						oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_modelnum', i+1));
				newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_vendor', 
						oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_vendor', i+1));
				newModel.commitLineItem('recmachcustrecordunitappliancetemplate_model');
			}
			
			nlapiSubmitRecord(newModel, false, true);
		}
	}
}

function GD_UpdateUnitApplianceList(recType, unitId)
{
	// appliance template line variables
	var type, typeId, brand, modelnum, serial, vendor, description;
	
	var unitRecord = nlapiLoadRecord(recType, unitId);
	var modelId = unitRecord.getFieldValue('custrecordunit_model');
	var model = nlapiLoadRecord('assemblyitem', modelId);
		
	var applianceCount = parseInt(unitRecord.getLineItemCount('recmachcustrecordunitappliances_unit'));
	
	// Only create new appliance records if none exist
	if(applianceCount == 0)
	{
		var templateCount = parseInt(model.getLineItemCount('recmachcustrecordunitappliancetemplate_model'));
				
		//  loop through appliance template records to add them
		for (var i = templateCount; i > 0; i--) 
		{
			typeId = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_type', i);
			brand = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_brand', i);
			modelnum = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_modelnum', i);
			serial = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_serial', i);
			vendor = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_vendor', i);
			description = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_desc', i);
			
			if (typeId != null && typeId != '')
			{
				// check if the appliance type is inactive
				type = nlapiLoadRecord('customrecordrvsappliancetype', typeId);
				var isInactive = type.getFieldValue('isinactive')=='T'?true:false;
				
				//create child records if the appliance type is active.
				if(!isInactive)
				{
					CreateUnitApplianceRecord(unitRecord, typeId, brand, modelnum, serial, vendor, description);
				}
			}
			
//			//Add yield here if we do not have enough usage points.
//			if(nlapiGetContext().getRemainingUsage() < 50)
//			{
//				nlapiYieldScript();
//			}
		}
		
		nlapiSubmitRecord(unitRecord, false, true);
	}
}

/**
 * Name: CreateUnitApplianceRecord
 * Description: Called by SetUnitApplianceList.  Creates a Unit Appliance record for the unit passed in. 
 *		
 * @param {nlObjRecord} unitRecord Unit Record to create a Unit Appliance record for
 * @returns {Void} 
 */
function CreateUnitApplianceRecord(unitRecord, type, brand, modelnum, serial, vendor, description)
{
                var sublistType = 'recmachcustrecordunitappliances_unit';
                
                unitRecord.selectNewLineItem(sublistType);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_type', type);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_brandname', brand);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_modelnumber', modelnum);     
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_serialnumber', serial);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordvendor', vendor);             
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_desc', description);
                               
                unitRecord.commitLineItem(sublistType);
}
