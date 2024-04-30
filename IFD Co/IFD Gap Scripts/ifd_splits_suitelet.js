nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 May 2016     Rafe Goldbach, SuiteLaunch LLC
 *
 */
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function splitItem(request, response) {

    if (request.getMethod() == 'GET') {
        //var thisItem = nlapiGetFieldValue('');
        // var splitItem = nlapiGetFieldValue('custitem_ifd_split_item');
        // var splitQty = nlapiGetFieldValue('custitem_ifd_split_qty');


        // search for master items

        //var filters = new Array();	
        //fields[0]= 'custitem_ifd_split_item_link';

        var form = nlapiCreateForm('Split Items');
        var item = form.addField('item_to_split', 'select', 'Item', 'inventoryitem');
        var cases = form.addField('cases_to_split', 'integer', 'Cases to Split');
        // var sourceBin = form.addField('source_bin', 'select', 'Source Bin','customrecord_ebiznet_location');
        form.addSubmitButton('Submit');
        response.writePage(form);


        // investigate getSelectOptions(filter, filteroperator)

    }

    if (request.getMethod() == 'POST') {
    	nlapiLogExecution('debug', 'post', 'start');
        var today = new Date();
        today = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
        nlapiLogExecution('debug', 'today', today);

        var masterItem = request.getParameter('item_to_split');
        var fields = new Array();
        fields[0] = 'custitem_ifd_split_item_link';
        fields[1] = 'averagecost';
        //var columns = new Array();
        nlapiLogExecution('debug', 'masterItem', masterItem);
        // lookup split item
        var splitPn = nlapiLookupField('inventoryitem', masterItem, 'custitem_ifd_split_item_link');
        if(!splitPn){
        	var form = nlapiCreateForm('Split Items');
        	var help = form.addField('custpage_help', 'help', 'A split was not found for this item!');
        	response.writePage(form);
        	return;
        	
        }
        var masterAvgCost = nlapiLookupField('inventoryitem', masterItem, 'averagecost');
        nlapiLogExecution('debug', 'splitPn', splitPn);
        nlapiLogExecution('debug', 'masterAvgCost', masterAvgCost);
        var casesToSplit = request.getParameter('cases_to_split');

        /*
    	 * section moved to below
    	//var masterBin = request.getParameter('source_bin');
    	// Determine the bin number for the master item
    	filters[0] = new nlobjSearchFilter('custrecord_pickfacesku', null, 'is', masterItem);
    	var searchResult = nlapiSearchRecord('customrecord_ebiznet_pickfaceloc', 'customsearch_item_pf_bin', filters); 
    	var columns = searchResult[0].getAllColumns();
        var masterBin = searchResult[0].getValue(columns[1]);
        nlapiLogExecution('debug','master bin ',masterBin);
    	*/
        nlapiLogExecution('debug', 'cases_to_split', casesToSplit);

        // get conversion details on the split item
        var fields = new Array();
        fields[0] = 'custitem_ifd_splitconversion';
        //fields[1]= 'custitem_extra_handling_cost';
        //fields[2]= 'custitem_extra_handling_cost2';
        //fields[3]= 'custitem_item_burden_percent';
        var columns = nlapiLookupField('inventoryitem', splitPn, fields);
        var conversion = parseFloat(columns.custitem_ifd_splitconversion);
        //var extra1 = parseFloat(columns.custitem_extra_handling_cost1);
        var extra1 = 0;
        //var extra2 = parseFloat(columns.custitem_extra_handling_cost2);
        var extra2 = 0;
        //var burden = parseFloat(columns.custitem_item_burden_percent);
        //burden = burden/100;
        var burden = 0;
        //nlapiLogExecution('debug','lookup data',conversion+'/'+extra1+'/'+extra2+'/'+burden);
        var totalEx = 0;
        //var totalEx = parseFloat(extra1)+parseFloat(extra2);
        //nlapiLogExecution('debug','totalEx',totalEx);
        // begin creating the adjustment record
        var record = nlapiCreateRecord('inventoryadjustment');
        record.setFieldValue('subsidiary', '2');
        //nlapiLogExecution('debug', 'set subsidiary', '2');        
        record.setFieldValue('adjlocation', '1');
        //nlapiLogExecution('debug', 'set adj location', '1');      
        record.setFieldValue('department', '17');
        //nlapiLogExecution('debug', 'department', 17);       
        record.setFieldValue('account', '329');
        // nlapiLogExecution('debug', 'set account', '329');        
        record.setFieldValue('custbody_ifd_adj_code', '22');
        // nlapiLogExecution('debug', 'set adj code', '22');
        record.setFieldValue('memo', 'Inventory Split TEST TEST TEST');

        //record.selectNewLineItem('inventory');
        var adjustQty = (parseInt(casesToSplit) * (-1));
        nlapiLogExecution('debug', 'adjustQty ', adjustQty);
        //record.selectLineItem('inventory','1');
        record.setLineItemValue('inventory', 'item', '1', masterItem);
        nlapiLogExecution('debug', 'set master item', masterItem);
        record.setLineItemValue('inventory', 'adjustqtyby', '1', adjustQty);
        nlapiLogExecution('debug', 'set adjustQty', adjustQty);
        record.setLineItemValue('inventory', 'department', '1', '17');
        nlapiLogExecution('debug', 'set department on line', '17');
        record.setLineItemValue('inventory', 'location', '1', '1');
        nlapiLogExecution('debug', 'set location on line', '1');
        // record.commitLineItem('inventory');

        // begin line 2
        var caseRate = masterAvgCost;
        nlapiLogExecution('debug', 'caseRate', caseRate);
        var splitRate = parseFloat(caseRate / conversion);
        splitRate = (splitRate + extra1 + extra2) * (1 + burden);
        nlapiLogExecution('debug', 'splitRate', splitRate);

        record.setLineItemValue('inventory', 'item', '2', splitPn);
        nlapiLogExecution('debug', 'set item 2', splitPn);

        var adjustby = parseInt(casesToSplit) * parseInt(conversion);
        record.setLineItemValue('inventory', 'adjustqtyby', '2', adjustby);
        nlapiLogExecution('debug', 'set adjustqtyby 2', adjustby);

        record.setLineItemValue('inventory', 'unitcost', '2', splitRate);
        nlapiLogExecution('debug', 'set unit cost 2', splitRate);

        record.setLineItemValue('inventory', 'department', '2', '17');
        nlapiLogExecution('debug', 'set department', '17');

        record.setLineItemValue('inventory', 'location', '2', '1');
        nlapiLogExecution('debug', 'set location', '1');

        //record.commitLineItem('inventory');
        // nlapiLogExecution('debug','line committed','2');

        // Begin test for values
        /*
        nlapiLogExecution('debug', 'header sub', record.getFieldValue('subsidiary'));
        nlapiLogExecution('debug', 'header loc', record.getFieldValue('adjlocation'));
        nlapiLogExecution('debug', 'header dep', record.getFieldValue('department'));
        nlapiLogExecution('debug', 'header acct',record.getFieldValue('account'));
        
        nlapiLogExecution('debug', 'line 1 item', record.getLineItemValue('inventory','item',1));
        nlapiLogExecution('debug', 'line 1 adjustqtyby', record.getLineItemValue('inventory','adjustqtyby',1));
        nlapiLogExecution('debug', 'line 1 location', record.getLineItemValue('inventory','location',1));
        nlapiLogExecution('debug', 'line 1 department', record.getLineItemValue('inventory','department',1));
                
        nlapiLogExecution('debug', 'line 2 item', record.getLineItemValue('inventory','item',2));
        nlapiLogExecution('debug', 'line 2 adjustqtyby', record.getLineItemValue('inventory','adjustqtyby',2));
        nlapiLogExecution('debug', 'line 2 location', record.getLineItemValue('inventory','location',2));
        nlapiLogExecution('debug', 'line 2 department', record.getLineItemValue('inventory','department',2));
     */
        var id = nlapiSubmitRecord(record, true);
        nlapiLogExecution('debug', 'record committed', id);
        

        // Start Integration with WMS Records **********************************************************************

        // ID for CREATE RECORD ID OF ITEM 59262 in BIN B0861 is 347
        // get the available quantity:  custrecord_ebiz_avl_qty

        // this is a test
        // testRec = nlapiLoadRecord('customrecord_ebiznet_createinv',347);
        //testrec.getfieldValue('')

        //var masterBin = request.getParameter('source_bin');
        // Determine the bin number for the master item
        var masterBinFilters = new Array();
        masterBinFilters[0] = new nlobjSearchFilter('custrecord_pickfacesku', null, 'is', masterItem);
        var masterSearchResult = nlapiSearchRecord('customrecord_ebiznet_pickfaceloc', 'customsearch_item_pf_bin', masterBinFilters);
        var columns = masterSearchResult[0].getAllColumns();
        var masterBin = masterSearchResult[0].getValue(columns[2]);
        nlapiLogExecution('debug', 'master bin ', masterBin); ///******************QUITTED HERE


        var masterInvRec = 0;
        // search for master inventory record for this item bin combination
        var filters = new Array;
        filters[0] = new nlobjSearchFilter('custrecord_ebiz_inv_binloc', null, 'is', masterBin);
        filters[1] = new nlobjSearchFilter('custrecord_ebiz_inv_sku', null, 'is', masterItem);
        var searchResult = nlapiSearchRecord('customrecord_ebiznet_createinv', 'customsearch_search_create_inventory', filters); // load the create inventory records
        //Inventory_to_split **** SCRIPT ******
        /*
        if (searchResult) {
        	var remainingCases = casesToSplit;// Need to cycle through the create inventory records using available quantities i.e while remaining Cases >0
            for (var j = 0; j < searchResult.length; j++) {
                var columns = searchResult[j].getAllColumns();
                var recId = searchResult[j].getValue(columns[1]);
                var available = searchResult[j].getValue(columns[9]);
                if (available - casesToSplit > 0) {// will need to change to if Available>0;
                    masterInvRec = recId;
                    j = searchResult.length;
                    nlapiLogExecution('debug', 'masterInvRec', recId);
                }
            }
        }
        */
        
        var columns = searchResult[0].getAllColumns();
        var recId = searchResult[0].getValue(columns[1]);
        var available = searchResult[0].getValue(columns[9]);
        masterInvRec = recId;
        if (masterInvRec == 0) {
        	nlapiLogExecution('debug', 'masterInvRec', masterInvRec);
            return false;
        }
        

        var fields = new Array();
        fields[0] = 'custrecord_ebiz_avl_qty';
        fields[1] = 'custrecord_ebiz_qoh';
        fields[2] = 'custrecord_ebiz_inv_qty';
        fields[3] = 'custrecord_ebiz_callinv';


        var columns = nlapiLookupField('customrecord_ebiznet_createinv', masterInvRec, fields);


        var masterCreateAvailable = parseFloat(columns.custrecord_ebiz_avl_qty);
        var masterCreateQoh = parseFloat(columns.custrecord_ebiz_qoh);
        var masterInvQty = parseFloat(columns.custrecord_ebiz_inv_qty);

        nlapiLogExecution('debug', 'masterCreateInvAvailable', masterCreateAvailable);
        masterCreateAvailable = parseInt(masterCreateAvailable + adjustQty);
        masterCreateQoh = parseInt(masterCreateQoh + adjustQty);
        masterCreateInv = parseInt(masterInvQty + adjustQty);

        var values = new Array();
        values[0] = masterCreateAvailable;
        values[1] = masterCreateQoh;
        values[2] = masterInvQty;
        values[3] = 'N';

        nlapiLogExecution('debug', 'adjustQty', adjustQty);
        nlapiSubmitField('customrecord_ebiznet_createinv', masterInvRec, fields, values);
        nlapiLogExecution('debug', 'masterInvRec', 'updated');

        // Create a new record for the splits******************************************************************
        
        //lookup split item bin
        var splitfilters = new Array();
        splitfilters[0] = new nlobjSearchFilter('custrecord_pickfacesku', null, 'is', splitPn);
        var splitSearchResult = nlapiSearchRecord('customrecord_ebiznet_pickfaceloc', 'customsearch_item_pf_bin', splitfilters);
        var splitcolumns = splitSearchResult[0].getAllColumns();
        var splitBin = splitSearchResult[0].getValue(splitcolumns[1]);
        nlapiLogExecution('debug', 'split bin ', splitBin);
        
        // lookup next LP
        var nextLp = nlapiLookupField('customrecord_ebiznet_lp_range', '9', 'custrecord_ebiznet_lprange_lpmax');
        var adjLP = parseInt(nextLp)+1;
        nextLp = 'VIR'+nextLp;

        nlapiLogExecution('debug', 'split bin ', splitBin);
        
        
        
        fields[4] = 'custrecord_ebiz_inv_sku';
        fields[5] = 'custrecord_ebiz_inv_binloc'; //18955      
        fields[6] = 'custrecord_ebiz_inv_lp';
        fields[7] = 'custrecord_ebiz_inv_packcode';
        fields[8] = 'custrecord_name';
        fields[9] = 'custrecord_ebiz_inv_sku_status';
        fields[10] = 'customrecord_ebiznet_company';
        //fields[11] = 'custrecord_ebiz_inv_note1';
        //fields[12] = 'custrecord_ebiz_inv_note2';
        values[0] = adjustby;
        values[1] = adjustby;
        values[2] = adjustby;

        values[4] = splitPn; //x
        values[5] = splitBin; //x
        values[6] = nextLp; //x
        values[7] = '1'; //x
        values[8] = '-1'; //x
        values[9] = 'Good'; //x
        values[10] = '9'; //x
        //values[11] = 'Created From Split';
        //values[12] = today;             
        // need to set company to 9 (IFD)
        
        nlapiLogExecution('debug', 'custrecord_ebiz_avl_qty', values[0]);
        nlapiLogExecution('debug', 'custrecord_ebiz_qoh', values[1]);
        nlapiLogExecution('debug', 'custrecord_ebiz_inv_qty', values[2]);
        nlapiLogExecution('debug', 'custrecord_ebiz_callinv', values[3]);
        nlapiLogExecution('debug', 'custrecord_ebiz_inv_sku', values[4]);
        nlapiLogExecution('debug', 'custrecord_ebiz_inv_binloc', values[5]);
        nlapiLogExecution('debug', 'custrecord_ebiz_inv_lp', values[6]);
        nlapiLogExecution('debug', 'custrecord_ebiz_inv_packcode', values[7]);
        nlapiLogExecution('debug', 'custrecord_name', values[8]);
        nlapiLogExecution('debug', 'custrecord_ebiz_inv_sku_status', values[9]);



        nlapiLogExecution('debug', 'NewasterInvRec', 'creating new record');
        var newRec = nlapiCreateRecord('customrecord_ebiznet_createinv');
        nlapiLogExecution('debug', 'masterInvRec', 'settting new values');

        newRec.setFieldValue('name', '-1');
        newRec.setFieldValue('custrecord_ebiz_inv_sku', splitPn);
        newRec.setFieldValue('custrecord_ebiz_inv_binloc', splitBin);
        newRec.setFieldValue('custrecord_ebiz_inv_lp', nextLp);
        newRec.setFieldValue('custrecord_ebiz_inv_packcode', '1');
        newRec.setFieldValue('custrecord_ebiz_inv_sku_status', '1');
        newRec.setFieldValue('customrecord_ebiznet_company', '9');
        newRec.setFieldValue('custrecord_name', '-1');
        //custrecord_ebiz_inv_qty
        newRec.setFieldValue('custrecord_ebiz_inv_qty', adjustby);
        newRec.setFieldValue('custrecord_ebiz_qoh', adjustby);
        newRec.setFieldValue('custrecord_ebiz_avl_qty', adjustby);
        newRec.setFieldValue('custrecord_ebiz_callinv', 'N');
        /*        var fields = new Array();
        fields[0] = 'custrecord_ebiz_avl_qty';
        fields[1] = 'custrecord_ebiz_qoh';
        fields[2] = 'custrecord_ebiz_inv_qty';
        fields[3] = 'custrecord_ebiz_callinv';
        */
        
        
        
        newRec.setFieldValue('custrecord_ebiz_inv_note1', 'Created From Split Script');
        newRec.setFieldValue('custrecord_ebiz_inv_note2', today);




        //newRec.setFieldValue(fields,values);
        nlapiLogExecution('debug', 'masterInvRec', 'values set');

        var newRecId = nlapiSubmitRecord(newRec);
        //nlapiLookupField('customrecord_ebiznet_lp_range', '9','custrecord_ebiznet_lprange_lpmax',);
        nlapiSubmitField('customrecord_ebiznet_lp_range','9','custrecord_ebiznet_lprange_lpmax',adjLP,false);

        nlapiLogExecution('debug', 'splitRec', newRecId);
        nlapiSetRedirectURL('RECORD', 'inventoryadjustment', id, false);
        nlapiSetRedirectURL('SUITELET', 'customscript_ifd_split_items_suitelet', 'customdeploy_split_items');

    }



}