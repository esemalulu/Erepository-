function MergeAndSendEmail()
{
var author = nlapiGetUser();
var recipient = nlapiGetFieldValue('contact');
var transid = nlapiGetFieldValue('transaction');
var records = new Object();
records['transaction'] = transid;
if ((nlapiGetFieldText('custeventr7taskemailtemplate') == "171 - Webinar Invitation"))
	{
	var emailBody = ('Thank you for your interest in our Rapid7 NeXpose Webinar!  Rapid7 is the industry leader for unified vulnerability assessment and we are excited to demonstrate this for you.  The Rapid7 Webinar runs from 11:00 AM PST until 12:00 PM PST every weekday. Feel free to invite other security professionals interested in vulnerability management.  You can register for this webinar by going to: www.rapid7.com/webinar  We recommend joining at least 5 minutes prior to the scheduled time to allow for any configuration issues with Live Meeting. Please call (310) 760-4640 if you require assistance.  Thank you.');
	nlapiSendEmail( author, recipient, 'Webinar Invitation', emailBody, null, null, records );
	nlapiSetFieldText('custeventr7taskemailtemplate','');
	}
{ return confirm("Are you sure you want to save this record?");}
}