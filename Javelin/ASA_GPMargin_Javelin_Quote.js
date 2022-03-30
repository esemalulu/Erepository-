/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *	Filename:	ASA_GPMargin_Javelin_IainFC2.js
 *	Author	:	Iain Bennett
 *	Date	:	1 June 2007
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /*
	Version History
	+-------------------------------------------------------------------------------------------------------+
	|	Version	|	Author			|	Date		|		Remarks		|
	+-------------------------------------------------------------------------------------------------------+
	|	1.0	|	Iain Bennett		|	1 June 2007	| Initial version		|
	|	1.5	|	Iain Bennett		|	5 June 2007	| Vendor costs conversion	|
	|	1.6	|	Iain Bennett		|	8 June 2007	| Problems with searching 2007	|
	+-------------------------------------------------------------------------------------------------------+
 */



//  Global variables
var lineChanged = 1;
var debug = false;



 /* -----------------------------------------------------------
 * Function: 	validateLine
 * Description: 
 * Calculated profit from items, ignores discounts, markups and description lines.
 * When customizing the form add this function to the Validate Line Function field.
 * GP% column field must have the ID "custcol_gp_pct"
 * -----------------------------------------------------------
 */

function ValidateLine(type)
{
        if(type !='item')
        	return true;

	var itemType = nlapiGetCurrentLineItemValue('item', 'custcol_itemtype');


	if (itemType != "Discount" && itemType != "Markup" && itemType != "Description" && itemType != "Other Charge" && itemType !="Subtotal" && itemType !="Item Group" && itemType !="Kit/Package" && itemType !="Item Group")
	{

		//  Declare GP Margin % variable and assign value of 0. This variable will be used to display the Gross Profit Percent for each line item
		var GPMargin = 0;
		
		//  Declare Line Total variable and assign value of 0. This variable will be used to get the line items selling amount
		var lineQuantity = 0;
		var lineTotal = 0;
		var lineGPAmount = 0;


		// Update Rate, Amount and Cost
		var exchangerate = 0;
		var cdnrate = 0;
		var cdnamount = 0;

		exchangerate = parseFloat(nlapiGetFieldValue('exchangerate'));
		cdnrate = exchangerate * parseFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
		cdnamount = exchangerate * parseFloat(nlapiGetCurrentLineItemValue('item', 'amount'));

		// alert("exchangerate: " + exchangerate + "\ncdnrate: " + cdnrate + "\ncdnamount: " + cdnamount);

		nlapiSetCurrentLineItemValue('item', 'custcol_cdn_rate', cdnrate.toFixed(2));
		nlapiSetCurrentLineItemValue('item', 'custcol_cdn_amount', cdnamount.toFixed(2));

	
	    	lineQuantity = nlapiGetCurrentLineItemValue('item', 'quantity');
		//  Get the value of the standard cost custom field and multiply it by the quantity to get the estimated total item cost to get the total cost
		//  Note that this custom field (custcol4) sources the purchase price from the item record in the Wolfe Distribution demo instance
		if( !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item','custcol_quotepurchaseprice'))) )
                {
			// custcol_quotepurchaseprice represents the Canadian price
                	var totalestCost = (nlapiGetCurrentLineItemValue('item', 'custcol_quotepurchaseprice')*lineQuantity);
		}
                else
                {
			var totalestCost = 0;
                }

		// amount represents the current currency price, hence using a custom field to get a Canadian amount
		lineTotal =  parseFloat(nlapiGetCurrentLineItemValue('item', 'custcol_cdn_amount'));
		lineGPAmount = (lineTotal - totalestCost)/exchangerate;

		//  Calculate the total Margin percent
		if (lineTotal > 0)
		{	
			GPMargin = (((lineTotal - totalestCost)/lineTotal)*100);
		}
		else
		{
			GPMargin = 0;
		}
		
		
		// Set Alternative Sales Amount
		nlapiSetCurrentLineItemValue('item', 'altsalesamt', lineGPAmount);
           		
		// Now set the GP Margin % value to a field (in this case another custom field called custcol3) in the current line item 
                // and round to 2 decimals
		nlapiSetCurrentLineItemValue('item', 'custcol_grossprofitpercent', GPMargin.toFixed(2));
	}
                 
              
        var itemType = nlapiGetCurrentLineItemValue('item', 'custcol_itemtype');
        // alert("itemType:" + itemType);
                 
        if (itemType == "Discount")
        {

                var lineCount = nlapiGetCurrentLineItemIndex('item');
		
                
		var isPercent = nlapiGetCurrentLineItemValue('item','rate').indexOf('%');		

            	//  If a transaction discount is present, set tran_discount_rate
             	//  otherwise initialize to zero.	
              	if( !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item','rate'))) )
                {	
                    var tran_discount_rate = parseFloat(nlapiGetCurrentLineItemValue('item','rate'));	
                    // alert("rate:"+ tran_discount_rate);
                }
     		else		
                  var tran_discount_rate = 0;
                  
		var prevAmount = nlapiGetLineItemValue('item', 'amount', (lineCount -1));
                // alert("PrevAmount:" + prevAmount);
                var prevGP = nlapiGetLineItemValue('item', 'altsalesamt', (lineCount -1));
                // alert("PrevGP:" + prevGP);
                var prevCost = nlapiGetLineItemValue('item', 'custcol_quotepurchaseprice', (lineCount - 1));
                // alert("PrevCost:" + prevCost);

	      	//  Check to see that the discount is not a percent.		
        	if (isPercent == -1) 		
                {
                	//  If the discount is not a percent...    
 	   		// var newprevGP = prevGP + tran_discount_rate;
	    		// var newGPpercent = (newprevGP/prevAmount)*100;
                	var newprevGP = tran_discount_rate;
                	// alert("Message2:" + newprevGP);
                	var newGPpercent = (newprevGP - prevCost)*100/prevAmount;
                 }
 		else
		{
			var discamount = (prevAmount*tran_discount_rate)/100;
			var newprevGP  = discamount;
         		// alert("Message1:" + newprevGP);
      		        var newGPpercent = (newprevGP - prevCost)*100/prevAmount;
		}
              
		//// alert("Disc Profit:" + newprevGP);
		nlapiSetCurrentLineItemValue('item', 'altsalesamt', newprevGP);
	}
              
        if ( itemType == "Other Charge")
        {
        	if( !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item','amount'))) )
                {	
                	var tran_discount_rate = parseFloat(nlapiGetCurrentLineItemValue('item','amount'));	
                  	// alert("rate:"+ tran_discount_rate);
                }
                else	
                {	
                	var tran_discount_rate = 0;
                }
                
		nlapiSetCurrentLineItemValue('item', 'altsalesamt', tran_discount_rate);
         }
         if ( itemType == "Subtotal")
         {
                nlapiSetCurrentLineItemValue('item', 'custcol_grossprofitpercent', 0);
         }
         
         if ( itemType == "Description")
         {
                nlapiSetCurrentLineItemValue('item', 'custcol_grossprofitpercent', 0);
         }


         if ( itemType == "Item Group")
         {
                nlapiSetCurrentLineItemValue('item', 'custcol_grossprofitpercent', 0);
                nlapiSetCurrentLineItemValue('item', 'altsalesamt', 0);
         }

	//  Allow the insertion of the current line item
	return true;
}



 /* -----------------------------------------------------------
 * Function: 	TotalProfit
 * Description: 
 * Calculates at the body level the total profit from the order.
 * When customizing the form add this function to the Recalc Function field.
 * GP Total body field must have the ID "custbody_gp_total"
 * -----------------------------------------------------------
 */

function TotalProfit()
{
	var total = 0;
	var item_profit = 0;

	var itemType = nlapiGetLineItemValue('item', 'custcol_itemtype', 1);

	for (i = 1; i <= nlapiGetLineItemCount('item'); i++)
	{
		itemType = nlapiGetLineItemValue('item', 'custcol_itemtype', i);

		if (itemType != "Subtotal" && itemType != "Markup" && itemType != "Description" && itemType !="Item Group" && itemType !="Kit/Package" && itemType !="End of Item Group")
	
		{
                        if( !isNaN(parseFloat(nlapiGetLineItemValue('item','altsalesamt', i))) )
                        {
				item_profit = parseFloat(nlapiGetLineItemValue('item', 'altsalesamt', i));
				total += item_profit;
                        }
		}
	}
	nlapiSetFieldValue('custbody_gp_total', nlapiFormatCurrency(total));

	return true;
}
 


 /* -----------------------------------------------------------
 * Function: 	FieldChanged
 * Description: 
 * Updates the PO Rate and CDN Rate fields as they are updated on the SO form. 
 * -----------------------------------------------------------
 */

function FieldChanged(type,name)
{
	if (debug)
		alert("type: " + type + "\nname:" + name);
	
	if ((name == 'porate') || (name == 'custcol_quotepurchaseprice') || (name == 'povendor'))
	{
		var converted_rate = 0;
		var rate = parseFloat(nlapiGetCurrentLineItemValue('item',name));
		var vendor = nlapiGetCurrentLineItemValue('item', 'povendor');

		if (debug)
			alert("Vendor: " + vendor);

		var filters = new Array();		
		var columns = new Array();

		// Get the vendor's currency
		filters[0] = new nlobjSearchFilter('internalid', null,'is', vendor, null);
		columns[0] = new nlobjSearchColumn('currency');
		var vendor_currencies = nlapiSearchRecord('vendor', null, filters, columns);

		if (debug)
			alert("Vendor search successful");

    	    	var searchresult = vendor_currencies[0];
   	     	var record = searchresult.getId( ); 
    	    	var rectype = searchresult.getRecordType( ); 
		var vendor_currency = searchresult.getValue('currency');

		if (debug)
			alert("Vendor Currency: " + vendor_currency);

		// Get the currency exchange rate
		filters[0] = new nlobjSearchFilter('name', null,'is', vendor_currency, null);
		columns[0] = new nlobjSearchColumn('exchangerate');
		var exchanges = nlapiSearchRecord('currency', null, filters, columns);

		if (debug)
			alert("Exchange search successful");

    	    	searchresult = exchanges[0];
   	     	record = searchresult.getId( ); 
    	    	rectype = searchresult.getRecordType( ); 
		var exchangerate = searchresult.getValue('exchangerate');
 
		if (debug)
			alert("exchange rate: " + exchangerate);


		if (name == "custcol_quotepurchaseprice")
		{
			// CDN to Vendor Currency
			converted_rate = rate / exchangerate ;

			if (debug)
				alert("converted_rate: " + converted_rate);

			nlapiSetCurrentLineItemValue('item', 'porate', converted_rate.toFixed(2), false);
		}
		else if (name == "porate")
		{
			// Vendor Currency to CDN
			converted_rate = exchangerate * rate;
	
			if (debug)
				alert("converted_rate: " + converted_rate);

			nlapiSetCurrentLineItemValue('item', 'custcol_quotepurchaseprice', converted_rate.toFixed(2), false);
		}
	}

	return true;
}

 /* -----------------------------------------------------------
 * Function: 	opportunityFieldChanged
 * Description: 
 * Similar to FieldChanged, updates the custom PO Rate and CDN Rate fields as they are updated on the opportunity 
 * and quote forms. 
 * -----------------------------------------------------------
 */

function OpportunityFieldChanged(type,name)
{
	if (debug)
		alert("type: " + type + "\nname:" + name);
	
	if ((name == 'custcol_quotepurchaseprice') || (name == 'custcol_currency_cost'))
	{

		var converted_rate = 0;
		var rate = parseFloat(nlapiGetCurrentLineItemValue('item',name));
		var filters = new Array();		
		var columns = new Array();

		if (debug)
			alert("In if");

		// Get the currency exchange rate
		filters[0] = new nlobjSearchFilter('symbol', null,'is', 'USD', null);
		columns[0] = new nlobjSearchColumn('exchangerate');
		var exchanges = nlapiSearchRecord('currency', null, filters, columns);

		if (debug)
			alert("Exchange search successful");

    	    	var searchresult = exchanges[0];
   	     	var record = searchresult.getId( ); 
    	    	var rectype = searchresult.getRecordType( ); 
		var exchangerate = searchresult.getValue('exchangerate');
 
		if (debug)
			alert("exchange rate: " + exchangerate);


		if (name == "custcol_quotepurchaseprice")
		{
			if (debug)
				alert("In if custcol_quotepurchaseprice");

			// CDN to Vendor Currency
			converted_rate = rate / exchangerate;

			if (debug)
				alert("converted_rate: " + converted_rate);

			nlapiSetCurrentLineItemValue('item', 'custcol_currency_cost', converted_rate.toFixed(2), false);
		}
		else if (name == "custcol_currency_cost")
		{
			if (debug)
				alert("In if custcol_currency_cost");

			// Vendor Currency to CDN
			converted_rate = exchangerate * rate;
	
			if (debug)
				alert("converted_rate: " + converted_rate);

			nlapiSetCurrentLineItemValue('item', 'custcol_quotepurchaseprice', converted_rate.toFixed(2), false);
		}
	}

	return true;
}
