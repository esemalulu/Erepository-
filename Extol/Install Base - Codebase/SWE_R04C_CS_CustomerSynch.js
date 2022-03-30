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
 * This synchronizes the customer's Product/Install Base records as well as end dates.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */

function main_ClientScript() {

    if (!confirm('Please make sure to save any changes made before proceeding. Do you want to continue?')) {
        return;
    }
    
    var stCurCustomerId = nlapiGetFieldValue('id');
    
    var params = '';        
    params += "&custscript_cust_to_process="+ encodeURI( stCurCustomerId );

    xmlHttp = GetXmlHttpObject();
    if (xmlHttp == null) { alert('Browser does not support HTTP Request.'); return; }

    var suiteletUrl = nlapiResolveURL('SUITELET', 'customscript_customer_synch_suitelet', 'customdeploy_customer_synch_suitelet');
    xmlHttp.open("POST", suiteletUrl, true);
    xmlHttp.setRequestHeader('Content-type', "application/x-www-form-urlencoded");
    xmlHttp.setRequestHeader("Content-length", params.length);
    xmlHttp.setRequestHeader("Connection", "close");
    xmlHttp.send(encodeURI(params));

    var stCustURL = nlapiResolveURL('RECORD', 'customer', stCurCustomerId);
    alert('Synchronization process has now started. Please monitor progress via the Schedule Script Status Page. Please wait while page is being redirected.');
    window.location = stCustURL;
}

function main_Suitelet(request, response) {
    nlapiLogExecution('AUDIT', 'main_Suitelet', '=== START main_Suitelet ===');

    var params = [];
    params['custscript_cust_to_process'] = decodeURI(request.getParameter('custscript_cust_to_process'));

    nlapiLogExecution('AUDIT', 'main_Suitelet', '1 --> params:[' + params['custscript_cust_to_process'] +']');
    nlapiScheduleScript('customscript_full_synch', null, params );
    nlapiLogExecution('AUDIT', 'main_Suitelet', '2 --> params:[' + params +']');
    
    nlapiLogExecution('AUDIT', 'main_Suitelet', '=== AUDIT main_Suitelet ===')
}

function GetXmlHttpObject(handler) {
    var objXMLHttp = null
    if (window.XMLHttpRequest) { 
        objXMLHttp = new XMLHttpRequest(); 
    } else {
        if (window.ActiveXObject) { objXMLHttp = new ActiveXObject("Msxml2.XMLHTTP"); }
    }
    return objXMLHttp;
}


