/**
 * GD implementation for the SRV SWO Order Before Load Plugin
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */
var SRV_OPLINE_SUBLIST = 'recmachcustrecordsrv_opline_swo';
var SRV_PARTLINE_SUBLIST = 'recmachcustrecordsrv_partline_swo';
var SRV_SWO_TIMEENTRY_SUBLIST = 'recmachcustrecordsrv_swo_timeentry_swo';

define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/runtime', '/.bundle/159149/SRV_Bootstrapper', '/.bundle/159149/SRV_Constants', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'N/format'],
/**
 * @param {record} record
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {runtime} runtime
 */
function(record, search, serverWidget, runtime, SRV_Bootstrap, SRV_Constants, SSLib_Util, format) {
	
	function SRV_SWO_BeforeLoad(scriptContext) {
		if (scriptContext.type == scriptContext.UserEventType.VIEW) {
    		scriptContext.form.getField({id: 'custrecordsrv_swo_oplinesko'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    	}
    	else {
    		//Hide the sublist so the user can't edit it.
    		scriptContext.form.getSublist({id: SRV_OPLINE_SUBLIST}).displayType = serverWidget.SublistDisplayType.HIDDEN;
    		scriptContext.form.getSublist({id: SRV_PARTLINE_SUBLIST}).displayType = serverWidget.SublistDisplayType.HIDDEN;
    		scriptContext.form.getSublist({id: SRV_SWO_TIMEENTRY_SUBLIST}).displayType = serverWidget.SublistDisplayType.HIDDEN;
    		
    		//Set the items from the Part sublist on the form since we can't grab them on the client side if the sublist is hidden.
    		var partFld = scriptContext.form.addField({id: 'custpage_srvparts', label: 'parts', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		var allParts = {};
    		for(var i = 0; i < scriptContext.newRecord.getLineCount({sublistId: SRV_PARTLINE_SUBLIST}); i++) {
    			allParts[scriptContext.newRecord.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_item', line: i}).toString()] = {
    					name: scriptContext.newRecord.getSublistText({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_item', line: i}),
    					uomType: scriptContext.newRecord.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_uomtype', line: i})
					};
    		}
    		partFld.defaultValue = JSON.stringify(allParts);
    		
    		//get the list of all service techs and store it in a field for use in the knockout. 
    		var techOptions = [];
			search.create({
    			type: 'employee', 
    			filters: [['isinactive', 'is', false],
    			          'AND',
    			          ['custentitysrv_swo_isservicetechnician','is', true]],
    			columns: ['entityid']
    		}).run().each(function(result) {
    			techOptions.push({
    				id: result.id,
    				name: result.getValue('entityid')
    			})
    			return true;
    		});
    		var techOptionsFld = scriptContext.form.addField({id: 'custpage_techoptions', label: 'tech options', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		techOptionsFld.defaultValue = JSON.stringify(techOptions);
    		
    		//Set the items from the Time Entry sublist on the form since we can't grab them on the client side if the sublist is hidden.
    		var timeTrackedObj = {};
    		var timeTracked = 0;
    		var id = 0;
    		var allTimeEntries = [];
    		for(var i = 0; i < scriptContext.newRecord.getLineCount({sublistId: SRV_SWO_TIMEENTRY_SUBLIST}); i++) {
    			
    			//add each time entry record on the sublist to the allTimeEntries array
    			id = scriptContext.newRecord.getSublistValue({sublistId: SRV_SWO_TIMEENTRY_SUBLIST, fieldId: 'id', line: i});
    			opLine = scriptContext.newRecord.getSublistValue({sublistId: SRV_SWO_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_opline', line: i});
    			var date = scriptContext.newRecord.getSublistValue({sublistId: SRV_SWO_TIMEENTRY_SUBLIST, fieldId: 'created', line: i});
    			date = format.format({value: date,type: format.Type.DATE});
    			
    			allTimeEntries.push({
    					id: id,
    					opLine: opLine,
    					dateCreated: date,
    					tech: scriptContext.newRecord.getSublistValue({sublistId: SRV_SWO_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_tech', line: i}),
    					time: scriptContext.newRecord.getSublistValue({sublistId: SRV_SWO_TIMEENTRY_SUBLIST, fieldId: 'custrecordsrv_swo_timeentry_time', line: i})
					});
			
    			//add any time tracked on this entry to an object holding the running sum of the time tracked, indexed by operation line. 
    			if(timeTrackedObj.hasOwnProperty(opLine))
    				timeTrackedObj[opLine] += allTimeEntries[allTimeEntries.length - 1].time; 
    			else
    				timeTrackedObj[opLine] = allTimeEntries[allTimeEntries.length - 1].time;
    		}
    		// store time entry record data in a field for later use
    		var timeEntryFld = scriptContext.form.addField({id: 'custpage_srvtimeentries', label: 'time entries', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		timeEntryFld.defaultValue = JSON.stringify(allTimeEntries);
    		
    		// store time tracked totals in a field for  later use
    		var timeTrackedFld = scriptContext.form.addField({id: 'custpage_timetracked', label: 'time tracked', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		timeTrackedFld.defaultValue = JSON.stringify(timeTrackedObj);
    		
    		//Set the part lines that have already been partially or completely fulfilled. They can't edit these in the popup.
    		var lockedPartsArr = [];
    		if(scriptContext.newRecord.id) {
    			search.create({
        			type: search.Type.SALES_ORDER, 
        			filters: [['quantityshiprecv','greaterthan','0'],
        			          'AND',
        			          ['custbodysrv_serviceworkorder','anyof', scriptContext.newRecord.id]],
        			columns: ['custcolsrv_partlinerecord']
        		}).run().each(function(result) {
        			var partLineId = result.getValue('custcolsrv_partlinerecord');
        			if(partLineId != null && partLineId != '')
        				lockedPartsArr.push(partLineId);
        			return true;
        		});
    		}
    		var lockedPartLineFld = scriptContext.form.addField({id: 'custpage_lockedsrvparts', label: 'locked parts', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		lockedPartLineFld.defaultValue = JSON.stringify(lockedPartsArr);
    		
    		//Get the static lists. Set them on the form so we don't have to do client-side searches.
    		//Payment types
    		var allPaymentTypes = [];
    		var pSortCol = search.createColumn({name: 'internalid'});
    		pSortCol.sort = search.Sort.ASC;
    		search.create({
    			type: 'customlistsrv_oplinepaymenttype', 
    			filters: ['isinactive', 'is', false], 
    			columns: [search.createColumn({name: 'name'}),pSortCol]
    		}).run().each(function(result) {
    			allPaymentTypes.push({id: result.id, name: result.getValue('name')});
    			return true;
    		});
    		var ptFld = scriptContext.form.addField({id: 'custpage_srvpaymenttypes', label: 'payment types', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		ptFld.defaultValue = JSON.stringify(allPaymentTypes);

            var faultCodesOnThisSWO = [];

            var id = scriptContext.newRecord.id;
            if(id)
            {
                search.create({
                    type: 'customrecordsrv_opline', 
                    filters: ['custrecordsrv_opline_swo', 'anyof', id], 
                    columns: [search.createColumn({name: 'custrecordsrv_opline_faultcode'})]
                }).run().each(function(result) {
                    faultCodesOnThisSWO.push(result.getValue({name: 'custrecordsrv_opline_faultcode'}));
                    return true;
                });
            }
        
            var faultCodeFilters = [['isinactive', 'is', false], 'AND', ['custrecordfaultcode_isdiscontinued', 'is', false]];

            if(faultCodesOnThisSWO.length > 0)
                faultCodeFilters = [faultCodeFilters,"OR",['internalid','anyof',faultCodesOnThisSWO]];

    		//Fault codes
    		var allFaultCodes = [];
    		var fSortCol = search.createColumn({name: 'name'});
    		fSortCol.sort = search.Sort.ASC;
    		search.create({
    			type: 'customrecordrvsfaultcodes', 
    			filters: faultCodeFilters, 
    			columns: [search.createColumn({name: 'internalid'}), fSortCol]
    		}).run().each(function(result) {
    			allFaultCodes.push({id: result.id, name: ' ' + result.getValue('name')}); //Need to have a space at the beginning of the fault codes. Don't ask why. Just believe.
    			return true;
    		});
    		var fFld = scriptContext.form.addField({id: 'custpage_srvfaultcodes', label: 'fault codes', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		fFld.defaultValue = JSON.stringify(allFaultCodes);
    		
    		//When flat rate codes are marked inactive, GD still wants existing workorders using those codes to work. When we pass the list of 
    		//flat rate codes to the knockout, we want to include inactives if they are already in use on this record.
    		var inactiveCodesOnThisRecord = [];
    		var flatRateCodeFilters = ['isinactive', 'is', false];
    		var serviceWorkorderId = scriptContext.newRecord.id || '';
    		
    		if(serviceWorkorderId != '') {
	    		search.create({
	    			type: 'customrecordsrv_opline', 
	    			filters: [['custrecordsrv_opline_swo', 'anyof', serviceWorkorderId],
	    			          'AND',
	    			          ['custrecordsrv_opline_code.isinactive', 'is', true]],
	    			columns: [search.createColumn({name: 'custrecordsrv_opline_code'})],
	    		}).run().each(function(result) {
	    			inactiveCodesOnThisRecord.push(result.getValue({name: 'custrecordsrv_opline_code'}));
	    			return true;
	    		});
	    		
	    		if(inactiveCodesOnThisRecord.length > 0)
	    			flatRateCodeFilters = [flatRateCodeFilters,"OR",['internalid','anyof', inactiveCodesOnThisRecord]];
    		}

    		//Flat Rate Codes
    		var allFlatRateCodes = [];
    		var frSortCol = search.createColumn({name: 'name'});
    		frSortCol.sort = search.Sort.ASC;
    		search.create({
    			type: 'customrecordrvsflatratecodes', 
    			filters: flatRateCodeFilters, 
    			columns: [frSortCol,
    			          search.createColumn({name: 'altname'}),
    			          search.createColumn({name: 'custrecordflatratecode_maincategory'}),
    			          search.createColumn({name: 'custrecordflatratecode_subcategory'}),
    			          search.createColumn({name: 'custrecordflatratecode_serialrequired'}),
    			          search.createColumn({name: 'custrecordflatratecode_photorequired'}),
    			          search.createColumn({name: 'custrecordflatratecodes_timeallowed'})]
    		}).run().each(function(result) {
    			allFlatRateCodes.push({
    				id: result.id,
    				name: result.getValue('name') + ' ' + result.getValue('altname'),
    				itemCat1: result.getValue('custrecordflatratecode_maincategory'),
    				itemCat2: result.getValue('custrecordflatratecode_subcategory'),
    				timeAllowed: SSLib_Util.convertNSFieldToFloat(result.getValue('custrecordflatratecodes_timeallowed')),
    				serialReq: result.getValue('custrecordflatratecode_serialrequired') == 1,
    				photoReq: result.getValue('custrecordflatratecode_photorequired') != 2
				});
    			return true;
    		});
    		var frFld = scriptContext.form.addField({id: 'custpage_srvflatratecodes', label: 'flat rates', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		frFld.defaultValue = JSON.stringify(allFlatRateCodes);

    		//Item Category 1
    		var allIC1 = [];
    		var ic1SortCol = search.createColumn({name: 'name'});
    		ic1SortCol.sort = search.Sort.ASC;
    		search.create({
    			type: 'customrecordrvsitemcategorylevel1', 
    			filters: ['isinactive', 'is', false], 
    			columns: [search.createColumn({name: 'internalid'}), ic1SortCol]
    		}).run().each(function(result) {
    			allIC1.push({id: result.id, name: result.getValue('name')});
    			return true;
    		});
    		var ic1Fld = scriptContext.form.addField({id: 'custpage_srvitemcat1', label: 'item cat 1', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
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
    		var ic2Fld = scriptContext.form.addField({id: 'custpage_srvitemcat2', label: 'item cat 2', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		ic2Fld.defaultValue = JSON.stringify(allIC2);
    		
    		//UOM Types and units of measure.
    		var allUOMs = [];
    		var uomSortCol = search.createColumn({name: 'name'});
    		uomSortCol.sort = search.Sort.ASC;
    		search.create({
    			type: search.Type.UNITS_TYPE, 
    			filters: ['isinactive', 'is', false], 
    			columns: [search.createColumn({name: 'internalid'}), uomSortCol]
    		}).run().each(function(result) {
    			//Load that UOM type and get all of the line item info.
    			var uomRec = record.load({type: 'unitstype', id: result.id});
    			for(var i = 0; i < uomRec.getLineCount({sublistId:'uom'}); i++) {
    				allUOMs.push({
    					uomType: result.id,
    					id: uomRec.getSublistValue({sublistId: 'uom', fieldId: 'internalid', line: i}),
    					abbr: uomRec.getSublistValue({sublistId: 'uom', fieldId: 'abbreviation', line: i}),
    					convRate: uomRec.getSublistValue({sublistId: 'uom', fieldId: 'conversionrate', line: i})
    				});
    			}
    			return true;
    		});
    		var uomFld = scriptContext.form.addField({id: 'custpage_srvuoms', label: 'uoms', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		uomFld.defaultValue = JSON.stringify(allUOMs);
    		
    		//Create a hidden long text field that we can use to pass information from the KO sublist back to the BeforeSubmit function
    		scriptContext.form.addField({id: 'custpage_srvkodata', label: 'ko data', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		
    		//Set the labor rates on the form
    		//warranty
    		var laborFld = scriptContext.form.addField({id: 'custpage_srvwarratylaborrate', label: 'labor rate', type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		var serviceDealerId = runtime.getCurrentScript().getParameter({name: 'custscriptsrv_internalwarrantydealer'});
    		scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_servicedealer', value: serviceDealerId});
    		laborFld.defaultValue = search.lookupFields({type: 'customer', id: serviceDealerId, columns: 'custentityrvsapprovedlaborrate'}).custentityrvsapprovedlaborrate;
    		//customer
    		var customerLaborFld = scriptContext.form.addField({id: 'custpage_srvcustlaborrate', label: 'customer labor rate', type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		var custDealerId = runtime.getCurrentScript().getParameter({name: 'custscriptsrv_internalretailwarrdealer'});
    		scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_retailservdealer', value: custDealerId});
    		customerLaborFld.defaultValue = search.lookupFields({type: 'customer', id: custDealerId, columns: 'custentityrvsapprovedlaborrate'}).custentityrvsapprovedlaborrate;
    		  
    		// get css or other client side includes and add it to the html
    		scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_oplinesko', value: 
    			SRV_Bootstrap.buildHtmlFileLinks(SRV_Constants.SRV_BUNDLE_FILES_MODULE_SRVCOMMON) +
    			SRV_Bootstrap.buildHtmlFileLinks(SRV_Constants.SRV_BUNDLE_FILES_MODULE_JQUERY) +
    			SRV_Bootstrap.buildHtmlFileLinks(SRV_Constants.SRV_BUNDLE_FILES_MODULE_KNOCKOUT) +
    			SRV_Bootstrap.buildHtmlFileLinks(SRV_Constants.SRV_BUNDLE_FILES_MODULE_SERVICEWORKORDER)
    		});
    		
    		//Set the internal id of the first tab into a custom field so we can navigate to it.
    		var tabField = scriptContext.form.addField({id: 'custpage_srvattrtab', label: 'tab id', type: serverWidget.FieldType.TEXT}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    		var allTabs = scriptContext.form.getTabs();
    		if (allTabs != null && allTabs.length >= 2) tabField.defaultValue = allTabs[1];
    	}
	}
	
    return {
    	SRV_SWO_BeforeLoad: SRV_SWO_BeforeLoad
    };
    
});