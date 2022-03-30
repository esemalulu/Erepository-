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
 
// Global variables
{
    // URL that processes the SOAP Envelope for SuiteTalk
    var stWebServiceConsumer= 'https://webservices.netsuite.com/services/NetSuitePort_2008_2';
}

/** 
 * Converts a duration value in HH:MI or HH:MI am/pm notation to it's equivalent decimal value
 *
 * @param (string) time the duration value in HH:MI format
 * @return the duration in its equivalent decimal value
 * @type decimal
 * @author Nestor M. Lim
 * @version 2.0
 */
function sexagesimalToDecimal(stTime)
{
    if (stTime == null)
    {
        throw "Time should not be null.";
    }

    var components = stTime.split(' ');

    var stPrefix = components[0];

    var intHour = parseInt(stPrefix.split(":")[0]);
    var intMinute = parseInt(stPrefix.split(":")[1]);

    if (components.length > 1)
    {
        var stSuffix = components[1];
        
        if (stSuffix.toUpperCase() == 'AM')
        {
            if (intHour == 12)
            {
                intHour = 0;    
            }            
        }          
       
        if (stSuffix.toUpperCase() == 'PM')
        {
            if (intHour < 12)
            {
                intHour += 12;    
            }            
        }  
    }
    
    return intHour + intMinute / 60;
}

/** 
 * Login to NetSuite's Web Services.  
 *
 * @param (string) email Email address to use in logging into NetSuite
 * @param (string) password Password to use in logging into NetSuite
 * @param (string) role Internal ID of the role to use making web service calls
 * @param (string) accountId Account ID found in the Web Service Preferences
 * @return cookie containing the session identifier use to maintain a stateful connection to NetSuite
 * @type string
 * @author Nestor M. Lim
 * @see logoutFromSuiteTalk
 * @version 1.0
 */
function loginToSuiteTalk(stEmail, stPassword, stRole, stAccountId)
{
    var stRequest = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
                    '<soapenv:Header>'+
                        '<platformMsgs:applicationInfo xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:platformMsgs="urn:messages_2008_2.platform.webservices.netsuite.com" xmlns:xsd="http://www.w3.org/2001/XMLSchema"/>' +
                          '<platformMsgs:partnerInfo xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:platformMsgs="urn:messages_2008_2.platform.webservices.netsuite.com" xmlns:xsd="http://www.w3.org/2001/XMLSchema"/>' +
                       '</soapenv:Header>'+
                       '<soapenv:Body>'+
                          '<platformMsgs:login xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:platformMsgs="urn:messages_2008_2.platform.webservices.netsuite.com" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:platformCore="urn:core_2008_2.platform.webservices.netsuite.com">'+
                             '<platformMsgs:passport>'+
                                '<platformCore:email>' + stEmail + '</platformCore:email>'+
                                '<platformCore:password>' + stPassword + '</platformCore:password>'+
                                '<platformCore:account>' + stAccountId + '</platformCore:account>'+
                                '<platformCore:role internalId="' + stRole + '"/>'+
                             '</platformMsgs:passport>'+
                          '</platformMsgs:login>'+
                       '</soapenv:Body>'+
                    '</soapenv:Envelope>';

    var soapHeaders = new Array();  
    soapHeaders['SOAPAction'] = 'login';

    var response = nlapiRequestURL(stWebServiceConsumer, stRequest, soapHeaders );
    
    var responseCode = response.getCode();
    var responseBody = response.getBody();
    
    if (responseCode != 200) 
    {
        nlapiLogExecution('ERROR', 'Login Error', 'Response Code = ' + responseCode + ' :  ' + responseBody);    
        return null;
    }
    
    return response.getHeader("Set-Cookie");
}

/** 
 * Logout from NetSuite's Web Services
 *
 * @return true if the logout operation was successful, false if otherwise.
 * @type boolean
 * @author Nestor M. Lim
 * @see loginToSuiteTalk
 * @version 1.0
 */
function logoutFromSuiteTalk()
{
    var stRequest = '<soapenv:Envelope ' +
                    'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"> ' +
                   '<soapenv:Body> ' +
                      '<platformMsgs:logout ' +
                        'xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" ' +
                        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                        'xmlns:platformMsgs="urn:messages_2008_2.platform.webservices.netsuite.com" ' +
                        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" /> ' +
                   '</soapenv:Body> ' +
                '</soapenv:Envelope> ';

    var soapHeaders = new Array();  
    soapHeaders['SOAPAction'] = 'logout';
    
    var response = nlapiRequestURL(stWebServiceConsumer, stRequest, soapHeaders );
    
    var responseCode = response.getCode();
    
    if (responseCode != 200) 
    {
        nlapiLogExecution('ERROR', 'Logout Error', 'Response Code = ' + responseCode);    
        return false;
    }
    
    return true;
}

/** 
 * Sends a SOAP request to the SuiteTalk and return a SOAP response
 *
 * @param (string) stSoapRequest a string containing the SOAP request message
 * @param (string) stSoapAction the type of operation being sent to SuiteTalk
 * @param (string) stSessionCookie the value of the cookie used in maintaining the session
 * @param (string) stCookieInfo any additional info added to the cookie like NS_VER, etc
 * @return the SOAP Response object
 * @type object
 * @throws nlobjError SOAP Request and Action should not be empty.
 * @author Ruel Dizon, Nestor M. Lim
 * @version 2.0
 */
function callSuiteTalk(stSoapRequest, stSoapAction, stSessionCookie, stCookieInfo) 
{
    if (isEmpty(stSoapRequest) || isEmpty(stSoapAction))
    {
        throw nlapiCreateError('10014', 'SOAP Request and Action should not be empty.');
    }
    
    var stFinalCookie = stCookieInfo;
    
    if (isEmpty(stFinalCookie))
    {
        stFinalCookie = 'NS_VER=2008.2.0';
    }
        
    var soapHeaders = new Array();  
    soapHeaders['User-Agent-x'] = 'SuiteScript-Call';
    soapHeaders['SOAPAction'] = stSoapAction;
    soapHeaders['Host'] = "webservices.netsuite.com";
    
    if (!isEmpty(stSessionCookie))
    {
        soapHeaders['Cookie'] = '$Version=0; ' + stFinalCookie + '; ' + stSessionCookie;    
    }        
             
    var soapResponse = nlapiRequestURL(stWebServiceConsumer, stSoapRequest, soapHeaders);

    return soapResponse;
}

/** 
 * Determines if a string variable is empty or not.  An empty string variable 
 * is one which is null or undefined or has a length of zero.
 *
 * @param (string) stValue The string value to test for emptiness. 
 * @return true if the variable is empty, false if otherwise.
 * @type boolean
 * @throws nlobjError isEmpty should be passed a string value.  The data type passed is {x} whose class name is {y}
 * @author Nestor M. Lim
 * @see isNullOrUndefined 
 * @version 1.5
 */
function isEmpty(stValue)
{
    if (isNullOrUndefined(stValue))
    {
        return true;
    }
    
    if (typeof stValue != 'string' && getObjectName(stValue) != 'String')
    {
        throw nlapiCreateError('10000', 'isEmpty should be passed a string value.  The data type passed is ' + typeof stValue + ' whose class name is ' + getObjectName(stValue));
    }

    if (stValue.length == 0)
    {
        return true;
    }

    return false;
}

/** 
 * Determines if a variable is either set to null or is undefined.
 *
 * @param (object) value The object value to test
 * @return true if the variable is null or undefined, false if otherwise.
 * @type boolean
 * @author Nestor M. Lim
 * @version 1.0
 */
function isNullOrUndefined(value)
{
    if (value === null)
    {
        return true;
    }
    
    if (value === undefined)
    {
        return true;
    }  
    
    return false;
}

/** 
 * Removes all line items from a sublist given its internal ID.
 * Works for Client Side scripts.
 *
 * @throws nlobjError Call to removeAllLineItems should be given a non empty string parameter.
 * @author Nestor M. Lim
 * @version 1.0
 */
function removeAllLineFromSublist(stSublistInternalId)
{
    if (isEmpty(stSublistInternalId))
    {
        throw nlapiCreateError('10001', 'Call to removeAllLineItems should be given a non empty string parameter.');
    }
 
    window.isinited = true;   
    var intCurrentCount = nlapiGetLineItemCount(stSublistInternalId);
            
    if (intCurrentCount > 0)
    {
        for (var i = 1; i <= intCurrentCount; i++)
        {
            window.isinited = true;
            nlapiSelectLineItem(stSublistInternalId, 1);
            window.isinited = true;
            nlapiRemoveLineItem(stSublistInternalId);
        }
    }   
}

/** 
 * Deletes all child records from NetSuite given the parent record and internal ID value.
 *
 * @param (string) stParentRecordTypeId The internal ID of the parent table whose children are to be deleted.
 * @param (string) stChildRecordTypeId The internal ID of the child table
 * @param (string) stParentRecordId The internal ID of actual parent record to be removed of its children
 * @author Nestor M. Lim
 * @version 1.0
 */
function deleteAllChildRecords(stParentRecordTypeId, stChildRecordTypeId, stParentRecordId)
{
    var columns = [ new nlobjSearchColumn('internalid') ];
    var filters = [ new nlobjSearchFilter(stParentRecordTypeId, null, 'is', stParentRecordId) ];
    
    var results = nlapiSearchRecord(stChildRecordTypeId, null, filters, columns);
    
    for (var i = 0; i < results.length; i++)
    {
        var stWorkOrderLineId = results[i].getValue('internalid');
        nlapiDeleteRecord(stChildRecordTypeId, stWorkOrderLineId);
    }    
}

/** 
 * Removes all line items from a given sublist inside a nlobjRecord object.
 *
 * @param (nlobjRecord) recObj The nlobjRecord object containing the sublist to be emptied
 * @param (string) stLineItemId The internal ID of the line item / sublist that should be emptied.
 * @author Nestor M. Lim
 * @version 1.0
 */
function removeAllLineItems(recObj, stLineItemId)
{
    var intCount = recObj.getLineItemCount(stLineItemId);
    
    for (var i = 1; i <= intCount; i++)
    {
        recObj.removeLineItem(stLineItemId, 1);
    }
}

/** 
 * Gets all the parent subsidiary of a given subsidiary.  This includes the parent 
 * of the parents and so on up to the main subsidiary.
 *
 * @param (string) stSubsidiaryId The subsidiary ID of the child record whose 
 *                  ancestors are being searched.
 * @return array of parent subsidiary IDs
 * @type Array
 * @author Nestor M. Lim
 * @version 1.0
 */
function getSubsidiaryAncestors(stSubsidiaryId)
{
    var ancestors = new Array();
    
    var stChildId = stSubsidiaryId;
    var stParentId = 'x';
    
    while (!isEmpty(stParentId))
    {
        stParentId = nlapiLoadRecord('subsidiary', stChildId).getFieldValue('parent');
        ancestors.push(stParentId);
        stChildId = stParentId;
    }
    
    return ancestors;
}

/** 
 * Converts a string to an int.  If the string is not a number then it returns 0.
 *
 * @param (string) stValue The string value to be converted to int.
 * @return int equivalent of the string value
 * @type int
 * @author Nestor M. Lim
 * @version 3.0
 */
function forceParseInt(stValue)
{
    if (isEmpty(stValue))
    {
        return 0;
    }
    
    var intValue = parseInt(stValue.removeLeadingZeroes());
    
    if (isNaN(intValue))
    {
        return 0;
    }
    
    return intValue;
}

/** 
 * Converts a string to float.  If the string is not a number then it returns 0.00.
 *
 * @param (string) stValue The string value to be converted to float.
 * @return float equivalent of the string value
 * @type float
 * @author Fernie P. Baguio
 * @version 1.0
 */
function forceParseFloat(stValue)
{
    var flValue = parseFloat(stValue);
    
    if (isNaN(flValue))
    {
        return 0.00;
    }
    
    return flValue;
}

/** 
 * Converts a percent field returned in string format to its equivalent float value.
 * For example, if the nlapiGetCurrentLineItemValue is used to get the value of a percent
 * field, it returns a string like '25.0%'.  This function converts the string '25.0%'
 * to 0.25.
 *
 * @return the float value represented by the percentage, 0 if the value is in
 *          an invalid percentage format.
 * @type float
 * @author Nestor M. Lim
 * @version 1.0
 */
function forceFloatPercent(stValue)
{
    if (isEmpty(stValue))
    {
	return 0;
    }

    return ifNull(stValue.toFloatPercent(), 0);
}

/** 
 * Returns the object / class name of a given instance
 *
 * @param (object) a variable representing an instance of an object
 * @return the class name of the object
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function getObjectName(object)
{
    if (isNullOrUndefined(object))
    {
        return object;
    }
    
    return /(\w+)\(/.exec(object.constructor.toString())[1];
}

/** 
 * Convenience method in determining the record type internal id of an item.
 * The same as looking up using nlapiLookupField('item', id, 'recordtype'). 
 *
 * @param (string) stRecordType the type of item
 * @return the internal id of the record type of the item
 * @type string
 * @throws nlobjError Item record type should not be empty.
 * @author Nestor M. Lim
 * @version 1.0
 */
function toItemRecordInternalId(stRecordType)
{
    if (isEmpty(stRecordType))
    {
        throw nlapiCreateError('10003', 'Item record type should not be empty.');
    }
    
    var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();
    
    switch (stRecordTypeInLowerCase)
    {
        case 'invtpart':
            return 'inventoryitem';
        case 'description':
            return 'descriptionitem';
        case 'assembly':
            return 'assemblyitem';
        case 'discount':
            return 'discountitem';
        case 'group':
            return 'itemgroup';
        case 'markup':
            return 'markupitem';
        case 'noninvtpart':
            return 'noninventoryitem';
        case 'othcharge':
            return 'otherchargeitem';
        case 'payment':
            return 'paymentitem';
        case 'service':
            return 'serviceitem';
        case 'subtotal':
            return 'subtotalitem';        
        default:
            return stRecordTypeInLowerCase;
    }
}

/** 
 * If the value of the first parameter is null or undefined then the second parameter 
 * is returned.  Otherwise, the first parameter is returned.
 *
 * @param (object) source the parameter being tested
 * @param (object) destination the parameter returned if the first is null or undefined
 * @return the source, but if null, the destination
 * @type object
 * @throws nlobjError The parameters of this function must be of the same data type.
 * @author Nestor M. Lim
 * @version 1.0
 */
function ifNull(source, destination)
{
    if (isNullOrUndefined(source))
    {
        return destination;
    }
    
    if (typeof source != typeof destination)
    {
        throw nlapiCreateError('10004', 'The parameters of this function must be of the same data type.');
    }
    
    if (getObjectName(source) != getObjectName(destination))
    {
        throw nlapiCreateError('10005', 'The parameters of this function must be of the same data type.');
    }
    
    
    return source;
}

/** 
 * If the value of the first parameter is an empty string, null or undefined then the second parameter 
 * is returned.  Otherwise, the first parameter is returned.
 *
 * @param (string) stSource the parameter being tested
 * @param (string) stDestination the parameter returned if the first is null or undefined
 * @return the source, but if null, the destination
 * @type string
 * @throws nlobjError The parameters of this function must both be strings.
 * @author Nestor M. Lim
 * @version 1.0
 */
function ifStringEmpty(stSource, stDestination)
{
    if (isEmpty(stSource))
    {
        if (typeof stDestination != 'string' && getObjectName(stDestination) != 'String')
        {
            throw nlapiCreateError('10006', 'The parameters of this function must both be strings.');
        }
        
        return stDestination;
    }
    
    return stSource;
}

/** 
 * Returns true if the array passed is empty, otherwise returns false.
 *
 * @param (Array) array the array being tested for emptiness
 * @return true if the array is empty or null or undefined, false if otherwise.
 * @type boolean
 * @throws nlobjError Only objects of type Array can be passed to this function. Type of object is {object type}
 * @author Nestor M. Lim
 * @version 1.0
 */
function isArrayEmpty(array)
{
    if (isNullOrUndefined(array))
    {
        return true;
    }
    
    if (getObjectName(array) == 'Array Stack')
    {
        throw nlapiCreateError('10007', 'Only objects of type Array can be passed to this function. Type of object is ' + getObjectName(array));
    }
    
    if (array.length <= 0)
    {
        return true;
    }
    
    return false;
}

/** 
 * Returns the number of time units between two dates.  Valid time units are: milliseconds,
 * seconds, minutes, hour, day.  Time units are in absolute value.
 *
 * @param (Date) date1 first date 
 * @param (Date) date2 second date 
 * @param (Date) stTime represents what time unit to use as basis in computing the time difference 
 *               between two dates.  Valid values: MS, SS, MI, HR, D
 *
 * @return number of time units between the two dates.
 * @type int
 * @throws nlobjError Both parameters should be of type Date
 * @throws nlobjError Only the following target time units are valid:  MS, SS, MI, HR, D 
 *
 * @author Nestor M. Lim
 * @version 1.0
 */
function timeBetween(date1, date2, stTime) 
{
    if (getObjectName(date1) != 'Date' || getObjectName(date2) != 'Date')
    {
        throw nlapiCreateError('10008', 'Both parameters should be of type Date');
    }
    
    if (stTime != 'MS' && stTime != 'SS' && stTime != 'MI' && stTime != 'HR'
        && stTime != 'D')
    {
        throw nlapiCreateError('10009', 'Only the following target time units are valid:  MS, SS, MI, HR, D');
    }
    
    // The number of milliseconds in one time unit
    var intOneTimeUnit = 1 
    
    switch (stTime)
    {
        case 'D':
            intOneTimeUnit *= 24;
        case 'HR':
            intOneTimeUnit *= 60;
        case 'MI':
            intOneTimeUnit *= 60;
        case 'SS':
            intOneTimeUnit *= 1000;
    }
    
    // Convert both dates to milliseconds
    var intDate1 = date1.getTime()
    var intDate2 = date2.getTime()

    // Calculate the difference in milliseconds
    var intDifference = Math.abs(intDate1 - intDate2)
    
    // Convert back to time units and return
    return Math.round(intDifference / intOneTimeUnit)
}

/** 
 * Returns the last day/number of days for a given month and year.
 *
 * @param (int) intMonth the month whose number of days/last day is being determined.
 * @param (int) intYear the year whose number of days/last day is being determined.
 *
 * @return last day/number of days of the month and year.
 * @type int
 * @throws nlobjError Valid months are from 0 (January) to 11 (December).
 *
 * @author Nestor M. Lim
 * @version 1.0
 */
function daysInMonth(intMonth, intYear) 
{
    if (intMonth < 0 || intMonth > 11)
    {
        throw nlapiCreateError('10010', 'Valid months are from 0 (January) to 11 (December).');
    }
    
    var lastDayArray = [
        31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ];
    
    if (intMonth != 1) 
    {
        return lastDayArray[intMonth];
    }
    
    if (intYear % 4 != 0) 
    {
        return lastDayArray[1];
    }
    
    if (intYear % 100 == 0 && intYear % 400 != 0)
    {
        return lastDayArray[1];
    }        
        
    return lastDayArray[1] + 1;
} 


/** 
 * The purpose of this script is to check if the value passed to 
 * it is empty or zero.
 *
 * @param (string) stValue the value being tested
 * @return true if the value is empty or zero, false if otherwise
 * @type boolean
 * @author Ruel Dizon
 * @version 1.0
 */
function isEmptyOrZero(stValue) 
{
    if (isEmpty(stValue) || stValue == 0) 
    {
        return true;
    }
    else 
    {
        return false;
    }
}

/** 
 * Removing duplicate entries or values from a Javascript array. 
 *
 * @param (Array) array the array being tested for duplicates
 * @return New array with no duplicate elements  
 * @type Array
 * @author Fernie P. Baguio
 * @version 1.0
 */
function removeDuplicates(array) 
{
    if (isNullOrUndefined(array))
    {
        return array;
    }
    
    var arrNew = new Array();
    
    o: for (var i = 0, n = array.length; i < n; i++) 
    {
        for (var x = 0, y = arrNew.length; x < y; x++)
        {
            if(arrNew[x] == array[i]) 
            {
                continue o;     
            }    
        }
        
        arrNew[arrNew.length] = array[i];
   }
   
   return arrNew;
}

/** 
 * The purpose of this script is search value from the array
 *
 * @param (string) val the value being searched 
 * @param (array) arr the array where the value is being searched
 * @return true if the value is found, false if otherwise.
 * @type boolean
 * @author Ruel Dizon
 * @version 1.0
 */
function inArray(val, arr)
{	
    var bIsValueFound = false;	
    
    for(var i = 0; i < arr.length; i++)
    {
        if(val == arr[i])
        {
            bIsValueFound = true;        
            break;	  
        }
    }
    
    return bIsValueFound;
}

/** 
 * Gets the item price based using the price level
 *
 * @return the price of the item at the given price level
 * @type float
 * @author Nestor M. Lim
 * @version 1.0
 */
function getItemPrice(stItemId, stPriceLevel)
{
    if (stPriceLevel == '1')
    {
        return nlapiLookupField('item', stItemId, 'baseprice');
    }
    else
    {
        var arrRateFilters = [
            new nlobjSearchFilter('internalid', null, 'is', stItemId)
        ];

        var arrRateColumns = [
            new nlobjSearchColumn('otherprices')
        ];

        var arrRateResults = nlapiSearchRecord('item', null, arrRateFilters, arrRateColumns);
        
        return arrRateResults[0].getValue('price' + stPriceLevel);    
    }   
}

/** 
 * Formats a float value by adding commas and an optional currency symbol
 * ($ 999,999.99)
 *
 * @param (float) flValue the value to be formatted
 * @param (string) stCurrencySymbol the currency symbol to prefix the formatted
 * value
 * 
 * @return the float value formatted with the currency symbol, if specified.
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function formatCurrency(flValue, stCurrencySymbol) 
{
    if (isNullOrUndefined(flValue))
    {
        return 0;
    }
    
    if (typeof flValue != 'number' && getObjectName(flValue) != 'Number')
    {
        throw nlapiCreateError('10011', 'formatCurrency should be passed a number value.  The data type passed is ' + typeof flValue + ' whose class name is ' + getObjectName(flValue));
    }
    
    var flNumber = flValue;
    
    flNumber = flNumber.toString().replace(/\$|\,/g, '');
    
    if (isNaN(flNumber))
    {
        flNumber = "0";    
    }
    
    var bSign = (flNumber == (flNumber = Math.abs(flNumber)));
    
    flNumber = Math.floor(flNumber * 100 + 0.50000000001);
    
    var intCents = flNumber % 100;
    
    flNumber = Math.floor(flNumber / 100).toString();
    
    if (intCents < 10)
    {
        intCents = "0" + intCents;    
    }
    
    for (var i = 0; i < Math.floor((flNumber.length - (1 + i)) / 3); i++)
    {
        flNumber = flNumber.substring(0, flNumber.length - (4 * i + 3)) + ',' 
            + flNumber.substring(flNumber.length - (4 * i + 3));        
    }
    
    return (((bSign) ? '' : '-') + ifStringEmpty(stCurrencySymbol, '') + flNumber + '.' + intCents);
}

// New methods under the String object

/** 
 * Converts a percent field returned in string format to its equivalent float value.
 * For example, if the nlapiGetCurrentLineItemValue is used to get the value of a percent
 * field, it returns a string like '25.0%'.  This function converts the string '25.0%'
 * to 0.25.
 *
 * @return the float value represented by the percentage, null if the value is in
 *          an invalid percentage format.
 * @type float
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.toFloatPercent = function String_toFloatPercent()
{
    if (this.trim().length < 2)
    {
        return null;
    }    
        
    var flFloat = parseFloat(this.trim().substring(0, this.length - 1)) / 100;

    if (isNaN(flFloat))
    {
        return null;
    }

    return flFloat;
}

/** 
 * Removes all leading and trailing spaces on the string object.
 *
 * @return the trimmed String object 
 * @type String
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.trim = function String_trim()
{
    if (this === null)
    {
        return null;
    }
    
    return this.replace(/^\s*/, '').replace(/\s+$/, '');
}

/** 
 * Returns the left zero-padded number based on the number of digits
 *
 * @param (int) intTotalDigits Number of Digits
 * @return the zero-padded number based on the number of digits
 * @type String 
 * @author Ruel Dizon
 * @version 1.0
 */
String.prototype.leftPadWithZeroes = function String_leftPadWithZeroes(intTotalDigits) 
{ 
    var stPaddedString = ''; 
    
    if (intTotalDigits > this.length) 
    { 
        for (var i = 0; i < (intTotalDigits - this.length); i++) 
	{ 
            stPaddedString += '0'; 
	} 
    } 
    
    return stPaddedString + this; 
} 

/** 
 * Removes leading zeroes from a string with a number value.  Useful in 
 * calling parseInt.
 *
 * @return the string with leading zeroes already trimmed
 * @type String 
 * @author Nestor Lim
 * @version 1.0
 */
String.prototype.removeLeadingZeroes = function String_removeLeadingZeroes()
{
    if (isEmpty(this))
    {
        return this;
    }
    
    var stTrimmedString = this;
    
    for (var i = 0; i < stTrimmedString.length; i++)
    {
        if (stTrimmedString[i] === '0')
        {
            stTrimmedString = stTrimmedString.substring(1, stTrimmedString.length);
        }
        else
        {
            break;
        }
    }
    
    return stTrimmedString;
}

/** 
 * Convenience method under the String prototype calling
 * the forceParseInt function
 *
 * @return the value returned by the forceParseInt function giving
 * this string as its parameter
 * @type int
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.forceParseInt = function String_forceParseInt()
{
    return forceParseInt(this);
}

/** 
 * Convenience method under the String prototype calling
 * the forceParseFloat function
 *
 * @return the value returned by the forceParseFloat function giving
 * this string as its parameter
 * @type float
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.forceParseFloat = function String_forceParseFloat()
{
    return forceParseFloat(this);
}

/** 
 * Cleans a date string in MM/DD/YYYY format so that the nlapiStringToDate function
 * can work properly
 *
 * @return the cleaned date in string format for feed to nlapiStringToDate
 * @type string
 * @throws nlobjError Clean up for date cannot act on an empty string.
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.cleanUpForDate = function String_cleanUpForDate()
{
    if (isEmpty(this))
    {
        throw nlapiCreateError('10002', 'Clean up for date cannot act on an empty string.');
    }
    
    return this.replace(/\/(\d+)\//g, cleanUpDay);
}

/** 
 * Convenience method to converts a string to date
 *
 * @return date equivalent of the string
 * @type Date
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.toDate = function String_toDate()
{
    if (isEmpty(this))
    {
        return null;
    }
    
    return nlapiStringToDate(this.cleanUpForDate());
}

/**
 * The Logger object contains functions which simplifies the logging of messages
 * by:
 * 1.  Removing the need to determine if the log is for a Server Side or Client
 *     Side SuiteScript
 * 2.  Allows you to toggle printing of DEBUG type messages programmatically
 *     or through a Script parameter.
 *
 * @author Nestor M. Lim
 * @version 3.0
 */
function Logger() 
{
    /** Determines whether to print DEBUG type messages or not */
    var bEnableDebug = false;
    
    /** Force client side alerts instead of server side logs */
    var bForceClientSide = false;
    
    /** 
     * Enable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.enableDebug = function Logger_enableDebug()
    {
        bEnableDebug = true;
    }
    
    /** 
     * Forces client side alerts instead of server side logs
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.forceClientSide = function Logger_forceClientSide()
    {
        bForceClientSide = true;
    }
    
    /** 
     * Do not force client side alerts instead of server side logs
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.unforceClientSide = function Logger_unforceClientSide()
    {
        bForceClientSide = false;
    }
    
    /** 
     * Disable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.disableDebug = function Logger_disableDebug()
    {
        bEnableDebug = false;
    }

    /** 
     * Prints a log either as an alert for CSS or a server side log for SSS
     *
     * @param (string) stType The type of log being printed. Can be set to DEBUG, ERROR, AUDIT, EMERGENCY
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.log = function Logger_log(stType, stTitle, stMessage)
    {
        if (isEmpty(stType))
        {
            throw nlapiCreateError('ERROR', 'Logging Error', 'No Log Type Defined');
        }
        
        stType = new String(stType);
        
        if (stType.trim() === 'DEBUG')
        {
           if (!bEnableDebug)
           {
               return;
           }
        }
        
        if (bForceClientSide)
        {
            alert(stType + ' : ' + stTitle + ' : ' + stMessage);
            return;
        }
        
        if (typeof nlapiLogExecution === 'undefined')
        {
            alert(stType + ' : ' + stTitle + ' : ' + stMessage);
        }
        else
        {
            nlapiLogExecution(stType, stTitle, stMessage);
        }                
    }
    
    /** 
     * Convenience method to log a DEBUG message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.debug = function Logger_debug(stTitle, stMessage)
    {
        this.log('DEBUG', stTitle, stMessage);
    }

    /** 
     * Convenience method to log an AUDIT message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.audit = function Logger_audit(stTitle, stMessage)
    {
        this.log('AUDIT', stTitle, stMessage);
    }

    /** 
     * Convenience method to log an ERROR message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.error = function Logger_error(stTitle, stMessage)
    {
        this.log('ERROR', stTitle, stMessage);
    }
    
    /** 
     * Convenience method to log an EMERGENCY message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */    
    this.emergency = function Logger_emergency(stTitle, stMessage)
    {
        this.log('EMERGENCY', stTitle, stMessage);
    }
}

/**
 * The Beacon object contains functions which monitors a running SuiteScript 
 * process's resource consumption and utilization.  
 *
 * @author Nestor M. Lim
 * @version 1.0
 */
function Beacon() 
{
    /** The date/time when this beacon was dropped */
    var dropTimeStamp;
    
    /** The remaining usage when this beacon was dropped */
    var intDropUsage = nlapiGetContext().getRemainingUsage();
    
    /** How many usage units left before the beacon recommends to stop the script */
    var intRemainingUsageToStop = 100;
    
    /** How many milliseconds the script should run before the beacon recommends to stop */
    var intRunMillisecondsBeforeStop = 60000;
    
    /** 
     * Drops the beacon on this point of the program.  
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.drop = function Beacon_drop()
    {
        dropTimeStamp = new Date();
        dropUsage = nlapiGetContext().getRemainingUsage();
    }
    
    /** 
     * Sets at least how many usage points should be left until the Beacon
     * recommends the script to stop
     *
     * @param (int) intUsage Number of usage points before the beacon recommends 
     *              the script to stop
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.setRemainingUsageToStop = function Beacon_setRemainingUsageToStop(intUsage)
    {
        intRemainingUsageToStop = intUsage;
    }
    
    /** 
     * Sets at least how many usage points should be left until the Beacon
     * recommends the script to stop
     *
     * @param (int) intUsage Number of usage points before the beacon recommends 
     *              the script to stop
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.setRunTimeBeforeStop = function Beacon_setRunTimeBeforeStop(intMilliseconds)
    {
        intRunMillisecondsBeforeStop = intMilliseconds;
    }
    
    /** 
     * Returns how many percent is used considering both time and usage 
     * limits before the beacon recommends the script to stop
     *
     * @return how many percent is used considering both time and usage 
     * @type int
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.percentUsed = function Beacon_percentUsed()
    {
        var intRemainingUsage = nlapiGetContext().getRemainingUsage();
        var intPercentOfUsageUsed = Math.round((intDropUsage - intRemainingUsage) / (intDropUsage - intRemainingUsageToStop) * 100);
        var intPercentOfTimeUsed = 0;
        
        if (!isNullOrUndefined(dropTimeStamp))
        {
            var now = new Date();
            intPercentOfTimeUsed = Math.round((now.getTime() - dropTimeStamp.getTime()) / intRunMillisecondsBeforeStop * 100);
        }   
        
        if (intPercentOfTimeUsed > intPercentOfUsageUsed)
        {
            return intPercentOfTimeUsed;
        }
        
        return intPercentOfUsageUsed;
    }
    
    /** 
     * Returns true if the beacon believes it's time to stop, false if otherwise
     *
     * @return Returns true if the beacon believes it's time to stop, false if otherwise
     * @type boolean     
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.shouldStop = function Beacon_shouldStop()
    {
        var intRemainingUsage = nlapiGetContext().getRemainingUsage();

        if (intRemainingUsage <= intRemainingUsageToStop)
        {
            return true;
        } 

        if (!isNullOrUndefined(dropTimeStamp))
        {
            var now = new Date();
            var intElapsedTime = now.getTime() - dropTimeStamp.getTime();

            if (intElapsedTime >= intRunMillisecondsBeforeStop)
            {
                return true;
            } 
        }
        
        return false;
    }   
}

/** 
 * Parses a the URL and gets the query string 
 *
 * Copyright (c) 2008, Adam Vandenberg
 * All rights reserved.
 *  
 */
function QueryString(stQueryString) 
{ 
    this.params = {};
	
    if (isEmpty(stQueryString))
    {
        stQueryString = window.location.search.substring(1, window.location.search.length);
    }

    if (stQueryString.length == 0) 
    {
        return;
    }           

    stQueryString = stQueryString.replace(/\+/g, ' ');

    var args = stQueryString.split('&'); // parse out name/value pairs separated via &

    for (var i = 0; i < args.length; i++) 
    {
        var pair = args[i].split('=');
        var stName = decodeURIComponent(pair[0]);

        var stValue = (pair.length==2)
                ? decodeURIComponent(pair[1])
                : stName;

        this.params[stName] = stValue;
    }
}

/** 
 * Gets the value of a key from the query string.
 *
 * @param (string) stKey the name of the parameter that is being sought
 * @param (string) stDefaultValue the value to return in case the parameter
 *      is not found.
 * 
 * @return the value identified by the key or the default value if none exists
 * @type string
 * 
 * Copyright (c) 2008, Adam Vandenberg
 * All rights reserved.
 *  
 */
QueryString.prototype.get = function QueryString_get(stKey, stDefaultValue) 
{
    var stValue = this.params[stKey];
    return (!isEmpty(stValue)) ? stValue : stDefaultValue;
}

/** 
 * @param (string) stKey the name of the parameter that is being sought
 * 
 * @return true if the key exists in the query string, false if otherwise
 * @type boolean
 *
 * Copyright (c) 2008, Adam Vandenberg
 * All rights reserved.
 *  
 */
QueryString.prototype.contains = function QueryString_contains(stKey) 
{
    var stValue = this.params[stKey];
    return (!isEmpty(stValue));
}

/**
 * The NetSuiteHole object is used in conjunction with the following
 * suitelet script in order to work around NetSuite security 
 * and retrieve data from records that are blocked from a role/user: 
 * 
 * 1. Common_SS_SecurityBypasser.js
 *
 * @author Nestor M. Lim
 * @version 1.0
 */
function NetSuiteHole()
{
    /** Points to the BypassSuitelet URL */
    var stBypassSuiteletUrl;
    
    /** 
     * Sets the Bypass Suitelet URL to use
     *
     * @param (string) stUrl the bypass suitelet url
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.setUrl = function NetSuiteHole_setUrl(stUrl)
    {
        stBypassSuiteletUrl = stUrl; 
    }
    
    /** 
     * Returns the location of the Bypass Suitelet URL
     *
     * @return url of the Bypass Suitelet being used
     * @type string
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.getUrl = function NetSuiteHole_getUrl()
    {
        return stBypassSuiteletUrl;
    }
    
    /** 
     * Retrieves a record from NetSuite via the Bypass Suitelet
     *
     * @param (string) stRecordType the type of record being loaded
     * @param (string) stRecordId the internal id of the record being loaded
     * @param (function) callback the callback function for client suitescript 
     * @return the record retrieved from NetSuite
     * @type RecordFromHole
     * @throws nlobjError Record Type and Internal ID is required.
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.loadRecord = function NetSuiteHole_loadRecord(stRecordType, stRecordId, callback)
    {
        if (isEmpty(stRecordType) || isEmpty(stRecordId))
        {
            throw nlapiCreateError('10012', 'Record Type and Internal ID is required.');
        }
        
        var stQueryUrl = stBypassSuiteletUrl + '&record=' + stRecordType 
            + '&id=' + stRecordId; 
            
        var targetResponse = nlapiRequestURL(stQueryUrl, null, null, callback);

        var stResponseXml = targetResponse.getBody();
        
        var responseXml;
        
        try
        {
            responseXml = nlapiStringToXML(stResponseXml);
        }
        catch (parseException)
        {
            throw nlapiCreateError('10013', 'Unable to parse XML string.  Check for wellformedness and validity.');
        }
        
        var stIsSuccess = nlapiSelectValue(responseXml, '/response/success');
        
        if (stIsSuccess == 'true') 
        {
            var record = new RecordFromHole(stRecordType, stRecordId);
            var fields = nlapiSelectNodes(responseXml, '/response/record/body/*');

            for (var i = 0; i < fields.length; i++)
            {
                var stFieldName = fields[i].nodeName;
                var stFieldValue = nlapiSelectValue(responseXml, '/response/record/body/' + stFieldName);
                record.setFieldValue(stFieldName, stFieldValue);                    
            }                
            
            return record;
        }
        else
        {
            var stErrorCode = nlapiSelectValue(responseXml, '/response/nserror');
            var stErrorMessage = nlapiSelectValue(responseXml, '/response/message');
                
            throw nlapiCreateError(stErrorCode, stErrorMessage);
        }
    }
}

/**
 * An abstraction similar to the nlobjRecord object to be used by the Bypass Suitelet
 * 
 * @param (string) stRecordTypeParam the type of record being loaded
 * @param (string) stRecordIdParam the internal id of the record being loaded 
 * @author Nestor M. Lim
 * @version 1.0
 */
function RecordFromHole(stRecordTypeParam, stRecordIdParam)
{
    /** the maps field names with their corresponding values */
    var fieldMap = new Array();
    
    /** the type of record represented by this object */
    var stRecordType = stRecordTypeParam;
    
    /** the internal ID of the record represented by this object */
    var stRecordId = stRecordIdParam;
    
    /**
     * Sets the value of a field
     * 
     * @param (string) stFieldName the field name whose value is being set
     * @param (string) stFieldValue the value of the field 
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.setFieldValue = function RecordFromHole_setFieldValue(stFieldName, stFieldValue)
    {
        fieldMap[stFieldName] = stFieldValue;        
    }
    
    /** 
     * Returns the value of the field
     *
     * @param (string) stFieldName the field name whose value is being retrieved
     * @return the value of the field
     * @type string
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.getFieldValue = function RecordFromHole_getFieldValue(stFieldName)
    {
        return fieldMap[stFieldName];
    }
    
    /** 
     * Returns the internal id of the record
     *
     * @return the internal id of this record
     * @type string
     * @author Nestor M. Lim
     * @version 1.0
     */    
    this.getId = function RecordFromHole_getId()
    {
        return stRecordId;
    }
}

// Internal functions - DO NOT USE

/** 
 * Used internally by the String.cleanUpForDate method.
 *
 * @return /dd/
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function cleanUpDay(stComplete, stFirstRegExGroup)
{
    return '/' + stFirstRegExGroup.forceParseInt() + '/';
}