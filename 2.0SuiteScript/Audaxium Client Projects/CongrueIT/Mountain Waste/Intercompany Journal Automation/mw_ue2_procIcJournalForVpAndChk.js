/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/format', 
        'N/record', 
        'N/runtime', 
        'N/search',
        '/SuiteScripts/CongrueIT Customization/UTILITY_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {format} format
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(email, error, format, record, runtime, search, custUtil) 
{
   
    /**
     * This user event script is deployed against Vendor Payment and Check record to
     * 		automagically create Intercompany (IC) Journal entries if either one of these records are
     * 		created or edited. 
     * 	
     * 	Access IC Payment Configuration (customrecord_icpaymentconfig) custom record to see if 
     * this transaction references IC Configured account.
     * IF It is based on series of business logic defined in the requirement, it will automate
     * create/update of IC Journal Entry for this Transaction (Vendor Payment or Check) 
     * 
     * Once all business logic is processed, script will set IC Journal Reference (custbody_ic_je)
     * 	on THIS transaction. 
     * 	AND
     * 	Source Trx for IC Journal (custbody_ic_sourcetrx) on IC Journal Record
     * 		This field WILL prevent source transaction from being deleted
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(context) 
    {
    	var paramErrEmpIds = runtime.getCurrentScript().getParameter('custscript_sb123_errempids');
    	if (paramErrEmpIds)
    	{
    		paramErrEmpIds = paramErrEmpIds.split(',');
    		for (var p=0; p < paramErrEmpIds.length; p+=1)
    		{
    			paramErrEmpIds[p] = custUtil.strTrim(paramErrEmpIds[p]);
    		}
    	}
    	
    	log.debug('paramErrEmpIds', paramErrEmpIds);
    	
    	//We know what the error notifier is.  We can start the monitor process
    	var procJson = {
    		'trxtype':context.newRecord.type,
    		'trxid':context.newRecord.id,
    		'triggertype':context.type,
    		'action':'', //create, edit
    		'icjref':'',
    		'trxstatus':'', //"Voided" is status if the trx was voided
    		'oldaccount':'',
    		'newaccount':'',
    		'oldtranid':'',
    		'newtranid':'',
    		'oldamount':'',
    		'newamount':'',
    		'oldvendor':'',
    		'newvendor':'',
    		'newvendortext':'',
    		'oldrec':context.oldRecord,
    		'newrec':context.newRecord
    	};
    	
    	//log.debug('before Starting processing', JSON.stringify(procJson));
    	
    	try
    	{
    		//If the trigger type is xedit, we need to load the new record
        	if (procJson.triggertype == context.UserEventType.XEDIT)
        	{
        		procJson.newrec = record.load({
        			'type':procJson.trxtype,
        			'id':procJson.trxid
        		});
        	}
        	
        	//BEFORE WE START, We Grab list of ALL IC Payment Config Data into JSON Object.
        	//JSON Key is the From Bank Account which will be compared against the Trx Account field value
        	//	It is confirmed that the configuration CAN NOT contain duplicate FROM ACCOUNT values
        	var iccSearch = search.create({
	    		'type':'customrecord_icpaymentconfig',
	    		'filters':[
	    		           	['isinactive', search.Operator.IS, false]
	    		          ],
	    		'columns':[
	    		           'custrecord_icpc_frombankacct', //From Bank Account (Key)
	    		           'custrecord_icpc_fromsubs', //From Subs
	    		           'custrecord_icpc_tosubs', //To Subs
	    		           'custrecord_icpc_tobankacct', //To Bank Account
	    		           'custrecord_icpc_icacct', //IC Account
	    		           'custrecord_icpc_fromsubs.custrecord_mwr_subsidiary_id', //From Subs ID
	    		           'custrecord_icpc_tosubs.custrecord_mwr_subsidiary_id' //To Subs ID
	    		          ]
	    	}),
	    	iccCols = iccSearch.columns,
	    	iccrs = iccSearch.run().getRange({
	    		'start':0,
	    		'end':1000
	    	});
    	
        	//Build up iccJson that contains all I/C Payment Configuration
        	//Key is the From Bank Account
	    	var iccJson = {};
	    	for (var i=0; iccrs && i < iccrs.length; i+=1)
	    	{
	    		iccJson[iccrs[i].getValue(iccCols[0])] = {
	    			'fromsub':iccrs[i].getValue(iccCols[1]),
	    			'tosub':iccrs[i].getValue(iccCols[2]),
	    			'tobank':iccrs[i].getValue(iccCols[3]),
	    			'icacct':iccrs[i].getValue(iccCols[4]),
	    			'fromsubmwrid':iccrs[i].getValue(iccCols[5]),
	    			'tosubmwrid':iccrs[i].getValue(iccCols[6])
	    		};
	    	}
        	log.debug('iccJson', JSON.stringify(iccJson));
	    	//-------------------------- CORE PROCESSING ------------------------------
	    	//Let's grab additional information
	    	//Set icjref
	    	procJson.icjref = procJson.newrec.getValue({
	    		'fieldId':'custbody_ic_je'
	    	});
	    	//Add Transaction Status - "Voided" is status of voided v.payment or check
	    	procJson.trxstatus = procJson.newrec.getValue({
        		'fieldId':'status'
        	});
	    	//Set old and new account values
	    	if (procJson.oldrec)
	    	{
	    		procJson.oldaccount = procJson.oldrec.getValue({
		    		'fieldId':'account'
		    	});
	    	}
	    	procJson.newaccount = procJson.newrec.getValue({
	    		'fieldId':'account'
	    	});
	    	//Set old and new amount values
	    	if (procJson.oldrec)
	    	{
	    		procJson.oldamount = procJson.oldrec.getValue({
		    		'fieldId':'total'
		    	});
	    	}
	    	procJson.newamount = procJson.newrec.getValue({
	    		'fieldId':'total'
	    	});
	    	//Set old and new tranid values
	    	if (procJson.oldrec)
	    	{
	    		procJson.oldtranid = procJson.oldrec.getValue({
		    		'fieldId':'tranid'
		    	});
	    	}
	    	procJson.newtranid = procJson.newrec.getValue({
	    		'fieldId':'tranid'
	    	});
	    	//Set old and new vendor values
	    	if (procJson.oldrec)
	    	{
	    		procJson.oldvendor = procJson.oldrec.getValue({
		    		'fieldId':'entity'
		    	});
	    	}
	    	procJson.newvendor = procJson.newrec.getValue({
	    		'fieldId':'entity'
	    	});
	    	//Set the new Text
	    	//newvendortext
	    	procJson.newvendortext = procJson.newrec.getText({
	    		'fieldId':'entity'
	    	});
	    	
	    	//---------------- Action to Take Logic ----------------------------------------
        	//0. We first need to find out if we need to process this record.
        	//Logic: delete IC Ref
	    	//(
	    	//	- If Status is Voided
	    	//		OR
	    	//	- NEW Account IS NOT in iccJson
	    	//)
	    	//	AND
	    	//	- IC Ref IS Set
	    	//	DELETE
	    	if (
	    		(procJson.trxstatus == 'Voided' || !iccJson[procJson.newaccount])
	    		&&
	    		procJson.icjref
	    	   )
	    	{
	    		log.debug('action to delete','setting action');
	    		procJson.action = 'DELETE';
	    	}
	    	
	    	//Logic: create IC Ref
	    	//- Doesn't matter if it's create or edit at this point, if new account value is in icc
	    	//	and we are missing IC Ref Value, we create
        	//	New Account value IS in iccJson
	    	//	AND
	    	// - NO IC Ref Exists
	    	//	CREATE
	    	else if (
	    				iccJson[procJson.newaccount]
	    				&&
	    				!procJson.icjref
	    			)
	    	{
	    		log.debug('action to create','setting action');
	    		procJson.action = 'CREATE';
	    	}
	    	
	    	//Logic: update IC Ref
	    	//	- New Account IS in iccJson
	    	//	AND
	    	//	- IC Ref IS Set
	    	//	AND
	    	//	(
	    	//		tranid value changed
	    	//			OR
	    	//		vendor value changed
	    	//			OR
	    	//		amount value changed
	    	//	)
	    	else if (
	    				iccJson[procJson.newaccount]
	    				&&
	    				procJson.icjref
	    				&&
	    				(
	    						procJson.oldtranid != procJson.newtranid ||
	    						procJson.oldvendor != procJson.newvendor ||
	    						procJson.oldamount != procJson.newamount
	    				)
	    			)
	    	{
	    		log.debug('action to edit','setting action');
	    		procJson.action = 'EDIT';
	    	}
        	
	    	//log.debug('Process JSON', JSON.stringify(procJson));
        	
	    	//IF Action can't be decided, simply exit out
	    	if (!procJson.action)
	    	{
	    		log.debug('no need to process', 'return out');
	    		return;
	    	}
        	
	    	log.debug('Action To Take', procJson.action);
        	
	    	//------------------------- Based on Action, Execute CORE IC Journal Processing Logic  ----------------------
	    	if (procJson.action == 'DELETE')
	    	{
	    		log.debug('Executing Delete','Delete IC Journal ID '+procJson.icjref);
	    		
	    		return;
	    	}
	    	
	    	//At this point, it's either create new or update.
	    	var icjRec = null;
	    	if (procJson.action == 'CREATE')
	    	{
	    		icjRec = record.create({
	    			'type':record.Type.INTER_COMPANY_JOURNAL_ENTRY,
	    			'isDynamic':true
	    		});
	    		
	    		log.debug('initialized new icjRec','New icjRec Initialized');
	    	}
	    	else
	    	{
	    		//Load the linked IC Journal Entry and clear things out. 
	    		icjRec = record.load({
	    			'type':record.Type.INTER_COMPANY_JOURNAL_ENTRY,
	    			'id':procJson.icjref,
	    			'isDynamic':true
	    		});
	    		
	    		log.debug('loaded linked icjRec', 'Load icjRec ID '+procJson.icjref);
	    		
	    		
	    		//TODO: CLEAR ALL Fields for Redo
	    		
	    	}
	    	
	    	//Run Business Logic to Create or Re-do the IC Journal Record
	    	var configJson = iccJson[procJson.newaccount],
	    		trxTranDateObj = procJson.newrec.getValue({
	    			'fieldId':'trandate'
	    		}),
	    		trxTranDateNsFormat = format.format({
	    			'value':trxTranDateObj,
	    			'type':format.Type.DATE
	    		}),
	    		trxTranDateIdFormat = (trxTranDateObj.getMonth()+1).toString()+
	    							  trxTranDateObj.getDate().toString()+
	    							  trxTranDateObj.getFullYear().toString(),
	    		jrId = configJson.fromsubmwrid+'-'+configJson.tosubmwrid+'_IC_BANK_'+trxTranDateIdFormat,
	    		jrDesc = configJson.fromsubmwrid+' to '+configJson.tosubmwrid+' IC BANK Transaction - '+trxTranDateNsFormat,
	    		defDept = '105', //99 Balance Sheet
	    		defClass = '103'; //9xx Balance Sheet : 910 Operating
	    	
	    	log.debug('Matched config JSON', JSON.stringify(configJson));
	    	log.debug('jr data', jrId+' // '+jrDesc);
	    	
	    	//set Journal ID and Description
	    	icjRec.setValue({
	    		'fieldId':'custbodycustom_journal_id',
	    		'value':jrId,
	    		'ignoreFieldChange':false
	    	});
	    	
	    	icjRec.setValue({
	    		'fieldId':'custbodycustom_journal_description',
	    		'value':jrDesc,
	    		'ignoreFieldChange':false
	    	});
	    	
	    	//Set Reference to THIS Transaction (custbody_ic_sourcetrx)
	    	icjRec.setValue({
	    		'fieldId':'custbody_ic_sourcetrx',
	    		'value':procJson.trxid,
	    		'ignoreFieldChange':false
	    	});
	    	
	    	//Set Trandate to THIS Transactons' Date
	    	icjRec.setValue({
	    		'fieldId':'trandate',
	    		'value':trxTranDateObj,
	    		'ignoreFieldChange':false
	    	});
	    	
	    	//Let's set From and To Subsidiary. These values are coming from configJson (Matched Configuration)
	    	icjRec.setValue({
	    		'fieldId':'subsidiary',
	    		'value':configJson.fromsub,
	    		'ignoreFieldChange':false
	    	});
	    	
	    	icjRec.setValue({
	    		'fieldId':'tosubsidiary',
	    		'value':configJson.tosub,
	    		'ignoreFieldChange':false
	    	});
	    	
	    	//Now we set the lines. These lines MUST be added in ORDER specified in the documentation.
	    	//----------- LINE 1 ------------------------
	    	//From Subsidiary / From Cash Account
	    	icjRec.selectNewLine({
	    		'sublistId':'line'
	    	});
	    	//set the From Subs
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'subsidiary',
	    		'value':configJson.fromsub,
	    		'ignoreFieldChange':false
	    	});
	    	//set the From Account
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'account',
	    		'value':procJson.newaccount,
	    		'ignoreFieldChange':false
	    	});
	    	//set the From Account Debit
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'debit',
	    		'value':procJson.newamount,
	    		'ignoreFieldChange':false
	    	});
	    	//set the From Account Memo
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'memo',
	    		'value':'Intercompany Bank Transactions ('+
	    				configJson.fromsubmwrid+
	    				' to '+
	    				configJson.tosubmwrid+')',
	    	    'ignoreFieldChange':false
	    	});
	    	//set Default department
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'department',
	    		'value':defDept,
	    		'ignoreFieldChange':false
	    	});
	    	//set Default class
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'class',
	    		'value':defClass,
	    		'ignoreFieldChange':false
	    	});
	    	icjRec.commitLine({
	    		'sublistId':'line'
	    	});
	    	log.debug('line 1 added','line 1 added');
	    	
	    	//----------- LINE 2 ------------------------
	    	//Credit Total Amount to I/C Account
	    	icjRec.selectNewLine({
	    		'sublistId':'line'
	    	});
	    	//set the From Subs
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'subsidiary',
	    		'value':configJson.fromsub,
	    		'ignoreFieldChange':false
	    	});
	    	log.debug('added subsidiary', 'line 2 - '+icjRec.getCurrentSublistValue({'sublistId':'line', 'fieldId':'subsidiary'}));
	    	//set the From Account as I/C Account
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'account',
	    		'value':configJson.icacct,
	    		'ignoreFieldChange':false
	    		//'value':'133000 Intercompany Transactions'
	    	});
	    	log.debug('added subsidiary', 'line 2 - '+icjRec.getCurrentSublistValue({'sublistId':'line', 'fieldId':'account'}));
	    	//set the From Account Credit
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'credit',
	    		'value':procJson.newamount,
	    		'ignoreFieldChange':false
	    	});
	    	//set the From Account as I/C account Memo
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'memo',
	    		'value':'Intercompany Bank Transactions ('+
	    				configJson.fromsubmwrid+
	    				' to '+
	    				configJson.tosubmwrid+')',
	    	    'ignoreFieldChange':false
	    	});
	    	//set Default department
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'department',
	    		'value':defDept,
	    		'ignoreFieldChange':false
	    	});
	    	//set Default class
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'class',
	    		'value':defClass,
	    		'ignoreFieldChange':false
	    	});
	    	icjRec.commitLine({
	    		'sublistId':'line'
	    	});
	    	log.debug('line 2 added','commited');
	    	/**
	    	//----------- LINE 3 ------------------------
	    	//Debit Total Amount to To Subsidiary Account
	    	icjRec.selectNewLine({
	    		'sublistId':'line'
	    	});
	    	//set the To Subs
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'subsidiary',
	    		'value':configJson.tosub
	    	});
	    	//set the To Account as To Account
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'account',
	    		'value':configJson.tobank
	    	});
	    	//set the To Account Credit
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'debit',
	    		'value':procJson.newamount
	    	});
	    	//set the To Account as TO account Memo
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'memo',
	    		'value':'Intercompany Bank Transactions ('+
	    				configJson.fromsubmwrid+
	    				' to '+
	    				configJson.tosubmwrid+')'
	    	});
	    	//set Default department
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'department',
	    		'value':defDept
	    	});
	    	//set Default class
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'class',
	    		'value':defClass
	    	});
	    	icjRec.commitLine({
	    		'sublistId':'line'
	    	});
	    	//----------- LINE 4 ------------------------
	    	//Credit Total Amount to I/C Account
	    	icjRec.selectNewLine({
	    		'sublistId':'line'
	    	});
	    	//set the To Subs
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'subsidiary',
	    		'value':configJson.tosub
	    	});
	    	//set the To Account as I/C Account
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'account',
	    		'value':configJson.icacct
	    	});
	    	//set the To Account Credit
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'credit',
	    		'value':procJson.newamount
	    	});
	    	//set the To Account as I/C account Memo
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'memo',
	    		'value':'Check: '+procJson.newamount+' '+
	    				'Vendor: '+procJson.newvendortext
	    	});
	    	//set Default department
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'department',
	    		'value':defDept
	    	});
	    	//set Default class
	    	icjRec.setCurrentSublistValue({
	    		'sublistId':'line',
	    		'fieldId':'class',
	    		'value':defClass
	    	});
	    	icjRec.commitLine({
	    		'sublistId':'line'
	    	});
	    	*/
	    	
	    	log.debug('icjRec JSON', JSON.stringify(icjRec));
	    	
	    	var icjRecId = icjRec.save({
	    		'enableSourcing':false,
	    		'ignoreMandatoryFields':true
	    	});
	    	
	    	log.debug('icjRec ID', icjRecId);
	    	
	    	
    	}
    	catch(icprocerr)
    	{
    		log.error('Error Processing', 'Error: '+custUtil.getErrDetail(icprocerr)+' // JSON Object: '+JSON.stringify(procJson));
    		
    		//Generate an Email to Those in Notification list
    		email.send({
    			'author':-5,
    			'recipients':paramErrEmpIds,
    			'subject':'Error Automating IC Journal Entry',
    			'body':'Trx Type: '+procJson.trxtype+'<br/>'+
    					  'Trx ID: '+procJson.trxid+'<br/>'+
    					  'Trx Trigger Type: '+procJson.triggertype+'<br/><br/>'+
    					  'Error Detail:<br/>'+
    					  custUtil.getErrDetailUi(icprocerr)
    		});
    	}
    }

    return {
        afterSubmit: afterSubmit
    };
    
});
