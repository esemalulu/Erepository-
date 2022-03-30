function getdataEveryFiveMinitues(){
	// var interval = setInterval(function () { myFunction(); }, 6*1000);
	log('getdataEveryFifteenMinitues','Executed!');
   getShippingAsCSV();
  
  
}

function myFunction () {
    // log('','Executed!');
}

function log(name, message) {
    nlapiLogExecution('DEBUG', name, message);
}

// 25 Dufferin Pl SE, Calgary, AB T2C 4W3, Canada
// Sears Catalogue Pickup Location
 var ShipperAccountNumber = "1000";	        		
 var ShipperName          = "Sears";      				 
 var ShipperAddressline1  = "25 Dufferin Pl SE,AB T2C 4W3,Canada" ;					 
 var ShipperAddressline2   = "";				 
 var ShipperAddressline3   ="";				 
 var ShippersCity  ="Calgary";					
 var ShipperProvince  	="AB";					 
 var ShipperPostalCode 	="T2C 4W3";
 var doublequotes = "\"";
 var concatString = "\"|\"";
 var formattedData = "";
 var salesorderIds = new Array();

  
 

function getShippingAsCSV(){
 //var threeDaysAgo = nlapiAddDays(new Date(), -3);

	//var offset = -4;
	//var lastDateandTime = getCompanyDate(); //new Date(new Date().getTime() + offset * 3600 * 1000);//.toUTCString().replace( / GMT$/, "" );
   	//lastDateandTime.setTime(lastDateandTime.getTime() + (60 * 60 * 1000));//added one hour to match time
    //lastDateandTime.setTime(lastDateandTime.getTime() - (15 * 60 * 1000)); //last 15 mins
    // return lastDateandTime + "" ;
   
	// var filters = new Array();
	// filters[0] = new nlobjSearchFilter( 'titletext', null, 'is', "ItemFulfillment Search For Last 15 mins");

 //    var searchRecord = nlapiSearchRecord('SavedSearch',null,filters,null);

 //    // return searchRecord;

 //    var searchRecordId = searchRecord[0]['id'];
    // return searchRecordId;
	// filters[1] = new nlobjSearchFilter('datecreated', null, 'onorafter', lastDateandTime);
	// filters[2] = new nlobjSearchFilter('status',null,'is','ItemShip:C');
 
    // var columns = new Array();
    // columns[0] =  new nlobjSearchColumn('datecreated');
    // columns[1] =  new nlobjSearchColumn('internalid');

    
	//306 saved search id
	// var all_itemfulfil_list = nlapiSearchRecord("ItemFulfillment", searchRecordId, null,null);
   
    // return all_itemfulfil_list;

    // if(all_itemfulfil_list != null){
    	// for (var i = 0; i < all_itemfulfil_list.length; i++) {
		
			// var all_itemfulfil_listJSON = JSON.parse(JSON.stringify(all_itemfulfil_list));

	     	//var parts = all_itemfulfil_listJSON[i]['columns']['datecreated'].split('-');
	    	// var datestring = all_itemfulfil_listJSON[i]['columns']['datecreated'].replace(/-/g, '/');
	    	// var createdDate = new Date(Date.parse(datestring));

			// var ItemFulfillmentRecord = nlapiLoadRecord('ItemFulfillment',all_itemfulfil_list[i]['id']); //all_itemfulfil_list[i]['id']

			var ItemFulfillmentRecord = nlapiLoadRecord('ItemFulfillment','1839057'); //all_itemfulfil_list[i]['id']

			
			// return ItemFulfillmentRecord; //.getFieldValue('totalquantity') //547847
	        
	        ItemFulfillmentRecordJSON = JSON.parse(JSON.stringify(ItemFulfillmentRecord));
			// 	return ItemFulfillmentRecordJSON
			
   			var packageData = ItemFulfillmentRecordJSON['package'];

   			packageData=removePackageDupicate(packageData);

   			return packageData;

   			for (var j = 0; j < packageData.length; j++) {
			    formattedData = formattedData + doublequotes + ShipperAccountNumber+concatString+ShipperName+concatString + ShipperAddressline1 +concatString+ShipperAddressline2+concatString+ShipperAddressline3+concatString+ShippersCity+concatString+ShipperProvince+concatString+ShipperPostalCode;

				if(typeof ItemFulfillmentRecordJSON['shipcompany'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipcompany'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipaddr1'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipaddr1'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipaddr2'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipaddr2'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipaddr3'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipaddr3'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipcity'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipcity'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipstate'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipstate'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipzip'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipzip'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecordJSON['shipcountry'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipcountry']['name'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				var packageTrackingNumber = packageData[j]['packagetrackingnumber'];
				var packageweight = packageData[j]['packageweight'];

				if(typeof packageTrackingNumber != 'undefined'){
					formattedData = formattedData + concatString+packageTrackingNumber;
				}else{
					formattedData = formattedData + concatString+"";
				}

				//shippers reference
	            if(typeof ItemFulfillmentRecordJSON['tranid'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['tranid'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				//consignees reference 
				var salesorderRecord = nlapiLoadRecord('salesorder',ItemFulfillmentRecordJSON['createdfrom']['internalid']);
				salesorderIds.push(ItemFulfillmentRecordJSON['createdfrom']['internalid']);
				// custbody_sears_sales_ordernum , custbody_sears_order_externalid
				if(typeof salesorderRecord.getFieldValue('custbody_sears_sales_ordernum') != 'undefined' && salesorderRecord.getFieldValue('custbody_sears_sales_ordernum') != null ){
					formattedData = formattedData + concatString+salesorderRecord.getFieldValue('custbody_sears_sales_ordernum');
				}else{
					formattedData = formattedData + concatString+"";
				}

	             
	            if(typeof ItemFulfillmentRecord.getFieldValue('totalquantity') != 'undefined'){
					formattedData = formattedData + concatString+parseInt(ItemFulfillmentRecord.getFieldValue('totalquantity'), "10");
				}else{
					formattedData = formattedData + concatString+"";
				} 
				 
				if(typeof packageweight != 'undefined'){
					formattedData = formattedData + concatString+Math.ceil(packageweight);
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecord.getFieldValue('baseweightunit') != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecord.getFieldValue('baseweightunit');
				}else{
					formattedData = formattedData + concatString+"";
				}
				// dont have specialinstruction and service level.
				formattedData = formattedData + concatString+"";
				formattedData = formattedData + concatString+"";

				if(typeof ItemFulfillmentRecord.getFieldValue('shipphone') != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecord.getFieldValue('shipphone');
				}else{
					formattedData = formattedData + concatString+"";
				}

				if(typeof ItemFulfillmentRecord.getFieldValue('semail') != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecord.getFieldValue('semail');
				}else{
					formattedData = formattedData + concatString+"";
				}

				// Shipper’s Country Abbreviation 
				if(typeof ItemFulfillmentRecordJSON['shipcountry'] != 'undefined'){
					formattedData = formattedData + concatString+ItemFulfillmentRecordJSON['shipcountry']['internalid'];
				}else{
					formattedData = formattedData + concatString+"";
				}

				//Item Description 
				formattedData = formattedData + concatString+"";
				//Route Code (orders that Greenway will deliver = 'GRNWAYCAL')
				if(typeof packageTrackingNumber != 'undefined'  && packageTrackingNumber.substring(0,2) == "GRN"){
					formattedData = formattedData + concatString+"GRNWAYCAL";

				}else{
					formattedData = formattedData + concatString+"";
				}
				//Shipper’s Phone 
				formattedData = formattedData + concatString+"";
				// Reference 3  
				formattedData = formattedData + concatString+"";
				// Reference 4
				formattedData = formattedData + concatString+"";
				// Labor Code  
				formattedData = formattedData + concatString+"";
				//Job Option 2 
				formattedData = formattedData + concatString+"";
				//email option
				formattedData = formattedData + concatString+"3"+doublequotes;

				formattedData = formattedData + "\r\n";

			}

    	// }

    
		
			
    // }
	
	// The url is ftpaccess.piicomm.ca
	// username: searsinitium
	// password: XQ2q5l0P

  if(formattedData != ""){
		var url = "http://initium-commerce-dev.apigee.net/sears-ftp/upload?remote-file-name=ShipTrack_"+getCompanyDate()+".csv"+"&initial-directory=/QA/Incoming";
    
    	var response = nlapiRequestURL(url, formattedData, "", 'POST');
    	var result = JSON.parse(response.getBody());
    	
    	log('status', formattedData + "---status--"+result['status'] +"---filename--ShipTrack_"+getCompanyDate()+".csv") ;
	}else{
		log('status--',"No orders found"); 
	}

}

function getCompanyDate(){
    var currentDateTime = new Date();
    var companyTimeZone = nlapiLoadConfiguration('companyinformation').getFieldText('timezone');
    var timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : new Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
    var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
    var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

    return new Date(companyDateTime);
}




function removePackageDupicate(packageJson){
	var loop=packageJson.length;
	var tempArray=[];
	var count=0;
	var loop2=tempArray.length;

	for(var i=0; i<loop; i++){
		count =0;
		loop2=tempArray.length;
		for(var j=0; j<loop2; j++){
			if(tempArray[j]['packagetrackingnumber']==packageJson[i]['packagetrackingnumber']){		
				log(tempArray[j]['packagetrackingnumber']+"---"+packageJson[i]['packagetrackingnumber']);		
				count++;
			}
		}

		if(count==0){
			tempArray.push(packageJson[i]);
		}
	}
	return tempArray;
}