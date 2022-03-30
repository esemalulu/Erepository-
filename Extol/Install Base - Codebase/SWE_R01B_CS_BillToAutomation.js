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

{
    var ENABLE_DEBUG = false;
    var MSG_TITLE = 'Bill To Fields Automation';
}

/** 
 * Print's a log message
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function debugMsg(msg)
{
    if (ENABLE_DEBUG)
    {
        alert(MSG_TITLE + "\n" + msg);
    }
}

/**
 * This script automates the population of the Bill to Tier field and Bill to Customer field
 * based on the users selection.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function fieldChanged_BillToAutomation(stListName, stFldName, iLineIdx)
{
    var BILL_TO_TIER_END_USER = '1';
    var BILL_TO_TIER_RESELLER = '2';
    var BILL_TO_TIER_DISTRIBUTOR = '3';

    /* Retrieve fields necessary for both processing. */
    if (stFldName == 'custbody_distributor'
            || stFldName == 'custbody_reseller'
            || stFldName == 'custbody_end_user'
            || stFldName == 'custbody_bill_to_tier'
            )
    {
        var stDistributor = nlapiGetFieldValue('custbody_distributor');
        var stReseller = nlapiGetFieldValue('custbody_reseller');
        var stEndUser = nlapiGetFieldValue('custbody_end_user');
        var stBillToTier = nlapiGetFieldValue('custbody_bill_to_tier');
		
		/* Save end user value if Nexus tax is flagged.*/
		var sRecId = nlapiGetRecordId();
		if (stEndUser != null && stEndUser != undefined && stEndUser != ''
			&& stFldName == 'custbody_end_user'
			&& (sRecId == null || sRecId == undefined || sRecId == '')) 
		{
			createCookie('vsEndUser', stEndUser, 0);
		}
		
        debugMsg('Bill to Tier =' + stBillToTier);
        debugMsg('Distributor =' + stDistributor);
        debugMsg('Reseller =' + stReseller);
        debugMsg('End User =' + stEndUser);
    }


    /* Processing for Bill To Tier field */
    if (stFldName == 'custbody_distributor'
            || stFldName == 'custbody_reseller'
            || stFldName == 'custbody_end_user')
    {
        if (stDistributor != null && stDistributor != undefined && stDistributor != '')
        {
            debugMsg('Set Distributor');
            nlapiSetFieldValue('custbody_bill_to_tier', BILL_TO_TIER_DISTRIBUTOR, true);
        }
        else
        {
            if (stReseller != null && stReseller != undefined && stReseller != '')
            {
                debugMsg('Set Reseller');
                nlapiSetFieldValue('custbody_bill_to_tier', BILL_TO_TIER_RESELLER, true);
            }
            else
            {
                if (stEndUser != null && stEndUser != undefined && stEndUser != '')
                {
                    debugMsg('Set End User');
                    nlapiSetFieldValue('custbody_bill_to_tier', BILL_TO_TIER_END_USER, true);
                }
                else
                {
                    debugMsg('Set to empty');
                    nlapiSetFieldValue('custbody_bill_to_tier', '', true);
                }
            }
        }
    }

    /* Processing for Bill To Customer field */
    if (stFldName == 'custbody_bill_to_tier')
    {
        var stBillToTier = nlapiGetFieldValue('custbody_bill_to_tier');
        var stEntity = nlapiGetFieldValue('entity');
        if (stBillToTier != null && stBillToTier != undefined && stBillToTier != '')
        {
            switch (stBillToTier)
                    {
                case BILL_TO_TIER_END_USER:
                    if(stEntity != stEndUser || (stEntity == '' || stEntity == null || stEntity == undefined)){
                        debugMsg('Set End User');
                        nlapiSetFieldValue('entity', stEndUser, true);
                    }
                    break;
                case BILL_TO_TIER_DISTRIBUTOR:
                    if (stDistributor != stEndUser || (stEntity == '' || stEntity == null || stEntity == undefined)) {
                        debugMsg('Set Distributor');
                        nlapiSetFieldValue('entity', stDistributor, true);
                    }
                    break;
                case BILL_TO_TIER_RESELLER:
                    if (stReseller != stEndUser || (stEntity == '' || stEntity == null || stEntity == undefined)) {
                        debugMsg('Set Reseller');
                        nlapiSetFieldValue('entity', stReseller, true);
                    }
                    break;
            }
        }
        else
        {
            nlapiSetFieldValue('entity', '', true);
        }

    }
}


/**
 * This script disables the entity field
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function pageInit_DisableEntity(stEventType)
{
    nlapiDisableField('entity', true);

	if (stEventType == "create"){

	    var stBillTo = nlapiGetFieldValue('entity');
	
	    if(stBillTo != null && stBillTo != undefined && stBillTo != ''){
	        var stCustChannelTier = nlapiLookupField('entity',stBillTo,'custentity_customer_channel_tier')
	        switch (stCustChannelTier)
	                {
	            case BILL_TO_TIER_END_USER:
	                nlapiSetFieldValue('custbody_end_user', stBillTo);
	                break;
	            case BILL_TO_TIER_RESELLER:
	                nlapiSetFieldValue('custbody_reseller', stBillTo);
	                break;
	            case BILL_TO_TIER_DISTRIBUTOR:
	                nlapiSetFieldValue('custbody_distributor', stBillTo);
	                break;
	        }
			
			/* Added to load value of end user that was selected in a different form.*/
			var stEndUser = readCookie('vsEndUser');
			if (stEndUser != null && stEndUser != undefined && stEndUser != '') {				
				nlapiSetFieldValue('custbody_end_user', stEndUser, false);
			}			
	    }
		eraseCookie('vsEndUser');
	}
}


/**
 * This script makes sure that there is either a Distributor, Reseller, or End User provided.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function saveRecord_CheckBillToFields()
{
    var stDistributor = nlapiGetFieldValue('custbody_distributor');
    var stReseller = nlapiGetFieldValue('custbody_reseller');
    var stEndUser = nlapiGetFieldValue('custbody_end_user');
    debugMsg('Distributor =' + stDistributor);
    debugMsg('Reseller =' + stReseller);
    debugMsg('End User =' + stEndUser);
    /* Check if at least 1 of the three fields are populated. */
    if ((stDistributor == null || stDistributor == undefined || stDistributor == '')
            && (stReseller == null || stReseller == undefined || stReseller == '')
            && (stEndUser == null || stEndUser == undefined || stEndUser == ''))
    {
        alert('Please make sure to select a Distributor, Reseller, or End User.');
        return false;
    }
    return true;
}


/**
 * These scripts handle creating, reading and deleting cookies.
 *
 * @author Victor Sayas
 * @version 1.0
 */
function createCookie(name, value, days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}
