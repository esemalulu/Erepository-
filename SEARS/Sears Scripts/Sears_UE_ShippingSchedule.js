/**
 * Module Description
 *
 * Version 		Date		Author 				Remarks
 * 1.00 		21 Jul 2016	bfeliciano
 * 1.01 		15 Feb 2017	Rajiv@mca140.com 	Prevent the Shipping Schedule pop-up for non bigitems. Reference: /*R*./ marked lines
 *
 */

var CONTEXT = nlapiGetContext();

/**
 * BTN: Schedule Shipping
 *
 * 		(CREATE)
 * 			_salesorder_
 * 			o  check for any big-item ticket lines
 *
 * 			_returnauth_
 * 			o  hidden
 *
 * 		(VIEW)
 * 			_salesorder_
 * 			o   check for any big-item ticket lines
 * 			o 	check for any shipping info: _empty_, CANCELLED, FAILED, PENDING_CANCEL
 *
 * 			_returnauth_
 * 			o	check for any big-item ticket items (lookup)
 * 			o 	check for any shipping info: _empty_, CANCELLED, FAILED, PENDING_CANCEL
 *
 * 		(EDIT)
 * 			_salesorder_
 * 			o 	check for any shipping info: _empty_, CANCELLED, FAILED, PENDING_CANCEL
 * 			o	cancel shipping if: new big item; removed big item;
 *
 *
 * BTN: Cancel Shipping
 *
 * 		(CREATE)
 * 			_salesorder_ / _returnauth_
 * 			o  hide
 *
 * 		(VIEW)
 * 			_salesorder_
 * 			o 	check for any shipping info: BOOKED, RESERVED
 *
 * 			_returnauth_
 * 			o 	check for any shipping info: BOOKED, RESERVED
 *
 * 		(EDIT)
 * 			_salesorder_ / _returnauth_
 * 			o  hide
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function beforeLoad_SetShipSchedButton(type, form, request)
{
	var logTitle = 'beforeLoad_SetShipSchedButton';
	try
	{
		//custbody_sears_booking_info
		//custcol_bigticket

		var recordType = nlapiGetRecordType();
		var execType = CONTEXT.getExecutionContext();

		if (execType != 'userinterface')
		{
			return;
		}

		if (! Helper.inArray(type, ['create','copy','view','edit']))
		{
			return;
		}
		nlapiLogExecution('DEBUG', logTitle, '*** START *** ' + JSON.stringify([type, execType]) );
		form.setScript( CONTEXT.getScriptId() );

		var bookingId = nlapiGetFieldValue('custbody_sears_booking_info');


		var bookingStatus = false;
		if (bookingId)
		{
			bookingStatus = nlapiLookupField('customrecord_sears_bigitem_shipping', bookingId, 'custrecord_sears_bigitemship_status');
		}

		if (type == 'create' || type == 'copy')
		{
//			if (recordType == 'salesorder')
//			{
				nlapiSetFieldValue('custbody_shipping_schedule', '');
				nlapiSetFieldValue('custbody_sears_booking_status', '');
				nlapiSetFieldValue('custbody_sears_booking_info', '');

				bookingId = false;

				createButton_scheduleShipping(form, type, bookingId);
//			}

		}
		else if (type == 'view')
		{
			if (hasBigTicketItem() && (!bookingStatus || Helper.inArray(bookingStatus, ['CANCELLED','PENDING-CANCEL','FAILED'])))
			{
				createButton_scheduleShipping(form, type, bookingId);
			}

			if (hasBigTicketItem() && Helper.inArray(bookingStatus, ['BOOKED','RESERVED']) )
			{
				createButton_cancelShipping(form, type, bookingId);
			}
		}
		else if (type == 'edit')
		{
			//hide them all?
			if (hasBigTicketItem() && (!bookingStatus || Helper.inArray(bookingStatus, ['CANCELLED','PENDING-CANCEL','FAILED'])))
			{
				createButton_scheduleShipping(form, type, bookingId);
			}

			if (hasBigTicketItem() && Helper.inArray(bookingStatus, ['BOOKED','RESERVED']) )
			{
				createButton_cancelShipping(form, type, bookingId);
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

function afterSubmit_bookOrder(type)
{
	var logTitle = 'beforeLoad_SetShipSchedButton';
	try
	{
		var execType = CONTEXT.getExecutionContext();

		if (execType != 'userinterface')
		{
			return;
		}
		nlapiLogExecution('DEBUG', logTitle, '*** START *** ' + JSON.stringify([type, execType]) );


		if ( Helper.inArray(type, ['create','copy','edit','approve']) )
		{
			var recNew = nlapiGetNewRecord();
			var bookingId = recNew.getFieldValue('custbody_sears_booking_info');
			var statusRef = recNew.getFieldValue('orderstatus');
			nlapiLogExecution('DEBUG', logTitle, 'bookingId/statusRef' + [bookingId, statusRef]);
			
			/*
			if (type != 'approve' && statusRef == 'A')
			{
			}
			if (statusRef == 'A' && type != 'approve') // PENDING APPROVAL
			{
				nlapiLogExecution('DEBUG', logTitle, '** SKIP BOOKING, ORder is not yet approved.');
				return;
			}
			*/
			

			if (bookingId)
			{
				var bookObj = nlapiLoadRecord('customrecord_sears_bigitem_shipping', bookingId);
				var orderId = bookObj.getFieldValue('custrecord_sears_bigitemship_orderid');
				var bookStatus = bookObj.getFieldValue('custrecord_sears_bigitemship_status');
				
				if (! orderId)
				{
					bookObj.setFieldValue('custrecord_sears_bigitemship_orderid', recNew.getId() );
					nlapiSubmitRecord(bookObj);
				}
				
				if (bookStatus == 'RESERVED')
				{
					var params = {};
					params.recid =  recNew.getId();
					params.rectype= recNew.getRecordType();
					params.action = 'sendorder';
					params.bookid = bookingId;

					nlapiSetRedirectURL('SUITELET', 'customscript_sears_ss_shipsched', 'customdeploy_sears_ss_shipsched', null, params);
				}


			}

			return true;
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

//////////////////////////////////
function hasBigTicketItem()
{
	var recordType = _RECORD.getRecordType();//nlapiGetRecordType();
	var returnVal = false;

	if (recordType == 'salesorder')
	{
		var lineCount = _RECORD.getLineItemCount('item'); //nlapiGetLineItemCount('item');
		for (var line=1; line <= lineCount; line++)
		{
			var lineBigTicket = _RECORD.getLineItemValue('item', 'custcol_bigticket', line);
			var lineApigeeSent = _RECORD.getLineItemValue('item', 'custcol_sent_to_apigee', line);

			if (lineBigTicket == 'T' && lineApigeeSent != 'T')
			{
				returnVal = true;
				break;
			}
		}
	}
	else if (recordType == 'returnauthorization')
	{
//		returnVal = !! nlapiGetFieldValue('custbody_sears_booking_info');
		// UPDATE CMARGALLO 10/20 START
		// var lineCount = _RECORD.nlapiGetLineItemCount('item');
		var lineCount = _RECORD.getLineItemCount('item');
		// UPDATE CMARGALLO 10/20 START
		for (var line=1; line <= lineCount; line++)
		{
			var lineItem = _RECORD.getLineItemValue('item', 'item', line);
			var lineBigTicket = nlapiLookupField('item', lineItem, 'custitem_bigticket');
			if (lineBigTicket == 'T')
			{
				returnVal = true;
				break;
			}
		}

		return true;
	}

	return returnVal;
}

function hasBigTicketItemWithLocations()
{
	var recordType = _RECORD.getRecordType();//nlapiGetRecordType();
	var returnVal = false;

//	var errorMessage = '';

	var hasMissingLocations = true;
	var hasBigTicketItems = false;

	if (recordType == 'salesorder')
	{
		var lineCount = _RECORD.getLineItemCount('item');
		for (var line=1; line <= lineCount; line++)
		{
			var lineData = {};
				lineData.bigTicket = _RECORD.getLineItemValue('item', 'custcol_bigticket', line);
				lineData.WMSSent = _RECORD.getLineItemValue('item', 'custcol_sent_to_apigee', line);
				lineData.location = _RECORD.getLineItemValue('item', 'location', line);
				lineData.autoAssigned = _RECORD.getLineItemValue('item', 'locationautoassigned', line);
				lineData.notAutoAssigned = _RECORD.getLineItemValue('item', 'noautoassignlocation', line);

			if (lineData.bigTicket == 'T' && lineData.WMSSent != 'T')
			{
				hasBigTicketItems = true;
				// UPDATE CMARGALLO 10/19 START
				// if (!lineData.location && (lineData.location && !lineData.autoAssigned))
//				if ((lineData.location && lineData.autoAssigned == 'F') || (lineData.location && lineData.notAutoAssigned == 'F'))
				if ((lineData.autoAssigned == 'F' && lineData.notAutoAssigned== 'F' ) || !lineData.location)
				// UPDATE CMARGALLO 10/19 END
				{
					 hasMissingLocations = false;
  	 				 break;
				}
			}
		}
		returnVal = hasBigTicketItems && hasMissingLocations;
	}
	else if (recordType == 'returnauthorization')
	{
//		returnVal = !! nlapiGetFieldValue('custbody_sears_booking_info');
		var lineCount = _RECORD.getLineItemCount('item');
		for (var line=1; line <= lineCount; line++)
		{
			var lineItem = _RECORD.getLineItemValue('item', 'item', line);
			var lineBigTicket = nlapiLookupField('item', lineItem, 'custitem_bigticket');
			if (lineBigTicket == 'T')
			{
				returnVal = true;
				break;
			}
		}

/*R*/	return false; //old value TRUE
	}

	return returnVal;
}

function getBigTicketItemVolume()
{
	var returnVal = 0;

	var lineCount = _RECORD.getLineItemCount('item');
	for (var line=1; line <= lineCount; line++)
	{
//		var lineBigTicket = nlapiGetLineItemValue('item', 'custcol_bigticket', line);
		var lineItem = _RECORD.getLineItemValue('item', 'item', line);
		var lineBigTicket = nlapiLookupField('item', lineItem, 'custitem_bigticket');
		var lineApigeeSent = _RECORD.getLineItemValue('item', 'custcol_sent_to_apigee', line);


		if (lineBigTicket == 'T' && lineApigeeSent != 'T')
		{
			var lineQty = parseFloat( _RECORD.getLineItemValue('item', 'quantity', line) || '0' );
			returnVal+= lineQty;
		}
	}

	return returnVal;
}

/**
 * @param {String} type
 * @param {nlobjForm} form
 */
function createButton_scheduleShipping(form, type, bookid)
{
	var stURL = nlapiResolveURL('SUITELET', 'customscript_sears_ss_shipsched', 'customdeploy_sears_ss_shipsched');

	stURL+='&recid=' + nlapiGetRecordId();
	stURL+='&rectype=' + nlapiGetRecordType();
	stURL+='&exectype=' + type;
	stURL+='&action=schedule';
	if (bookid)
	{
		stURL+='&bookid=' + bookid;
	}

	// UPDATE CMARGALLO 10/24 START
	// Get record type
	var stRecType = _RECORD.getRecordType();
	// var btnName = nlapiGetRecordType() == 'salesorder' ? 'Schedule Shipping' : 'Schedule Pickup';
	var btnName = stRecType == 'salesorder' ? 'Schedule Shipping' : 'Schedule Pickup';
	// return form.addButton('custpagebtn_schedshipping', btnName, '(function(){return buttonClick_Shipping(\''+stURL+'\', \''+ type +'\');})();');
	var objSchedButton = form.addButton('custpagebtn_schedshipping', btnName, '(function(){return buttonClick_Shipping(\''+stURL+'\', \''+ type +'\');})();');
	// Check if return authorization
	if (stRecType == 'returnauthorization') {
		// Check if there is no big ticket
		if (!hasBigTicketItem()) {
			// Disabled the schedule button
			objSchedButton.setDisabled(true);
		}
/*R*/}else if (stRecType == 'salesorder') {
		// Check if there is no big ticket
		if (!hasBigTicketItem()) {
			// Disabled the schedule button
			objSchedButton.setDisabled(true);
		}
/*R*/}

	return objSchedButton;
	// UPDATE CMARGALLO 10/24 END
}

/**
 * @param {String} type
 * @param {nlobjForm} form
 */
function createButton_cancelShipping(form, type, bookid)
{
	var stURL = nlapiResolveURL('SUITELET', 'customscript_sears_ss_shipsched', 'customdeploy_sears_ss_shipsched');

	stURL+='&recid=' + nlapiGetRecordId();
	stURL+='&rectype=' + nlapiGetRecordType();
	stURL+='&exectype=' + type;
	stURL+='&action=cancel';
	if (bookid)
	{
		stURL+='&bookid=' + bookid;
	}

	var btnName = nlapiGetRecordType() == 'salesorder' ? 'Cancel Shipping' : 'Cancel Pickup';

	return form.addButton('custpagebtn_schedshipping', btnName, '(function(){return buttonClick_Cancel(\''+stURL+'\', \''+ type +'\');})();');
}

function buttonClick_Shipping(stURL, type)
{
	if( type == 'create' || type == 'copy' || type == 'edit')
	{
		var stEntity = nlapiGetFieldValue('entity');
		if (Helper.isEmpty(stEntity)) 
		{
			alert('Please select customer.');
			return false;
		}
		if (!hasBigTicketItemWithLocations())
		{
			alert('There are no Big Ticket item on any of the lines, or Locations has not been properly set yet.');
			return false;
		}
		if ( Helper.isEmpty(nlapiGetFieldValue('shipzip')) || Helper.isEmpty(nlapiGetFieldValue('shipstate'))) {
			alert('Please fill-up postal code and state.');
			return false;
		}
		stURL = stURL + '&volume=' + getBigTicketItemVolume();
		stURL = stURL + '&entity=' + stEntity;
	// UPDATE CMARGALLO 12/3 START	
		stURL = stURL + '&postalcode=' + nlapiGetFieldValue('shipzip');
		var width = 500, height = 500;
		var left = (window.screen.width / 2) - ((width / 2) + 10);
	    var top = (window.screen.height / 2) - ((height / 2) + 50);
	    var wname = "shipschedule";
	
	
		window.open(stURL,wname,
		    "status=no,height=" + height + ",width=" + width + ",resizable=yes,left="
		    + left + ",top=" + top + ",screenX=" + left + ",screenY="
		    + top + ",toolbar=no,menubar=no,scrollbars=no,location=no,directories=no");
		
	} else {
		alert('You cannot set shipping schedule in view mode.');
	}
//	stURL = stURL + '&postalcode=' + nlapiGetFieldValue('shipzip');
//
//	var width = 500, height = 500;
//	var left = (window.screen.width / 2) - ((width / 2) + 10);
//    var top = (window.screen.height / 2) - ((height / 2) + 50);
//    var wname = "shipschedule";
//
//
//	window.open(stURL,wname,
//	    "status=no,height=" + height + ",width=" + width + ",resizable=yes,left="
//	    + left + ",top=" + top + ",screenX=" + left + ",screenY="
//	    + top + ",toolbar=no,menubar=no,scrollbars=no,location=no,directories=no");
	// UPDATE CMARGALLO 12/3 START
	return true;
}

function buttonClick_Cancel(stURL,type)
{
	var width = 500, height = 500;
	var left = (window.screen.width / 2) - ((width / 2) + 10);
    var top = (window.screen.height / 2) - ((height / 2) + 50);
    var wname = "shipschedule";

	window.open(stURL,wname,
	    "status=no,height=" + height + ",width=" + width + ",resizable=yes,left="
	    + left + ",top=" + top + ",screenX=" + left + ",screenY="
	    + top + ",toolbar=no,menubar=no,scrollbars=no,location=no,directories=no");
	return true;
}



///////////////////////////////////////////////
var Helper =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 *
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author bfelciano, mmeremilla
	 */
	isEmpty : function(stValue)
	{
    	return ((stValue === '' || stValue == null || stValue == undefined)
    			|| (stValue.constructor === Array && stValue.length == 0)
    			|| (stValue.constructor === Object && (function(v){for(var k in v)return false;return true;})(stValue)));
	},

	/**
	 * Evaluate if the given string is an element of the array
	 *
	 * @param {String} stValue - String value to find in the array
	 * @param {Array} arrValue - Array to be check for String value
	 * @returns {Boolean} - true if string is an element of the array, false if not
	 */
	inArray : function(stValue, arrValue)
	{
	    var bIsValueFound = false;
	    for (var i = arrValue.length; i >= 0; i--)
	    {
		    if (stValue == arrValue[i])
		    {
			    bIsValueFound = true;
			    break;
		    }
	    }
	    return bIsValueFound;
	}

};

var _RECORD = {current:null};
_RECORD.getRecordType = function (recordObj)
{
	try
	{
		return recordObj.getType();

	} catch (err){
		try {
			return nlapiGetRecordType();
		} catch (err2) {}
	}
}

_RECORD.getLineItemCount = function (sublistId, recordObj)
{
	try
	{
//		if (recordObj)
//		{
//			_RECORD.current = recordObj;
//		}
//
//		if (!_RECORD.current)
//		{
//			_RECORD.current = nlapiLoadRecord( nlapiGetRecordType(), nlapiGetRecordId() );
//		}
//
//		return _RECORD.current.getLineItemCount(sublistId);
		return recordObj.getLineItemCount(sublistId);
	} catch (err){
		try {
			// UPDATE CMARGALLO 10/19 START
			return nlapiGetLineItemCount(sublistId);
			// return nlapiGetRecordType();
			// UPDATE CMARGALLO 10/19 END			
		} catch (err2){}
	}
};

// UPDATE CMARGALLO 10/19 START
// _RECORD.getLineItemCount = function (sublistId, fieldId, lineno, recordObj)
_RECORD.getLineItemValue = function (sublistId, fieldId, lineno, recordObj)
// UPDATE CMARGALLO 10/19 END
{
	try
	{
//		if (recordObj)
//		{
//			_RECORD.current = recordObj;
//		}
//
//		if (!_RECORD.current)
//		{
//			_RECORD.current = nlapiLoadRecord( nlapiGetRecordType(), nlapiGetRecordId() );
//		}
//
//		return _RECORD.current.getLineItemValue(sublistId, fieldId, lineno);
		return recordObj.getLineItemValue(sublistId, fieldId, lineno);
	} catch (err){
		try {
			// UPDATE CMARGALLO 10/19 START
			// return nlapiGetLineItemValue('item', 'quantity', line);
			return nlapiGetLineItemValue(sublistId, fieldId, lineno);
			// UPDATE CMARGALLO 10/19 END
		} catch (err2){}
	}
};


// var lineQty = parseFloat( nlapiGetLineItemValue('item', 'quantity', line) || '0' );
// var lineQty = parseFloat( c|| '0' );//nlapiGetLineItemValue


// //	var recordType = nlapiGetRecordType();
// 	var returnVal = false;

// 	var errorMessage = '';

// 	var hasMissingLocations = true;
// 	var hasBigTicketItems = false;

// 	if (recordType == 'salesorder')
// 	{
// 		var lineCount = nlapiGetLineItemCount('item');
