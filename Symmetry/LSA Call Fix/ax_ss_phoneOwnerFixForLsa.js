/**
 * Script will go through result from saved search and attempt to change owner of phone call record to Organizer.
 * This script is to be used for phone call record that was created by (owner) - System - user which failed to trigger LSA scripts.
 * When Processed, Script will add [LSA FIX] to the column so that it can be search later.
 * Version    Date            Author           Remarks
 * 1.00       12 Mar 2014     JSon
 *
 */

//Saved search should be public and filter should be set up so that after setting Owner, call record is NOT part of result.
//Search should Always be sorted by Internal ID in Desc order
var paramSavedSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_lsafix_ss');
//Saved Search: AX:Phone Call Created by System User - DO NOT DELETE
//Required Columns:
//- Created By = owner
//- Organizer = assigned
//- Comment = message
//- Company = company
//- Company Status = entitystatus (companyCustomer)
//- Created Date = createddate
//- Subject = title

var paramEmailList = null;
if (nlapiGetContext().getSetting('SCRIPT','custscript_lsafix_resultemails')) {
	paramEmailList = nlapiGetContext().getSetting('SCRIPT','custscript_lsafix_resultemails').split(',');
}

var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_lsafix_lastprocid');
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function changeOwnerOfPhoneCall(type) {

	if (!paramSavedSearch) {
		throw nlapiCreateError('LSAFIXERR', 'Missing Saved Search to Execute Script against', false);
	}
	
	var msg = '[PROD MODE: UPDATE EXECUTED] - Script executed by '+nlapiGetContext().getName()+'<br/><br/>';
	var procHtml = msg + '<table border="1" cellpadding="2" cellspacing="0">'+
				   '<tr>'+
				   '<td><b>Phone Call ID</b></td>'+
				   '<td><b>Subject</b></td>'+
				   '<td><b>Company</b></td>'+
				   '<td><b>Created By</b></td>'+
				   '<td><b>Organizer</b></td>'+
				   '<td><b><i>New Created By</i></b></td>'+
				   '<td><b>Created Date</b></td>'+
				   '<td><b>Log</b></td></tr>';
	
	try {
		
		var cflt = null;
		if (paramLastProcId) {
			cflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
		}
		
		var crs = nlapiSearchRecord(null, paramSavedSearch, cflt, null);
		if (!crs) {
			procHtml += '<tr><td colspan="8">No Results Found</td></tr></table>';
		} else {
			for (var c=0; c < crs.length; c++) {
				
				var updstatus = '';
				
				try {
					/**** Run ONLY When given green light from customer ****/
					var phone = nlapiLoadRecord('phonecall',crs[c].getId());
					phone.setFieldValue('owner',crs[c].getValue('assigned'));
					phone.setFieldValue('message', crs[c].getValue('message')+' [LSA FIX]');
					nlapiSubmitRecord(phone, true, true);
					updstatus = 'SUCCESS';
					
					//updstatus = 'TEST MODE - NOT EXECUTED';
				} catch (updpherr) {
					updstatus = 'FAILED<br/>'+getErrText(updpherr);
					log('error','Owner update filed',crs[c].getId()+' Failed: '+getErrText(updpherr));
				}
				
				procHtml += '<tr>'+
							'<td>'+crs[c].getId()+'</td>'+
							'<td>'+crs[c].getValue('title')+'</td>'+
							'<td>'+crs[c].getText('company')+'</td>'+
							//'<td>'+crs[c].getText('entitystatus','companyCustomer')+'</td>'+
							'<td>'+crs[c].getText('owner')+' ('+crs[c].getValue('owner')+')</td>'+
							'<td>'+crs[c].getText('assigned')+' ('+crs[c].getValue('assigned')+')</td>'+
							'<td><i>'+crs[c].getText('assigned')+' ('+crs[c].getValue('assigned')+')</i></td>'+
							'<td>'+crs[c].getValue('createddate')+'</td>'+
							'<td>'+updstatus+'</td></tr>';
				
				
				
				//Check to see if we need to reschedule
				if ((c+1)==1000 || (nlapiGetContext().getRemainingUsage() < 100 && c < crs.length)) {
					
					var param = new Object();
					param['custscript_lsafix_ss'] = nlapiGetContext().getSetting('SCRIPT', 'custscript_lsafix_ss');
					param['custscript_lsafix_resultemails'] = nlapiGetContext().getSetting('SCRIPT','custscript_lsafix_resultemails');
					param['custscript_lsafix_lastprocid'] = crs[c].getId();
					var schStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
					if (schStatus=='QUEUED') {
						break;
					}					
				}
			}
			
			procHtml += '</table>';
		}
		
		//send notification.
		nlapiSendEmail(-5, 'joe.son@audaxium.com', 'LSA Call Fix Result', procHtml, null, null, null, null);
		
	} catch (fixerr) {
		throw nlapiCreateError('LSAFIXERR', 'Unexpected Error: '+getErrText(fixerr), true);
	}
}
