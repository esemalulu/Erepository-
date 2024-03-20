nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not<
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */


var COSTCATEGORY = {
    'tempRecord'    : '1',
    'palletCharge'  : '2',
    'lumperFees'    : '3', 
    'freight'       : '4',
    'produceBoxes'  : '5',
    'forward'       : '6',
    'stopCharge'    : '7',
    'otherCost'     : '8',
    'freightAdmin'  : '9'
}

var COSTCATEGORY_MAPPING = {
    'custitem_ifd_landedcost_tempmon'       : COSTCATEGORY.tempRecord,
    'custitem_ifd_palletcharge'             : COSTCATEGORY.palletCharge,
    'custitem_ifd_landedcost_forward'       : COSTCATEGORY.forward,
    'custitem_ifd_landedcost_freightcost'   : COSTCATEGORY.freight,
    'custitem_ifd_landedcost_freightadmin'  : COSTCATEGORY.freightAdmin,
    'custitem_ifd_landedcost_stopcharge'    : COSTCATEGORY.stopCharge,
    'custitem_ifd_landedcost_othercost'     : COSTCATEGORY.otherCost
}       
                
/**
 * Apply Landed Costs on Item Receipt
 
 * Version    Date            Author           Remarks
 * 1.0        07 Jul 2016     Regina dela Cruz initial
 */
 
function beforeSubmit_applyLandedCosts(type)
{
    var stLoggerTitle = 'beforeSubmit_applyLandedCosts';

    try
    {
        if (type != 'create' && type != 'edit')
        {
            return; 
        }
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '-------------- Start --------------');
        
        var stItemReceiptId = nlapiGetRecordId();
        nlapiLogExecution('DEBUG',stLoggerTitle, 'Processing stItemReceiptId = ' + stItemReceiptId);          
        
        var recItemReceipt = nlapiGetNewRecord();
        
        //get Items 
        var arrItems = [];
        for(var line = 1; line <= recItemReceipt.getLineItemCount('item'); line++)
        {
            var stIsReceived = recItemReceipt.getLineItemValue('item','itemreceive',line);
            if(stIsReceived != 'T') continue; //skip if not received
            
            var stTrackLandedCost = recItemReceipt.getLineItemValue('item','tracklandedcost',line);            
            if(stTrackLandedCost != 'T') continue; //skip if no landed cost
            
            var stItemId = recItemReceipt.getLineItemValue('item','item',line);            
            if(!NSUtil.inArray(stItemId,arrItems))
            {
                arrItems.push(stItemId);                
            }       
        }
        
        nlapiLogExecution('DEBUG',stLoggerTitle, 'Processing arrItems = ' + arrItems);      
        
        if(arrItems.length == 0)
        {
            nlapiLogExecution('DEBUG',stLoggerTitle, 'Exit. No Items with Track Landed Cost'); 
            return;
        }        
        
        var arrLC = [];
        
        //search Item record to get cost category fields
        var filters = [new nlobjSearchFilter('internalid', null, 'anyof', arrItems)];
          
        var columns = [new nlobjSearchColumn('internalid')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_tempmon')
                     , new nlobjSearchColumn('custitem_ifd_palletcharge')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_forward')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_freightadmin')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_stopcharge')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_othercost')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_freightcost')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_pickupallow')]
                                                
        var results = nlapiSearchRecord('item', null, filters, columns);
        if(!NSUtil.isEmpty(results))
        {
            for(var i = 0; i < results.length; i++)
            {
                var stItemId = results[i].getId();
                
                var objCostCategory = {};
                objCostCategory.custitem_ifd_landedcost_tempmon        = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_tempmon'));
                objCostCategory.custitem_ifd_palletcharge              = NSUtil.forceFloat(results[i].getValue('custitem_ifd_palletcharge'));
                objCostCategory.custitem_ifd_landedcost_forward        = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_forward'));
                objCostCategory.custitem_ifd_landedcost_freightadmin   = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_freightadmin'));
                objCostCategory.custitem_ifd_landedcost_stopcharge     = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_stopcharge'));
                objCostCategory.custitem_ifd_landedcost_othercost      = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_othercost'));				
                objCostCategory.custitem_ifd_landedcost_freightcost    = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_freightcost'));
                objCostCategory.custitem_ifd_landedcost_pickupallow    = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_pickupallow'));
                
                arrLC[stItemId] = objCostCategory;				
            }
        }
        
        //create/update landed cost details
        for(var line = 1; line <= recItemReceipt.getLineItemCount('item'); line++)
        {
            var stIsReceived = recItemReceipt.getLineItemValue('item','itemreceive',line);
            if(stIsReceived != 'T') continue; //skip if not received
            
            var stTrackLandedCost = recItemReceipt.getLineItemValue('item','tracklandedcost',line);            
            if(stTrackLandedCost != 'T') continue; //skip if no landed cost
                        
            var stItemId = recItemReceipt.getLineItemValue('item','item',line);
            
            nlapiLogExecution('DEBUG',stLoggerTitle, '['+line+'] Processing stItemId = ' + stItemId);          
            
            var objCostCategory = arrLC[stItemId];
            
            if(NSUtil.isEmpty(objCostCategory)) continue;
            
            nlapiLogExecution('DEBUG',stLoggerTitle, '['+line+'] Add Landed Cost');
                 
            try
            {
                recItemReceipt.selectLineItem('item', line);
                recItemReceipt.removeCurrentLineItemSubrecord('item','landedcost');
                
                var subrecLandedCost = recItemReceipt.createCurrentLineItemSubrecord('item','landedcost');
                
                if(subrecLandedCost)
                {
                    for(var fld in objCostCategory)
                    {
                        if(fld != 'custitem_ifd_landedcost_pickupallow')
                        {
                            var flValue = objCostCategory[fld];
                            
                            if(flValue > 0)
                            {
                                subrecLandedCost.selectNewLineItem('landedcostdata');
                                subrecLandedCost.setCurrentLineItemValue('landedcostdata', 'costcategory', COSTCATEGORY_MAPPING[fld]);
                                subrecLandedCost.setCurrentLineItemValue('landedcostdata', 'amount', flValue);
                                subrecLandedCost.commitLineItem('landedcostdata');
                            }
                        }
                    }
                    subrecLandedCost.commit();
                    recItemReceipt.commitLineItem('item');
                }
            }
            catch (error) 
            {
                var stError = (error.getDetails != undefined) ? error.getCode() + ': ' + error.getDetails() : error.toString();
                nlapiLogExecution('ERROR', stLoggerTitle, stError);            
            }
            
        }
                
        nlapiLogExecution('DEBUG', stLoggerTitle, '-------------- End --------------');
    }
    catch (error)
    {        
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error',error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error',error.toString());
            throw nlapiCreateError('99999', error.toString(),true);
        }
    }
}

function afterSubmit_applyLandedCosts(type)
{
    var stLoggerTitle = 'afterSubmit_applyLandedCosts';

    try
    {
        if (type != 'create' && type != 'edit')
        {
            return; 
        }
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '-------------- Start --------------');
        
        var stItemReceiptId = nlapiGetRecordId();
        nlapiLogExecution('DEBUG',stLoggerTitle, 'Processing stItemReceiptId = ' + stItemReceiptId);          
        
        var recItemReceipt = nlapiGetNewRecord();
        
        //get Items and their Frozen Landed Cost
        var arrCurrentFLC = [];
        var arrItems = [];
        for(var line = 1; line <= recItemReceipt.getLineItemCount('item'); line++)
        {
            var stIsReceived = recItemReceipt.getLineItemValue('item','itemreceive',line);
            if(stIsReceived != 'T') continue; //skip if not received
            
            var stTrackLandedCost = recItemReceipt.getLineItemValue('item','tracklandedcost',line);            
            if(stTrackLandedCost != 'T') continue; //skip if no landed cost
            
            var stItemId = recItemReceipt.getLineItemValue('item','item',line);
                        
            if(!NSUtil.inArray(stItemId,arrItems))
            {
                arrItems.push(stItemId);
            }
            
            //We want to get the last Purchase Price of Item in case of multiple lines so dont check if inArray here
            var flLastPurchasePrice = NSUtil.forceFloat(recItemReceipt.getLineItemValue('item','rate',line));
                
            var subrecLandedCost = recItemReceipt.viewLineItemSubrecord('item','landedcost',line);
            
            var flSumOfLandedCost = (subrecLandedCost) ? NSUtil.forceFloat(subrecLandedCost.getFieldValue('total')) : 0;
            
            nlapiLogExecution('DEBUG',stLoggerTitle, '['+line+'] flLastPurchasePrice = ' + flLastPurchasePrice 
                                                    + ', flSumOfLandedCost(WO PickupAllowance) = ' + flSumOfLandedCost
                                                    + ',stItemId = ' + stItemId);   
                            
            //Calculate Frozen Landed Cost (without PickupAllowance)
            arrCurrentFLC[stItemId] = flLastPurchasePrice + flSumOfLandedCost;
        }
        
        if(arrItems.length == 0)
        {
            nlapiLogExecution('DEBUG',stLoggerTitle, 'Exit. No Items with Track Landed Cost'); 
            return;
        }        
        
        var arrOrigFLC = [];
        
        //search Item record to check original values of the Frozen Landed Costs fields
        var filters = [new nlobjSearchFilter('internalid', null, 'anyof', arrItems)];
        
        var columns = [new nlobjSearchColumn('internalid')
                     , new nlobjSearchColumn('custitem_frozen_landed_cost')
                     , new nlobjSearchColumn('custitem_flc_weekly')
                     , new nlobjSearchColumn('custitem_flc_monthly')
                     , new nlobjSearchColumn('custitem_ifd_landedcost_pickupallow')]
                                 
        var results = nlapiSearchRecord('item', null, filters, columns);
        if(!NSUtil.isEmpty(results))
        {
            for(var i = 0; i < results.length; i++)
            {
                var stItemId = results[i].getId();
                
                var objFLC = {};
                objFLC.stFrozenLCCurrent = results[i].getValue('custitem_frozen_landed_cost');
                objFLC.stFrozenLCWeekly = results[i].getValue('custitem_flc_weekly');
                objFLC.stFrozenLCMonthly = results[i].getValue('custitem_flc_monthly');
                objFLC.flFrozenLCCurrent = NSUtil.forceFloat(objFLC.stFrozenLCCurrent);
                objFLC.flFrozenLCWeekly = NSUtil.forceFloat(objFLC.stFrozenLCWeekly);
                objFLC.flFrozenLCMonthly = NSUtil.forceFloat(objFLC.stFrozenLCMonthly);
                
                objFLC.flPickupAmount = NSUtil.forceFloat(results[i].getValue('custitem_ifd_landedcost_pickupallow'));
                objFLC.stItemType = results[i].getRecordType();
                 
                arrOrigFLC[stItemId] = objFLC;
                
            }
        }
        
        var stTranDate = recItemReceipt.getFieldValue('trandate');
        var dtTranDate = nlapiStringToDate(stTranDate);
                
        var dtLastBusinessDay = getLastBusinessDayOfMonth(dtTranDate);
        var stLastBusinessDay = nlapiDateToString(dtLastBusinessDay);
        
        var bIsLastDayOfWeek = (dtTranDate.getDay() == 5) ? true : false;
        var bIsLastDayOfMonth = (stTranDate == stLastBusinessDay) ? true : false;
        
        nlapiLogExecution('DEBUG',stLoggerTitle, 'stTranDate = ' + stTranDate
                                               + ', bIsLastDayOfWeek = ' + bIsLastDayOfWeek
                                               + ', bIsLastDayOfMonth = ' + bIsLastDayOfMonth
                                               + ', stLastBusinessDay = ' + stLastBusinessDay);
        

        //only update field if it is different from  old value
        for(var stItemId in arrOrigFLC)
        {
            var objFLC = arrOrigFLC[stItemId];
            
            //Calculate Frozen Landed Cost (with Pickup Allowance)
            var flCurrentFLC = arrCurrentFLC[stItemId] + objFLC.flPickupAmount;
            
            var arrFieldsToUpdate = [];
            var arrValues = [];
            if(NSUtil.isEmpty(objFLC.stFrozenLCCurrent) || objFLC.flFrozenLCCurrent != flCurrentFLC)
            {
                arrFieldsToUpdate.push('custitem_frozen_landed_cost');
                arrValues.push(flCurrentFLC);
            }
            if(bIsLastDayOfWeek)
            {
                if(NSUtil.isEmpty(objFLC.stFrozenLCWeekly) || objFLC.flFrozenLCWeekly != flCurrentFLC)
                {
                    arrFieldsToUpdate.push('custitem_flc_weekly');
                    arrValues.push(flCurrentFLC);
                }
            }
            else
            {
                if(NSUtil.isEmpty(objFLC.stFrozenLCWeekly))
                {
                    arrFieldsToUpdate.push('custitem_flc_weekly');
                    arrValues.push(flCurrentFLC);
                }
            }
            if(bIsLastDayOfMonth)
            {
                if(NSUtil.isEmpty(objFLC.stFrozenLCMonthly) || objFLC.flFrozenLCMonthly != flCurrentFLC)
                {
                    arrFieldsToUpdate.push('custitem_flc_monthly');
                    arrValues.push(flCurrentFLC);
                }
            }
            else
            {
                if(NSUtil.isEmpty(objFLC.stFrozenLCMonthly))
                {
                    arrFieldsToUpdate.push('custitem_flc_monthly');
                    arrValues.push(flCurrentFLC);
                }
            }
            
            nlapiLogExecution('DEBUG',stLoggerTitle, 'arrFieldsToUpdate.length = ' + arrFieldsToUpdate.length);
            
            if(arrFieldsToUpdate.length > 0)
            {
                nlapiSubmitField(objFLC.stItemType,stItemId,arrFieldsToUpdate,arrValues);
                nlapiLogExecution('DEBUG',stLoggerTitle, 'Updated Item Id = ' + stItemId + ', arrFieldsToUpdate = ' +arrFieldsToUpdate + ', arrValues = ' +arrValues);
            }
        }
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '-------------- End --------------');
    }
    catch (error)
    {        
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error',error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error',error.toString());
            throw nlapiCreateError('99999', error.toString(),true);
        }
    }
}

function getLastBusinessDayOfMonth(date) 
{
    var offset = 0;
    var dtLastBusinessDay = null;
    
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    
    if (12 === month) 
    {
        month = 0;
        year++;
    }
    
    do 
    {
        dtLastBusinessDay = new Date(year, month, offset);
        
        offset--;
    } 
    while (0 === dtLastBusinessDay.getDay() || 6 === dtLastBusinessDay.getDay());

    return dtLastBusinessDay;
}


var NSUtil =
    {        
        isEmpty : function(stValue)
        {
            if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
                    || (stValue == null) || (stValue == undefined))
            {
                return true;
            }
            else
            {
                if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
                {
                    if (stValue.length == 0)
                    {
                        return true;
                    }
                }
                else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
                {
                    for ( var stKey in stValue)
                    {
                        return false;
                    }
                    return true;
                }

                return false;
            }
        },
                
        inArray : function(stValue, arrValue)
        {
            var bIsValueFound = false;

            for (var i = 0; i < arrValue.length; i++)
            {
                if (stValue == arrValue[i])
                {
                    bIsValueFound = true;
                    break;
                }
            }

            return bIsValueFound;
        },       
        
        forceFloat : function(stValue)
        {
            var flValue = parseFloat(stValue);

            if (isNaN(flValue) || (stValue == Infinity))
            {
                return 0.00;
            }

            return flValue;
        }       
        
    };


