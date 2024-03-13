function ServerMergeAndSendEmail(type)
{
var record = nlapiGetNewRecord();
var author = nlapiGetUser();
var recipient = record.getFieldValue('contact');
	//var recipient = nlapiLoadRecord('contact', record);
var transid = record.getFieldValue('transaction');
var records = new Object();
records['transaction'] = transid;

if ((record.getFieldValue('custeventr7taskscript') == 1))
	{
	var emailBody = ('Thank you for your interest in our Rapid7 NeXpose Webinar!  Rapid7 is the industry leader for unified vulnerability assessment and we are excited to demonstrate this for you.  The Rapid7 Webinar runs from 11:00 AM PST until 12:00 PM PST every weekday. Feel free to invite other security professionals interested in vulnerability management.  You can register for this webinar by going to: www.rapid7.com/webinar  We recommend joining at least 5 minutes prior to the scheduled time to allow for any configuration issues with Live Meeting. Please call (310) 760-4640 if you require assistance.  Thank you.');
	nlapiSendEmail( author, 2226, 'Webinar Invitation', emailBody, null, null, records );
	record.setFieldValue('custeventr7taskscript','');
	}
}
