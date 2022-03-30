/**
 * Scheduled Script to calculate NPS based on Overall Recommendation Survey.
 * Assumption:
 * 1. Period Month and Year is based on Survey Created Date. 
 * 2. Period Date will always be first day of Period Month and Period year.
 * 
 * Version    Date            Author           Remarks
 * 1.00       Nov 25 2015     AnJoe
 *
 */

var ctx = nlapiGetContext();
//custscript_customdate_calcnps
var customNpsDate = ctx.getSetting('SCRIPT','custscript_sb67_customdate');
var curDate = new Date();
if (customNpsDate) 
{
	curDate = new Date(customNpsDate);
}

function calcLrsNps(type) 
{
	var curPeriodMonth = curDate.getMonth()+1;
	var curPeriodYear = curDate.getFullYear();
	//String value of period date. 
	//This value is stored as period date object as well as used as search parameter
	var perioddobj = new Date(curPeriodMonth+'/1/'+curPeriodYear);
	//To be safe and match account date format
	var strPeriodDate = nlapiDateToString(perioddobj);
	//grab end date by adding 1 month to first day of period date and subtracking 1 day. This will give last day of period month/year
	var strSurveyEndDate = nlapiDateToString(nlapiAddDays(nlapiAddMonths(perioddobj, 1), -1));
	
	//var Period related NPS record ID
	var pnpsRecId = '';
	
	log('debug','start/end',strPeriodDate+' to '+strSurveyEndDate);
	
	try 
	{
		//1. Execute search that summarizes all data by survey type for THIS period.
		
		var defactorCol = new nlobjSearchColumn('formulanumeric', null, 'sum'),
			passiveCol = new nlobjSearchColumn('formulanumeric', null, 'sum'),
			promoterCol = new nlobjSearchColumn('formulanumeric', null, 'sum');
		
		defactorCol.setFormula('case when {custrecord_srvy_recommend} < 7 then 1 else 0 end');
		passiveCol.setFormula('case when {custrecord_srvy_recommend}=8 or {custrecord_srvy_recommend}=7  then 1 else 0 end');
		promoterCol.setFormula('case when {custrecord_srvy_recommend} > 8 then 1 else 0 end');
		
		var initflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
		               new nlobjSearchFilter('created', null, 'within', strPeriodDate, strSurveyEndDate)],
		    
		    initcol = [new nlobjSearchColumn('custrecord_srvy_type', null, 'group'),
		               new nlobjSearchColumn('internalid', null, 'count'),
		               defactorCol,
		               passiveCol,
		               promoterCol],
		    initrs = nlapiSearchRecord('customrecord_adx_recommendationsurvey', null, initflt, initcol),
		    uniqueSurveyTypes = [],
		    existNpsJson = {};
		
		//Quickly go through and build list of unique survey types 
		for (var i=0; initrs && i < initrs.length; i+=1)
		{
			uniqueSurveyTypes.push(initrs[i].getValue('custrecord_srvy_type', null, 'group'));
		}
		
		if (uniqueSurveyTypes.length > 0)
		{
			var npsflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_axnps_pdate', null, 'on', strPeriodDate),
			              new nlobjSearchFilter('custrecord_axnps_surveytype', null, 'anyof', uniqueSurveyTypes)],
				npscol = [new nlobjSearchColumn('internalid'),
			              new nlobjSearchColumn('custrecord_axnps_surveytype')],
			    npsrs = nlapiSearchRecord('customrecord_ax_npsscore', null, npsflt, npscol);
			
			for (var n=0; npsrs && n < npsrs.length; n+=1)
			{
				var npsSurveyType = npsrs[n].getValue('custrecord_axnps_surveytype'),
					npsId = npsrs[n].getValue('internalid');
				
				if (existNpsJson[npsSurveyType])
				{
					existNpsJson[npsSurveyType] = '';
				}
				existNpsJson[npsSurveyType] = npsId;
			}
		}
		
		
		//Loop through each Survey Type and create/update matching Period NPS Record
		for (var i=0; initrs && i < initrs.length; i+=1)
		{
			var surveyType = initrs[i].getValue('custrecord_srvy_type', null, 'group'),
				totalCount = initrs[i].getValue('internalid', null, 'count'),
				defactorCount = initrs[i].getValue(defactorCol), //below 7
				passiveCount = initrs[i].getValue(passiveCol),	//8 or 7
				promoterCount = initrs[i].getValue(promoterCol), //above 8
				npsCalcVal = 0;
				npsFormula = '',
				npsRec = null;
			
			if (existNpsJson[surveyType])
			{
				npsRec = nlapiLoadRecord('customrecord_ax_npsscore',existNpsJson[surveyType]);
			}
			else
			{
				npsRec = nlapiCreateRecord('customrecord_ax_npsscore');
				npsRec.setFieldValue('custrecord_axnps_pmonth', curPeriodMonth);
				npsRec.setFieldValue('custrecord_axnps_pyear', curPeriodYear);
				npsRec.setFieldValue('custrecord_axnps_pdate', strPeriodDate);
				npsRec.setFieldValue('custrecord_axnps_surveytype', surveyType);
			}

			npsCalcVal = ((parseInt(promoterCount) - parseInt(defactorCount))/parseInt(totalCount)) * 100;
			
			log(
				'debug',
				surveyType+' // '+strPeriodDate+' to '+strSurveyEndDate+' nps formula',
				'(('+promoterCount+' - '+defactorCount+')/'+totalCount+') * 100'
			);
			
			npsFormula = '(('+promoterCount+' - '+defactorCount+')/'+totalCount+') * 100';
			
			npsRec.setFieldValue('custrecord_axnps_total_submission',totalCount);
			npsRec.setFieldValue('custrecord_axnps_total_below7',defactorCount);
			npsRec.setFieldValue('custrecord_axnps_total_passive',passiveCount);
			npsRec.setFieldValue('custrecord_axnps_total_above8',promoterCount);
			npsRec.setFieldValue('custrecord_axnps_pscore',npsCalcVal);
			npsRec.setFieldValue('custrecord_axnps_calc_formula',npsFormula);
			
			nlapiSubmitRecord(npsRec, true, true);
			
			log('debug','update/created','Done processing '+surveyType+' // '+strPeriodDate);
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / initrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
		}
		
		
	} catch (npserr) {
		log('error','Error processing',getErrText(npserr));
		throw nlapiCreateError('LRSNPSERR-001', getErrText(npserr), false);
	}
	
}
