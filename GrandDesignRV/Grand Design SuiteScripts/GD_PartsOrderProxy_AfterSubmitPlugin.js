/**
 * GD implementation for the RVS Parts Order Proxy After Submit plugin
 * 
 *  AfterSubmit - Takes the knockout data and what's set on the proxy form, and creates a new estimate.
 * 				 Deletes the proxy record that was just created.
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/runtime', 'N/redirect', 'N/search','/.bundle/102084/2.x/RVS_Common', '/.bundle/102084/2.x/RVS_Constants', './2.x/GD_Common'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @paran {format} format
 */
function(record, runtime, redirect, search, Common, Constants, GD_Common) {
	
	function RVS_POP_AfterSubmit(scriptContext) {
		
		var rec = scriptContext.newRecord;
    	var dealer = rec.getValue({fieldId: 'custrecordpartsorderproxy_dealer'});
		
    	//Get the user from the logged in user (dealer id) and email
		var dealerId = runtime.getCurrentUser().id || '';
		var userEmail = runtime.getCurrentUser().email || '';
		var loggedInUser = GD_Common.GetContactFromDealerAndEmail(dealerId, userEmail)

    	//get the correct custom form from company preferences.
    	var CUSTOMFORM_INTERNALPARTWEBORDER = runtime.getCurrentScript().getParameter({name: 'custscriptinternalpartweborderform'});
		
    	//*** Create a new Web Order ***//
    	var weborder = record.create({
			type: record.Type.ESTIMATE, 
		    isDynamic: true,
		    defaultValues: {
		    	customform: CUSTOMFORM_INTERNALPARTWEBORDER,
		        entity: rec.getValue({fieldId: 'custrecordpartsorderproxy_dealer'})
		    }
    	});
    	
    	//*** Set Body Fields ***//
    	weborder.setValue({fieldId: 'custbodyrvsparttype', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_parttype'})});
    	weborder.setValue({fieldId: 'custbodyrvsunit', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_vin'})});
    	weborder.setValue({fieldId: 'custbodyrvspreauthorization', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_preauth'})})
    	weborder.setValue({fieldId: 'otherrefnum', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_ponumber'})});
    	weborder.setValue({fieldId: 'memo', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_memo'})});
    	weborder.setValue({fieldId: 'custbodyrvsdealerphone', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_dealerphone'})});
    	weborder.setValue({fieldId: 'custbodyrvsdealerfax', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_dealerfax'})});
    	weborder.setValue({fieldId: 'custbodyrvsdealeremail', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_dealeremail'})});
    	weborder.setValue({fieldId: 'custbodyrvsaddress', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_address'})});
    	weborder.setValue({fieldId: 'custbodyrvsisexternalpartweborder', value: true});
    	weborder.setValue({fieldId: 'custbodyrvsactiontype', value: Constants.ACTIONTYPE_ONLINEPARTSQUOTE});
    	weborder.setValue({fieldId: 'custbodyrvsordertype', value: Constants.ORDERTYPE_PART});
    	weborder.setValue({fieldId: 'custbodygd_dealerportalrequester', value: loggedInUser});

    	//get the NS shipmethod from the gd-specific shipvia and set them both on the weborder
		var shipVia = rec.getValue({fieldId: 'custrecordpartsorderproxy_gd_shipvia'}) || '';
		if(shipVia != '')
		{
			//Look up the ship method from the custom Web Portal Ship Type record.
			var lookup = search.lookupFields({
				type: 'customrecordgd_webportalshiptype',
				id: shipVia,
				columns: ['custrecordgd_webportalshiptype_shipitem']
			});
			var shipMethod = lookup.custrecordgd_webportalshiptype_shipitem ? lookup.custrecordgd_webportalshiptype_shipitem[0].value : '';
			
			//set both the GD-specific weborder field and the NetSuite built-in weborder field.
			weborder.setValue({fieldId: 'custbodygd_webpartsorder_shipvia', value: shipVia});
	    	weborder.setValue({fieldId: 'shipmethod', value: shipMethod});
		}
    	
    	//*** Set Address Fields ***//

    	//Get the states and countries. We need to be setting the fields on the estimate with string abbreviations, and what we have are RVS internal IDs. 
    	var billState = Common.GetShortnameFromRVSState(rec.getValue({fieldId: 'custrecordpartsorderproxy_billstate'}));
    	var billCountry = Common.GetShortnameFromRVSCountry(rec.getValue({fieldId: 'custrecordpartsorderproxy_billcountry'}));
    	var shipState = Common.GetShortnameFromRVSState(rec.getValue({fieldId: 'custrecordpartsorderproxy_shipstate'}));
    	var shipCountry = Common.GetShortnameFromRVSCountry(rec.getValue({fieldId: 'custrecordpartsorderproxy_shipcountry'}));
    		
		//Set the fields on the bill address and ship address subrecords
        var billingSubrec = weborder.getSubrecord({fieldId: 'billingaddress'});
        
        billingSubrec.setValue({fieldId: 'country', value: billCountry});
        billingSubrec.setValue({fieldId: 'addressee', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_billaddressee'})});
        billingSubrec.setValue({fieldId: 'addr1', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_billaddr1'})});
        billingSubrec.setValue({fieldId: 'addr2', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_billaddr2'})});
        billingSubrec.setValue({fieldId: 'city', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_billcity'})});
        billingSubrec.setValue({fieldId: 'state', value: billState});
        billingSubrec.setValue({fieldId: 'zip', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_billzip'})});
        billingSubrec.setValue({fieldId: 'addrphone', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_billphone'})});
        
        var shippingSubrec = weborder.getSubrecord({fieldId: 'shippingaddress'});

        shippingSubrec.setValue({fieldId: 'country', value: shipCountry});
        shippingSubrec.setValue({fieldId: 'addressee', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_shipaddressee'})});
        shippingSubrec.setValue({fieldId: 'addr1', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_shipaddr1'})});
        shippingSubrec.setValue({fieldId: 'addr2', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_shipaddr2'})});
        shippingSubrec.setValue({fieldId: 'city', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_shipcity'})});
        shippingSubrec.setValue({fieldId: 'state', value: shipState});
        shippingSubrec.setValue({fieldId: 'zip', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_shipzip'})});
        if(rec.getValue({fieldId: 'custrecordpartsorderproxy_shipphone'}))
        	shippingSubrec.setValue({fieldId: 'addrphone', value: rec.getValue({fieldId: 'custrecordpartsorderproxy_shipphone'})});

    	
    	//*** Set Line Fields ***//
    	var koDataStr = rec.getValue({fieldId: 'custpage_kodata'}) || '';
    	if (koDataStr != '') {
    		var koData = JSON.parse(koDataStr);

    		//Loop over the knockout lines and set actual line items on the estimate.
    		for (var i = 0; i < koData.lineItems.length; i++) {
    			var currentline = koData.lineItems[i];

    			weborder.selectNewLine({sublistId: 'item'});
    			weborder.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: currentline.item.id});
    			weborder.setCurrentSublistValue({sublistId: 'item', fieldId: 'units', value: currentline.selectedUOM.id});
    			weborder.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: currentline.quantity});
    			weborder.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolrvspartsnotes', value: currentline.partsNotes});
    			weborder.commitLine({sublistId: 'item'});
    		}
    	}
   	
    	//*** Submit the new Web Order, and delete the Proxy ***//
    	var weborderId = weborder.save({enableSourcing: true, ignoreMandatoryFields: true});

		record.delete({
			type: 'customrecordrvs_partsorderproxy',
			id: rec.id
		})
		
		//redirect to a confirmation page that gives you the option to view a printout of the record you just created. 
		
		//We don't redirect to view the actual web order, because dealers can create parts orders for other dealers, and 
		//they'd hit a permissions issue on save if we tried to redirect them to an estimate for another dealer.
		redirect.toSuitelet({
		    scriptId: 'customscriptgd_portalnav_suitelet' ,
		    deploymentId: 'customdeploygd_portalnav_suitelet',
		    parameters: {
		    	recid: weborderId,
		    	tranid: search.lookupFields({type: record.Type.ESTIMATE, id: weborderId, columns: ['tranid']}).tranid
		    }
		});
	}
	
	return {
		RVS_POP_AfterSubmit: RVS_POP_AfterSubmit
    };
    
});