/**
 * Copyright (c) 2020
 * AppWrap LLC
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of AppWrap LLC. ('Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with AppWrap LLC.
 *
 * Script Name: AppWrap_MR_ProRatedInvoiceCMjs
 *
 * Script Description:
 * Creates Prorated Invoice and CM
 *
 *     |---------------------------------------------------------------------------------------------------------------------------------------|
 *     | Author                      | Date          | Version       | Comments                                                                |
 *     |-----------------------------|---------------|---------------|-------------------------------------------------------------------------|
 *     | M.smith                     | Nov 2020  	 | 1.0           | Initial Version                                                         |
 *     |---------------------------------------------------------------------------------------------------------------------------------------|
 *
 */

/**
 * @NModuleScope Public
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/error', "./UtilityBelt_ProRatedInvoice.js", "./UtilityMR_ProRatedInvoice.js"], function(record, search, runtime, error, utility, mr){

	var LOG_TITLE='MapReduceMassProRatedInvoice';
	var EndPoint = {};

	var objNoDays = {
		"_month" : 31,
		"_prorated" : 2
	};

	var ObjFields = {};
	ObjFields.proratedInv = 'custbody_aw_pro_trans';
	ObjFields.sourceProInv = 'custbody_aw_pro_src_inv';
	ObjFields.errorFld = 'custbody_aw_pro_error';

	var ObjParam = {};
	ObjParam.ss = 'custscript_aw_pro_ss';
	ObjParam.invDate = 'custscript_aw_pro_invdate';
	ObjParam.invPd = 'custscript_aw_pro_invpd';
	ObjParam.cmDate = 'custscript_aw_pro_cmdate';
	ObjParam.cmPd = 'custscript_aw_pro_cmpd';
	ObjParam.taxable = 'custscript_aw_pro_taxable';
	ObjParam.defaultValMap = 'custscript_aw_pro_def_map';
	ObjParam.docNoSuffix = 'custscript_aw_pro_docno_suffix';
	ObjParam.scriptResultRecipients = 'custscript_aw_pro_recipients';

	var ObjErrorMsgs = {};
	ObjErrorMsgs.total = "PRO-RATED INVOICE TOTAL ERROR ::: ";
	ObjErrorMsgs.inv = "INVOICE ERROR ::: ";
	ObjErrorMsgs.cm= "CM ERROR ::: ";


	EndPoint.getInputData = function (){

		var stLogTitle = LOG_TITLE + '::getInputData';
		log.debug(stLogTitle, '*** START ***');

		var ObjParamVal =  getParamVal(ObjParam);
		log.debug(stLogTitle, ObjParamVal);

		var currentScript = runtime.getCurrentScript();

		//Get Main Search
		var searchObj = search.load({id:ObjParamVal[ObjParam.ss]});
		var arrFilters = searchObj.filters;
		var arrColumns = searchObj.columns;

		return search.create({
			type: searchObj.searchType,
			filters: arrFilters,
			columns: arrColumns
		});

	}


	EndPoint.map = function ( context ){

		var stLogTitle = LOG_TITLE + '::map';

		var ObjParamVal =  getParamVal(ObjParam);

		log.debug(stLogTitle, '>> value:: ' + JSON.stringify(context.value));
		log.debug(stLogTitle, '>> key:: ' + JSON.stringify(context.key));

		var contextValue = JSON.parse( context.value );

		var obj = {};
		obj.stRecType = contextValue.recordType;
		obj.stId = contextValue.id;
		obj.flTotal = utility.forceFloat( contextValue.values['netamountnotax']);
		obj.stTranId = contextValue.values['tranid'];

		//create Invoice with prorated amount based on formula
		var objSubmitFlds = {};
		objSubmitFlds[ObjFields.errorFld] = '';
		objSubmitFlds[ObjFields.proratedInv] = [];
		try
		{
			var stProratedInvId = createProratedInvoice(obj, ObjParamVal);
		}
		catch(e)
		{
			objSubmitFlds[ObjFields.errorFld] += ObjErrorMsgs.inv + JSON.stringify(e);
		}

		//create Credit Memo from the prorated invoice
		if(stProratedInvId)
		{
			objSubmitFlds[ObjFields.proratedInv].push(stProratedInvId);

			try
			{
				var stCreditMemoId = createCMFromProRatedInv(stProratedInvId, ObjParamVal);
			}
			catch(e)
			{
				objSubmitFlds[ObjFields.errorFld] += ObjErrorMsgs.cm + JSON.stringify(e);
			}

			if(stCreditMemoId)
			{
				objSubmitFlds[ObjFields.proratedInv].push(stCreditMemoId);
			}
		}

		if(objSubmitFlds[ObjFields.errorFld])
		{
			log.error(stLogTitle, 'PROCESS ERROR ::: '  + objSubmitFlds[ObjFields.errorFld]);
		}

		updateSrcInv(obj, objSubmitFlds);

		context.write('PROCESSED', 'Soruce Inv =' + obj.stId +  ' Result:: '+JSON.stringify(objSubmitFlds));
	}



	EndPoint.summarize = function(summary){


		var stLogTitle = '::summarize::';

		var ObjParamVal =  getParamVal(ObjParam);

		var arrIds = [];
		log.debug(stLogTitle, 'summary '+JSON.stringify(summary));

		summary.output.iterator().each(function (key, value)
		{
			log.debug(stLogTitle, 'key '+key);
			log.debug(stLogTitle, 'value '+value);
			if(value){
				arrIds = arrIds.concat(value);
			}
			return true;
		});

		log.debug(stLogTitle, 'arrIds '+arrIds);

		var obj ={};
		obj.arrIds = arrIds;
		obj.scriptid = runtime.getCurrentScript().id;

		var currentScript = runtime.getCurrentScript();
		obj.recipients = ObjParamVal[ObjParam.scriptResultRecipients];

		if(!obj.recipients)
		{
			var objUser = runtime.getCurrentUser();
			obj.recipients = objUser.email;
		} else {
			obj.recipients = obj.recipients.replace(/ /g, ";").split(',');
		}

		if(arrIds.length  > 0){
			mr.sendSuccessEmail(obj);
		}

		mr.summaryError(summary, obj);


	};

	function createProratedInvoice(obj, ObjParamVal){

		var stLogTitle = 'createProratedInvoice';

		log.debug(stLogTitle, 'obj '+JSON.stringify(obj) + ' ObjParamVal'+JSON.stringify(ObjParamVal));

		var intNoOfDays = daysInMonth(ObjParamVal[ObjParamVal[ObjParam.invDate]]);
		log.debug(stLogTitle, 'intNoOfDays' + intNoOfDays);

		var recCopy = record.copy({
			type: obj.stRecType,
			id: obj.stId,
			isDynamic: false
		});

		recCopy.setValue('tranid', obj.stTranId  + ObjParamVal[ObjParam.docNoSuffix]);
		recCopy.setValue('trandate', new Date(ObjParamVal[ObjParam.invDate]));
		recCopy.setValue('postingperiod', ObjParamVal[ObjParam.invPd]);
        recCopy.setValue('istaxable', ObjParamVal[ObjParam.taxable]);
		recCopy.setValue(ObjFields.sourceProInv, obj.stId);

		if(ObjParamVal[ObjParam.defaultValMap]){
			var objMap = JSON.parse(ObjParamVal[ObjParam.defaultValMap]);
			for(var i in objMap){
				recCopy.setValue(i, objMap[i]);
			}
		}

		var sublistCount = recCopy.getLineCount('item');

		for (var i = 0; i < sublistCount; i++)
		{
			var stItemType = recCopy.getSublistValue({
				sublistId: 'item',
				line: i,
				fieldId: 'itemtype'
			});

			if(stItemType == 'EndGroup') continue;

			var flQty = utility.forceFloat(recCopy.getSublistValue({
				sublistId: 'item',
				line: i,
				fieldId: 'quantity'
			}));

			var flNewQty = computeProratedQty(flQty, objNoDays._month, objNoDays._prorated);
			log.debug(stLogTitle, 'line ' + i  + ' old qty flQty  '+ flQty + ' prorated qty '+ flNewQty);

			recCopy.setSublistValue({
				sublistId: 'item',
				fieldId: 'quantity' ,
				line: i,
				value : flNewQty
			});

		}

		//validate total
		var flCopysTotal = recCopy.getValue("subtotal");
		if(flCopysTotal != obj.flTotal){
			var stERR = ObjErrorMsgs.total + ["Src Total = "+obj.flTotal , "Prorated Total = "+flCopysTotal, "Difference ="+(obj.flTotal-flCopysTotal)];
			recCopy.setValue(ObjFields.errorFld, stERR);
			log.debug(stLogTitle, stERR);
		}

		var stProRatedInv = recCopy.save({
			enableSourcing : true,
			ignoreMandatoryFields : true
		});

		log.audit(stLogTitle, 'Created ProRated Inv = '+stProRatedInv);

		return stProRatedInv;

	}


	function createCMFromProRatedInv(stInvId, ObjParamVal){

		var stLogTitle = 'createCMFromProRatedInv';

		var recCM = record.transform({
			fromType: record.Type.INVOICE,
			fromId: stInvId,
			toType: record.Type.CREDIT_MEMO,
		});

		recCM.setValue('trandate', new Date(ObjParamVal[ObjParam.cmDate]));
		recCM.setValue('postingperiod', ObjParamVal[ObjParam.cmPd]);

		var stCM = recCM.save({
			enableSourcing : true,
			ignoreMandatoryFields : true
		});

		log.audit(stLogTitle, 'Created CM = '+ stCM);

		return stCM;
	}

	function updateSrcInv(obj, objFields)
	{

		var stLogTitle = 'updateSrcInv';

		log.audit(stLogTitle, 'objFields = '+ JSON.stringify(objFields));
		try
		{
			var stId = record.submitFields({
				type: obj.stRecType,
				id:  obj.stId,
				values : objFields
			});
			log.audit(stLogTitle, 'Updated = '+ obj.stId);
		}
		catch(e)
		{
			log.error(stLogTitle, '!!!!!!! SUBMIT FIELDS ERROR !!!!!!! = '+ JSON.stringify(e));
		}
	}

	function computeProratedQty(flQty, noOfDaysMonth, noOfProratedDays){
		return  (flQty * (noOfProratedDays/noOfDaysMonth))
	}


    /**
	function daysInMonth(stDate) {

		if(!stDate)   return objNoDays._month;

		return new Date((new Date(stDate)).getFullYear(),
			anyDateInMonth.getMonth()+1,
			0).getDate();
	}
    */

 	 function daysInMonth(stDate) {

		return objNoDays._month;

	}

	function getParamVal(objParam)
	{
		var ObjParamVal =  {};
		var currentScript = runtime.getCurrentScript();
		for(var i in objParam)
		{
			ObjParamVal[objParam[i]] = currentScript.getParameter({name: objParam[i]});
		}

		return ObjParamVal;
	}

	return EndPoint;
});