/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
* @ FILENAME      : kana_aging_script.js
* @ AUTHOR        : Upaya
* @ DATE          : 2008/12/28
*
* Copyright (c) 2007-2009 Upaya - The Solution Inc. 
* 10530 N. Portal Avenue, Cupertino CA 95014
* All Rights Reserved.
*
* This software is the confidential and proprietary information of 
* Upaya - The Solution Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with Upaya.
*
Change History
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2011
Author		: Sagar Shah
Date		: 01/04/2011
Description	: Implement new Sales Stages suggested by Chip
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Implement new Sales Stages for 2012
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#CHANGE_OPPDATE
Author		: Sagar Shah
Date		: 07/31/2012
Description	: Change the code such that the system takes today's date as status change date instead of transaction date
			  This would avoid generation of negative age value.
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012_NOV
Author		: Sagar Shah
Date		: 11/01/2012
Description	: Implement new Sales Stages suggested by Jim Bureau
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


var fx = 'kana_aging';

//CH#NEW_STAGE_2012 - start
//var status = new Array(33,19,20,21,22,23,24,25,26,27,29,30);
//var status0 = new Array(17,7,6);
//var status20 = new Array(31,32,18);

//var status = new Array(33,34,20,21,22,23,24,25,26,27,29,30);//19 replaced by 34
//var status0 = new Array(17,7,6); 
//var status20 = new Array(31,32,18);
//CH#NEW_STAGE_2012 - end

//CH#NEW_STAGE_2011 - start
var oldStatus = new Array(19,20,21,22,24,25);
//Stage ids not in use : 19, 20, 21, 22, 24, 25
//'status' array index : 2,3,4,5,7,8
//CH#NEW_STAGE_2011 - end

//CH#NEW_STAGE_2012_NOV - start
var statusSequence = new Array(33,34,20,21,22,23,24,25,26,27,35,36,37,29,38,30);//This is needed to determine higher stage in fn 'gethigher'
var status = new Array(33,34,20,21,22,23,24,25,26,27,29,30,35,36,37,38);//added 35,36,37 and 38
var status0 = new Array(17,7,6); 
var status20 = new Array(31,32,18);
var sNetsuiteEmailId = 16921; //appscriptnotification@kana.com

//CH#NEW_STAGE_2012_NOV - end

//CH#NEW_STAGE_2011 - start
function isOldStatus(stat)
{
	for(var k=0; k < oldStatus.length; k++)
	{
		if(stat == oldStatus[k])
			return true;
	}
	return false;
}
//CH#NEW_STAGE_2011 - end

function onSubmit(type)
{
	var currentRecord;
	var oldRecord;	
	var cstage;
	var ostage;
	var prevhigh;
	var amt;
	
	try
	{

	nlapiLogExecution('DEBUG', fx + ' 100', type);

   	if ( type == 'create' || type == 'edit'|| type == 'copy'|| type == 'xedit')
   	{
		nlapiLogExecution('DEBUG', fx + ' 100', 'Begin');

		currentRecord = nlapiGetNewRecord();
		cstage = currentRecord.getFieldValue('entitystatus');
		amt = getnumber(currentRecord.getFieldValue('projectedtotal'));
		nlapiLogExecution('DEBUG', fx + ' 200', 'Stage Setting: ' + cstage);

		//Highest Stage & Previous Stage
		if(type == 'edit'|| type == 'xedit')
		{
			oldRecord = nlapiGetOldRecord();
			ostage = oldRecord.getFieldValue('entitystatus');

			nlapiLogExecution('DEBUG', fx + ' 220', 'Old Stage: ' + ostage);

			// Workaround for edit
			if(type == 'xedit')
			{
				if(!cstage)
				{
					nlapiLogExecution('DEBUG', fx + ' 225', 'xedit but sales stage not changed');
					cstage = ostage;
				}
				else
				{
					if(amt == 0) {getnumber(oldRecord.getFieldValue('projectedtotal')); }
				}
			} //xedit
 
			if(ostage != cstage)
			{	
				//Highest Stage
				prevhigh = oldRecord.getFieldValue('custbody_highest_stage');
				nlapiLogExecution('DEBUG', fx + ' 250', 'Previous High: ' + prevhigh);			

				if(prevhigh)
				{
					currentRecord.setFieldValue('custbody_highest_stage', gethigher(cstage,prevhigh));
				}
				else
				{
					//highest stage was blank so set the current one
					currentRecord.setFieldValue('custbody_highest_stage', cstage);
				} //highest stage

			} // Stage Changed						

			//Regression
			if(amt < getnumber(oldRecord.getFieldValue('projectedtotal')))
			{
				currentRecord.setFieldValue('custbody_regression_flag', 'T');
				currentRecord.setFieldValue('custbody_regression_history', 'T');
			}
			if(amt > getnumber(oldRecord.getFieldValue('projectedtotal')))
			{
				currentRecord.setFieldValue('custbody_regression_flag', 'F');
			}
		} //edit
		else
		{
			currentRecord.setFieldValue('custbody_previous_stage', cstage);
			currentRecord.setFieldValue('custbody_highest_stage', cstage);

		} // else edit

	} // if type
	} // try
	catch(e)
	{
			var errorText='';
            if ( e instanceof nlobjError )
				errorText = e.getCode() + '\n' + e.getDetails();
            else
				errorText = e.toString();

			nlapiLogExecution( 'ERROR', fx + ' unexpected error', errorText);
			nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
	} //catch
} //end


function gethigher(id, high)
{
	var retval = high;
	var curr = 0;
	var new1 = 0;
	var i;

	//CH#NEW_STAGE_2011 - start	
	if(isOldStatus(high))
		return id;
	//CH#NEW_STAGE_2011 - end

	//CH#NEW_STAGE_2012_NOV - start
	//Use statusSequence instead of status array
	for (i = 0; statusSequence != null && i < statusSequence.length; i++ )
	{
		if(id == statusSequence[i])
		{
			new1 = i;
		}

		if(high == statusSequence[i])
		{
			curr = i;
		}		
	}
	//CH#NEW_STAGE_2012_NOV - end

	if(new1 > curr)
	{
		retval = id;
	}
	
	return retval;
}

function getstage(id)
{
	var retval = -1;
	var i;

	for (i = 0; status0 != null && i < status0.length; i++ )
	{
		if(id == status0[i]) { return 0; }
	} //status 0 compare

	for (i = 0; status20 != null && i < status20.length; i++ )
	{
		if(id == status20[i]) { return 20;}
	} //status 10 compare

	for (i = 0; status != null && i < status.length; i++ )
	{
		if(id == status[i]) { return (i + 1); }
	} //status compare

	return retval;
}

function afterSubmit(type)
{
	var currentRecord;
	var oldRecord;	
	var cstage;
	var ostage;
	var oppid;
	var oppdate;
	var stageid;
	var stageage;
	
	var expclose;
	var amt;
	var rate;
	var conv;

	fx = 'kana_opp_aftersubmit';

	var crec;
	var id;

	var fields = new Array();
	var values = new Array();
	var ctr = 0;

	try
	{
	   	if ( type == 'create' || type == 'edit'|| type == 'xedit')
   		{
			nlapiLogExecution('DEBUG', fx + ' 100', 'Begin');

			currentRecord = nlapiGetNewRecord();
			oppid = currentRecord.getId();
			cstage = currentRecord.getFieldValue('entitystatus');
			//CH#CHANGE_OPPDATE
			oppdate = nlapiDateToString(new Date());			
			//oppdate = currentRecord.getFieldValue('trandate');
			
			rate = parseFloat(currentRecord.getFieldValue('exchangerate'));
			if(isNaN(rate)) { rate = 1;} 
			expclose = currentRecord.getFieldValue('expectedclosedate');
			amt = getnumber(currentRecord.getFieldValue('projectedtotal'));

			if(type == 'create')
			{
				// Create the custom record
				crec = nlapiCreateRecord('customrecord_opp_stages');
				crec.setFieldValue('custrecord_opp_id', oppid);
				crec.setFieldValue('custrecord_stagecurrent', cstage);
				crec.setFieldValue('custrecord_stagecurrent_date', oppdate);
				crec.setFieldValue('custrecord_stageprevious', cstage);
				crec.setFieldValue('custrecord_stageprevious_date', oppdate);
				crec.setFieldValue('custrecord_stagecurrent_age', 0);	
				crec.setFieldValue('custrecord_stageprevious_age', 0);		
				conv = rate * amt;
				
				stageid = getstage(cstage);
				nlapiLogExecution('DEBUG', fx + ' 200', 'Stage #: ' + stageid);

				//CH#NEW_STAGE_2012_NOV - start
					//removed the redundant switch statement
				crec.setFieldValue('custrecord_stage'+stageid+'_date', oppdate);
				crec.setFieldValue('custrecord_stage'+stageid+'_age', 0);
				crec.setFieldValue('custrecord_stage'+stageid+'_amount', amt.toFixed(2));
				crec.setFieldValue('custrecord_stage'+stageid+'_exp_close', expclose);
				crec.setFieldValue('custrecord_stage'+stageid+'_amountusd', conv.toFixed(2));
				//CH#NEW_STAGE_2012_NOV - end
				
				id = nlapiSubmitRecord(crec, true);
				nlapiLogExecution('DEBUG', fx + ' 250', 'Stage Record Created: ' + id);

			} // if create
			else //edit
			{
				oldRecord = nlapiGetOldRecord();
				ostage = oldRecord.getFieldValue('entitystatus');
				nlapiLogExecution('DEBUG', fx + ' 300', 'Old Stage: ' + ostage);

				var todaytemp = new Date();
				oppdate = nlapiDateToString(todaytemp);

				if(type == 'xedit')
				{
					if(!cstage)
					{
						nlapiLogExecution('DEBUG', fx + ' 305', 'xedit but sales stage not changed');
						return;
					}
					else
					{
						//get amt, rate, expclose
						if(amt == 0) {getnumber(oldRecord.getFieldValue('projectedtotal')); }
						if(rate == 1) 
						{
							rate = parseFloat(oldRecord.getFieldValue('exchangerate'));
							if(isNaN(rate)) {rate = 1;}
						}
						if(!expclose) { expclose = oldRecord.getFieldValue('expectedclosedate'); }
					} //else cstage
				} //xedit
				
				if(ostage == cstage)
				{				
					return;
				}

				conv = rate * amt;
				crec = findstagerec(oppid);
				if(crec == null) //CH#NEW_STAGE_2012_NOV
				{
					return;//Not Found
				}
				else
				{
					fields[ctr] = 'custrecord_stage_stalled';
					values[ctr] = 'F';
					ctr++;

					fields[ctr] = 'custrecord_stagecurrent';
					values[ctr] = cstage;
					ctr++;

					fields[ctr] = 'custrecord_stagecurrent_date';
					values[ctr] = oppdate;
					ctr++;
								
					fields[ctr] = 'custrecord_stageprevious';
					values[ctr] = ostage;
					ctr++;

					// Prev Stage
					stageid = getstage(ostage);
					nlapiLogExecution('DEBUG', fx + ' 320', 'Old Stage #: ' + stageid);

					//CH#NEW_STAGE_2012_NOV - start
					//removed the redundant switch statement
					fields[ctr] = 'custrecord_stageprevious_date';
					values[ctr] = crec.getFieldValue('custrecord_stage'+stageid+'_date');
					ctr++;

					stageage = findstageage(crec.getFieldValue('custrecord_stage'+stageid+'_date'), oppdate);
					fields[ctr] = 'custrecord_stage'+stageid+'_age';
					values[ctr] = stageage;
					ctr++;

					fields[ctr] = 'custrecord_stageprevious_age';
					values[ctr] = stageage;
					ctr++;

				//CH#NEW_STAGE_2012_NOV - end

					// New Stage
					stageid = getstage(cstage);
					nlapiLogExecution('DEBUG', fx + ' 360', 'New Stage #: ' + stageid);
				
				//CH#NEW_STAGE_2012_NOV - start
			   //removed the redundant switch statement
				fields[ctr] = 'custrecord_stage'+stageid+'_date';
				values[ctr] = oppdate;
				ctr++;
				
				fields[ctr] = 'custrecord_stage'+stageid+'_age';
				values[ctr] = 0;
				ctr++;

				fields[ctr] = 'custrecord_stagecurrent_age';
				values[ctr] = 0;
				ctr++;

				fields[ctr] = 'custrecord_stage'+stageid+'_amount';
				values[ctr] = amt.toFixed(2);
				ctr++;

				fields[ctr] = 'custrecord_stage'+stageid+'_exp_close';
				values[ctr] = expclose;
				ctr++;
				
				fields[ctr] = 'custrecord_stage'+stageid+'_amountusd';
				values[ctr] = conv.toFixed(2);
				ctr++;		
				//CH#NEW_STAGE_2012_NOV - end				

					nlapiSubmitField('customrecord_opp_stages', crec.getId(), fields, values);

				} // else stage rec found	
			} // else edit
		}// if type
	} // try
	catch(e)
	{
			var errorText='';
            if ( e instanceof nlobjError )
				errorText = e.getCode() + '\n' + e.getDetails();
            else
				errorText = e.toString();

			nlapiLogExecution( 'ERROR', fx + ' unexpected error', errorText);
			nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
	} //catch
} //end


function findstagerec(oppid)
{
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecord_opp_id', null, 'anyof', oppid, null);
	filters[1] = new nlobjSearchFilter( 'isinactive', null, 'anyof', 'F', null);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	//CH#NEW_STAGE_2012_NOV - start
	//removed redundant code
	var searchresults = nlapiSearchRecord( 'customrecord_opp_stages', null, filters, columns);
	
	if(searchresults)
	{ 
		return nlapiLoadRecord('customrecord_opp_stages', searchresults[0].getValue('internalid'));
	}
	
	return null;	
	//CH#NEW_STAGE_2012_NOV - end

} // end findstagerec

function findstageage(date1, date2)
{
	var diff = 0;
	
	if(date1 && date2)
	{
		var d1 = nlapiStringToDate(date1);
		var d2 = nlapiStringToDate(date2);
	
		nlapiLogExecution('DEBUG', fx + ' 350', 'D1: ' + date1 + ', D2: ' + date2);
		nlapiLogExecution('DEBUG', fx + ' 360', 'D1: ' + d1 + ', D2: ' + d2);
	
		var day = 1000*60*60*24;
		diff = Math.round((d2.getTime() - d1.getTime())/(day));	

		nlapiLogExecution('DEBUG', fx + ' 350', 'Date 1: ' + d1 + ', Date 2: ' + d2 + ', Date Diff #: ' + diff);
	}

	return diff;
	
}

function getnumber(id)
{
	var ret;
	ret = parseFloat(id);
	if(isNaN(ret))
	{
		ret = 0;
	}
	return ret;

}// getnumber