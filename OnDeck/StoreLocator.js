//SERVER SERVER SERVER SERVER SERVER SERVER SERVER SERVER SERVER SERVER SERVER SERVER SERVER 
var SSID;
var ZipFilterField;
var AddressField;

var bitacora = new Array();

function runSearchRecord(request, response) {
		
		//Parameter Loading		
		var pFindBy = "zipcode"; 
		if(request.getParameter('findby')){
			pFindBy = request.getParameter('findby');
		}
		
		var pZips = ""; 
		if(request.getParameter('zipcodes')){
			pZips = request.getParameter('zipcodes'); //separaed by ::
		}
		var pCity = "";
		if(request.getParameter('city')){
			pCity = request.getParameter('city');
		}
		var pState = "";
		if(request.getParameter('state')){
			pState = request.getParameter('state');
		}
		var pCountry = "";
		if(request.getParameter('country')){
			pCountry = request.getParameter('country');
		}
		
		var pStoreLocatorSearch = "1";
		if(request.getParameter('scsls')){
			pStoreLocatorSearch = request.getParameter('scsls');
		}
		
		var pTopStores = nlapiGetContext().getSetting('SCRIPT', 'custscript_nr_of_stores');
		
		ZipFilterField = nlapiGetContext().getSetting('SCRIPT', 'custscript_zipcode_field');
		AddressField = nlapiGetContext().getSetting('SCRIPT', 'custscript_address_field');
		
		SSID = getSSID(pStoreLocatorSearch);
		//Array for future valid ZipCodes
		var zipCodesCollection = new Array();
		
		if(pZips.length > 0) zipCodesCollection = pZips.split("::");
			var customers = new Array();
			if(pFindBy) {
				try{
					switch(pFindBy){
						case 'zipcode':
							customers = obtainTotalResults(zipCodesCollection,pTopStores);
						break;
						case 'city':
							customers = obtainResultsByCity(pCity, pTopStores)
						break;
						case 'state':
							customers = obtainResultsByState(pState);
							pTopStores = 50;
						break;
						case 'online':
							customers = obtainOnlineStores();
							pTopStores = 15;
						break;
						case 'country':
							customers = obtainInternationalResultsByCountry(pCountry);
						break;
						default:
							customers = new Array();
							customers.push("NO SEARCH CRITERIA HAS BEEN DEFINED");
						break;
					}
				}catch(x){
					response.write(x);
				}
			
		//	response.write(bitacora.join("-"));
			if(customers.length > 0){
				//response.write("var stores = '");
				for ( var i = 0; i < customers.length && i< pTopStores; i++ ) {
					var value = escape(customers[i]);
					response.write(value);
					if(i != customers.length-1 && i != pTopStores-1) response.write(":x:");
				}
				//response.write("'; handle_suiteLet(stores)");
			}
		}
}

function obtainTotalResults(pZipCodes, pTopStores){
	if(pZipCodes.length < 5){
		return obtainStoresZipbyZip(pZipCodes,pTopStores);
	}

	if(pZipCodes.length >= 5){	
		return obtainStoresByGroups(pZipCodes,pTopStores);
	}

}

function obtainStoresZipbyZip(pZipCodes, pTopStores){
	var pool = new Array();
	var storesCounter = 0;
	for(var i=0;i<pZipCodes.length && storesCounter<pTopStores;i++){
		var subpool = obtainResultsIntensive(pZipCodes[i]);
		pool = pool.concat(subpool);
		storesCounter = pool.length;
	}
	return pool;
}

function obtainStoresByGroups(pZipCodes, pTopStores){
	
	var largePool = new Array();
	var storesCounter = 0;
	for(var i=0;i<5 && largePool.length<pTopStores;i++){
		var subpool = obtainResultsIntensive(pZipCodes[i]);
		largePool = largePool.concat(subpool);
		storesCounter = largePool.length;
	}
	
	if(storesCounter < pTopStores){
		var invalidZips = pZipCodes.slice(0,5);
		var validZips = pZipCodes.slice(5);
		var subpool2 = obtainResultsExtensive(validZips, invalidZips);
		largePool = largePool.concat(subpool2);
		storesCounter = largePool.length;
	}
	return largePool;
}

function getSSID(pSLSearch){
	var SS_1 = nlapiGetContext().getSetting('SCRIPT', 'custscript_ss_1');
	var SS_2 = nlapiGetContext().getSetting('SCRIPT', 'custscript_ss_2');
	var SS_3 = nlapiGetContext().getSetting('SCRIPT', 'custscript_ss_3');
	var SavedSearchID = 0;
	
	switch(pSLSearch){
		case "1":
			//SavedSearchID = SS_US;
			SavedSearchID = SS_1;
		break;
		case "2":
			SavedSearchID = SS_2;
		break;
		case "3":
			SavedSearchID = SS_3;
		break;
		default:
			SavedSearchID = SS_1;
		break;
	}
	return SavedSearchID;
}

function obtainResultsIntensive(pZipCode){
	
	var ss_id = SSID;
	bitacora.push("bitacora SSID " + ss_id);
	var zipfield = ZipFilterField;
	if(!zipfield){
		zipfield = "zipcode";
	}
	var mapAddressfield = AddressField;
	
	var results = new Array();
	var filters = new Array();
	bitacora.push("bitacora zipfield " + zipfield);
	var searchresults;
	if(pZipCode != "all"){
		bitacora.push("bitacora zipcode " + pZipCode);
		filters.push(new nlobjSearchFilter(zipfield, null, 'startswith', pZipCode));
		 searchresults = nlapiSearchRecord('Customer', ss_id, filters, null);
	}else{
		bitacora.push("bitacora allzipcodes ");
		 searchresults = nlapiSearchRecord('Customer', ss_id, null, null);
	}
	
	if(searchresults){
		bitacora.push("bitacora searchresults " + searchresults.length);
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
			var line = "";
			var columns = searchresults[i].getAllColumns();
			for(var j=0;j<columns.length;j++){
				var value = searchresults[ i ].getValue(columns[j])
				line += columns[j].getName()+':y:' + value + ':o:';
				if(columns[j].getName() == mapAddressfield){
					line +='mapaddressfield:y:' + value + ':o:';
				}
			}
			line = line.substring(0,line.length-3);
			results.push(line);
		}
	}
	return results;
}

function obtainResultsExtensive(pValidZipCodes, pInvalidZipCodes){
	
	var ss_id = SSID;
	var zipfield = ZipFilterField;
	if(!zipfield){
		zipfield = "zipcode";
	}
	var mapAddressfield = AddressField;
	
	var results = new Array();
	var filters = new Array();
	for(var i=0;i<pInvalidZipCodes.length;i++){
		filters.push(new nlobjSearchFilter(zipfield, null, 'doesnotstartwith', pInvalidZipCodes[i]));
	}
	
	var validZips = pValidZipCodes.join(",");
	
	var searchresults = nlapiSearchRecord('Customer', ss_id, filters, null);
	if(searchresults){
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
			var columns = searchresults[i].getAllColumns();
			if(validZips.indexOf(searchresults[ i ].getValue(columns[columns.length-1])) != -1){
				var line = "";
				for(var j=0;j<columns.length;j++){
					var value = searchresults[ i ].getValue(columns[j])
					line += columns[j].getName()+':y:' + value + ':o:';
					if(columns[j].getName() == mapAddressfield){
						line +='mapaddressfield:y:' + value + ':o:';
					}
				}
				line = line.substring(0,line.length-3);
				results.push(line);
			}
		}
	}
	return results;
}


function obtainResultsByCity(pCity){
	var ss_id = SSID;
	var mapAddressfield = AddressField;
	
	var results = new Array();
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custentity_facility_city', null, 'is', pCity));
	
	var searchresults = nlapiSearchRecord('Customer', ss_id, filters, null);
	if(searchresults){
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
			var line = "";
			var columns = searchresults[i].getAllColumns();
			for(var j=0;j<columns.length;j++){
				var value = searchresults[ i ].getValue(columns[j])
				line += columns[j].getName() +':y:' + value + ':o:';
				if(columns[j].getName() == mapAddressfield){
					line +='mapaddressfield:y:' + value + ':o:';
				}
			}
			line = line.substring(0,line.length-3);
			results.push(line);
		}
	}
	return results;
}

function obtainResultsByState(pState){
	var ss_id = SSID;
	var mapAddressfield = AddressField;
	
	var results = new Array();
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custentity_facility_state', null, 'is', pState));
	
	var searchresults = nlapiSearchRecord('Customer', ss_id, filters, null);
	if(searchresults){
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
			var line = "";
			var columns = searchresults[i].getAllColumns();
			for(var j=0;j<columns.length;j++){
				var value = searchresults[ i ].getValue(columns[j]);
				if(columns[j].getName().indexOf("image") != -1){
					value = searchresults[ i ].getText(columns[j]);
				}
				line += columns[j].getName()+':y:' + value + ':o:';
				if(columns[j].getName() == mapAddressfield){
					line +='mapaddressfield:y:' + value + ':o:';
				}
			}
			line = line.substring(0,line.length-3);
			results.push(line);
		}
	}
	return results;
}

function obtainInternationalResultsByCountry(pCountry){
	var ss_id = SSID;
	var mapAddressfield = AddressField;
	
	var results = new Array();
	
	var filters = new Array();
	if(pCountry.indexOf("*") == -1)	{
		//results.push(pCountry);
		filters.push(new nlobjSearchFilter('custentity_facility_country', null, 'anyof', pCountry));
	}
	
	var searchresults = nlapiSearchRecord('Customer', ss_id, filters, null);
	if(searchresults){
		for(var i=0;i<searchresults.length;i++) {
			var line = "";
			var columns = searchresults[i].getAllColumns();
			for(var j=0;j<columns.length;j++){
				var value = searchresults[ i ].getValue(columns[j]);
				line += columns[j].getName() +':y:' + value + ':o:';
				if(columns[j].getName() == mapAddressfield){
					line +='mapaddressfield:y:' + value + ':o:';
				}
			}
			line = line.substring(0,line.length-3);
			results.push(line);
		}
	}
	return results;
}

function obtainOnlineStores(){
	var ss_id = SSID;
	var mapAddressfield = AddressField;
	
	var results = new Array();
	
	var searchresults = nlapiSearchRecord('Customer', ss_id, null, null);
	if(searchresults){
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
			var line = "";
			var columns = searchresults[i].getAllColumns();
			for(var j=0;j<columns.length;j++){
				var value = searchresults[ i ].getValue(columns[j]);
				line += columns[j].getName()+':y:' + value + ':o:';
				if(columns[j].getName() == mapAddressfield){
					line +='mapaddressfield:y:' + value + ':o:';
				}
			}
			line = line.substring(0,line.length-3);
			results.push(line);
		}
	}
	return results;
}