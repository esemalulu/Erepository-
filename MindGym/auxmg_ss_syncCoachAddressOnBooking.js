/**
 * Creation Date: 3/21/2015
 * This script is created to ensure all Bookings WITH:
 * 	- Ship To (custentity_bo_pack_shipto) set to Coach Address
 * 	- Coach (custentity_bo_coach) set to Supplier record Shipping Address just changed
 * 	- Is Pack Shipped (custentity_bo_ispackshipped) set to F (Not Checked)
 * 	- Booking Actual End Date (enddate) in the Future from Current date
 * 
 * And resync Shipping Address (custentity_bo_shippingaddress) text field with new Supplier address
 * 
 * This Script is triggered by Update of Supplier (vendor) record ONLY when default shipping address changes
 */

//Global JSON continaining ALL script related variables
var sctvars= {
	'paramCoachLastProcId':nlapiGetContext().getSetting('script','custscript_sct330_lastcoachid'), //Last processed ID
	'paramMode':nlapiGetContext().getSetting('script','custscript_sct330_mode'), //manual or scheduled
	'paramCoachId':nlapiGetContext().getSetting('script','custscript_sct330_coachid'),
	'coachaddroption':'1' //Value of Coach Address option in the drop down of Ship To field
};

function resyncCoachAddressOnBooking() {
	
	if (!sctvars.paramMode) {
		throw nlapiCreateError('SYNC-COACH-ADDR-ERR', 'Process Mode Not Passed in: Text Value of manual or scheduled is used', false);
		return;
	}
	
	if (sctvars.paramMode=='manual' && !sctvars.paramCoachId) {
		throw nlapiCreateError('SYNC-COACH-ADDR-ERR', 'In Manual Mode, Coach ID must be passed in', false);
		return;
	}
	
	try {
		//!!!!!It is ASSUMED each coach DOES NOT have more than 900 future bookings associated with him/her. !!!!!!!!!! 
		if (sctvars.paramMode == 'manual') {
			
			try {
				processCoach(sctvars.paramCoachId);
				
			} catch (manualerr) {
				//throw the error and notify admins
				throw nlapiCreateError('SYNC-COACH_ADDR-ERR','Manual syncing of Coach Internal ID: '+sctvars.paramCoachId+' failed: '+getErrText(manualerr), false);
			}
			
		} else {
			//scheduled
			//search through all coaches that has 
			var chflt = [new nlobjSearchFilter('custentity_ax_updatefuturebooking', null, 'is','T'),
			             new nlobjSearchFilter('isinactive',null, 'is','F')];
			
			if (sctvars.paramCoachLastProcId) {
				chflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', sctvars.paramCoachLastProcId));
			}
			
			var chcol = [new nlobjSearchColumn('internalid').setSort(true)];
			
			var chrs = nlapiSearchRecord('vendor', null, chflt, chcol);
			
			for (var ch=0; chrs && ch < chrs.length; ch++) {
				try {
					processCoach(chrs[ch].getValue('internalid'));
				} catch (scherr) {
					throw nlapiCreateError('SYNC-COACH_ADDR-ERR','Scheduled syncing of Coach Internal ID: '+chrs[ch].getValue('internalid')+' failed: '+getErrText(scherr), false);
				}
				
				//Check to see if we need to reschedule
				//Set % completed of script processing
				var pctCompleted = Math.round(((ch+1) / chrs.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((ch+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 2000)) {
					var reqParam = {};
					reqParam['custscript_sct330_lastcoachid'] = chrs[ch].getValue('internalid');
					reqParam['custscript_sct330_mode'] = 'scheduled';
					var reschedulStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), reqParam);
					log('audit','Sync Rescheduled',reschedulStatus);
					break;
				}
			}
		}
	} catch (procerr) {
		log('error',sctvars.paramMode+' error', getErrText(procerr));
	}
}

function processCoach(_coachId) {

	//1. Search for Booking that matches filter
	var boflt = [new nlobjSearchFilter('custentity_bo_coach', null, 'anyof',_coachId),
	             new nlobjSearchFilter('custentity_bo_ispackshipped', null, 'is','F'),
	             new nlobjSearchFilter('custentity_bo_pack_shipto', null, 'anyof', sctvars.coachaddroption),
	             new nlobjSearchFilter('enddate', null, 'after', nlapiDateToString(new Date()))];
	var bocol = [new nlobjSearchColumn('internalid').setSort(true),
	             new nlobjSearchColumn('shipaddress1','custentity_bo_coach'),
		         new nlobjSearchColumn('shipaddress2','custentity_bo_coach'),
		         new nlobjSearchColumn('shipaddress3','custentity_bo_coach'),
		         new nlobjSearchColumn('shipattention','custentity_bo_coach'),
		         new nlobjSearchColumn('shipphone','custentity_bo_coach'),
		         new nlobjSearchColumn('shipaddressee','custentity_bo_coach'),
		         new nlobjSearchColumn('shipcity','custentity_bo_coach'),
		         new nlobjSearchColumn('shipstate','custentity_bo_coach'),
		         new nlobjSearchColumn('shipzip','custentity_bo_coach'),
		         new nlobjSearchColumn('shipcountry','custentity_bo_coach')];
	
	if (sctvars.paramLastProcId) {
		coflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', sctvars.paramLastProcId));
	}
	
	//Execute search to bring list of all matching booking
	var bors = nlapiSearchRecord('job', null, boflt, bocol);
	
	//2. Loop through and change entitystatus
	for (var i=0; bors && i < bors.length; i++) {
		try {

			//Build new address text
			var adtext = '';
			
			if (bors[i].getValue('shipattention','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipattention','custentity_bo_coach')+'\n';
			}
			
			if (bors[i].getValue('shipaddressee','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipaddressee','custentity_bo_coach')+'\n';
			}
			
			if (bors[i].getValue('shipphone','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipphone','custentity_bo_coach')+'\n';
			}
			
			if (bors[i].getValue('shipaddress1','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipaddress1','custentity_bo_coach')+'\n';
			}
			
			if (bors[i].getValue('shipaddress2','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipaddress2','custentity_bo_coach')+'\n';
			}
			
			if (bors[i].getValue('shipaddress3','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipaddress3','custentity_bo_coach')+'\n';
			}
			
			if (bors[i].getValue('shipcity','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipcity','custentity_bo_coach')+' ';
			}
			
			if (bors[i].getValue('shipstate','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipstate','custentity_bo_coach')+' ';
			}
			
			if (bors[i].getValue('shipzip','custentity_bo_coach')) {
				adtext += bors[i].getValue('shipzip','custentity_bo_coach')+' ';
			}
			
			if (bors[i].getText('shipcountry','custentity_bo_coach')) {
				adtext += '\n'+bors[i].getText('shipcountry','custentity_bo_coach');
			}
			
			log('debug','New Vendor Address for Booking ID: '+bors[i].getId(), adtext);
			nlapiSubmitField('job', bors[i].getValue('internalid'), 'custentity_bo_shippingaddress', adtext, false);
			
		} catch (opprecerr) {
			log('error','Error Updating',getErrText(opprecerr));
		}
	}
	
	//Update Coach record
	nlapiSubmitField('vendor', _coachId, 'custentity_ax_updatefuturebooking', 'F', false);
}
	
	
