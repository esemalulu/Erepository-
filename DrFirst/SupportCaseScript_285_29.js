function sendCaseEmail(type)
{
        var currentRecord;
        var status;
        var emailaddress;
        var recordInternalID;
        recordInternalID = nlapiGetRecordId();
        var emailMessage;
        var emailSubject = 'Case Status Notification';

        //Mod Request: check to make sure type. if type is xedit, load the record
        if (type == 'xedit') {
        	currentRecord = nlapiLoadRecord(nlapiGetRecordType(), recordInternalID);
        } else {
        	currentRecord= nlapiGetNewRecord();
        }

         
        // Get the value of the Status 
        status = currentRecord.getFieldValue('status');
        // check if status is closed
        if ( status == '5')
        {
               emailMessage = nlapiMergeRecord( 16, 'supportcase',recordInternalID).getValue();                 
               // Get email address from the case 
               emailaddress = currentRecord.getFieldValue('email'); 
               if (emailaddress != '')
               {
               nlapiSendEmail( 150454, emailaddress, emailSubject, emailMessage, null); 
               }
        }
}