/*
* Formats website UI to be functioning and appealing for both ie and chrome.
* The website does not have the new ui and it is unusable
* in IE if html 5 doc type is not specified on the website.
* When html5 doc type is specified, the site is usable but it does not look as professional site.
* This scripts formats the styles to make the site professional and apply any other scriptable settings such as 
* hiding any payment methods except Invoice.
*/
function ApplyWebsiteCustomSettingsAndFormat(jQuery)
{	
	//********** Format checkboxes for IE ************
	//Note: Chrome renders the checkboxes fine, but IE seems to be stacking the checkboxes and the images applied to the checkbox.
    var ua = window.navigator.userAgent;
    var old_ie = ua.indexOf('MSIE');
    var new_ie = ua.indexOf('Trident/');
    
    if ((old_ie > -1) || (new_ie > -1)) //It is ie 10 or older, or ie 11 or newer.
	{
		var chkb_imgs = jQuery('input[type=checkbox]');
		if(chkb_imgs != null)
		{
			for(var i = 0; i < chkb_imgs.length; i++)
			{
				chkb_imgs[i].style['visibility'] = 'hidden';
			}
		}
    }
	//********** End format checkboxes for IE **********
	
   //************ Format sign out + portlet areas borders ************//
    //top and bottom
	var space_imgs = jQuery("td[background^='/images/store/templates/005/']");
	if(space_imgs  != null)
	{
		for(var i = 0; i < space_imgs.length; i++)
		{
			space_imgs[i].style['visibility'] = 'hidden';
		}
	}
	

	//content area lines
	space_imgs = jQuery("img[src^='/images/store/templates/005/prt2_']");
	if(space_imgs  != null)
	{
		for(var i = 0; i < space_imgs.length; i++)
		{			
			space_imgs[i].style['visibility'] = 'hidden';		
		}
	}
	
	//product catalog drill down items
	space_imgs = jQuery("img[src^='/images/store/templates/005/prt_']");
	if(space_imgs  != null)
	{
		for(var i = 0; i < space_imgs.length; i++)
		{			
			space_imgs[i].style['visibility'] = 'hidden';		
		}
	}
	
	//more drill down
	space_imgs = jQuery("img[src$='/images/store/templates/common/spacer.gif']");		
	if(space_imgs  != null)
	{
		for(var i = 0; i < space_imgs.length; i++)
		{			
			var parentTD = jQuery(space_imgs[i]).parent('td');
			if(parentTD != null)
			{				
				parentTD.css('backgroundImage','none'); //remove background image
			}
		}
	}
   //************End formating sign out + portlet areas borders *******//
	
	
   //********** Format sublist buttons ***********
		//We use jquery to do this, reference is added in website theme.
		var tdsToClearClasses = jQuery(".bntBot");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		
		tdsToClearClasses = jQuery(".bntTop");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		
		tdsToClearClasses = jQuery(".bntRS");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		
		tdsToClearClasses = jQuery(".bntLS");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}	
		
		tdsToClearClasses = jQuery(".bntRT");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		
		tdsToClearClasses = jQuery(".bntRB");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		tdsToClearClasses = jQuery(".bntLT");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		
		tdsToClearClasses = jQuery(".bntLB");				
		if(tdsToClearClasses != null)
		{
			for(var i = 0; i < tdsToClearClasses.length; i++)
			{
				tdsToClearClasses[i].className = "";
			}					
		}
		
		//Add padding on sublist add, cancel and remove buttons.
		//add button
		var sublist_button_tds = jQuery(".uir-addedit.bntBg");
		if(sublist_button_tds != null)
		{
			for(var i = 0; i < sublist_button_tds.length; i++)
			{
				sublist_button_tds[i].style.paddingTop = '10px';
				sublist_button_tds[i].style.paddingBottom = '10px';
				sublist_button_tds[i].style.paddingLeft = '10px';
				sublist_button_tds[i].style.paddingRight = '10px';
			}
		}
		//cancel button
		sublist_button_tds = jQuery(".uir-clear.bntBg");
		if(sublist_button_tds != null)
		{
			for(var i = 0; i < sublist_button_tds.length; i++)
			{
				sublist_button_tds[i].style.paddingTop = '10px';
				sublist_button_tds[i].style.paddingBottom = '10px';
				sublist_button_tds[i].style.paddingLeft = '10px';
				sublist_button_tds[i].style.paddingRight = '10px';
			}
		}
		//remove button
		sublist_button_tds = jQuery(".uir-remove.bntBg");
		if(sublist_button_tds != null)
		{
			for(var i = 0; i < sublist_button_tds.length; i++)
			{
				sublist_button_tds[i].style.paddingTop = '10px';
				sublist_button_tds[i].style.paddingBottom = '10px';
				sublist_button_tds[i].style.paddingLeft = '10px';
				sublist_button_tds[i].style.paddingRight = '10px';
			}
		}
		//add padding between sublist buttons
		var btn_tables = jQuery("table[class$='machBnt']");
		if(btn_tables != null)
		{
			for(var i = 0; i < btn_tables.length; i++)
			{
				btn_tables[i].style['marginLeft'] = '3px';
				btn_tables[i].style['marginRight'] = '3px';
			}
		}
		//*****  End of format sublist buttons ***********
		
		//********** Format main buttons ****************
		//Formatting form buttons, like Save, Save & New etc.
		var b_imgs = jQuery("img[src$='/images/nav/ns_x.gif'][class='']");
		if(b_imgs != null)
		{
			for(var i = 0; i < b_imgs.length; i++)
			{
				//b_imgs[i].src = '';
				b_imgs[i].style['display'] = 'none';
			}
		}
		//********** End Format main buttons ************
		
		
		AllowInvoicePaymentOnly();
		
		MakeUnitFieldSearchable();
		
		DisableAddressChange(); //We disable change address buttons temporarily until we can figure out how to make it not change dealer default shipping address.

		//Custom settings to fix how Claim & PreAuth form fields display
		var contentRows = jQuery("td[class$='smalltextnolink']");
		if(contentRows != null) {
			//Loop through and apply custom css to the content rows on this page
			for(var j = 0; j < contentRows.length; j++)
			{
				contentRows[j].style['text-align'] = 'left';
				contentRows[j].style['padding-left'] = '10px';
			}
		}
}


/**
 * Hides all other payment methods except invoice at checkout.
 */
function AllowInvoicePaymentOnly()
{
	var rdbPayments = jQuery("input:radio[name$='sPayTerms']"); //payment information radio buttons (invoice and credit card)

	if(rdbPayments != null && rdbPayments.length > 0)
	{
		//First Make invoice radio button selected, this will hide the credit card information.
		for(var i = 0; i < rdbPayments.length; i++)
		{
			if(jQuery(rdbPayments[i]).val().toLowerCase() == 'invoice')
			{
				jQuery(rdbPayments[i]).css('visibility', 'visible');
				jQuery(rdbPayments[i]).css('display', 'inline');
				jQuery(rdbPayments[i]).attr('checked', 'checked');
				break;
			}			
		}
		
		//Now that invoice is selected, make sure that user cannot change the payment method to anything else.
		for(var i = 0; i < rdbPayments.length; i++)
		{
			if(jQuery(rdbPayments[i]).val().toLowerCase() != 'invoice')
			{
				jQuery(rdbPayments[i]).css('display', 'none');
			}			
		}
		
		//Now hide Credit Card label
		//This is a custom span added on the website payment methods so that we can retrieve it and hide the Credit Card text.
		//We needed to use something that we can give id. 
		//It is in Setup->Site Builder->Customize Text, then click Customize link and on List Option tab and this is on the 
		//Credit Card line under Customization column.
		var ccSpan = document.getElementById('ccnotavail'); 
		if(ccSpan != null)
			ccSpan.style["visibility"] = "hidden";
		
	}
}

/**
 * Returns whether or not the current url is for the product catalog tab.
 * This assumes that the product catalog tab is 58.
 * @returns {Boolean}
 */
function IsProductCatalogTab()
{
	var url = window.location.href; //current url
	if(url != null && url != undefined)
		return (url.indexOf('sc.58') > -1);
	else
		return false;
}

/**
 * Makes the unit field searchable.
 */
function MakeUnitFieldSearchable()
{
	var fldUnit = jQuery('#custbodyrvsunit'); 
	if(fldUnit != null)
	{
		//Make unit field searchable
		jQuery('#custbodyrvsunit').width(200);
		jQuery('#custbodyrvsunit').height(20);
		jQuery('#custbodyrvsunit').css({'border':'2px solid #CCC','padding':'0px','font-weight':'bold','font-size':'14px', 'text-transform':'uppercase','background-color':'#fff'});
		
		jQuery("#custbodyrvsunit").searchable();
		jQuery("#custbodyrvsunit").change(function()
		{
			var selectedUnitId = jQuery('#custbodyrvsunit').val();	
			
			//For some reasons, when we convert unit field to a searchable dropdown, 
			//NS does not know that the value has changed. It simply says, there is no unit.
			//To fix this, we set dealer portal hidden vin so that we can set the actual vin when order is submitted.
			var fldPortalUnit = document.getElementById('custbodygd_websiteportalhiddenvin');
			if(fldPortalUnit != null)
				fldPortalUnit.value = selectedUnitId;
					
		});		
		
		//Change unit label to VIN
		var unitFldLabel = jQuery('#custbodyrvsunit_fs_lbl a').first(); //select first "a" tag child of unit field label span		
		if(unitFldLabel != null)
		{
			unitFldLabel.html('<b>VIN</b>');
		}	
	}
}

/**
 * Disable change address buttons.
 */
function DisableAddressChange()
{
	var changeButtons = jQuery("input:button[id='change']"); //gets all change address buttons and change payment method button as well as 'Change Order' button.
	
	if(changeButtons != null && changeButtons.length > 0)
	{
		for(var i = 0; i < changeButtons.length; i++)
		{
			var btnText = jQuery(changeButtons[i]).val();
			//disable all buttons with change label. We do this to exclude 'Change Order' button
			if(btnText.toLowerCase() == 'change') 
			{
				jQuery(changeButtons[i]).prop("disabled", true);
				jQuery(changeButtons[i]).hide();			
			}
		}
	}	
}

/**
 * Adds the specified item to the RVS shopping cart.
 * @param itemId
 */
function addItemToRVSShoppingCart(itemId)
{
	var httpRequest = new XMLHttpRequest(); //httpRequest instamce
	httpRequest.onreadystatechange = function()
	{
		if (httpRequest.readyState == 4) //service is ready
		{
			var restResponseJSON = JSON.parse(httpRequest.responseText);
			if(httpRequest.status == 200) //operation was successful.
			{	
				//restResponseJSON.status is either 'OK' or 'FAILED'
				if(restResponseJSON.status == 'OK') //item was added or is already in the cart.
				{
					window.location.reload(true); //reload the current page and force refresh
				}
				else //restlet failed.
				{
					if(restResponseJSON.errorObj != null)
						alert('Item could not be added to the cart because of the following error:\n' + restResponseJSON.errorObj);
					else
						alert('Item could not be added to the cart because of an unexpected error.');
				}
			}
		}							
	};
		
	httpRequest.open('POST', '/app/site/hosting/restlet.nl?script=customscriptrvsshopcart_additemrestlet&deploy=customdeployrvsshopcart_additemrestlet&t=' + (new Date()).getTime(), false); //synchronous call. t param prevents IE from caching
	httpRequest.setRequestHeader('Content-type','application/json');
	httpRequest.send(JSON.stringify({'itemId' : itemId}));
}