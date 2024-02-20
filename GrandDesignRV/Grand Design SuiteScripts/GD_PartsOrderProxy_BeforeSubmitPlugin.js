/**
 * GD implementation for the RVS Parts Order Proxy Before Submit plugin
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */

define(['N/search', 'N/record', './2.x/GD_Constants','./2.x/GD_Common'],

/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @paran {format} format
 */
function(search, record, GD_Constants, GD_Common) {
	
	function RVS_POP_BeforeSubmit(scriptContext) {
    	
		var inquiryId = scriptContext.newRecord.getValue('custpage_inquiry') || '';

		if(inquiryId != '')
		{
			//check the status of Parts Inquiry that this order is created from.
			var statusLookup = search.lookupFields({
				type: 'customrecordgranddesignpartsinquiry',
				id: inquiryId,
				columns: 'custrecordpartsinquiry_status'
			})
			
			//If the status is not closed, we want to make sure that we close it now.
			if(statusLookup.custrecordpartsinquiry_status != GD_Constants.PARTS_INQUIRY_STATUS_CLOSED)
			{
				record.submitFields({
				    type: 'customrecordgranddesignpartsinquiry',
				    id: inquiryId,
				    values: {custrecordpartsinquiry_status: GD_Constants.PARTS_INQUIRY_STATUS_CLOSED},
				    options: {
				        enableSourcing: false,
				        ignoreMandatoryFields : true
				    }
				});
			}
		}
	}
	
	return {
		RVS_POP_BeforeSubmit: RVS_POP_BeforeSubmit
    };
    
});