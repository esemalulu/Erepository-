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
 */

/**
 *
 * Version    Date            Author           Remarks
 * 1.00       22 Oct 2016     redelacruz       initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 *
 */

define(['N/record', 'N/runtime', 'N/https', './NSUtil', 'N/error', 'N/xml', 'N/search', 'N/redirect'],
function(record, runtime, https, NSUtil, error, xml, search, redirect)
{
    function parseNode(xmlResponse,arrTags,stXPath,objPayPalPayment)
    {
        var stLogTitle = 'parseNode';
        
        var nodeResponse = xml.XPath.select({
            node : xmlResponse,
            xpath : stXPath
        });
        
        if(!NSUtil.isEmpty(nodeResponse))
        {
            log.debug(stLogTitle, 'nodeResponse = '+nodeResponse.length);   
                                
            for (var i = 0; i < arrTags.length; i++) 
            {
                var element = nodeResponse[0].getElementsByTagName({
                            tagName : 'c:'+arrTags[i]
                        })
                
                if(!NSUtil.isEmpty(element))
                {
                    if(element.length > 0)
                    {
                        var stValue = element[0].textContent;
                        log.debug(stLogTitle, 'arrTags[i] = '+arrTags[i] + ', stValue = ' + stValue);   
                        
                        if(!NSUtil.isEmpty(stValue))
                        {
                            objPayPalPayment['custrecord_pp_'+arrTags[i].toLowerCase()] = stValue;
                        }
                    }                   
                }   
            }
        }       
    }
    
    function parseResponseXML(objPayPalPayment)
    {
        var stLogTitle = 'parseResponseXML';
        
        if(objPayPalPayment.code != 200)
        {
            return;
        }
        
        var stResponseXML = objPayPalPayment.custrecord_pp_xml_response;
        
        var xmlResponse = xml.Parser.fromString({
            text : stResponseXML
        });
        
        log.debug(stLogTitle, 'xmlResponse = '+xmlResponse);        
        
        var arrReplyMessage = ['merchantReferenceCode','requestID','decision','reasonCode','requestToken'];
        var stXPath = '/soap:Envelope/soap:Body/c:replyMessage';
        parseNode(xmlResponse,arrReplyMessage,stXPath,objPayPalPayment);

        var arrPayPalDoCaptureReply = ['authorizationId','transactionId','parentTransactionId','paypalTransactiontype','paypalPaymentType',
                                           'paypalOrderTime','paypalPaymentGrossAmount','paypalFeeAmount','paypalTaxAmount','paypalPaymentStatus',
                                           'amount','currency','correlationID','paypalPendingReason'];
        var stXPath = '/soap:Envelope/soap:Body/c:replyMessage/c:payPalDoCaptureReply';
        parseNode(xmlResponse,arrPayPalDoCaptureReply,stXPath,objPayPalPayment);
                        
        log.debug(stLogTitle, 'objPayPalPayment = '+JSON.stringify(objPayPalPayment));
    }
    
    function createPayPalPaymentRec(objPayPalPayment)
    {
        var stLogTitle = 'createPayPalPaymentRec';
        
        var recPayPalPayment = record.create({
            type: 'customrecord_paypal_payment', 
            isDynamic: false                    
        });
        
        for(var fld in objPayPalPayment)
        {
            log.debug(stLogTitle, 'fld = '+fld + ', stValue = ' + objPayPalPayment[fld]);   
            
            recPayPalPayment.setValue({
                fieldId:fld,
                value:objPayPalPayment[fld]
            });
        }
        
        var stPayPalPaymentId = recPayPalPayment.save({
            enableSourcing: false,
            ignoreMandatoryFields: false
        });
        log.debug(stLogTitle, 'Created stPayPalPaymentId = '+stPayPalPaymentId);    
    }
    
    function callCyberSource(objWSData,objPayPalPayment)
    {
        var stLogTitle = 'callCyberSource';
        
        objPayPalPayment.custrecord_pp_xml_request = objWSData.requestXML;
        objPayPalPayment.custrecord_pp_xml_response = '';
        
        log.audit(stLogTitle, 'Send request..');

        objResponse = https.request({
            method: 'POST',
            url: objWSData.url ,
            body: objWSData.requestXML
        });

        if (objResponse)
        {
            log.audit(stLogTitle, 'objResponse.code = '+objResponse.code);
            log.audit(stLogTitle, 'objResponse.body = '+objResponse.body);

            objPayPalPayment.code = objResponse.code;
            objPayPalPayment.custrecord_pp_xml_response =  objResponse.body;
        }

    }
    
    function payPal_CashSale(stRecordId,objPayPalPayment)
    {
        var stLogTitle = 'payPal_CashSale';
        
        if(objPayPalPayment.custrecord_pp_decision == 'REJECT')
        {               
            var id = record.submitFields({
                type: record.Type.CASH_SALE,
                id: stRecordId,
                values: {
                    ccapproved: 'F',
                    chargeit: 'F',
                    custbody_paypal_response_decision: objPayPalPayment.custrecord_pp_decision,
                    custbody_paypaldocapturerequest : '',
                    custbody_paypaldocapturerequesttoken : '',
                    custbody_paypalcaptureid : ''
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });
            log.debug(stLogTitle, 'Updated cashsale due to reject stRecordId = '+ stRecordId);
        }   
        else if(objPayPalPayment.custrecord_pp_decision == 'ACCEPT')
        {
            var id = record.submitFields({
                type: record.Type.CASH_SALE,
                id: stRecordId,
                values: {
                    ccapproved: 'T',
                    chargeit: 'F',
                    custbody_paypal_response_decision: objPayPalPayment.custrecord_pp_decision,
                    custbody_paypaldocapturerequest : objPayPalPayment.custrecord_pp_requestid,
                    custbody_paypaldocapturerequesttoken : objPayPalPayment.custrecord_pp_requesttoken,
                    custbody_paypalcaptureid : objPayPalPayment.custrecord_pp_transactionid
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });
            log.debug(stLogTitle, 'Updated cashsale due to accept stRecordId = '+ stRecordId);
        
        }
    }
    
    function payPal_Integration(objWSData,recTran,stRecordType,stRecordId)
    {
        var stLogTitle = 'payPal_Integration';
        
        var stPaymentMethod = recTran.getValue({
            fieldId: 'paymentmethod'
        });
        
        log.debug(stLogTitle, 'stPaymentMethod = '+stPaymentMethod + ', objWSData.paymentmethod = ' + objWSData.paymentmethod);
                
        if(stPaymentMethod != objWSData.paymentmethod)
        {
            log.debug(stLogTitle, 'Exit. Payment Method is not PayPal(custom) = ' + stPaymentMethod);
            return;
        }
        
        stRequestXML = objWSData.requestXML;
        
        var bIsCashSale = (stRecordType == 'cashsale') ? true : false;
        var arrPayPalFlds = (bIsCashSale) ? ['total','pnrefnum','custbody_sears_sales_ordernum','custbody_paypalauthid','custbody_paypalauthrequestid','custbody_paypalauthtoken'] :
                            ['total','pnrefnum','custbody_sears_sales_ordernum','custbody_paypaldocapturerequest','custbody_paypaldocapturerequesttoken','custbody_paypalcaptureid'];

        for(var i = 0; i < arrPayPalFlds.length; i++)
        {
            var stValue = recTran.getValue({
                fieldId: arrPayPalFlds[i]
            }) || '';
                            
            stRequestXML = stRequestXML.replace('{'+arrPayPalFlds[i]+'}',stValue);
        }            
        
        var stCurrencyId = recTran.getValue({
            fieldId: 'currency'
        });
        
        var objCurrency = search.lookupFields({
            type: 'currency',
            id: stCurrencyId,
            columns: 'symbol'
        });

        stRequestXML = stRequestXML.replace(/{custscript_sears_pp_username}/gi, objWSData.username);
        stRequestXML = stRequestXML.replace('{custscript_sears_pp_pwd}', objWSData.password);       
        stRequestXML = stRequestXML.replace('{currency}',objCurrency.symbol);
        
        objWSData.requestXML = stRequestXML;            
        
        log.debug(stLogTitle, 'objWSData = '+ JSON.stringify(objWSData));
        
        var objPayPalPayment = {};
            objPayPalPayment.custrecord_pp_tranid =  stRecordId;
            
        callCyberSource(objWSData,objPayPalPayment);
        parseResponseXML(objPayPalPayment);         
        createPayPalPaymentRec(objPayPalPayment);
        
        if(bIsCashSale)
        {
            payPal_CashSale(stRecordId,objPayPalPayment);
        }
    }
    
    /**
    * Entry ->  Suitelet
    * @param option
    */
    function onRequest_payPalIntegration(option)
    {
        var stLogTitle = 'onRequest_calculateHrsEst';
       
        try
        {
            log.debug(stLogTitle, '-------------- Start --------------');               
            
            var runtimeScript = runtime.getCurrentScript();
            
            var objWSData = {};
                objWSData.username   = runtimeScript.getParameter('custscript_sears_sl_pp_username');
                objWSData.password   = runtimeScript.getParameter('custscript_sears_sl_pp_pwd');
                objWSData.url        = runtimeScript.getParameter('custscript_sears_sl_pp_url');
                objWSData.requestXML = runtimeScript.getParameter('custscript_sears_sl_pp_request');
                objWSData.paymentmethod  = runtimeScript.getParameter('custscript_sears_sl_pp_paymentmethod');
                
            for(var fld in objWSData)
            {
                if(NSUtil.isEmpty(objWSData[fld]))
                {
                    log.debug(stLogTitle, 'Exit. Parameter values missing for ' + fld);
                    return;
                }
            }
            
            var stRecordType = option.request.parameters.rectype;
            var stRecordId = option.request.parameters.recid;

            log.debug(stLogTitle, 'Procesing stRecordType = '+stRecordType + ', stRecordId = ' + stRecordId);
            
            //Get Record
            var recTran = record.load({
                type: stRecordType, 
                id: stRecordId
            });
            
            payPal_Integration(objWSData,recTran,stRecordType,stRecordId);
            
            //Redirect back to the Scoping Solution
            redirect.toRecord({
                type: stRecordType,
                id: stRecordId 
            });
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
            log.debug(stLogTitle, '-------------- Exit --------------');
        }

    }
    return{
        onRequest : onRequest_payPalIntegration
    };
});