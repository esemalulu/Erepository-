var SALES_AUTO_OPTION_GENERAL = '7';
var SALES_AUTO_OPTION_PARTS = '2';
var SALES_AUTO_OPTION_SERVICE = '1';

//yes (there are a current owner)
function IsCurrentOwner()
{
	//disabled dropdown select fields background color does not change when disabled, so we manually change it
	document.getElementById("custentitygd_contact_marketingseries").style.backgroundColor = "transparent";
	document.getElementById("custentitygd_contact_marketingmodel").style.backgroundColor = "transparent";
	document.getElementById("custentitygd_contact_modelyear").style.backgroundColor = "transparent";
	
	//disable certain fields based on what the user selects for current owner
	var field = nlapiGetField('custentitygd_contact_marketingseries');
	field.setDisplayType('normal');
	field = nlapiGetField('custentitygd_contact_marketingmodel');
	field.setDisplayType('normal');
	field = nlapiGetField('custentitygd_contact_modelyear');
	field.setDisplayType('normal');
	field = nlapiGetField('custentitygd_contact_campingstyle');
	field.setDisplayType('normal');
	field = nlapiGetField('custentitygd_contact_makemodelintersted');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_workingwithdealer');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_timeframe');
	field.setDisplayType('disabled');
}

//no (they do not own a grand design unit)
function IsNotCurrentOwner()
{
	//disabled dropdown select fields background color does not change when disabled, so we manually change it
	document.getElementById("custentitygd_contact_marketingseries").style.backgroundColor = "rgb(235,235,228)";
	document.getElementById("custentitygd_contact_marketingmodel").style.backgroundColor = "rgb(235,235,228)";
	document.getElementById("custentitygd_contact_modelyear").style.backgroundColor = "rgb(235,235,228)";
	
	//disable certain fields based on what the user selects for current owner
	var field = nlapiGetField('custentitygd_contact_marketingseries');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_marketingmodel');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_modelyear');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_campingstyle');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_makemodelintersted');
	field.setDisplayType('normal');
	field = nlapiGetField('custentitygd_contact_workingwithdealer');
	field.setDisplayType('normal');
	field = nlapiGetField('custentitygd_contact_timeframe');
	field.setDisplayType('normal');
}

//default/null
function CurrentOwnerNotSet()
{
	//disabled dropdown select fields background color does not change when disabled, so we manually change it
	document.getElementById("custentitygd_contact_marketingseries").style.backgroundColor = "rgb(235,235,228)";
	document.getElementById("custentitygd_contact_marketingmodel").style.backgroundColor = "rgb(235,235,228)";
	document.getElementById("custentitygd_contact_modelyear").style.backgroundColor = "rgb(235,235,228)";
	
	//disable all of these fields to start
	var field = nlapiGetField('custentitygd_contact_marketingseries');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_marketingmodel');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_modelyear');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_campingstyle');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_makemodelintersted');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_workingwithdealer');
	field.setDisplayType('disabled');
	field = nlapiGetField('custentitygd_contact_timeframe');
	field.setDisplayType('disabled');
}

/**
 * Page Init function
 * creates a listener for the 'Current Owner' field
 * 
 */
function GD_OnlineForm_PageInit()
{
	var ddlIsOwner = document.getElementById("custentitygd_iscurrentowner");
	if(ddlIsOwner != null)
	{
		ddlIsOwner.onchange = onIsOwnerChanged;
		CurrentOwnerNotSet();
	}
	
	GD_OnlineForm_ChangeYesWording();
}

/**
 * Page Init function
 * creates a listener for the 'VIN' field
 * 
 */
function GD_OnlineForm_VIN_PageInit()
{
	var option = nlapiGetFieldValue('custentitygd_salesautomenuoption');
	if(option != SALES_AUTO_OPTION_GENERAL && option != SALES_AUTO_OPTION_PARTS && option != SALES_AUTO_OPTION_SERVICE)
	{
		var field = nlapiGetField('custentitygd_vinnumber_contact');
		field.setDisplayType('hidden');
	}
	else
	{
		var ddlIsOwner = document.getElementById("custentitygd_iscurrentowner");
		if(ddlIsOwner != null)
		{
			ddlIsOwner.onchange = onIsOwnerChangedForVIN;
			var field = nlapiGetField('custentitygd_vinnumber_contact');
			field.setDisplayType('disabled');
		}
	}
	
	GD_OnlineForm_ChangeYesWording();
}

function GD_OnlineForm_Save()
{
	var isOwner = nlapiGetFieldValue('custentitygd_iscurrentowner');
	if(isOwner == '1')//yes
	{
		var make = nlapiGetFieldValue('custentitygd_contact_marketingseries');
		var model = nlapiGetFieldValue('custentitygd_contact_marketingmodel');
		var year = nlapiGetFieldValue('custentitygd_contact_modelyear');
		var campingStyle = nlapiGetFieldValue('custentitygd_contact_campingstyle');
		//check that make, model, year and camping style are set
		if(make != null && make != '' && model != null && model != '' &&
				year != null && year != '' && campingStyle != null && campingStyle != '')
		{
			return true;
		}
		else
		{
			alert('Please make sure that you have answers to: Make, Model, Year and \"What camping style are you planning to do?\"');
			return false;
		}
	}
	else if(isOwner == '2')//no
	{
		var makeModel = nlapiGetFieldValue('custentitygd_contact_makemodelintersted');
		var dealerShip = nlapiGetFieldValue('custentitygd_contact_workingwithdealer');
		var timeFrame = nlapiGetFieldValue('custentitygd_contact_timeframe');
		//check that make, model, year and camping style are set
		if(makeModel != null && makeModel != '' && dealerShip != null && dealerShip != '' && timeFrame != null && timeFrame != '')
		{
			return true;
		}
		else
		{
			alert('Please make sure that you have answers to: "What Make/Model are you interested in?", "What dealership are you currently working with?" and "In what time frame are you looking to purchase?"');
			return false;
		}
	}
	
	if (nlapiGetFieldValue('email') != nlapiGetFieldValue('custentitygd_verifyemail'))
	{
		alert('Emails do not match.');
		return false;
	}
	
	return true;
}

function GD_OnlineForm_VIN_Save()
{
	var option = nlapiGetFieldValue('custentitygd_salesautomenuoption');
	if(option == SALES_AUTO_OPTION_GENERAL || option == SALES_AUTO_OPTION_PARTS || option == SALES_AUTO_OPTION_SERVICE)
	{
		var isOwner = nlapiGetFieldValue('custentitygd_iscurrentowner');
		if(isOwner == '1')//yes
		{
			var vin = nlapiGetFieldValue('custentitygd_vinnumber_contact');
			//check that make, model, year and camping style are set
			if(vin == null || vin == '')
			{
				alert('Please fill in your VIN.');
				return false;
			}
		}
	}
	
	if (nlapiGetFieldValue('email') != nlapiGetFieldValue('custentitygd_verifyemail'))
	{
		alert('Emails do not match.');
		return false;
	}
	
	return true;
}

function GD_OnlineForm_EmailSave()
{
	if (nlapiGetFieldValue('email') != nlapiGetFieldValue('custentitygd_verifyemail'))
	{
		alert('Emails do not match.');
		return false;
	}
	
	return true;
}

/**
 * Changes the wording of the Yes/No dropdown to have the Yes option be
 * Yes / Have One on Order
 */
function GD_OnlineForm_ChangeYesWording()
{
	//Change the wording of the drop-down for whether or not they're a current GD owner.
	var isCurrentOwnerDropDown = document.getElementById('custentitygd_iscurrentowner');
	var selectOptions = isCurrentOwnerDropDown.getElementsByTagName('option');
	for (var i = 0; i < selectOptions.length; i++)
	{
		if (selectOptions[i].getAttribute('value') == 1)
		{
			selectOptions[i].textContent = 'Yes / Have One On Order';
		}
	}
}

//field change event for 'Current Owner'
function onIsOwnerChanged()
{
	var ddlIsOwner = document.getElementById("custentitygd_iscurrentowner");
	if(ddlIsOwner !=null)
	{
		var selectedOption = ddlIsOwner.options[ddlIsOwner.selectedIndex].value;
		if(selectedOption == '1')//yes
		{
			IsCurrentOwner();
		}
		else if(selectedOption == '2')//no
		{
			IsNotCurrentOwner();
		}
		else
		{
			CurrentOwnerNotSet();
		}
	}
}

//field change event for 'Current Owner'
function onIsOwnerChangedForVIN()
{
	var ddlIsOwner = document.getElementById("custentitygd_iscurrentowner");
	if(ddlIsOwner != null)
	{
		var selectedOption = ddlIsOwner.options[ddlIsOwner.selectedIndex].value;
		if(selectedOption == '1')//yes
		{
			var field = nlapiGetField('custentitygd_vinnumber_contact');
			field.setDisplayType('normal');
		}
		else if(selectedOption == '2')//no
		{
			var field = nlapiGetField('custentitygd_vinnumber_contact');
			field.setDisplayType('disabled');
		}
		else
		{
			var field = nlapiGetField('custentitygd_vinnumber_contact');
			field.setDisplayType('disabled');
		}
	}
}
