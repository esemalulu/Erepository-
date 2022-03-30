/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */
/**
 * This script validates the Item Fields needed for renewals automation
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function saveRecord_ItemFieldValidation(){
    var logger = new Logger(true);
    var MSG_TITLE = 'saveRecord_ItemFieldValidation';
    //logger.enableDebug(); // pass false to turn debugging off.

    logger.debug(MSG_TITLE,'=====Start=====');

    // Retrieve parameters
    var ITEM_CATS_FOR_RENEWAL = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_r10_item_cat_for_renewal'));
    var CATS_FOR_REVREC = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_item_fld_val_item_cat_revrec'));

    logger.debug(MSG_TITLE,'Script Parameters: '
            + '\n' + 'Item Category - Rev Rec Check: ' + CATS_FOR_REVREC
            + '\n' + 'Item Category - Renewal: ' + ITEM_CATS_FOR_RENEWAL
            );

    var stDefferedRevAcct = nlapiGetFieldValue('deferredrevenueaccount');
    var stRevRecSched = nlapiGetFieldValue('revrecschedule');
    var stItemCat = nlapiGetFieldValue('custitem_item_category');
    var stRenewWith = nlapiGetFieldValue('custitem_renew_with');
    var stReplacedWith = nlapiGetFieldValue('custitem_replaced_with');

    logger.debug(MSG_TITLE,'Deferred Revenue Account: ' + stDefferedRevAcct
            + '\n' + 'Rev Rec Schedule: ' + stRevRecSched
            + '\n' + 'Item Category: ' + stItemCat
            + '\n' + 'Renew With: ' + stRenewWith
            + '\n' + 'Replace With: ' + stReplacedWith
            );

    /* Perform check for Rev Rec Account and Template */
    if(searchInList(CATS_FOR_REVREC, stItemCat)){

        if(stDefferedRevAcct == null || stDefferedRevAcct == undefined || stDefferedRevAcct == ''){
            alert('Please make sure that a Deferred Revenue Account is selected.');
            return false;
        }

        if(stRevRecSched == null || stRevRecSched == undefined || stRevRecSched == ''){
            alert('Please make sure that a Revenue Recognition Template is selected.');
            return false;
        }

    }

    /* Perform check for Renew With & Replaced With */
    if(searchInList(ITEM_CATS_FOR_RENEWAL,stItemCat))
    {
        if((stRenewWith == null || stRenewWith == '') && (stReplacedWith == null || stReplacedWith == ''))
        {
            alert('Please select either a [renew with] before saving the item.');
            return false;
        }
    }

    return true;

    logger.debug(MSG_TITLE,'======End======');
}