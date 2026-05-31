/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
* Copyright (c) 1998-2023 Oracle NetSuite, Inc.
*  500 Oracle Parkway Redwood Shores, CA 94065 United States 650-627-1000
*  All Rights Reserved.
*
*  This software is the confidential and proprietary information of
*  NetSuite, Inc. ('Confidential Information'). You shall not
*  disclose such Confidential Information and shall use it only in
*  accordance with the terms of the license agreement you entered into
*  with Oracle NetSuite.
*
*  Version          Date          Author               Remarks
*  1.00            17 Nov 2023    riccardi             initial build
**/


define(['N/record', 'N/url','./ns_lib_custConsLibrary','N/runtime'],
    /**
 * @param{record} record
 * @param{url} url
 */
    (record, url,custCons,runtime) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            if(scriptContext.type == scriptContext.UserEventType.EDIT){
            // setting custbody_ns_consinv_url
                var recThis = scriptContext.newRecord;
                var intTransId = recThis.id;
                var intCuId = recThis.getValue('custbody_ns_invcons_customer');
                const strLogPrefix = 'Customer Consignment UE:';
                if(recThis.type == record.Type.PURCHASE_ORDER){
                    // These fields source from the destination location field in Transfer Orders. in order to get the correct values, we need to load the location record
                   var objLocFields =  custCons.getConsignFields(recThis.getValue('location'));
                   log.debug('objLocFields', objLocFields);
                      if(objLocFields.custrecord_ns_invcos_isconsig){
                        intCuId = objLocFields.custrecord_ns_invcos_customer[0].value;
                        recThis.setValue('custbody_ns_invcons_customer', objLocFields.custrecord_ns_invcos_customer[0].value);
                        recThis.setValue('custbody_nsps_consign_contact', objLocFields.custrecord_ns_invcon_contact[0].value);
                      }
                }
                if(intCuId != null && intCuId !== ''){
                    var strUrl = url.resolveScript({
                        scriptId: 'customscript_ns_su_consinv_checkin',
                        deploymentId: 'customdeploy_ns_su_consinv_check',
                        returnExternalUrl: true,
                        params: {
                            m: intCuId,
                            t: intTransId,
                            v: custCons.hashTrans(intTransId,intCuId)
                        }
                    });
                    log.debug('strUrl', strUrl);
                    recThis.setValue('custbody_ns_consinv_url', strUrl);
                }else{
                    log.debug(strLogPrefix, 'Customer ID is null or blank');
                    recThis.setValue('custbody_ns_consinv_url', null);
                }
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            
            if(scriptContext.type == scriptContext.UserEventType.CREATE){
                // setting custbody_ns_consinv_url
                var recThis = scriptContext.newRecord;
                var intTransId = recThis.id;
                var intCuId = recThis.getValue('custbody_ns_invcons_customer');                    
                if(recThis.type == record.Type.PURCHASE_ORDER){
                    // These fields source from the destination location field in Transfer Orders. in order to get the correct values, we need to load the location record
                   var objLocFields =  custCons.getConsignFields(recThis.getValue('location'));
                   log.debug('objLocFields', objLocFields);
                      if(objLocFields.custrecord_ns_invcos_isconsig){
                        intCuId = objLocFields.custrecord_ns_invcos_customer[0].value;
                        recThis.setValue('custbody_ns_invcons_customer', objLocFields.custrecord_ns_invcos_customer[0].value);
                        recThis.setValue('custbody_nsps_consign_contact', objLocFields.custrecord_ns_invcon_contact[0].value);
                      }
                }
                if(intCuId != null && intCuId !== ''){
                   var objRecord = record.load({
                       type: recThis.type,
                      id:  recThis.id
                     });
                    const strLogPrefix = 'Customer Consignment UE:';

                    var strUrl = url.resolveScript({
                        scriptId: 'customscript_ns_su_consinv_checkin',
                        deploymentId: 'customdeploy_ns_su_consinv_check',
                        returnExternalUrl: true,
                        params: {
                            m: intCuId,
                            t: intTransId,
                            v: custCons.hashTrans(intTransId,intCuId)
                        }
                    });
                    log.debug('strUrl', strUrl);
                    objRecord.setValue('custbody_ns_consinv_url', strUrl);
                    objRecord.save();
                }
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
