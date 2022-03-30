/**
* Copyright (c) 1998-2015 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* This script contains user event script functions used in general advanced approval workflow
* 
* Version Type    Date            Author           Remarks
* 1.00    Create  06 Mar 2014     Russell Fulling
* 1.01    Edit    29 May 2014     Jaime Villafuerte III/Dennis Geronimo
* 1.02    Edit    2 Mar 2015      Rose Ann Ilagan
* 2.00    Edit    16 Mar 2015     Rachelle Barcelona
*/

//SUITELET
var SCRIPT_REJECT_SUITELET = 'customscript_nsts_gaw_reject_upd_sl';
var DEPLOY_REJECT_SUITELET = 'customdeploy_nsts_gaw_reject_upd_sl';



/**
* Before Load: NSTS | GAW - Set Cloaking Buttons
*              customscript_nsts_gaw_set_cloaking_btns
* Change buttons when cloaking is enabled
* @param {string type}
* @returns {Void} 
* @author Jaime Villafuerte
* @version 1.0
*/
function setCloakingButtonsBeforeLoad(type, form, request)
{
	var CUSTPAGE_SUBMIT_BTN 					= "custpage_nsts_gaw_clk_submit";
	var CUSTPAGE_SUBMIT_BTN_TXT  				= "Submit";
	var CUSTPAGE_APPROVE_BTN 					= "custpage_nsts_gaw_clk_approve";
	var CUSTPAGE_APPROVE_BTN_TXT  				= "Approve";
	var CUSTPAGE_REJECT_BTN 					= "custpage_nsts_gaw_clk_reject";
	var CUSTPAGE_REJECT_BTN_TXT 				= "Reject";
	var CUSTOMSCRIPT_NSTS_GAW_APVD_VALDXN_CS 	= 'customscript_nsts_gaw_apvd_valdxn_cs';
	try{
	    //set cloaking buttons
	    if(type == 'view'){	        
	        var stLogTitle = 'SETCLOAKINGBUTTONS';    
	        var currentContext = nlapiGetContext();
	        var isEnableCloaking = currentContext.getSetting("SCRIPT", SPARAM_ENABLE_CLOAK);
	        var stStatus = nlapiGetFieldValue('status');
	        var stVoided = nlapiGetFieldValue('voided');
	        if(stStatus){
	        	stStatus = stStatus.toLowerCase().trim();
	        }
	        var stTranStatus = nlapiGetFieldValue(FLD_APPROVAL_STATUS);
	       
	        var APPROVED = 2;
	        
	        if(stStatus!='cancelled' && stTranStatus!= HC_STATUS_APPROVED && stVoided != 'T')
	        {
	            form.setScript(CUSTOMSCRIPT_NSTS_GAW_APVD_VALDXN_CS);
	            
	            var arrApprover         = nlapiGetFieldValues(FLD_NXT_APPRVRS);
	            var stApproverRole     	= nlapiGetFieldValue(FLD_NXT_ROLE_APPRVRS);
	            var stCreateBy          = nlapiGetFieldValue(FLD_CREATED_BY);
	            var currentUser         = currentContext.getUser() + "";
	            var currentRole         = currentContext.getRole() + ""; 
	            var stRequestor			= null;
	            if(FLD_REQUESTOR)
	            	stRequestor			= nlapiGetFieldValue(FLD_REQUESTOR);    
	            
	            var arrWFCol = [new nlobjSearchColumn('currentstate','workflow'),
	                            new nlobjSearchColumn('workflow','workflow')];
	            var arrWFFil = [new nlobjSearchFilter('internalid',null,'anyof',nlapiGetRecordId())];
	            
	            var stType = nlapiGetRecordType();
	            if(stType){
	            	stType = stType.toLowerCase().trim();
	            	if(stType == 'intercompanyjournalentry')
	            		stType = 'journalentry'
	            }
	            var arrWFRes = nlapiSearchRecord(stType,null,arrWFFil,arrWFCol);
	            
	            if(!arrWFRes)
	            {
	                return;
	            }
				var stApprover 	= null
				
				if(checkMultiSelectLength(arrApprover) > 0)
					stApprover = currentUser;
				
	            var url =  nlapiResolveURL('SUITELET', SCRIPT_REJECT_SUITELET, DEPLOY_REJECT_SUITELET);
	                url += '&approverId='   + stApprover
	    			url	+= '&tranid='       + nlapiGetRecordId() 
	    			url	+= '&trantype='     + stType
	    			url	+= '&approverRole=' + stApproverRole
	    			url	+= '&idCreator='    + stCreateBy;
	                
	    		
	            for(var i=0; arrWFRes && i<arrWFRes.length; i++)
	            {
	                var stWFState 	= arrWFRes[i].getText('currentstate','workflow').trim().toLowerCase();
	                var stWF 		= arrWFRes[i].getText('workflow','workflow').trim().toUpperCase();
	                if(stWF){
		                if(stWF.indexOf('NSTS | GAW - APPROVAL') >= 0){
			                if(stWFState=='state 0: initial check' && isEnableCloaking == 'T')
			                {
			                    if ((stCreateBy==currentUser) || (stRequestor == currentUser) )
			                    {
			                        form.addButton(CUSTPAGE_SUBMIT_BTN, CUSTPAGE_SUBMIT_BTN_TXT, "processCloaking(HC_SUBMIT_ACTION);");
			                    	//form.addButton(CUSTPAGE_SUBMIT_BTN, CUSTPAGE_SUBMIT_BTN_TXT, "alert('submit');");
			                        break;
			                    }
			                }
			                else if(stWFState=='state 2: approver')
			                {
			                	if((((checkEmpApprover(currentUser,arrApprover))||
			                			(currentRole == stApproverRole)))) {
			                		form.addButton(CUSTPAGE_REJECT_BTN, CUSTPAGE_REJECT_BTN_TXT, "window.open('" + url + "', 'Reject', 'resizable=1,scrollbars=1,menubar=0,location=0,status=1,toolbar=0,width=1000,height=800');win.focus();");
			                        if(isEnableCloaking == 'T') 
			                        	//form.addButton(CUSTPAGE_APPROVE_BTN, CUSTPAGE_APPROVE_BTN_TXT, "alert('approve');");
			                        	form.addButton(CUSTPAGE_APPROVE_BTN, CUSTPAGE_APPROVE_BTN_TXT, "processCloaking(HC_APPROVE_ACTION);");		                		
			                        break;
			                	}
			                }
		                }
	                }
	            }  
	        }
	    }
	}catch(error){
		defineError('setCloakingButtonsBeforeLoad',error);
	}
}
/**
* After Submit: NSTS | GAW - Get JE Amt And CSVImport UE
* 				customscript_nsts_gaw_csv_import_ue
* Set Debit Total upon save on JE and validation on CSV Import of transactions
* @param {string type}
* @returns {Void} 
* @author Jaime Villafuerte
* @version 1.0
*/
function setJEAmountAndCSVImportAfterSubmit(type)
{

	if (type){
		type = type.toLowerCase();
	}
	
	
    var stVoided = nlapiGetFieldValue('voided');
	//Exit if not create and edit type
    if (!((type == 'create') || (type == 'edit')))
    {
        return;
    }
	if(stVoided == 'T')
		return;
    try{
    	//Set journal entry total debit amount in base currency and in transaction currency    	
    	var intRecordId = nlapiGetRecordId();

        
    	if((stTransRecordType == 'JOURNALENTRY')||(stTransRecordType == 'INTERCOMPANYJOURNALENTRY') && stVoided != 'T'){
            var flTotalDebit = null;
            //Search total debit amount of journal entry transaction
            var arrColumn = [new nlobjSearchColumn('debitamount',null,'SUM')];
            var arrFilter = [new nlobjSearchFilter('internalid', null, 'anyof', intRecordId),
                             new nlobjSearchFilter('mainline',null,'is','T')];        
            var arrTotal = nlapiSearchRecord(stTransRecordType, null, arrFilter,arrColumn);
            
            if(arrTotal){
            	flTotalDebit = arrTotal[0].getValue('debitamount', null, 'SUM');
                if(!flTotalDebit){
                	 //nlapiSubmitField(stTransRecordType, intRecordId, [FLD_TOTAL_DEBIT_AMT,FLD_TRANS_DEBIT_AMT], [0,0]);
                }
                else if (flTotalDebit){
                	flTotalDebit = parseFloat(flTotalDebit);
                    try{
                        var flTransDebitAmt = nlapiGetFieldValue(FLD_TRANS_DEBIT_AMT);
                        var flExcRate = nlapiGetFieldValue('exchangerate');
                        flExcRate = parseFloat(flExcRate);
                        var fTotalAmt = 0.00;
                        var lineNum= nlapiGetLineItemCount('line');
                        var debitLineAmt = 0;                    
                        lineNum = (lineNum) ? lineNum : 1; 
                   
                        for(var i=1; i<= lineNum; i++)
                        {
                        	debitLineAmt = nlapiGetLineItemValue('line', 'debit', i);
                            debitLineAmt = (debitLineAmt) ? parseFloat(debitLineAmt) : 0;            
                            fTotalAmt += debitLineAmt;            		
                        }
                        var total = 0;
                        var exchangeRate = nlapiGetFieldValue('exchangerate');//getExchangeRate(nlapiGetFieldValue('currency'), nlapiGetFieldValue('trandate'));
                        if(!exchangeRate){
                        	exchangeRate = 1;
                        
                        }
                        total = exchangeRate * fTotalAmt;
                        if (Math.abs(flTotalDebit - total) <= 1){
                        	total = flTotalDebit;
                        }
                        nlapiSubmitField(stTransRecordType, intRecordId, [FLD_TOTAL_DEBIT_AMT,FLD_TRANS_DEBIT_AMT], [total.toFixed(2),fTotalAmt.toFixed(2)]);
                    }catch(error){
						defineError('setJEAmountAndCSVImportAfterSubmit', error);
                    }
                }
            }
    	}
        
        //rbarcelona 03/20/2015 Initiate approval workflow upon csv import of transactions
        var executionContext = nlapiGetContext().getExecutionContext();
        if (type == 'create' && executionContext == 'csvimport'){
        	var stworkflow_id = null;
        	//set workflow id
            if(stTransRecordType == 'JOURNALENTRY' || stTransRecordType == 'PURCHASEORDER' || stTransRecordType == 'VENDORBILL' || stTransRecordType == 'EXPENSEREPORT' || stTransRecordType == 'PURCHASEREQUISITION') {
            	stworkflow_id = WFLW_GAW_POVBER;
            }
            else{
            	stworkflow_id = WFLW_GAW_SOJE;
            }

            //Get requestor field to set department of transaction then trigger workflow of PO, VB, ER, JE
            if(FLD_REQUESTOR)
            	var stRequestor = nlapiGetFieldValue(FLD_REQUESTOR);


            var stDepartment = '';
            if(stRequestor) {
                stDepartment = nlapiLookupField('employee', stRequestor, 'department');
            }

            if(stTransRecordType == 'PURCHASEORDER'){
                nlapiSubmitField(stTransRecordType, intRecordId, [FLD_APPROVAL_STATUS, 'department','employee'], ['1', stDepartment,stRequestor]);
            }
            else if(stTransRecordType == 'SALESORDER'){
                nlapiSubmitField(stTransRecordType, intRecordId, FLD_APPROVAL_STATUS, '1');                      
            }
            else if(stTransRecordType != 'JOURNALENTRY'){
                nlapiSubmitField(stTransRecordType, intRecordId, [FLD_APPROVAL_STATUS, 'department'], ['1', stDepartment]);           	
            }
            //Start workflow
            //var varMemo = nlapiGetFieldValue(FLD_NXT_ROLE_APPRVRS);
            nlapiInitiateWorkflow(stTransRecordType, intRecordId, stworkflow_id);
            if(stworkflow_id == WFLW_GAW_SOJE){
                var stRes = nlapiTriggerWorkflow(stTransRecordType, intRecordId, stworkflow_id, WACT_GAW_SUBMIT_BTN);
            }else{
                nlapiSubmitField(stTransRecordType, intRecordId, [FLD_NXT_ROLE_APPRVRS], [""]);
                
                var csvTrigUrl = nlapiResolveURL('SUITELET', 'customscript_nsts_gaw_csvtrigger_sl', 'customdeploy_nsts_gaw_csvtrigger_sl',true);
                var urlParam = '';
                urlParam += "&recordtype=" + stTransRecordType;
                urlParam += "&recordid=" + intRecordId;
                urlParam += "&workflowid=" + stworkflow_id;
                urlParam += "&workflowsubmitbutton=" + WACT_GAW_SUBMIT_BTN;
                csvTrigUrl += urlParam;                
                nlapiRequestURL(csvTrigUrl,null,null,"POST");
            }
        }
    }catch(error){
		defineError('setJEAmountAndCSVImportAfterSubmit', error);

    }
}

/**
* Before Load: NSTS | GAW - Prevent Edit On Approved
*              customscript_nsts_gaw_prev_edit_ue
* Prevent edit on approved transaction (PO/VB/ER/PR)
* @param {string type}
* @returns {Void} 
* @author Jaime Villafuerte
* @version 1.0
*/
function preventEditAndSetStatusBeforeLoad(type)
{				
	if (nlapiGetContext().getExecutionContext() != 'userinterface'){
		return;
	}
	//Set document status of JE and SO when make copy
	try{
		if ((stTransRecordType == 'JOURNALENTRY' || stTransRecordType == 'SALESORDER')){
			if(type == 'copy'){
				nlapiSetFieldValue('status', 'Pending Approval',false);
			}
			if(FLD_APPROVAL_STATUS != 'approvalstatus')//for 2016.2 accounts
				return;
		}
	}catch(error){
		defineError('preventEdit',error);
		return;
	}
	//Prevent edit on approved PO,VB and ER 
	if (type != 'edit'){
		return;
	}
	var stAppStatus = nlapiGetFieldValue(FLD_APPROVAL_STATUS);
	//if (stAppStatus == HC_STATUS_APPROVED){
	//	throw nlapiCreateError('Approval Error', 'This transaction is already approved and cannot be edited.', true);
	//}
}


/**
* Before Submit: NSTS | GAW - General Approval Validation
*                customscript_nsts_gaw_apprvl_validxn_ue
* Validate Approval rule group before submit
* @param {String} type Operation types: create, edit, delete, xedit
*                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
*                      pack, ship (IF)
*                      markcomplete (Call, Task)
*                      reassign (Case)
*                      editforecast (Opp, Estimate)
* @returns {Void} 
* @author Jaime Villafuerte
* @version 1.0
*/
function validateTransSetOrderStatBeforeSubmit(type)
{
    var currentContext = nlapiGetContext();
    var executionContext = currentContext.getExecutionContext();
    if (!(type == 'create' || type == 'edit')){
        return;
    }

    if (stTransRecordType == REC_RULE_GRP.toUpperCase()){
        var stSubsidiary = nlapiGetFieldValue(FLD_APP_RULE_GRP_SUBSD);
        var stTranTypeVal = nlapiGetFieldValue(FLD_APP_RULE_GRP_TRAN_TYPE);
        var stInternalidVal = nlapiGetFieldValue('id');
        var stIsInactiveVal = nlapiGetFieldValue(FLD_APP_RULE_GRP_IS_INACTIVE);
        
        if (isEmpty(stSubsidiary)){
            var compRec = nlapiLoadConfiguration("companyinformation");
            var stBasecurrency = compRec.getFieldValue("basecurrency");
            nlapiSetFieldValue(FLD_APP_RULE_GRP_DEF_CURR, stBasecurrency, false);
        }
        
		if(type == 'edit'){
			var recOld = nlapiGetOldRecord();
			var recNew = nlapiGetNewRecord();
			var stInactiveOld = recOld.getFieldValue(FLD_APP_RULE_GRP_IS_INACTIVE);
			var stInactiveNew = recNew.getFieldValue(FLD_APP_RULE_GRP_IS_INACTIVE);
			
			if(stInactiveOld == 'F' && stInactiveNew == 'T'){
				//Search if there are records that are still pending approval that are using the rule group
				var stTranTypeText = nlapiGetFieldText(FLD_APP_RULE_GRP_TRAN_TYPE).toLowerCase().replace(/\s+/g, '');
				
				var filters = new Array();    
				filters[0] = new nlobjSearchFilter('formulatext', null, 'is', 'State 2: Approver');
				filters[0].setFormula('{workflow.currentstate}');
				if(stSubsidiary && isOneWorld() == 'T')
					filters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', stSubsidiary));
				var res = nlapiSearchRecord(stTranTypeText,'customsearch_nsts_gaw_adv_blk_aprv_sbtsp',filters);
				if(res){
					var err = nlapiCreateError('Error', 'Deactivate Rule Group Unsuccessful, There are transactions pending approval that are using the rule group.');
                    throw err;
				}
			}
		}
        if (executionContext == 'csvimport'){
            if (!stSubsidiary)
            	stSubsidiary = '@NONE@';
            
            //Validation on amount tolerance
            var stPctTol = nlapiGetFieldValue(FLD_APP_RULE_GRP_PERCENT_TOL);
            var stAmtTol = nlapiGetFieldValue(FLD_APP_RULE_GRP_AMT_TOL);
            	if (!isNaN(stPctTol) && !isEmpty(stPctTol)){
                	stPctTol = parseFloat(stPctTol);
                	if(stPctTol >= 0){
                        nlapiSetFieldValue(FLD_APP_RULE_GRP_AMT_TOL, '', true);
                    }else{
                		var err = nlapiCreateError('Error', 'CSV Import Unsuccessful, % TOLERANCE must be greater than or equal to 0.');
                        throw err;
                	}
                }else if(!isNaN(stAmtTol) && !isEmpty(stAmtTol)){
            		stAmtTol = parseFloat(stAmtTol);
                	if(stAmtTol >= 0){
                        nlapiSetFieldValue(FLD_APP_RULE_GRP_PERCENT_TOL, '', true);      
                    }else{
                		var err = nlapiCreateError('Error', 'CSV Import Unsuccessful, AMOUNT TOLERANCE must be greater than or equal to 0.');
                        throw err;
                	}
            	}
            if(stTranTypeVal == '2'){//TODO: ADD GLOBALLY
                var stVarPct = nlapiGetFieldValue(FLD_APP_RULE_GRP_PO_TO_VB_AMT);
                var stVarAmt= nlapiGetFieldValue(FLD_APP_RULE_GRP_PO_TO_VB_PCT);
                if(!isNaN(stVarPct) && !isEmpty(stVarPct)){
                	stVarPct = parseFloat(stVarPct);
                	if (stVarPct >= 0){
                        nlapiSetFieldValue(FLD_APP_RULE_GRP_PO_TO_VB_PCT, '', true);              		
                    }else{
                		var err = nlapiCreateError('Error', 'CSV Import Unsuccessful, PO TO VB VARIANCE % must be greater than or equal to 0.');
                        throw err;
                    }
                }else if(isNaN(stVarAmt) && !isEmpty(stVarAmt)){
                	stVarAmt = parseFloat(stVarAmt);
            		if (stVarAmt >= 0){
                        nlapiSetFieldValue(FLD_APP_RULE_GRP_PO_TO_VB_AMT, '', true);    
                    }else{
                		var err = nlapiCreateError('Error', 'CSV Import Unsuccessful, PO TO VB VARIANCE AMOUNT must be greater than or equal to 0.');
                        throw err;	
                    }
            	}
            }
			//Check if another rule group is running		
			if (stIsInactiveVal == 'T'){
				return;
			}
			var filters = new Array();
			filters.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranTypeVal));
			filters.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', stSubsidiary));
			filters.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', "F"));

			if ((!isEmpty(stInternalidVal))&& (type == 'edit')){
				filters.push(new nlobjSearchFilter('internalid', null, 'noneof', stInternalidVal));
			}

			var results = nlapiSearchRecord(stTransRecordType, null, filters);

			if (results){
				var err = nlapiCreateError('Error', 'CSV Import Unsuccessful, there is already an active rule group with the same subsidiary.');
				throw err;
			}			
        }
    }else if(stTransRecordType == 'SALESORDER' && type=='create') {
        if(executionContext == 'csvimport') {
            nlapiSetFieldValue('orderstatus', 'A');
        }
    }else if((stTransRecordType == 'JOURNALENTRY' || stTransRecordType == 'INTERCOMPANYJOURNALENTRY') && type=='edit') {
		var stVoid = nlapiGetFieldValue('void');
		if(stVoid){
			stVoid = stVoid.toUpperCase();
			if(stVoid.indexOf('VOID') >= 0){
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), [FLD_TOTAL_DEBIT_AMT,FLD_TRANS_DEBIT_AMT], [0,0]);
			}
		}
        
    }
	if(type =='create' && stTransRecordType != REC_RULE_GRP.toUpperCase()){
        nlapiSetFieldValue(FLD_APPROVAL_STATUS, HC_STATUS_PENDING_APPROVAL, false, false);
        nlapiSetFieldValue(FLD_CUSTBODY_CLK_TRIG_SUBMIT, 'F', false, false);       	
        nlapiSetFieldValue(FLD_CUSTBODY_CLK_TRIG_APPROVE, 'F', false, false);      	
        nlapiSetFieldValue(FLD_CUSTBODY_CLK_TRIG_REJECT, 'F', false, false);       	
        nlapiSetFieldValue(FLD_CUSTBODY_CLOAKING_INPROG, 'F', false, false);       	
        nlapiSetFieldValue(FLD_CUSTBODY_RESET_WORKFLOW, 'F', false, false);       	
        nlapiSetFieldValue(FLD_CUSTBODY_CLK_TRIG_SUPER, 'F', false, false);       	
        nlapiSetFieldValue(FLD_SUPER_APPROVED, 'F', false, false);       	
    }
}