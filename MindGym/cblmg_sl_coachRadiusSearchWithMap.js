/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Aug 2014     AnJoe
 *
 */

/**
 * @param {nlobjRequest} req Request object
 * @param {nlobjResponse} res Response object
 * @returns {Void} Any output is written via response object
 */
function coachRadiusSearch(req, res){

	var booklat = req.getParameter('booklat');
	var booklng = req.getParameter('booklng');
	var bookcountrytext = req.getParameter('bookcountry');
	var bookcountryid = req.getParameter('bookcountryid');
	var bookSubsId = req.getParameter('booksubsid');
	var bookSelCoach = req.getParameter('selectedcoach');
	var bookBuyerName = req.getParameter('buyer');
	var bookDateTime = req.getParameter('bookdatetime');
	var bookCourse = req.getParameter('course');
	var bookItem = req.getParameter('item');
	var bookSelCoachText = req.getParameter('selectedcoachtext');
	var bookClientText = req.getParameter('client');
	var bookEntityId = req.getParameter('entityid');
	var bookId = req.getParameter('bookid');
	
	//100 Miles or 1000 Miles
	var searchRadius = 100;
	//if booking country is NOT United Kingdom, search 1000 miles
	if (bookcountrytext != 'United Kingdom') {
		searchRadius = 1000;
	}
	
	if (!bookcountryid || !bookcountrytext || !booklat || !booklng || !bookSubsId) {
		throw nlapiCreateError('COACH_RADIUS_SEARCH_ERROR', 'Missing Booking Latitude, Booking Longitude, Booking Country Info  and/or  Booking Subsidiary', false);
	}
	
	var flt=new Array();
	var col=new Array();
	
	//Radius look up Formula using bookings' Lat/Lng compared against Coaches Lat/Lng
	var formulaShell ='3956 * 2 * ASIN( SQRT( POWER( SIN((#BookLat#-ABS({custentity_cbl_shipadr_lat})) * 3.14159265358979/180 / 2),2 ) + COS(#BookLat# * 3.14159265358979/180 ) * '+
					  'COS( abs ({custentity_cbl_shipadr_lat}) * 3.14159265358979/180) * POWER( SIN((#BookLng# - TO_NUMBER({custentity_cbl_shipadr_lng})) * 3.14159265358979/180 / 2), 2 ) ))';
	
	
	//Distance calculation from Booking location to Coach.
	//	- Calculation in MILES.
	//	- Direct Distance
	var distanceFormulaShell = 'ROUND(3956 * 2 * ASIN( SQRT( POWER( SIN((#BookLat#-ABS({custentity_cbl_shipadr_lat})) * 3.14159265358979/180 / 2),2 ) + COS(#BookLat# * 3.14159265358979/180 ) '+
							   '* COS( abs ({custentity_cbl_shipadr_lat}) * 3.14159265358979/180) * POWER( SIN((#BookLng# - TO_NUMBER({custentity_cbl_shipadr_lng})) * 3.14159265358979/180 / 2), 2 ) )),2)';
	
	formulaShell = strGlobalReplace(formulaShell,'#BookLat#',booklat);
	formulaShell = strGlobalReplace(formulaShell,'#BookLng#',booklng);
	distanceFormulaShell = strGlobalReplace(distanceFormulaShell,'#BookLat#',booklat);
	distanceFormulaShell = strGlobalReplace(distanceFormulaShell,'#BookLng#',booklng);
	
	flt[0]=new nlobjSearchFilter('formulanumeric',null,'lessthanorequalto',searchRadius);
	flt[0].setFormula(formulaShell);
	//run programmatic search instead of relying on Saved Search
	flt.push(new nlobjSearchFilter('custentity_cbl_shipadr_lat', null, 'isnotempty'));
	flt.push(new nlobjSearchFilter('custentity_cbl_shipadr_lng', null, 'isnotempty'));
	flt.push(new nlobjSearchFilter('isinactive', null, 'is','F'));
	//matching subsidiary on coach level
	flt.push(new nlobjSearchFilter('subsidiary', null, 'anyof', bookSubsId));
	
	var distance = new nlobjSearchColumn('formulanumeric').setFormula(distanceFormulaShell).setSort();
	col.push(distance);
	col.push(new nlobjSearchColumn('custentity_cbl_shipadr_lat'));
	col.push(new nlobjSearchColumn('custentity_cbl_shipadr_lng'));
	col.push(new nlobjSearchColumn('firstname'));
	col.push(new nlobjSearchColumn('lastname'));
	//col.push(new nlobjSearchColumn('email'));
	//col.push(new nlobjSearchColumn('phone')); //Work 
	//col.push(new nlobjSearchColumn('mobilephone'));	
	//col.push(new nlobjSearchColumn('homephone'));
	col.push(new nlobjSearchColumn('category'));
	col.push(new nlobjSearchColumn('custentity_coach_primarydeliverycountry'));
	col.push(new nlobjSearchColumn('companyname'));
	col.push(new nlobjSearchColumn('custentity_coach_nativelanguage')); //Native Language
	col.push(new nlobjSearchColumn('custentity_languages')); //Fluent Languages
	col.push(new nlobjSearchColumn('custentity25')); //Travel Insurance
	col.push(new nlobjSearchColumn('shipaddress'));
	col.push(new nlobjSearchColumn('shipaddress1'));
	col.push(new nlobjSearchColumn('shipaddress2'));
	col.push(new nlobjSearchColumn('shipaddress3'));
	col.push(new nlobjSearchColumn('shipcity'));
	col.push(new nlobjSearchColumn('shipstate'));
	col.push(new nlobjSearchColumn('shipzip'));
	col.push(new nlobjSearchColumn('shipcountry'));
	
	var vjson = {
		"booklat":booklat,
		"booklng":booklng,
		"totalmatch":0,
		"coaches":{},
		"selectedcoach":{}
	};
	var rslt = nlapiSearchRecord('vendor',null,flt,col);
	if (rslt && rslt.length > 0) {
		vjson.totalmatch = rslt.length;
	}

	var matchheader = '<b>Found '+(rslt?rslt.length:0)+' Coach(es) in <i>'+bookcountrytext+'</i> within '+(parseInt(searchRadius)/0.62137).toFixed(2)+' Kilometer ('+searchRadius+' Miles) Radius</b><br/>'+
					  (bookSelCoach?'<br/><input type="button" style="padding: 3px" value="Unset Coach" onclick="setCoachOnBooking(\'\')"/>':'')+
					  '<br/><b>Booking Info:</b> '+
					  (bookId?'<a href="'+nlapiResolveURL('RECORD', 'job', bookId, 'VIEW')+'" target="_blank">View '+bookEntityId+'</a><br/>':'Booking Has not been created yet (In Create Mode) <br/>')+
					  '<table style="font-size: 12px; width: 100%"><tr>'+
					  '<td style="border: 1px solid black"><b>Client:</b><br/>&nbsp; &raquo; '+bookClientText+'</td>'+
					  '<td style="border: 1px solid black"><b>Selected Course:</b><br/>&nbsp; &raquo; '+bookSelCoachText+'</td>'+
					  '<td style="border: 1px solid black"><b>Client/Buyer:</b><br/>&nbsp; &raquo; '+bookBuyerName+'</td>'+
					  '<td style="border: 1px solid black"><b>Booking Date/Time:</b><br/>&nbsp; &raquo; '+bookDateTime+'</td>'+
					  '<td style="border: 1px solid black"><b>Course:</b><br/>&nbsp; &raquo; '+bookCourse+'</td>'+
					  '<td style="border: 1px solid black"><b>Item: </b><br/>&nbsp; &raquo; '+bookItem+'</td></tr></table>';
	var matchdata = '';
	
	for (var i=0; rslt && i < rslt.length; i++) {
		vjson.coaches[rslt[i].getId()] = {
			"distancem":rslt[i].getValue(col[0]),
			"distancek":parseFloat(rslt[i].getValue(col[0])) / 0.62137,
			"clat":rslt[i].getValue('custentity_cbl_shipadr_lat'),
			"clng":rslt[i].getValue('custentity_cbl_shipadr_lng'),
			"company":rslt[i].getValue('companyname'),
			"firstname":rslt[i].getValue('firstname'),
			"lastname":rslt[i].getValue('lastname'),
			"category":rslt[i].getText('category'),
			"primecountry":rslt[i].getText('custentity_coach_primarydeliverycountry'),
			"language":rslt[i].getText('custentity_coach_nativelanguage'),
			"otherlanguage":rslt[i].getText('custentity_languages'),
			"shipaddress":rslt[i].getValue('shipaddress')
		};
		
		//add selectedcoach json if it matches
		if (rslt[i].getId() == bookSelCoach) {
			vjson.selectedcoach = vjson.coaches[rslt[i].getId()];
		}
		
		//build match data
		var tjson = vjson.coaches[rslt[i].getId()];
		
		matchdata += "<b>&raquo; <a href='#' onclick='setNewCoach("+tjson.clat+", "+tjson.clng+", "+rslt[i].getId()+")'>View "+tjson.firstname+" "+tjson.lastname+" ("+parseFloat(tjson.distancek).toFixed(2)+" km / "+tjson.distancem+" mi) on Map</a></b><br/>"+
					 "&nbsp; &nbsp; Category: "+tjson.category+"<br/>"+
					 "&nbsp; &nbsp; <input type='button' style='padding: 3px' value='Set Coach' onclick='setCoachOnBooking("+rslt[i].getId()+")'/><br/><br/>";
	}
	
	//check to see if selected coach is in the search result
	//bookSelCoach
	if (bookSelCoach && vjson && !vjson.coaches[bookSelCoach]) {
		log('debug','load coach and set value','bookSelCoach');
		var coachrec = nlapiLoadRecord('vendor', bookSelCoach);
		if (coachrec.getFieldValue('custentity_cbl_shipadr_lat') && coachrec.getFieldValue('custentity_cbl_shipadr_lng')) {
			
			var distancem = Math.round(3956 * 2 * Math.asin( Math.sqrt( Math.pow( Math.sin((parseFloat(booklat)-Math.abs(parseFloat(coachrec.getFieldValue('custentity_cbl_shipadr_lat')))) * 3.14159265358979/180 / 2),2 ) + 
							Math.cos(parseFloat(booklat) * 3.14159265358979/180 ) * Math.cos( Math.abs (parseFloat(coachrec.getFieldValue('custentity_cbl_shipadr_lat'))) * 3.14159265358979/180) * 
							Math.pow( Math.sin((parseFloat(booklng) - parseFloat(coachrec.getFieldValue('custentity_cbl_shipadr_lng'))) * 3.14159265358979/180 / 2), 2 ) )),2);
			var distancek = parseFloat(distancem) / 0.62137;

			vjson.selectedcoach = {
					"distancem":distancem,
					"distancek":distancek,
					"clat":coachrec.getFieldValue('custentity_cbl_shipadr_lat'),
					"clng":coachrec.getFieldValue('custentity_cbl_shipadr_lng'),
					"company":coachrec.getFieldValue('companyname'),
					"firstname":coachrec.getFieldValue('firstname'),
					"lastname":coachrec.getFieldValue('lastname'),
					"category":coachrec.getFieldText('category'),
					"primecountry":coachrec.getFieldText('custentity_coach_primarydeliverycountry'),
					"language":coachrec.getFieldText('custentity_coach_nativelanguage'),
					"otherlanguage":coachrec.getFieldText('custentity_languages'),
					"shipaddress":coachrec.getFieldValue('shipaddress')
			};
		}		
	}
	
	var nsform = nlapiCreateForm('Optimal Coach Lookup', true);
	nsform.setScript('customscript_cbl_cs_radiusslhelper');
	//add json to page
	
	/**
	 * Label function added as the SL loades.
	 */
	var labelJs = 	'var nsmap = null;'+
					'var infojson = {};'+
					'function setNewCoach(_lat, _lng, _id) {'+
					'		nsmap.setCenter(new google.maps.LatLng(_lat, _lng));'+
					'		infojson[_id].open(nsmap);'+
					 '}'+
					"function DistanceLabel(_centerLatLng, _distanceText, nsmap) {"+
					"	this.center_ = _centerLatLng;"+
					"	this.dist_ = _distanceText;"+
					"	this.display_ = true;"+
						
					"	this.div_ = null;"+
					"	this.setMap(nsmap);"+
					"}"+

					"DistanceLabel.prototype = new google.maps.OverlayView();"+
					
					"DistanceLabel.prototype.onAdd = function() {"+
					"	var div = document.createElement('DIV');"+
					"	var span = document.createElement('span');"+
					"	span.style.cssText = 'position: relative; left: -50%; top: -50px; padding: 2px; font-size:9px;font-weight:bold; background-color:#FFFFFF; border: 1px black solid;';"+
					"	span.innerHTML = this.dist_;"+
						
					"	div.appendChild(span);"+
					"	div.style.cssText = 'position:absolute';"+
					"	this.div_ = div;"+
					"	var pane = this.getPanes();"+
					"	pane.overlayImage.appendChild(div);"+
					"};"+
					
					"DistanceLabel.prototype.draw = function() {"+
					"	var ovProjection = this.getProjection();"+
					"	var position = ovProjection.fromLatLngToDivPixel(this.center_);"+
					"	var div = this.div_;"+
					"	div.style.left = position.x+'px';"+
					"	div.style.top = position.y+'px';"+
					//visible - hide it for now
					"	div.style.visibility = 'hidden'; "+
					"};"+
					
					"DistanceLabel.prototype.onRemove = function() {"+
					"	this.div_.parentNote.removeChild(this.div_);"+
					"};";
	
	nsform.addField('custpage_vjson','inlinehtml','',null,null).setDefaultValue(
			'<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>'+
			'<script type="text/javascript">'+
			'var vjson = '+JSON.stringify(vjson)+';'+
			labelJs+
			'</script>');
	
	var googleMapHtml = nsform.addField('custpage_googlemapsct','inlinehtml');
	googleMapHtml.setDefaultValue('<table style="width: 900px;" cellpadding="0" cellspacing="0">'+
								  '<tr><td colspan="2" style="font-size: 14px">'+matchheader+'</td></tr>'+
								  '<tr><td colspan="2"><br/></td></tr>'+
								  '<tr>'+
								  '<td><div id="map_canvas" style="width: 750px; height: 500px; border: 1px black solid"></div></td>'+
								  '<td style="font-size: 12px"><div style="width: 380px; height: 500px; padding: 5px; overflow: scroll">'+matchdata+'</div></td></tr></table>');
	
	res.writePage(nsform);
	
}

/********* Client Scripts ******************/

function radiusSlPageInit(type) {
	if (vjson) {
		
		//enable look up.
		var PinBookImageUrl = 'https://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_red.png';
		var PinCoachImageUrl = 'https://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_green.png';
		
		//selected coach
		var PinSelCoachImageUrl = 'https://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_yellow.png';
		
		try {
			var latlng = new google.maps.LatLng(vjson.booklat, vjson.booklng);
			var moption = {
					center:latlng,
					zoom:7,
					mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			
			nsmap = new google.maps.Map(document.getElementById('map_canvas'),moption);
			//Drops Lead Pin on the map
			new google.maps.Marker({
				position: latlng,
				map:nsmap,
				animation: google.maps.Animation.DROP,
				title:"Nearby Coaches",
				icon: PinBookImageUrl	
			});
			
			//Add in Selected Coach IF found
			//vjson.selectedcoach
			if (vjson.selectedcoach && vjson.selectedcoach['clat']) {
				var ccmarker = new google.maps.Marker({
					position: new google.maps.LatLng(vjson.selectedcoach.clat, vjson.selectedcoach.clng),
					map:nsmap,
					animation: google.maps.Animation.DROP,
					title:vjson.selectedcoach.firstname+' '+vjson.selectedcoach.lastname+' ('+parseFloat(vjson.selectedcoach.distancek).toFixed(2)+' km / '+vjson.selectedcoach.distancem+' mi)',
					icon: PinSelCoachImageUrl
				});
				
				//Build out infowindow details
				var cmg = new google.maps.InfoWindow({
					content: '<div style="font-size: 13px; width: 250px; height: 150px">'+
							 '<b>'+vjson.selectedcoach.firstname+' '+vjson.selectedcoach.lastname+' ('+parseFloat(vjson.selectedcoach.distancek).toFixed(2)+' km / '+vjson.selectedcoach.distancem+' mi)</b>'+
							 '<ul>'+
							 '<li>Category: '+vjson.selectedcoach.category+'</li>'+
							 '<li>Primary Delivery Country: '+vjson.selectedcoach.primecountry+'</li>'+
							 '<li>Native Language: '+vjson.selectedcoach.language+'</li>'+
							 '<li>Other Language: '+vjson.selectedcoach.otherlanguage+'</li>'+
							 //'<li>Coach Shipping Address:<br/>'+vjson.coaches[c].shipaddress+'</li>'+
							 '</ul>'+
							 '</div>',
					position: new google.maps.LatLng(vjson.selectedcoach.clat, vjson.selectedcoach.clng)
				});
				
				//add onclick feature to display client detail on the Marker
				google.maps.event.addListener(ccmarker,'click',function() {
					cmg.open(nsmap, this);
				});
				
			}
			
			
			//loop through and add coaches
			for (var c in vjson.coaches) {
				
				//Don't Plot if selected coach is already plotted
				if (vjson.coaches[c].clat == vjson.selectedcoach.clat && vjson.coaches[c].clng == vjson.selectedcoach.clng) {
					continue;
				}
				
				var divcontent='<div style="font-size: 13px; width: 250px; height: 150px">'+
				 '<b>'+vjson.coaches[c].firstname+' '+vjson.coaches[c].lastname+' ('+parseFloat(vjson.coaches[c].distancek).toFixed(2)+' km / '+vjson.coaches[c].distancem+' mi)</b>'+
				 '<ul>'+
				 '<li>Category: '+vjson.coaches[c].category+'</li>'+
				 '<li>Primary Delivery Country: '+vjson.coaches[c].primecountry+'</li>'+
				 '<li>Native Language: '+vjson.coaches[c].language+'</li>'+
				 '<li>Other Language: '+vjson.coaches[c].otherlanguage+'</li>'+
				 //'<li>Coach Shipping Address:<br/>'+vjson.coaches[c].shipaddress+'</li>'+
				 '</ul>'+
				 '</div>';
				
				var cmarker = new google.maps.Marker({
					position: new google.maps.LatLng(vjson.coaches[c].clat, vjson.coaches[c].clng),
					map:nsmap,
					animation: google.maps.Animation.DROP,
					title:vjson.coaches[c].firstname+' '+vjson.coaches[c].lastname+' ('+parseFloat(vjson.coaches[c].distancek).toFixed(2)+' km / '+vjson.coaches[c].distancem+' mi)',
					icon: PinCoachImageUrl,
					html:divcontent
				});
				
				//Build out infowindow details
				var mg = new google.maps.InfoWindow({
					content: divcontent,
					position: new google.maps.LatLng(vjson.coaches[c].clat, vjson.coaches[c].clng)
				});
				
				//add onclick feature to display client detail on the Marker
				google.maps.event.addListener(cmarker,'click',function() {
					mg.setContent(this.html);
					mg.open(nsmap, this);
				});
				
				infojson[c] = mg;
				
				
				
				//new DistanceLabel(new google.maps.LatLng(vjson.coaches[c].clat, vjson.coaches[c].clng), parseFloat(vjson.coaches[c].distancek).toFixed(2)+' km / '+vjson.coaches[c].distancem+' mi', nsmap);
				
			}
			
			/**
			google.maps.event.addListener(nsmap, 'zoom_changed', function() {
				setTimeout(zipLabelToggle, 2000);
			});
			*/
		} catch(e) {
			alert('Error Drawing Map: '+e.toString());
		}
		
	}
}

function setCoachOnBooking(_id) {
	window.opener.setValueFromRadiusLookup(_id);
	window.close();
}




