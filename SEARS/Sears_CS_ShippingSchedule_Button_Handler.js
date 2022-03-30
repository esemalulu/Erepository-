/**
 * Sears_CS_ShippingSchedule_Button_Handler.js
 * Button Handler - Schedule Shipping button
 *
 * Version		Date			Author			Remarks
 * 1.0			15 Feb 2017		Rajive Gandhi	Schedule Shipping Button handler, for enabling disabling according to big item availability.
 * 1.1			17 Feb 2017		Manikandan 		Enabling and disabling for secondary button fix
 */
 
var hasBigItem = false;
var isEnabled = false;

/* page load actions*/
function pageInit(){
	NS.jQuery("#item_addedit").click(function(){
		processSSButton();
	});

	NS.jQuery("#item_remove").click(function(){
		processSSButton();
	});
}

/* decide whether to enable or disable Schedule Shipping button*/
function processSSButton(){
	console.log('processSSButton');
	hasBigItem = false;
	for(var i = 1; i <= nlapiGetLineItemCount('item'); i++){
		if(nlapiGetLineItemValue('item', 'custcol_bigticket', i) == "T"){
			hasBigItem = true;
			break;
		}
	}
	if(hasBigItem){console.log('hasBigItem');
		/*if(!isEnabled) */enableSSButton();
	}else{console.log('hasBigItem no');
		/*if(isEnabled) */disableSSButton();
	}
}

/* disable Schedule Shipping button*/
function disableSSButton(){
	console.log('disableButton');
	NS.jQuery('#custpagebtn_schedshipping').attr("disabled", "disabled");
	NS.jQuery('#secondarycustpagebtn_schedshipping').attr("disabled", "disabled");
	NS.jQuery('#custpagebtn_schedshipping').parent('td').parent('tr').addClass('pgBntGDis').removeClass('pgBntG');
	NS.jQuery('#secondarycustpagebtn_schedshipping').parent('td').parent('tr').addClass('pgBntGDis').removeClass('pgBntG');
	isEnabled = false;
}

/* enable Schedule Shipping button*/
function enableSSButton(){
	console.log('enableButton');

	NS.jQuery('#custpagebtn_schedshipping').removeAttr("disabled");
	NS.jQuery('#secondarycustpagebtn_schedshipping').removeAttr("disabled");
	NS.jQuery('#custpagebtn_schedshipping').parent('td').parent('tr').addClass('pgBntG').removeClass('pgBntGDis');
	NS.jQuery('#secondarycustpagebtn_schedshipping').parent('td').parent('tr').addClass('pgBntG').removeClass('pgBntGDis');
	isEnabled = true;
}