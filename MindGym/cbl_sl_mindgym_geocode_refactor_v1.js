
var error_primary = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_errors_pref');
var error_secondary = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_errors_cc_pref');
var preference_search = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_search_geocode');
var category_preference = nlapiGetContext().getSetting('SCRIPT','custscript_cb_script_category');
var PinImageUrl = 'https://system.netsuite.com/core/media/media.nl?id=714970&c=720154&h=31394145ba5f836e1a4d';

function geocode_suppliers(request,response)
{
		
	if(request.getMethod() == 'GET')
	{
		//run initial suppliers search
		var suppliers = new Array(); 
		var supplier_search = nlapiLoadSearch('vendor',preference_search || 'customsearch2036');
		supplier_search.addColumn(new nlobjSearchColumn('custentity_cbl_shipadr_lat'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_cbl_shipadr_lng'));
		supplier_search.addColumn(new nlobjSearchColumn('companyname')); 
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_industry_background'));
		supplier_search.addColumn(new nlobjSearchColumn('email'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_clientaccounts'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_languages'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_primarydeliverycountry'));
		supplier_search.addColumn(new nlobjSearchColumn('image'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_coaching_background'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_masterrecord'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_groupingname'));
		//Ticket 4439 - default to search for master record
		supplier_search.addFilter(new nlobjSearchFilter('custentity_coach_masterrecord',null,'is','T'));
		
		if(category_preference)
		{
			supplier_search.addFilter(new nlobjSearchFilter('category',null,'anyof',category_preference));
		}

		
		var runsearch = supplier_search.runSearch();

		for(var k=0; k < 40; k++)
		{ 
			nlapiLogExecution('debug','Retrieving Suppliers and Geocodes','Run '+(k+1));
			var supplier_results = runsearch.getResults(k*1000,k*1000+1000);
			nlapiLogExecution('debug','Run '+(k+1)+' result length',supplier_results.length);
			
			if(supplier_results.length == 0) 
			{
				nlapiLogExecution('debug','noresults','noresults'); 
				break;
			}
						
			for(var x = 0; x < supplier_results.length;x++){
				var results = supplier_results[x];
				//nlapiLogExecution('debug','test',results.getValue('custentity_bo_coachdisplayname'));
				suppliers.push(
						{
							'supplier':(results.getValue('custentity_coach_groupingname')?results.getText('custentity_coach_groupingname'):results.getValue('entityid')),
							//'supplier':results.getValue('entityid'),
								'lat':results.getValue('custentity_cbl_shipadr_lat'),
								'lng':results.getValue('custentity_cbl_shipadr_lng'),
								'companyname':results.getValue('companyname') ||' ',
								'email':results.getValue('email') ||' ',
								'del_country':results.getText('custentity_coach_primarydeliverycountry') || ' ',
								'languages':results.getText('custentity_languages') ||' ',
								'accounts':results.getText('custentity_coach_clientaccounts') ||' ',
								'ind_background':results.getText('custentity_coach_industry_background') ||' ',
								'coach_background':results.getText('custentity_coach_coaching_background') ||' ',
								'master_coach':results.getValue('custentity_coach_masterrecord') || '',
								'image':results.getValue('image') ||''});
			}
		}

		if(category_preference)
		{
			var title = 'Coach Map Limited by Category';
		} 
		else 
		{
			var title = 'Coach Map';
		}
		var form = nlapiCreateForm(title);
		form.addFieldGroup('filters','Filters');

		var master_coach = form.addField('custpage_master_coach','checkbox','Only Show Parent Record',null,'filters');
			master_coach.setLayoutType('normal','startcol');
			master_coach.setDefaultValue('T');
		
		//Add in Is Master Coach
		//custentity_coach_masterttt
		var isMasterTTT = form.addField('custpage_masterttt','checkbox','Is Master Coach', null, 'filters');
		
		//Add in Is Virtual Certified
		var isVirtual = form.addField('custpage_virtual', 'checkbox','Is Virtual Certified', null, 'filters');
			
		var countries = form.addField('custpage_delivery_country','select','Delivery Country','customrecord_country','filters');
			countries.setLayoutType('normal','startcol');
			
		var goLarge = form.addField('custpage_golarge','multiselect','Other Skills','customlist_coach_product_upskill','filters')

		if(category_preference)
		{
			var category = form.addField('custpage_category','select','Coach Category','vendorcategory','filters');
			category.setDisplayType('inline');
			category.setDefaultValue(category_preference);
		}

		var map = form.addField('custpage_google_map','inlinehtml','map',null,null);
		    map.setLayoutType('outsidebelow','startrow');
		    map.setDefaultValue('<div id="map_canvas" style="border:1px; width:1350px; clear:left; height:720px; float:left"></div>');

		var coach_list = form.addField('custpage_coach_list','inlinehtml','coach_list',null,null);
		    coach_list.setLayoutType('outsidebelow');
		    coach_list.setDefaultValue('<div id="coach_count" style="font-size:14px; float:left; padding-left:10px;"><b>Number of Coaches Found: </b>'+suppliers.length+'</div><div id="slidedeck" style="border:1px; width:350px; height:720px; overflow-y:scroll; float:left; padding-left: 10; padding-right:10;"></div>');   
		   
		var google_map_script_reference = form.addField('custpage_googlemapscript','inlinehtml');
			google_map_script_reference.setDefaultValue('<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>');
		
		var supplier_json = form.addField('custpage_supplier_json','inlinehtml','supplier',null,null);
			supplier_json.setDisplayType('hidden');
			supplier_json.setDefaultValue(JSON.stringify(suppliers)); nlapiLogExecution('debug','SupplierText',JSON.stringify(suppliers));

		form.setScript('customscript_cb_sl_cl_geocode_suppliers');

		form.addSubmitButton('Generate Map with Filters');
		response.writePage( form );

	} else{

		var dc_value = request.getParameter('custpage_delivery_country');
		var mc_value = request.getParameter('custpage_master_coach');
		var category_pref = request.getParameter('custpage_category');
		//Ticket 4439
		var mttt_value = request.getParameter('custpage_masterttt');
		var virtual_value = request.getParameter('custpage_virtual');
		var large_value = request.getParameter('custpage_golarge');
		
		//run initial suppliers search
		var new_suppliers = new Array();
		var supplier_search = nlapiLoadSearch('vendor',preference_search || 'customsearch2036');
		supplier_search.addColumn(new nlobjSearchColumn('custentity_cbl_shipadr_lat'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_cbl_shipadr_lng'));
		supplier_search.addColumn(new nlobjSearchColumn('companyname')); 
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_industry_background'));
		supplier_search.addColumn(new nlobjSearchColumn('email'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_clientaccounts'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_languages'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_primarydeliverycountry'));
		supplier_search.addColumn(new nlobjSearchColumn('image'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_coaching_background'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_masterrecord'));
		supplier_search.addColumn(new nlobjSearchColumn('custentity_coach_groupingname'));
		
		if (mttt_value == 'T')
		{
			supplier_search.addFilter(new nlobjSearchFilter('custentity_coach_masterttt',null,'is','T'));
		}
		
		if(virtual_value == 'T')
		{
			supplier_search.addFilter(new nlobjSearchFilter('custentity_coach_isvirtualcertified', null, 'is', 'T'));
		}
		
		if(mc_value == 'T')
		{
			supplier_search.addFilter(new nlobjSearchFilter('custentity_coach_masterrecord',null,'is','T'));
		}
		
		if(dc_value)
		{
			supplier_search.addFilter(new nlobjSearchFilter('custentity_coach_primarydeliverycountry',null,'anyof',dc_value));
		}
		
		if(large_value)
		{
			supplier_search.addFilter(new nlobjSearchFilter('custentity_coach_productupskills', null, 'anyof', large_value));
		}
		
		if(category_pref){supplier_search.addFilter(new nlobjSearchFilter('category',null,'anyof',category_preference));}

		var runsearch = supplier_search.runSearch();

		for(var k=0; k < 40; k++){ 
			nlapiLogExecution('debug','Retrieving New suppliers and Geocodes','Run '+(k+1));
		var supplier_results = runsearch.getResults(k*1000,k*1000+1000);
			nlapiLogExecution('debug','Run '+(k+1)+' result length',supplier_results.length);
		if(supplier_results.length == 0) {nlapiLogExecution('debug','noresults','noresults'); break;}
						
			for(var x = 0; x < supplier_results.length;x++){
				var results = supplier_results[x];
				//nlapiLogExecution('debug','coach display name',results.getValue('custentity_bo_coachdisplayname'));
				new_suppliers.push(
						{
							'supplier':(results.getValue('custentity_coach_groupingname')?results.getText('custentity_coach_groupingname'):results.getValue('entityid')),
								'lat':results.getValue('custentity_cbl_shipadr_lat'),
								'lng':results.getValue('custentity_cbl_shipadr_lng'),
								'companyname':results.getValue('companyname') ||' ',
								'email':results.getValue('email') ||' ',
								'del_country':results.getText('custentity_coach_primarydeliverycountry') || ' ',
								'languages':results.getText('custentity_languages') ||' ',
								'accounts':results.getText('custentity_coach_clientaccounts') ||' ',
								'ind_background':results.getText('custentity_coach_industry_background') ||' ',
								'coach_background':results.getText('custentity_coach_coaching_background') ||' ',
								'master_coach':results.getValue('custentity_coach_masterrecord') || '',
								'image':results.getValue('image') ||''});

			}
		}

		
		if(category_pref){var title = 'Coach Map Limited by Category and Filters';} else {var title = 'Coach Map w/ Filters' }
		var form = nlapiCreateForm(title);
			form.addFieldGroup('filters','Current Filters');

		var master_coach = form.addField('custpage_master_coach','checkbox','Only Show Parent Record',null,'filters');
			master_coach.setLayoutType('normal','startcol');
			master_coach.setDisplayType('inline');
			master_coach.setDefaultValue(mc_value);

		//Add in Is Master Coach
		//custentity_coach_masterttt
		var isMasterTTT = form.addField('custpage_masterttt','checkbox','Is Master Coach', null, 'filters');
			isMasterTTT.setDefaultValue(mttt_value);
			isMasterTTT.setDisplayType('inline');
			
		//Add in Is Virtual Certified
		//custentity_coach_isvirtualcertified
		var isVirtual = form.addField('custpage_virtual','checkbox', 'Is Virtual Certified', null, 'filters');
			isVirtual.setDefaultValue(virtual_value);
			isVirtual.setDisplayType('inline');
				
			
		var countries = form.addField('custpage_delivery_country','select','Delivery Country','customrecord_country','filters');
			countries.setLayoutType('normal','startcol');
			countries.setDisplayType('inline');
			countries.setDefaultValue(dc_value); nlapiLogExecution('debug','countries',dc_value.length);
			
		var goLarge = form.addField('custpage_golarge','multiselect', 'Other Skills','customlist_coach_product_upskill', 'filters');
			goLarge.setLayoutType('normal','startcol');
			goLarge.setDisplayType('inline');
			goLarge.setDefaultValue(large_value);	

		if(category_pref){var category = form.addField('custpage_category','select','Coach Category','vendorcategory','filters');
			category.setDisplayType('inline');
			category.setDefaultValue(category_pref);}

		var map = form.addField('custpage_google_map','inlinehtml','map',null,null);
		    map.setLayoutType('outsidebelow','startrow');
		    map.setDefaultValue('<div id="map_canvas" style="border:1px; width:1350px; clear:left; height:720px; float:left"></div>');

		var coach_list = form.addField('custpage_coach_list','inlinehtml','coach_list',null,null);
		    coach_list.setLayoutType('outsidebelow');
		    coach_list.setDefaultValue('<div id="coach_count" style="font-size:14px; float:left; padding-left:10px;"><b>Number of Coaches Found: </b>'+new_suppliers.length+'</div><div id="slidedeck" style="border:1px; width:350px; height:720px; overflow-y:scroll; float:left; padding-left: 10; padding-right:10;"></div>');   
		   
		var google_map_script_reference = form.addField('custpage_googlemapscript','inlinehtml');
			google_map_script_reference.setDefaultValue('<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>');
		
		var supplier_json = form.addField('custpage_supplier_json','inlinehtml','supplier',null,null);
			supplier_json.setDisplayType('hidden');
			supplier_json.setDefaultValue(JSON.stringify(new_suppliers)); nlapiLogExecution('debug','SupplierText',JSON.stringify(new_suppliers));

		form.setScript('customscript_cb_sl_cl_geocode_suppliers');

		var script = "window.open(\'/app/site/hosting/scriptlet.nl?script=254&deploy=1\',target=\'_self\');";
		if(category_preference == 5){script = "window.open(\'/app/site/hosting/scriptlet.nl?script=254&deploy=3\',target=\'_self\');";}
		if(category_preference == 8){script = "window.open(\'/app/site/hosting/scriptlet.nl?script=254&deploy=4\',target=\'_self\');";}
		if(category_preference == 9){script = "window.open(\'/app/site/hosting/scriptlet.nl?script=254&deploy=2\',target=\'_self\');";}
		if(category_preference == 10){script = "window.open(\'/app/site/hosting/scriptlet.nl?script=254&deploy=5\',target=\'_self\');";}
		form.addButton('resetmap','Clear Map Filters',script);
		response.writePage( form );
	}
}

//client script variables used in multiple functions
var infowindows = new Array();
var nsmap = null;
var markers = new Array();

function drawMap(){
	try{
		var suppliers = JSON.parse(nlapiGetFieldValue('custpage_supplier_json')); 	 	
		var slide_deck = '';
		var full_slide_deck ='';
		var info_window_text = new Array();

		//draw initial map centered on atlantic ocean - zoom 2.5
		var center = new google.maps.LatLng(45, -55);
		var moption = {
			center: center,
			zoom:10,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		
		nsmap = new google.maps.Map(document.getElementById('map_canvas'),moption); 
		var bounds = new google.maps.LatLngBounds();
		var ts = 'style="font-family: sans-serif;-webkit-font-smoothing: antialiased;font-size: 115%; width: 300; overflow: auto; display: block;"';
		var ths = 'style="background-color: rgb(112, 196, 105); font-weight: normal; color: white; padding: 10px 20px; text-align: center; font-size: 14px;"';
		var tds_1 = 'style="background-color: rgb(238, 238, 238); padding: 10px 15px; color: rgb(111, 111, 111); font-size: 12px;"';
		var tds_2 = 'style="background-color: rgb(238, 238, 238); padding: 10px 15px; color: rgb(111, 111, 111); font-size: 12px;"';
		
		for(var y=0; y<suppliers.length; y++){
			//drop pins on map
			slide_deck =	'<div><table id="'+(y+1)+'" '+ts+'>'+
							'<tr><th colspan="2" '+ths+'><a href="javascript:clicked('+y+')" style="color:white;"><b>'+suppliers[y].supplier+'</b><br /></a></th></tr></table></div>';
						

			info_window_text = 	'<div><table id="'+(y+1)+'" '+ts+'>'+
								'<tr><th colspan="2" '+ths+'><span style="color:white"><b>'+suppliers[y].supplier+'</b></span></th></tr>'+
								'<tr><td '+tds_1+'><b>Email:</b></td><td '+tds_2+'>'+suppliers[y].email+'</td></tr>'+
								'<tr><td '+tds_1+'><b>Delivery Country:</b></td><td '+tds_2+'>'+suppliers[y].del_country+'</td></tr>'+
								'<tr><td '+tds_1+'><b>Languages:</b></td><td '+tds_2+'>'+suppliers[y].languages+'</td></tr>'+
								'<tr><td '+tds_1+'><b>Accounts:</b></td><td '+tds_2+'>'+suppliers[y].accounts+'</td></tr>'+
								'<tr><td '+tds_1+'><b>Industry Background:</b></td><td '+tds_2+'>'+suppliers[y].ind_background+'</td></tr>'+
								'<tr><td '+tds_1+'><b>Coaching Background:</b></td><td '+tds_2+'>'+suppliers[y].coach_background+'</td></tr></table></div>';					
					
			full_slide_deck += slide_deck;
		

			var infowindow = new google.maps.InfoWindow({content: info_window_text}); //create info window with slide deck values
			
			var sup_loc = new google.maps.LatLng(suppliers[y].lat,suppliers[y].lng);
			var marker = new google.maps.Marker({
				position: sup_loc,
				map:nsmap,
				animation: google.maps.Animation.DROP,
				title:suppliers[y].supplier,
				icon: PinImageUrl	
			}); 	

			bounds.extend(sup_loc);

			bindInfoWindow(marker, nsmap, infowindow, info_window_text);
			infowindows.push(infowindow);
			markers.push(marker);
		} nsmap.fitBounds(bounds);

		var sd = document.getElementById('slidedeck');
		sd.innerHTML = full_slide_deck;

		document.getElementById('map_canvas').style.display = 'block';
		google.maps.event.addDomListener(window, 'load', drawMap);

		} catch(e) {
		nlapiLogExecution('error','Netsuite Said: ',e);
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