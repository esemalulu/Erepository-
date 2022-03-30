/** 
CHANGE HISTORY
==================================================================================
Change ID		:CH#RATEVAL1
Programmer		:Sagar Shah
Description		: Added a function to set the default value of the rate to 1
Date			: 01/31/2008		
==================================================================================
Change ID		:CH#SHIP_TO_LOCATION
Programmer		:Sagar Shah
Description		: Implement the flexibility to select Location
Date			: 02/24/2011
==================================================================================
**/

function validateline(type, name)
{
	var linecount=0;
	var dept ='';
	var currentClass = '';
	var sErrMsg='';
	var bret = true;
	var deptValue='';
	var currentClassValue='';
	
	linecount = nlapiGetCurrentLineItemIndex('item');
	
	for ( var i = 1; i <= linecount; i++) {
		dept = nlapiGetCurrentLineItemText(type, 'department');
		currentClass = nlapiGetCurrentLineItemText(type, 'class');

		deptValue = nlapiGetCurrentLineItemValue(type, 'department');
		currentClass = nlapiGetCurrentLineItemText(type, 'class');

		if(currentClass.substr(0,14) == '200 DO NOT USE')
		{
			sErrMsg = 'Class 200 is not active class';
			bret = false;
		}
		
	}
	if(bret == false){
		alert(sErrMsg);
	}
	
	return bret;
}

function oldvalidateline(type, name)
{
	var linecount=0;
	var dept ='';
	var currentClass = '';
	var sErrMsg='';
	var bret = true;
	var deptValue='';
	var currentClassValue='';
	
	linecount = nlapiGetCurrentLineItemIndex('item');

	for ( var i = 1; i <= linecount; i++) {
		dept = nlapiGetCurrentLineItemText(type, 'department');
		currentClass = nlapiGetCurrentLineItemText(type, 'class');

		deptValue = nlapiGetCurrentLineItemValue(type, 'department');
		currentClassValue = nlapiGetCurrentLineItemValue(type, 'class');
		
		if((dept == 'Sales and Service : 205 - Sales' || dept == 'Sales and Service : 210 - Global Inside Sales' || dept == 'Sales and Service : 215 - Globl Renewal Maint Sales' || dept == 'Sales and Service : 225 - Sales Engineering' || dept == 'Sales and Service : 230 - Alliances Partnerships' || dept == 'Sales and Service : 250 - Target Market Initiative' || dept == 'Sales and Service : 260 - Global Partners' || dept == 'Marketing : 315 - Corporate Marketing' || dept == 'Marketing : 320 - Product Marketing' || dept == 'Marketing : 330 - Marketing Services' || dept == 'Engineering : 410 - Shared Services' || dept == 'G&A : 170 - Alloc: EE Benefits' || dept == 'G&A : 120 - G&A - Admin Legal' || dept == 'Engineering : 420 - H2 Engineering' || dept == 'Engineering : 430 - H1 Engineering' || dept == 'Cost of Sales : 500 - Tech Support' || dept == 'Cost of Sales : 515 - Customer Experience MGMT' || dept == 'Cost of Sales : 560 - Royalty and Other COGS') && (currentClass != '100 License & Maintenance'))
		{
			//nlapiSetCurrentLineItemValue(type, 'class', '11');	//11 is '100 License & Maintenance'
			sErrMsg = 'Department = ' + dept + ' and Class = ' + currentClass + ' Combination is not valid';
			bret = false;
	
		}
		
		if((dept == 'Marketing : 317 - Corporate MKTG ProServ' || dept == 'Cost of Sales : 525 - Managed Services' || dept == 'Cost of Sales : 530 - Training' || dept == 'Cost of Sales : 540 - ProServ') && (currentClass != '200 Professional Services'))
		{
			//nlapiSetCurrentLineItemValue(type, 'class', '15');	//15 is '200
			sErrMsg = 'Department = ' + dept + ' and Class = ' + currentClass + ' Combination is not valid';
			bret = false;
		}
		
		if(dept == 'Cost of Sales' || dept == 'Engineering' || dept == 'G&A' || dept == 'Marketing' || dept == 'Sales and Service')
		{
			sErrMsg = 'Cannot post transaction to parent departments';
			bret = false;
		}

		if(bret == false){
			alert(sErrMsg);
			return false;
		}
		
	}
	
	return true;
}

// CH#SHIP_TO_LOCATION - start
function fieldChanged(type,name)
{
	//CH#RATEVAL1 - start

	if(type=='item' && name=='rate')
	{
		nlapiSetCurrentLineItemValue(type, name, '1.0',false);
	}
	//CH#RATEVAL1 - end

if(name == 'custbody_ship_to_location')
	{
		var shipToLocation = nlapiGetFieldValue('custbody_ship_to_location');
		if(shipToLocation != null && shipToLocation != '')
		{
			var locationRec = nlapiLoadRecord('customrecord_kana_locations',shipToLocation);
			var address = locationRec.getFieldValue('custrecord_location_addr');
			if(address == null || address == '') //Other - custom address
			{
				//ask for the custom address in a pop window and populate the same in shipaddress field.
				nlapiSetFieldValue('shipaddress','');
				getCustomAddress();
			}
			else 
			{
					nlapiSetFieldValue('shipaddress',kanaStrReplaceAll(address,'<br>','\n'));
			}
		}
		else
		{
			nlapiSetFieldValue('shipaddress','');
		}
	}
	return true;
}

function getCustomAddress()
{
	var addrWinDoc = window.open('','','width=600,height=200,titlebar=0,toolbar=0');
	var sMarkup = '<html><head><title>Enter Custom Address</title></head><body><form name="addrform"><table><tr>	<td valign="top">Enter your custom Address:</td>	<td valign="top"><textarea rows="5" cols="25" id="customaddr" name="customaddr"></textarea></td></tr><tr>	<td><input type="button" value="Submit" name="Submit" onclick="copyAddrIntoParent();"/></td>	<td>&nbsp;</td></tr></table></form><script>function copyAddrIntoParent(){	window.opener.setCustomAddr(document.addrform.customaddr.value);	window.close();}</script></body></html>';
	addrWinDoc.document.write(sMarkup);
	addrWinDoc.focus();
}

window.setCustomAddr = function(custAddr) {
	nlapiSetFieldValue('shipaddress',custAddr);
}
function pageInit()
{
	/*
	var shipToLocation = nlapiGetFieldValue('custbody_ship_to_location');
	if(shipToLocation == 8) //Other - custom address
	{
		nlapiSetFieldValue('custbody_ship_to_location','');
	}
	fieldChanged('','custbody_ship_to_location');
	var emp = nlapiGetFieldValue('employee');
	nlapiSetFieldValue('employee',emp);
	*/
}
function kanaStrReplaceAll(str1,strWhat,strWith)
{
	while(str1.indexOf(strWhat)!= -1)
	{
		str1 = str1.replace(strWhat,strWith);
	}
	return str1;
}
function saveRecord()
{	
	
//CH#SHIP_TO_LOCATION - start
	var shipToAddr = nlapiGetFieldValue('shipaddress');
	if(shipToAddr == null || shipToAddr=='')
	{
		//ask for the custom address in a pop window and populate the same in shipaddress field.
		nlapiSetFieldValue('shipaddress','');
		getCustomAddress();
		return false;
	}
	//CH#SHIP_TO_LOCATION - end

	return true;
}

// CH#SHIP_TO_LOCATION - end
