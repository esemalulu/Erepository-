/**
 * 5/30/2014 - Update: 
 * Script is modified to add Fulfillment process code base fired against Booking record to track shipping process.
 * This code base originally fired on Item Fulfillment record but due to timing issues, it's been requested to move it on Booking record.
 * 
*/

function addFilteredBuyerList(type, form, request) {
	
	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		//Only fire for EDIT by User
		if (type == 'edit') {
			
			try {
				
				//6/18/2014 - Request the ability to reset Packing related fields.
				//put HTML button on Edit mode jsut before custentity_bo_optpack field.
				
				//10/14/2014 - add the reset ability when both is shipped is checked OR pack in production is checked.
				//	- Make it earlier in the stage.
				//if (nlapiGetFieldValue('custentity_bo_ispackshipped')=='T' || nlapiGetFieldValue('custentity_bo_isprepackshipped')=='T') {
				//11/2/2015 - Logic change:
				if ((nlapiGetFieldValue('custentity_bo_isinproduction')=='T' || nlapiGetFieldValue('custentity_bo_ispackshipped')=='T') && nlapiGetFieldValue('custentity_bo_isdelivered')!='T') {
					//16/1/2015 - Modified to show as FORM Button NOT Inline
					form.addButton('custpage_resetpackbtn', 'Re-send packs', 'resetPackFields(true)');
					
					//var resetBtnHtml = form.addField('custpage_resetpack', 'inlinehtml', '', null,null);
					//resetBtnHtml.setDefaultValue('<input type="button" value="Reset to Fulfill Packs" onclick="resetPackFields()"/>');
					//form.insertField(resetBtnHtml, 'custentity_bo_optpack');
				}
				
				//Dec. 11 2014 - Add Feedback reset button ONLY when,
				//Reset button will appear ONLY when 
				//	- Require Feedback is Checked 
				//	- Feedback Location is Set
				//	- Feedback Processing Date is Set
				if (nlapiGetFieldValue('custentity_bo_optimfeedback')=='T' && nlapiGetFieldValue('custentity_cbl_feedbackffloc') && nlapiGetFieldValue('custentity_bo_feedbackprocessingdate')) {
					
					form.addButton('custpage_resetfeedbbtn', 'Reset to Fulfill Feedback', 'resetFeedbackFields()');
					
					//var resetFeedbackHtml = form.addField('custpage_resetfeedback', 'inlinehtml','',null,null);
					//resetFeedbackHtml.setDefaultValue('<input type="button" value="Reset to Fulfil Feedback" onclick="resetFeedbackFields()"/>');
					//form.insertField(resetFeedbackHtml, 'custentity_bo_feedbackstatus');
				}
				
				//original value of Buyer 
				var buyerId = nlapiGetFieldValue('custentity_bo_buyer');
				var clientId = nlapiGetFieldValue('parent');
				
				//only execute if clientId is set
				if (clientId) {
					
					//search for ALL contacts for client
					var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', clientId),
					            new nlobjSearchFilter('isinactive','contact','is','F')];
					var ccol = [new nlobjSearchColumn('internalid', 'contact',null),
					            new nlobjSearchColumn('company', 'contact',null),
					            new nlobjSearchColumn('firstname', 'contact',null).setSort(),
					            new nlobjSearchColumn('lastname', 'contact',null)];
					var crs = nlapiSearchRecord('customer', null, cflt, ccol);
					
					if (crs && crs.length > 0) {
						//create new buyer dd field
						var filteredBuyer = form.addField('custpage_ftbuyer', 'select', 'Buyers by Client', null, null);
						filteredBuyer.setMandatory(true);
						filteredBuyer.addSelectOption('', '', true);
						
						var hasBuyerMatch = false;
						for (var c=0; c < crs.length; c++) {
							
							var ctid = crs[c].getValue('internalid', 'contact', null);
							var ctdisplay = crs[c].getText('company', 'contact', null)+' : '+
											(crs[c].getValue('firstname', 'contact', null)?crs[c].getValue('firstname', 'contact', null):'')+' '+
											(crs[c].getValue('lastname', 'contact', null)?crs[c].getValue('lastname', 'contact', null):'');
							
							if (buyerId == ctid) {
								hasBuyerMatch = true;
							}
							
							filteredBuyer.addSelectOption(ctid, ctdisplay);
						}

						if (buyerId && !hasBuyerMatch) {
							filteredBuyer.addSelectOption(buyerId, '[Selected Buyer]-'+nlapiGetFieldText('custentity_bo_buyer'));
						}
						
						filteredBuyer.setDefaultValue(buyerId);
						
						form.insertField(filteredBuyer, 'custentity_bo_buyer');
						
						//disable original
						form.getField('custentity_bo_buyer', null).setDisplayType('disabled');
					}
					
				}
				
			} catch (addfberr) {
				log('error','Error adding filtered Buyer list', getErrText(addfberr));
			}		
		}
	}
}


/**
 * Before Submit function to update/set Tracking information on Booking record.
 */
function setBeforeSubmitSetTrackingValues(type) {

	try {
		
		//auto return if NOT Edit or XEDIT
		if (type != 'edit' && type!='xedit') {
			return;
		}
		
		log('debug','Type',type);
		
		var oldTrackNumber = nlapiGetOldRecord().getFieldValue('custentity_bo_packtracking');
		//if xedit with another field, new Rec field value will be empty
		var newRec = nlapiGetNewRecord();
		var newTrackNumber = newRec.getFieldValue('custentity_bo_packtracking');
		
		log('debug','new Tracking Number', newTrackNumber);
		
		if (newTrackNumber && oldTrackNumber != newTrackNumber) {
			newTrackNumber = newTrackNumber.toUpperCase();
			
			//Remove Emtpy spaces in between 
			newTrackNumber = strGlobalReplace(newTrackNumber, ' ', '');
			log('debug','Testing Fulfillment Test',newTrackNumber);
			
			//check off in Production
			nlapiSetFieldValue('custentity_bo_isinproduction','F');
			//set Shipped fields
			nlapiSetFieldValue('custentity_bo_ispackshipped','T');
			nlapiSetFieldValue('custentity_bo_packshippingdate', nlapiDateToString(new Date()));
							
			//set courier URL
			var trackUrl = '';
			var trackUrlText = '';


		    if (newTrackNumber.length == 18 || newTrackNumber.substr(0,2) == '1Z') {
			// if (newTrackNumber.substr(0,2) == '1Z') {
				//UPS
				trackUrl = 'http://wwwapps.ups.com/WebTracking/track?track=yes&trackNums=' + newTrackNumber;
				trackUrlText = 'UPS';
			} else if (newTrackNumber.substr(0,2) == 'AR' || newTrackNumber.substr(newTrackNumber.length-2, newTrackNumber.length)=='GB') {
				//Royal Mail
				trackUrl = 'http://track2.royalmail.com/portal/rm/track?trackNumber=' + newTrackNumber;
				trackUrlText = 'Royal Mail';
			} else if (newTrackNumber.length == 6) {
				// } else if (newTrackNumber.substr(0,1) == '5' || newTrackNumber.substr(0,1) == '6') {
				//Addison Lee
				trackUrl = 'http://addlee.metafour.com/?module=track&hawb=' + newTrackNumber;
				trackUrlText = 'Addison Lee';
			} else if (newTrackNumber.length == 10) {
			// } else if (newTrackNumber.substr(0,1) == '8' || newTrackNumber.substr(0,2) == '72') {
				//DHL
				trackUrl = 'http://www.dhl.com/content/g0/en/express/tracking.shtml?brand=DHL&AWB=' + newTrackNumber;
				trackUrlText = 'DHL';
			} else if (newTrackNumber.substr(0,1) == '1') {
				//Book Addison Lee
				trackUrl = 'https://book.addisonlee.com/booker/viewBooking/b8ne4c4dhIkcmCPA' + newTrackNumber;
				trackUrlText = 'Addison Lee (Book)';
			} else {
				//Add FedEx tracking 
				//^(\d{12})$ or ^(\d{15})$
				//http://www.fedex.com/Tracking?action=track&language=english&last_action=alttrack&ascend_header=1&cntry_code=&initial=x&mps=y&tracknumbers=#TRACKNUM#
				//Fedex can be 12 ore 15 digits long
				//Ticket 3087
				var is12Match = newTrackNumber.match(/^(\d{12})$/g);
				var is15Match = newTrackNumber.match(/^(\d{15})$/g);
				if (is12Match || is15Match)
				{
					trackUrl = 'http://www.fedex.com/Tracking?action=track&language=english&last_action=alttrack&ascend_header=1&cntry_code=&initial=x&mps=y&tracknumbers='+newTrackNumber;
					trackUrlText = 'FedEx';
				}
			}
			
			nlapiSetFieldValue('custentity_bo_packtracking_url', trackUrl);
			nlapiSetFieldValue('custentity_bo_packtracking_url2', trackUrlText);
		}
		
		
	} catch (bksyncerr) {
		
		//send to david for error
		//oliver.fisk@themindgym.com
		
		var paramErrorNotifierEmployee = nlapiGetContext().getSetting('SCRIPT','custscript_tzbk_employee');
		var paramErrorCcEmails = nlapiGetContext().getSetting('SCRIPT','custscript_tzbk_cclist');
		if (paramErrorCcEmails) {
			paramErrorCcEmails = paramErrorCcEmails.split(',');
		}
		
		//TODO Send errors.
		log('error','Error Syncing Shipping Date with Booking on Item Fulfillment', getErrText(bksyncerr));
		var errsbj = 'Error Syncing Shipping Date with Booking on Item Fulfillment ID: '+nlapiGetRecordId();
		var errmsg = getErrText(bksyncerr);
		
		var recUrl = 'https://system.netsuite.com'+nlapiResolveURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW');
		errmsg += '<a href="'+recUrl+'" target="_blank">View '+nlapiGetFieldValue('entityid')+' Item Fulfillment Record</a>';
		
		nlapiSendEmail(-5, paramErrorNotifierEmployee, errsbj, errmsg, paramErrorCcEmails, null, null, null);
		
		if (type = 'xedit') {
			throw nlapiCreateError('IFBKSYNCERROR', getErrText(bksyncerr), true);
		}
		
	}
	
}
