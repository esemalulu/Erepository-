/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

var REMAINING_USAGE_LIMIT	= 200;
var lastIbForProdCreationParam = null;

/**
 * This script synchronizes the Install Base "Renew With" field against the Item's "Renew With" field.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function synchronize_IB_RenewWith(){
    var logger = new Logger(false);
    var MSG_TITLE = 'synchronize_IB_RenewWith';
    logger.enableDebug(); // comment this line to turn debugging off.
    logger.debug(MSG_TITLE,'=====Start=====');

    var IB_SEARCH = nlapiGetContext().getSetting('SCRIPT', 'custscript_search_for_ib_renew_with_sync');
    var lastProcIB = nlapiGetContext().getSetting('SCRIPT', 'custscript_r09_last_ib');

    logger.audit(MSG_TITLE, 'Script Parameters:\n'
            + '\nSearch ID to Use = ' + IB_SEARCH
            + '\nLast Processed IB = ' + lastProcIB
        );
    
    var arrIBProdFilters = new Array();        
    if (lastProcIB != null && lastProcIB != '') 
	{
    	logger.debug(MSG_TITLE, 'restrict search to install bases above ' + lastProcIB);
        arrIBProdFilters.push(new nlobjSearchFilter('internalidnumber', '', 'greaterthan', lastProcIB));
    }
    
    var arrIBResults = nlapiSearchRecord('customrecord_install_base', IB_SEARCH, arrIBProdFilters, null);
    
    /* Loop through the results and update the Install Base record. */
    if (arrIBResults != null && arrIBResults != undefined && arrIBResults != '') {
        var ibResultsCount = arrIBResults.length; 
        logger.audit(MSG_TITLE, 'ibResultsCount   : ' + ibResultsCount);

        var stInstallBaseID;
        
        for (var intIdx = 0; intIdx < arrIBResults.length; intIdx++) {
        
            try {
                logger.debug(MSG_TITLE, '==========Processing Install Base Record==========');
                
                stInstallBaseID = arrIBResults[intIdx].getId();
                logger.debug(MSG_TITLE, 'Install Base ID: ' + stInstallBaseID);
                
                var stRenewWithItemId = arrIBResults[intIdx].getValue('custitem_renew_with', 'custrecord_install_base_item');
                logger.debug(MSG_TITLE, 'Item\'s Renew With ID: ' + stRenewWithItemId);
                
                /* Update the Install Base Record */
                nlapiSubmitField('customrecord_install_base', stInstallBaseID, 'custrecord_renew_with', stRenewWithItemId, true);
                
                logger.debug(MSG_TITLE, 'Latest IB Prod Processed: ' + stInstallBaseID);
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
    				// we reschedule the script
    				logger.audit(MSG_TITLE, 'Reschedule synchronize_IB_RenewWith. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    
    				var param = new Object();
    				param.custscript_r09_last_ib	= stInstallBaseID;
                    
    				logger.audit(MSG_TITLE, 'Reschedule R09 and pass parameters: ' + param.custscript_r09_last_ib);
    				var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null /*nlapiGetContext().getDeploymentId()*/, param);
    				return; //script got rescheduled, so just end the method
    			}
                
                lastProcIB = stInstallBaseID;
                
            } catch (ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Processing Install Base ' + stInstallBaseID + ':' + ex.getDetails());
                }
                else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Processing Install Base ' + stInstallBaseID + ':' + ex.toString());
                }
                throw ex;
            }
        }
        
        //reschedule if array still has results on last search
        if (arrIBResults.length > 0) {
        	// we reschedule the script
			logger.audit(MSG_TITLE, 'Reschedule synchronize_IB_RenewWith. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
            
			var param = new Object();
			param.custscript_r09_last_ib	= lastProcIB;
            
			logger.audit(MSG_TITLE, 'Reschedule R09 and pass parameters: ' + param.custscript_r09_last_ib);
			var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null /*nlapiGetContext().getDeploymentId()*/, param);
			return; //script got rescheduled, so just end the method
        }
    }
    
    logger.debug(MSG_TITLE, 'Remaining Usage Points: ' + nlapiGetContext().getRemainingUsage());
    logger.debug(MSG_TITLE,'======End======');
}


/**
 * This script will create product records when needed and match it up with the approriate install base records.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function createProductAndMatchWithInstallBase(){
    var logger = new Logger(false);
    var MSG_TITLE = 'createProductAndMatchWithInstallBase';
    logger.enableDebug(); // comment this line to turn debugging off.
    logger.debug(MSG_TITLE,'=====Start=====');

    /* Retrieve script parameters. */
    var IB_SEARCH_ID = nlapiGetContext().getSetting('SCRIPT', 'custscript_r11_install_base_search_id');
    var PROD_QTY_TYPES = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_r11_qty_product'));

    logger.debug(MSG_TITLE, 'Script Parameters:\n'
            + '\nSearch ID to Use=' + IB_SEARCH_ID
            + '\nQuantity Type: Product =' + PROD_QTY_TYPES
        );
    
	if (processInstallBaseForProductCreation(IB_SEARCH_ID, PROD_QTY_TYPES, logger, MSG_TITLE) == -1)
		return;

	if (processInstallBaseForProductMapping(IB_SEARCH_ID, PROD_QTY_TYPES, logger, MSG_TITLE) == -1)
		return;

    logger.debug(MSG_TITLE, 'Remaining Usage Points: ' + nlapiGetContext().getRemainingUsage());
    logger.debug(MSG_TITLE,'======End======');
}

function processInstallBaseForProductCreation(ibSearchId, prodQtyTypes, logger, MSG_TITLE)
{
	var IB_SEARCH_ID = ibSearchId;
    var PROD_QTY_TYPES = prodQtyTypes;
    var ibForProdCreationParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_r11_ib_prod_creation');
    lastIbForProdCreationParam = ibForProdCreationParam;
    
    logger.audit(MSG_TITLE, 'Script Parameters for Product Creation:\n'
            + '\nLast IB Prod Processed = ' + ibForProdCreationParam
        );
	
	var arrIBProdFilters = [
        new nlobjSearchFilter('custrecord_quantity_type', '', 'anyof', PROD_QTY_TYPES)
        ,new nlobjSearchFilter('isinactive', null, 'is', 'F')
    ];
	
    if (ibForProdCreationParam != null && ibForProdCreationParam != '') 
	{
        logger.debug(MSG_TITLE, 'restrict search to install bases above ' + ibForProdCreationParam);
        arrIBProdFilters.push(new nlobjSearchFilter('internalidnumber','', 'greaterthan', ibForProdCreationParam));            
    }

    var arrIBProdColumns = [
        new nlobjSearchColumn('custrecord_product_line')
        ,new nlobjSearchColumn('custrecord_install_base_bill_to_customer')
        ,new nlobjSearchColumn('custrecord_ib_end_user')
        ,new nlobjSearchColumn('custrecord_install_base_item')
    ];

    var arrIBProdResults = nlapiSearchRecord('customrecord_install_base',IB_SEARCH_ID,arrIBProdFilters,arrIBProdColumns);

    if(arrIBProdResults != null && arrIBProdResults != undefined && arrIBProdResults != ''){
    	
    	logger.audit(MSG_TITLE, 'arrIBProdResults length = ' + arrIBProdResults.length);

        for(var intIBProdIdx = 0; intIBProdIdx < arrIBProdResults.length ; intIBProdIdx++){

            try
            {
                /* Get Install Base Details. */
                var stIBId = arrIBProdResults[intIBProdIdx].getId();
                var stProdLine = arrIBProdResults[intIBProdIdx].getValue('custrecord_product_line');
                var stBillTo = arrIBProdResults[intIBProdIdx].getValue('custrecord_install_base_bill_to_customer');
                var stEndUser = arrIBProdResults[intIBProdIdx].getValue('custrecord_ib_end_user');
                var stItemId = arrIBProdResults[intIBProdIdx].getValue('custrecord_install_base_item');
                logger.debug(MSG_TITLE, 'Install Base: ' + stIBId
                        + '\n' + 'Product Line: ' + stProdLine
                        + '\n' + 'Bill To: ' + stBillTo
                        + '\n' + 'End User: ' + stEndUser
                        + '\n' + 'Item: ' + stItemId
                        );

                /* Determine if the Product needs to be created. */
                if (SS_CheckProdExists(stProdLine, stBillTo, stEndUser) == null)
                {
                    /* Create the Product record because it doesn't exist yet. */
                    logger.debug(MSG_TITLE, 'Creating Product Record.');
                    var stProdId = SS_CreateProductRecord(stBillTo, stEndUser, stItemId);
                    logger.debug(MSG_TITLE, 'Product record created. ID:' + stProdId);
                }else{
                    logger.debug(MSG_TITLE, 'Product record already exists.');
                }
                
                logger.debug(MSG_TITLE, 'Latest IB Prod Processed: ' + stIBId);
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
    				// we reschedule the script
    				logger.audit(MSG_TITLE, 'Reschedule processInstallBaseForProductCreation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    
    				var param = new Object();
    				param.custscript_r11_ib_prod_creation	= stIBId;
                    
    				logger.audit(MSG_TITLE, 'Reschedule R11 and pass parameters: ' + param.custscript_r11_ib_prod_creation);
    				var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null /*nlapiGetContext().getDeploymentId()*/, param);
    				return -1; // -1 is a way to tell the caller that the script got rescheduled
    			}
                
                lastIbForProdCreationParam = stIBId;
            }
            catch(ex)
            {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(),'Error processing Install Base ' + stIBId + ': ' +  ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR','Error processing Install Base ' + stIBId + ': ' +   ex.toString());
                }
                throw ex;
            }
        }
        
        //reschedule if array still has results on last search
        if (arrIBProdResults.length > 0) {
        	// we reschedule the script
			logger.audit(MSG_TITLE, 'Reschedule processInstallBaseForProductCreation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
            
			var param = new Object();
			param.custscript_r11_ib_prod_creation	= lastIbForProdCreationParam;
            
			logger.audit(MSG_TITLE, 'Reschedule R11 and pass parameters: ' + param.custscript_r11_ib_prod_creation);
			var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null /*nlapiGetContext().getDeploymentId()*/, param);
			return -1; // -1 is a way to tell the caller that the script got rescheduled
        }
    }
}

function processInstallBaseForProductMapping(ibSearchId, prodQtyTypes, logger, MSG_TITLE)
{
	var IB_SEARCH_ID = ibSearchId;
    var PROD_QTY_TYPES = prodQtyTypes;
    var ibForProdMappingParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_r11_ib_prod_mapping');
    var lastIBId = null;
    
    logger.audit(MSG_TITLE, 'Script Parameters for Product Mapping:\n'
            + '\nLast IB Prod Processed = ' + lastIbForProdCreationParam
            + '\nLast IB Processed = ' + ibForProdMappingParam
        );
    
    var arrIBFilters = [
        new nlobjSearchFilter('isinactive', null, 'is', 'F')
    ];
    
    if (ibForProdMappingParam != null && ibForProdMappingParam != '') 
	{
        logger.debug(MSG_TITLE, 'restrict search to install bases above ' + ibForProdMappingParam);
        arrIBFilters.push(new nlobjSearchFilter('internalidnumber','', 'greaterthan', ibForProdMappingParam));            
    }

    var arrIBColumns = [
        new nlobjSearchColumn('custrecord_product_line')
        ,new nlobjSearchColumn('custrecord_install_base_bill_to_customer')
        ,new nlobjSearchColumn('custrecord_ib_end_user')
        ,new nlobjSearchColumn('custrecord_install_base_item')
    ];

    var arrIBResults = nlapiSearchRecord('customrecord_install_base',IB_SEARCH_ID,arrIBFilters,arrIBColumns);

    if(arrIBResults != null && arrIBResults != undefined && arrIBResults != ''){
    	
    	logger.audit(MSG_TITLE, 'arrIBResults length = ' + arrIBResults.length);

        /* Define cache for Product Records. */
        var arrProductCache = new Array();

        for(var intIBIdx = 0; intIBIdx < arrIBResults.length ; intIBIdx++){

            try
            {
                /* Get Install Base Details. */
                var stIBId = arrIBResults[intIBIdx].getId();
                var stProdLine = arrIBResults[intIBIdx].getValue('custrecord_product_line');
                var stBillTo = arrIBResults[intIBIdx].getValue('custrecord_install_base_bill_to_customer');
                var stEndUser = arrIBResults[intIBIdx].getValue('custrecord_ib_end_user');
                var stItemId = arrIBResults[intIBIdx].getValue('custrecord_install_base_item');
                logger.debug(MSG_TITLE, 'Install Base: ' + stIBId
                        + '\n' + 'Product Line: ' + stProdLine
                        + '\n' + 'Bill To: ' + stBillTo
                        + '\n' + 'End User: ' + stEndUser
                        + '\n' + 'Item: ' + stItemId
                        );

                var stProdKey = stProdLine + '_' + stBillTo + '_' + stEndUser;
                var stProdId = null;

                if(arrProductCache[stProdKey] != null && arrProductCache[stProdKey] != undefined && arrProductCache[stProdKey] != ''){
                    stProdId = arrProductCache[stProdKey];
                    logger.debug(MSG_TITLE,'Product ID retrieved from cache: ' + stProdId);
                }else{
                    /* Determine if the Product exists. */
                    var recProd = SS_CheckProdExists(stProdLine, stBillTo, stEndUser);
                    if (recProd != null)
                    {
                        stProdId = recProd[0].getId();
                        logger.debug(MSG_TITLE, 'Product record found. ID:' + stProdId);
                        arrProductCache[stProdKey] = stProdId;
                    }else{
                        logger.debug(MSG_TITLE, 'Product record not found.');
                    }
                }

                if(stProdId != null){
                    logger.debug(MSG_TITLE, 'Setting Product ID(' + stProdId + ') for Install Base(' + stIBId + ')');
                    nlapiSubmitField('customrecord_install_base',stIBId,'custrecord_install_base_product',stProdId,false);
                }
                
                logger.debug(MSG_TITLE, 'Latest IB Processed: ' + stIBId);
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
    				// we reschedule the script
    				logger.audit(MSG_TITLE, 'Reschedule processInstallBaseForProductMapping. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    
    				var param = new Object();
    				param.custscript_r11_ib_prod_creation	= lastIbForProdCreationParam;
    				param.custscript_r11_ib_prod_mapping	= stIBId;
                    
    				logger.audit(MSG_TITLE, 'Reschedule R11 and pass parameters: ' + param.custscript_r11_ib_prod_creation + ' / ' +
    					param.custscript_r11_ib_prod_mapping);
    				var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null /*nlapiGetContext().getDeploymentId()*/, param);
    				return -1; // -1 is a way to tell the caller that the script got rescheduled
    			}
                
                lastIBId = stIBId;
            }
            catch(ex)
            {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(),'Error matching Install Base ' + stIBId + ' with product: ' +  ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR','Error matching Install Base ' + stIBId + ' with product: ' +   ex.toString());
                }
                throw ex;
            }
        }
        
        //reschedule if array still has results on last search
        if (arrIBResults.length > 0) {
        	// we reschedule the script
			logger.audit(MSG_TITLE, 'Reschedule processInstallBaseForProductMapping. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
            
			var param = new Object();
			param.custscript_r11_ib_prod_creation	= lastIbForProdCreationParam;
			param.custscript_r11_ib_prod_mapping	= lastIBId;
            
			logger.audit(MSG_TITLE, 'Reschedule R11 and pass parameters: ' + param.custscript_r11_ib_prod_creation + ' / ' +
				param.custscript_r11_ib_prod_mapping);
			var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null /*nlapiGetContext().getDeploymentId()*/, param);
			return -1; // -1 is a way to tell the caller that the script got rescheduled
        }
    }
}
