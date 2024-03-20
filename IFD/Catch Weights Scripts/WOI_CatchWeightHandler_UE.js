/**
 * Copyright NetSuite, Inc. 2015 All rights reserved. 
 * The following code is a demo prototype. Due to time constraints of a demo,
 * the code may contain bugs, may not accurately reflect user requirements 
 * and may not be the best approach. Actual implementation should not reuse 
 * this code without due verification.
 * 
 * (Module description here. Whole header length should not exceed 
 * 100 characters in width. Use another line if needed.)
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Jul 2015     jerfernandez
 * 
 */

//-- Import cw_util.js


/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwDetailsHandlerBeforeLoad(type, form, request) {    
    if (type == 'view' || type == 'edit' || type == 'create') {
        var sblItem = form.getSubList('component');
        var nLines = nlapiGetLineItemCount('component');     
        var idRecord = nlapiGetFieldValue('tranid');        
        var cwComponentsTab = form.addTab(TAB_CW_COMPONENTS, 'Catch Weight Components');            
        var lst = form.addSubList(SUBLIST_COMPONENTS, 'list', 'Component', TAB_CW_COMPONENTS);
        
        lst.addField(FLD_CW_WOI_CWC_ITEM, 'select', 'Component', 'item').setDisplayType('inline');
        lst.addField(FLD_CW_WOI_CATCH_WEIGHT, 'float', 'Catch Weight').setDisplayType('entry');
        lst.addField(FLD_CW_LINK, 'text', 'CW Detail');
        lst.addField(FLD_CW_WOI_PRICING_UNIT_TYPE, 'text', 'Pricing Unit Type');
        
        for(var i = 1; i <= nLines; i++){
            var idLineItem = nlapiGetLineItemValue('component', 'item', i);                       
            lst.setLineItemValue(FLD_CW_WOI_CWC_ITEM, i, idLineItem);
            
            var bCatchWeightItem = nlapiLookupField('item', idLineItem, FLD_CATCH_WEIGHT_ITEM);
            if(bCatchWeightItem == 'T'){               
                var sUrlSL = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);            
                var sURL = sUrlSL + 
                        '&custpage_id=' + idRecord +
                        '&custpage_item=' + idLineItem +
                        '&custpage_line=' + i +
                        '&custpage_mode=' + type;            
                var sAction = 'onclick="nlExtOpenWindow(\'' + sURL + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
                        HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';            
                var sLinkText = '<a class="i_inventorydetailset" ' + sAction + '"></a>';
                var sPricingUnitsType = nlapiLookupField('item', idLineItem, FLD_CW_PRICING_UNITS_TYPE, true);
                
                lst.setLineItemValue(FLD_CW_LINK, i, sLinkText);
                lst.setLineItemValue(FLD_CW_WOI_PRICING_UNIT_TYPE, i, sPricingUnitsType);
                
                //Check if Catch Weight Details subrecord already exist
                var idCatchWeightDetail = idRecord + '_' + idLineItem + '_' + i;                        
                var idCWDRecord = getCatchWeightDetails(idCatchWeightDetail);
                if(idCWDRecord){
                    var fTotalCatchWeight = nlapiLookupField(REC_CATCH_WEIGHT_DETAILS, idCWDRecord, FLD_TOTAL_CW);
                    lst.setLineItemValue(FLD_CW_WOI_CATCH_WEIGHT, i, fTotalCatchWeight);                
                }
                var idItem = nlapiGetFieldValue('item');
                var idPhysicalUnitsType = nlapiLookupField('item', idItem, 'unitstype');
                var idPricingUnitsType = nlapiLookupField('item', idItem, FLD_CW_PRICING_UNITS_TYPE);        
                nlapiSetFieldValue(FLD_CW_WO_PHYSICAL_UNITS_TYPE, idPhysicalUnitsType);
                nlapiSetFieldValue(FLD_CW_WO_PRICING_UNITS_TYPE, idPricingUnitsType);
            }
        }
    }
}



/**
 * Update Catch Weight Details after submit
 * @param type
 * @param form
 * @param request
 */
function cwDetailsHandlerAfterSubmit(type, form, request) {
    if(type == 'create' || type == 'edit'){
        var sRecType = nlapiGetRecordType();
        var idWorkOrderIssue = nlapiGetRecordId();
        var idRec = nlapiGetFieldValue('createdfrom');
        var sTranId = nlapiGetFieldValue('tranid');
        //Load Work Order record and update average weight per physical unit with Actual Weight received        
        var rec = nlapiLoadRecord('workorder', idRec);
        var nLines = nlapiGetLineItemCount('component');
        
        for(var i = 1; i <= nLines; i++){
            var idItem = nlapiGetLineItemValue('component', 'item', i);        
            var bCatchWeightItem = nlapiLookupField('item', idItem, FLD_CATCH_WEIGHT_ITEM);
            
            if(bCatchWeightItem == 'T'){
                //Set Actual Weight on Work Order
                var fActualCatchWeight = parseFloat(nlapiGetLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, i));                
                rec.setLineItemValue('item', COL_ACTUAL_WEIGHT, i, fActualCatchWeight);
                            
                //Update Catch Weight Remaining                
                /*var idCatchWeightDetail = idWorkOrderIssue + '_' + idItem + '_' + i;              
                var idCWDetailRecord = getCatchWeightDetails(idCatchWeightDetail);
                var recCW = nlapiLoadRecord(type, id, initializeValues);*/
                
                //nlapiLogExecution('DEBUG', 'TRACER', 'fPrevCatchWeight:' + fPrevCatchWeight);
                updateWOICatchWeight(sRecType, idItem, i, sTranId, type);
            } 
        }
        nlapiSubmitRecord(rec, false, true);
    }    
}

/**
 * Update Catch Weight Details
 * @param sRecUpdate
 */
function updateWOICatchWeight(sRecUpdate, idItem, nCurrentLine, sTranId, type){
    nlapiSelectLineItem('component', nCurrentLine);
    var fTotalCatchWeight = parseFloat(nlapiGetLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, nCurrentLine));
    var invDetailSubrecord = nlapiViewCurrentLineItemSubrecord('component', 'componentinventorydetail');
    
    if(invDetailSubrecord){
        var fItemQty = parseFloat(nlapiGetCurrentLineItemValue('component', 'quantity'));
        var fQtyCounter = 0;
        var nDetailLineCounter = 1;
        while(fQtyCounter < fItemQty){  //Loop inside the Inventory Detail
            invDetailSubrecord.selectLineItem('inventoryassignment', nDetailLineCounter);
            var idInvDetail = invDetailSubrecord.getCurrentLineItemValue('inventoryassignment','issueinventorynumber');
            
            var fQty = parseFloat(invDetailSubrecord.getCurrentLineItemValue('inventoryassignment','quantity')); 
            fQtyCounter += fQty;
            nDetailLineCounter++;
                  
            var fCatchWeight = (fTotalCatchWeight / fItemQty) * fQty;
            //var fRemainingCatchWeight = getSerialCatchWeight(sSerial, idItem);
            //fCatchWeight = fRemainingCatchWeight - fTotalCatchWeight;
                        
            //var recInvNumber = nlapiLoadRecord('inventorynumber', idInvDetail);
            //var sSerial = recInvNumber.getFieldValue('inventorynumber');
            var sSerial = nlapiLookupField('inventorynumber', idInvDetail, 'inventorynumber');
            var fRemainingCatchWeight = getSerialCatchWeight(sSerial, idItem);
            
            var idCWDetail = getCatchWeightDetails(sTranId + '_' + idItem + '_' + nCurrentLine);
            var recCWDetail = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, idCWDetail);
            var sCWLot = recCWDetail.getFieldValue(FLD_CWD_LOT_NUMBER);
            if(!sCWLot){
                recCWDetail.setFieldValue(FLD_CWD_LOT_NUMBER, sSerial);
                recCWDetail.setFieldValue(FLD_REC_SOURCE_TYPE, 'Work Order Issue');
                nlapiSubmitRecord(recCWDetail, false, true);
                fCatchWeight = fRemainingCatchWeight - fCatchWeight;              
            }
            else{
                fCatchWeight = fRemainingCatchWeight;
            }
            var recInvNumber = nlapiLoadRecord('inventorynumber', idInvDetail);
            recInvNumber.setFieldValue(FLD_CATCH_WEIGHT_REMAINING, fCatchWeight);
            
            nlapiLogExecution('DEBUG', 'TRACER', 'sCWLot:' + sCWLot);
            nlapiLogExecution('DEBUG', 'TRACER', 'sSerial:' + sSerial);
            nlapiLogExecution('DEBUG', 'TRACER', 'fRemainingCatchWeight:' + fRemainingCatchWeight);
            nlapiLogExecution('DEBUG', 'TRACER', 'fCatchWeight:' + fCatchWeight);
            nlapiLogExecution('DEBUG', 'TRACER', 'idInvDetail:' + idInvDetail);            
            
            nlapiSubmitRecord(recInvNumber, false, true);
            
        }//--End loop inside Inventory Detail
    } //--Check if Lot Numbered Item    
}

/**
 * Display Catch Weight Details on Sales Order and Invoice
 * @param type
 * @param form
 * @param request
 */
function cwShowDetailsBeforeLoad(type, form, request) {    
    var idRec = nlapiGetRecordId();
    if(nlapiGetRecordType() == 'invoice'){
        idRec = nlapiGetFieldValue('createdfrom');
    }
    
    var sStatus = nlapiGetFieldValue('status');      
    if (type == 'view') {               
        var nLines = nlapiGetLineItemCount('item');                       
        var idItemFulfillment = getItemFulfillment(idRec);
            
        if(idItemFulfillment){
            var sblItem = form.getSubList('item');
            sblItem.addField(FLD_CW_LINK, 'text', 'CW Detail');
            
            for(var i = 1; i <= nLines; i++){               
                var idLineItem = nlapiGetLineItemValue('item', 'item', i);            
                var sUrlSL = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);            
                var sURL = sUrlSL + 
                        '&custpage_id=' + idItemFulfillment +
                        '&custpage_item=' + idLineItem +
                        '&custpage_line=' + i +
                        '&custpage_mode=' + 'view';            
                var sAction = 'onclick="nlExtOpenWindow(\'' + sURL + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
                        HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';            
                var sLinkText = '<a class="i_inventorydetailset" ' + sAction + '"></a>';                                            
                sblItem.setLineItemValue(FLD_CW_LINK, i, sLinkText);  
                
            }         
        }
    }  
}

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwShowDetailsVBBeforeLoad(type, form, request) {    
    if (type == 'view') {               
        var nLines = nlapiGetLineItemCount('item');                       
        var idPO = nlapiGetLineItemValue('purchaseorders', 'id', 1);
        
        if(idPO){            
            var idItemReceipt = getItemReceipt(idPO);
            
            if(idItemReceipt){
                var sblItem = form.getSubList('item');
                sblItem.addField(FLD_CW_LINK, 'text', 'CW Detail');
                
                for(var i = 1; i <= nLines; i++){               
                    var idLineItem = nlapiGetLineItemValue('item', 'item', i);            
                    var sUrlSL = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);            
                    var sURL = sUrlSL + 
                            '&custpage_id=' + idItemReceipt +
                            '&custpage_item=' + idLineItem +
                            '&custpage_line=' + i +
                            '&custpage_mode=' + 'view';            
                    var sAction = 'onclick="nlExtOpenWindow(\'' + sURL + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
                            HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';            
                    var sLinkText = '<a class="i_inventorydetailset" ' + sAction + '"></a>';                                            
                    sblItem.setLineItemValue(FLD_CW_LINK, i, sLinkText);                            
                }         
            }
        }
    }
}


/**
 * Search Catch Weight Details record
 * @param idRecord
 * @returns
 */
function getCatchWeightDetails(idRecord){
    var aSearchFilters = new Array();        
    aSearchFilters.push(new nlobjSearchFilter(FLD_CATCH_WEIGHT_DETAILS_ID, null, 'is', idRecord));

    var aColumns = new Array();   
    aColumns.push(new nlobjSearchColumn('internalid', null, null));
    
    var aSearchResults = new Array();
    var aSearchResults = nlapiSearchRecord(REC_CATCH_WEIGHT_DETAILS, null, aSearchFilters, aColumns);        
    
    if(aSearchResults){
        return aSearchResults[0].getId();
    }
    return null;
}  
