/**
 * In NetSuite Debugger
 * 	require(['N/email']
 * 
 * In Normal Execution
 * 	define(['N/email']
 * 
 * This sample script is related specifically for N/email module. 
 * _file represents module required/defined and passed in as object by NetSuite
 */
require(['N/email'],

function(_email) 
{
	/**
	 * Object Properties when building Related Record JSON Object
	 * 		
	 */
	var relatedRecordJson = {
		'transactionId':'123', //Internal ID of transaction
		'activityId':'123', //Internal ID of activity type record: phone call, tasks, events, etc...'
		'entityId':'123', //Internall ID of entity type record: customer, contact, employee, etc...'
		'customRecord':{
			'id':'123', //Internal ID of custom record ID to attach to
			'recordType':'custrecord_test' //Internal ID of the cusutom Record ID
		}
	};
	
	//1. Send email WITH Bounce Back Notification
	/**
	 * Options for sending email
	 * 		author
	 * 		recipients
	 * 		replyTo
	 * 		cc
	 * 		bcc
	 * 		subject
	 * 		body
	 * 		attachments
	 * 		relatedRecords
	 * 		isInternalOnly
	 */
	//SuiteScript 1.0
	//nlapiSendEmail() with notifySenderOnBounce parameter as TRUE
	_email.send({
		'author':-5,
		'recipients':123, //Internal ID of NetSuite entity record 
		'subject':'Hello world I am 2 Sweet!',
		'body':'Saying HELLO!',
		'relatedRecords':relatedRecordJson
	});
	
	
	//2. Send email WITHOUT Bounce Back Notification
	/**
	 * Options for sending email
	 * 		author
	 * 		recipients
	 * 		replyTo
	 * 		cc
	 * 		bcc
	 * 		subject
	 * 		body
	 * 		attachments
	 * 		relatedRecords
	 * 		isInternalOnly
	 */
	//SuiteScript 1.0
	//nlapiSendEmail() with notifySenderOnBounce parameter as FALSE
	_email.sendBulk({
		'author':-5,
		'recipients':123, //Internal ID of NetSuite entity record 
		'subject':'Hello world I am 2 Sweet!',
		'body':'Saying HELLO!',
		'relatedRecords':relatedRecordJson
	});
	
	
	//3. Send Campaign Event Email
	/**
	 * Options for sending email
	 * 		campaignEventId
	 * 		recipientId
	 */
	//SuiteScript 1.0
	//nlapiSendCampaignEmail()
	_email.sendCampaignEvent({
		'campaignEventId':1234, //Internal ID of campaign Event 
		'recipientId':123, //Internal ID of NetSuite entity record 
	});
	
	
	//Depending on what script you are building,
	//	below section will return specific entry functions
    return {
    	
    };
    
});
