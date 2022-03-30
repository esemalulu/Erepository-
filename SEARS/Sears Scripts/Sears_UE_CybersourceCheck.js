/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', './NSUtil', 'N/error', 'N/runtime'],
/**
 * @param {Record} record
 * @param {Object} nsutil
 * @param {Error} error 
 * @param {Runtime} runtime
 */
function(record, nsutil, error, runtime) {
    
    var EndPoint = {};
    
    EndPoint.afterSubmit = function (scriptContext)
    {
        //Role checking
        var stRestrictedId = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role');
        var objUser = runtime.getCurrentUser();
        if(objUser.id == stRestrictedId)
        {
            return;
        }
        var logTitle = 'CyberSource::AfterSubmit';
        log.debug(logTitle, 'recordId = ' + scriptContext.newRecord.id  + '| stRestrictedId = ' + stRestrictedId + '| objUser.id = ' + objUser.id);
        
        
        // var recordObj = scriptContext.newRecord;
        var recordObj = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id});
        
        log.debug(logTitle,'** START:' + JSON.stringify([scriptContext.type, runtime.executionContext]));
        try
        {
            if (!nsutil.inArray(scriptContext.type,[scriptContext.UserEventType.CREATE, scriptContext.UserEventType.COPY, 
                                                    scriptContext.UserEventType.APPROVE,scriptContext.UserEventType.EDIT])) 
            {
                log.debug(logTitle, '**skipping due to type: ' + JSON.stringify([scriptContext.UserEventType.CREATE, scriptContext.UserEventType.COPY, 
                                                                                 scriptContext.UserEventType.APPROVE,scriptContext.UserEventType.EDIT]) );      
                return true;
            }
            
            if (!nsutil.inArray(runtime.executionContext, [runtime.ContextType.USER_INTERFACE] ) )
            {
                log.debug(logTitle, '**skipping due to context: ' + JSON.stringify([runtime.ContextType.USER_INTERFACE]));      
                return true;
            }
            
            log.debug(logTitle, '>> Order Status: ' + [recordObj.getValue({fieldId:'status'}), 
                                                       recordObj.getValue({fieldId:'statusRef'}),
                                                       recordObj.getValue({fieldId:'orderstatus'}),
                                                       recordObj.getValue({fieldId:'approvalstatus'})
                                                       ]);
            
            var status= recordObj.getValue({fieldId:'orderstatus'});
            
            if (status!='B')
            {
                log.debug(logTitle, '**skipping due to statusRef: ' + JSON.stringify([status]));        
                return true;
            }
            
            
            //regina - 11/9 - skip setting to pending approval if paypal and cybersource approval status  = 100
            var stPaymentMethodPayPal = runtime.getCurrentScript().getParameter('custscript_sears_pm_paypal');
            
            var stCyberSourceApprovalStatus = recordObj.getValue({
                fieldId: 'custbody_cybersource_approval_status'
            });
            
            var stPaymentMethod = recordObj.getValue({
                fieldId: 'paymentmethod'
            });
            
            log.debug(logTitle, 'stPaymentMethod = '+stPaymentMethod + ', stCyberSourceApprovalStatus = ' + stCyberSourceApprovalStatus);
            
            if(stPaymentMethod == stPaymentMethodPayPal && stCyberSourceApprovalStatus == '100')
            {
                log.debug(logTitle, '**skipping due to paymentmethod = paypal and cybersource approval status = 100');      
                return true;
            }   
            //regina - end
            
            
            var lineCount = recordObj.getLineCount({sublistId : 'paymentevent'});
            
            
            log.debug(logTitle, '>> Line Count: ' + lineCount);
                
            if (lineCount > 0) {
                var lineResult = recordObj.getSublistValue({
                    sublistId : 'paymentevent',
                    fieldId : 'result',
                    line : lineCount - 1
                });
                
                log.debug(logTitle, '>> ...result: ' + lineResult);
                
                if (!lineResult || !lineResult.match(/Accept/ig))
                {
                    // AE Validate if Any POs exist, and delete them before changing the status
                    var itemLineCount = recordObj.getLineCount({sublistId: 'item'});

                    
                    var objDeletedPO = {};
                    for (var line = 0; line < itemLineCount; line++) {
                        var createdPoID = recordObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'createdpo',
                            line: line
                        });

                        if (!nsutil.isEmpty(createdPoID)) {
                            //Get values from createpo and item fields
                            var createPoName = recordObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'createpo',
                                line: line
                            });
                            var itemID = recordObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: line
                            });
                            //Save them as key-value pairs
                            objDeletedPO[itemID] = createPoName;

                            log.debug(logTitle, '>> PO ' + createdPoID + ' will be deleted!');
                            record.delete({
                                type: record.Type.PURCHASE_ORDER,
                                id: createdPoID
                            });
                        }
                    }
                    // set the status back to Pending Approval
                    record.submitFields({
                        type: 'salesorder',
                        id: recordObj.id,
                        values : {'orderstatus': 'A'}
                    });

                    var recordObj = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id});
                    //after PO was deleted we have to reinit some field values in item sublist
                    for (var line = 0; line < itemLineCount; line++) {
                        var itemID = recordObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: line
                        });
                        if (objDeletedPO[itemID] != null) {
                            recordObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'createpo',
                                line: line,
                                value: objDeletedPO[itemID]
                            });

                            log.debug(logTitle, '>> Item = ' + itemID + ' createpo field was reinitialized with ' + objDeletedPO[itemID] + ' value.');
                        }
                    }   
                    recordObj.save();   
                }
            }
            
            return true;
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
        }
        finally
        {
            log.debug(logTitle, '*** END SCRIPT ***');
        }
    };
   
    return EndPoint;
});
