var logTitle = "ExactTargetTrigger";

function suitelet_sendEmail(request, response) {

  var internalid = request.getParameter('reqid');
  logTitle = logTitle + '::suitelet::'+internalid;

  if (internalid) {
    var orderExternalid = nlapiLookupField("salesorder", internalid, "externalid");
    getSalesOrderDetail(internalid, orderExternalid);
  }

  return true;
}

function sendEmail(type) {
  logTitle = logTitle + '::userevent';
  var context = nlapiGetContext();
  var stRestrictedId = context.getSetting('SCRIPT',
      'custscript_sears_rl_integration_role');
  var currentUser = context.getUser();
  if (currentUser == stRestrictedId) {
    return;
  }

  nlapiLogExecution('DEBUG', logTitle, 'Sending Sales Order');

  var orderInternalId = nlapiGetRecordId();
  
  logTitle = logTitle + '::suitelet::'+orderInternalId;

  nlapiLogExecution('DEBUG', logTitle, 'Sales Order Internal ID ='
      + orderInternalId);
  var orderExternalid = nlapiLookupField("salesorder", orderInternalId,
      "externalid");
  getSalesOrderDetail(orderInternalId, orderExternalid);
}

function getSalesOrderDetail(id, externalID) {

 		var smallTicketPackage;
    var bigTicketPackage;
	  var haveSmallTicketPackage=false;
    var haveBigTicketPackage=false;
    var linesItemInfo = [];
    var linesBigTicketItemInfo = [];    


    var record = nlapiLoadRecord("salesorder", id);
    var parsedRecord = parseRecord(record);

    var EmailAddress;
    var SubscriberKey;
    var FirstName;
    var OrderNumber;
    var OrderDate;
    var OrderURL; //NOT Ready YET
    var OrderSubTotal; //NOT Ready YET
    var PromoApplied;
    var SavingsPointsEarned;
    var PointsEarned;
		var loyaltyRedemption;    
    var ShippingCost;
    var GSTHST;
    var PST;
    var OrderTotal;
    var OptIn="1";
    var Language="E";
    var fromEmailAddress="customercare@sears.ca"

    var orderAssistFee;


    //XML Data Fields STarts
    //new Fields
    var email_addr = "<email_addr>";
    var order_date = "<order_date>";
    var est_ship_date = "<est_ship_date>";
    var est_dlvr_date= "<est_dlvr_date></est_dlvr_date>";
    var ship_name = "<ship_name>"; //first_name we dont have first name

   
    //end
    var addr1 = "<addr1>";
    var addr2 = "<addr2>";
    var city = "<city>";
    var province = "<province>";

    var postal_code = "<postal_code>";
    var shipping_method = "<shipping_method>";
    var ship_via = "<ship_via>"//Pending NOT COmign in the SO Object 
    var number_items = "<number_items>";

    //Item Line Fields
    var item_title = "<item_title>";
    var item_image_url = "<item_image_url>";
    var item_link = "<item_link>";
    var item_instock; //DO we really need this ?
    var item_attr1; //this is Dynamic - attr could be more or less
    var item_attr2; //this is Dynamic - attr could be more or less
    var item_qty = "<item_qty>";
    var item_cost_disc; //need to be in the SO level
    var item_cost_reg = "<item_cost_reg>";
    var item_total = "<item_total>";

    //Item Line item Charge Fields

	
    var CardNumber;
    
    var charge_desc;
    var charge_qty;
    var charge_amount;
    var charge_total;
    //Item Line item Charge Fields END

    //Item Line Fields END

    //Payment Line Fields

    var payment_method = "<payment_method>";
    var payment_amount = "<payment_amount>";

    //Payment Line Fields END
    //recommend Line Fields

    var rec_img;
    var rec_url;

    //recommend Line Fields END



    //new Fields END

    try {

        var customerId = nlapiLookupField("salesorder", id, "entity");
         var email = nlapiLookupField("customer", customerId, "email");

        email_addr = email_addr + email + "</email_addr>";

        //JSON Fields
        SubscriberKey = email;
        EmailAddress = email;
        OrderNumber = externalID;
        transDate = nlapiLookupField("salesorder", id, "trandate");
        OrderDate = transDate;

        OrderSubTotal = checkIfUndefined(parsedRecord.subtotal);
        OrderTotal = checkIfUndefined(parsedRecord.total);

        FirstName = checkIfUndefined(parsedRecord.custbody_sears_cust_first_name);
 
        ShippingCost = checkIfUndefined(parsedRecord.altshippingcost);

        GSTHST = checkIfUndefined(parsedRecord.taxtotal);
        PST = checkIfUndefined(parsedRecord.tax2total);

        if(checkIfUndefined(parsedRecord.custbody_locale)=="fr_CA"){
          Language="F";
           var fromEmailAddress="soutienclients@sears.ca";
        }
        
        PointsEarned=checkIfUndefined(parsedRecord.custbody_rewards_earned);
        
         OptIn= checkIfUndefined(parsedRecord.custbody_email_opt_in);
        if(OptIn==true){
        	OptIn="1";
        }else{
        	OptIn="0";
        }


//custbody_rewards_earned
        //JSON Fields ENDS

        //XML Data Fields
        order_date = order_date + transDate + "</order_date>";
        est_ship_date = est_ship_date + nlapiLookupField("salesorder", id, "shipdate") + "</est_ship_date>";
        ship_name = ship_name + nlapiLookupField("salesorder", id, "shipaddressee") + "</ship_name>";



        try {
            shipping_method = shipping_method + checkIfUndefined(parsedRecord.shipmethod.name) + "</shipping_method>";
            ship_via = ship_via + nlapiLookupField("salesorder", id, "shipcarrier") + "</ship_via>";
        }
        catch (e) {
            shipping_method = shipping_method + "</shipping_method>";
            ship_via = ship_via + "</ship_via>";
        }



        addr1 = addr1 + checkIfUndefined(parsedRecord.shipaddr1) + "</addr1>";
        addr2 = addr2 + checkIfUndefined(parsedRecord.shipaddr2) + "</addr2>";
        city = city + checkIfUndefined(parsedRecord.shipcity) + "</city>";
        province = province + checkIfUndefined(parsedRecord.shippingaddress.state) + "</province>";
        postal_code = postal_code + checkIfUndefined(parsedRecord.shipzip) + "</postal_code>";
       

 var itemCount=0;
        for (var i = 0; i < parsedRecord.item.length; i++) {
            var lineItemInfo = [];
						var lineBigTicketItemInfo = [];       
     			 if(checkIfUndefined(parsedRecord.item[i].custcol_item_type.name)=="Inventory Item") 
            {
                    
                    if(parsedRecord.item[i].custcol_bigticket==false)
                    {
				            lineItemInfo.push("<line>");

				            lineItemInfo.push(item_title + replaceSpecialChar(checkIfUndefined(parsedRecord.item[i].custcol_searsitemname)) + "</item_title>");
				           
				            lineItemInfo.push(item_qty + checkIfUndefined(parsedRecord.item[i].quantity) + "</item_qty>");
				            lineItemInfo.push(item_cost_reg + checkIfUndefined(parsedRecord.item[i].rate )+ "</item_cost_reg>");
				            lineItemInfo.push(item_total + checkIfUndefined(parsedRecord.item[i].amount) + "</item_total>");
				            lineItemInfo.push(item_image_url + checkIfUndefined(parsedRecord.item[i].custcol_itemimageurl) + "</item_image_url>");
				            lineItemInfo.push(item_link + checkIfUndefined(parsedRecord.item[i].custcol_itemwebsiteurl) + "</item_link>");

				            lineItemInfo.push("</line>");
									  linesItemInfo.push(lineItemInfo.join(" "));
           				   haveSmallTicketPackage=true;
               }
              
              else{
		               lineBigTicketItemInfo.push("<line>");
			            lineBigTicketItemInfo.push(item_title + replaceSpecialChar(checkIfUndefined(parsedRecord.item[i].custcol_searsitemname)) + "</item_title>");
			            lineBigTicketItemInfo.push(item_qty + checkIfUndefined(parsedRecord.item[i].quantity) + "</item_qty>");
			            lineBigTicketItemInfo.push(item_cost_reg + checkIfUndefined(parsedRecord.item[i].rate )+ "</item_cost_reg>");
			            lineBigTicketItemInfo.push(item_total + checkIfUndefined(parsedRecord.item[i].amount) + "</item_total>");
			            lineBigTicketItemInfo.push(item_image_url + checkIfUndefined(parsedRecord.item[i].custcol_itemimageurl) + "</item_image_url>");
			            lineBigTicketItemInfo.push(item_link + checkIfUndefined(parsedRecord.item[i].custcol_itemwebsiteurl) + "</item_link>");

		          	  lineBigTicketItemInfo.push("</line>");

		              linesBigTicketItemInfo.push(lineBigTicketItemInfo.join(" "));
		              haveBigTicketPackage=true;
              }
              itemCount =itemCount +1;

          }
          if(checkIfUndefined(parsedRecord.item[i].custcol_item_type.name)=="Service")
          {
          	
          	if(checkIfUndefined(parsedRecord.item[i].item.name) == "Order Assist Fee"){
          		
          	orderAssistFee=checkIfUndefined(parsedRecord.item[i].rate);	
          	}
          	
          }
 							if(checkIfUndefined(parsedRecord.item[i].custcol_item_type.name)=="Discount")
          {
  
          	loyaltyRedemption=checkIfUndefined(parsedRecord.item[i].amount);	
          	
          
          }



        }
         number_items = number_items + itemCount+ "</number_items>";


 try {  	
            CardNumber = checkIfUndefined(parsedRecord.custbody_cc_number_last4);
           
        }
        catch (e) {
          CardNumber="";
        }

        try {  	
            payment_method = payment_method + checkIfUndefined(parsedRecord.paymentmethod.name) + "  " + CardNumber + "</payment_method>";
            payment_amount = payment_amount + OrderTotal + "</payment_amount>";
        }
        catch (e) {
            payment_method = payment_method + "</payment_method>";

            
            payment_amount = payment_amount + OrderTotal + "</payment_amount>";
        }
        
        
        
			if(haveSmallTicketPackage==true){
			smallTicketPackage= "<package>"       
        + order_date
         +  est_ship_date
          + ship_name
         + addr1
         + addr2
         + city
         + province
         + postal_code
          + shipping_method
         + ship_via
         + number_items
         + "<lines>" +
         linesItemInfo.join(" ") +
         "</lines>" +
         "</package>" 
			}

if(haveBigTicketPackage==true){
			bigTicketPackage= "<package>"
     
        + order_date
         +  est_ship_date
          + ship_name
         + addr1
         + addr2
         + city
         + province
         + postal_code
          + shipping_method
         + ship_via
         + number_items
         + "<lines>" +
         linesBigTicketItemInfo.join(" ") +
         "</lines>" +
         "</package>" 
			}
        
        //XML Data Fields END
  }
    catch (e) {
    }
    //return parsedRecord;

    var XmlData = "<xml><packages>"
         
    + smallTicketPackage
    +	bigTicketPackage
    
         
         + "</packages>"
         + "<payments>"
         + "<payment>"
         +   payment_method
         + payment_amount
         + "</payment>"
         +  "</payments>"
         + "<recommends>"
         + "<recommend>"
         + "</recommend>"
         + "</recommends></xml>";


    var jsonOut = {
        "Address": EmailAddress,
        "SubscriberKey": EmailAddress,
        "ContactAttributes": {
            "SubscriberAttributes": {

                "FirstName": FirstName,

                "OrderNumber": OrderNumber,

                "OrderURL": "www.google.ca",

                "OrderSubTotal": OrderSubTotal,
                "OrderTotal": OrderTotal,

                "PromoApplied": "",

                "Savings": "",

                "PointsEarned": PointsEarned,
                "loyaltyRedemption":loyaltyRedemption,

                "ShippingCost": ShippingCost,
                "orderAssistFee" :orderAssistFee,

                "GSTHST": GSTHST,

                "PST": PST,
                "Language": Language,
                 "OptIn":OptIn,


                "XML_Data": XmlData

                         }
        }
    }

   
    var response = sendExactTargetEmail(jsonOut, "08122016_order_confirmation_trigger",fromEmailAddress);
     nlapiLogExecution('DEBUG', 'Email Call REsponse =' + response);
    return response;



}


function sendExactTargetEmail(dataIn, triggerKey,fromEmailAddress) {


    // HTTP headers
    var method = 'POST';
    var token = getExactTargetToken();
    var headers = new Array();
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = 'Bearer ' + token;
    var restletUrl = "https://www.exacttargetapis.com/messaging/v1/messageDefinitionSends/key:" + triggerKey + "/send";

    // var restletUrl =  "https://www.exacttargetapis.com/messaging/v1/messageDefinitionSends/key:Trans_Order_Conf/send";
    var JsonObj = {
        "From": {
"Address": fromEmailAddress,
   "Name": "Sears"      

        }
    }
    JsonObj["To"] = dataIn;
    JsonObj["OPTIONS"] = {
        "RequestType": "SYNC"
    };

    var payload = JSON.stringify(JsonObj);

    // HTTP headers
    var restResponse = nlapiRequestURL(restletUrl, payload, headers, null, method).getBody();

    return restResponse;

}

function getExactTargetToken() {
    var method = 'GET';
    var headers = new Array();
    var restletUrl = 'https://auth.exacttargetapis.com/v1/requestToken';
    headers['Content-Type'] = 'application/json';
    var payload = JSON.stringify({

        "clientId": "18r293cbd138ky7xcca32qlw",
        "clientSecret": "nCmwc3CzmdiNnylcjjohw31p"


    });
    // HTTP headers

    var restResponse = JSON.parse(nlapiRequestURL(restletUrl, payload, headers, null, method).getBody());
    //var html = 
    //		'Token:<br>' +
    //		restResponse.accessToken
    //	response.write(html); 
    return (restResponse.accessToken);
}


function checkIfUndefined(ValueIn) {

    var valueOut = "";

    if (ValueIn === null || ValueIn === undefined) {
        valueOut = "";
    }
    else {
        valueOut = ValueIn;
    }
    
    return valueOut;

}

function parseRecord(record) {

    var recordString = JSON.stringify(record);
    var recordObj = JSON.parse(recordString);

    return recordObj;
}


function replaceSpecialChar(str)
{
  str = str.replace(/&/g, "&amp;");
  str = str.replace(/>/g, "&gt;");
  str = str.replace(/</g, "&lt;");
  str = str.replace(/"/g, "&quot;");
  str = str.replace(/'/g, "&#039;");
  return str;
}