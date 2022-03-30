var paramRetEntryStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_entrystatus');
var paramRetExitStatusAccept = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatusaccept');
var paramRetExitStatusLost = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost');
var paramRetExitStatusLost10 = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost10');
var paramRetSentToRetStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_senttoretstatus');
var paramRetResRetWithChanges = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_resretwchg');
var paramRetResCancelled = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_rescancelled');
var paramRetResStatusInProgAcct = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_status_ipacct');
var paramRet10DaysRemCancelDisposition = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_candispo10day');

//9/19/2014 
var paramRetWebsiteOptionGetDiscount = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_websiteodisc');

//Based on User Selection on Offer type, enable or disable and set or reset offer type support fields
var triggerOffers = {
	"1":{
		'text':'# Free Months',
		'fields':['custpage_numfreemonths','custpage_compstartdt','custpage_compenddt'],
		'labels':['# of Free Months','Complimentary Start Date','Complimentary End Date']
	},
	"2":{
		'text':'$ Price Downgrade',
		'fields':['custpage_discamt'],
		'labels':['New Downgrade Price (before tax)']
	}
	,
	"3":{
		'text':'Refund',
		'fields':['custpage_refundamt'],
		'labels':['Refund Amount (after tax)']
	},
	/**
	 * 11/18/2014 
	 * Internal ID 5 is No longer an offer type. it's inactive in Sandbox.
	"5":{
		'text':'Final Payment Waived',
		'fields':['custpage_finalpaywaive','custpage_finalpaywaiveamt'],
		'labels':['Final Payment Waived','Final Payment Amount']
	},
	*/
	"9":{
		'text':'$ Discount (Short Term Period)',
		'fields':['custpage_shortdiscamt','custpage_discstartdt','custpage_discenddt'],
		'labels':['New Short term Amount (before tax)','Discount Start Date','Discount End Date']
	},
	"10":{
		'text':'Upsell',
		'fields':['custpage_upsellamt'],
		'labels':['Upsell Amount']
	},
	"11":{
		'text':'PIF Total Amount (before tax)',
		'fields':['custpage_pifstartdt','custpage_numfreepifmonths','custpage_numpaidpifmonths','custpage_piftotalamt','custpage_pifmonthlyamt'],
		'labels':['PIF Starting Date','# of PIF\'s Free Month','# of PIF\'s Paid Month','PIF Total Amount','PIF Monthly Amount']
	},
	"12":{
		'text':'Webiste',
		'fields':['custpage_websiteoption','custpage_websitediscount'],
		'labels':['Website Offer Option','Website Price']
	},
	"13":{
		'text':'Settlement/Balance Owing',
		'fields':['custpage_settlementamt'],
		'labels':['Settlement Amount/Balance Owing (after tax)']
	},
	"14":{
		'text':'Google Retention',
		'fields':['custpage_googleretfld'],
		'labels':['Google Retention Detail']
	}
};

//11/16/2014 - Final Payment is no longer an Offer type
//Removed below optins:
//'custpage_finalpaywaive','custpage_finalpaywaiveamt',
var offerRelFlds = ['custpage_numfreemonths','custpage_compstartdt','custpage_compenddt',
                    'custpage_discamt',
                    'custpage_refundamt',
                    //'custpage_finalpaywaive','custpage_finalpaywaiveamt',
                    'custpage_shortdiscamt','custpage_discstartdt','custpage_discenddt',
                    'custpage_upsellamt',
                    'custpage_pifstartdt','custpage_numfreepifmonths','custpage_numpaidpifmonths','custpage_piftotalamt','custpage_pifmonthlyamt',
                    'custpage_websiteoption','custpage_websitediscount',
                    'custpage_settlementamt','custpage_googleretfld'];

function retentionOnSaveRecord() {
	//var statusFromCustomer = nlapiGetFieldValue('custpage_origstatus');
	//var newStatusSelected = nlapiGetFieldValue('custpage_status');
	
	//Make sure related offer fields are filled in
	var offerseletions = nlapiGetFieldValues('custpage_offertype');
	
	//9/30/2014 - Calculated Delta Value
	var deltaValue = 0.0;
	
	for (var os=0; offerseletions && os < offerseletions.length; os++) {
		var selval = offerseletions[os];
		if (triggerOffers[selval]) {
			//loop through and enable the related field values
			for (var to=0; to < triggerOffers[selval].fields.length; to++) {
				//make sure all related fields are filled in
				
				if (!nlapiGetFieldValue(triggerOffers[selval].fields[to])) {  					
					alert('You must provide all related values for '+triggerOffers[selval].text+' offer');
					return false;
				}	
				
				if (selval=='12' && nlapiGetFieldValue('custpage_websiteoption')==paramRetWebsiteOptionGetDiscount && (parseFloat(nlapiGetFieldValue('custpage_websitediscount')) <= 0)) {
					alert('Website discount must be greater than $0.00');
					return false;
				}
				
			}
			
			//9/30/2014 - Go through and Sum up selected 
			//1. check for Permant Discount Amt
			if (selval=='2') {
				deltaValue += parseFloat(nlapiGetFieldValue('custpage_discamt'));
			}
			//2. check for Refund Amt
			if (selval=='3') {
				deltaValue += parseFloat(nlapiGetFieldValue('custpage_refundamt'));
			}
			//3. check for Short Discount Amt
			if (selval=='9') {
				deltaValue += parseFloat(nlapiGetFieldValue('custpage_shortdiscamt'));
			}
			//4. check for Website
			if (selval == '12') {
				//if website is selected, it's either discount or remove/free website.
				//	If discount amount is not 0.00, use that value.
				//	Else grab current value of website and use that value
				if (parseFloat(nlapiGetFieldValue('custpage_websitediscount')) > 0.0) {
					deltaValue += parseFloat(nlapiGetFieldValue('custpage_websitediscount'));
				} else {
					deltaValue += parseFloat(nlapiGetFieldValue('custpage_profilewebtotal'));
				}
			}
			
		}
	}
	
	//11/18/2014 - Moved out as it's own validation
	//Final Payment Wavie amount 
	if (nlapiGetFieldText('custpage_finalpaywaive')=='No' && (parseFloat(nlapiGetFieldValue('custpage_finalpaywaiveamt')) <= 0)) {
		alert('Final Payment Adjustment Amount must be greater than $0.00');
		return false;
	}
	
	if (nlapiGetFieldValue('custpage_status')==paramRetSentToRetStatus && !nlapiGetFieldValue('custpage_internalnotes')) {
		alert('Please provide details to Retention Rep.');
		return false;
	}
	
	//2/2/2015 - Validate to make sure value is provided
	if (!nlapiGetFieldText('custpage_finalpaywaive') && (nlapiGetFieldValue('custpage_status')==paramRetExitStatusLost || nlapiGetFieldValue('custpage_status')==paramRetExitStatusLost10)) {
		alert('Final Payment Adjustment must be set for Customer Lost Statuses');
		return false;
	}
	
	//2/2/2015 - Set offer detail value before adding balance info
	nlapiSetFieldValue('custpage_offerdetailnobal', nlapiGetFieldValue('custpage_offerdetail'));
	//9/19/2014 - Before saving, add balance at the bottom of financial instruction
	var latestOfferDetailWithBlanace = nlapiGetFieldValue('custpage_offerdetail')+
									   '\n\n** Balance: '+nlapiGetFieldValue('custpage_balance');
	
	nlapiSetFieldValue('custpage_offerdetail',latestOfferDetailWithBlanace);
	
	//5. Check to see if there is value for Upsell. If there is, Subtract from deltaValue
	if (parseFloat(deltaValue) > 0.0 && nlapiGetFieldValue('custpage_upsellamt')) {
		deltaValue = parseFloat(deltaValue) - parseFloat(nlapiGetFieldValue('custpage_upsellamt'));
	}
	
	//6. Set the value of delta total
	nlapiSetFieldValue('custpage_profiledelta', deltaValue);
	
	return true;
}

function retentionUiPageInit(type){
	
	
	if (nlapiGetFieldValue('custpage_done')=='yes') {
		closeWindow();
		return;
	}
	
	//9/18/2014 - Hide all fields so that it can be controlled dynamically upon offer type selection
	for (var of=0; of < offerRelFlds.length; of++) {
		toggleDisplay(offerRelFlds[of], false);
	}
	
	//default the date and time field so that it's set on users timezone
	//custpage_actdate
	//custpage_acttime
	var curDate = new Date();
	nlapiSetFieldValue('custpage_actdate', nlapiDateToString(curDate));
	nlapiSetFieldValue('custpage_acttime', nlapiDateToString(curDate, 'timeofday'));
	
	//set dispo text
	nlapiSetFieldValue('custpage_lostdisptext',nlapiGetFieldText('custpage_lostdispo'));
	//alert(nlapiGetFieldValue('custpage_lostdisptext'));
}

function closeWindow() {
	window.opener.location = window.opener.location;
	window.close();
	return;
}

function retentionUiFieldChanged(type, name, linenum){
 
	if (name == 'custpage_lostdispo') {
		//if c.dispo is 10 Days Remorse and status is Customer Lost,
		//	- Change status to Customer Lost - 10 Days Remorse
		if (nlapiGetFieldValue(name) == paramRet10DaysRemCancelDisposition && nlapiGetFieldValue('custpage_status') == paramRetExitStatusLost) {
			nlapiSetFieldValue('custpage_status', paramRetExitStatusLost10);
		}
	}
	
	if (name == 'custpage_status') {
		
		if (nlapiGetFieldValue(name)==paramRetSentToRetStatus) {
			nlapiSetFieldMandatory('custpage_internalnotes',true);
		} else {
			nlapiSetFieldMandatory('custpage_internalnotes',false);
		}
		
		if (nlapiGetFieldValue(name)==paramRetExitStatusLost || nlapiGetFieldValue(name)==paramRetExitStatusLost10) {
			
			//if 10 Day Remorse Exit
			if (nlapiGetFieldValue(name) == paramRetExitStatusLost10) {
				//set cancellation disposition automatically to 10 Days Buyers Remorse
				nlapiSetFieldValue('custpage_lostdispo',paramRet10DaysRemCancelDisposition);
			}
			
			//2/2/2015 - When status is marked as LOST, make sure Final Payment Waived drop down becomes Required
			nlapiSetFieldMandatory('custpage_finalpaywaive',true);
		} else {
			//2/2/2015 - When status is marked as other Final Payment Waived drop down becomes NOT Required
			nlapiSetFieldMandatory('custpage_finalpaywaive',false);
		}
	}
	
	//set text values 
	if (name == 'custpage_contact') {
		nlapiSetFieldValue('custpage_contactname', nlapiGetFieldText('custpage_contact'));
	}
	
	if (name == 'custpage_status') {
		nlapiSetFieldValue('custpage_statusname', nlapiGetFieldText('custpage_status'));
		
		//9/24/2014 - Open up Offer Detail field.
		if (nlapiGetFieldValue(name) == paramRetExitStatusLost || nlapiGetFieldValue(name) == paramRetExitStatusLost10) {
			nlapiDisableField('custpage_offerdetail', false);
		} else {
			nlapiDisableField('custpage_offerdetail', true);
		}
	}
	
	if (name == 'custpage_assign') {
		nlapiSetFieldValue('custpage_assignname', nlapiGetFieldText('custpage_assign'));
	}
	
	if (name == 'custpage_offertype') {
		//list of enabled ids
		var enabledIds = {};
		var offerseletions = nlapiGetFieldValues('custpage_offertype');
		for (var os=0; offerseletions && os < offerseletions.length; os++) {
			var selval = offerseletions[os];
			if (triggerOffers[selval]) {
				enabledIds[selval]=selval;
				//loop through and enable the related field values
				for (var to=0; to < triggerOffers[selval].fields.length; to++) {
					//alert(triggerOffers[selval].fields[to]);
					toggleDisplay(triggerOffers[selval].fields[to], true);
				}
			}
		}
		
		//loop through and disable fields
		for (var trigf in triggerOffers) {
			if (!enabledIds[trigf]) {
				//disable the field
				for (var to=0; triggerOffers[trigf] && to < triggerOffers[trigf].fields.length; to++) {
					//alert(triggerOffers[selval].fields[to]);
					toggleDisplay(triggerOffers[trigf].fields[to], false);
				}
			}
		}
		
		nlapiSetFieldValue('custpage_offertypename', nlapiGetFieldTexts('custpage_offertype'));
	}
	
	//9/19/2014 - Sent Disposition text vallue
	if (name=='custpage_lostdispo') {
		nlapiSetFieldValue('custpage_lostdisptext',nlapiGetFieldText(name));
	}
	
	//9/19/2014 - If website option is get discount, enable and require related website discount field
	if (name == 'custpage_websiteoption') {
		if (nlapiGetFieldValue(name) != paramRetWebsiteOptionGetDiscount) {
			//clear out the discount, disable, unrequire
			nlapiDisableField('custpage_websitediscount', true);
			nlapiSetFieldMandatory('custpage_websitediscount',false);
			nlapiSetFieldValue('custpage_websitediscount','0.0');
		} else {
			nlapiDisableField('custpage_websitediscount', false);
			nlapiSetFieldMandatory('custpage_websitediscount',true);
		}
	}
	
	//9/24/2014 - If Waive Final Payment is No, enable and require related Final Payment Amount field
	if (name == 'custpage_finalpaywaive') {
		if (nlapiGetFieldText(name) != 'No') {
			//clear out the discount, disable, unrequire
			nlapiDisableField('custpage_finalpaywaiveamt', true);
			nlapiSetFieldMandatory('custpage_finalpaywaiveamt',false);
			nlapiSetFieldValue('custpage_finalpaywaiveamt','0.0');
		} else {
			nlapiDisableField('custpage_finalpaywaiveamt', false);
			nlapiSetFieldMandatory('custpage_finalpaywaiveamt',true);
			//default value of balance upon making it available
			nlapiSetFieldValue('custpage_finalpaywaiveamt',nlapiGetFieldValue('custpage_balance'));
		}
	}
	
	//9/19/2014 - Calculate PIF Monthly if values are provided.
	//'custpage_numpaidpifmonths','custpage_piftotalamt','custpage_pifmonthlyamt'
	if (name == 'custpage_numpaidpifmonths' || name== 'custpage_piftotalamt') {
		
		//If BOTH are set, calculate the monthly. Otherwise, blank out monthly
		if (nlapiGetFieldValue('custpage_numpaidpifmonths') && nlapiGetFieldValue('custpage_piftotalamt')) {
			
			var paidMonthsTerms = parseInt(nlapiGetFieldValue('custpage_numpaidpifmonths'));
			var pifTotalValue = parseFloat(nlapiGetFieldValue('custpage_piftotalamt'));
			nlapiSetFieldValue('custpage_pifmonthlyamt', (pifTotalValue/paidMonthsTerms));
			
		} else {
			nlapiSetFieldValue('custpage_pifmonthlyamt','');
		}
		
	}
	
	//If any of the related field values changed:
	//THIS Section should always run last.
	if (offerRelFlds.indexOf(name) >= 0 || name == 'custpage_finalpaywaive' || name == 'custpage_finalpaywaiveamt') {
		
		var offerText = '';
		var offerseletions = nlapiGetFieldValues('custpage_offertype');
		for (var os=0; offerseletions && os < offerseletions.length; os++) {
			if (triggerOffers[offerseletions[os]]) {
				var selval = triggerOffers[offerseletions[os]];
				offerText += '\n** '+selval.text+':\n';
				//loop through related fields 
				var relflds = selval.fields;
								
				for (var j=0; relflds && j < relflds.length; j++) {
					
					//DO NOOT Set Website price if Website offer is 1 (Removoe) or 3 (give)
					/**
					 * 'fields':['custpage_websiteoption','custpage_websitediscount'],
					 */
					if (offerseletions[os] == '12' && relflds[j]=='custpage_websitediscount' && (nlapiGetFieldValue('custpage_websiteoption')=='1' || nlapiGetFieldValue('custpage_websiteoption')=='3')) {
						continue;						 
					}
					
					offerText += '- '+selval.labels[j]+': '+(nlapiGetFieldText(relflds[j])?nlapiGetFieldText(relflds[j]):nlapiGetFieldValue(relflds[j]))+'\n';
				}
			}						
		}
	
		//11/18/2014 - Add in Final Payment info to instruction.
		var finalPayText = nlapiGetFieldValue('custpage_finalpaywaive');
		if (finalPayText) {
			finalPayText = '\n** Final Payment Waived:\n'+
						   '- Final Payment Waived: '+nlapiGetFieldText('custpage_finalpaywaive')+'\n'+
						   '- Final Payment Amount: '+nlapiGetFieldValue('custpage_finalpaywaiveamt');
		}
		
		offerText += finalPayText;
		
		//set offer detail
		nlapiSetFieldValue('custpage_offerdetail', offerText);
	}
	
}

function toggleDisplay(_fld, _enable) {
	if (_fld) {
		var enable = false;
		if (_enable) {
			enable = true;
		}
		
		if (!enable) {
			//reset value 
			nlapiSetFieldValue(_fld,'');
		}
		
		//2014v2 Upgrade
		var fldobj = nlapiGetField(_fld);
		if (enable) {
			fldobj.setDisplayType('normal');
			//If _fld is PIF Monthly or Website discount, disable it.
			//PIF Monthly is system calculated value
			//Website Discount is ONLY available if Website Discount Option is selected
			if (_fld == 'custpage_pifmonthlyamt' || _fld == 'custpage_websitediscount') {
				nlapiDisableField(_fld, true);
				//Default website discount value to 0
				if (_fld=='custpage_websitediscount') {
					nlapiSetFieldValue('custpage_websitediscount','0.0');
				}
				
			}
		} else {
			fldobj.setDisplayType('hidden');
		}
		//nlapiDisableField(_fld, !enable);
		
		//Do not show tick if field is website discount.
		//- this field will become required ONLY if option is get discount
		if (_fld != 'custpage_websitediscount') {
			nlapiSetFieldMandatory(_fld,enable);
		}
	}
}
