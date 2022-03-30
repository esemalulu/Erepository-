/**
 * Scheduled Script requested by Client to used as ONE TIME or potentially on a AS NEEDED Bases.
 * CSV extract of Sales Orders are loaded into "AUX:AdHoc Gen Opp From So" (customrecord_aux_genoppfromso_adhoc) custom record.
 * For each Group of Sales Order, Script will generate ONE Opportunity record based on previous data.
 * For each Opportunity it creates, script will copy over information from loaded values as well as add ONE YEAR to contract start and end dates.
 * Line item price will be sourced from loaded value and NOT item base price.
 * 
 * Main for loop will go through Summary search by Sales Order. Each time it completes, script will mark custom records as Processed.
 */


function oneTimeOppGen() {

	var paramOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sctsb127_futureoppformid');
	var paramOppStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sctsb127_futureoppstatusid');
	
	//1 summary search by with grouped list of sales order IDs. Inner loop will run second search to bring out all custom records with that Sales Order. 
	//	- It assumes one to one relationships of Sales to Customer/End User
	var sflt = [new nlobjSearchFilter('custrecord_axop_processed', null, 'is','F')];
	
	var scol = [new nlobjSearchColumn('custrecord_axop_sointernalid', null, 'group').setSort(true),
	            new nlobjSearchColumn('custrecord_axop_billtoclientid', null, 'group'),
	            new nlobjSearchColumn('custrecord_axop_endcompclientid', null, 'group'),
	            new nlobjSearchColumn('custrecord_axop_sonumber', null, 'group')];
	
	var srs = nlapiSearchRecord('customrecord_aux_genoppfromso_adhoc', null, sflt, scol);
	
	//2. Loop through each Sales Order Internal ID and process Opportunity
	//srs.length
	for (var i=0; srs && i < srs.length; i++) {
	
		var soid = srs[i].getValue('custrecord_axop_sointernalid', null, 'group');
		var sonumber = srs[i].getValue('custrecord_axop_sonumber', null, 'group');
		var billtoid = srs[i].getValue('custrecord_axop_billtoclientid', null, 'group');
		var endcompid = srs[i].getValue('custrecord_axop_endcompclientid', null, 'group');
		//if value is - None -, set it to empty field
		if (endcompid == '- None -') {
			endcompid = '';
		}
		log('debug', 'Processing SO ID // Bill TO ID // End Comp ID', soid+' // '+billtoid+' // '+endcompid);
		
		//3. Grab list of ALL Records for Each Sales Order
		var soflt = [new nlobjSearchFilter('custrecord_axop_sointernalid', null, 'is', soid),
		             new nlobjSearchFilter('custrecord_axop_processed', null, 'is','F')];
		
		var socol = [new nlobjSearchColumn('internalid'), // Record ID
		             new nlobjSearchColumn('custrecord_axop_iteminternalid'), // Item Internal ID
		             new nlobjSearchColumn('custrecord_axop_amount'), //Item amount to Use on Opp
		             new nlobjSearchColumn('custrecord_axop_itemrate'), //Item rate to use on Opp
		             new nlobjSearchColumn('custrecord_axop_pltext'), // Item Price Level "Text"
		             new nlobjSearchColumn('custrecord_axop_ctstart'), //Contract Start Date
		             new nlobjSearchColumn('custrecord_axop_ctend'), //Contract End Date
		             new nlobjSearchColumn('custrecord_axop_relmgrname'), //Rel. Manager (Employee Name Text Value)
		             new nlobjSearchColumn('custrecord_axop_billschedule'), //Bill Schedule
		             new nlobjSearchColumn('custrecord_axop_solinenumber') // SO line number
		             ];
		
		var sors = nlapiSearchRecord('customrecord_aux_genoppfromso_adhoc', null, soflt, socol);
		
		//4. Loop through each and run validation and build objects per each sales order to generate opportunity.
		
		//JSON representing each line item to be added on new Opportunity.
		//	During info gathering process, if there are any error, haserrors will be marked as true and Entire group of SO will be marked as Process but Failed.
		//	When error occurs, no Oppoortunity is generated for THIS group of Sales order
		var oppjson = {
			"haserrors":false,
			"errmsg":'',
			"status":'Success',
			"opportunity":'',
			"salesorder":null,
			"procarray":new Array()
		};
		
		for (var j=0; j < sors.length; j++) {
			//build line level objects to add to procarray element of oppjson
			var lineobj = new Object();
			lineobj.custrecid = sors[j].getValue('internalid');
			lineobj.itemid = sors[j].getValue('custrecord_axop_iteminternalid');
			lineobj.amount = sors[j].getValue('custrecord_axop_amount');
			lineobj.rate = sors[j].getValue('custrecord_axop_itemrate');
			lineobj.priceleveltext = sors[j].getValue('custrecord_axop_pltext');
			lineobj.relmgrtext = sors[j].getValue('custrecord_axop_relmgrname');
			if (lineobj.relmgrtext == '- None -') {
				lineobj.relmgrtext = '';
			}
			lineobj.billsch = sors[j].getValue('custrecord_axop_billschedule');
			if (lineobj.billsch == '- None -') {
				lineobj.billsch = '';
			}
			lineobj.solinenum = sors[j].getValue('custrecord_axop_solinenumber');
			lineobj.ctstartdate = sors[j].getValue('custrecord_axop_ctstart');
			lineobj.ctenddate = sors[j].getValue('custrecord_axop_ctend');
			
			try {
				//4a. load the sales order record. JUST incase Sandbox and Production records do not match, if loading of sales order fails, SO and Client information does NOT exists in sandbox
				var sorec = nlapiLoadRecord('salesorder', soid);
				oppjson.salesorder = sorec;
				//4b. Make sure Item and contract related dates are filled
				if (!lineobj.itemid || !lineobj.ctstartdate || !lineobj.ctenddate) {
					log('error','SO '+soid+'; Custom Record ID '+sors[j].getValue('internalid'),'Missing required Item ID or Contract Start or Contract End date information');
					throw nlapiCreateError('OppGenErr', 'SO '+soid+'; Custom Record ID '+sors[j].getValue('internalid')+' - Missing required Item ID or Contract Start or Contract End date information', true);
				}
				
			} catch (soprocerr) {
				//4ERROR:
				oppjson.haserrors = true;
				oppjson.status = 'Failed';
				oppjson.errmsg += 'Error for Cust Record '+lineobj.custrecid+':\n'+getErrText(soprocerr)+'\n\n';
				
			}
			//add to oppjson.procarray
			oppjson.procarray.push(lineobj);
		}
		
		//5. Go through gathered information and either generate an Opportunity or mark each custom record line as error.
		//		If creation process fails, change oppjson haserror = true, set errmsg and status to failed.
		if (!oppjson.haserrors) {
			try {
				var linear = oppjson.procarray;
				var lsorec = oppjson.salesorder;
				
				var newStartDate = '';
				var newEndDate = '';
				
				//Create opportunity record
				//TODO: Need to make sure it creates using SAME FORM passed in.
				log('debug','Opp Form ID', paramOppFormId);
				var opprec = nlapiCreateRecord('opportunity', {recordmode:'dynamic', customform:paramOppFormId});
				//set body level fields
				//check to make sure form IS loaded using Opp Form. If not Set it
				//	THIS maybe a defect. in this account, form keeps loading in default 107 and NOT the form passed in 
				opprec.setFieldValue('title', 'Automated Renewal From Transition [12/29/2014-L1]');
				opprec.setFieldValue('entitystatus', paramOppStatusId); //Opp Status
				opprec.setFieldValue('entity', billtoid); //Bill to 
				opprec.setFieldValue('custbody_end_customer', endcompid); //End Company 
				
				//12/17/2014 - Need to swap to Renewal within the parent
				var soclass = lsorec.getFieldValue('class');
				//This is hard coded assuming no class value will change.
				//Key is NEW value of parent. Value is Renewal for that key
				var classMap = {
					"3":"4",
					"5":"6"
				};
				//Swap to Matching Renewal
				if (classMap[soclass]) {
					soclass = classMap[soclass];
				}
				
				opprec.setFieldValue('class', soclass); //Class sourced from Sales Order
				opprec.setFieldValue('custbody_renewal','T'); //Set Is Renewal to Checked
				opprec.setFieldValue('custbody_customer_category', lsorec.getFieldValue('custbody_customer_category')); // Grabs it from Original SO
				opprec.setFieldValue('custbody_working_w_channel_partner', lsorec.getFieldValue('custbody_working_w_channel_partner'));// Grab from Original SO
				opprec.setFieldValue('partner', lsorec.getFieldValue('partner')); //get Channel partner from sales order
				
				opprec.setFieldValue('memo',linear[0].billsch);
				
				//Remove default Sales Team members added during record initialization.
				var stcount = opprec.getLineItemCount('salesteam');
				for (var k = stcount; k >= 1 ;k--) {
					opprec.removeLineItem('salesteam', k);
				}
				
				//Set the relationship manager as sales rep ONLY if set on the CSV upload
				if (linear[0].relmgrtext) {
					//Use relationship manager as primary sales team
					opprec.selectNewLineItem('salesteam');
					opprec.setCurrentLineItemText('salesteam','employee', linear[0].relmgrtext);
					opprec.setCurrentLineItemText('salesteam','salesrole', 'Sales Rep');
					opprec.setCurrentLineItemValue('salesteam','isprimary', 'T');
					opprec.setCurrentLineItemValue('salesteam','contribution', '100.0%');
					opprec.commitLineItem('salesteam');
				}
				
				var projectTotal = 0.0;
				
				for (var h=0; h < linear.length; h++) {
					//Calculate new contract start and end by addingg 12 months to existing
					//12/17/2014 - Date will be modified by Sales Reps before it's uploaded.
					//			   NO Need to add 12 months.
					newStartDate = linear[h].ctstartdate;
					newEndDate = linear[h].ctenddate;
					
					//Build Total of Opp amount 
					projectTotal = parseFloat(projectTotal) + parseFloat(linear[h].amount);
					
					//Add in the Items
					opprec.selectNewLineItem('item');
					opprec.setCurrentLineItemValue('item','item', linear[h].itemid);
					opprec.setCurrentLineItemValue('item','quantity', '1');
					opprec.setCurrentLineItemText('item','price', linear[h].priceleveltext);
					opprec.setCurrentLineItemValue('item','rate', linear[h].rate);
					opprec.setCurrentLineItemValue('item','amount', linear[h].amount);
					opprec.setCurrentLineItemValue('item','custcol_contract_start_date', newStartDate);
					opprec.setCurrentLineItemValue('item','custcol_contract_end_date', newEndDate);
					opprec.commitLineItem('item');
					
				}
				
				//Add in Expected Close Date as new start date
				opprec.setFieldValue('expectedclosedate', newStartDate); //Expected close date is set to new start date (original + 12 months)
				
				//Set Projected Total
				opprec.setFieldValue('projectedtotal', projectTotal);
				
				oppjson.opportunity = nlapiSubmitRecord(opprec, true, true);
				
			} catch (oppcreateerr) {
				oppjson.haserrors = true;
				oppjson.status = 'Failed';
				oppjson.errmsg = 'Error Creating Opp. :\n'+getErrText(oppcreateerr)+'\n\n';
				log('error','Error creation Opportunity for SO #'+sonumber,oppjson.errmsg);
			}
		}
		
		
		//6. Go through gathered info. once more and update each custom record with latest status info
		var finupdfld = ['custrecord_axop_processed',
		                 'custrecord_axop_procstatus',
		                 'custrecord_axop_proclog',
		                 'custrecord_axop_procopp',
		                 'custrecord_axop_billtoclientref',
		                 'custrecord_axop_endcompclientref',
		                 'custrecord_axop_soref',
		                 'custrecord_axop_itemref'];
		for (var k=0; k < oppjson.procarray.length; k++) {
			var finupdval = ['T',
			                 oppjson.status,
			                 oppjson.errmsg,
			                 oppjson.opportunity,
			                 billtoid,
			                 endcompid,
			                 soid,
			                 oppjson.procarray[k].itemid];
			//update the custom record
			try {
				log('debug','Running Finished updates to record for ID '+oppjson.procarray[k].custrecid,'Status Elements: '+oppjson.status+' // '+oppjson.errmsg);
				
				nlapiSubmitField('customrecord_aux_genoppfromso_adhoc', oppjson.procarray[k].custrecid, finupdfld, finupdval, true);
			} catch (customrecupderr) {
				//JUST incase update fails, try once more with JUST Setting process related attributes.
				oppjson.errmsg = 'Error Updating Custom Record:\n'+getErrText(customrecupderr)+'\n\n'+oppjson.errmsg;
				
				var efinupdval= ['T',
				                 oppjson.status,
				                 oppjson.errmsg,
				                 oppjson.opportunity,
				                 '',
				                 '',
				                 '',
				                 ''];
				nlapiSubmitField('customrecord_aux_genoppfromso_adhoc', oppjson.procarray[k].custrecid, finupdfld, efinupdval, true);
			}
		}
		
		var pctCompleted = Math.round(((i+1) / srs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//Reschedule logic
		if ((i+1)==1000 || ((i+1) < srs.length && nlapiGetContext().getRemainingUsage() < 1000)) {
			//reschedule
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
			break;
		}
		
	}	
}