/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Mar 2022     MaxF
 *
 */

/**
 * Name: SetUnitApplianceListPlugin
 * Description: Sets the unit appliance list on the given unit based on 
 * 		the appliance template on the associated model.
 *		
 * @param {string} unitId ID of the unit record to set appliance list on
 * @returns {Void} 
 */
function SetUnitApplianceListPlugin(unitId)
{
	// appliance template line variables
	var type, typeId, brand, modelnum, serial, vendor, description;
	
	var unitRecord = nlapiLoadRecord('customrecordrvsunit', unitId);
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
			category = model.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordgd_unitappliancetemplate_categ', i);
			
			if (typeId != null && typeId != '')
			{
				// check if the appliance type is inactive
				type = nlapiLoadRecord('customrecordrvsappliancetype', typeId);
				var isInactive = type.getFieldValue('isinactive')=='T'?true:false;
				
				//create child records if the appliance type is active.
				if(!isInactive)
				{
					CreateUnitApplianceRecord(unitRecord, typeId, brand, modelnum, serial, vendor, description, category);
				}
			}
			
			//Add yield here if we do not have enough usage points.
			if(nlapiGetContext().getRemainingUsage() < 50)
			{
				nlapiYieldScript();
			}
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
function CreateUnitApplianceRecord(unitRecord, type, brand, modelnum, serial, vendor, description, category)
{
                var sublistType = 'recmachcustrecordunitappliances_unit';
                
                unitRecord.selectNewLineItem(sublistType);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_type', type);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_brandname', brand);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_modelnumber', modelnum);     
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_serialnumber', serial);
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordvendor', vendor);             
                unitRecord.setCurrentLineItemValue(sublistType, 'custrecordunitappliances_desc', description);
				unitRecord.setCurrentLineItemValue(sublistType, 'custrecordgd_unitappliances_category', category);
                               
                unitRecord.commitLineItem(sublistType);
}