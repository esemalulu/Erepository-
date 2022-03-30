/**
 * Copyright (c) 1998-2009 NetSuite, Inc.
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
* @projectDescription 	PSG Devt Utilities JavaScript library.
*
* @author	Noah Tumlos ntumlos@netsuite.com
* @author	Tony Faelga afaelga@netsuite.com
* @author	Carlo Ibarra cibarra@netsuite.com
* @author	Ems Ligon eligon@netsuite.com
* @author	Rozal Reese rreese@netsuite.com
* 
* @since	2009
* @version	2009.0 initial code
*/

var PSG;
if (!PSG) PSG = {};
if (!PSG.Library) PSG.Library = {};

/**
 * Defines and returns an object named "browser" that is easier to use than
 * the "navigator" object.
 * 
 * Note:
 * 
 * Firefox 1.0: appName = "Netscape", appVersion = "5.0" (begins)
 * Safari     : appName = "Netscape", appVersion = "5.0"
 * IE 6.0     : appName = "Microsoft", appVersion = "4.0" (begins)
 * 
 * appName: a read-only string property that specifies the name of the browser. 
 * For Netscape-based browsers (Netscape, Mozilla, Firefox), the value of this property is "Netscape". 
 * In IE, the value of this property is "Microsoft Internet Explorer". 
 * Other browsers may identify themselves correctly or spoof another browser for compatibility.
 * 
 * @since	2009.08.26
 * @version	2009.01 addition to initial code
 * 
 * @return {browser}
 * 
 */
PSG.Library.displayBrowser = function () {
	var browser = {
	    version: parseInt(navigator.appVersion),
	    isNetscape: navigator.appName.indexOf("Netscape") != -1,
	    isMicrosoft: navigator.appName.indexOf("Microsoft") != -1
	};
	return browser;
}

/**
 * The Logger object contains functions which simplifies the logging of messages
 * by:
 * 1.  Removing the need to determine if the log is for a Server Side or Client
 *     Side SuiteScript
 * 2.  Allows you to toggle printing of DEBUG type messages programmatically
 *     or through a Script parameter.
 *
 */
PSG.Library.Logger = function(logTitle, isClientside) {

    // Logger Constants 
    var startLogMessage = '=====Start=====';
    var endLogMessage   = '======End======';

    this.setStartLogMessage = function(newStartLogMessage) { startLogMessage = newStartLogMessage;  } 
    this.setEndLogMessage   = function(newEndtLogMessage)  { endLogMessage   = newEndLogMessage;    } 

    this.getStartLogMessage = function() { return startLogMessage;  } 
    this.getEndLogMessage   = function() { return endLogMessage;    } 
    
    // determines whether to print a log or display an alert message
    var isClientside       = (!isClientside) ? false : isClientside;  
    var isForceClientside  = false; 
    
    this.forceClientside   = function() { isForceClientside = true;  }          // Force Client Side logging via alerts
    this.unforceClientside = function() { isForceClientside = false; }          // Unforce Client Side logging via alerts
    
    var logTitle       = logTitle;
    this.setLogTitle   = function(newLogTitle) { logTitle = newLogTitle;  } 

    // Defines the logLevel similar to that of log4j 
    var ALL       = 0; // The ALL has the lowest possible rank and is intended to turn on all logging.
    var AUDIT     = 1; // The AUDIT Level designates finer-grained informational events than the DEBUG
    var DEBUG     = 2; // The DEBUG Level designates fine-grained informational events that are most useful to debug an application.
    var ERROR     = 3; // The ERROR level designates error events that might still allow the application to continue running.
    var EMERGENCY = 4; // The EMERGENCY level designates very severe error events that will presumably lead the application to abort.
    var OFF       = 5; // The OFF has the highest possible rank and is intended to turn off logging.

    var LOG_LEVELS = new Array('ALL', 'AUDIT', 'DEBUG', 'ERROR', 'EMERGENCY', 'OFF');
    var logLevel   = OFF; // current log level - default is OFF

    this.showLogLevel = function() {
        alert('*** LOG LEVEL : ' + logLevel);        
    }

    // Convenience method to set log level to ALL, AUDIT, DEBUG, ERROR, EMERGENCY and OFF
    this.setLogLevelToAll       = function() { logLevel = ALL;       }
    this.setLogLevelToAudit     = function() { logLevel = AUDIT;     }
    this.setLogLevelToDebug     = function() { logLevel = DEBUG;     }
    this.setLogLevelToError     = function() { logLevel = ERROR;     }
    this.setLogLevelToEmergency = function() { logLevel = EMERGENCY; }
    this.setLogLevelToOff       = function() { logLevel = OFF;       }
     
    this.enable   = function() { this.setLogLevelToAll(); }                     // Enable the logging mechanism
    this.disable  = function() { this.setLogLevelToOff(); }                     // Disable the logging mechanism

    // Facility for pretty-fying the output of the logging mechanism
    var TAB             = '\t';                                                 // Tabs
    var SPC             = ' ';                                                  // Space
      
    var indentCharacter = SPC;                                                  // character to be used for indents: 
    var indentations    = 0;                                                    // number of indents to be padded to message
    
    this.indent   = function() { indentations++; }
    this.unindent = function() { indentations--; }

    // Prints a log either as an alert for CSS or a server side log for SSS
	this.log = function (logType, newLogTitle, logMessage) {
        // Pop an alert window if isClientside or isForceClientside 
        if ((isClientside) || (isForceClientside)) {
            alert(LOG_LEVELS[logType] + ' : ' + newLogTitle + ' : ' + logMessage);
        }

        // Prints a log message if !isClientside    
        if (!isClientside) {
            for (var i = 0; i < indentations; i++) {
                logMessage = indentCharacter + logMessage;
            }
            logMessage = '<pre>' + logMessage + '</pre>';
            nlapiLogExecution(LOG_LEVELS[logType], newLogTitle, logMessage);
        }
    }
    
    // Validates the log parameter before calling tha actual log function
	this.validateParamsThenLog = function(logType, newLogTitle, logMessage){
    
        // If newLogTitle exist and logMessage is undefined, then the newLogTitle should be displayed as the logMessage
        if (newLogTitle && !logMessage) {
            logMessage = newLogTitle;
            newLogTitle = null;
        }
        
        if (!newLogTitle) newLogTitle = logTitle;
        
        if (!logType) { logType = EMERGENCY; }                                  // default logType to EMERGENCY - minimal log messages
        if (logLevel > logType) { return; }                                     // current logLevel does not accomodate logType 
        
        this.log(logType, newLogTitle, logMessage);
    } 

    // Convenience method to log a AUDIT, DEBUG, INFO, WARN, ERROR and EMERGENCY messages
    this.audit     = function(newLogTitle, logMessage) { this.validateParamsThenLog(AUDIT,     newLogTitle, logMessage); }
    this.debug     = function(newLogTitle, logMessage) { this.validateParamsThenLog(DEBUG,     newLogTitle, logMessage); }
    this.error     = function(newLogTitle, logMessage) { this.validateParamsThenLog(ERROR,     newLogTitle, logMessage); }
    this.emergency = function(newLogTitle, logMessage) { this.validateParamsThenLog(EMERGENCY, newLogTitle, logMessage); }
}

/**
 * Searches an array for a given object
 *
 * @param (array) arrList The array to search
 * @param (var) varObj The object to be searched for
 * @return (boolean) The Item was found in the list
 */
PSG.Library.searchInList = function(list, varObj) {
    var isFound = false;
    for (var i in list) {
        if (list[i] == varObj) {
            isFound = true;
            break;
        }
    }
    return isFound;
}

/**
 * Splits a comma-delimited string into an array.
 *
 * @param (string) stList The string representing the list
 * @return (array) The list as an array
 */
PSG.Library.splitList = function(list) {
    if (list) {
        list = list.split(',');
    } else {
        list = new Array();
    }
    return list;
}
