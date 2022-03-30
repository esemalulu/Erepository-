/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#SET_DEFAULT_SUBSIDIARY
Programmer		:Sagar Shah
Description		: Set default subsidiary value to 'Kana Software Inc' when created by Pardot
Date			: 04/02/2012
=========================================================================================
Change ID		:CH#LOGIC_FOR_CIBOODLE
Programmer		:Sagar Shah
Description		: Add Ciboodle related subsidiaries
Date			: 09/18/2012
=========================================================================================
Change ID		:CH#LOGIC_FOR_TRINICOM
Programmer		:Sagar Shah
Description		: Add Ciboodle related subsidiaries
Date			: 01/01/2013
=========================================================================================
Change ID		:CH#ADD_SA_N_INDONESIA
Programmer		:Sagar Shah
Description		: Add South Africa and Indonesia based on Jeff's directive
Date			: 01/29/2013
=========================================================================================
Change ID		:CH#REPLACE_WITH_SUBID
Programmer		:Sagar Shah
Description		: Replace subsidiary with IDs to remove name dependency
Date			: 08/05/2013
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function beforeSubmit(type)
{
   var currRecord;
	try	{
	   currRecord = nlapiGetNewRecord();
		if(currRecord==null)
			return;
	} catch (exception)	{
		return;
	}

	//update default subsidiary to KANA Software Inc
   var entityId = currRecord.getFieldValue('entityid');
	var companyName = currRecord.getFieldValue('companyname');
	var country = currRecord.getFieldValue('billcountry');
	var pardotClass = currRecord.getFieldText('custentity_pardot_class');//CH#LOGIC_FOR_CIBOODLE

	if ('To Be Generated'==entityId || null==entityId)
	{		
		var gtmTheme = currRecord.getFieldText('custentity_pardot_gtm_theme');
		var subsidiary = getSubsidiaryValue(country,gtmTheme,pardotClass);
		//currRecord.setFieldValue('subsidiary',subsidiary);
		
		nlapiSetFieldValue('subsidiary',subsidiary);
		
		nlapiLogExecution ('DEBUG', 'setting default subsidiary for', subsidiary+':'+country+':'+companyName);
	}	
}

function auxAfterSubmit(type)
{
	
	if (type != 'create') {
		return;
	}
	
   var currRecord;
	try	{
	   currRecord = nlapiGetNewRecord();
		if(currRecord==null)
			return;
	} catch (exception)	{
		return;
	}

	//update default subsidiary to KANA Software Inc
	var entityId = currRecord.getFieldValue('entityid');
	var companyName = currRecord.getFieldValue('companyname');
	var country = currRecord.getFieldValue('billcountry');
	nlapiLogExecution('debug','1st country attempt',country);
	var pardotClass = currRecord.getFieldText('custentity_pardot_class');//CH#LOGIC_FOR_CIBOODLE

	var proclog = 'Country Value of '+country+' aquired via billcountry';
	
	if (!country) {
		//grab billing address line
		var billaddrline = currRecord.findLineItemValue('addressbook', 'defaultbilling', 'T');
		if (billaddrline > 0) {
			nlapiLogExecution('debug','bill address',billaddrline);
			//grab country
			
			//11/24/2014 - Work around to after SUDDEN Failure on getting country value
			currRecord.selectLineItem('addressbook', billaddrline);
			country = currRecord.getCurrentLineItemValue('addressbook', 'country');
			
			nlapiLogExecution('debug','2nd country attempt',country);
			
			//Use country_initialvalue
			country = currRecord.getLineItemValue('addressbook','country_initialvalue', billaddrline);
			nlapiLogExecution('debug','3rd country attempt',country);
			
			country = currRecord.getLineItemValue('addressbook', 'country', billaddrline);
			nlapiLogExecution('debug','4th country attempt',country);
			
			country = nlapiGetLineItemValue('addressbook', 'country', billaddrline);
			nlapiLogExecution('debug','5th country attempt',country);
			
			//NS 
			var addrLineSubRec = nlapiViewLineItemSubrecord('addressbook', 'addressbookaddress', billaddrline);
			country = addrLineSubRec.getFieldValue('country');
			nlapiLogExecution('debug','6th NS Sub Record country attempt',country);
			
			
			nlapiLogExecution('debug','address line search country',country);
			if (country) {
				proclog = 'Country Value of '+country+' aquired via accessing Address Sublist';
			} else {
				proclog = 'Unable to get Country Value even via access to Address Sublist';
			}
		} else {
			proclog = 'Billing Address NOT Set after checking via Address Sublist';
		}
	}
	
	var gtmTheme = currRecord.getFieldText('custentity_pardot_gtm_theme');
	var subsidiary = getSubsidiaryValue(country,gtmTheme,pardotClass);
	
	nlapiLogExecution('debug','After Submit fired for '+type,'Country: '+country+' // subsidiary: '+subsidiary);
	
	//resubmit it
	nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'subsidiary', subsidiary, false);
	
	//nlapiLogExecution ('DEBUG', 'setting default subsidiary for', subsidiary+':'+country+':'+companyName);
	
	//TESTING
	nlapiSendEmail(-5, 'joe.son@audaxium.com', 'After Submit Subsidiary fired', 'Record ID: '+nlapiGetRecordId()+' // Country: '+country+' // Subsidiary: '+subsidiary+'<br/><br/>'+proclog, null, null,null,null);
		
}

function getSubsidiaryValue(country,gtmTheme,pardotClass) {
	var subsidiary=null;
	
	/* since the ciboodle subs are going away in 2 months Jeff approved not to use them at all
	//CH#LOGIC_FOR_CIBOODLE - start

	if(pardotClass=='600 Ciboodle') {
		switch(country) {
			case "GB": subsidiary='Kana Software Inc : Ciboodle UK';
									  break;
			case "US": subsidiary='Kana Software Inc : Ciboodle US';
									  break;
			case "ZA": subsidiary='Kana Software Inc : Ciboodle South Africa';
									  break;
			case "NZ": subsidiary='Kana Software Inc : Ciboodle New Zealand';
									  break;
			case "AU": subsidiary='Kana Software Inc : Ciboodle Australia';
									  break;
			case "ID": subsidiary='Kana Software Inc : Ciboodle Indonesia';
									  break;
			case "NL": subsidiary='Kana Software Inc : Ciboodle Netherlands';
									  break;
			default: subsidiary='Kana Software Inc : Ciboodle Ireland';								  

		}//end switch

		return subsidiary;
	}
	//CH#LOGIC_FOR_CIBOODLE - end
*/
	switch(country) {
		//CH#LOGIC_FOR_TRINICOM - start
		case "LU":
		case "BE": subsidiary=35;//'Kana Software Inc : Kana Belgie NV'
				   break;

		case "DE": subsidiary=37;//'Kana Software Inc : Trinicom Deutschland GmbH'; 
					break;

		case "NL": subsidiary=33;//'Kana Software Inc : Kana Benelux BV'; 
				break;
				
		//CH#LOGIC_FOR_TRINICOM - end
		
		case "CA": subsidiary=22;//'Kana Software Inc : Lagan Technologies (Canada) Inc';  
				break;

		case "NZ":
		case "AU": subsidiary=44;//'Kana Software Inc : Ciboodle Australia'; 
				break; //CH#LOGIC_FOR_TRINICOM
								  
		case "JP": subsidiary=12;//'Kana Software Inc : Kana Software Japan';  
				break;

		case "US":  subsidiary=1;//'Kana Software Inc'; 
				break;

		//CH#ADD_SA_N_INDONESIA - starts
		
		case "ZA": subsidiary=42;//'Kana Software Inc : Ciboodle South Africa'; 
				break;

		case "ID": subsidiary=45;//'Kana Software Inc : Ciboodle Indonesia'; 
				break;

		//CH#ADD_SA_N_INDONESIA - ends

		default: subsidiary=27;//'Kana Software Inc : Kana Software Ireland Limited';								  

	}//end switch

	return subsidiary;
}