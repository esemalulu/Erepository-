/**
 * Process staged Mass Campaign Response records.
 * Mass CampaignResponse Upd List (customrecord_ax_mass_campres_update)
 * 
 */
var EXIT_COUNT = 1000;
var ctx = nlapiGetContext();

function processMassCampaignResponse(type) {

	/**
	 * json object containing campaign title to ID mapping
	 */
	var jsoncamp = {};
	
	//staging file update fields
	var updFlds = ['custrecord_mcru_processed','custrecord_mcru_proc_status','custrecord_mcru_proc_details'];
	try {
		//search on staging record for unprocessed
		var stageFlt = [new nlobjSearchFilter('custrecord_mcru_processed', null, 'is','F')];
		var stageCol = [new nlobjSearchColumn('custrecord_mcru_load_fname'),
		                new nlobjSearchColumn('custrecord_mcru_load_lname'),
		                new nlobjSearchColumn('custrecord_mcru_load_email'),
		                new nlobjSearchColumn('custrecord_mcru_contact'),
		                new nlobjSearchColumn('custrecord_mcru_contact_customer'),
		                new nlobjSearchColumn('custrecord_mcru_campaign_title'),
		                new nlobjSearchColumn('custrecord_mcru_campres_type'),
		                new nlobjSearchColumn('custrecord_mcru_campres_date'),
		                new nlobjSearchColumn('custrecord_mcru_load_company'),
		                new nlobjSearchColumn('custrecord_mcru_load_company_state'),
		                new nlobjSearchColumn('internalid').setSort(true)];
		var stageRslt = nlapiSearchRecord('customrecord_ax_mass_campres_update', null, stageFlt, stageCol);
		
		//Only when we have items to process
		//stageRslt.length
		for (var i=0; stageRslt && i < stageRslt.length; i++) {		
			var updVals = new Array();
			//0. make things easy
			var fname = stageRslt[i].getValue('custrecord_mcru_load_fname')?stageRslt[i].getValue('custrecord_mcru_load_fname'):'';
			var lname = stageRslt[i].getValue('custrecord_mcru_load_lname')?stageRslt[i].getValue('custrecord_mcru_load_lname'):'';
			var email = stageRslt[i].getValue('custrecord_mcru_load_email')?stageRslt[i].getValue('custrecord_mcru_load_email'):'';
			var loadCompanyName = stageRslt[i].getValue('custrecord_mcru_load_company')?stageRslt[i].getValue('custrecord_mcru_load_company'):'';
			var loadCompanyState = stageRslt[i].getValue('custrecord_mcru_load_company_state')?stageRslt[i].getValue('custrecord_mcru_load_company_state'):'';
			var contactid = stageRslt[i].getValue('custrecord_mcru_contact')?stageRslt[i].getValue('custrecord_mcru_contact'):'';
			var customerid = stageRslt[i].getValue('custrecord_mcru_contact_customer')?stageRslt[i].getValue('custrecord_mcru_contact_customer'):'';
			var camptitle = stageRslt[i].getValue('custrecord_mcru_campaign_title')?stageRslt[i].getValue('custrecord_mcru_campaign_title'):'';
			var campres = stageRslt[i].getValue('custrecord_mcru_campres_type')?stageRslt[i].getValue('custrecord_mcru_campres_type'):'';
			var campresdate = stageRslt[i].getValue('custrecord_mcru_campres_date');
			var campid = '';

			//0. Check for Required values
			if (!camptitle || (!contactid && !customerid && !email)) {
				updVals = ['T','Failed','Unable to execute due to missing campaign title or contact/customer IDs and email missing'];
				nlapiSubmitField('customrecord_ax_mass_campres_update', stageRslt[i].getId(), updFlds, updVals);
				//skip to next record in the array
				continue;
			}
			
			//1. lookup campaign id if it doesn't exist
			if (!jsoncamp[camptitle]) {
				var campFlt = [new nlobjSearchFilter('title', null, 'is',strTrim(camptitle))];
				var campCol = [new nlobjSearchColumn('internalid')];
				var campRslt = nlapiSearchRecord('campaign', null, campFlt, campCol);
				if (campRslt && campRslt.length == 1) {
					campid = campRslt[0].getId();
					//add it to json 
					jsoncamp[camptitle] = campid;
				}
			} else {
				//get it from json object
				campid = jsoncamp[camptitle];
			}
			
			//1 Fail check
			if (!campid) {
				updVals = ['T','Failed','Unable to determin campaign ID from title'];
				nlapiSubmitField('customrecord_ax_mass_campres_update', stageRslt[i].getId(), updFlds, updVals);
				//skip to next record in the array
				continue;
			}
			
			/**
			 * fname, lname, email, loadCompanyName, loadCompanyState, contactid, customerid, camptitle, campres, campresdate, campid;
			 */
			//2. check to see if both contact id and customer id are missing
			//   - If they are missing search for contact id using first/last/email combo
			if (!contactid && !customerid) {
				var contactFlt = [new nlobjSearchFilter('email', null, 'is', email)];
				var contactCol = [new nlobjSearchColumn('company')];
				var contactRslt = nlapiSearchRecord('contact', null, contactFlt, contactCol);
				if (!contactRslt || (contactRslt && contactRslt.length > 1)) {
					updVals = ['T','Failed','Unable to determin matching contact with email. No or Multiple results returned'];
					nlapiSubmitField('customrecord_ax_mass_campres_update', stageRslt[i].getId(), updFlds, updVals);
					//skip to next record in the array
					continue;
				}
				
				contactid = contactRslt[0].getId();
				customerid = contactRslt[0].getValue('company');
			}
			
			//3. Create campaign response
			var hasCampResError = false;			
			var logText = '';
			var campResNote = '[Original Response Date: '+campresdate+']';
			if (!campresdate) {
				campResNote = '';
			}
			if (contactid) {
				try {
					var contactCampRes = nlapiCreateRecord('campaignresponse',{recordmode: 'dynamic'});
					contactCampRes.setFieldValue('entity',contactid);
					contactCampRes.setFieldValue('leadsource', campid);
					contactCampRes.setFieldText('campaignevent','[Default Event]');
					contactCampRes.setFieldText('response', strTrim(campres));
					contactCampRes.setFieldValue('note', campResNote);
					nlapiSubmitRecord(contactCampRes, false, true);
					logText+= 'Contact ('+contactid+') Camp. Response Created Successfully || ';
				} catch (contactCampResError) {
					hasCampResError = true;
					logText += 'Contact ('+contactid+') Camp. Response Error: '+getErrText(contactCampResError)+' || ';
				}
			}
			
			if (customerid) {
				try {
					var customerCampRes = nlapiCreateRecord('campaignresponse',{recordmode: 'dynamic'});
					customerCampRes.setFieldValue('entity',customerid);
					customerCampRes.setFieldValue('leadsource', campid);
					customerCampRes.setFieldText('campaignevent','[Default Event]');
					customerCampRes.setFieldText('response', strTrim(campres));
					customerCampRes.setFieldValue('note', campResNote);
					nlapiSubmitRecord(customerCampRes, false, true);
					logText+= 'Customer ('+customerid+') Camp. Response Created Successfully || ';
				} catch (customerCampResError) {
					hasCampResError = true;
					logText += 'Customer ('+customerid+') Camp. Response Error: '+getErrText(customerCampResError)+' || ';
				}
			}
			
			var procStatus = 'Success';
			if (hasCampResError) {
				procStatus = 'Fail or Partial Fail';
			}
			
			updVals = ['T',procStatus,logText];
			nlapiSubmitField('customrecord_ax_mass_campres_update', stageRslt[i].getId(), updFlds, updVals);
			
			if (ctx.getRemainingUsage() <= EXIT_COUNT && (i+1) < stageRslt.length) {
				log('debug','Rescheduling at Internal ID ',stageRslt[i].getId());
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), null);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
	} catch (processError) {
		log('error','Script Termination',getErrText(processError));
	}
}
