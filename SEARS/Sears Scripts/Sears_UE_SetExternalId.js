/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 *//**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       14 May 2016     bfeliciano
 *
 */
var CONTEXT = nlapiGetContext();
var _CACHE = {};

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function afterSubmit_SetExternalId(type)
{
	try
	{
		var execType = CONTEXT.getExecutionContext();
		var logTitle = ['afterSubmit_SetExternalId', type, execType].join(':');

		if (! Helper.inArray(type, ['create','copy','edit']))
		{
			return true;
		}
		
        //Role checking
        var stRestrictedRole = CONTEXT.getSetting('SCRIPT', 'custscript_sears_rl_integration_role_2');
        var currentUserRole = CONTEXT.getRole();
        var currentUser  = CONTEXT.getUser();
        if ( stRestrictedRole == currentUser)
        {
            return;
        }
        nlapiLogExecution('AUDIT', logTitle, '** User Role / Restricted Role: ' + JSON.stringify([currentUser, currentUserRole, stRestrictedRole]) );
		

		var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var tranId = record.getFieldValue('tranid');
		var externalid = record.getFieldValue('externalid');
		var orderNum = record.getFieldValue('custbody_sears_sales_ordernum');

		nlapiLogExecution('DEBUG', logTitle, [tranId, externalid,orderNum].join(':') );
		
		var newExternalId = tranId;
		if (record.getRecordType() == 'salesorder')
		{
			newExternalId = ['C', record.getId()].join('');
		}


		if ( execType == 'userinterface')
		{
			if (Helper.isEmpty(externalid))
			{
				nlapiSubmitField( record.getRecordType(), record.getId(), ['externalid','custbody_sears_sales_ordernum'], [newExternalId, newExternalId]);
			}
		}
		else
		{
			if ( Helper.isEmpty(orderNum))
			{
				nlapiSubmitField( record.getRecordType(), record.getId(), ['custbody_sears_sales_ordernum'], [newExternalId]);
			}
		}

		return true;
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error: ' + logTitle, error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error: ' + logTitle, error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}
