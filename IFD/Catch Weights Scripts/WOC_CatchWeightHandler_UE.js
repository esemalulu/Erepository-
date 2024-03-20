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
 * 1.00       23 Nov 2015     jerfernandez
 * 
 */



/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwWOCCatchWeightHandlerBeforeLoad(type, form, request) {    
    if (type == 'view' || type == 'create' || type == 'edit') {
        var idRecord = nlapiGetFieldValue('tranid');        
        var fldCWIcon = form.addField(FLD_CW_WO_DETAIL, 'richtext', 'CW Detail').setDisplayType('inline');
        var fldCW = form.addField(FLD_CW_WO_CATCH_WEIGHT, 'text', 'Catch Weight');
        var idItem = nlapiGetFieldValue('item');
        var sUrlSL = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);
        var i = 0;
        var sURL = sUrlSL + 
                '&custpage_id=' + idRecord +
                '&custpage_item=' + idItem +
                '&custpage_line=' + i +
                '&custpage_mode=' + type;            
        var sAction = 'onclick="nlExtOpenWindow(\'' + sURL + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' +
                HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';
        var sLinkText = '<a class="i_inventorydetailset" ' + sAction + '"></a>';
        fldCWIcon.setDefaultValue(sLinkText);
        
        //Check if Catch Weight Details subrecord already exist
        var idCatchWeightDetail = idRecord + '_' + idItem + '_' + i;                        
        var idCWDRecord = getCatchWeightDetails(idCatchWeightDetail);
        if(idCWDRecord){
            var fTotalCatchWeight = nlapiLookupField(REC_CATCH_WEIGHT_DETAILS, idCWDRecord, FLD_TOTAL_CW);
            nlapiSetFieldValue(FLD_CW_WO_CATCH_WEIGHT, fTotalCatchWeight);
        }
        
        var idPhysicalUnitsType = nlapiLookupField('item', idItem, 'unitstype');
        var idPricingUnitsType = nlapiLookupField('item', idItem, FLD_CW_PRICING_UNITS_TYPE);        
        nlapiSetFieldValue(FLD_CW_WO_PHYSICAL_UNITS_TYPE, idPhysicalUnitsType);
        nlapiSetFieldValue(FLD_CW_WO_PRICING_UNITS_TYPE, idPricingUnitsType);
        
        //Add CW Detail Subtab
        var bBackflush = nlapiGetFieldValue('isbackflush');
        if(bBackflush == 'T'){
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
                
                lst.setLineItemValue(FLD_CW_WOI_CWC_ITEM, i, idLineItem);
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
            }//End Add CW Detail Subtab
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
        var bBackflush = nlapiGetFieldValue('isbackflush');
        
        if(bBackflush == 'T'){
            nlapiLogExecution('DEBUG', 'WOC with Backflush', 'Process Start');
            var idRec = nlapiGetFieldValue('createdfrom');
            
            //Load Work Order record and update average weight per physical unit with Actual Weight received
            var rec = nlapiLoadRecord('workorder', idRec);
            var nLines = nlapiGetLineItemCount('component');
            
            for(var i = 1; i <= nLines; i++){
                var idItem = nlapiGetLineItemValue('component', 'item', i);        
                var bCatchWeightItem = nlapiLookupField('item', idItem, FLD_CATCH_WEIGHT_ITEM);
                
                if(bCatchWeightItem == 'T'){
                    //Set Actual Weight on PO
                    var fActualCatchWeight = parseFloat(nlapiGetLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, i));                
                    rec.setLineItemValue('item', COL_ACTUAL_WEIGHT, i, fActualCatchWeight);                    
                }
            }        
            nlapiSubmitRecord(rec, false, true);
            nlapiLogExecution('DEBUG', 'WOC with Backflush', 'Process Complete');
        }
        else{
            nlapiLogExecution('DEBUG', 'WOC without Backflush', 'Process Start');
            var sTranId = nlapiGetFieldValue('tranid');
            var idItem = nlapiGetFieldValue('item');
            
            updateWOCCatchWeight(sRecType, idItem, 0, sTranId);
            nlapiLogExecution('DEBUG', 'WOC without Backflush', 'Process Complete');
        }
    }    
}

/**
 * Update Catch Weight Details
 * @param sRecUpdate
 */
function updateWOCCatchWeight(sRecUpdate, idItem, nCurrentLine, sTranId){
    var fTotalCatchWeight = parseFloat(nlapiGetFieldValue(FLD_CW_WO_CATCH_WEIGHT));
    var invDetailSubrecord = nlapiViewSubrecord('inventorydetail');

    if(invDetailSubrecord){
        var fItemQty = parseFloat(nlapiGetFieldValue('quantity'));
        var fQtyCounter = 0;
        var nDetailLineCounter = 1;
        while(fQtyCounter < fItemQty){  //Loop inside the Inventory Detail
            invDetailSubrecord.selectLineItem('inventoryassignment', nDetailLineCounter);
            var sSerial = invDetailSubrecord.getCurrentLineItemValue('inventoryassignment', 'receiptinventorynumber');            
            var fQty = parseFloat(invDetailSubrecord.getCurrentLineItemValue('inventoryassignment', 'quantity')); 
            fQtyCounter += fQty;
            nDetailLineCounter++;
                  
            var idInvDetail = getSerialID(sSerial, idItem);            
            var fCatchWeight = (fTotalCatchWeight / fItemQty) * fQty;            
            var fRemainingCatchWeight = getSerialCatchWeight(sSerial, idItem);
            
            var idCWDetail = getCatchWeightDetails(sTranId + '_' + idItem + '_' + nCurrentLine);
            var recCWDetail = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, idCWDetail);
            var sCWLot = recCWDetail.getFieldValue(FLD_CWD_LOT_NUMBER);
            if(!sCWLot){
                recCWDetail.setFieldValue(FLD_CWD_LOT_NUMBER, sSerial);
                recCWDetail.setFieldValue(FLD_REC_SOURCE_TYPE, 'Work Order Completion');
                nlapiSubmitRecord(recCWDetail, false, true);
                fCatchWeight = fRemainingCatchWeight + fCatchWeight;              
            }
            else{
                fCatchWeight = fRemainingCatchWeight;
            }
            var recInvNumber = nlapiLoadRecord('inventorynumber', idInvDetail);
            if(recInvNumber){
                recInvNumber.setFieldValue(FLD_CATCH_WEIGHT_REMAINING, fCatchWeight);
                nlapiSubmitRecord(recInvNumber, false, true);
            }
            nlapiLogExecution('DEBUG', 'TRACER', 'sCWLot:' + sCWLot);
            nlapiLogExecution('DEBUG', 'TRACER', 'sSerial:' + sSerial);
            nlapiLogExecution('DEBUG', 'TRACER', 'fRemainingCatchWeight:' + fRemainingCatchWeight);
            nlapiLogExecution('DEBUG', 'TRACER', 'fCatchWeight:' + fCatchWeight);
            nlapiLogExecution('DEBUG', 'TRACER', 'idInvDetail:' + idInvDetail);            
            
            
            
        }//--End loop inside Inventory Detail
    } //--Check if Lot Numbered Item    
}