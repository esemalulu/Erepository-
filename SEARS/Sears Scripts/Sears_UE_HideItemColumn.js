/**
 *   Copyright (c) 1998-2014 NetSuite, Inc.
*    2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
*    All Rights Reserved.
* 
 *   This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
*    You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
*    you entered into with NetSuite.
 *
 *
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       5/28/2016      mjpascual
 *
 */

function beforeLoad_hideItemColumn(type, form, request)
{
	
	var stLogTitle = 'beforeLoad_hideItemColumn';
	try 
	{
		nlapiLogExecution('DEBUG', stLogTitle, 'Start -->');
		  
	   if(type == 'delete')
	   {
		   return;
	   }
	   
	   var stContext = nlapiGetContext().getExecutionContext();
	   nlapiLogExecution('DEBUG', stLogTitle, 'stContext = '+stContext);
	   
	   if(stContext != 'userinterface')
	   {
		   return;
	   }
	   
	   //Hide column on the  item  sublist
	   var objItemSublist = form.getSubList('item');    
	   var objField = objItemSublist.getField('item');    
	   objField.setDisplayType('disabled');
	   
	   nlapiLogExecution('DEBUG', stLogTitle, '<-- End');
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
			throw nlapiCreateError('99999', error.toString(), true);
		}
	}   
}
