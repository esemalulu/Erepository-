function statementPdfGen(request, response)
{
	//retrieve the record id passed to the Suitelet
	var recId = request.getParameter('custparam_clientid');

	var custRec = nlapiLoadRecord('customer', recId);


    var pastDueSearch = nlapiSearchRecord('invoice',null,
    [
       ['type','anyof','CustInvc'], 
       'AND', 
       ['customer.custentity_ach_ar_contact','anyof',custRec.getFieldValue('custentity_ach_ar_contact')], 
       'AND', 
       ['mainline','is','T'], 
       'AND', 
       ['status','anyof','CustInvc:A'], 
       'AND', 
       ['daysoverdue','greaterthan','0']
    ], 
    [
       new nlobjSearchColumn('subsidiarynohierarchy'),  
       new nlobjSearchColumn('parent','customer',null), 
       new nlobjSearchColumn('trandate').setSort(false), 
       new nlobjSearchColumn('entity'), 
       new nlobjSearchColumn('tranid'), 
       new nlobjSearchColumn('daysoverdue'), 
       new nlobjSearchColumn('duedate'), 
       new nlobjSearchColumn('amount'), 
       new nlobjSearchColumn('fxamount'),
       new nlobjSearchColumn('currency')
    ]
    );

	//Get all of the unique currenies from the above search
    var uniqueCurrencyArray = [];  
    for(var i=0; pastDueSearch && i < pastDueSearch.length; i++){

      uniqueCurrencyArray.push(pastDueSearch[i].getValue('currency'));
    }
    var uniqueCurrencies = uniqueCurrencyArray.filter(onlyUnique);


    var currencyArray = [];
    var currencyObj = {};

    for(var u=0; uniqueCurrencies && u < uniqueCurrencies.length; u++)
    {

      var totalSum = 0;

      for (s = 0; pastDueSearch && s < pastDueSearch.length; s++)
      {
          if(pastDueSearch[s].getValue('currency') == uniqueCurrencies[u])
          {
            	totalSum += parseFloat(pastDueSearch[s].getValue('fxamount'));
          }
      }

      currencyObj[uniqueCurrencies[u]] = {
        "obj_id":uniqueCurrencies[u],
        "obj_totalSum":totalSum

      };

      currencyArray.push(currencyObj[uniqueCurrencies[u]]);
    }


  	nlapiLogExecution('error', 'JSON Array', JSON.stringify(currencyArray))  

    var logoAchievers = "<img src = 'https://1050077.app.netsuite.com/core/media/media.nl?id=1066&amp;c=1050077&amp;h=59a3bc32a2a1f61e60a7'/>" ;
  
  
    var ILRaddy = "<td width=\"47\%\"> Achievers Solutions Inc.<br/>190 Liberty Street, Suite 100<br/>Toronto ON M6K 3L5 <br/>Canada</td>";
    var RTRaddy = "<td width=\"47\%\"> Achievers LLC<br/>accounts.receivable@achievers.com</td>";
    var BNUaddy = "<td width=\"47\%\"> Achievers Solutions Inc.<br/>190 Liberty Street, Suite 100<br/>Toronto ON M6K 3L5 <br/>Canada</td>";
    var BNAaddy = "<td width=\"47\%\"> Achievers Solutions Inc.<br/>190 Liberty Street, Suite 100<br/>Toronto ON M6K 3L5 <br/>Canada</td>";
    var GRAaddy = "<td width=\"47\%\"> Achievers Solutions Inc.<br/>190 Liberty Street, Suite 100<br/>Toronto ON M6K 3L5 <br/>Canada</td>";

	//create a table to present the line items
	var strName = "<table width=\"100\%\" style=\"padding-bottom: 2px;\">";

	strName += "<tr>";
	strName += "<td width=\"50\%\" align=\"left\">"+logoAchievers+"</td>";  
	strName += "<td width=\"50\%\" align=\"right\" style=\"font-size: 125%;\"><b>Past Due Statement</b></td>";
	strName += "</tr>";
	strName += "</table>";

/*
	strName += "<table width=\"100\%\" style=\"padding-bottom: 25px;\">";
	strName += "<tr>";
	strName += ILRaddy;
	//strName += "<td width=\"50\%\" align=\"right\">Other Info</td>";
	strName += "</tr>";  
	strName += "</table>";

	strName += "<table width=\"100\%\" style=\"padding-bottom: 25px;\">";
	strName += "<tr>";
	strName += "<td width=\"50\%\" align=\"left\">  </td>";  
	strName += "</tr>"; 
	strName += "</table>";  
*/

    for (obj= 0; obj < currencyArray.length; obj++) 
    {


		  strName += "<table width=\"105\%\" style=\"padding-bottom: 25px;\">";
          strName += "<tr style=\"background-color:#D3D3D3;\">";
          //strName += "<td width=\"15\%\"><b>Name</b></td>";
          strName += "<td width=\"15\%\"><b>Invoice #</b></td>";
          strName += "<td width=\"15\%\" align=\"left\"><b>Date</b></td>";
          strName += "<td width=\"15\%\" align=\"center\"><b>Due Date</b></td>";
          strName += "<td width=\"15\%\" align=\"center\"><b>Day Past Due</b></td>";
          strName += "<td width=\"15\%\" align=\"center\"><b>Currency</b></td>";
          strName += "<td width=\"15\%\" align=\"center\"><b>Amount</b></td>";
          //strName += "<td width=\"15\%\" align=\"center\"><b>Subsidiary</b></td>";
      
          strName += "</tr>";

          for (x = 0; pastDueSearch && x < pastDueSearch.length; x++)
          {

                if(pastDueSearch[x].getValue('currency') == currencyArray[obj].obj_id)
                {
                      strName += "<tr style=\"font-size:95%;\">";

                      strName += "<td>";
                      strName += pastDueSearch[x].getValue('tranid')
                      strName += "</td>";

                      strName += "<td>";
                      strName += pastDueSearch[x].getValue('trandate')
                      strName += "</td>";

                      strName += "<td align=\"center\">";
                      strName += pastDueSearch[x].getValue('duedate')
                      strName += "</td>";

                      strName += "<td align=\"center\">";
                      strName += pastDueSearch[x].getValue('daysoverdue')
                      strName += "</td>";

                      strName += "<td align=\"center\">";
                      strName += pastDueSearch[x].getText('currency')
                      strName += "</td>";

                      strName += "<td align=\"center\">";
                      strName += pastDueSearch[x].getValue('fxamount')
                      strName += "</td>";

/*
                      strName += "<td>";
                      strName += pastDueSearch[x].getText('subsidiarynohierarchy');
                      strName += "</td>";
*/

                      strName += "</tr>";

                   }

          }

              strName += "</table>";

              strName += "<table width=\"94\%\" style=\"padding-bottom: 25px;\">";
              strName += "<tr>";
              strName += "<td  align=\"right\" width=\"72\%\"></td>";
              strName += "<td  align=\"center\" style=\"background-color:#D3D3D3;\" >Total</td>";
              strName += "<td  align=\"right\">"+parseFloat(currencyArray[obj].obj_totalSum).toFixed(2) +"</td>";
              strName += "</tr>";
              strName += "</table>";

/*
1	I Love Rewards Corp.
25	Achievers UK Sales Office
40	Blackhawk Network Australia
39	Blackhawk Network Europe Limited
4	Elimination
42	Grass Roots Australia
2	I Love Rewards Inc.
3	ReThink Rewards
*/



                  strName += "<table width=\"100\%\" style=\"padding-bottom: 25px;\">";
                  strName += "<tr>";
                  strName += "<td width=\"50\%\" style=\"font-size: 9pt; margin-top: -5px;\"> <b><u>REMITTANCE DETAILS</u></b><br/>";

                  strName += "</td>";
                  strName += "</tr>";

                  if(currencyArray[obj].obj_id == '1')
                  {
                    strName += "<tr>";
                    strName += "<td style=\"font-size: 9pt; margin-top: -5px;\">";
                  	strName += "<b>Cheques Payable To:</b><br/>";
                    strName +=  "Achievers LLC<br/> Lockbox Services Box #399016<br/> San Francisco, CA 94139-9016";
                    strName += "</td>";

                    strName += "<td style=\"font-size: 9pt; margin-top: -5px;\">";
                  	strName += "<b>EFT Payments</b><br/>";
                    strName +=  "Company Name: Achievers LLC <br/> Bank: Wells Fargo NA <br/> Bank Routing :121000248<br/>Bank Account No: 4122256902<br/>Bank Address:<br/> 420 Montgomery Street, <br/>San Francisco, CA <br/> 94104<br/>";
                    strName += "</td>";
                    strName += "</tr>";
                  }

      
      
                  if( currencyArray[obj].obj_id == '3')
                  {
                    strName += "<tr>";
                    strName += "<td style=\"font-size: 9pt; margin-top: -5px;\">";
                  	strName += "<b>Cheques Payable To:</b><br/>";
                    strName +=  "Achievers Solutions Inc <br/> PO Box T57116C, STN A <br/> Toronto, ON  <br/>M5W 5M5";
                    strName += "</td>";

                    strName += "<td style=\"font-size: 9pt; margin-top: -5px;\">";
                  	strName += "<b>EFT Payments</b><br/>";
                    strName +=  "Company Name: Achievers Solutions Inc <br/>Bank: Bank of Montreal <br/>Transit: 00109 <br/>Bank: 0001 <br/>";
                    strName += "</td>";
                    strName += "</tr>";
                  } 
                  strName += "</table>";          
      

      
      
      
      
      
      
      
      

    }









	// build up BFO-compliant XML using well-formed HTML
	var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";

	xml += "<pdf>\n<body font-size=\"10\">\n";

	xml += strName;
	xml += "</body>\n</pdf>";

	// run the BFO library to convert the xml document to a PDF 
	var file = nlapiXMLToPDF( xml );

	// set content type, file name, and content-disposition (inline means display in browser)
	response.setContentType('PDF', custRec.getFieldValue('name')+'.pdf', 'inline');

	// write response to the client
	response.write( file.getValue() );   
  
  
  
  
  		var context = nlapiGetContext();
		nlapiLogExecution('error', 'remaining usage', context.getRemainingUsage());  
}




function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}