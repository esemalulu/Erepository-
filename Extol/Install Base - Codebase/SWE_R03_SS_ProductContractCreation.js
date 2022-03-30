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

var REMAINING_USAGE_LIMIT	= 2500;

/**
 * This script creates Product and Contract records based on transactions in the check log
 *
 * @param (string) stEventType The type of event triggering this function
 */
function main() {
    var logger = new Logger(false);
    var MSG_TITLE = 'Product/License Creation';
    logger.enableDebug(); //comment this line to disable debug
    logger.debug(MSG_TITLE, '=====Start=====');

    /* Retrieve Script Parameters */
    var arrItemCatsSupport         = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_item_cat_support');
    var arrItemCatsMaint           = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_item_cat_maintenance');
    var arrItemCatsLicense         = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_item_cat_license');
    var arrItemCatsPerpetual       = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_item_cat_perpetual');
    var arrItemCatsToProcess       = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_item_cat_to_process');
    var arrQtyTypesForProduct      = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_product_qty_types');
    var DFLT_CONTRACT_STATUS       = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_default_installbase_status');
    var DFLT_SYNCH_STATUS          = nlapiGetContext().getSetting('SCRIPT', 'custscript_pc_dflt_instbase_synch_status');
    var SCRIPT_ID                  = nlapiGetContext().getSetting('SCRIPT', 'custscript_create_prod_and_ib_script_id');
    var CHECK_LOG_TO_PROCESS_SRCH  = nlapiGetContext().getSetting('SCRIPT', 'custscript_r3_check_log_to_process_srch');
    var PROD_PENDING_CREATION_SRCH = nlapiGetContext().getSetting('SCRIPT', 'custscript_r3_product_pending_cr8_srch');

    arrItemCatsSupport    = splitList(arrItemCatsSupport);
    arrItemCatsMaint      = splitList(arrItemCatsMaint);
    arrItemCatsLicense    = splitList(arrItemCatsLicense);
    arrItemCatsToProcess  = splitList(arrItemCatsToProcess);
    arrQtyTypesForProduct = splitList(arrQtyTypesForProduct);
    arrItemCatsPerpetual  = splitList(arrItemCatsPerpetual);

    logger.audit(MSG_TITLE, 'Script Parameters:'
            + '\nPending Status='                     + CHECK_LOG_STATUS_PENDING
            + '\nProcessed Status='                   + CHECK_LOG_STATUS_PROCESSED
            + '\nIn Error Status='                    + CHECK_LOG_STATUS_ERROR
            + '\nCheck Log To Process Search='        + CHECK_LOG_TO_PROCESS_SRCH
            + '\nProduct Pending Creation Search='    + PROD_PENDING_CREATION_SRCH
            + '\nItem Cats='                          + arrItemCatsToProcess
            + '\nQty Type for Product='               + arrQtyTypesForProduct
            + '\nDefault Contract Status='            + DFLT_CONTRACT_STATUS
            + '\nDefault Contract Synch Status='      + DFLT_SYNCH_STATUS
            + '\nSupport Item Cats='                  + arrItemCatsSupport
            + '\nMaintenance Item Cats='              + arrItemCatsMaint
            + '\nLicense Item Cats='                  + arrItemCatsLicense
            + '\nPerpetual Item Cats='                + arrItemCatsPerpetual
            + '\nRenewal Order Type='                 + ORDER_TYPE_RENEWAL + ',' + ORDER_TYPE_RENEWAL_MANUAL
            + '\nUsage Points='                       + nlapiGetContext().getRemainingUsage()
            );

    /* Retrieve Field Mappings */
    var FLD_MAPPINGS = retrieveFieldMappings(MAP_ORIG_TRAN_TO_IB);

    /* Check the License Check Log Records for unprocessed transactions. */
    var arrCheckLogFilters = new Array();
    arrCheckLogFilters[arrCheckLogFilters.length] = new nlobjSearchFilter('custrecord_check_log_status', null, 'is', CHECK_LOG_STATUS_PENDING);
    arrCheckLogFilters[arrCheckLogFilters.length] = new nlobjSearchFilter('custrecord_check_log_type', null, 'is', CHECK_LOG_TYPE_INSTALL_BASE);
    arrCheckLogFilters[arrCheckLogFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    
    var arrCheckLogColumns = new Array();
    arrCheckLogColumns[arrCheckLogColumns.length] = new nlobjSearchColumn('id', '', 'group');
    arrCheckLogColumns[arrCheckLogColumns.length] = new nlobjSearchColumn('custrecord_trans_entity', '', 'group');
    arrCheckLogColumns[arrCheckLogColumns.length] = new nlobjSearchColumn('internalid', 'CUSTRECORD_TRANSACTION', 'group');

    var arrCheckLogResults = nlapiSearchRecord('customrecord_check_log', CHECK_LOG_TO_PROCESS_SRCH, arrCheckLogFilters, arrCheckLogColumns);

    logger.indent();
    if (arrCheckLogResults != null && arrCheckLogResults != undefined && arrCheckLogResults != '') { 
        logger.audit(MSG_TITLE, 'arrCheckLogResults length = ' + arrCheckLogResults.length);
        
        for (var idx = 0; idx < arrCheckLogResults.length; idx++) {
        	var arrIBsCreated = new Array();
            var arrCreatedProducts = new Array();
            try {
                logger.debug(MSG_TITLE, "Processing Result #" + idx);
                var stTranId   = arrCheckLogResults[idx].getValue('internalid', 'CUSTRECORD_TRANSACTION', 'group');
                var stTranType = nlapiLookupField('transaction', stTranId, 'recordType');
                var stCustId   = arrCheckLogResults[idx].getValue('custrecord_trans_entity', '', 'group');
                logger.debug(MSG_TITLE, 'Tran Type=' + stTranType
                        + '\nTran Id=' + stTranId
                        + '\nCustomer Id=' + stCustId
                        );

                var arrContracts = new Array();
                var arrProducts = new Array();

                var recTran = nlapiLoadRecord(stTranType, stTranId);
                var iTranLineCount = recTran.getLineItemCount("item");
                logger.debug(MSG_TITLE, 'Tran Line Count=' + iTranLineCount);
                var stEndUser = recTran.getFieldValue('custbody_end_user');
                var stBillToEntity = recTran.getFieldValue('entity');
                logger.debug(MSG_TITLE, "Tran Fields:"
                        + '\nEntity:' + stBillToEntity
                        + '\nEnd User:' + stEndUser
                        );

                logger.indent();
                /* Loop through the tran lines */
                for (var i = 1; i <= iTranLineCount; i++) {
                    logger.debug(MSG_TITLE, 'Processing Tran Line #' + i);

                    /* Determine if the tran line should be processed. */
                    var stItemCat = recTran.getLineItemValue('item', 'custcol_item_category', i);
                    if (searchInList(arrItemCatsToProcess, stItemCat)) {
                        var stQtyType   = recTran.getLineItemValue('item', 'custcol_quantity_type', i);
                        var stItemId    = recTran.getLineItemValue('item', 'item', i);
                        var stEndDate   = recTran.getLineItemValue('item', 'revrecenddate', i);
                        var stStartDate = recTran.getLineItemValue('item', 'revrecstartdate', i);
                        var iQty        = recTran.getLineItemValue('item', 'quantity', i);
                        var flListRate  = recTran.getLineItemValue('item', 'custcol_list_rate', i);
                        var stProdLine  = recTran.getLineItemValue('item', 'custcol_product_line', i);
                        var stDescr     = recTran.getLineItemValue('item', 'description', i);
                        var renExc      = recTran.getLineItemValue('item', 'custcol_renewals_exclusion', i); 
                        
                        logger.debug(MSG_TITLE, "Tran Line Fields:"
                                + '\nQuantity Type:' + stQtyType
                                + '\nEnd Date:' + stEndDate
                                + '\nStartDate:' + stStartDate
                                + '\nQuantity:' + iQty
                                + '\nList Rate:' + flListRate
                                + '\nProduct Line:' + stProdLine
                                + '\nItem:' + stItemId
                                + '\nSO:' + stTranId
                                + '\nDescription:' + stDescr
                                );


                        /* Determine if the Tran Line represents a product or not */
                        if (searchInList(arrQtyTypesForProduct, stQtyType)) {
                            /* Determine if a product is already defined. */
                        	var bProductExist = false;
                            var arrProductResults = SS_CheckProdExists(stProdLine,stBillToEntity,stEndUser); 
                            var stProdId;
                            if (arrProductResults != null) {
                            	if (arrProductResults.length > 0) {
                            		bProductExist = true;
                            		logger.debug(MSG_TITLE, arrProductResults.length + ' products found.');
                                    stProdId = arrProductResults[0].getId();
                                    logger.debug(MSG_TITLE, 'Product retrieved: ' + stProdId);
                                    arrProducts[stProdLine] = stProdId;
                            	}
                            }
                            if (!bProductExist) {
                            	// Create the product record
                                var recProd = nlapiCreateRecord('customrecord_product');
                                recProd.setFieldValue('custrecord_bill_to_customer', stBillToEntity);
                                if (stEndUser != null && stEndUser != undefined && stEndUser != '') {
                                    recProd.setFieldValue('custrecord_end_user', stEndUser);
                                }
                                recProd.setFieldValue('custrecord_product_item', stItemId);
                                recProd.setFieldValue('custrecord_p_original_tran', stTranId);

                                stProdId = nlapiSubmitRecord(recProd, true);
                                logger.debug(MSG_TITLE, 'Product created: ' + stProdId);
                                arrProducts[stProdLine] = stProdId;
                                arrCreatedProducts[arrCreatedProducts.length] = stProdId;
                            }
                        }

                        /**
                         *  Everything should always be reflected as a contract
                         * */
                        /* Determine what type of contract this is */
                        var stContractType = "";
                        if (searchInList(arrItemCatsLicense, stItemCat)) {
                            logger.debug(MSG_TITLE, 'Contract is a License');
                            stContractType = CONTRACT_TYPE_LICENSE;
                        }
                        if (searchInList(arrItemCatsMaint, stItemCat)) {
                            logger.debug(MSG_TITLE, 'Contract is a Maintenance');
                            stContractType = CONTRACT_TYPE_MAINTENANCE;
                        }
                        if (searchInList(arrItemCatsSupport, stItemCat)) {
                            logger.debug(MSG_TITLE, 'Contract is a Support');
                            stContractType = CONTRACT_TYPE_SUPPORT;
                        }
                           
                        /** Process Contract */
                        /* Create a contract record */
                        var recContract = nlapiCreateRecord('customrecord_install_base');
                        if (arrContracts[stProdLine] != null) {
                            logger.debug(MSG_TITLE, 'Not 1st Contract for Item');
                            arrContracts[stProdLine][arrContracts[stProdLine].length] = recContract;
                        } else {
                            logger.debug(MSG_TITLE, '1st Contract for Item');
                            arrContracts[stProdLine] = new Array();
                            arrContracts[stProdLine][0] = recContract;
                        }
                        recContract.setFieldValue('custrecord_ib_tran_line_description', stDescr);
                        recContract.setFieldValue('custrecord_install_base_type', stContractType);
                        recContract.setFieldValue('custrecord_install_base_item', stItemId);
                        recContract.setFieldValue('custrecord_install_base_bill_to_customer', stBillToEntity);
                        recContract.setFieldValue('custrecord_renewals_exclusion', renExc);                        
                        
                        if (stEndUser != null && stEndUser != undefined && stEndUser != '')
                        {
                            recContract.setFieldValue('custrecord_ib_end_user', stEndUser);
                        }
                        recContract.setFieldValue('custrecord_original_transaction', stTranId);
                        if (stStartDate == null || stStartDate == undefined || stStartDate == '')
                        {
                            stStartDate = recTran.getFieldValue('startdate');
                            logger.debug(MSG_TITLE, 'Using start date as start date:' + stStartDate);

                            if (stStartDate == null || stStartDate == undefined || stStartDate == '')
                            {
                                stStartDate = recTran.getFieldValue('trandate');
                                logger.debug(MSG_TITLE, 'Using tran date as start date:' + stStartDate);
                            }
                        }
                        recContract.setFieldValue('custrecord_install_base_start_date', stStartDate);

                        if (!searchInList(arrItemCatsPerpetual, stItemCat))
                        {
                            if (stEndDate != null && stEndDate != undefined && stEndDate != '')
                            {
                                recContract.setFieldValue('custrecord_install_base_end_date', stEndDate);
                            }
                            
                            /* Since this is not perpetual, the List Rate needs to be recomputed for precision */
                            // Determine Term In Months first
                            var flTermInMonths = recTran.getLineItemValue('item', 'revrecterminmonths', i);
                            // If term in months is set, use it. Else, compute for it!
                            if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
                            {
                                var dtStartDate = recTran.getLineItemValue('item', 'revrecstartdate', i);
                                var dtEndDate = recTran.getLineItemValue('item', 'revrecenddate', i);
                                 // Make sure that the start date is provided.
                                if ((dtStartDate == '' || dtStartDate == null || dtStartDate == undefined) || (dtEndDate == '' || dtEndDate == null || dtEndDate == undefined))
                                {
                                    flTermInMonths = null;
                                }else
                                {
                                    flTermInMonths = computeTermInMonths(dtStartDate, dtEndDate);
                                }
                            }
                            logger.debug(MSG_TITLE, 'flTermInMonths =' + flTermInMonths);
                            if (flTermInMonths != '' && flTermInMonths != null && flTermInMonths != undefined)
                            {
                                var flExtendedRate = recTran.getLineItemValue('item', 'rate', i);
                                if (flExtendedRate != '' && flExtendedRate != null && flExtendedRate != undefined) {
                                    flExtendedRate = parseFloat(flExtendedRate);
                                    flListRate = Math.round(flExtendedRate / flTermInMonths * 100000000) / 100000000; 
                                    logger.debug(MSG_TITLE, 'recalculated flListRate =' + flListRate);
                                }
                            }
                        }
                        /* If Order Type is Renewal, do not use default status*/
                        var stOrderType = recTran.getFieldValue('custbody_order_type');
                        logger.debug(MSG_TITLE, 'Order Type:' + stOrderType);
                        if (stOrderType != ORDER_TYPE_RENEWAL && stOrderType != ORDER_TYPE_RENEWAL_MANUAL) {
                            logger.debug(MSG_TITLE, 'Order is not a Renewal');
                            recContract.setFieldValue('custrecord_install_base_status', DFLT_CONTRACT_STATUS);
                        }
                        else
                        {
                            logger.debug(MSG_TITLE, 'Order is a Renewal');
                            recContract.setFieldValue('custrecord_install_base_status', CONTRACT_STATUS_RENEWED);
                        }
                        recContract.setFieldValue('custrecord_install_base_synch_status', DFLT_SYNCH_STATUS);
                        recContract.setFieldValue('custrecord_quantity', iQty);
                        recContract.setFieldValue('custrecord_orignal_list_rate', Math.round(flListRate*10000)/10000);
                        
                        /* Determine the discount/markup rate and store it in the Sales Order. */
                        var flDiscMarkupRate = recTran.getLineItemValue('item', 'custcol_inline_discount', i);
                        recContract.setFieldValue('custrecord_original_discount', flDiscMarkupRate);

                        /* ===== Perform extra mappings defined START ===== */
                        for(var idxMap = 0; idxMap < FLD_MAPPINGS.length; idxMap++)
                        {
                            var stDataToMap = '';
                            
                            // Determine Data To Map 
                            if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_type'] == TRAN_BODY_FIELD)
                            {
                                if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != null)
                                {
                                    stDataToMap = recTran.getFieldValue(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map']);
                                }
                            }
                            
                            if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_type'] == TRAN_LINE_FIELD)
                            {
                                if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != null)
                                {
                                    stDataToMap = recTran.getLineItemValue('item',FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'],i);
                                }
                            }
                            
                            // Map data to Install Base
                            if(stDataToMap != '' && stDataToMap != null && stDataToMap != undefined)
                            {
                                if(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != null)
                                {
                                    logger.debug(MSG_TITLE,'Mapping [' + FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] + ']= \'' + stDataToMap + '\' to Install Base field ' + FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map']);
                                    recContract.setFieldValue(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'],stDataToMap);
                                }
                            }
                        }
                        /* ===== Perform extra mappings defined END ===== */
                        
                    }
                    else
                    {
                        logger.debug(MSG_TITLE, 'Skipping tran line.');
                    }
                }
                logger.unindent();
                /* Loop through the Contracts created. */
                logger.debug(MSG_TITLE, 'Saving the Contracts.');
                logger.indent();
                for (var a in arrContracts)
                {
                    logger.debug(MSG_TITLE, 'Looping through contract ' + a);
                    /* Check if product exists. */
                    logger.debug(MSG_TITLE, 'Products Array[' + a + ']=' + arrProducts[a]);
                    if (arrProducts[a] == null || arrProducts[a] == undefined || arrProducts[a] == '')
                    {
                        logger.debug(MSG_TITLE, 'Product is not found yet.');
                        /* Determine if a product is already defined. */
                        var arrProductFilters = [
                            new nlobjSearchFilter('custrecord_bill_to_customer', null, 'is', stBillToEntity),
                            new nlobjSearchFilter('custrecord_p_product_line', null, 'is', a),
                            new nlobjSearchFilter('isinactive', null, 'is', 'F')
                        ];
                        if (stEndUser != null && stEndUser != undefined && stEndUser != '')
                        {
                            arrProductFilters.push(new nlobjSearchFilter('custrecord_end_user', null, 'anyof', stEndUser));
                        }
                        else
                        {
                            arrProductFilters.push(new nlobjSearchFilter('custrecord_end_user', null, 'anyof', '@NONE@'));
                        }
                        var arrProductColumns = [new nlobjSearchColumn('custrecord_product_item')];
                        var arrProductResults = nlapiSearchRecord('customrecord_product', '', arrProductFilters, arrProductColumns);
                        if (arrProductResults != null && arrProductResults.length > 0)
                        {
                            logger.debug(MSG_TITLE, arrProductResults.length + ' products found.');
                            stCustId = arrProductResults[0].getId();
                            logger.debug(MSG_TITLE, 'Product retrieved: ' + stCustId);
                            arrProducts[a] = stCustId;
                        }

                        /* Check if the product is already due for creation in another pending check log. */
                        if (arrProducts[a] == null || arrProducts[a] == undefined || arrProducts[a] == '')
                        {
                            logger.debug(MSG_TITLE, 'Product is not found yet.');
                            var arrPendingProductFilter = [
                                new nlobjSearchFilter('custrecord_trans_entity', null, 'is', stBillToEntity),
                                new nlobjSearchFilter('custrecord_check_log_type', null, 'is', CHECK_LOG_TYPE_INSTALL_BASE),
                                new nlobjSearchFilter('custrecord_transaction', null, 'noneof', stTranId),
                                new nlobjSearchFilter('custcol_product_line', 'custrecord_transaction', 'is', a)
                            ];

                            if (stEndUser != null && stEndUser != undefined && stEndUser != '')
                            {
                                arrPendingProductFilter.push(new nlobjSearchFilter('custbody_end_user', 'custrecord_transaction', 'anyof', stEndUser));
                            }
                            else
                            {
                                arrPendingProductFilter.push(new nlobjSearchFilter('custbody_end_user', 'custrecord_transaction', 'anyof', '@NONE@'));
                            }
                            var arrPendingProductResult = nlapiSearchRecord('customrecord_check_log', PROD_PENDING_CREATION_SRCH, arrPendingProductFilter, null);

                            if (arrPendingProductResult != null)
                            {
                                if (arrPendingProductResult.length > 0)
                                {
                                    /* Create the product. */
                                    var recProd = nlapiCreateRecord('customrecord_product');
                                    var stProductItem = arrPendingProductResult[0].getValue('item', 'custrecord_transaction');
                                    var stProductTran = arrPendingProductResult[0].getValue('custrecord_transaction');
                                    logger.debug(MSG_TITLE, 'Product Item:' + stProductItem);

                                    recProd.setFieldValue('custrecord_bill_to_customer', stBillToEntity);
                                    recProd.setFieldValue('custrecord_end_user', stEndUser);
                                    recProd.setFieldValue('custrecord_product_item', stProductItem);
                                    recProd.setFieldValue('custrecord_p_original_tran', stProductTran);

                                    stCustId = nlapiSubmitRecord(recProd, true);
                                    logger.debug(MSG_TITLE, 'Product created: ' + stCustId);
                                    arrProducts[a] = stCustId;
                                }
                            }
                        }
                    }

                    /* If the product is still not available */
                    if (arrProducts[a] == null || arrProducts[a] == undefined || arrProducts[a] == '')
                    {
                        logger.debug(MSG_TITLE, 'Product cannot be found.');
                        throw nlapiCreateError('PRODUCT_MISS', 'Please make sure that a product can be found with a product line of ' + a + '.');
                    }

                    logger.debug(MSG_TITLE, 'Contracts: ' + arrContracts);
                    logger.debug(MSG_TITLE, 'Products: ' + arrProducts);
                    logger.indent();
                    for (var b in arrContracts[a])
                    {
                        var recCurContract = arrContracts[a][b];
                        logger.debug(MSG_TITLE, 'Contract Record =' + recCurContract);
                        if (recCurContract != null && recCurContract != undefined && recCurContract != '')
                        {
                            var stCurContractType = recCurContract.getFieldValue('custrecord_install_base_type');
                            var stContractItemId = recCurContract.getFieldValue('custrecord_install_base_item');
                            logger.debug(MSG_TITLE, 'Contract Type =' + stCurContractType
                                    + '\nContract Item=' + stContractItemId
                                    );
                            if (stCurContractType == CONTRACT_TYPE_MAINTENANCE || stCurContractType == CONTRACT_TYPE_SUPPORT)
                            {
                                nlapiSubmitField('customrecord_product', arrProducts[a], 'custrecord_m_s_item', stContractItemId, true);
                            }
                            recCurContract.setFieldValue('custrecord_install_base_product', arrProducts[a]);
                            
                            /* Submit the Contract for saving. */
                            var stContractId = nlapiSubmitRecord(recCurContract, true);
                            logger.debug(MSG_TITLE, 'Contract created: ' + stContractId);
                            arrIBsCreated[arrIBsCreated.length] = stContractId;
                        }
                    }
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'End Loop ' + a);
                }
                logger.unindent();
                
                logger.debug(MSG_TITLE, 'Updating status of check log id ' + arrCheckLogResults[idx].getValue('id', '', 'group'));
                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_PROCESSED,''];
                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getValue('id', '', 'group'), arrCheckLogUpdateFields, arrCheckLogUpdateValues);

                //Update products retention dates
                for (var i in arrProducts) {
                	if(arrProducts[i] != null && arrProducts[i] != '' && arrProducts[i] != undefined) {
                        updateProductRetentionDate(arrProducts[i], logger, MSG_TITLE);
                    }
                }
                
                //Update customer retention dates
                updateCustomerRetentionDate(stCustId, logger, MSG_TITLE);
                
                logger.debug(MSG_TITLE, 'Latest Check Log Processed: ' + arrCheckLogResults[idx].getValue('id', '', 'group'));
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
    				// we reschedule the script
    				logger.audit(MSG_TITLE, 'Reschedule R03. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
    				var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null);
    				return; //script got rescheduled, so just end the method
    			}
            }
            catch(ex)
            {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', ex.toString());
                }
                
                //Rollback: delete created IBs
                for (var iIBCreatedIdx = 0; iIBCreatedIdx < arrIBsCreated.length; iIBCreatedIdx++) {
                	var ibCreatedId = arrIBsCreated[iIBCreatedIdx];
                	logger.debug(MSG_TITLE,'Rollback:: Deleting created IB: [' + ibCreatedId + ']');
                	try {
                		nlapiDeleteRecord('customrecord_install_base', ibCreatedId);
                	} catch(exIB) { nlapiLogExecution('ERROR', 'DELETE ERROR - INSTALL BASE', (exIB.getDetails != undefined ? exIB.getDetails() : exIB.toString())); }
                }
                
                //Rollback: delete created Products
                iProdCount = arrCreatedProducts.length;
                for (var iProdCreatedIdx = 0; iProdCreatedIdx < iProdCount; iProdCreatedIdx++) {
                	var iProdCreatedId = arrCreatedProducts[iProdCreatedIdx];
                	logger.debug(MSG_TITLE,'Rollback:: Deleting created Products: [' + iProdCreatedId + ']');
                	try {
                		nlapiDeleteRecord('customrecord_product', iProdCreatedId);
                	} catch(exProd) { 
                		nlapiLogExecution('ERROR', 'DELETE ERROR - PRODUCTS', (exProd.getDetails != undefined ? exProd.getDetails() : exProd.toString())); 
                	}
                }

                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_ERROR,ex.toString()];
                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getValue('id', '', 'group'), arrCheckLogUpdateFields, arrCheckLogUpdateValues);
            }
        }
        
        //reschedule if array still has results on last search
        if (arrCheckLogResults.length > 0) {
        	// we reschedule the script
			logger.audit(MSG_TITLE, 'Reschedule R03. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
			var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), null);
			return; //script got rescheduled, so just end the method
        }
    }
    logger.unindent();

    logger.debug(MSG_TITLE, 'Remaining Usage Points: ' + nlapiGetContext().getRemainingUsage());
    logger.debug(MSG_TITLE, '======End======');
}

function updateProductRetentionDate(stCurProdId, logger, MSG_TITLE)
{
	if (stCurProdId == null || stCurProdId == undefined || stCurProdId == '') {
		logger.debug(MSG_TITLE, 'Skipping current product id ' + stCurProdId);
		return;
	}
	
	logger.debug(MSG_TITLE, 'Updating the retention date for product: ' + stCurProdId);

    var arrProductRetEndDatesColumns = [
        new nlobjSearchColumn('custrecord_install_base_end_date', null, 'max'),
        new nlobjSearchColumn('custrecord_install_base_product', null, 'group'),
        new nlobjSearchColumn('custrecord_install_base_retention_date', 'custrecord_install_base_product', 'group')
    ];
    var arrProductRetEndDatesFilters = [
        new nlobjSearchFilter('custrecord_install_base_end_date', null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_install_base_product', null, 'is', stCurProdId),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof', [SYNCH_STATUS_CREDITED, SYNCH_STATUS_EXPIRED], null),
        new nlobjSearchFilter('isinactive', null, 'is', 'F')
    ];

    var arrProductRetEndDatesResults = nlapiSearchRecord('customrecord_install_base', null, arrProductRetEndDatesFilters, arrProductRetEndDatesColumns);

    logger.indent();
    if (arrProductRetEndDatesResults)
    {
        try
        {
            for (var i = 0; i < arrProductRetEndDatesResults.length; i++)
            {
                var stProdId = arrProductRetEndDatesResults[i].getValue('custrecord_install_base_product', null, 'group');
                var stProdRetEndDateLatest = arrProductRetEndDatesResults[i].getValue('custrecord_install_base_end_date', null, 'max');
                var stProdCurRetEndDate = arrProductRetEndDatesResults[i].getValue('custrecord_install_base_retention_date', 'custrecord_install_base_product', 'group');
                if (stProdCurRetEndDate == null || nlapiStringToDate(stProdCurRetEndDate) < nlapiStringToDate(stProdRetEndDateLatest))
                {
                    logger.debug(MSG_TITLE, 'Updating Retention date for Product ID ' + stProdId + ' to ' + stProdRetEndDateLatest);
                    nlapiSubmitField('customrecord_product', stProdId, 'custrecord_install_base_retention_date', stProdRetEndDateLatest, false);
                }
            }
        }
        catch(ex)
        {
            logger.debug(MSG_TITLE, 'Error Occurred.');
            if (ex.getDetails != undefined)
            {
                nlapiLogExecution('ERROR', ex.getCode(), ex.getDetails());
            }
            else
            {
                nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', ex.toString());
            }
        }
    }
	logger.unindent();
}

function updateCustomerRetentionDate(stCurCustId, logger, MSG_TITLE)
{
	if (stCurCustId == null || stCurCustId == undefined || stCurCustId == '') {
		logger.debug(MSG_TITLE, 'Skipping current customer id ' + stCurCustId);
		return;
	}
	
	logger.debug(MSG_TITLE, 'Updating the retention date for customer: ' + stCurCustId);
    
    var arrCustRetEndDatesColumns = [
        new nlobjSearchColumn('custrecord_install_base_retention_date', null, 'max'),
        new nlobjSearchColumn('custrecord_bill_to_customer', null, 'group'),
        new nlobjSearchColumn('custentity_install_base_retention_date', 'custrecord_bill_to_customer', 'group')
    ];
    var arrCustRetEndDatesFilters = [
        new nlobjSearchFilter('custrecord_install_base_retention_date', null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_bill_to_customer', null, 'is', stCurCustId),
        new nlobjSearchFilter('isinactive', null, 'is', 'F')
    ];

    var arrCustRetEndDatesResults = nlapiSearchRecord('customrecord_product', null, arrCustRetEndDatesFilters, arrCustRetEndDatesColumns);

    logger.indent();
    if (arrCustRetEndDatesResults)
    {
        for (var i = 0; i < arrCustRetEndDatesResults.length; i++)
        {
            var stCustId = arrCustRetEndDatesResults[i].getValue('custrecord_bill_to_customer', null, 'group');
            var stCustRetEndDateLatest = arrCustRetEndDatesResults[i].getValue('custrecord_install_base_retention_date', null, 'max');
            var stCustCurRetEndDate = arrCustRetEndDatesResults[i].getValue('custentity_install_base_retention_date', 'custrecord_bill_to_customer', 'group');
            if (nlapiStringToDate(stCustCurRetEndDate) < nlapiStringToDate(stCustRetEndDateLatest))
            {
                logger.debug(MSG_TITLE, 'Updating Retention date for Customer ID ' + stCustId + ' to ' + stCustRetEndDateLatest);
                nlapiSubmitField('customer', stCustId, 'custentity_install_base_retention_date', stCustRetEndDateLatest, false);
            }
        }
    }
	logger.unindent();
}
