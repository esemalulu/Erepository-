/**
 * GD implementation for the RVS Parts Order Proxy After Submit plugin
 * 
 * Loads relevant data to be referenced by the knockout client-side
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */

define(['N/record','N/search', 'N/runtime', 'N/ui/serverWidget','/.bundle/102084/RVSLib_Bootstrapper','/.bundle/102084/RVSLib_Constants','./2.x/GD_Common', './2.x/GD_Constants'],

/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @paran {format} format
 */
function(record, search, runtime, serverWidget, RVSLib_Bootstrapper, RVSLib_Constants, GD_Common, GD_Constants) {
	
	function RVS_POP_BeforeLoad(scriptContext) {
		
		//Create a hidden long text field that we can use to pass information from the KO sublist back to the BeforeSubmit function
        scriptContext.form.addField({id: 'custpage_kodata', label: 'ko data', type: serverWidget.FieldType.LONGTEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
       
        //Get the dealer's id by getting the id of the logged in user.
		var dealerId = runtime.getCurrentUser().id

		//Hide the existing dealer field and add a new one on-the-fly, and filter it by Dealer Group of logged in user
		var dealerField = scriptContext.form.getField({id: 'custrecordpartsorderproxy_dealer'});
		dealerField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
		
		//Create a new filtered dealer field that's editable
		var filteredDealer = scriptContext.form.addField({id: 'custpagegd_weborder_dealer', type: serverWidget.FieldType.SELECT, label: 'Dealer'})
		scriptContext.form.insertField({field : filteredDealer, nextfield : 'custrecordpartsorderproxy_dealer'});
		filteredDealer.isMandatory = true;

		//Get all of the dealer group members and add them as select options in the new filtered list.
		var dealerGroupMembers = GD_Common.GetDealerGroupMembers(dealerId); 
		if(dealerGroupMembers.length > 0)
		{
			for(var i = 0; i < dealerGroupMembers.length; i++)
			{
				filteredDealer.addSelectOption({value: dealerGroupMembers[i].id, text: dealerGroupMembers[i].name});
			}
		}
		if(dealerGroupMembers.length == 1)
			filteredDealer.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
		
		//Set the default value as the logged in user.
		scriptContext.newRecord.setValue({fieldId: 'custpagegd_weborder_dealer', value: dealerId})
        
        //Create a custom field for the parts inquiry that this parts order was created from, if one exists.
		var inquiryFld = scriptContext.form.addField({id: 'custpage_inquiry', label: 'inquiry', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
		inquiryFld.defaultValue = '';
    	
        //Create a custom field for the parts inquiry lines
		var inquiryLinesFld = scriptContext.form.addField({id: 'custpage_inquirylines', label: 'inquiryLines', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
		inquiryLinesFld.defaultValue = JSON.stringify({});
		
    	//See if this parts order was created from a parts inquiry
    	if(scriptContext.request)
    	{
    		//Get the inquiry ID from the url
       		var inquiryId = scriptContext.request.parameters["record.custbodypartsinquirynumber"] || '';

    		//If it was, we'll put information about each line in an object in a field that we can reference in the View Model.
    		if(inquiryId != '')
    		{
    			//Get the other url parameters
        		var unit = scriptContext.request.parameters["record.custbodyrvsunit"] || '';
        		var entity = scriptContext.request.parameters.entity || '';
        		
        		//Set the dealer and unit on the form, and set the inquiry id in a hidden field so we can reference it on before submit and after submit. 
        		scriptContext.newRecord.setValue({fieldId: 'custrecordpartsorderproxy_vin', value: unit})
        		scriptContext.newRecord.setValue({fieldId: 'custrecordpartsorderproxy_dealer', value: entity})
        		scriptContext.newRecord.setValue({fieldId: 'custpagegd_weborder_dealer', value: entity})

    			inquiryFld.defaultValue = inquiryId;
    			
    			//Load the inquiry and looping through the lines in order to add each item and its quantity to a dictionary called inquiryLines
    			var itemSublist = 'recmachcustrecordpartsinquiryitems_partsinquiry';
    			var inquiryRec = record.load({type: 'customrecordgranddesignpartsinquiry', id: inquiryId});
    			var inquiryLines = {};
    			var items = [];
    			
    			var itemCount = inquiryRec.getLineCount({sublistId: itemSublist});
    			for(var i = 0; i < itemCount; i++) 
    			{
    				var itemId = inquiryRec.getSublistValue({sublistId: itemSublist, fieldId: 'custrecordpartsinquiryitems_item', line: i}) || '';				
    				if(itemId != '') 
    				{
    				    inquiryLines[itemId] = {'quantity': inquiryRec.getSublistValue({sublistId: itemSublist, fieldId: 'custrecordpartsinquiryitems_quantity', line: i})};
    					items.push(itemId);
    				}
    			}
    			
    			//Check that there were actually items on the Parts Inquiry. Sometimes there lines with no items selected.
    			if(items.length > 0)
    			{
        			//Search over items to get more details.
        			var itemResultSet = search.create({
    		    		type: 'item',
    		    		filters: [['internalid', 'anyof', items],
    		    		          'AND',
    		    		          ['pricing.pricelevel', 'is', '1']],
    		    		columns: [search.createColumn({name: 'itemid', sort: search.Sort.ASC}),
    		    		          search.createColumn({name: 'displayname'}),
    		    		          search.createColumn({name: 'unitstype'}),
    		    		          search.createColumn({name: 'unitprice', join: 'pricing'}),
    		    		          search.createColumn({name: 'description'}),
    		    		          search.createColumn({name: 'saleunit'}),
    		    		          search.createColumn({name: 'vendorname'})],
    		    	}).run();
        	    	var results = itemResultSet.getRange({start: 0, end: 1000});
        	    	
    	    		//add more information from the search to our inquiryLines object
    		    	for(var i = 0; i < results.length; i++)
    				{
    		    		itemId = results[i].id;
    		    		inquiryLines[itemId].label = results[i].getValue({name: 'itemid'}) + ' ' + results[i].getValue({name: 'displayname'});
    		    		inquiryLines[itemId].basePrice = results[i].getValue({name: 'unitprice', join: 'pricing'}); 
    		    		inquiryLines[itemId].uomType = results[i].getValue({name: 'unitstype'}); 
    		    		inquiryLines[itemId].defaultUOM = results[i].getValue({name: 'saleunit'}); 
    		    		inquiryLines[itemId].vendorPartNo = results[i].getValue({name: 'vendorname'});
    				}
    		    	inquiryLines['keys'] = items;
    		    	
    				inquiryLinesFld.defaultValue = JSON.stringify(inquiryLines);
    			}
    		}
		}
		
        //Load static lists and set them on the form to reference client-side
        LoadStaticLists(scriptContext);
		
        //Get css or other client side includes and add it to the html          
        scriptContext.newRecord.setValue({
        	fieldId: 'custrecordpartsorderproxy_itemsublistko', 
        	value: 
	              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
	              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_JQUERY) +
	              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_KNOCKOUT) +
	              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_WARRANTY2_COMMON) +
	              RVSLib_Bootstrapper.buildHtmlFileLinks(GD_Constants.GD_BUNDLE_FILES_MODULE_PARTSORDERPROXY)
        });
	}
	
	/*
	 * To minimize the searching that we do client side, especially in the view model, we load some static 
	 * lists here and set the values in hidden fields on the form that we can reference client-side.
	 */
	function LoadStaticLists(scriptContext)
	{
        //Item Category 1
		var allIC1 = [];
		var ic1SortCol = search.createColumn({name: 'name'});
		ic1SortCol.sort = search.Sort.ASC;
		search.create({type: 'customrecordrvsitemcategorylevel1', filters: ['isinactive', 'is', false], columns: [search.createColumn({name: 'internalid'}),ic1SortCol]}).run().each(function(result) {
			allIC1.push({id: result.id, name: result.getValue('name')});
			return true;
		});
		var ic1Fld = scriptContext.form.addField({id: 'custpage_rvsitemcat1', label: 'item cat 1', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
		ic1Fld.defaultValue = JSON.stringify(allIC1);
		
		//Item Category 2
		var allIC2 = [];
		var ic2SortCol = search.createColumn({name: 'name'});
		ic2SortCol.sort = search.Sort.ASC;
		search.create({
			type: 'customrecordrvsitemcategorylevel2', 
			filters: ['isinactive', 'is', false], 
			columns: [search.createColumn({name: 'internalid'}),
			          ic2SortCol,
			          search.createColumn({name: 'custrecorditemcategorylev2_itemcatlev1'})]
		}).run().each(function(result) {
			allIC2.push({
				id: result.id, 
				name: result.getValue('name'),
				itemCat1: result.getValue('custrecorditemcategorylev2_itemcatlev1')
			});
			return true;
		});
		var ic2Fld = scriptContext.form.addField({id: 'custpage_rvsitemcat2', label: 'item cat 2', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
		ic2Fld.defaultValue = JSON.stringify(allIC2);
		
		//UOM Types and units of measure.
		var allUOMs = [];
		var uomSortCol = search.createColumn({name: 'name'});
		uomSortCol.sort = search.Sort.ASC;
		search.create({type: 'unitstype', filters: ['isinactive', 'is', false], columns: [search.createColumn({name: 'internalid'}),uomSortCol]}).run().each(function(result) {
			//Load that UOM type and get all of the line item info.
			var uomRec = record.load({type: 'unitstype', id: result.id});
			for(var i = 0; i < uomRec.getLineCount({sublistId:'uom'}); i++)
			{
				allUOMs.push({
					uomType: result.id,
					id: uomRec.getSublistValue({sublistId: 'uom', fieldId: 'internalid', line: i}),
					abbr: uomRec.getSublistValue({sublistId: 'uom', fieldId: 'abbreviation', line: i}),
					convRate: uomRec.getSublistValue({sublistId: 'uom', fieldId: 'conversionrate', line: i})
				});
			}
			return true;
		});
		var uomFld = scriptContext.form.addField({id: 'custpage_rvsuoms', label: 'uoms', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
		uomFld.defaultValue = JSON.stringify(allUOMs);
	}
	
	return {
		RVS_POP_BeforeLoad: RVS_POP_BeforeLoad
    };
    
});