/**
 * User Event trigger deployed on customer/lead/prospect record.
 * 
 * @param type
 */

//Fields to look for changes
//This area could potentially move as custom record for dynamic configuration.
var monitorField='entitystatus';
var monitorSalesRepField = 'salesrep';
//Company level preference to track sales rep changes
var trackSalesRepChanges = nlapiGetContext().getSetting('SCRIPT','custscript_tracksalsrepupd');

function nsStatusStageSalesRepBeforeLoad(type, form, request) {
	
	if (type !='delete' && type != 'create') {
		
		log('debug','type',type);
		log('debug','Exec context', nlapiGetContext().getExecutionContext());
		
		//add field to track original sales rep
		var origSalesRep = nlapiGetFieldValue(monitorSalesRepField);
		log('debug','orig sales rep', origSalesRep);
		
		var origSalesRepFld = form.addField('custpage_origsalesrep', 'text', '', null, null);
		origSalesRepFld.setDefaultValue(origSalesRep);
		origSalesRepFld.setDisplayType('hidden');
		
		log('debug','orig sr fld added','added');
	}
}


/**
 * Compare Old and New Value of Customer/lead/prospect status and if different, 
 * schedule Customer Status on contact script to execute.
 */
function afterSubmit(type) {
	log('debug','Type',type);
	log('debug','type // track sales rep',type+' // '+trackSalesRepChanges);
	
	//ignore delete type and fire for rest
	if (type !='delete' && type != 'create') {
	
		var oldrec = nlapiGetOldRecord();
		var newrec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		
		//Enhancement to track sales rep changes
		
		var oldstatusText = (oldrec && oldrec.getFieldValue(monitorField))?oldrec.getFieldText(monitorField):'';
		
		var oldSalesRep = nlapiGetFieldValue('custpage_origsalesrep');
		if (!oldSalesRep && oldrec) {
			oldSalesRep = oldrec.getFieldValue(monitorSalesRepField);
			log('debug','Custom field old rep is null, checking old rec', oldSalesRep);
		}
		
		var newStatusText = newrec.getFieldText(monitorField);
		var newStageText = newrec.getFieldValue('stage');
		var newSalesRepChangeDateTime = '';
		
		var newSalesRep = newrec.getFieldValue(monitorSalesRepField);
		
		log('debug','new sales rep', newSalesRep);
		log('debug','old sales rep', oldSalesRep);
		
		//need to make sure newstatus value exists
		if (type == 'xedit') {
			//incase update is xedit, lookup value of monitorField
			newStatusText = newrec.getFieldText(monitorField);
			newStageText = newrec.getFieldText('stage');
			
			if (trackSalesRepChanges=='T') {
				if (type == 'xedit' && oldrec) {
					oldSalesRep = oldrec.getFieldValue(monitorSalesRepField);
					log('debug','xedit old sales rep', oldSalesRep);
				}
				newSalesRep = newrec.getFieldValue(monitorSalesRepField);
				log('debug','xedit  sales rep', newSalesRep);
			}
		}
		
		log('debug','type // sales rep // old status // new status // stage', type+' // '+newSalesRep+' // '+oldstatusText+' // '+newStatusText+' // '+newStageText);
		
		//if status of a customer changes, schedule script to execute right away.
		log('debug','old/new sales rep', oldSalesRep+' // '+newSalesRep);
		if (oldstatusText != newStatusText || oldSalesRep != newSalesRep) {
			var params = new Array();
			params['custscript_customerid'] = newrec.getId();
			params['custscript_new_status'] = newStatusText;
			params['custscript_new_stage'] = newStageText;
			
			//ONLY Pass in the date/time if different
			
			if (oldSalesRep != newSalesRep && trackSalesRepChanges=='T') {
				log('debug','passing in rep change','passing in rep change');
				newSalesRepChangeDateTime = nlapiDateToString(new Date(), 'datetimetz');
			}
			
			params['custscript_newsrupd_datetime'] = newSalesRepChangeDateTime;
			
			nlapiScheduleScript('customscript_ss_upd_cust_status_on_ct',null,params);
		}
	}
}

function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}