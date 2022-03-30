//for all intensive purposes, mindgym uses the 'vendor' record to represent 'suppliers'
var error_primary = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_errors_pref');
var error_secondary = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_errors_cc_pref');
var preference_search = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_search_geocode');
var PinImageUrl = 'https://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_red.png';
var suppliers = new Array(); // this array stores the values of customers to be re-used during map implementation
var slide_deck = '';
var full_slide_deck ='';
var infowindows = new Array();
var markers = new Array();
var nsmap = null;

//find all suppliers and get their lat/lng
var supplier_search = nlapiLoadSearch('vendor',preference_search || 'customsearch2036'); //get all suppliers with latitude and longitude coordinates
	supplier_search.addColumn(new nlobjSearchColumn('custentity_cbl_shipadr_lat')); //add latitude coordinate
	supplier_search.addColumn(new nlobjSearchColumn('custentity_cbl_shipadr_lng')); //add longitude coordinate
	supplier_search.addColumn(new nlobjSearchColumn('companyname')); //add company name
	supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_industry_background'));
	supplier_search.addColumn(new nlobjSearchColumn('email'));
	supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_clientaccounts'));
	supplier_search.addColumn(new nlobjSearchColumn('custentity_languages'));
	supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_primarydeliverycountry'));
	supplier_search.addColumn(new nlobjSearchColumn('image'));
	supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_coaching_background'));


var runsearch = supplier_search.runSearch();

for(var k=0; k < 40; k++){ 
		nlapiLogExecution('debug','Retrieving Suppliers and Geocodes','Run '+(k+1));
	var supplier_results = runsearch.getResults(k*1000,k*1000+1000);
		nlapiLogExecution('debug','Run '+(k+1)+' result length',supplier_results.length);
	if(supplier_results.length == 0) {nlapiLogExecution('debug','noresults','noresults'); break;}
					
	for(var x = 0; x < supplier_results.length;x++){
		var results = supplier_results[x];
		suppliers.push({'supplier':results.getValue('entityid'),
						'lat':results.getValue('custentity_cbl_shipadr_lat'),
						'lng':results.getValue('custentity_cbl_shipadr_lng'),
						'companyname':results.getValue('companyname') ||' ',
						'email':results.getValue('email') ||' ',
						'del_country':results.getText('custentity_coach_primarydeliverycountry') || ' ',
						'languages':results.getText('custentity_languages') ||' ',
						'accounts':results.getText('custentity_coach_clientaccounts') ||' ',
						'ind_background':results.getText('custentity_coach_industry_background') ||' ',
						'coach_background':results.getText('custentity_coach_coaching_background') ||' ',
						'image':results.getValue('image') ||' '});
		
	}
} 


function geocode_suppliers(request,response){
	if ( request.getMethod() == 'GET' ){
	try{
		var form = nlapiCreateForm('Supplier Geocodes');
	    var map = form.addField('custpage_google_map','inlinehtml','map',null,null);
	    map.setLayoutType('normal','startcol');
	    map.setDefaultValue('<div id="map_canvas" style="border:1px; width:1000px; height:720px; float:left"></div><div id="slidedeck" style="border:1px; width:500px; height:720px; overflow-y:scroll; float:left; padding-left: 5; padding-right:5;">'+full_slide_deck+'</div>');
	   
	   	var google_map_script_reference = form.addField('custpage_googlemapscript','inlinehtml');
		google_map_script_reference.setDefaultValue('<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>');

	   	form.setScript('customscript_cb_sl_cl_geocode_suppliers');
	    form.addResetButton('Reset Map');	
	    response.writePage( form );
	}catch(e){
		nlapiLogExectuion('error','Netsuite Said: ',e);
		var cc = error_secondary.split(',');
		nlapiSendEmail(error_primary,error_primary,"SCRIPT ERROR: "+nlapiGetContext().getScriptId(), nlapiGetContext().getName()+' has encountered the following error: '+e,cc);
	}
    	
   }
   else{
   	dumpResponse(request,response);
   }
}

function drawMap(){
	try{
		//draw initial map centered on atlantic ocean - zoom 2.5
		
		var center = new google.maps.LatLng(45, -55);
		var moption = {
			center:center,
			zoom:3,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		
		nsmap = new google.maps.Map(document.getElementById('map_canvas'),moption);
		

		var ts = 'style="width:450; border:1px solid; background_color:#C0C0C0; border-collapse:collapse;"';
		var ths = 'style="text-align:center; background-color:#00ff00;"';
		var tds_1 = 'style="text_align:left; border:1px solid; v-align:top; width:30%;"';
		var tds_2 = 'style="text_align:left; border:1px solid; v-align:top; width:70%"';

		for(var y=0; y<suppliers.length; y++){
			//drop pins on map
			slide_deck =	'<div><table id="'+(y+1)+'" '+ts+'>'+
						'<tr><th colspan="2" '+ths+'><b>'+suppliers[y].supplier+'</b><br /><b>'+suppliers[y].email+'</b></th></tr><br/>'+
						'<tr><td '+tds_1+'><b>Delivery Country:</b></td><td '+tds_2+'>'+suppliers[y].del_country+'</td></tr>'+
						'<tr><td '+tds_1+'><b>Languages:</b></td><td '+tds_2+'>'+suppliers[y].languages+'</td></tr>'+
						'<tr><td '+tds_1+'><b>Accounts:</b></td><td '+tds_2+'>'+suppliers[y].accounts+'</td></tr>'+
						'<tr><td '+tds_1+'><b>Industry Background:</b></td><td '+tds_2+'>'+suppliers[y].ind_background+'</td></tr>'+
						'<tr><td '+tds_1+'><b>Coaching Background:</b></td><td '+tds_2+'>'+suppliers[y].coach_background+'</td></tr>'+
						'<tr><th colspan="2" '+ths+'><a href="javascript:clicked('+y+')">Show on Map</a></b></th></tr></table></div>';						
					
			full_slide_deck += slide_deck;

			var infowindow = new google.maps.InfoWindow({content: slide_deck}); //create info window with slide deck values

			var sup_loc = new google.maps.LatLng(suppliers[y].lat,suppliers[y].lng);
			var marker = new google.maps.Marker({
				position: sup_loc,
				map:nsmap,
				animation: google.maps.Animation.DROP,
				title:suppliers[y].supplier,
				icon: PinImageUrl	
			}); 			

		bindInfoWindow(marker, nsmap, infowindow, slide_deck);
		infowindows.push(infowindow);
		
		markers.push(marker);

		}

		var sd = document.getElementById('slidedeck');
		sd.innerHTML = full_slide_deck;

		document.getElementById('map_canvas').style.display = 'block';
		google.maps.event.addDomListener(window, 'load', drawMap);

		} catch(e) {
		nlapiLogExectuion('error','Netsuite Said: ',e);
		var cc = error_secondary.split(',');
		nlapiSendEmail(error_primary,error_primary,"SCRIPT ERROR: "+nlapiGetContext().getScriptId(), nlapiGetContext().getName()+' has encountered the following error: '+e,cc,null,null);
	
		}
}

function clicked(i){
	infowindows[i].open(nsmap,markers[i]);
}

function bindInfoWindow(marker, map, infowindow, html) {
    google.maps.event.addListener(marker, 'click', function() {
        infowindow.setContent(html);
        infowindows.push(infowindow);
        infowindow.open(map, marker);
    });
}