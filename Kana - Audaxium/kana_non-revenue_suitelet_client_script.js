	 /** 
Change ID		:CH#PHASE II = Order Management
Programmer		:Sagar Shah
Description		: Create Non-Revenue Order Entry screen. This page would be initiated from the SugarCRM application.
Date			: 04/19/2010	
**/

function fieldChanged(type,name)
{
	if(name == 'custpage_item') {
		var cur_item = nlapiGetCurrentLineItemValue(type, 'custpage_item');
	
		//Get current Item Description, Product Family & Item Category
		nlapiSetFieldValue('custpage_hiddenitemlist',cur_item);

		var itemdetailtmp = nlapiGetFieldText('custpage_hiddenitemlist');

		if(itemdetailtmp != '' || itemdetailtmp != null )
		{
			var itemdetail = itemdetailtmp.split('|');
			nlapiSetCurrentLineItemValue(type, 'custpage_itemdescription', itemdetail[1]);
			nlapiSetCurrentLineItemValue(type, 'custpage_itemproductfamily', itemdetail[2]);
			nlapiSetCurrentLineItemValue(type, 'custpage_itemcategory', itemdetail[3]);
		}
	} 

	if(name == 'custpage_kanacontactname') {
		var cur_emp = nlapiGetFieldValue('custpage_kanacontactname');
	
		//Get selected KANA Contact Name, Email and Phone
		nlapiSetFieldValue('custpage_hiddenemployeelist',cur_emp);

		var empdetailtmp = nlapiGetFieldText('custpage_hiddenemployeelist');

		if(empdetailtmp != '' || empdetailtmp != null )
		{
			var empdetail = empdetailtmp.split('|');
			if(empdetail[1] != '' || empdetail[1] != null)
				nlapiSetFieldValue('custpage_kanacontactemail', empdetail[1]);
			if(empdetail[2] != '' || empdetail[2] != null)
				nlapiSetFieldValue('custpage_kanacontactphone', empdetail[2]);
		}
	} 

	if(name == 'custpage_customer') {
		var cur_cust = nlapiGetFieldValue('custpage_customer');
	
		//Get selected Customer ID and Subsidiary
		nlapiSetFieldValue('custpage_hiddencustomerlist',cur_cust);
		nlapiSetFieldValue('custpage_customer_id', cur_cust);

		var subsidiary = nlapiGetFieldText('custpage_hiddencustomerlist');

		if(subsidiary != '' || subsidiary != null )
		{
				nlapiSetFieldValue('custpage_subsidiary', subsidiary);
		}
	} 

}

function saveRecord()
{

	if(nlapiGetFieldValue('custpage_customer')==-1) {
		alert('Please select valid Customer');
		return false;
	}
	if(nlapiGetFieldValue('custpage_kanacontactname')==-1) {
		alert('Please select valid KANA Contact');
		return false;
	}
	if(nlapiGetLineItemValue('custpage_itemsublist', 'custpage_item',1)==-1) {
		alert('Please select valid Item');
		return false;
	}
		
	var itemIDList='';	
	var itemCount = nlapiGetLineItemCount('custpage_itemsublist');
	if(itemCount ==0) {
			alert('You must enter at least one Line Item.');
			return false;
	}

	for ( var i = 1; i <= itemCount; i++) 
	{	
		var itemInternalID = nlapiGetLineItemValue('custpage_itemsublist', 'custpage_item', i);
		if(itemInternalID==-1)
			continue;
		var itemDesc = nlapiGetLineItemValue('custpage_itemsublist', 'custpage_itemdescription', i);
		itemIDList += itemInternalID+':::'+itemDesc+':::';

	}//end for loop
	nlapiSetFieldValue('custpage_hiddenitemselected',itemIDList);

	return true;
}

function pageInit()
{
	//reset default values
	//nlapiSetFieldValue('custpage_customer','-1');
	nlapiSetFieldValue('custpage_kanacontactname','-1');
	nlapiSetFieldValue('custpage_item','-1');
	nlapiSetFieldValue('custpage_kanacontactemail','');
	nlapiSetFieldValue('custpage_kanacontactphone','');

	//disable all hyperlinks except KANA IT
	/*
	for(var index=0; index<document.links.length; index++) {
		if(document.links[index].href=="mailto:netsuitehelpdesk@kana.com")
			continue;
		document.links[index].onclick=function (){return false;};
		document.links[index].href="#";
	}
	*/
}

