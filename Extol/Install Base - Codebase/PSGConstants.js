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

/** 
 * SWE CONSTANTS 
 */

var PSG;
if (!PSG) PSG = {};
if (!PSG.Constants) PSG.Constants = {};

// Divisor for decimal places
PSG.Constants.TENTHS_DIVISOR      = 10;
PSG.Constants.HUNDREDTHS_DIVISOR  = 100;
PSG.Constants.THOUSANDTHS_DIVISOR = 1000;

// Logger Constants
PSG.Constants.START_LOG_MESSAGE = '=====Start=====';
PSG.Constants.END_LOG_MESSAGE   = '======End======';


// COnstatnts of larger units based on milliseconds.
PSG.Constants.MILLISEC_PER_MINUTE = 1000 * 60;
PSG.Constants.MILLISEC_PER_HOUR   = PSG.Constants.MILLISEC_PER_MINUTE * 60;
PSG.Constants.MILLISEC_PER_DAY    = PSG.Constants.MILLISEC_PER_HOUR * 24;

