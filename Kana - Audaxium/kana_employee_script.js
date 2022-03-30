 /** 
Script		:kana_employee_script.js
Programmer		:Sagar Shah
Description		: Auto create the suggested password if it is empty
Date			: 01/08/2013
==================================================================================
Change ID		:RESET_PASSWORD
Programmer		:Sagar Shah
Description		: Changes:
					1. random password generation.
					2. Auto reset password 
					3. Send email to the employee
					
Date			: 05/01/2013
==================================================================================
**/


function pageInit() 
{	
	nlapiSetFieldValue('custentity_reset_password','F');
	calculatePassword();		
}

function calculatePassword() 
{
		var randomnumber=Math.floor(Math.random()*10000); //RESET_PASSWORD
		var initials = nlapiGetFieldValue('initials');
		var passwd = "NewKana"+initials.charCodeAt(0)+randomnumber+initials.charCodeAt(1);
		nlapiSetFieldValue('custentity_suggested_password',passwd);
}

function fieldChanged(type,name)
{
	if(name=='firstname' || name=='lastname')
		calculatePassword();
}
//RESET_PASSWORD - start
function saveRecord()
{
	try {
		
		resetPassword();
		
	} catch(exception) {
		alert('Error while resetting Employee Password : '+exception.toString());
	}
	return true;
}

function resetPassword()
{
		var resetPasswordFlag = nlapiGetFieldValue('custentity_reset_password');
		if(resetPasswordFlag!='T')
			return;
		
		calculatePassword();
		var passwd = nlapiGetFieldValue('custentity_suggested_password');
		if(passwd==null || passwd=='')
			return;
		
		nlapiSetFieldValue('requirepwdchange','T');
		nlapiSetFieldValue('password',passwd);
		nlapiSetFieldValue('password2',passwd);
		
		sendTempPasswordEmail();
		
		nlapiSetFieldValue('custentity_reset_password','F');
}

function sendTempPasswordEmail()
{
	var email = nlapiGetFieldValue('email');
	if(email==null || email=='')
		return;
		
	var body = 'Hi '+nlapiGetFieldValue('firstname')+',\n\n';
	body += '\t   You now have access to NetSuite with following details:\n\n';
	body += 'UserId : '+email+'\n';
	body += 'Temporary Password : '+nlapiGetFieldValue('custentity_suggested_password')+'\n';
	body += 'URL : https://system.netsuite.com\n\n';
	body += 'Let me know if you have any issues accessing NetSuite.\n';
	 
	var empInternalID = nlapiGetRecordId();
	var empRecord = new Object();
	empRecord['entity'] = empInternalID;
	
	if(empInternalID==-1) //new record
		nlapiSendEmail(nlapiGetUser(), email, 'NetSuite Access', body,null,null);
	else //existing record
		nlapiSendEmail(nlapiGetUser(), email, 'NetSuite Access', body,null,null,empRecord);
	
	alert('Password is reset and email sent to the employee.');
}
//RESET_PASSWORD - end
