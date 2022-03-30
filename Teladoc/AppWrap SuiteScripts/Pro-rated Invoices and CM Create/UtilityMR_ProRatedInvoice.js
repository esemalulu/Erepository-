/**
 * @NApiVersion 2.0
 * @NModuleScope public
 */
define(["require", "exports", "N/search", "N/log", "N/runtime", "N/record", "N/format" , "N/error"], function (require, exports, nsSearch, nsLog, nsRuntime, record, format, error) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Copyright (c) 2020
     * AppWrap Inc
     * All Rights Reserved.
     *
     * This software is the confidential and proprietary information of AppWrap Inc. ("Confidential Information").
     * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the
     * license agreement you entered into with AppWrap Inc.
     *
     * Script Description:
     * Contains MR functions
     *
     *     |-------------------------------------------------------------------------------------------------------------------|
     *     | Author                      | Date          | Version       | Comments                                            |
     *     |-----------------------------|---------------|---------------|-----------------------------------------------------|
     *     | M.Smith		             | Mar 01, 2020  | 1.0           | Initial Version                                    |
     *     |-------------------------------------------------------------------------------------------------------------------|
     */
    
    function sendSuccessEmail(obj)
	{
		var stLogTitle = 'sendSuccessEmail';
		log.debug(stLogTitle, 'Processing sendSuccessEmail...');
		
        var author = -5;
   
        var subject = 'Map/Reduce script ' + obj.scriptid + ' has successfully been processed';
        var body = 'The following transaction internal ids have been processed successfully:\n' + JSON.stringify(obj.arrIds);

        require(['N/email'], function (email) {

            email.send({
                author: author,
                recipients: obj.recipients,
                subject: subject,
                body: body
            });

        });
		
	}
    
    function summaryError(summary, obj)
    {
    	 var inputSummary = summary.inputSummary;
         var mapSummary = summary.mapSummary;
         var reduceSummary = summary.reduceSummary;

         if (inputSummary.error)
         {
             var e = error.create({
                 name: 'INPUT_STAGE_FAILED',
                 message: inputSummary.error
             });
             sendErrorNotification(e, 'getInputData', obj);
         }

        stageError('map', mapSummary, obj);
        stageError('reduce', reduceSummary, obj);
    }
    
    function sendErrorNotification(e, stage, obj)
    {
		log.error('Stage: ' + stage + ' failed', e);
		log.error({ title: 'handleErrorAndSendNotification', details: 'Stage: ' + stage + ' failed. Error:' + e });

        var author = -5;
        var subject = 'Map/Reduce script ' + obj.scriptid + ' failed for stage: ' + stage;
        var body = 'An error occurred with the following information:\n' +
            'Error code: ' + e.name + '\n' +
            'Error msg: ' + e.message;
      
        require(['N/email'], function (email) {

            email.send({
                author: author,
                recipients:  obj.recipients,
                subject: subject,
                body: body
            });

        });
    }
    
    
    function stageError(stage, summary, obj){
    	var errorMsg = [];
        summary.errors.iterator().each(function(key, value){
            var msg = 'Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0)
        {
            var e = error.create({
                name: 'ERROR_IN_STAGE',
                message: JSON.stringify(errorMsg)
            });
            sendErrorNotification(e, stage, obj);
        }
    }
    
    var exports = {};
    exports.sendSuccessEmail = sendSuccessEmail;
    exports.summaryError = summaryError;
    return exports;
});
