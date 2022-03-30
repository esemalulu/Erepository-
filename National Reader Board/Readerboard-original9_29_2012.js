//http://shopping.netsuite.com/s.nl/c.584346/it.A/id.3694/.f

function Readerboard(params)
{
	var account = params.getParameter('account');
	var internalId = params.getParameter('item');
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn( 'baseprice' );
	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', internalId, null );
	
	var searchresults = nlapiSearchRecord( 'item', null, filters, columns );	
	var mainItemPrice = searchresults[0].getValue('baseprice');
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn( 'internalid' );
	columns[1] = new nlobjSearchColumn( 'custitem_nrs_letter' );
	columns[2] = new nlobjSearchColumn( 'custitem_nrs_letter_color' );
	columns[3] = new nlobjSearchColumn( 'baseprice' );
	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'parent', null, 'is', internalId, null );
	
	var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
	
	var html = new String();
	html += '<html>';
	html += '<head>';
	
	html += "<script type='text/javascript' src='http://www.nationalreaderboard.com/jquery-1.4.3.min.js'></script>";
	html += '<link href="https://system.netsuite.com/c.584346/ordering/styles.css" rel="stylesheet" type="text/css" />';
	html += '<style type="text/css">';
	html += '.item-price {color:#004783;font-family:Arial,Helvetica,sans-serif;font-size:20px;text-transform:uppercase;}';
	html += '.item-name {color: #004783;font-family: Arial,Helvetica,sans-serif;font-size: 20px;text-transform: uppercase;}';
	html += '</style>';
	html += '<script type="text/javascript">';
	
	html += 'function AddToCart(){var color = document.getElementById("custitem_nrs_letter_color").value; var letters = new String(); var qty = new String(); var cells = document.getElementsByTagName("input"); for ( var i = 0; i < cells.length; i++) { if (cells[i].className == "txt" && cells[i].value != "" && !isNaN(cells[i].value)) { letters += cells[i].id + "," + cells[i].value + ";";}}window.location.href = "/app/site/backend/additemtocart.nl?&buyid=multi&multi=" + letters;}';	
	html += 'function CalculatePrice(){var totalPrice = 0; var cells = document.getElementsByTagName("input"); for(var i = 0; i < cells.length; i++){if(cells[i].className == "txt" && cells[i].value != ""){var qty = cells[i].value; var price = document.getElementById("price" + cells[i].id).innerHTML; var priceAux = parseInt(qty) * parseFloat(price); if(!isNaN(priceAux)){totalPrice += priceAux;}}}document.getElementById("itemPrice").innerHTML = "$" + totalPrice.toFixed(2);}';
	html += 'function Refresh(){window.parent.location = window.parent.location;}';	
	html += '$(document).ready(function(){setTimeout(Refresh,500000);});';
	
	html += '</script>';
	html += '</head>';
	
	html += '<body style="background-color:#ffffff;">';
	html += '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
	html += '<tr><td>';
		html += '<table width="735" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
		html += '<tr><td align="left" valign="top">';
			html += '<table width="97%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
			
			html += '<tr><td height="25" class="letterTop">2. Choose Your Color</td></tr>';
			html += '<tr><td>';
			if(searchresults != null && searchresults.length > 0)
			{
				/*
				Less than 0: Sort "a" to be a lower index than "b"
				Zero: "a" and "b" should be considered equal, and no sorting performed.
				Greater than 0: Sort "b" to be a lower index than "a".
				*/
				
				searchresults.sort(function(a, b) 
				{
					if ( isLetter(a.getText('custitem_nrs_letter')) && isLetter(b.getText('custitem_nrs_letter')) )
					{	
						return a.getText('custitem_nrs_letter') > b.getText('custitem_nrs_letter');
					}
					else
					{
						if(isLetter(a.getText('custitem_nrs_letter')))
						{
							return -1;
						}
						else
						{
							if(isLetter(b.getText('custitem_nrs_letter')))
							{
								return 1;
							}
							else // Ninguna de las dos es letra
							{
								if (isNumber(a.getText('custitem_nrs_letter')) && isNumber(b.getText('custitem_nrs_letter')))
								{	
									return a.getText('custitem_nrs_letter') > b.getText('custitem_nrs_letter');
								}
								else
								{
									if(isNumber(a.getText('custitem_nrs_letter')))
									{
										return -1;
									}
									else
									{
										if(isNumber(b.getText('custitem_nrs_letter')))
										{
											return 1;
										}
										else // No son letras ni n�meros, es decir, son caracteres especiales
										{
											return 0;
										}
									}
								}
							}
						}
					}
				});
				
				var colors = new Array();
				var letters = new Array();
				var lettersId = new Array();
				
				for(var i = 0; i < searchresults.length; i++)
				{
					colors[colors.length] = searchresults[i].getText('custitem_nrs_letter_color') + "_" + searchresults[i].getValue('custitem_nrs_letter_color');
					letters[letters.length] = searchresults[i].getText('custitem_nrs_letter') + "_" + searchresults[i].getValue('custitem_nrs_letter') + "*" + searchresults[i].getValue('baseprice');
					lettersId[searchresults[i].getText('custitem_nrs_letter')] = searchresults[i].getId();
				}
				
				colors = unique(colors);
				letters = uniqueLetter(letters);
				
				html += '<select id="custitem_nrs_letter_color" style="width: 142px;">';
				for(var i = 0; i < colors.length; i++)
				{
					var colorValue = colors[i].split('_')[1];
					var colorText = colors[i].split('_')[0];
					html += '<option value="' + colorValue + '">' + colorText + '</option>';
				}
				html += '</select>';
			}
			html += '</td></tr>';
			
			html += '<tr><td height="30"> </td></tr>';
			html += '<tr><td height="25" class="letterTop">3. Choose Your Letters and Quantity</td></tr>';
			html += '<tr><td>Below each letter enter the quantity you would like to order.</td></tr>';
			html += '</table>';
		html += '</td>';
		html += '<td width="400" valign="top">';
			html += '<table width="400" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
			html += '<tr><td align="center" class="letterTop">How to Find Your Letter / Panel Height</td></tr>';
			html += '<tr><td height="8"> </td></tr>';
			html += '<tr><td align="center"><img src="https://system.netsuite.com/c.584346/ordering/images/letter_s.gif" width="161" height="120" /></td></tr>';
			html += '<tr><td height="12"> </td></tr>';
			html += '<tr><td>The Letter Height is the measurement of the letter by itself.<br />The Panel Height is the measurement of the entire plastic panel.</td></tr>';
			html += '</table>';
		html += '</td></tr>';
		html += '</table>';
	html += '</td></tr>';
	html += '<tr><td height="20"> </td></tr>';
	html += '<tr><td>';
		html += '<table class="options" border="0" cellspacing="0" cellpadding="0">';
		html += '<tr>';
		
		var count = 1;
		var letterFlag = true;
		var numberFlag = false;
		for(var i = 0; i < letters.length; i++)
		{
			var letterValue = (letters[i].split('_')[1]).split('*')[0];
			var letterText = letters[i].split('_')[0];
			var letterPrice = (letters[i].split('_')[1]).split('*')[1];
			//var letterPrice = letters[i];
			var ok = ( (letterFlag && !isLetter(letterText)) || (numberFlag && !isNumber(letterText)) );
			if(ok)
			{
				html += '</tr>';
				if(letterFlag)
				{
					letterFlag = false;
					numberFlag = true;
				}
				else
				{
					if(numberFlag)
					{
						numberFlag = false;
					}
				}
				html += '<tr><td>&nbsp;</td></tr>';
				html += '<tr>';
				count = 1;
			}
			else
			{
				count++;
			}
			html += '<td align="center" valign="bottom">' + letterText;
			html += '<br/><input type="text" class="txt" id="' + lettersId[letterText] + '" size="4" onblur="CalculatePrice()" />';
			html += '<div class="itemprice" style="display:none;" id="price' + lettersId[letterText] + '">' + letterPrice + '</div>';
			html += '</td>';
		}
		
		html += '</tr>';
		
		html += '<tr><td height="50"></td></tr>';
		
		html += '<tr><td align="right" colspan="15">';
			html += '<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';
			html += '<td height="38" width="110" align="center" style="background-image: url(https://system.netsuite.com/c.584346/images/bg-price.gif); background-repeat: no-repeat;" class="item-price" id="itemPrice">$0.00</td>';
			html += '<td width="10"></td>';
			html += '<td><img border="0" src="https://system.netsuite.com/c.584346/images/addtocart.gif" onclick="AddToCart()" style="cursor:pointer;" /></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		
		//html += '<tr><td colspan="15"><img height="30" width="110" border="0" src="https://system.netsuite.com/c.584346/images/addtocart.gif" onclick="AddToCart()" style="cursor:pointer;" /></td></tr>';
		
		html += '</table>';
	html += '</td></tr>';
	html += '<tr><td>&nbsp;</td></tr>';
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn( 'storedetaileddescription' );
	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', internalId, null );
	
	var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
	
	html += '<tr><td height="18"></td></tr>';
	html += '<tr><td class="item-name">details</td></tr>';
	html += '<tr><td height="11"></td></tr>';
	html += '<tr><td height="1" bgcolor="#67c4e5" colspan="3"></td></tr>';
	html += '<tr><td height="1" bgcolor="#99d8ed" colspan="3"></td></tr>';
	html += '<tr><td height="13"></td></tr>';
	html += '<tr><td class="item-desc">' + searchresults[0].getValue('storedetaileddescription') + '</td></tr>';
	html += '<tr><td height="16"></td></tr>';
	html += '<tr><td height="1" bgcolor="#67c4e5" colspan="3"></td></tr>';
	html += '<tr><td height="1" bgcolor="#99d8ed" colspan="3"></td></tr>';
	
	html += '</table>';
	
	html += '<script type="text/javascript">';
	
	html += '</script>';
	
	html += '</body>';
	html += '</html>';
	
	response.write(html);
}

function unique(a) 
{
	tmp = new Array(0);
	for(i=0;i<a.length;i++)
	{
		if(!contains(tmp, a[i]))
		{
			tmp.length+=1;
			tmp[tmp.length-1]=a[i];
		}
	}
	return tmp;
}

function contains(a, e) 
{
	for(j=0;j<a.length;j++)if(a[j]==e)return true;
	return false;
}

function uniqueLetter(a) 
{
	tmp = new Array(0);
	for(i=0;i<a.length;i++)
	{
		if(!containsLetter(tmp, a[i]))
		{
			tmp.length+=1;
			tmp[tmp.length-1]=a[i];
		}
	}
	return tmp;
}

function containsLetter(a, e) 
{
	for(j=0;j<a.length;j++)
	{
		var aux = ((a[j]).split('*'))[0];
		if(aux == (e.split('*'))[0])
		{
			return true;
		}
	}
	return false;
}

function isLetter(strValue) 
{
	strValue = strValue.toLowerCase();
  	var objRegExp  = /^[a-z\u00C0-\u00ff]+$/;
  	return ( objRegExp.test(strValue) && (strValue.length == 1) );
}

function isNumber(strValue)
{
	return ( (strValue.length == 1) && !isNaN(strValue) );
}

function LetterHeight(params)
{
	var account = params.getParameter('account');
	var internalId = params.getParameter('item');
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn( 'custitem_internalids' );
	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', internalId, null );
	
	var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
	var internalIDs = searchresults[0].getValue('custitem_internalids');
	
	var html = new String();
	html += '<html>';
	html += '<head>';
	
	html += "<script type='text/javascript' src='http://www.nationalreaderboard.com/autoHeight.js'></script>";
	html += '<link href="https://system.netsuite.com/c.584346/ordering/styles.css" rel="stylesheet" type="text/css" />';
	html += '<style type="text/css">';
	html += '.item-price {color:#004783;font-family:Arial,Helvetica,sans-serif;font-size:20px;text-transform:uppercase;}</style>';
	html += '<script type="text/javascript">';
	
	html += 'parent.document.getElementById("frameRelated").src = "/app/site/hosting/scriptlet.nl?script=4&deploy=1&item=' + internalId + '";';
	
	html += 'function ChangeHeight(id){parent.document.getElementById("frameRelated").src = "/app/site/hosting/scriptlet.nl?script=4&deploy=1&item=" + id; document.getElementById("mainFrame").src = "/app/site/hosting/scriptlet.nl?script=1&deploy=1&item=" + id;}';
	
	html += '</script>';
	html += '</head>';
	
	html += '<body style="background-color:#ffffff;">';
	html += '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
	html += '<tr><td class="pageTitle">Ordering Letters in 3 easy steps</td></tr>';
	html += '<tr><td height="10"> </td></tr>';
	html += '<tr><td>';
		html += '<table width="735" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
		html += '<tr><td align="left" valign="top">';
			html += '<table width="97%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px;">';
			
			html += '<tr><td height="25" class="letterTop">1. Choose Your Letter / Panel  Height</td></tr>';
			html += '<tr><td>';
			
			html += '<select id="letter_height" style="width: 142px;" onchange="ChangeHeight(this.value)">';
			
			if(internalIDs != null && internalIDs != '')
			{
				var array = internalIDs.split(',');
				for(var i = 0; i < array.length; i++)
				{
					var columns = new Array();
					columns[0] = new nlobjSearchColumn( 'custitem_height' );
					
					var filters = new Array();
					filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', array[i], null );
					
					var itemRecords = nlapiSearchRecord( 'item', null, filters, columns );
					
					if(itemRecords != null && itemRecords.length > 0)
					{
						html += '<option value="' + array[i] + '">' + itemRecords[0].getValue('custitem_height') + '</option>';
					}
				}
			}
			html += '</select>';
			
			html += '</td></tr>';
			html += '<tr><td height="30"> </td></tr>';
			html += '</table>';
		html += '</td></tr>';
		html += '</table>';
	html += '</td></tr>';
	html += '</table>';
	
	if(internalIDs != null && internalIDs != '')
	{
		var array = internalIDs.split(',');
		html += "<iframe id='mainFrame' frameborder='0' width='100%' class='autoHeight' style='overflow-x:hidden;overflow-y:hidden;' scrolling='no' marginheight='0' vspace='0' src='/app/site/hosting/scriptlet.nl?script=1&deploy=1&item=" + array[0] + "'></iframe>";
	}
	
	html += '</body>';
	html += '</html>';
	
	response.write(html);
}

function RelatedItems(params)
{
	var internalid = params.getParameter('item');
	
	var html = new String();	
	html += '<html>';
	html += '<head>';
	
	//html += '<link href="http://www.nationalreaderboard.com/c.584346/css/styles.css" rel="stylesheet" type="text/css" />';
	html += "<script type='text/javascript' src='http://www.nationalreaderboard.com/jquery-1.4.3.min.js'></script>";
	html += '<style type="text/css">';
	html += '.related-title {color: #004783;font-family: Arial,Helvetica,sans-serif;font-size: 18px;text-transform: uppercase;}';
	html += '.related-itemprice {color: #004783;font-family: Arial,Helvetica,sans-serif;font-size: 16px;text-transform: uppercase;}';
	html += '.related-itemname {color: #004783;font-family: Arial,Helvetica,sans-serif;font-size: 15px;text-transform: uppercase;}';
	html += '</style>';
	
	html += '<script type="text/javascript">';
	html += 'function Refresh(){window.parent.location = window.parent.location;}';	
	html += '$(document).ready(function(){setTimeout(Refresh,500000);});';
	html += '</script>';
	
	html += '</head><body>';

	html += '<table width="200" border="0" cellspacing="0" cellpadding="0">';
	html += '<tr><td height="11"></td></tr>';
	html += '<tr><td class="related-title" align="center" height="23">Related Products</td></tr>';
	html += '<tr>';  
	
	html += '<td colspan="2"><table width="100%" cellspacing="0" cellpadding="0" border="0">'
	
	var itemRecord = nlapiLoadRecord('inventoryitem', internalid);
	for ( i = 1 ; i <= itemRecord.getLineItemCount('presentationitem'); i++ )
	{
		var relatedId = itemRecord.getLineItemValue('presentationitem', 'item', i);
		
		var columns = new Array();
		columns[0] = new nlobjSearchColumn( 'internalid' );
		columns[1] = new nlobjSearchColumn( 'itemurl' );
		columns[2] = new nlobjSearchColumn( 'thumbnailurl' );
		columns[3] = new nlobjSearchColumn( 'storedisplayname' );
		columns[4] = new nlobjSearchColumn( 'baseprice' );
		
		var filters = new Array();
		filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', relatedId, null );
		filters[1] = new nlobjSearchFilter( 'isinactive', null, 'is', 'F', null );
		filters[2] = new nlobjSearchFilter( 'isonline', null, 'is', 'T', null );
		
		var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
		
		if(searchresults != null && searchresults.length > 0)
		{
			html += '<tr height="0" valign="top"><td><table width="100%" border="0" cellspacing="0" cellpadding="0">';
			html += '<tr><td height="11"></td></tr>';
			html += '<tr><td height="1" bgcolor="#67c4e5" colspan="3"></td></tr>';
			html += '<tr><td height="1" bgcolor="#99d8ed" colspan="3"></td></tr>';
			html += '<tr><td height="9"></td></tr>';
			html += '<tr><td align="center"><a href="' + searchresults[0].getValue('itemurl') + '" target="_parent"><img src="' + searchresults[0].getValue('thumbnailurl') + '" width="199" height="151" border="0" onerror="this.style.display=' + "'none'" + ';" /></a></td></tr>';
			html += '<tr><td height="11"></td></tr>';
			html += '<tr><td class="related-itemname" style="padding-left:3px;"><a href="' + searchresults[0].getValue('itemurl') + '" style="text-decoration:none;" target="_parent">' + searchresults[0].getValue('storedisplayname') + '</a></td></tr>';
			html += '<tr><td height="14"></td></tr>';
			html += '<tr><td>';
				html += '<table border="0" cellpadding="0" cellspacing="0"><tr>';
				html += '<td width="110" class="related-itemprice" style="background-image:url(http://www.nationalreaderboard.com/images/bg-relatedprice.gif); background-repeat:no-repeat;" align="center"> ' + searchresults[0].getValue('baseprice') + '</td>';
				html += '<td width="10"></td>';
				html += '<td><a href="http://www.nationalreaderboard.com/app/site/backend/additemtocart.nl?buyid=' + searchresults[0].getValue('internalid') + '&qty=1"><img src="http://www.nationalreaderboard.com/images/addtocart.gif" border="0" height="30" width="110" /></a></td>';
				html += '</tr></table>';
			html += '</td></tr>';
			html += '</table></td></tr>';
		}
	}
	
	html += '</table></td>';
	
	html += '</tr></table>';
	
	html += '</body></html>';
	
	response.write(html);
}

function FullSetDrillDown(params)
{
	var account = params.getParameter('account');
	var internalId = params.getParameter('item');
	
	var fullSet = params.getParameter('fullSet');
	var selectedHeight = params.getParameter('height');
	var selectedColor = params.getParameter('color');
	
	var url = '/app/site/hosting/scriptlet.nl?script=5&deploy=1&item=' + internalId;
	
	var html = new String();
	html += '<html>';
	html += '<head>';
	
	html += "<script type='text/javascript' src='http://www.nationalreaderboard.com/jquery-1.4.3.min.js'></script>";
	html += '<link href="https://system.netsuite.com/c.584346/ordering/styles.css" rel="stylesheet" type="text/css" />';
	html += '<style type="text/css">';
	html += '.item-price {color:#004783;font-family:Arial,Helvetica,sans-serif;font-size:20px;text-transform:uppercase;}</style>';
	html += '<script type="text/javascript">';
	
	html += 'function ChangeSet(set){window.location.href = "' + url + '&fullSet=" + set;}';
	
	html += 'function ChangeHeight(height){var set = document.getElementById("fullset").value; window.location.href = "' + url + '&fullSet=" + set + "&height=" + height;}';
	
	//html += 'function AddToCart(internalId){var color = document.getElementById("letter_color").value; window.parent.location = "http://shopping.netsuite.com/app/site/backend/additemtocart.nl?c=584346&buyid=" + internalId + "&qty=1&custcolletter_color=" + color;}';
	
	//html += 'function AddToCart(){var internalId = document.getElementById("letter_color").value; window.parent.location = "http://shopping.netsuite.com/app/site/backend/additemtocart.nl?c=584346&buyid=" + internalId + "&qty=1&redirect=http://www.nationalreaderboard.com/Shopping-Cart";}';
	
	//html += 'function AddToCart(){var internalId = document.getElementById("letter_color").value; window.location.href = "https://system.netsuite.com/c.584346/fullsetaddtocart.htm?internalid=" + internalId;}';
	
	html += 'function AddToCart(){var internalId = document.getElementById("letter_color").value.split(",")[0]; window.location.href = "https://system.netsuite.com/c.584346/fullsetaddtocart.htm?internalid=" + internalId;}';
	
	//html += 'function AddToCart(){var internalId = document.getElementById("letter_color").value; window.parent.location = "https://system.netsuite.com/c.584346/fullsetaddtocart.htm?internalid=" + internalId;}';
	
	//html += 'function AddToCart(){var internalId = document.getElementById("letter_color").value; var url = "http://shopping.netsuite.com/app/site/backend/additemtocart.nl?c=584346&buyid=" + internalId + "&qty=1&redirect=http://www.nationalreaderboard.com/Shopping-Cart"; var html = new String(); html += "<iframe src=' + "'" + url + "'" + '></iframe>"; document.getElementById("div-frame").innerHTML = html;}';
	
	html += 'function GotoCart(){window.parent.location = "http://www.nationalreaderboard.com/Shopping-Cart";}';
	
	html += 'function Refresh(){window.parent.location = window.parent.location;}';	
	html += '$(document).ready(function(){setTimeout(Refresh,500000);});';
	
	html += '</script>';
	html += '</head>';
	
	html += '<body style="background-color:#ffffff;">';
	
	html += '<div id="div-frame" style="display:none;"></div>';
	html += '<table width="735" border="0" cellspacing="0" cellpadding="0">';
	html += '<tr><td class="pageTitle">Ordering Letters in 3 easy steps</td></tr>';
	html += '<tr><td height="10"> </td></tr>';
	html += '<tr><td>';
		html += '<table width="735" border="0" cellspacing="0" cellpadding="0">';
		html += '<tr><td align="right" valign="top">';
			html += '<table width="97%" border="0" cellspacing="0" cellpadding="0">';
			html += '<tr><td height="25" class="letterTop">1. Choose Your Full Set</td></tr>';
			html += '<tr><td>';
			
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'custitem_fullsetids' );
			
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', internalId, null );
			
			var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
			var items = searchresults[0].getValue('custitem_fullsetids').split(';');
			
			html += '<select id="fullset" style="width: 142px;" onchange="ChangeSet(this.value)">';
			for(var i = 0; i < items.length; i++)
			{
				var internalId = items[i].split(',')[0];
				var itemName = items[i].split(',')[1];
				
				if(fullSet == null || parseInt(fullSet) != parseInt(internalId))
				{
					html += '<option value="' + trim(internalId) + '">';
				}
				else
				{
					html += '<option value="' + trim(internalId) + '" selected="true">';	
				}
				html += itemName + '</option>';
				
				if(i == 0 && fullSet == null)
				{
					fullSet = internalId;
				}
			}
			html += '</select>';
			
			html += '</td></tr>';
			html += '<tr><td height="15"> </td></tr>';
			html += '<tr><td height="25" class="letterTop">2. Choose Your Letter / Panel  Height</td></tr>';
			html += '<tr><td>';
			
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'custitem_fullsetheights' );
			
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', fullSet, null );
			
			var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
			var items = searchresults[0].getValue('custitem_fullsetheights').split(';');
			
			html += '<select id="letter_height" style="width: 142px;" onchange="ChangeHeight(this.value)">';
			for(var i = 0; i < items.length; i++)
			{
				var internalId = items[i].split(',')[0];
				var itemName = items[i].split(',')[1];
				
				if(selectedHeight == null || parseInt(selectedHeight) != parseInt(internalId))
				{
					html += '<option value="' + trim(internalId) + '">';
				}
				else
				{
					html += '<option value="' + trim(internalId) + '" selected="true">';	
				}
				html += itemName + '</option>';
				
				if(i == 0 && selectedHeight == null)
				{
					selectedHeight = internalId;	
				}
			}
			html += '</select>';
			
			html += '</td></tr>';
			html += '<tr><td height="15"> </td></tr>';
			html += '<tr><td height="25" class="letterTop">3. Choose Your Color</td></tr>';
			
			html += '<tr><td>';
			
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'custitem_fullsetcolors' );
			
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', selectedHeight, null );
			
			var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
			var items = searchresults[0].getValue('custitem_fullsetcolors').split(';');
			
			html += '<select id="letter_color" style="width: 142px;" onchange="ChangeRelatedItems(this.value); ChangeItemPrice(this.value);">';
			for(var i = 0; items != null && i < items.length; i++)
			{
				var internalId = items[i].split(',')[0];
				var itemName = items[i].split(',')[1];
				
				var columns = new Array();
				columns[0] = new nlobjSearchColumn( 'baseprice' );
				
				var filters = new Array();
				filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', internalId, null );
				
				var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
				if(searchresults != null)
				{
					var basePrice = searchresults[0].getValue('baseprice');
					
					if(selectedColor == null || parseInt(selectedColor) != parseInt(internalId))
					{
						html += '<option value="' + trim(internalId) + "," + basePrice + '">';
					}
					else
					{
						html += '<option value="' + trim(internalId) + "," + basePrice + '" selected="true">';	
					}
					html += itemName + '</option>';
				
					if(i == 0 && selectedColor == null)
					{
						selectedColor = internalId;	
					}
				}
			}
			html += '</select>';
			
			html += '</td></tr>';
			
		html += '</table></td>';
		html += '<td width="400" valign="top">';
			html += '<table width="400" border="0" cellspacing="0" cellpadding="0">';
			html += '<tr><td align="center" class="letterTop">How to Find Your Letter / Panel Height</td></tr>';
			html += '<tr><td height="8"> </td></tr>';
			html += '<tr><td align="center"><img src="http://system.netsuite.com/c.584346/ordering/images/letter.gif" width="270" height="244" /></td></tr>';
			html += '<tr><td height="12"> </td></tr>';
			html += '<tr><td style="font-size:12px;">The Letter Height is the measurement of the letter by itself.<br />The Panel Height is the measurement of the entire plastic panel.</td></tr>';
		html += '</table>';
		html += '</td></tr>';
	html += '</table>';
	html += '</td></tr>';
	html += '<tr><td>&nbsp;</td></tr>';
	
	//html += '<tr><td><img height="30" width="110" border="0" src="https://system.netsuite.com/c.584346/images/addtocart.gif" onclick="AddToCart()" style="cursor:pointer;" /></td></tr>';
	
	html += '<tr><td align="right">';
		html += '<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';
		
		var columns = new Array();
		columns[0] = new nlobjSearchColumn( 'baseprice' );
		
		var filters = new Array();
		filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', selectedColor, null );
		
		var searchresults = nlapiSearchRecord( 'item', null, filters, columns );
		
		html += '<td height="38" width="110" align="center" style="background-image: url(https://system.netsuite.com/c.584346/images/bg-price.gif); background-repeat: no-repeat;" class="item-price" id="itemPrice">$' + searchresults[0].getValue('baseprice') + '</td>';
		html += '<td width="10"></td>';
		html += '<td><img border="0" src="https://system.netsuite.com/c.584346/images/addtocart.gif" onclick="AddToCart()" style="cursor:pointer;" /></td>';
		html += '</tr></table>';
	html += '</td></tr>';
	
	html += '</table>';
	
	html += '<script type="text/javascript">';
	
	html += 'parent.document.getElementById("frameRelated").src = "/app/site/hosting/scriptlet.nl?script=4&deploy=1&item=' + trim(selectedColor) + '";';
	
	html += 'function ChangeRelatedItems(value){var id = value.split(",")[0]; parent.document.getElementById("frameRelated").src = "/app/site/hosting/scriptlet.nl?script=4&deploy=1&item=" + id;}';
	
	html += 'function ChangeItemPrice(value){var price = value.split(",")[1]; document.getElementById("itemPrice").innerHTML = "$" + price;}';
	
	html += '</script>';
	
	html += '</body></html>';
	
	response.write(html);
}

function trim(str, chars) {
	return ltrim(rtrim(str, chars), chars);
}
 
function ltrim(str, chars) {
	chars = chars || "\\s";
	return str.replace(new RegExp("^[" + chars + "]+", "g"), "");
}
 
function rtrim(str, chars) {
	chars = chars || "\\s";
	return str.replace(new RegExp("[" + chars + "]+$", "g"), "");
}