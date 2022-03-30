/*
 ***********************************************************************
 *
 * The following javascript code is created by ERP Guru,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intented for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": ERP Guru shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company: ERP Guru
 * Author: 	Kenny.dumaine@erpguru.com
 * File: 	AX_SUE_SetOriginFromMessage.js
 * Date: 	April 14th 2010
 *
 ***********************************************************************/
/** On after Submit, when creating a Case. The script looks at the incoming message to find if it comes from a web form.
 * If yes, it sets the support case origin as Web Form.
 *
 * @param {Object} type
 */
var WEB_FORM_ORIGIN = -5;
function afterSubmitOriginFinding(type){
    nlapiLogExecution("DEBUG", "Type", type);
    if (type == 'create') {
        nlapiLogExecution('DEBUG', 'Create', 'Message');
        //Check Incoming Message
        if (isMessageFromOnlineForm()) {
            nlapiLogExecution('DEBUG', 'Online Form', 'True');
            var caseID = nlapiGetRecordId();
            //Check The Origin set on the Support Case
            if (!isOriginFromForm()) {
                nlapiLogExecution('DEBUG', 'Origin', 'Not From Form');
                //Set Web Form Origin
                setOriginOnCase(caseID);
            }
        }
    }
}

/**
 * This function check if the incoming message contains a certain string.
 */
function isMessageFromOnlineForm(){
    var message = nlapiGetFieldValue('incomingmessage');
    return message.indexOf('<--Problem report from web-->') != -1;
}

/**
 * This function checks if the Origin of the Case is Web Form.
 * @param {Object} caseID
 */
function isOriginFromForm(){
    return nlapiGetFieldValue('origin') == WEB_FORM_ORIGIN;
}

/**
 * Set the Origin on the support case as Web Form.
 * @param {Object} caseID
 */
function setOriginOnCase(caseID){
    nlapiSubmitField('supportcase', caseID, 'origin', WEB_FORM_ORIGIN);
}
