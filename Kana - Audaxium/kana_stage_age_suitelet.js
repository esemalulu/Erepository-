 /** 
Project			: Stage Aging Matrix
Programmer		:Sagar Shah
Description		: Create Stage Age matrix of Count and Average Age for each stage and month (for current and last year)
Date			: 05/23/2013	
====================================================================
**/

/**
 * The function 'createMatrix' would create the desired matrix
 * It would take the data from the search 'Opportunity Sales Stage Matrix - Do not Delete - used in suitlet'
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function createMatrix(request, response)
{    
	var list = nlapiCreateList('Stage Aging Matrix', true);
	
	if(request.getParameter('style') != null){
		list.setStyle(request.getParameter('style'));
	}else{
		list.setStyle('grid');
	}
	
	//Design the report format
	list.setTitle('Stage Aging Matrix');

	var currentYearNum = new Date().getFullYear();
	var previousYearNum = currentYearNum - 1;
	
	var currentYear = currentYearNum.toString();
	var previousYear = previousYearNum.toString();
	
	var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var stageNames = ['0 - Unqualified, Closed Lost, etc.','01 - Marketing Qualified Lead (MQL)',
	                  '02 - Interest, Sales Accepted Lead','03 - Sales Qualified Oppty < 12 Mos',
	                  '04 - Onsite Complete (Discovery)','05 - Indicative Proposal Delivered',
	                  '06 - SOW Complete (Solution)','07 - Final Proposal Delivered',
	                  '08 - Bound POC or N/A','09 - Decision','10 - Contracts (Legal VOC)',
	                  '11 - Closed (Won)'];
	var stageIDInSequence = [0,2,6,9,10,13,14,15,11,16,12,20];//these ids corresponds to the stage field names in Stage Aging report
	
	list.addColumn('stagename','text', 'Stage Name','center');   

	
	for(var j in monthNames) {
		list.addColumn(monthNames[j].toLowerCase()+previousYear,'text', monthNames[j]+' '+previousYear,'center');
	}
	
	for(var j in monthNames) {
		list.addColumn(monthNames[j].toLowerCase()+currentYear,'text', monthNames[j]+' '+currentYear,'center');
	}
	
	list.addColumn('total','text', 'Total','center');   

	var GrandOpptyCount = [];
	var GrandTotalAge = []; //grand-total for each stage across months


	var OpptyCount = [];
	var OpptyTotalAge = []; //sub-total for each stage across months
	
	OpptyCount[previousYear] = [];
	OpptyCount[currentYear] = [];
	OpptyTotalAge[previousYear] = [];
	OpptyTotalAge[currentYear] = [];
	
	for(var i in stageNames) {

		GrandOpptyCount[stageNames[i]] = 0;
		GrandTotalAge[stageNames[i]] = 0; 
		
		OpptyCount[previousYear][stageNames[i]] = [];
		OpptyCount[currentYear][stageNames[i]] = [];
		OpptyTotalAge[previousYear][stageNames[i]] = [];
		OpptyTotalAge[currentYear][stageNames[i]] = [];
		for(var j in monthNames) {
			OpptyCount[previousYear][stageNames[i]][monthNames[j]] = 0;
			OpptyCount[currentYear][stageNames[i]][monthNames[j]] = 0;
			OpptyTotalAge[previousYear][stageNames[i]][monthNames[j]] = 0;
			OpptyTotalAge[currentYear][stageNames[i]][monthNames[j]] = 0;
		}
	}

	//Pull the data from the saved search
	var opptyAgingList = nlapiSearchRecord('opportunity','customsearch_oppty_stage_matrix');

	for(var i=0; i < opptyAgingList.length && opptyAgingList != null; i++) {
		
		for (var k in stageIDInSequence) {
			
			var stageDate = opptyAgingList[i].getValue('custrecord_stage'+stageIDInSequence[k]+'_date','custrecord_opp_id');
			var stageAge = opptyAgingList[i].getValue('custrecord_stage'+stageIDInSequence[k]+'_age','custrecord_opp_id');
			
			if(stageDate!=null && stageDate!='') {
				stageDate = nlapiStringToDate(stageDate);
				
				if(stageDate!=null) {
					
					var stageMonth = monthNames[stageDate.getMonth()];
					var stageYear = stageDate.getFullYear();
					if(stageYear <= currentYearNum && stageYear >= previousYearNum) {
						stageYear = stageYear.toString();
						OpptyCount[stageYear][stageNames[k]][stageMonth]++;
						GrandOpptyCount[stageNames[k]]++;
						
						if(stageAge!=null && stageAge!='') {
							OpptyTotalAge[stageYear][stageNames[k]][stageMonth]+=parseInt(stageAge);
							GrandTotalAge[stageNames[k]]+=parseInt(stageAge);
						}
					}
					
				}//end if
			}//end if
			
		}//end for loop on stageIDInSequence
	}//end for loop on opptyAgingList
	
	//Render the data
	var dataRows = new Array();
	
	for(var i in stageNames) {
		dataRows[i] = new Array();
		dataRows[i]['stagename'] = '<b>'+stageNames[i]+'</b>';

		dataRows[i]['total'] = Math.round(GrandOpptyCount[stageNames[i]]).toString()+'<br/><br/>'+GrandTotalAge[stageNames[i]];

		if(GrandOpptyCount[stageNames[i]] > 0)
			dataRows[i]['total'] = Math.round(GrandOpptyCount[stageNames[i]]).toString()+'<br/><br/>'+roundNumber(GrandTotalAge[stageNames[i]]/GrandOpptyCount[stageNames[i]],2);				 
		
		for(var j in monthNames) {
			
			dataRows[i][monthNames[j].toLowerCase()+previousYear] = Math.round(OpptyCount[previousYear][stageNames[i]][monthNames[j]]).toString()+'<br/><br/>'+OpptyTotalAge[previousYear][stageNames[i]][monthNames[j]];

			if(OpptyCount[previousYear][stageNames[i]][monthNames[j]] > 0)
				dataRows[i][monthNames[j].toLowerCase()+previousYear] = Math.round(OpptyCount[previousYear][stageNames[i]][monthNames[j]]).toString()+'<br/><br/>'+roundNumber(OpptyTotalAge[previousYear][stageNames[i]][monthNames[j]]/OpptyCount[previousYear][stageNames[i]][monthNames[j]],2);
						 
			dataRows[i][monthNames[j].toLowerCase()+currentYear] = Math.round(OpptyCount[currentYear][stageNames[i]][monthNames[j]]).toString()+'<br/><br/>'+OpptyTotalAge[currentYear][stageNames[i]][monthNames[j]];

			if(OpptyCount[currentYear][stageNames[i]][monthNames[j]] > 0)
				dataRows[i][monthNames[j].toLowerCase()+currentYear] = Math.round(OpptyCount[currentYear][stageNames[i]][monthNames[j]]).toString()+'<br/><br/>'+roundNumber(OpptyTotalAge[currentYear][stageNames[i]][monthNames[j]]/OpptyCount[currentYear][stageNames[i]][monthNames[j]],2);
					 
		}
	}	
	
	list.addRows( dataRows);  
	response.setHeader('Custom-Header-Kana','KANA Stage Aging Matrix');
	response.writePage( list );
}

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function entitlementList(request, response)
{    
	var startindex = 0;
	var iid='';
	var params = request.getAllParameters();
	
	if(params.length > 0){
		iid = request.getParameter('id');
	}

	var list = nlapiCreateList('CustomerEntitlements', true);     
	if(request.getParameter('style') != null){
		list.setStyle(request.getParameter('style'));
	}else{
		list.setStyle('grid');
	}

	list.setTitle('Customer Entitlements');

	list.addColumn('custpage_companyname','text', 'Customer Name');     
	list.addColumn('custpage_end_customer','text', 'End Customer Name');     
	list.addColumn('custpage_description','text', 'Description', 'LEFT');     
	list.addColumn('custpage_renewal_end_dt','date', 'Maint End Date', 'LEFT');     
	list.addColumn('custpage_support_code','text', 'Support Code', 'LEFT');     
	list.addColumn('custpage_item_type','text', 'Product', 'LEFT');     
	list.addColumn('custpage_tranid','text', 'Sales Order Num', 'LEFT');     
	list.addColumn('custpage_maintenance_type','text', 'Maint Level', 'LEFT');     
	list.addColumn('custpage_salesrep','text', 'Renewal Rep', 'LEFT');     
	list.addColumn('custpage_accntmgr','text', 'AccntMgr', 'LEFT');     
	list.addColumn('custpage_class_of_sale','text', 'Class of Sale', 'LEFT');     

	var searchResults = new Array(); 
	var searchfilter = new Array();
	var arrSearchColumn = new Array();	

	var searchResults1 = new Array(); 
	var searchfilter1 = new Array();
	var arrSearchColumn1 = new Array();	

	if(( iid != '') && (iid != null)){
		startindex = 1;

		searchfilter[0] = new nlobjSearchFilter('custentity_sugarcrm_customer_id', 'customer', 'is', iid);
		arrSearchColumn[0] = new nlobjSearchColumn('custentity_sugarcrm_customer_id','customer','group');
		searchResults = nlapiSearchRecord('transaction',1174 , searchfilter, arrSearchColumn);     

		searchfilter1[0] = new nlobjSearchFilter('custentity_sugarcrm_customer_id', 'custbody_end_customer', 'is', iid);
		arrSearchColumn1[0] = new nlobjSearchColumn('custentity_sugarcrm_customer_id','custbody_end_customer','group');
		searchResults1 = nlapiSearchRecord('transaction',1174 , searchfilter1, arrSearchColumn1);     
	}else{
		searchResults = nlapiSearchRecord('transaction',1174 , searchfilter, arrSearchColumn);     
	}

	var result;
	var columns;
	var columnLen;
	var column;
	var rowValue;
	var myRows = new Array();

	var irowcount = 0;
	for(var i in searchResults){

		myRows[i] = new Array();
		result = searchResults[i];
		columns = result.getAllColumns();

		/*
		column = column[0];		//customer name
		column = column[1];		//end customer name
		column = column[2];		//Product
		column = column[3];		//Maint Start Date
		column = column[4];		//Maint End date
		column = column[5];		//Support code
		column = column[6];		//Sugar customer id
		column = column[7];		//SO Number
		column = column[8];		//Maint Level
		column = column[9];		//End customer sugar id
		column = column[10];	//Renewal startdate
		column = column[11];	//Renewal enddate
		column = column[12];	//Renewal rep
		column = column[13];	//New Maint End date
		column = column[13];	//Accnt Mgr
		column = column[14];	//Description
		column = column[15];	//Class of sale
		*/
		
		column = columns[startindex];
		rowValue = result.getValue(column);
		var scustomername = rowValue;
		myRows[i]['custpage_companyname'] = scustomername;
		
		column = columns[startindex+1];
		rowValue = result.getValue(column);
		var sendcustomername = rowValue;
		myRows[i]['custpage_end_customer'] = sendcustomername;

/*		
		if(sendcustomername != null){
			myRows[i]['custpage_companyname'] = sendcustomername;
			myRows[i]['custpage_end_customer'] = scustomername;
		}else{
			myRows[i]['custpage_companyname'] = scustomername;
			myRows[i]['custpage_end_customer'] = sendcustomername;
		}
*/

		column = columns[startindex+14];
		rowValue = result.getValue(column);
		myRows[i]['custpage_description'] = rowValue;
		
		column = columns[startindex+4];
		rowValue = result.getValue(column);
		myRows[i]['custpage_renewal_end_dt'] = rowValue;

		column = columns[startindex+5];
		rowValue = result.getValue(column);
		myRows[i]['custpage_support_code'] = rowValue;

		column = columns[startindex+2];
		rowValue = result.getText(column);
		myRows[i]['custpage_item_type'] = rowValue;

		column = columns[startindex+7];
		rowValue = result.getValue(column);
		myRows[i]['custpage_tranid'] = rowValue;

		column = columns[startindex+8];
		rowValue = result.getText(column);
		myRows[i]['custpage_maintenance_type'] = rowValue;

		column = columns[startindex+12];
		rowValue = result.getText(column);
		myRows[i]['custpage_salesrep'] = rowValue;

		column = columns[startindex+13];
		rowValue = result.getText(column);
		myRows[i]['custpage_accntmgr'] = rowValue;

		column = columns[startindex+15];
		rowValue = result.getText(column);
		myRows[i]['custpage_class_of_sale'] = rowValue;

	}
	
	i = myRows.length;
	for(var ii in searchResults1){

		myRows[i] = new Array();
		result = searchResults1[ii];
		columns = result.getAllColumns();

		column = columns[startindex];
		rowValue = result.getValue(column);
		//myRows[i]['custpage_companyname'] = rowValue;
		var scustomername = rowValue;
		//myRows[i]['custpage_companyname'] = scustomername;

		column = columns[startindex+1];
		rowValue = result.getValue(column);
		//myRows[i]['custpage_end_customer'] = rowValue;
		var sendcustomername = rowValue;
		//myRows[i]['custpage_end_customer'] = sendcustomername;

		if(sendcustomername != null){
			myRows[i]['custpage_companyname'] = sendcustomername;
			myRows[i]['custpage_end_customer'] = scustomername;
		}else{
			myRows[i]['custpage_companyname'] = scustomername;
			myRows[i]['custpage_end_customer'] = sendcustomername;
		}

		column = columns[startindex+14];
		rowValue = result.getValue(column);
		myRows[i]['custpage_description'] = rowValue;
		
		column = columns[startindex+4];
		rowValue = result.getValue(column);
		myRows[i]['custpage_renewal_end_dt'] = rowValue;

		column = columns[startindex+5];
		rowValue = result.getValue(column);
		myRows[i]['custpage_support_code'] = rowValue;

		column = columns[startindex+2];
		rowValue = result.getText(column);
		myRows[i]['custpage_item_type'] = rowValue;

		column = columns[startindex+7];
		rowValue = result.getValue(column);
		myRows[i]['custpage_tranid'] = rowValue;

		column = columns[startindex+8];
		rowValue = result.getText(column);
		myRows[i]['custpage_maintenance_type'] = rowValue;

		column = columns[startindex+12];
		rowValue = result.getText(column);
		myRows[i]['custpage_salesrep'] = rowValue;

		column = columns[startindex+13];
		rowValue = result.getText(column);
		myRows[i]['custpage_accntmgr'] = rowValue;

		column = columns[startindex+15];
		rowValue = result.getText(column);
		myRows[i]['custpage_class_of_sale'] = rowValue;
	}

	list.addRows( myRows);  
	response.setHeader('Custom-Header-Kana','KANA Customer Entitlements');
	response.writePage( list );
}	