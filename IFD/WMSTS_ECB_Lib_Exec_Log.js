/*
 * Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * Store software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * * Version    Date            Author           		Remarks
 *   1.00       Aug 10 2019		Mahesh Babu        	Initial Version
 *
 */

/**
 * WMSTS_ECB_Lib_Exec_Log.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/record', './WMSTS_ECB_Lib_Exec_Log_Lib.js'],
    function (record, ECB_messages_library) {

        var Store = new Object();
        Store.ScriptLogs = new Object();
        Store.ScriptExecutionTimes = new Object();
        Store.ScriptExecutionStatus = new Object();

        var BeginDateTime=0;
        var BeginDateTimeinMS=0;
        var EndDateTime=0;
        var EndDateTimeinMS=0;
        var ProcessingTimeinSeconds = 0;
        var dt = new Date();

           
        function ECBLogStart(obj) {
            log.debug("ECBLogStart start ", 'yes');
            var ms = dt.getTime();
            BeginDateTime = getDateTime(dt);
            BeginDateTimeinMS = ms;

            initializeScriptDetails(obj);   

        }

        function initializeScriptDetails(obj) {
            log.debug("initializeScriptDetails start ", 'yes');
            if (obj) {

                if (obj.scriptid) {
                    Store.ScriptId = obj.scriptid;
                }
                if (obj.OriginalRequest) {
                    Store.OriginalRequest = obj.OriginalRequest;
                }
                if (obj.ScriptParametersd) {
                    Store.ScriptParameters = obj.ScriptParameters;
                }

            }

           

        }

        function SetStatus(obj) {
            log.debug("SetStatus start ", 'yes');
            if (obj.statusCode) {
                Store.ScriptExecutionStatus['StatusCode'] = obj.statusCode;
                Store.ScriptExecutionStatus['Status'] = ECB_messages_library.postpacking[obj.statusCode].en.status;
                Store.ScriptExecutionStatus['StatusMessage'] = ECB_messages_library.postpacking[obj.statusCode].en.statusMessage;
            }
            if (obj.AddlMsg) {
                Store.ScriptExecutionStatus['StatusMessage'] = ECB_messages_library.postpacking[obj.statusCode].en.statusMessage + '[' + obj.AddlMsg + ']'
            }

        }

        function ECBLogEnd(obj) {
            log.debug("ECBLogEnd start ", 'yes');
            dt = new Date();

            initializeProcessDetails(obj);
            var ms = dt.getTime();
            EndDateTime = getDateTime(dt);
            EndDateTimeinMS = ms;

            var timeDiff = parseInt(EndDateTimeinMS) - parseInt(BeginDateTimeinMS);
            
            var pSeconds = ((timeDiff) / 1000);
            pSeconds = pSeconds.toFixed(2);
            ProcessingTimeinSeconds = pSeconds

            // Get Execution times object

            Store.ScriptExecutionTimes['BeginDateTime'] = BeginDateTime;
            Store.ScriptExecutionTimes['BeginDateTimeinMS'] = BeginDateTimeinMS;
            Store.ScriptExecutionTimes['EndDateTime'] = EndDateTime;
            Store.ScriptExecutionTimes['EndDateTimeinMS'] = EndDateTimeinMS;
            Store.ScriptExecutionTimes['ProcessingTimeinSeconds'] = ProcessingTimeinSeconds +" Seconds";

            createLogRecord(Store);   
        }

        function initializeProcessDetails(obj) {
            log.debug("initializeProcessDetails start ", 'yes');
            if (obj) {

                if (obj.ProcessValidationDetails) {
                    Store.ProcessValidationDetails = obj.ProcessValidationDetails;
                }
                if (obj.ProcessResult) {
                    Store.ProcessResults = obj.ProcessResults;
                }
                if (obj.KeyWords) {
                    Store.KeyWords = obj.KeyWords;
                }
            }

        }

        function createLogRecord(Store) {
            // create log record
            log.debug("createLogRecord start ", 'yes');
            var rec = record.create({
                type: 'customrecord_wmsts_exe_logs',
                isDynamic: true
            });

            rec.setValue({
                fieldId: 'name',
                value: Store.ScriptId + " | " + getDateTime(dt)
            });
            rec.setValue({
                fieldId: 'custrecord_scriptid',
                value: Store.ScriptId
            });
            rec.setValue({
                fieldId: 'custrecord_exebtime',
                value: Store.ScriptExecutionTimes['BeginDateTime']
            });
            rec.setValue({
                fieldId: 'custrecord_exe_btime_ms',
                value: Store.ScriptExecutionTimes['BeginDateTimeinMS']
            });
            rec.setValue({
                fieldId: 'custrecord_exe_endtime',
                value: Store.ScriptExecutionTimes['EndDateTime']
            });
            rec.setValue({
                fieldId: 'custrecord_exe_endtime_ms',
                value: Store.ScriptExecutionTimes['EndDateTimeinMS']
            });
            rec.setValue({
                fieldId: 'custrecord_exe_total_time',
                value: Store.ScriptExecutionTimes['ProcessingTimeinSeconds']
            });
            rec.setValue({
                fieldId: 'custrecord_store_obj_details',
                value: JSON.stringify(Store)
            });
            rec.setValue({
                fieldId: 'custrecord_script_log_detail',
                value: JSON.stringify(Store.ScriptLogs)
            });
            rec.setValue({
                fieldId: 'custrecord_script_status',
                value: JSON.stringify(Store.ScriptExecutionStatus)
            });
            rec.setValue({
                fieldId: 'custrecord_exe_keyword',
                value: JSON.stringify(Store.KeyWords)
            });

            rec.save();
        }
   

        function ScriptLogs(obj) {
            log.debug("ScriptLogs start ", 'yes');
            if (obj.name && obj.value) {
                var name = obj.name;
                var value = obj.value;
                var date = getDateTime(dt);

                if (!Store.ScriptLogs[date + "|" + name]) {
                    Store.ScriptLogs[date + "|" + name] = {};
                    Store.ScriptLogs[date + "|" + name][name] = value;
                } else {
                    Store.ScriptLogs[date + "|" + name][name] = value;
                }
 
            } else {
                var date = getDateTime(dt);
                Store.ScriptLogs[date] = obj
            } 
           
        }

        function getDateTime(dt) {

            var dd = dt.getDate();
            dd = (dd < 10 ? dd = '0' + dd : dd);
            var mm = dt.getMonth() + 1;
            mm = (mm < 10 ? mm = '0' + mm : mm);
            var yyyy = dt.getFullYear();
            var h = dt.getHours();
            h = (h < 10 ? h = '0' + h : h);
            var m = dt.getMinutes()
            m = (m < 10 ? m = '0' + m : m);
            var s = dt.getSeconds();
            s = (s < 10 ? s = '0' + s : s);
            var z = dt.getMilliseconds();
            if (z < 10)
                z = '00' + z;
            else if (z < 100)
                z = '0' + z;

            var fulldate = dd + "/" + mm + "/" + yyyy + " " + h + ":" + m + ":" + s + ":" + z;
            return fulldate;
        }

        function getDate(dt) {

            var dd = dt.getDate();
            dd = (dd < 10 ? dd = '0' + dd : dd);
            var mm = dt.getMonth() + 1;
            mm = (mm < 10 ? mm = '0' + mm : mm);
            var yyyy = dt.getFullYear();
            var fulldate = dd + "/" + mm + "/" + yyyy;
            return fulldate;

        }

        // Store function returns true if the stValue is empty
        function isEmpty(stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            return false;
        }

        // Store function returns true if JSON is valid
        function isValidJSON(jsonString) {
            try {
                var k = JSON.parse(jsonString);
                if (k && typeof k === "object") {
                    return true;
                }
            }
            catch (e) { }

            return false;
        }

        function buildResponseObj() {
            var obj = new Object();

           // obj.OriginalRequest = Store.OriginalRequest;
            obj.ScriptExecutionStatus = Store.ScriptExecutionStatus;

            return obj;

        }

        return {                 
            ECBLogStart: ECBLogStart,
            ECBLogEnd: ECBLogEnd,
            ScriptLogs: ScriptLogs,
            SetStatus: SetStatus,
            getDateTime: getDateTime,
            getDate: getDate,
            IsEmpty: isEmpty,
            IsValidJSON: isValidJSON,
            Store: buildResponseObj
        }

});