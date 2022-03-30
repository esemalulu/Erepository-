 /** 
Change ID		:CH#DATA_MIGRATION
Programmer		:Sagar Shah
Description		: Calculate Stage Aging data for the given search results - 'Data Migration - Phase II'
Date			: 05/05/2010	
====================================================================
Change ID		:CH#2012_UPDATES
Programmer		:Sagar Shah
Description		: All the Auto opportunities created by Pardot Integration user in May-June 2012 time frame didn't get 
corresponding Stage Aging records created. So this project is to artifically create the stage aging
info for all such opportunities
Date			: 07/30/2012
====================================================================
Change ID		:CH#2013_UPDATES
Programmer		:Sagar Shah
Description		: All the SF opportunities imported in April 2013 time frame didn't get 
corresponding Stage Aging records created. So this project is to forcefully create the stage aging
info for all such opportunities. There was a setting that was not enabled which resulted into this issue.
Date			: 05/22/2013
**/
//Array of Stages
//CH#2012_UPDATES
//var stageArr = ['Lost Opportunity','Unqualified','1 Awareness & Investigation','1.1 Suspect Enterprise','1.2 Contact','1.3 Active Suspect','2 Interest','2.5 Hand-Off to Sales','3 Education','4 Strategy','5 Initiative/Project','6 Recommendation','7 Decision'];
//CH#2013_UPDATES
//var stageArr = ['7 Closed - Lost','0 Lead - Unqualified','1 Lead - Marketing Qualified','1.1 Suspect Enterprise','1.2 Contact','1.3 Active Suspect','2 Interest','2.5 Hand-Off to Sales','3 Education','3 Qualified Opportunity','4 Solution','5 Proof of Concept','6 Contracts'];
var stageSequence = [2,6,9,10,13,14,15,11,16,12];
var stageArr = { 2:'01 - Marketing Qualified Lead (MQL)',
		6:'02 - Interest, Sales Accepted Lead',
		9:'03 - Sales Qualified Oppty < 12 Mos',
		10:'04 - Onsite Complete (Discovery)',
		13:'05 - Indicative Proposal Delivered',
		14:'06 - SOW Complete (Solution)',
		15:'07 - Final Proposal Delivered',
		11:'08 - Bound POC or N/A',
		16:'09 - Decision',
		12:'10 - Contracts (Legal VOC)'};

function dataMigration(type) {
	
	//Search Name: Data Migration - Phase II
	var stageAgingList = nlapiSearchRecord('customrecord_opp_stages','customsearch_data_migration_stage_aging');

	if(stageAgingList == null) {
		return;
	}
		
	for(var i=0; i < stageAgingList.length; i++) {

		var oppID = stageAgingList[i].getValue('internalid','custrecord_opp_id');

		var oppRec = nlapiLoadRecord('opportunity',oppID);
		var oppStatus = oppRec.getFieldText('entitystatus');
		var oppNumber = oppRec.getFieldValue('tranid');

		var expCloseDate = oppRec.getFieldValue('expectedclosedate');

		var amountBase;
		var amountSub;

		/* In Progress : A_Opprtnty
		   Issued Estimate : B_Opprtnty
		   Closed - Won : C_Opprtnty
		   Closed - Lost : D_Opprtnty
		*/
		var documentStatus = oppRec.getFieldValue('documentstatus');
		
		//if(documentStatus == 'A_Opprtnty' || documentStatus == 'D_Opprtnty') //Opportunity is in Progress or Lost
		amountBase = getnumber(oppRec.getFieldValue('projectedtotal'));
		var exchangeRate = getnumber(oppRec.getFieldValue('exchangerate'));
		amountSub = amountBase * exchangeRate;
		
		if(documentStatus == 'C_Opprtnty' || (documentStatus == 'B_Opprtnty' && oppStatus == '5 Committed') ) //Opportunity is Closed - Won
		{
			//Get information from the Sales Order

			var searchFilter = new nlobjSearchFilter('tranid', 'opportunity', 'is', oppNumber);
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('taxtotal',null,null);
			searchColumns[1] = new nlobjSearchColumn('exchangerate',null,null);
			searchColumns[2] = new nlobjSearchColumn('total',null,null);
			searchColumns[3] = new nlobjSearchColumn('fxamount',null,null);

			var salesOrderList = nlapiSearchRecord('salesorder',null, searchFilter, searchColumns);	
			
			if(salesOrderList != null && salesOrderList.length > 0) 
			{
				var total = getnumber(salesOrderList[0].getValue('total'));
				var subtotal = total - getnumber(salesOrderList[0].getValue('taxtotal'));
				var fxamount = getnumber(salesOrderList[0].getValue('fxamount'));
				var tmpexchrate = fxamount / total;
				
				amountBase = tmpexchrate * subtotal;
				amountBase = amountBase.toFixed(2);
				var exchRate = parseFloat(salesOrderList[0].getValue('exchangerate'));
				amountSub = amountBase * exchRate;
			}
		} 
		else if(documentStatus == 'B_Opprtnty') //Opportunity has Estimate issued.
		{
			//Get information from the Quote
			var searchFilter = new nlobjSearchFilter('tranid', 'opportunity', 'is', oppNumber);
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('taxtotal',null,null);
			searchColumns[1] = new nlobjSearchColumn('exchangerate',null,null);
			searchColumns[2] = new nlobjSearchColumn('total',null,null);
			searchColumns[3] = new nlobjSearchColumn('fxamount',null,null);			

			var quoteList = nlapiSearchRecord('estimate',null, searchFilter, searchColumns);

			if(quoteList != null && quoteList.length > 0) 
			{
				var total = getnumber(quoteList[0].getValue('total'));
				var subtotal = total - getnumber(quoteList[0].getValue('taxtotal'));
				var fxamount = getnumber(quoteList[0].getValue('fxamount'));
				var tmpexchrate = fxamount / total;
				
				amountBase = tmpexchrate * subtotal;
				amountBase = amountBase.toFixed(2);
				var exchRate = parseFloat(quoteList[0].getValue('exchangerate'));
				amountSub = amountBase * exchRate;
			}

		}

		var recordID = stageAgingList[i].getValue('id');
		var agingRec = nlapiLoadRecord('customrecord_opp_stages',recordID);
		
		var previousStage;
		var previousDate;
		var previousAge = 0;

		var currentStage;
		var currentDate;
		var currentAge = 0;

		var tempDate='';
		var tempStage='';

		var tempFlag = false;

		var lastStageIndex = 2;

		for(var j in stageSequence)
		{
			
			tempDate = agingRec.getFieldValue('custrecord_stage'+stageSequence[j]+'_date');
			tempStage = stageArr[stageSequence[j]];

			if(tempDate != null && tempDate != '') 
			{
				previousDate = currentDate;
				previousStage = currentStage;

				if(tempFlag == false) 
				{
					previousDate = tempDate;
					previousStage = tempStage;

					currentDate = tempDate;
					currentStage = tempStage;

					tempFlag = true;

				} 
				else {
					currentDate = tempDate;
					currentStage = tempStage;
					//populate age related to each stage
					previousAge = dateDiff(currentDate,previousDate);
					agingRec.setFieldValue('custrecord_stage'+parseInt(lastStageIndex)+'_age',previousAge);
				}

				//populate other fields for each Stage
				agingRec.setFieldValue('custrecord_stage'+stageSequence[j]+'_amount',amountBase);
				agingRec.setFieldValue('custrecord_stage'+stageSequence[j]+'_amountusd',amountSub);
				agingRec.setFieldValue('custrecord_stage'+stageSequence[j]+'_exp_close',expCloseDate);

				lastStageIndex = stageSequence[j];	
			}//end if loop 		

		}//end inner for
		if( documentStatus == 'D_Opprtnty' && oppStatus != '0 Lead - Unqualified') //Opportunity is Lost but not unqualified
		{
			tempDate = agingRec.getFieldValue('custrecord_stage0_date');
			if(tempDate != null && tempDate != '') 
			{
				previousDate = currentDate;
				previousStage = currentStage;

				currentDate = tempDate;
				currentStage = oppStatus;
				
				//CH#2013_UPDATES - start
				if(tempFlag==false) {//this is the only stage for the opportunity
					previousDate = currentDate;
					previousStage = currentStage;	
					lastStageIndex = 0;
				}
				//CH#2013_UPDATES - end
				
				//populate previous stage age
				previousAge = dateDiff(currentDate,previousDate);
				agingRec.setFieldValue('custrecord_stage'+parseInt(lastStageIndex)+'_age',previousAge);

				//populate fields for the current stage
				agingRec.setFieldValue('custrecord_stage0_age',currentAge);
				agingRec.setFieldValue('custrecord_stage0_amount',amountBase);
				agingRec.setFieldValue('custrecord_stage0_amountusd',amountSub);
				agingRec.setFieldValue('custrecord_stage0_exp_close',expCloseDate);

				agingRec.setFieldValue('custrecord_stagecurrent_age',currentAge);
			}			
		}
		else if( documentStatus == 'D_Opprtnty'  && oppStatus == '0 Lead - Unqualified') //Opportunity is Lost with Unqualified status
		{
			tempDate = agingRec.getFieldValue('custrecord_stage1_date');
			if(tempDate != null && tempDate != '') 
			{
				previousDate = currentDate;
				previousStage = currentStage;

				currentDate = tempDate;
				currentStage = oppStatus;

				//CH#2013_UPDATES - start
				if(tempFlag==false) {//this is the only stage for the opportunity
					previousDate = currentDate;
					previousStage = currentStage;	
					lastStageIndex = 1;
				}
				//CH#2013_UPDATES - end
				
				//populate previous stage age
				previousAge = dateDiff(currentDate,previousDate);
				agingRec.setFieldValue('custrecord_stage'+parseInt(lastStageIndex)+'_age',previousAge);

				//populate fields for the current stage
				agingRec.setFieldValue('custrecord_stage1_age',currentAge);
				agingRec.setFieldValue('custrecord_stage1_amount',amountBase);
				agingRec.setFieldValue('custrecord_stage1_amountusd',amountSub);
				agingRec.setFieldValue('custrecord_stage1_exp_close',expCloseDate);

				agingRec.setFieldValue('custrecord_stagecurrent_age',currentAge);
			}			
		} 

		else if(documentStatus == 'C_Opprtnty' || (documentStatus == 'B_Opprtnty' && oppStatus == '5 Committed') ) //Opportunity is Closed - Won
		{
			tempDate = agingRec.getFieldValue('custrecord_stage20_date');
			if(tempDate != null && tempDate != '') 
			{
				previousDate = currentDate;
				previousStage = currentStage;

				currentDate = tempDate;
				currentStage = oppStatus;

				//CH#2013_UPDATES - start
				if(tempFlag==false) {//this is the only stage for the opportunity
					previousDate = currentDate;
					previousStage = currentStage;	
					lastStageIndex = 20;
				}
				//CH#2013_UPDATES - end
				
				//populate previous stage age
				previousAge = dateDiff(currentDate,previousDate);
				agingRec.setFieldValue('custrecord_stage'+parseInt(lastStageIndex)+'_age',previousAge);//Resolved - BUG BUG BUG for single stage data - should get resolved now

				//populate fields for the current stage
				agingRec.setFieldValue('custrecord_stage20_age',currentAge);
				agingRec.setFieldValue('custrecord_stage20_amount',amountBase);
				agingRec.setFieldValue('custrecord_stage20_amountusd',amountSub);
				agingRec.setFieldValue('custrecord_stage20_exp_close',expCloseDate);

				agingRec.setFieldValue('custrecord_stagecurrent_age',currentAge);
			}			
		}

		agingRec.setFieldValue('custrecord_stageprevious_date',previousDate);
		agingRec.setFieldText('custrecord_stageprevious',previousStage);
		agingRec.setFieldValue('custrecord_stageprevious_age',previousAge);

		agingRec.setFieldValue('custrecord_stagecurrent_date',currentDate);
		agingRec.setFieldText('custrecord_stagecurrent',currentStage);
		
		agingRec.setFieldValue('custrecord_temp_updated','T');  
		nlapiSubmitRecord(agingRec);
	}//end for
}

function dateDiff(endDt,startDt) {
	date1 = new Date();
	date2 = new Date();
	diff  = new Date();

	if(endDt == null || endDt =='' || startDt == null || startDt =='') {
		return 0;
	}
	
	date1temp = nlapiStringToDate(endDt);
	date1.setTime(date1temp.getTime());

    //alert('date1 '+date1);

	date2temp = nlapiStringToDate(startDt);
	date2.setTime(date2temp.getTime());

    //alert('date2 '+date2);

	var tempDiff = date1.getTime() - date2.getTime();
	if(tempDiff < 0)
	{
		return -1;
	}
	// sets difference date to difference of first date and second date

	diff.setTime(Math.abs(date1.getTime() - date2.getTime()));

	timediff = diff.getTime();

	days = Math.round(timediff / (1000 * 60 * 60 * 24));

	return days;
}
function getnumber(id)
{
	var ret;
	ret = parseFloat(id);
	if(isNaN(ret))
	{
		ret = 1;//CH#2013_UPDATES
	}
	return ret;

}// getnumber