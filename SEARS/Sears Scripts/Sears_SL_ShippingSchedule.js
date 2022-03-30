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
 */
var CONTEXT = nlapiGetContext();
var CACHE = {};

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       19 Jul 2016     bfeliciano
 * 1.10       22 Feb 2017     Manikandan A     Delivery date should not be past date.
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_scheduleDelivery(request, response)
{
    var logTitle = 'suitelet_scheduleDelivery';
    try
    {
        nlapiLogExecution('DEBUG', logTitle, '**** START **** ');

        var restletURL = CONTEXT.getSetting('SCRIPT', 'custscript_cleard_wrapper_restlet');
        nlapiLogExecution('DEBUG', logTitle, '**** URL **** ' + restletURL);
        if (!restletURL)
        {
            throw "Missing parameter!";
        }
        CACHE['restletURL'] = restletURL;

        var action = request.getParameter('action');

        if ( action == 'schedule')
        {
            return form_schedule(request, response);
        }
        else if (action == 'cancel')
        {
            return form_cancel(request, response);
        }
        else if (action == 'sendorder')
        {
            return form_sendorder(request,response);
        }
    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }

    return true;
}
/////////////////////////////////////////

function form_sendorder(request, response)
{
    var logTitle = "form_sendorder";
           nlapiLogExecution('DEBUG', logTitle, '**** START **** ');

    var form = nlapiCreateForm('Sending the Order', false);
    var orderId = request.getParameter('recid');
    var orderType = request.getParameter('rectype');

    var orderData = nlapiLookupField(orderType, orderId, ['custbody_ship_date','shipdate','custbody_shipping_schedule','custbody_sears_booking_info', 'custbody_delivery_date']);

    nlapiLogExecution('DEBUG', logTitle, '>> orderData: ' + JSON.stringify(orderData));

    var bookData = {};
    //bookData.shipDate = orderData.shipdate || orderData.custbody_ship_date;
    bookData.shipDate = orderData.custbody_delivery_date; //MJ
    bookData.timeSlot = orderData.custbody_shipping_schedule;
    bookData.recordId = orderId;
    bookData.recordType = orderType;
    bookData.bookId = orderData.custbody_sears_booking_info;

    nlapiLogExecution('DEBUG', logTitle, '>> bookData: ' + JSON.stringify(bookData));

    form.addField('custpage_htmlcmd', 'inlinehtml', '--')
        .setDefaultValue('<script type="text/javascript"> ' +
                            'var restletURL = "' + CACHE.restletURL + '";' +
                            'var headers = {}; headers[\'User-Agent-x\'] = \'Suitescript-Call\';headers[\'Content-Type\'] = \'application/json\'; ' +
                            'var postObj = {\'api\' : \'sendOrder\', param: ' + JSON.stringify(bookData) + '}; ' +
                             'var response = nlapiRequestURL(restletURL, JSON.stringify(postObj), headers, null, \'POST\');  ' +
                             'location.href=nlapiResolveURL(\'RECORD\',\''+orderType+'\', \'' + orderId + '\');' +
                            '</script>');
    response.writePage(form);

}


function form_schedule(request, response)
{
    var logTitle ='form_schedule';
    nlapiLogExecution('DEBUG', logTitle, '**** START **** ');

    if (request.getMethod() == 'POST')
    {

    nlapiLogExecution('DEBUG', logTitle, 'post action ');
      nlapiLogExecution('DEBUG', logTitle, request);
        var shipDate = request.getParameter('custpage_selectdate');
        var timeSlot = '7:00 AM - 6:00 PM'; //changed mca140 ('7:00 AM - 6:00 PM')
        //request.getParameter('custpage_selecttimeslot');

        shipDate = nlapiDateToString( nlapiStringToDate(shipDate));

        if ( Helper.isEmpty(shipDate) ||  Helper.isEmpty(timeSlot))
        {
            throw "Missing Ship Date and Time Slot";
            return false;
        }

        if(Helper.isPastDate(shipDate)) {
            throw "Deliverydate cannot be past.Please Select a future date.";
            return false;
        }

        var recordId = request.getParameter('recid');
        var recordType = request.getParameter('rectype');
        var execType = request.getParameter('exectype');

        // set the fields
        var lineNo = request.getParameter('lineno');

        var recordSS = nlapiCreateRecord('customrecord_sears_bigitem_shipping');
            recordSS.setFieldValue('custrecord_sears_bigitemship_status', 'RESERVED');
            recordSS.setFieldValue('custrecord_sears_bigitemship_received', nlapiDateToString(new Date(), 'datetimetz'));
            recordSS.setFieldValue('custrecord_sears_bigitemship_shipdate', shipDate);
            recordSS.setFieldValue('custrecord_sears_bigitemship_timeslot', timeSlot);
            recordSS.setFieldValue('custrecord_sears_bigitemship_ordertype', recordType);
      nlapiLogExecution('DEBUG', logTitle, recordSS);

        var recordObj = null;

        var newRecordCmd = [];

        if ( recordType && recordId && execType == 'view')
        {
            // just load the record
            recordObj = nlapiLoadRecord(recordType, recordId);

            recordObj.setFieldValue('custbody_shipping_schedule', timeSlot);
            recordObj.setFieldValue('shipdate', shipDate);
                            recordObj.setFieldValue('custbody_delivery_date', shipDate); //MJ
            recordObj.setFieldValue('custbody_ship_date', shipDate);

            var itemId = null;
            if (! Helper.isEmpty(lineNo))
            {
                recordObj.setLineItemValue('item', 'custcol_ship_time', lineNo, timeSlot);
                recordObj.setLineItemValue('item', 'custcol_ship_date', lineNo, shipDate);

                itemId = recordObj.getLineItemValue('item', 'item', lineNo);
            }

            recordSS.setFieldValue('custrecord_sears_bigitemship_orderid', recordId);
            if (itemId)
            {
                recordSS.setFieldValue('custrecord_sears_bigitemship_item', itemId);
                recordSS.setFieldValue('custrecord_sears_bigitemship_lineno', lineNo);
            }
        }
        else
        {
//          if (recordId){recordSS.setFieldValue('custrecord_sears_bigitemship_orderid', recordId);}

            newRecordCmd.push('window.opener.nlapiSetFieldValue(\'custbody_shipping_schedule\', \''+ timeSlot + '\');');
            newRecordCmd.push('window.opener.nlapiSetFieldValue(\'shipdate\', \'' + shipDate + '\');');
            newRecordCmd.push('window.opener.nlapiSetFieldValue(\'custbody_delivery_date\', \'' + shipDate + '\');');
            newRecordCmd.push('window.opener.nlapiSetFieldValue(\'custbody_ship_date\', \'' + shipDate + '\');');
        }

        var recSSId = nlapiSubmitRecord(recordSS);

        if ( recordType && recordId && execType == 'view')
        {
            recordObj.setFieldValue('custbody_sears_booking_info', recSSId);
            if (! Helper.isEmpty(lineNo))
            {
                recordObj.setLineItemValue('item', 'custcol_sears_booking_info', lineNo, recSSId);
            }
            var id = nlapiSubmitRecord(recordObj);

            response.writeLine('<script type="text/javascript">(function(){window.opener.location.reload(true);self.close();})()</script>');
        }
        else
        {
            newRecordCmd.push('window.opener.nlapiSetFieldValue(\'custbody_sears_booking_info\', \''+ recSSId + '\');');
            response.writeLine('<script type="text/javascript">(function(){'+ newRecordCmd.join(';') +'self.close();})()</script>');
        }
    }
    else
    {
        var actionName = request.getParameter('rectype') == 'salesorder' ? 'Schedule Shipping' : 'Schedule Pickup';
        var groupName = request.getParameter('rectype') == 'salesorder' ? 'Select Shipping Schedule' : 'Select Pickup Schedule';


        var form = nlapiCreateForm(actionName, true);
        form.setScript('customscript_sears_cs_shipsched');

        var fldGroupName  = 'schedshipping';
        var fldGroup  = form.addFieldGroup(fldGroupName, groupName);
        fldGroup.setSingleColumn(true);

        form.addField('custpage_date', 'date', 'Set Date', null, fldGroupName)
            .setDefaultValue( nlapiDateToString(new Date()) );
        form.addField('custpage_numdays', 'integer', 'Display # days available', null, fldGroupName)
            .setDefaultValue(90); //changed mca140 (7)
        form.addField('custpage_status', 'inlinehtml','Status', null, fldGroupName);

        form.addField('custpage_selectdate', 'select', 'Available Days', null, fldGroupName)
            .setMandatory(true);
        form.addField('custpage_selecttimeslot', 'select', 'Available Timeslot', null, fldGroupName)
            .setDisplayType('hidden')
            .setMandatory(true);

        form.addField('details_timeslot', 'text', 'lineid')
            .setDisplayType('hidden');

        form.addField('lineno', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('lineno') );
        form.addField('action', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('action') );
        form.addField('recid', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('recid') );
        form.addField('rectype', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('rectype') );
        form.addField('volume', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('volume') );
        form.addField('postalcode', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('postalcode') );
        form.addField('exectype', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('exectype') );
        form.addField('restleturl', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( CACHE.restletURL );


        //form.addButton('custpage_btnsearch','Submit', 'submitShipDate()');
        form.addSubmitButton('Submit');
        form.addButton('custpage_btnsearch','Search Available Dates', 'updateAvailableDates()');

        response.writePage(form);
    }

    return true;
}

function form_cancel(request, response)
{
    if (request.getMethod() == 'POST')
    {

        var bookId = request.getParameter('bookid');
        var recordId = request.getParameter('recid');
        var recordType = request.getParameter('rectype');
        var execType = request.getParameter('execType');

        var recordSS = nlapiCreateRecord('customrecord_sears_bigitem_shipping');
        recordSS.setFieldValue('custrecord_sears_bigitemship_status', 'PENDING-CANCEL');
        recordSS.setFieldValue('custrecord_sears_bigitemship_received', nlapiDateToString(new Date(), 'datetimetz'));
        recordSS.setFieldValue('custrecord_sears_bigitemship_orderid', recordId);
        recordSS.setFieldValue('custrecord_sears_bigitemship_ordertype', recordType);

        var recSSId = nlapiSubmitRecord(recordSS);
        nlapiSubmitField(recordType, recordId, ['custbody_sears_booking_info','custbody_shipping_schedule','shipdate','custbody_ship_date'], [recSSId, null, null, null]);


        if (execType == 'view')
        {
            response.writeLine('<script type="text/javascript">(function(){window.opener.location.reload(true);self.close();})()</script>');
        }
        else
        {
            response.writeLine('<script type="text/javascript">(function(){window.opener.location.reload(true);self.close();})()</script>');
//          response.writeLine('<script type="text/javascript">(function(){self.close();})()</script>');
        }

    }
    else
    {
        var actionName = request.getParameter('rectype') == 'salesorder' ? 'Cancel Booking' : 'Cancel Pickup';
        var groupName = request.getParameter('rectype') == 'salesorder' ? 'Cancel the Booking' : 'Cancel Pickup Schedule';


        var form = nlapiCreateForm(actionName, true);
        form.setScript('customscript_sears_cs_shipsched');

        var fldGroupName  = 'schedshipping';
        var fldGroup  = form.addFieldGroup(fldGroupName, groupName);
        fldGroup.setSingleColumn(true);


        var bookId = request.getParameter('bookid');
        var recordBooking = nlapiLoadRecord('customrecord_sears_bigitem_shipping', bookId);

        form.addField('custpage_inlinemessage', 'inlinehtml', null, null, fldGroupName)
            .setDefaultValue('Are you sure you want to cancel the booking? ');

        form.addField('custpage_selectdate', 'text', 'Ship Date', null, fldGroupName)
            .setDisplayType('inline')
            .setDefaultValue( recordBooking.getFieldValue('custrecord_sears_bigitemship_shipdate'))

        form.addField('custpage_selecttimeslot', 'text', 'Available Timeslot', null, fldGroupName)
            .setDisplayType('hidden')
            .setDefaultValue( recordBooking.getFieldValue('custrecord_sears_bigitemship_timeslot'));


        form.addField('lineno', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('lineno') );
        form.addField('action', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('action') );
        form.addField('recid', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('recid') );
        form.addField('rectype', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('rectype') );
        form.addField('bookid', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('bookid') );
        form.addField('volume', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('volume') );
        form.addField('postalcode', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('postalcode') );
        form.addField('exectype', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( request.getParameter('exectype') );
        form.addField('restleturl', 'text', 'lineid')
            .setDisplayType('hidden')
            .setDefaultValue( CACHE.restletURL );


        form.addSubmitButton('Cancel Booking');
        form.addButton('custpage_btnclose','Close', 'window.ischanged=false;self.close();');

        response.writePage(form);
    }

    return true;
}
function disablingPastDate() {
    console.log('disablingPastDate');
    NS.jQuery('#custpage_date_helper_calendar').mouseup(function(){
        console.log('mouseup');
        setTimeout(function() {
            disablePastDates();
        }, 500);  
        
    });
}

function disablePastDates() {
    var custom_calendar = document.getElementById('calendar');
    if(custom_calendar) {
        console.log('calendar found');
    }
    else {
        console.log('calendar not found');
    }
}

function pageInit_ScheduleDelivery()
{
    clearAvailableDates();
//  clearAvailableTimeslots();
    updateAvailableDates();
    disablingPastDate();

}
function fieldChanged_ScheduleDelivery(sublist, fieldname, line)
{

    var logTitle ='fieldChanged_ScheduleDelivery';
    nlapiLogExecution('DEBUG', logTitle, '**** START **** ');
    try
    {
        var flds = ['custpage_date', 'custpage_numdays', 'custpage_selectdate'];//, 'custpage_selecttimeslot'];
        if ( !Helper.inArray(fieldname, flds)){
            return true;
        }

        var baseDate = nlapiGetFieldValue('custpage_date');

         if(Helper.isPastDate(baseDate)) {
            alert("Date cannot be past.Please Select a future date.");
            return false;
        }

        var numDays  = nlapiGetFieldValue('custpage_numdays');
        var selectDate = nlapiGetFieldValue('custpage_selectdate');
//      var selectTimeslots = nlapiGetFieldValue('custpage_selecttimeslot');

        try {
            console.log('>> ', fieldname , '>> ', baseDate, numDays, selectDate, selectTimeslots);
        }catch (e){}

        if ( Helper.inArray(fieldname, ['custpage_date','custpage_numdays']))
        {
            clearAvailableDates();
//          clearAvailableTimeslots();
        }

//      if (fieldname == 'custpage_selectdate' && !Helper.isEmpty(selectDate) )
//      {
//          updateAvailableTimeslots();
//      }
        return true;

    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }

    return true;
}

var prevValue = {};


function updateAvailableDates ()
{
    console.log('updateAvailableDates');
    nlapiLogExecution('DEBUG','updateAvailableDates');
    var logTitle ='updateAvailableDates'; 
    nlapiLogExecution('DEBUG', logTitle, '**** START **** ');
    var baseDate = nlapiGetFieldValue('custpage_date');
    var numDays  = nlapiGetFieldValue('custpage_numdays');
    var restletURL = nlapiGetFieldValue('restleturl');
nlapiLogExecution('DEBUG', logTitle, 'url' + restletURL );
    try {
        console.log('>> ', 'updateAvailableDates' , '>> ', baseDate, numDays);
    }catch (e){}


    nlapiSetFieldValue('custpage_status', '..please wait...', false);

    if ( Helper.isEmpty(baseDate) || Helper.isEmpty(numDays))
    {
        return false;
    }

    if(Helper.isPastDate(baseDate)) {
        alert("Date cannot be past.Please Select a future date.");
        return false;
    }


    // clear the available Timeslots
    var headers = {};
    headers['User-Agent-x'] = 'Suitescript-Call';
    headers['Content-Type'] = 'application/json';

    var orderType = nlapiGetFieldValue('rectype');
    var orderId = nlapiGetFieldValue('recid');
    var execType = nlapiGetFieldValue('exectype');
    var volume = nlapiGetFieldValue('volume');
    var postalCode = nlapiGetFieldValue('postalcode');
    // Remove the space
    postalCode = (postalCode.replace(' ', '')).trim();

    var postObj =
    {
        "api" : "getAvailableDates",
        "param" :
        {
            startDate : baseDate.trim(),
            days : numDays.trim(),
            recordType : orderType.trim(),
            recordId : orderId.trim(),
            execType : execType.trim(),
            volume: volume.trim(),
            postalCode: postalCode,
            // ADDED CMARGALLO 10/08/2016 START
            bigticket : JSON.stringify(getBigTicketItem()),
            shipaddr1 : window.opener.nlapiGetFieldValue('shipaddr1'),
            shipaddr2 : window.opener.nlapiGetFieldValue('shipaddr2'),
            shipcity : window.opener.nlapiGetFieldValue('shipcity'),
            shipstate : window.opener.nlapiGetFieldValue('shipstate'),
            shipcountry : window.opener.nlapiGetFieldValue('shipcountry'),
            isShipToStore : window.opener.nlapiGetFieldValue('custbody_ship_to_store')
            // ADDED CMARGALLO 10/08/2016 START
        }
    };

    try {
        console.log('>> ', 'postObj ' , '>> ', JSON.stringify(postObj ));
        nlapiLogExecution('DEBUG', logTitle,JSON.stringify(postObj ));
    }catch (e){}

    clearAvailableDates();
//  clearAvailableTimeslots();
    nlapiInsertSelectOption('custpage_selectdate', '1', 'Please Wait...', true);
        
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
    nlapiLogExecution('debug','date', JSON.stringify(postObj));
    nlapiLogExecution('debug','url', restletURL);


    var response = nlapiRequestURL(restletURL, JSON.stringify(postObj), headers,(function(response) {
        console.log(response);
        if (response.code == '200')
        {
            nlapiRemoveSelectOption('custpage_selectdate', '1');
            var objValue = JSON.parse(response.body);
            nlapiLogExecution('debug','response', "API call completed");
            nlapiLogExecution('debug','response', JSON.stringify(objValue));
            if (objValue.data.length >=1)
            {
                nlapiInsertSelectOption('custpage_selectdate', '', 'Please Select a date', false);
                for (var i=0,j=objValue.data.length; i<j; i++)
                {
                    var dateStr = objValue.data[i];
                    var dtDate = nlapiStringToDate(dateStr);
                    var dateValue = MONTHS[dtDate.getMonth()] + ' ' + dtDate.getDate() + ', ' + dtDate.getFullYear();

                    if (!prevValue['updateAvailableDates']){prevValue['updateAvailableDates']=[];}
                    prevValue['updateAvailableDates'].push({value: dateStr, text: dateValue});

                    nlapiInsertSelectOption('custpage_selectdate', dateStr, dateValue, false);
                }
            }
            else
            {
                console.log(response.body);
                var resp = JSON.parse(response.body);
                alert(resp.data.message);
            }
        }
        else
        {
            alert('Error fetching the available dates. CODE :' + response.code );
        }


    }), 'POST');


    return true;
}

function clearAvailableDates()
{
    if (prevValue['updateAvailableDates'] && prevValue['updateAvailableDates'].length)
    {
        for (var i=0,j=prevValue['updateAvailableDates'].length; i<j; i++)
        {
            var row = prevValue['updateAvailableDates'][i];
            nlapiRemoveSelectOption('custpage_selectdate', row.value);
        }
    }
    nlapiRemoveSelectOption('custpage_selectdate', '');

    return true;
}

function clearAvailableTimeslots()
{
    if (prevValue['updateAvailableTimeslots'] && prevValue['updateAvailableTimeslots'].length)
    {
        for (var i=0,j=prevValue['updateAvailableTimeslots'].length; i<j; i++)
        {
            var row = prevValue['updateAvailableTimeslots'][i];
            nlapiRemoveSelectOption('custpage_selecttimeslot', row.value);
        }
    }
    nlapiRemoveSelectOption('custpage_selecttimeslot', '');

    return true;
}

function sendOrderBooking(bookingData)
{
    alert(bookingData);
}

//// ADDED CMARGALLO 10/08/2016 START
//function updateAvailableTimeslots() {
//  // Hold thet time
//  var stTimeSched = null;
//  for(var i = 540; i <= 780; i += 30){
//      stHours = Math.floor(i / 60);
//      stMinutes = i % 60;
//      if (stMinutes < 10) {
//          stMinutes = '0' + stMinutes; // adding leading zero
//      }
//      
//      stAMPM = stHours % 24 < 12 ? 'AM' : 'PM';
//      stHours = stHours % 12;
//      if (stHours === 0) {
//          stHours = 12;
//      }
//      stTimeSched = stHours + ':' + stMinutes + ' ' + stAMPM;
//      nlapiInsertSelectOption('custpage_selecttimeslot', stTimeSched, stTimeSched, false);
//  } 
//}
////ADDED CMARGALLO 10/08/2016 END

function updateAvailableTimeslots(selectDate)
{

    var logTitle ='updateAvailableTimeslots'; 
    nlapiLogExecution('DEBUG', logTitle, '**** START **** ');

    // clear the available Timeslots
    var selectDate = nlapiGetFieldValue('custpage_selectdate');
    var restletURL = nlapiGetFieldValue('restleturl');
    
    // clear the available Timeslots
    var headers = {};
    headers['User-Agent-x'] = 'Suitescript-Call';
    headers['Content-Type'] = 'application/json';

    var orderType = nlapiGetFieldValue('rectype');//nlapiGetRecordType(); //'salesorder';
    var orderId = nlapiGetFieldValue('recid');
    var execType = nlapiGetFieldValue('exectype');
    var volume = nlapiGetFieldValue('volume');
    var postalCode = nlapiGetFieldValue('postalcode');
    // Remove the space
    postalCode = (postalCode.replace(' ', '')).trim();
    var postObj =
    {
        "api" : "getAvailableTimeslots",
        "param" :
        {
            shipDate : nlapiDateToString(nlapiStringToDate(selectDate)),
            recordType : orderType.trim(),
            recordId : orderId.trim(),
            execType : execType.trim(),
            volume: volume.trim(),
            postalCode: postalCode,
            shipaddr1 : window.opener.nlapiGetFieldValue('shipaddr1'),
            shipaddr2 : window.opener.nlapiGetFieldValue('shipaddr2'),
            shipcity : window.opener.nlapiGetFieldValue('shipcity'),
            shipstate : window.opener.nlapiGetFieldValue('shipstate'),
            shipcountry : window.opener.nlapiGetFieldValue('shipcountry')
        }
    };
    
//  nlapiInsertSelectOption('custpage_selecttimeslot', '1', 'Please Wait...', true);

    nlapiRequestURL(restletURL, JSON.stringify(postObj), headers, (function(response){
        clearAvailableTimeslots();

        if (response.code == '200')
        {
//          nlapiRemoveSelectOption('custpage_selecttimeslot', '1');
            var objValue = JSON.parse(response.body);

            if (objValue.data.length >= 1 )
            {
//              nlapiInsertSelectOption('custpage_selecttimeslot', '', '-Select Time Slot-', true);
                for (var i=0,j=objValue.data.length; i<j; i++)
                {
                    var timeData = objValue.data[i];
                    var timeSched = [timeData.start, timeData.end].join(' - ');

                    if (!prevValue['updateAvailableTimeslots']){prevValue['updateAvailableTimeslots']=[];}
                    prevValue['updateAvailableTimeslots'].push({value: timeSched, text: timeSched});
                    nlapiInsertSelectOption('custpage_selecttimeslot', timeSched, timeSched,false);
                }
            }
            else
            {
                alert('No available timeslot for the selected date.');
            }
        }
        else
        {
            alert('Error fetching the available timeslot. CODE :' + response.code );
        }
    }), 'POST');
}


function submitShipDate()
{

    var logTitle ='submitShipDate'; 
      nlapiLogExecution('DEBUG', logTitle, '**** START **** ');

    var shipDate = nlapiGetFieldValue('custpage_selectdate');
    var timeSlot = nlapiGetFieldValue('custpage_selecttimeslot');

    if ( Helper.isEmpty(shipDate) ||  Helper.isEmpty(timeSlot))
    {
        alert("Please select an Available Date/Timeslot");
        return false;
    }

    if(Helper.isPastDate(shipDate)) {
        alert("Date cannot be past.Please Select a future date.");
        return false;
    }


    shipDate = nlapiDateToString( nlapiStringToDate(shipDate));


    window.opener.nlapiSetFieldValue('custbody_shipping_schedule', timeSlot);
    window.opener.nlapiSetFieldValue('shipdate', shipDate);
    window.opener.nlapiSetFieldValue('custbody_ship_date', shipDate);


    var lineNo = nlapiGetFieldValue('lineno');

    if (! Helper.isEmpty(lineNo))
    {
        window.opener.nlapiSelectLineItem('item', lineNo);
        window.opener.nlapiSetCurrentLineItemValue('item', 'custcol_ship_time', timeSlot);
        window.opener.nlapiSetCurrentLineItemValue('item', 'custcol_ship_date', shipDate);
        window.opener.nlapiCommitLineItem('item');
    }

    window.ischanged = false;
    self.close();
    return true;
}


// ADDED CMARGALLO 10/08/2016 START
/**
 * 
 */
function getBigTicketItem() {
    // Hold the bigticket item
    var objBigTicketItem = null;
    // Hold the bigticket item list
    var arrBigTicketItemList = [];
    // Get the item line level count
    var intLinelevelCount = window.opener.nlapiGetLineItemCount('item');
    // Iterate the line level
    for (var intLinenum = 1; intLinenum <= intLinelevelCount; intLinenum++) {
        // Check if big ticket
        if (window.opener.nlapiGetLineItemValue('item', 'custcol_bigticket', intLinenum) == 'T') {
            // Initialize container
            objBigTicketItem = new Object();
            // Get the item name
            objBigTicketItem.itemname = window.opener.nlapiGetLineItemText('item', 'item', intLinenum);
            // Get the item id
            objBigTicketItem.itemid = window.opener.nlapiGetLineItemValue('item', 'item', intLinenum);
            // Get the quantity
            objBigTicketItem.quantity = window.opener.nlapiGetLineItemValue('item', 'quantity', intLinenum);
            // Get the external id
            objBigTicketItem.externalid = window.opener.nlapiGetLineItemValue('item', 'custcol_externalid', intLinenum);
            objBigTicketItem.location = window.opener.nlapiGetLineItemValue('item', 'location', intLinenum);
            // Store the data
            arrBigTicketItemList.push(objBigTicketItem);
        }
    }
    return arrBigTicketItemList;
}

//ADDED CMARGALLO 10/08/2016 END

var Helper =
{
    /**
     * Add ability for a search to return more than 1000 results
     *
     * @param {String} recordType
     * @param {String} Search id
     * @param {Array} search filters
     * @param {Array} search columns
     * @returns {nlobjSearchResults}
     */
    searchAllRecord : function(recordType, searchId, searchFilter, searchColumns)
    {
        var arrSearchResults = [];
        var count = 1000, init = true, min = 0, max = 1000;

        var searchObj = false;

        if (searchId)
        {
            searchObj = nlapiLoadSearch(recordType, searchId);
            if (searchFilter)
            {
                searchObj.addFilters(searchFilter);
            }
            if (searchColumns)
            {
                searchObj.addColumns(searchColumns);
            }
        }
        else
        {
            searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
        }

        var rs = searchObj.runSearch();

        while (count == 1000)
        {
            var resultSet = rs.getResults(min, max);
            arrSearchResults = arrSearchResults.concat(resultSet);
            min = max;
            max += 1000;
            count = resultSet.length;
        }

        return arrSearchResults;
    },
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
    },

    /**
     * Evaluate if the given string date is past date
     *
     * @param {String} baseDate - String value to represent the base date
     * @returns {Boolean} - true if the date is past , false if not
     */
    isPastDate : function(baseDate) 
    {

        var currentDate = nlapiStringToDate(nlapiDateToString(new Date(),'date'));
        var dateToCompare = nlapiStringToDate(baseDate);
        var bIsPastDate = false;
        if(dateToCompare<currentDate) {
            bIsPastDate = true;
        }
        return bIsPastDate;
    }
};