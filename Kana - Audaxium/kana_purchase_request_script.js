/**
CHANGE HISTORY
==================================================================================
Change ID		:CH#SHIP_TO_LOCATION
Programmer		:Sagar Shah
Description		: Implement the flexibility to select Location
Date			: 02/24/2011
==================================================================================
Change ID		:CH#FIX_NS_BUG
Programmer		:Sagar Shah
Description		: Fix the issue of the location not getting automatically picked from the Employee record.
Date			: 02/24/2012==================================================================================
*/
function resetCopyParams()
{
	var budgetapproval="";
	var purchaseapproval="";
	var porodernumber=0;
	var purchaserequestnumber="";
	
	
	purchaserequestnumber = nlapiGetFieldValue('tranid');
	if(purchaserequestnumber == "To Be Generated"){
		nlapiSetFieldValue('custbody_purchasing_approval',0,false);
		//nlapiSetFieldValue('custbody_budget_approval',0,false);
		nlapiSetFieldValue('custbody_purchase_order_number','',false);
		nlapiSetFieldValue('custbody_vendor_quote','',false);
	}
	return true;
}

function saveRecord()
{	
	var budgetapproval="";
	var purchaseapproval="";
	var porodernumber=0;
	var purchaserequestnumber="";
	
	
	purchaserequestnumber = nlapiGetFieldValue('tranid');
	if(purchaserequestnumber == "To Be Generated"){
		nlapiSetFieldValue('custbody_purchasing_approval',0,false);
		//nlapiSetFieldValue('custbody_budget_approval',0,false);
		nlapiSetFieldValue('custbody_purchase_order_number','',false);
	}
	//var bret = checkSupervisor();
	//return bret;

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

function checkSupervisor()
{
	var supervisor="";
	supervisor = nlapiGetFieldValue('custbody_supervisor');
	if((supervisor == '') || (null == supervisor))
	{
		alert("Supervisor not setup for Employee. Contact Netsuite Administrator");
		return false;
	}
	return true;
}

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

		//deptValue = nlapiGetCurrentLineItemValue(type, 'department');
		//currentClass = nlapiGetCurrentLineItemText(type, 'class');

		if(kana_IsNull(currentClass)==false && currentClass.substr(0,14) == '200 DO NOT USE')
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

function validatelineOld(type, name)
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

		//alert(deptValue);
		//alert(currentClassValue);
		
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
	var sMarkup = '<html><head><title>Enter Custom Address</title></head><body><form name="addrform"><table><tr><td colspan="2">Please select a valid value in the "Ship To Location" under Address tab. For custom address use the below form: </td></tr><tr>	<td valign="top">Enter your custom Address:</td>	<td valign="top"><textarea rows="5" cols="25" id="customaddr" name="customaddr"></textarea></td></tr><tr>	<td><input type="button" value="Submit" name="Submit" onclick="copyAddrIntoParent();"/></td>	<td>&nbsp;</td></tr></table></form><script>function copyAddrIntoParent(){	window.opener.setCustomAddr(document.addrform.customaddr.value);	window.close();}</script></body></html>';
	addrWinDoc.document.write(sMarkup);
	addrWinDoc.focus();
}

window.setCustomAddr = function(custAddr) {
	nlapiSetFieldValue('shipaddress',custAddr);
}
function pageInit()
{
	
	var shipToLocation = nlapiGetFieldValue('custbody_ship_to_location');

	//CH#FIX_NS_BUG - start
	if(shipToLocation == null || shipToLocation == '') {
		//try to get the location info from the Employee record
		var empID = nlapiGetFieldValue('employee');
		if(empID != null && empID != '') {
			shipToLocation = nlapiLookupField('employee', empID, 'custentity_emp_location');
			nlapiSetFieldValue('custbody_ship_to_location',shipToLocation);
		}
	}
	//CH#FIX_NS_BUG - end

	if(shipToLocation != null && shipToLocation != '')
	{
		var locationRec = nlapiLoadRecord('customrecord_kana_locations',shipToLocation);
		var address = locationRec.getFieldValue('custrecord_location_addr');
		if(address != null && address != '') //Valid address
		{
				nlapiSetFieldValue('shipaddress',kanaStrReplaceAll(address,'<br>','\n'));
		}
		else
		{
			nlapiSetFieldValue('shipaddress','');
		}
	}
	else
	{
		nlapiSetFieldValue('shipaddress','');
	}
	//var emp = nlapiGetFieldValue('employee');
	//nlapiSetFieldValue('employee',emp);
	
	resetCopyParams();
}

function kanaStrReplaceAll(str1,strWhat,strWith)
{
	while(str1.indexOf(strWhat)!= -1)
	{
		str1 = str1.replace(strWhat,strWith);
	}
	return str1;
}
// CH#SHIP_TO_LOCATION - end