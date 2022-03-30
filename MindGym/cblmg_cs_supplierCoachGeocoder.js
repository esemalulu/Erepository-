/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jul 2014     AnJoe
 * 
 * 8/2/2014
 * Modified to allow geocoding on Booking records
 */

var paramGeoCodeFormIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct246_formids').split(',');
var paramGeoCodeSupplierCategoryIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct246_categoryids').split(',');

var geoflds = ['geoadr1','geoadr2','geoadr3','geocity','geocountystate','geopostcode','geocountry'];

var oShipAdrText = '';

var reGeoCode = false;

var PinImageUrl = 'https://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_red.png';

var canGeoCode = false;


function supplierPageInit(type) {
	//grab default shipping address on the record
	var shipLine = nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T');
	
	//2014v2 Modification. nlapiGetLineItemValue on addressbook no longer works. MUST select and use nlapiGetCurrentLineItemValue
	if (shipLine && parseInt(shipLine) > 0) {
		nlapiSelectLineItem('addressbook', shipLine);
		oShipAdrText = nlapiGetCurrentLineItemValue('addressbook', 'addrtext');
		//oShipAdrText = nlapiGetLineItemValue('addressbook', 'addrtext', shipLine)?nlapiGetLineItemValue('addressbook', 'addrtext', shipLine):'';
	}
	
	//Changing it so that we ONLY execute drawGoogleMap when it's handled by userinterface
	if (paramGeoCodeFormIds.contains(nlapiGetFieldValue('customform')) && nlapiGetContext().getExecutionContext() == 'userinterface') {
		canGeoCode = true;
		drawGoogleMapByGeoCode();
	}
		
}

function supplierValidateLine(type) {
	if (canGeoCode && type == 'addressbook' && nlapiGetCurrentLineItemValue(type, 'defaultshipping')=='T') {
		
		var nShipAdrText = nlapiGetCurrentLineItemValue('addressbook', 'addrtext')?nlapiGetCurrentLineItemValue('addressbook', 'addrtext'):'';
		//alert(oShipAdrText +' // '+nShipAdrText);
		if (oShipAdrText != nShipAdrText) {
			reGeoCode = true;
			nlapiSetFieldValue('custentity_cbl_shipadr_lat','',false,true);
            nlapiSetFieldValue('custentity_cbl_shipadr_lng','',false,true);
            nlapiSetFieldValue('custentity_cbl_shipadr_geodetail', '',false,true);
		}
		
	}
	
	return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function supplierSaveRecord(){

	//Attempt to geocode ONLY on User Interface
	if (canGeoCode && nlapiGetContext().getExecutionContext() == 'userinterface') {
		
		var shipLine = nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T');
		if (shipLine >= 1 && (!nlapiGetFieldValue('custentity_cbl_shipadr_lat') || !nlapiGetFieldValue('custentity_cbl_shipadr_lng')) && paramGeoCodeSupplierCategoryIds.contains(nlapiGetFieldValue('category'))) {
			alert('Please Geocode Shipping Address');
			return false;
		}
		
	}
	
    return true;
}

function supplierFldChanged(type, name, linenum) {
	
	if (!canGeoCode) {
		return;
	}
	
	//If both Lat/Lng values are set, display the Google Map map_canvas
	//ONLY Redraw IF Both Lat/Lng values are provided
	if ((name=='custentity_cbl_shipadr_lat' || name=='custentity_cbl_shipadr_lng') && nlapiGetFieldValue('custentity_cbl_shipadr_lat') && nlapiGetFieldValue('custentity_cbl_shipadr_lng')) {
	
		drawGoogleMapByGeoCode();
		
	}
	
}

/**
 * ONLY on booking record to fire suitelet that looks up matching clients
 * @returns {Boolean}
 */
function radiusCoachLookup() {
	
	if (!nlapiGetFieldValue('custentity_cbl_shipadr_lat') && !nlapiGetFieldValue('custentity_cbl_shipadr_lng')) {
		alert('Please Geocode Booking Location Address under Location Subtab');
		return false;
	}
	
	//8/5/2014 - Client requested following changes:
	//	- Subsidiary search
	//	- 100 within UK; 1000 outside UK
	//	- Selected coach pin
	//	- Buyer
	//	- 
	var selectedCoachId = nlapiGetFieldValue('custentity_bo_coach');
	var bookingSubsId = nlapiGetFieldValue('subsidiary');
	var bookingBuyer = nlapiGetFieldText('custentity_bo_buyer');
	var bookingCourse = nlapiGetFieldText('custentity_bo_course');
	var bookingItem = nlapiGetFieldText('custentity_bo_item');
	var bookingDate = nlapiGetFieldValue('enddate');
	var bookingTime = nlapiGetFieldValue('custentity_bo_eventtime');
	var selectedCoachText = nlapiGetFieldText('custentity_bo_coach');
	var bookingClientText = nlapiGetFieldText('parent');
	
	//customscript_cbl_sl_radiuscoachsearch  
	//customdeploy_cbl_sl_radiuscoachsearchd  
	var radiusSlUrl = nlapiResolveURL('SUITELET', 'customscript_cbl_sl_radiuscoachsearch', 'customdeploy_cbl_sl_radiuscoachsearchd', 'VIEW')+
					  '&booklat='+nlapiGetFieldValue('custentity_cbl_shipadr_lat')+'&booklng='+nlapiGetFieldValue('custentity_cbl_shipadr_lng')+
					  '&bookcountryid='+nlapiGetFieldValue('custentity_bo_eventcountry')+'&bookcountry='+nlapiGetFieldText('custentity_bo_eventcountry')+
					  '&selectedcoach='+selectedCoachId+'&booksubsid='+bookingSubsId+'&buyer='+encodeURIComponent(bookingBuyer)+
					  '&bookdatetime='+encodeURIComponent(bookingDate+' '+bookingTime)+'&course='+encodeURIComponent(bookingCourse)+
					  '&item='+encodeURIComponent(bookingItem)+'&client='+bookingClientText+'&selectedcoachtext='+selectedCoachText+
					  '&entityid='+nlapiGetFieldValue('entityid')+'&bookid='+nlapiGetRecordId()+'&bookingtype='+nlapiGetFieldValue('jobtype');
	
	window.open(radiusSlUrl,'Radius_Search','width=1200,height=700,resizable=yes,scrollbars=yes');
	
}

function setValueFromRadiusLookup(_id) {
	nlapiSetFieldValue('custentity_bo_coach', _id, true, true);
}

function drawGoogleMapByGeoCode() {
	
	//Make sure map_canvas div element is present
	if (!document.getElementById('map_canvas'))
	{
		return;
	}
	
	if (canGeoCode && nlapiGetFieldValue('custentity_cbl_shipadr_lat') && nlapiGetFieldValue('custentity_cbl_shipadr_lng')) {		
		try {
			var nsmap = null;
			var latlng = new google.maps.LatLng(nlapiGetFieldValue('custentity_cbl_shipadr_lat'), nlapiGetFieldValue('custentity_cbl_shipadr_lng'));
			var moption = {
					center:latlng,
					zoom:15,
					mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			
			nsmap = new google.maps.Map(document.getElementById('map_canvas'),moption);
			//Drops Lead Pin on the map
			new google.maps.Marker({
				position: latlng,
				map:nsmap,
				animation: google.maps.Animation.DROP,
				title:"Geocode Location",
				icon: PinImageUrl	
			});
			
			/**
			google.maps.event.addListener(nsmap, 'zoom_changed', function() {
				setTimeout(zipLabelToggle, 2000);
			});
			*/
		} catch(e) {
			alert('Error Drawing Map: '+e.toString());
		}
		
		document.getElementById('map_canvas').style.display = 'block';
		
	} else {
		//Hide The Mini Map
		document.getElementById('map_canvas').style.display = 'none';
	}
}



function geoCodeShipAddress() {
	//grab default shipping address on the record
	var shipLine = nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T');
	var fldschecked = false;
	
	var geoAddressText = '';
	
	for (var g=0; g < geoflds.length; g++) {
		if (document.getElementById(geoflds[g]) && document.getElementById(geoflds[g]).checked) {
			fldschecked=true;

			if (nlapiGetRecordType() == 'job') {
				
				//for Booking record. country and state drop down is custom record. check for existance of value instead of text.
				//TEXT value will be used for geo coding
				if (geoflds[g]=='geocountry') {
					geoAddressText += nlapiGetFieldValue(document.getElementById(geoflds[g]).value)?nlapiGetFieldText(document.getElementById(geoflds[g]).value):''+' ';
				} else if (geoflds[g]=='geocountry') {
					
					var stateVal = nlapiGetFieldValue(document.getElementById(geoflds[g]).value)?nlapiGetFieldText(document.getElementById(geoflds[g]).value):'';
					if (stateVal) {
						stateVal = strGlobalReplace(stateVal, 'CA - ', '');
						stateVal = strGlobalReplace(stateVal, 'US - ', '');
						
						geoAddressText += stateVal+' ';
					}
					
				} else {
					geoAddressText += nlapiGetFieldValue(document.getElementById(geoflds[g]).value)?nlapiGetFieldValue(document.getElementById(geoflds[g]).value):''+' ';
				}
				
			} else {
				
				//2014v2 Update - Must use nlapiGetCurrentLineItemValue
				nlapiSelectLineItem('addressbook', shipLine);
				
				if (geoflds[g]=='geocountry') {
					geoAddressText += nlapiGetCurrentLineItemText('addressbook',document.getElementById(geoflds[g]).value)?nlapiGetCurrentLineItemText('addressbook',document.getElementById(geoflds[g]).value):''+' ';
				} else {
					geoAddressText += nlapiGetCurrentLineItemValue('addressbook',document.getElementById(geoflds[g]).value)?nlapiGetCurrentLineItemValue('addressbook',document.getElementById(geoflds[g]).value):''+' ';
				}
			}
			
		}
	}
	
	if (!fldschecked) {
		alert('Please check address fields to use for Geocoding.');
		return false;
	}
	
	if (nlapiGetRecordType() != 'job') {
		if (shipLine < 1) {
			alert('Default Shipping Address is not available for this Supplier under Address Subtab.');
			return false;
		}
	}
	
	if (!strTrim(geoAddressText)) {
		alert('Address to geocode is empty.  Try setting address component fields and try again');
		return false;
	}
	
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode( { 'address': geoAddressText}, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
        	  
        	  //alert(JSON.stringify(results));
        	  
              nlapiSetFieldValue('custentity_cbl_shipadr_lat',results[0].geometry.location.lat());
              nlapiSetFieldValue('custentity_cbl_shipadr_lng',results[0].geometry.location.lng());
              
              var matchType = results[0].geometry.location_type;
              var matchText = '';
              if (matchType == 'ROOFTOP') {
            	  matchText = '<i>'+matchType+'</i><br/>Returned result is a precise geocode for which we have location information accurate down to street address precision';
              } else if (matchType == 'RANGE_INTERPOLATED') {
            	  matchText = '<i>'+matchType+'</i><br/>Returned result reflects an approximation (usually on a road) interpolated between two precise points (such as intersections). Interpolated results are generally returned when rooftop geocodes are unavailable for a street address.';
              } else if (matchType == 'GEOMETRIC_CENTER') {
            	  matchText = '<i>'+matchType+'</i><br/>Returned result is the geometric center of a result such as a polyline (for example, a street) or polygon (region).';
              }  else if (matchType == 'APPROXIMATE') {
            	  matchText = '<i>'+matchType+'</i><br/>Returned result is approximate.';
              } 
              
              nlapiSetFieldValue('custentity_cbl_shipadr_geodetail',
            		  '<span style="color:green; font-weight: bold">Success: </span><br/>'+
            		  '<b>Google Formatted Address: </b><br/>'+results[0].formatted_address+'<br/><br/>'+
            		  '<b>Address Match Type: </b><br/>'+matchText);
              
            } else {
            	nlapiSetFieldValue('custentity_cbl_shipadr_lat','');
            	nlapiSetFieldValue('custentity_cbl_shipadr_lng','');
            	
            	nlapiSetFieldValue('custentity_cbl_shipadr_geodetail',
            			'<span style="color:red; font-weight: bold">Geocode Error: '+status+'</span><br/>Try different combination of Address fields. ');
            }
	});
	
	//alert(geoAddressText);
	
}
