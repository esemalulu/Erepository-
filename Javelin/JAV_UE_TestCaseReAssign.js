function beforeSubmitProcessing(type) {

    log('beforeSubmitProcessing','Case processing beginning, Type =' + type);
    // If the type of user event is a grab event
    if (type == 'reassign') {
        // get the ID of the current Netsuite user who clicked grab
        var userID = nlapiGetUser();
        log('beforeSubmitProcessing', 'userID = ' + userID);

        // If user is Barb Johnson, delete the case - means that she has processed pardot opportunity that had a script error.
        if (userID == 503936) {
            deleteCase();
        } else {  // for all other users send an assignement notification
            log('beforeSubmitProcessing','Success - Case Re-assigned');

            var reassignMessage = getMessage(userID);
            //var currentRecord = nlapiGetNewRecord();

            //currentRecord.setFieldValue('outgoingmessage', reassignMessage);
            //currentRecord.setFieldValue('emailform', 'T');


            nlapiSetFieldValue('outgoingmessage', reassignMessage);
            nlapiSetFieldValue('emailform', 'T');
            nlapiSetFieldValue('internalonly', 'F');
        }
    }
}

function getMessage(userID) {

    var contactID = nlapiGetFieldValue('contact');
    log('getMessage', 'ContactID= ' + contactID);


    // If there is a contact record attached, look up the first name, change to proper case and add a leading space, otherwise contactFirstName is blank
    var contactFirstName = (contactID == null ? '' : (' ' + toTitleCase(nlapiLookupField('contact', parseInt(contactID), 'firstname'))));
    var assignedToFirstName = nlapiLookupField('employee', userID, 'firstname');
    var assignedToFullName = assignedToFirstName + ' ' + nlapiLookupField('employee', userID, 'lastname');

    // Build the message HTML
    var msg = 'Hello' + contactFirstName + ',<br><br>';
    msg += 'My name is ' + assignedToFirstName + ' and ';
    msg += "I've been assigned to your support case. I'm reviewing it now and will have an update for you shortly.<br><br>";
    msg += 'If you have any further information for me, please reply to this email and include it.<br><br>If this case is time-sensitive, ';
    msg += 'please call our support help desk, reference this CASE ID and ask for me.<br>';
    msg += '<br>Regards,<br><br>' + assignedToFullName + '<br>';
    //log('getMessage', 'messeage= ' + msg);
    return msg;
}   


function deleteCase() {
    var caseID = nlapiGetRecordId();
    var recType = nlapiGetRecordType();
    var inboundEmail = nlapiGetFieldValue('email');
    if (inboundEmail == 'info@pardot.com') {
        try {
            // DELETE CASE RECORD
            log('Deleting Case', 'Attempting to delete case record: ' + caseID);
            nlapiDeleteRecord(recType, caseID);
            log('Deleting Case', 'Delete case sussessful, forwarding to case list');
            var response = nlapiRequestURL('https://system.netsuite.com/app/crm/support/caselist.nl');
        }
        catch (err) {
            log('Deleting Case', 'Error deleting case record: ' + caseID);
        }
    }
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); } );
}

function log(title, details) {
    nlapiLogExecution('DEBUG',title,details);
}

