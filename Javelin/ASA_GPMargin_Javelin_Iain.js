// Function to calculate and populate custom "GP %" and "GP $" fields in an item column.
// The calculation of this field is based on the standard cost of the item, the selling price and the quantity sold.

// For use with the SolidWorks Accounts.
// For best results, the Add Multiple button should be removed from the forms as item machine scripts will not fire when using the 
// Add Multiple feature in NS


//  Create linechanged global variable and assign value of 1
var lineChanged = 1;

// ValidateLine Function:
// Calculated profit from items, ignores discounts, markups and description lines.
// When customizing the form add this function to the Validate Line Function field.
// GP% column field must have the ID "custcol_gp_pct"


// This function will be deployed to the SO, Opportunity and Quote forms.
function ValidateLine(type)
	{
        if(type !='item')
        	return true;

	var itemType = nlapiGetCurrentLineItemValue('item', 'custcol_itemtype');


	if (itemType != "Discount" && itemType != "Markup" && itemType != "Description" && itemType != "Other Charge" && itemType !="Subtotal" && itemType !="Item Group" && itemType !="Kit/Package")
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
		if( !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item','custcol_purchaseprice'))) )
                {
			// custcol_purchaseprice represents the Canadian price
                	var totalestCost = (nlapiGetCurrentLineItemValue('item', 'custcol_purchaseprice')*lineQuantity);
		}
                else
                {
			var totalestCost = 0;
                }

		// amount represents the current currency price, hence using a custom field to get a Canadian amount
		lineTotal =  parseFloat(nlapiGetCurrentLineItemValue('item', 'custcol_cdn_amount'));
		lineGPAmount = lineTotal - totalestCost;

		//  Calculate the total Margin percent
		GPMargin = (((lineTotal - totalestCost)/lineTotal)*100);
		
		
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
                var prevCost = nlapiGetLineItemValue('item', 'custcol_purchaseprice', (lineCount - 1));
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


// TotalProfit Function:
// Calculates at the body level the total profit from the order.
// When customizing the form add this function to the Recalc Function field.
// GP Total body field must have the ID "custbody_gp_total"



function TotalProfit()
{
	var total = 0;
	var item_profit = 0;

	var itemType = nlapiGetLineItemValue('item', 'custcol_itemtype', 1);

	for (i = 1; i <= nlapiGetLineItemCount('item'); i++)
	{
		itemType = nlapiGetLineItemValue('item', 'custcol_itemtype', i);

		if (itemType != "Subtotal" && itemType != "Markup" && itemType != "Description" && itemType !="Item Group" && itemType !="Kit/Package")
	
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
 
