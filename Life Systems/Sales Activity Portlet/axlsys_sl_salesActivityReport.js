/**
 * Sales Activity Report generator.
 * Allows users to view all sales reps metric based on date filter.
 * # of Phone Calls
 * # of Meetings
 * # new Opportunities
 * Projected total of new Opps
 * # of Closed-Won Opportunities
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Feb 2014     JSon
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

var salesreps = {};

var srbysuper = {};

function salesMetricGenerator(req, res){
	
	//Request Parameters
	//detail or general or email
	var action = req.getParameter('action');
	if (!action) {
		action = 'general';
	}
	//internal id of record type being viewed in detail
	var type = req.getParameter('rectype');
	//default date selection
	var empid = req.getParameter('empid');
	var empfirst = req.getParameter('fn');
	var emplast = req.getParameter('ln');
	var datedefault = req.getParameter('datedef');
	//start date
	var startdate = req.getParameter('start');
	//end
	var enddate = req.getParameter('end');
	//rep filter type
	//all, mine, team, exec
	var repfilter = req.getParameter('rep');
	if (!repfilter) {
		repfilter = 'all';
	}
	
	var nsform = nlapiCreateForm('Sales Activity Metrics', false);
	nsform.setScript('customscript_ax_cs_salesactmetrichelper');
	
	//Status Field
	var msgfld = nsform.addField('custpage_msgstatus','inlinehtml','',null,null);
	msgfld.setLayoutType('outsideabove');
	
	var arSalesReps = new Array();
	//Request Variables provide Filter Data
	/**
	 * getDateDefaults is defined in Audaxium_LifeSystems_Utility.js
	 * Value returned are based on current date
	 * 		"Day":{
				"start":curDate,
				"end":curDate
			},
			"Week":{
				"start":curWeekStartDate,
				"end":curWeekEndDate
			},
			"Month":{
				"start":curMonthStartDate,
				"end":curMonthEndDate
			},
			"Quarter":{
				"start":quarterDateJson[quarterVal].start,
				"end":quarterDateJson[quarterVal].end,
			},
			"Year":{
				"start":"1/1/"+curDate.getFullYear(),
				"end":"12/31/"+curDate.getFullYear()
			}
	 */
	var datejson = getDateDefaults();
	
	try {
	
		//add in filter group
		nsform.addFieldGroup('custpage_grpa', 'Filter Options', null);
		//default date drop down
		var defDateFld = nsform.addField('custpage_defdatedd', 'select', 'Default Range', null, 'custpage_grpa');
		defDateFld.addSelectOption('', '', true);
		for (var dr in datejson) {
			defDateFld.addSelectOption(dr, dr);
		}
		if (!datedefault) {
			defDateFld.setDefaultValue('Day');
		} else {
			defDateFld.setDefaultValue(datedefault);
		}
		defDateFld.setBreakType('startcol');
		
		nsform.addField('custpage_help', 'inlinehtml', '',null,'custpage_grpa').setDefaultValue('<i>For Day, make sure Start and End dates are the same</i>');
		
		
		//date start fld = default to day
		var startDateFld = nsform.addField('custpage_startdate','date','Start Date', null, 'custpage_grpa');
		startDateFld.setMandatory(true);
		startDateFld.setDefaultValue(datejson['Day'].start);
		if (startdate) {
			startDateFld.setDefaultValue(startdate);
		} else {
			startdate = datejson['Day'].start;
		}
		startDateFld.setBreakType('startcol');
		
		//date end fld = default to day
		var endDateFld = nsform.addField('custpage_enddate','date','End Date', null, 'custpage_grpa');
		endDateFld.setMandatory(true);
		endDateFld.setDefaultValue(datejson['Day'].end);
		if (enddate) {
			endDateFld.setDefaultValue(enddate);
		} else {
			enddate = datejson['Day'].end;
		}
		endDateFld.setBreakType('startcol');
		
		//Display Filter
		var repFld = nsform.addField('custpage_rep','select','Sales Rep', null, 'custpage_grpa');
		repFld.setMandatory(true);
		repFld.setBreakType('startcol');
		repFld.addSelectOption('all', 'Show All Reps');
		repFld.addSelectOption('mine', 'Mine Only');
		repFld.addSelectOption('team', 'My Team');
		repFld.setDefaultValue('all');
		//Based on Roles????
		//TODO: exec view
		if (repfilter) {
			repFld.setDefaultValue(repfilter);
		}
		
		//based on action, change display
		if (action == 'detail' && type && empid) {
			
			//Add Back to General button
			nsform.addButton('custpage_backtogen', 'Back to Summary', 'backtoSummary();');
			
			//Disable filters
			repFld.setDisplayType('disabled');
			startDateFld.setDisplayType('disabled');
			endDateFld.setDisplayType('disabled');
			defDateFld.setDisplayType('disabled');
			
			//build detail view based on employee, type
			var dflt=null, dcol=null, drs=null;
			var dsublist=null;
			
			//call or event
			if (type == 'Call' || type == 'Event') {
				dflt = [new nlobjSearchFilter('owner', null, 'anyof', empid),
				        new nlobjSearchFilter('completeddate', null, 'within',startdate,enddate)];
				var ceRecType = '';
				if (type=='Call') {
					dflt.push(new nlobjSearchFilter('type', null, 'anyof',['Call']));
					ceRecType = 'phonecall';
					
				} else {
					dflt.push(new nlobjSearchFilter('type', null, 'anyof',['Event']));
					ceRecType = 'calendarevent';
				}
				
				dcol = [new nlobjSearchColumn('internalid'),
				        new nlobjSearchColumn('completeddate'),
				        new nlobjSearchColumn('status'),
				        new nlobjSearchColumn('title'),
				        new nlobjSearchColumn('company'),
				        new nlobjSearchColumn('message')];
				
				drs = nlapiSearchRecord('activity',null,dflt, dcol);
				
				dsublist = nsform.addSubList('custpage_detailcallevent', 'list', type+' Detail for '+empfirst+' '+emplast, null);
				dsublist.addField('custpage_dsl_id', 'text', type+' ID', null);
				dsublist.addField('custpage_dsl_title','textarea',type+' Title', null).setDisplayType('inline');
				dsublist.addField('custpage_dsl_compdate','text',type+' Completed Date', null);
				dsublist.addField('custpage_dsl_company','text','Company', null);
				dsublist.addField('custpage_dsl_status','text',type+' Status', null);
				dsublist.addField('custpage_dsl_message','textarea',type+' Details', null).setDisplayType('inline');
				var dline=1;
				for (var d=0; drs && d < drs.length; d++) {
					
					var viewRecHtml = '<a href="'+nlapiResolveURL('RECORD', ceRecType, drs[d].getValue('internalid'), 'VIEW')+'" target="_blank">View '+
									  drs[d].getValue('title')+' '+type+
									  '</a>';
					
					dsublist.setLineItemValue('custpage_dsl_id', dline, drs[d].getValue('internalid'));
					dsublist.setLineItemValue('custpage_dsl_compdate', dline, drs[d].getValue('completeddate'));
					dsublist.setLineItemValue('custpage_dsl_company', dline, drs[d].getValue('company'));
					dsublist.setLineItemValue('custpage_dsl_status', dline, drs[d].getValue('status'));
					dsublist.setLineItemValue('custpage_dsl_title', dline, viewRecHtml);
					dsublist.setLineItemValue('custpage_dsl_message', dline, drs[d].getValue('message'));
					dline++;
				}

			} else if (type=='New' || type=='Closed') {
				
				dflt = [new nlobjSearchFilter('salesrep', null, 'anyof',empid),
			            //Ignore 52568 (QVY001-Quota Visibility)
			            new nlobjSearchFilter('entity', null, 'noneof','52568')];
				
				if (type=='New') {
					dflt.push( new nlobjSearchFilter('datecreated', null, 'within',startdate,enddate));
				} else {
					dflt.push(new nlobjSearchFilter('entitystatus', null, 'anyof',['13']));
					dflt.push(new nlobjSearchFilter('closedate', null, 'within',startdate,enddate));
				}
				
				dcol = [new nlobjSearchColumn('internalid'),
				        new nlobjSearchColumn('tranid'),
				        new nlobjSearchColumn('title'),
				        new nlobjSearchColumn('projectedtotal'),
				        new nlobjSearchColumn('entitystatus'),
				        new nlobjSearchColumn('entity'),
				        new nlobjSearchColumn('trandate')];
				
				drs = nlapiSearchRecord('opportunity', null, dflt, dcol);
				
				dsublist = nsform.addSubList('custpage_detailopp', 'list', type+' Opportunities for '+empfirst+' '+emplast, null);
				dsublist.addField('custpage_dsl_id', 'text', 'Record ID', null);
				dsublist.addField('custpage_dsl_tranid', 'textarea', 'Opp ID', null).setDisplayType('inline');
				dsublist.addField('custpage_dsl_trandate', 'text', 'Opp Date', null);
				dsublist.addField('custpage_dsl_company','text','Customer', null);
				dsublist.addField('custpage_dsl_status','text','Status', null);
				dsublist.addField('custpage_dsl_title','text','Title', null);
				dsublist.addField('custpage_dsl_prjtotal','text','Projected Total', null);
				var dline=1;
				for (var d=0; drs && d < drs.length; d++) {
					
					var viewOppHtml = '<a href="'+nlapiResolveURL('RECORD', 'opportunity', drs[d].getValue('internalid'), 'VIEW')+'" target="_blank">View Opportunity #'+
									  drs[d].getValue('tranid')+
									  '</a>';
					
					dsublist.setLineItemValue('custpage_dsl_id', dline, drs[d].getValue('internalid'));
					dsublist.setLineItemValue('custpage_dsl_tranid', dline, viewOppHtml);
					dsublist.setLineItemValue('custpage_dsl_trandate', dline, drs[d].getValue('trandate'));
					dsublist.setLineItemValue('custpage_dsl_company', dline, drs[d].getText('entity'));
					dsublist.setLineItemValue('custpage_dsl_status', dline, drs[d].getText('entitystatus'));
					dsublist.setLineItemValue('custpage_dsl_title', dline, drs[d].getValue('title'));
					dsublist.setLineItemValue('custpage_dsl_prjtotal', dline, formatCurrency(parseFloat(drs[d].getValue('projectedtotal')).toFixed(2),'$'));
					dline++;
				}
			}
			
		} else {
			
			//Add in Refresh button
			nsform.addButton('custpage_refreshbtn','Refresh Metrics', 'reloadReport()');
			
			//Grap All Supervisors
			//For Supervisor, DO NOT use (custentity_ax_emp_hide_sam_report) Filter
			var srmflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
				          new nlobjSearchFilter('salesrep', null, 'is','T'),
				          new nlobjSearchFilter('supervisor', null, 'noneof','@NONE@'),
				          new nlobjSearchFilter('custentity_ax_emp_hide_sam_report', null, 'is', 'F')];
			var srmcol = [new nlobjSearchColumn('supervisor', null, 'group')];
			var srmrs = nlapiSearchRecord('employee', null, srmflt, srmcol);
			
			//Supervisors can be an actual employee OR employee used as Territory Designation.
			//We need to get Supervisor of Territory Designation Employees
			var terRegSupervisorMap = {};
			
			//grab all unique supervisors 
			var allSuperIds = new Array();
			for (var sm=0; srmrs && sm < srmrs.length; sm++) {
				allSuperIds.push(srmrs[sm].getValue('supervisor', null, 'group'));
			}
			
			//Run search to find territory/region employees super
			//Remove Jeff Lay (-5) manually
			var rgflt = [new nlobjSearchFilter('internalid', null, 'anyof',allSuperIds)];
			
			var rgcol = [new nlobjSearchColumn('entityid'),
			             new nlobjSearchColumn('supervisor'), 
			             new nlobjSearchColumn('salesrole')];
			var rgrs = nlapiSearchRecord('employee', null, rgflt, rgcol);
			for (var r=0; r < rgrs.length; r++) {
				var superId='', superName='';
				if (!rgrs[r].getValue('salesrole')) {
					superId = rgrs[r].getValue('supervisor');
					superName = rgrs[r].getText('supervisor');
					//add to mapping
					terRegSupervisorMap[rgrs[r].getId()] = {
							"id":superId,
							"name":superName
					}
				} else {
					//it is person. use original
					superId = rgrs[r].getId();
					superName = rgrs[r].getValue('entityid');
				}
				log('debug','super check',superId);
				if (superId) {
					srbysuper[superId] = {
						"name":superName,
						"calltotal":0,
						"eventtotal":0,
						"newoppscounttotal":0,
						"newoppsvaluetotal":0.0,
						"closedoppscounttotal":0,
						"closedoppsvaluetotal":0.0,
						"salesreps":new Array()
					};
				}				
			}
			
			/**
			for (var sm=0; srmrs && sm < srmrs.length; sm++) {
				//create supervisor JSON
				
			}
			*/
			//log('debug','super json',JSON.stringify(srbysuper));
			//For All Employee search, USE (custentity_ax_emp_hide_sam_report) 
			var srflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
			             new nlobjSearchFilter('salesrep', null, 'is','T'),
			             new nlobjSearchFilter('custentity_ax_emp_hide_sam_report', null, 'is', 'F')];
						//new nlobjSearchFilter('giveaccess', null, 'is','T')];
			
			//build employee filter based on rep filter
			//all, mine, team, exec
			//repfilter
			
			var currentUser = nlapiGetContext().getUser();
			//TEST
			//var currentUser = '-5';
			if (repfilter == 'mine') {
				srflt.push(new nlobjSearchFilter('internalid', null, 'anyof', currentUser));
			} else if (repfilter == 'team') {
				srflt.push(new nlobjSearchFilter('supervisor', null, 'anyof', currentUser));
			}
			
			var srcol = [new nlobjSearchColumn('firstname'),
			             new nlobjSearchColumn('lastname').setSort(),
			             new nlobjSearchColumn('salesrole'),
			             new nlobjSearchColumn('supervisor')];
			var sremp = nlapiSearchRecord('employee', null, srflt, srcol);
			//loop through list of sales reps and populate the array
			for (var e=0; sremp && e < sremp.length; e++) {
				arSalesReps.push(sremp[e].getId());
				//terRegSupervisorMap
				var empSuperId = sremp[e].getValue('supervisor');
				var empSuperName = sremp[e].getText('supervisor');
				if (terRegSupervisorMap[sremp[e].getValue('supervisor')]) {
					empSuperId = terRegSupervisorMap[sremp[e].getValue('supervisor')].id;
					empSuperName = terRegSupervisorMap[sremp[e].getValue('supervisor')].name;
				}
				
				salesreps[sremp[e].getId()] = {
					"firstname":sremp[e].getValue('firstname'),
					"lastname":sremp[e].getValue('lastname'),
					"supervisorid":empSuperId,
					"supervisorname":empSuperName,
					"salesroleid":sremp[e].getValue('salesrole'),
					"salesroletext":sremp[e].getText('salesrole'),
					"calls":0,
					"events":0,
					"newopps":0,
					"newoppstotal":0.0,
					"closedopps":0,
					"closedoppstotal":0.0
				};
				//log('debug','emp super',sremp[e].getValue('supervisor'));
				//add employeeids to supervisor JSON array
				log('debug','super id',empSuperId);
				if (empSuperId) {
					srbysuper[empSuperId]['salesreps'].push(sremp[e].getId());
				}
				
			}
			
			//test
			//var testfld = nsform.addField('custpage_test', 'inlinehtml', '', null, null);
			//testfld.setDefaultValue(JSON.stringify(datejson));
			
			
			//search for Call, Event -----------------------------
			//Status = COMPLETE, PROGRESS
			//ONLY Execute when arSalesReps has value
			if (arSalesReps.length > 0) {
				var actflt = [new nlobjSearchFilter('type', null, 'anyof',['Call','Event']),
				              //new nlobjSearchFilter('status', null, 'anyof',['COMPLETE','PROGRESS']),
				              new nlobjSearchFilter('owner', null, 'anyof', arSalesReps),
				              new nlobjSearchFilter('completeddate', null, 'within',startdate,enddate)];
				
				var actcol = [new nlobjSearchColumn('internalid', null, 'count'),
				              new nlobjSearchColumn('owner', null, 'group'),
				              new nlobjSearchColumn('type', null, 'group')];
				
				
				var actrs = nlapiSearchRecord('activity',null,actflt, actcol);
				for (var act=0; actrs && act < actrs.length; act++) {
					var activityEmpId = actrs[act].getValue('owner', null, 'group');
					 
					//Make sure owner is in salesreps JSON
					if (salesreps[activityEmpId]) {
						
						if (actrs[act].getValue('type', null, 'group')=='Call') {
							//Add as Phone Call
							salesreps[activityEmpId].calls = parseInt(salesreps[activityEmpId].calls) + parseInt(actrs[act].getValue('internalid', null, 'count'));
							
							//add to supervisor total calls
							if (salesreps[activityEmpId].supervisorid) {
								srbysuper[salesreps[activityEmpId].supervisorid].calltotal = parseInt(srbysuper[salesreps[activityEmpId].supervisorid].calltotal) + parseInt(actrs[act].getValue('internalid', null, 'count'));
							}
							
						} else {
							//Add as Event
							salesreps[activityEmpId].events = parseInt(salesreps[activityEmpId].events) + parseInt(actrs[act].getValue('internalid', null, 'count'));
							
							//add to supervisor total events
							if (salesreps[activityEmpId].supervisorid) {
								srbysuper[salesreps[activityEmpId].supervisorid].eventtotal = parseInt(srbysuper[salesreps[activityEmpId].supervisorid].eventtotal) + parseInt(actrs[act].getValue('internalid', null, 'count')); 
							}							
						}
					}
				}
			}
			
			//search for New Opportunity ---------------------------
			//Created Date (datecreated) is within Date Range
			//salesrep is NONE of unassigned
			var oppflt = [new nlobjSearchFilter('salesrep', null, 'noneof','@NONE@'),
			              new nlobjSearchFilter('datecreated', null, 'within',startdate,enddate),
			              //Ignore 52568 (QVY001-Quota Visibility)
			              new nlobjSearchFilter('entity', null, 'noneof','52568')];
			
			var oppcol = [new nlobjSearchColumn('internalid', null, 'count'),
			              new nlobjSearchColumn('salesrep', null, 'group'),
			              new nlobjSearchColumn('projectedtotal', null, 'sum')];
			var opprs = nlapiSearchRecord('opportunity', null, oppflt, oppcol);
			for (var opp=0; opprs && opp < opprs.length; opp++) {
				var oppEmpId = opprs[opp].getValue('salesrep', null, 'group');
				if (salesreps[oppEmpId]) {
					salesreps[oppEmpId].newopps = parseInt(salesreps[oppEmpId].newopps) + parseInt(opprs[opp].getValue('internalid', null, 'count'));
					salesreps[oppEmpId].newoppstotal = parseFloat(salesreps[oppEmpId].newoppstotal) + parseFloat(opprs[opp].getValue('projectedtotal', null, 'sum'));
					
					//add to supervisor total new opps elements
					if (salesreps[oppEmpId].supervisorid) {
						var noct = srbysuper[salesreps[oppEmpId].supervisorid].newoppscounttotal;
						var novt = srbysuper[salesreps[oppEmpId].supervisorid].newoppsvaluetotal;
						srbysuper[salesreps[oppEmpId].supervisorid].newoppscounttotal = parseInt(noct) + parseInt(opprs[opp].getValue('internalid', null, 'count'));
						srbysuper[salesreps[oppEmpId].supervisorid].newoppsvaluetotal = parseFloat(novt) + parseFloat(opprs[opp].getValue('projectedtotal', null, 'sum'));
					}					
				}
				
			}
	
			//Search for Closed Won Opportunity ----------------------
			//salesrep is NONE of unassigned
			//entitystatus is any of 13 (Closed Won)
			var coppflt = [new nlobjSearchFilter('salesrep', null, 'noneof','@NONE@'),
			               new nlobjSearchFilter('entitystatus', null, 'anyof',['13']),
				           new nlobjSearchFilter('closedate', null, 'within',startdate,enddate),
				           //Ignore 52568 (QVY001-Quota Visibility)
				           new nlobjSearchFilter('entity', null, 'noneof','52568')];		
			//TODO: add in date range closedate (Actual Closed)
			//USE Same oppcol
			var copprs = nlapiSearchRecord('opportunity', null, coppflt, oppcol);
			for (var copp=0; copprs && copp < copprs.length; copp++) {
				var coppEmpId = copprs[copp].getValue('salesrep', null, 'group');
				if (salesreps[coppEmpId]) {
					salesreps[coppEmpId].closedopps = parseInt(salesreps[coppEmpId].closedopps) + parseInt(copprs[copp].getValue('internalid', null, 'count'));
					salesreps[coppEmpId].closedoppstotal = parseFloat(salesreps[coppEmpId].closedoppstotal) + parseFloat(copprs[copp].getValue('projectedtotal', null, 'sum'));
					
					//add to supervisor total new opps elements
					if (salesreps[coppEmpId].supervisorid) {
						var coct = srbysuper[salesreps[coppEmpId].supervisorid].closedoppscounttotal;
						var covt = srbysuper[salesreps[coppEmpId].supervisorid].closedoppsvaluetotal;
						srbysuper[salesreps[coppEmpId].supervisorid].closedoppscounttotal = parseInt(coct) + parseInt(copprs[copp].getValue('internalid', null, 'count'));
						srbysuper[salesreps[coppEmpId].supervisorid].closedoppsvaluetotal = parseFloat(covt) + parseFloat(copprs[copp].getValue('projectedtotal', null, 'sum'));
					}
					
				}
				
			}
			
			//display results
			var saleslist = nsform.addSubList('custpae_replist', 'list', 'Sales Rep Activity Metrics', null);
			saleslist.addField('custpage_srl_super', 'textarea', 'Supervisor', null).setDisplayType('inline');
			saleslist.addField('custpage_srl_reps', 'text', 'Sales Rep', null);
			saleslist.addField('custpage_srl_repsid', 'text', 'Sales Rep ID', null).setDisplayType('hidden');
			saleslist.addField('custpage_srl_calls','textarea','# of Calls', null).setDisplayType('inline');
			saleslist.addField('custpage_srl_events','textarea','# of Meetings', null).setDisplayType('inline');
			saleslist.addField('custpage_srl_newopp','textarea','# of New Opps', null).setDisplayType('inline');
			saleslist.addField('custpage_srl_newopptotal','textarea','New Projected Total', null).setDisplayType('inline');
			saleslist.addField('custpage_srl_closedopp','textarea','# of Closed Opps', null).setDisplayType('inline');
			saleslist.addField('custpage_srl_closedopptotal','textarea','Closed Projected Total', null).setDisplayType('inline');
			
			//Change the way data is displayed based on display type
			if (repfilter=='all') {
				
				//add export and email button
				nsform.addButton('custpage_expemail', 'Email CSV Export', 'emailCsvExport();');
				
				//Grand Totals:
				var gtcalls = 0;
				var gtevents = 0;
				var gtnoppc = 0;
				var gtnoppv = 0.0;
				var gtcoppc = 0;
				var gtcoppv = 0.0;
				
				//by Supervisor
				var sline = 1;
				for (var smp in srbysuper) {
					//add in super visor totals
					saleslist.setLineItemValue('custpage_srl_super', sline, '<h1>'+srbysuper[smp].name+'</h1>');
					saleslist.setLineItemValue('custpage_srl_reps', sline, '');
					saleslist.setLineItemValue('custpage_srl_calls', sline, '');
					saleslist.setLineItemValue('custpage_srl_events', sline, '');
					saleslist.setLineItemValue('custpage_srl_newopp', sline, '');
					saleslist.setLineItemValue('custpage_srl_newopptotal', sline, '');
					saleslist.setLineItemValue('custpage_srl_closedopp', sline, '');
					saleslist.setLineItemValue('custpage_srl_closedopptotal', sline, '');
					//increment line
					sline++;
					//loop through each reporting sales reps
					var arreps = srbysuper[smp].salesreps;
					for (var r=0; r < arreps.length; r++) {
						var emp = arreps[r];
						saleslist.setLineItemValue('custpage_srl_super', sline, '');
						
						//base detail url
						var baseDetailUrl = nlapiResolveURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId())+
											'&action=detail'+
											'&empid='+emp+
											'&fn='+salesreps[emp].firstname+
											'&ln='+salesreps[emp].lastname+
											'&datedef='+datedefault+
											'&start='+startdate+
											'&end='+enddate+
											'&rep='+repfilter;
											
						//when values are greater than 0, value will display as Link for detail view
						var callLink = salesreps[emp].calls.toFixed(0);
						if (parseInt(salesreps[emp].calls.toFixed(0)) > 0) {
							callLink = baseDetailUrl+'&rectype=Call';
							//build HTML Link
							callLink = '<a href="'+callLink+'"><b>'+salesreps[emp].calls.toFixed(0)+'</b></a>';
						}
						
						var eventLink = salesreps[emp].events.toFixed(0);
						if (parseInt(salesreps[emp].events.toFixed(0)) > 0) {
							eventLink = baseDetailUrl+'&rectype=Event';
							//build HTML Link
							eventLink = '<a href="'+eventLink+'"><b>'+salesreps[emp].events.toFixed(0)+'</b></a>';
						}
						
						var newOppLink = salesreps[emp].newopps.toFixed(0);
						var newOppTotalLink = formatCurrency(salesreps[emp].newoppstotal.toFixed(2),'$');
						if (parseInt(salesreps[emp].newopps.toFixed(0)) > 0) {
							newOppLink = baseDetailUrl+'&rectype=New';
							newOppTotalLink = baseDetailUrl+'&rectype=New';
							
							newOppLink = '<a href="'+newOppLink+'"><b>'+salesreps[emp].newopps.toFixed(0)+'</b></a>';
							newOppTotalLink = '<a href="'+newOppTotalLink+'"><b>'+formatCurrency(salesreps[emp].newoppstotal.toFixed(2),'$')+'</b></a>';
						}
						
						var closedOppLink = salesreps[emp].closedopps.toFixed(0);
						var closedOppTotalLink = formatCurrency(salesreps[emp].closedoppstotal.toFixed(2),'$');
						if (parseInt(salesreps[emp].closedopps.toFixed(0)) > 0) {
							closedOppLink = baseDetailUrl+'&rectype=Closed';
							closedOppTotalLink = baseDetailUrl+'&rectype=Closed';
							
							closedOppLink = '<a href="'+closedOppLink+'"><b>'+salesreps[emp].closedopps.toFixed(0)+'</b></a>';
							closedOppTotalLink = '<a href="'+closedOppTotalLink+'"><b>'+formatCurrency(salesreps[emp].closedoppstotal.toFixed(2),'$')+'</b></a>';
						}
						
						saleslist.setLineItemValue('custpage_srl_reps', sline, salesreps[emp].firstname+' '+salesreps[emp].lastname);
						saleslist.setLineItemValue('custpage_srl_repsid', sline, emp);
						saleslist.setLineItemValue('custpage_srl_calls', sline, callLink);
						saleslist.setLineItemValue('custpage_srl_events', sline, eventLink);
						saleslist.setLineItemValue('custpage_srl_newopp', sline, newOppLink);
						saleslist.setLineItemValue('custpage_srl_newopptotal', sline, newOppTotalLink);
						saleslist.setLineItemValue('custpage_srl_closedopp', sline, closedOppLink);
						saleslist.setLineItemValue('custpage_srl_closedopptotal', sline, closedOppTotalLink);
						sline++;
					}
					//add total line for supervisor
					
					//keep adding the totals
					//Grand Totals:
					gtcalls = parseInt(gtcalls) + parseInt(srbysuper[smp].calltotal);
					gtevents = parseInt(gtevents) + parseInt(srbysuper[smp].eventtotal);
					gtnoppc = parseInt(gtnoppc) + parseInt(srbysuper[smp].newoppscounttotal);
					gtnoppv = parseFloat(gtnoppv) + parseFloat(srbysuper[smp].newoppsvaluetotal.toFixed(2)); 
					gtcoppc = parseInt(gtcoppc) + parseInt(srbysuper[smp].closedoppscounttotal);
					gtcoppv = parseFloat(gtcoppv) + parseFloat(srbysuper[smp].closedoppsvaluetotal.toFixed(2));
					
					saleslist.setLineItemValue('custpage_srl_super', sline, '');
					//saleslist.setLineItemValue('custpage_srl_reps', sline, '<b>'+srbysuper[smp].salesreps.length+'</b>');
					saleslist.setLineItemValue('custpage_srl_reps', sline, '');
					saleslist.setLineItemValue('custpage_srl_calls', sline, '<b>'+srbysuper[smp].calltotal+'</b>');
					saleslist.setLineItemValue('custpage_srl_events', sline, '<b>'+srbysuper[smp].eventtotal+'</b>');
					saleslist.setLineItemValue('custpage_srl_newopp', sline, '<b>'+srbysuper[smp].newoppscounttotal+'</b>');
					saleslist.setLineItemValue('custpage_srl_newopptotal', sline, '<b>'+formatCurrency(srbysuper[smp].newoppsvaluetotal.toFixed(2),'$')+'</b>');
					saleslist.setLineItemValue('custpage_srl_closedopp', sline, '<b>'+srbysuper[smp].closedoppscounttotal+'</b>');
					saleslist.setLineItemValue('custpage_srl_closedopptotal', sline, '<b>'+formatCurrency(srbysuper[smp].closedoppsvaluetotal.toFixed(2),'$')+'</b>');
					//increment line
					sline++;
					
				}
				
				//add in grad total line
				
				//add spacer
				saleslist.setLineItemValue('custpage_srl_super', sline, '');
				saleslist.setLineItemValue('custpage_srl_reps', sline, '');
				saleslist.setLineItemValue('custpage_srl_calls', sline, '');
				saleslist.setLineItemValue('custpage_srl_events', sline, '');
				saleslist.setLineItemValue('custpage_srl_newopp', sline, '');
				saleslist.setLineItemValue('custpage_srl_newopptotal', sline, '');
				saleslist.setLineItemValue('custpage_srl_closedopp', sline, '');
				saleslist.setLineItemValue('custpage_srl_closedopptotal', sline, '');
				//increment line
				sline++;
				
				saleslist.setLineItemValue('custpage_srl_super', sline, '');
				saleslist.setLineItemValue('custpage_srl_reps', sline, '<b>Grand Total</b>');
				saleslist.setLineItemValue('custpage_srl_calls', sline, '<b>'+gtcalls.toFixed(0)+'</b>');
				saleslist.setLineItemValue('custpage_srl_events', sline, '<b>'+gtevents.toFixed(0)+'</b>');
				saleslist.setLineItemValue('custpage_srl_newopp', sline, '<b>'+gtnoppc.toFixed(0)+'</b>');
				saleslist.setLineItemValue('custpage_srl_newopptotal', sline, '<b>'+formatCurrency(gtnoppv, '$')+'</b>');
				saleslist.setLineItemValue('custpage_srl_closedopp', sline, '<b>'+gtcoppc+'</b>');
				saleslist.setLineItemValue('custpage_srl_closedopptotal', sline, '<b>'+formatCurrency(gtcoppv,'$')+'</b>');
				
			} else {
				var eline = 1;
				for (var emp in salesreps) {
					
					//base detail url
					var baseDetailUrl = nlapiResolveURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId())+
										'&action=detail'+
										'&empid='+emp+
										'&fn='+salesreps[emp].firstname+
										'&ln='+salesreps[emp].lastname+
										'&datedef='+datedefault+
										'&start='+startdate+
										'&end='+enddate+
										'&rep='+repfilter;
										
					//when values are greater than 0, value will display as Link for detail view
					var callLink = salesreps[emp].calls.toFixed(0);
					if (parseInt(salesreps[emp].calls.toFixed(0)) > 0) {
						callLink = baseDetailUrl+'&rectype=Call';
						//build HTML Link
						callLink = '<a href="'+callLink+'"><b>'+salesreps[emp].calls.toFixed(0)+'</b></a>';
					}
					
					var eventLink = salesreps[emp].events.toFixed(0);
					if (parseInt(salesreps[emp].events.toFixed(0)) > 0) {
						eventLink = baseDetailUrl+'&rectype=Event';
						//build HTML Link
						eventLink = '<a href="'+eventLink+'"><b>'+salesreps[emp].events.toFixed(0)+'</b></a>';
					}
					
					var newOppLink = salesreps[emp].newopps.toFixed(0);
					var newOppTotalLink = formatCurrency(salesreps[emp].newoppstotal.toFixed(2),'$');
					if (parseInt(salesreps[emp].newopps.toFixed(0)) > 0) {
						newOppLink = baseDetailUrl+'&rectype=New';
						newOppTotalLink = baseDetailUrl+'&rectype=New';
						
						newOppLink = '<a href="'+newOppLink+'"><b>'+salesreps[emp].newopps.toFixed(0)+'</b></a>';
						newOppTotalLink = '<a href="'+newOppTotalLink+'"><b>'+formatCurrency(salesreps[emp].newoppstotal.toFixed(2),'$')+'</b></a>';
					}
					
					var closedOppLink = salesreps[emp].closedopps.toFixed(0);
					var closedOppTotalLink = formatCurrency(salesreps[emp].closedoppstotal.toFixed(2),'$');
					if (parseInt(salesreps[emp].closedopps.toFixed(0)) > 0) {
						closedOppLink = baseDetailUrl+'&rectype=Closed';
						closedOppTotalLink = baseDetailUrl+'&rectype=Closed';
						
						closedOppLink = '<a href="'+closedOppLink+'"><b>'+salesreps[emp].closedopps.toFixed(0)+'</b></a>';
						closedOppTotalLink = '<a href="'+closedOppTotalLink+'"><b>'+formatCurrency(salesreps[emp].closedoppstotal.toFixed(2),'$')+'</b></a>';
					}
					
					saleslist.setLineItemValue('custpage_srl_reps', eline, salesreps[emp].firstname+' '+salesreps[emp].lastname);
					saleslist.setLineItemValue('custpage_srl_repsid', eline, emp);
					saleslist.setLineItemValue('custpage_srl_calls', eline, callLink);
					saleslist.setLineItemValue('custpage_srl_events', eline, eventLink);
					saleslist.setLineItemValue('custpage_srl_newopp', eline, newOppLink);
					saleslist.setLineItemValue('custpage_srl_newopptotal', eline, newOppTotalLink);
					saleslist.setLineItemValue('custpage_srl_closedopp', eline, closedOppLink);
					saleslist.setLineItemValue('custpage_srl_closedopptotal', eline, closedOppTotalLink);
					eline++;
				}
			}
			
			//Email CSV
			if (repfilter=='all' && action=='email') {
				//generate CSV of all sales rep data and send email to logged in user
				var csvHeader = '"From Date","To Date","Sales Rep","Supervisor","Total Calls","Total Events","Total New Opps","Total New Opps Value","Total Closed Opps","Total Closed Opps Value"\n';
				var csvBody = '';
				for (var emp in salesreps) {
					csvBody += '"'+startdate+'",'+
							   '"'+enddate+'",'+
							   '"'+salesreps[emp].firstname+' '+salesreps[emp].lastname+'",'+
							   '"'+salesreps[emp].supervisorname+'",'+
							   '"'+salesreps[emp].calls+'",'+
							   '"'+salesreps[emp].events+'",'+
							   '"'+salesreps[emp].newopps+'",'+
							   '"'+salesreps[emp].newoppstotal+'",'+
							   '"'+salesreps[emp].closedopps+'",'+
							   '"'+salesreps[emp].closedoppstotal+'"\n';
				}
				
				var fileName = 'SalesActivity_All_SalesReps_From'+strGlobalReplace(startdate, '//', '_')+'_To_'+strGlobalReplace(enddate, '//', '_')+'.csv';
				var csvFile = nlapiCreateFile(fileName, 'CSV', csvHeader+csvBody);
				nlapiSendEmail(-5, 
							  nlapiGetContext().getEmail(), 
							  'Sales Activity for All Sales Reps '+startdate+' - '+enddate, 'CSV export of all sales rep activities from '+startdate+' to '+enddate, null, null, null, csvFile);
				
				msgfld.setDefaultValue('CSV Export Emailed to '+nlapiGetContext().getEmail());
				
				
			}
			
		}
	} catch (uierr) {
		log('error','Activity Display Error',getErrText(uierr));
		msgfld.setDefaultValue(getErrText(uierr));
	}
	
	res.writePage(nsform);
}
