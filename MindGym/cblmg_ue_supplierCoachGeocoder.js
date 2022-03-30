/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jul 2014     AnJoe
 *
 * 8/2/2014
 * Modified to allow geocoding on Booking records
 *
 */

var paramGeoCodeFormIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct246_formids').split(',');
var paramGeoCodeSupplierCategoryIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct246_categoryids').split(',');

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function supplierBeforeLoad(type, form, request){

	//create google map javascript API to form
	var googleMapSctRef = form.addField('custpage_googlemapsct','inlinehtml');
	googleMapSctRef.setDefaultValue('<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>');

	if ( type == 'view' && nlapiGetContext().getExecutionContext() == 'userinterface') {
		
		//if the trigger update checkbox is check mark it disabled
		if (nlapiGetFieldValue('custentity_ax_updatefuturebooking') == 'T') {
			//3/22/2015 - 
			// Add in Ability for user to manually kick off Sync Shipping Address on future booking via button.
			var manualSyncBtn = form.addButton('custpage_syncshipaddr', 'Sync Address With Futur Bookings', 
						   					   'window.location.href=window.location.href+\'&custparam_triggerupdate=T\'');
			
			//If page has been refreshed with custparam_triggerupdate set to true, queue it up, disable the button and change the value of it
			if (request.getParameter('custparam_triggerupdate') == 'T') {
				//manualSyncBtn
				var syncParam = {
					'custscript_sct330_mode':'manual',
					'custscript_sct330_coachid':nlapiGetRecordId()
				};
				
				var syncStatus = nlapiScheduleScript('customscript_ax_ss_syncaddrfuturebooking', null, syncParam);
				if (syncStatus == 'QUEUED') {
					manualSyncBtn.setDisabled(true);
					manualSyncBtn.setLabel('Manual Sync Queued');
					
					nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custentity_ax_updatefuturebooking', 'F', false);
				}
				
				//Redirect it to THIS
				nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW', null);
			}
		}
		
		
		//
		
		//hide geo option fields
		form.getField('custentity_cbl_shipadr_geooption', null).setDisplayType('hidden');
		form.getField('custentity_cbl_shipadr_geodetail', null).setDisplayType('hidden');
		
		//9/4/2014 - In View mode, if Lat/Lng is filled in, programmatically create custom inline HTML field and add in client side code to BUILD Mini Map
		if (nlapiGetFieldValue('custentity_cbl_shipadr_lat') && nlapiGetFieldValue('custentity_cbl_shipadr_lng')) {
			form.insertField(googleMapSctRef, 'custentity_cbl_shipadr_minimap');
			log('debug','lat/lng',nlapiGetFieldValue('custentity_cbl_shipadr_lat') +' // '+ nlapiGetFieldValue('custentity_cbl_shipadr_lng'));
			
			//set the default value of the minimap field
			
			//var viewModeJsGoogleFld = form.addField('custpage_gljsfld', 'inlinehtml', '', null, null);
			form.getField('custentity_cbl_shipadr_minimap').setDefaultValue(
					'<b>View Mode Mini Map</b><br/><div id="map_canvas" style="border:1px; width:300px; height:200px"></div>'+
					'<script language="javascript">' +
					'var latlng = new google.maps.LatLng('+nlapiGetFieldValue('custentity_cbl_shipadr_lat')+', '+nlapiGetFieldValue('custentity_cbl_shipadr_lng')+');'+
					'var moption = {'+
							'center:latlng,'+
							'zoom:15,'+
							'mapTypeId: google.maps.MapTypeId.ROADMAP'+
					'};'+
					'var nsmap = new google.maps.Map(document.getElementById("map_canvas"),moption);'+
					'new google.maps.Marker({'+
						'position: latlng,'+
						'map:nsmap,'+
						//'animation: google.maps.Animation.DROP,'+
						'title:"Geocode Location",'+
						'icon: "https://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_red.png"'+
					'});'+
					//'document.getElementById("map_canvas").style.display = "block";'+
					'</script>'
					);
			
		}
		
		return;
	}
	
	//if Form is NOT one of defined, return
	if (!paramGeoCodeFormIds.contains(nlapiGetFieldValue('customform'))) {
		return;
	}
	
	log('debug','testing','printing the rest');
	
	if (nlapiGetContext().getExecutionContext() == 'userinterface') {
		//var geoButton = form.addField('custpage_geobutton','inlinehtml',' ');
		form.getField('custentity_cbl_shipadr_geooption', null).setDisplayType('normal');
		form.getField('custentity_cbl_shipadr_geodetail', null).setDisplayType('normal');
		var geoButton = form.getField('custentity_cbl_shipadr_geooption', null);
		
		if (nlapiGetRecordType() == 'job') {
			geoButton.setDefaultValue('<br/><input type="button" id="geobutton" name="geobutton" value="Geocode Booking Location Address" style="padding: 3px" onclick="geoCodeShipAddress()"/><br/><br/>'+
					  '<b>Default Location Address Fields for Geocoding</b><br/>'+
					  '<input type="checkbox" id="geoadr1" value="custentity_bo_eventaddress1"/>Address 1 &nbsp; '+
					  '<input type="checkbox" id="geoadr2" value="custentity_bo_eventaddress2"/>Address 2 &nbsp; <br/>'+
					  '<input type="checkbox" id="geocity" value="custentity_bo_eventcity"/>City &nbsp; '+
					  '<input type="checkbox" id="geocountystate" value="custentity_bo_eventstate"/>County/State Province &nbsp; '+
					  '<input type="checkbox" id="geopostcode" value="custentity_bo_eventpostcode"/>Postal/Zip Code &nbsp; <br/>'+
					  '<input type="checkbox" id="geocountry" value="custentity_bo_eventcountry"/>Country Code<br/>');
			
			//add HTML button to look up near by Coach
			//8/5/2014 - Client requested to add it as form level button instead of inline button near coach field.
			var lookupBtn = form.addButton('custpage_lkb', 'Find closest coach', 'radiusCoachLookup()');
			//lookupBtn.setDisabled(true);
			
			/**
			var lookupBtnHtml = form.addField('custpage_lkbhtml', 'inlinehtml', '', null, null);
			lookupBtnHtml.setDefaultValue('<br/><b>Look up near by Coach(es) within 160 Kilometer (100 Miles)</b><br/><br/>'+
										  '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; '+
										  '<input type="button" style="padding: 3px" id="coachlkb" disabled value="Lookup Nearest Coaches" onclick="radiusCoachLookup()"/><br/>');
			form.insertField(lookupBtnHtml,'custentity_bo_coach');
			*/
		} else {
			
			geoButton.setDefaultValue('<br/><input type="button" id="geobutton" name="geobutton" value="Geocode Shipping Address" style="padding: 3px" onclick="geoCodeShipAddress()"/><br/><br/>'+
					  '<b>Default Shipping Address Fields for Geocoding</b><br/>'+
					  '<input type="checkbox" id="geoadr1" value="addr1"/>Address 1 &nbsp; '+
					  '<input type="checkbox" id="geoadr2" value="addr2"/>Address 2 &nbsp; '+
					  '<input type="checkbox" id="geoadr3" value="addr3"/>Address 3 &nbsp; <br/>'+
					  '<input type="checkbox" id="geocity" value="city"/>City &nbsp; '+
					  '<input type="checkbox" id="geocountystate" value="displaystate"/>County/State Province &nbsp; '+
					  '<input type="checkbox" id="geopostcode" value="zip"/>Postal/Zip Code &nbsp; <br/>'+
					  '<input type="checkbox" id="geocountry" value="country"/>Country Code<br/>');
		}
		
		
		//insert button before Lat field
		//form.insertField(geoButton, 'custentity_cbl_shipadr_lat');
		
		
	}
}

/**
 * Before Submit function to generate Hash of Default Shipping address using following fields:
 * addr1, addr2, addr3, city, state, zip and set it on the custentity_ax_defshipaddr_hash
 * If New hash value of default shipping address is different from what has already been set, it will 
 * SET updatefuturebooking checkbox.
 * This checkbox WILL be reviewed by scheduled script that syncs coach address. Once this scheduled script completes processing
 * supplier record, it will check OFF the checkbox.
 * Scheduled script can be triggered manually by user OR on a scheduled basis
 * IT'S IMPORTANT:
 * 	- ONLY the scheduled script should mark this off to make sure the sync occurs
*/
function supplierBeforeSubmit(type) {
	
	//Only Trigger for None xedit and delete
	if (type != 'xedit' && type != 'delete') {
		var newrec = nlapiGetNewRecord();
		var adrlinecount = newrec.getLineItemCount('addressbook');
		for(var a=1; a <= adrlinecount; a++) {
			//build JSON to generate hash
			if (newrec.getLineItemValue('addressbook', 'defaultshipping', a)=='T') 
			{
				//Modify process to use subrecord api against addressboook 
				var addrSubRec = null;
				try
				{
					addrSubRec = newrec.viewLineItemSubrecord('addressbook', 'addressbookaddress', a);
					var shipjson = {
							'addr1':addrSubRec.getFieldValue('addr1'),
							'addr2':addrSubRec.getFieldValue('addr2'),
							'addr3':addrSubRec.getFieldValue('addr3'),
							'city':addrSubRec.getFieldValue('city'),
							'displaystate':addrSubRec.getFieldValue('state'),
							'zip':addrSubRec.getFieldValue('zip'),
							'country':addrSubRec.getFieldValue('country')
					};
						
					log('debug','Address JSON via Subrecord',JSON.stringify(shipjson));
						
					var hash = nlapiEncrypt(JSON.stringify(shipjson), 'sha1', null);
					//Compare THIS has to has value in defshipaddr field.
					//If Different, set custentity_ax_updatefuturebooking
					log('debug','New Hash // Current Hash', hash+' // '+nlapiGetFieldValue('custentity_ax_defshipaddr_hash'));
					if (hash != nlapiGetFieldValue('custentity_ax_defshipaddr_hash')) {
						//Scheduled script that processes all future booking record for coach will UNSET this once completed
						nlapiSetFieldValue('custentity_ax_updatefuturebooking','T');
					}
						
					nlapiSetFieldValue('custentity_ax_defshipaddr_hash', hash);
					break;
				}
				catch (err)
				{
					//If it errors out, LOG it and break out
					log('error','Error loading subrecord or NO address subrecord is defined',getErrText(err));
					break;
				}				
			}
		}
	}
	
}