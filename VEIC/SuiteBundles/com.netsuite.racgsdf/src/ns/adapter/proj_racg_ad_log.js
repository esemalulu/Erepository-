/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[],

	function () {

		/**
		 * Constructor of Logger
		 *
		 * @param None
		 * @returns None
		 */
		var module = function () {
			this.strCurrentMethod = 'Logger Init';
			this.strCurrentType = 'debug';
			this.arrMethod = [];
			this.arrLog = [];
			this.arrLog.push({
				type: this.strCurrentType,
				title: this.strCurrentMethod,
				msg: 'Initiate Logger'
			});
			this.strPrefix = '[RACG] ';
			this.bPrintPush = false;
		};

		/**
		 * Flags the start of a method
		 *
		 * @param {String} strMethod - Name of the function that will be used as log title
		 * @param {String} strMsg - Content of the message, defaults to "start method"
		 * @returns None
		 */
		module.prototype.startMethod = function (strMethod, strMsg) {
			if (!strMethod) return;
			//backup the last method
			this.arrMethod.push(this.strCurrentMethod);

			//override the current method
			this.strCurrentMethod = strMethod;
			strMsg = strMsg || 'start method';
			this.pushLog(strMsg);
		};

		/**
		 * End the flag of the last method (used in conjuction with start method)
		 *
		 * @param {String} strMsg - Content of the message, defaults to "end method"
		 * @returns None
		 */
		module.prototype.endMethod = function (strMsg) {
			//return the last method
			var strPrevMethod = this.arrMethod.pop();
			if (strPrevMethod) {
				strMsg = strMsg || 'end method';
				this.pushLog(strMsg);
				//return previous method
				this.strCurrentMethod = strPrevMethod;
			}
		};

		/**
		 * Add message to queue; Queue can be read by flushLog method
		 * Set the exposed variable bPrintPush to true to print log while adding to queue
		 *
		 * @param {String} strMsg - Content of the message
		 * @returns None
		 */
		module.prototype.pushLog = function (strMsg) {
			if (this.bPrintPush) {
				this.logExecution(this.strCurrentType, this.strCurrentMethod, strMsg);
			}

			this.arrLog.push({
				type: this.strCurrentType,
				title: this.strCurrentMethod,
				msg: strMsg
			});
		};

		/**
		 * Print message using current type and title
		 *
		 * @param {String} strMsg - Message to print
		 * @returns None
		 */
		module.prototype.print = function (strMsg) {
			this.logExecution(this.strCurrentType, this.strCurrentMethod, strMsg);
		};

		/**
		 * Print message as audit
		 *
		 * @param {String} strMsg - Message to print
		 * @returns None
		 */
		module.prototype.printAudit = function (strMsg) {
			this.logExecution('audit', this.strCurrentMethod, strMsg);
		};

		/**
		 * Print all stored logs
		 *
		 * @param {String} strType - Specify log type to print; Defaults to the log type used on pushLog
		 * @param {Boolean} printAll - true to print all call logs, false to print only last 10
		 * @returns None
		 */
		module.prototype.flushLog = function (strType, printAll) {
			var objPrint = null;
			this.logExecution(strType || 'debug', 'flushLog',
				'Printing Stack Trace for  ' + (printAll ? 'all' : 'last 10') + ' method calls');
			var lastLogs = printAll ? this.arrLog : this.arrLog.slice(-10);
			for (var i = 0; i < lastLogs.length; i++) {
				objPrint = lastLogs[i];
				this.logExecution(strType || objPrint.type, 'flushLog: ' + objPrint.title, objPrint.msg);
			}
			this.logExecution(strType || objPrint.type, 'Call Trace', this.arrMethod.join(' > ') + ' > ' + this.strCurrentMethod);
		};

		/**
		 * Clear all stored logs
		 *
		 * @param None
		 * @returns None
		 */
		module.prototype.clearLog = function () {
			this.arrMethod = [];
			this.arrLog = [];
		};

		/**
		 * Print logs (same as nlapiLogExecution from SuiteScript v1)
		 *
		 * @param {String} strType - type of log
		 * @param {String} strTitle - title of log
		 * @param {String} strMsg - message of log
		 * @returns None
		 */
		module.prototype.logExecution = function (strType, strTitle, strMsg) {
			switch (strType.toLowerCase()) {
				case 'audit':
					this.audit(strTitle, strMsg);
					break;
				case 'error':
					this.error(strTitle, strMsg);
					break;
				case 'debug':
					this.debug(strTitle, strMsg);
					break;
				case 'emergency':
					this.emergency(strTitle, strMsg);
					break;
				default :
					this.error('logExecution', 'Unknown Message Type: ' + strType);
					break;
			}
		};

		/**
		 * Prints the methods that invoked the current function
		 *
		 * @param None
		 * @returns None
		 */
		module.prototype.printCallerMethod = function () {
			this.debug(this.arrMethod.concat(this.strCurrentMethod).join(' > '));
		};

		/**
		 * Handles print of logs when function catched an exception
		 *
		 * @param {Object} e - Error Object
		 * @returns None
		 */
		module.prototype.handleError = function (e) {
			this.flushLog('error');
			if (e.name) {
				this.error('handleError', e.name + ' | ' + e.message);
			} else {
				this.error('handleError', 'Exception Error: ' + e.toString());
			}
		};

		/**
		 * Wrapper class for log.debug
		 *
		 * @param {String} strTitle - title of log
		 * @param {String} strDetails - message of log
		 * @returns None
		 */
		module.prototype.debug = function (strDetails) {
			log.debug(this.strPrefix + this.strCurrentMethod, strDetails);
		};

		/**
		 * Wrapper class for log.audit
		 *
		 * @param {String} strTitle - title of log
		 * @param {String} strDetails - message of log
		 * @returns None
		 */
		module.prototype.audit = function (strTitle, strDetails) {
			log.audit(this.strPrefix + strTitle, strDetails);
		};

		/**
		 * Wrapper class for log.emergency
		 *
		 * @param {String} strTitle - title of log
		 * @param {String} strDetails - message of log
		 * @returns None
		 */
		module.prototype.emergency = function (strTitle, strDetails) {
			log.emergency(this.strPrefix + strTitle, strDetails);
		};

		/**
		 * Wrapper class for log.error
		 *
		 * @param {String} strTitle - title of log
		 * @param {String} strDetails - message of log
		 * @returns None
		 */
		module.prototype.error = function (strTitle, strDetails) {
			log.error(this.strPrefix + strTitle, strDetails);
		};

		return new module();
	}
);
