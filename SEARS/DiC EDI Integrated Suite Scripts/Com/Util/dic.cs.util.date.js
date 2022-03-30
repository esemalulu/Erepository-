/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 1199 NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * 

 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */
define(['N/util',
        './dic.cs.util.string',
        '../dic.cs.mess',
        '../dic.cs.dierror',
        './dic.cs.util.validate'],

function(util,
		dicUtilString,
		diMess,
		diError,
		diValidate) {
	/**
	 * Define cost range year quarter
	 */
    var rangeYearQuarter = Object.freeze({
        "01": {//the first year quarter 
            id: "{year}01",
            text: "01/01/{year} - 3/31/{year}"
        },
        "02": {//the second year quarter
            id: "{year}02",
            text: "4/1/{year} - 6/30/{year}"
        },
        "03": {
            id: "{year}03",
            text: "7/1/{year} - 9/30/{year}"
        },
        "04": {
            id: "{year}04",
            text: "10/1/{year} - 12/31/{year}"
        }
    });
    
    /**
     * Build the quarter of the year from the current quarter to the end quarter of fiscal 
     */
    function _buildStartRangeQuarter(startDate){
    	return _createRangeQuarter(startDate.getMonth() + 1, 12, startDate.getFullYear());
    }
    
    /**
     * Build the quarter of the year from the beginning quarter to the current quarter
     */
    function _buildEndRangeQuarter(endDate){
    	return _createRangeQuarter(1, endDate.getMonth() + 1, endDate.getFullYear());
    }
    /**
	 * create an array of list year quarter, each item has key: yearquarter, text: range of the year quarter
	 */
    function buildRangeYearQuarter(startdate, enddate) {
        _validateRangeYearQuarter(startdate, enddate);
        var result = [];
    
        var startYear = startdate.getFullYear();
        var endYear = enddate.getFullYear();
        
        //only get the quarter in year
        if (startYear === endYear){
        	result = result.concat(_createRangeQuarter(startdate.getMonth(), enddate.getMonth(), startYear));
        }else{
             result = result.concat(_buildEndRangeQuarter(enddate));
             for(var index = --endYear; endYear > startYear; index--){
            	result = result.concat(_createRangeQuarter(1,12,index));
             }
             result = result.concat(_buildStartRangeQuarter(startdate));
        }
        return result;
    }
	 /**
     * Validate of date time format. 
     * @param {} date 
     * @param {} fieldName 
     * @returns {} 
     */
    function validateDate(date, fieldName) {
    	diValidate.validateRequire(date, fieldName);
        if (!util.isDate(date)) {
        	var err = new diError.DiError(diMess.ERR.INVALID.Code, dicUtilString.stringFormat(diMess.ERR.INVALID.Message, date));
        	throw err;
        }
        return true;

    }
	 /**
     * validate month 
     * true: month is numeric and value in range[1..12]
     */
    function validateMonth(month){
    	if(!util.isNumber(month) || month < 1 || month > 12){
    		var err = new diError.DiError(diMess.ERR.MONTH_IS_INVALID.Code,
    				dicUtilString.stringFormat(diMess.ERR.MONTH_IS_INVALID.Message, startDate, endDate));
    		throw err;
    	}
    	return true;
    }
    
    /**
     * Determine the quarter by month
     */
    function getQuarterByMonth(month){
    	if (month <= 3) return "01";
    	if (month <= 6) return "02";
    	if (month <= 9) return "03";
    	return "04";
    }
    /**
     * Validate month quarter
     * throw Diexception with errorcode 90005,90004 when the rang is invalid
     */
    function _validateRangeMonthQuarter(startMonth, endMonth){
    	validateMonth(startMonth);
    	validateMonth(endMonth);
    	if (startMonth > endMonth){
    		var err = new diError.DiError(diMess.ERR.RANGE_MONTH_INVALID.Code,
    				dicUtilString.stringFormat(diMess.ERR.RANGE_MONTH_INVALID.Message, startMonth, endMonth));
    		throw err;
            
    	}
    	return true;
    }
    
    /**
     * Validate range quarter 
     */
    function _createRangeQuarter(startMonth, endMonth, year){
      	_validateRangeMonthQuarter(startMonth, endMonth);
      	var start = getQuarterByMonth(startMonth);
      	var end = getQuarterByMonth(endMonth);
      	var result = [];
      	for(var index = parseInt(end); index >= parseInt(start); index--){
      		var defaultRange = rangeYearQuarter["0" + index.toString()];
      		var valId =defaultRange.id.replace(/{year}/g, year.toString()); 
      		var valYear = defaultRange.text.replace(/{year}/g, year.toString())
      		result.push({
      			id:valId,
      			text: valYear
      		});
      	}
      	return result;
   
    }
    /**
	 * create an array of list year quarter, each item has key: yearquarter, text: range of the year quarter
	 */
    function buildRangeYearQuarter(startdate, enddate) {
        validateRangeYearQuarter(startdate, enddate);
        var result = [];
    
        var startYear = startdate.getFullYear();
        var endYear = enddate.getFullYear();
        
        //only get the quarter in year
        if (startYear === endYear){
        	result = result.concat(_createRangeQuarter(startdate.getMonth() + 1, enddate.getMonth() +  1, startYear));
        }else{
             result = result.concat(_buildEndRangeQuarter(enddate));
             for(var index = --endYear; endYear > startYear; index--){
            	result = result.concat(_createRangeQuarter(1,12,index));
             }
             result = result.concat(_buildStartRangeQuarter(startdate));
        }
        return result;
    }
    

    /**
     * Validate range date [start date ... end date]
     */    
    function validateRangeYearQuarter(startDate, endDate) {
    	validateDate(startDate, "start date");
    	validateDate(endDate, "end date");

        if (startDate > endDate) {
        	var err = new diError.DiError(diMess.ERR.RANGE_YEAR_INVALID.Code,
        			dicUtilString.stringFormat(diMess.ERR.RANGE_YEAR_INVALID.Message, startDate, endDate));
        	throw err;
        }
        return true;
    }
    /**
     * Entry points
     */
    
    return {
    	validateMonth: validateMonth,
    	getQuarterByMonth: getQuarterByMonth,
    	validateDate:validateDate,
    	buildRangeYearQuarter: buildRangeYearQuarter,
    	validateRangeYearQuarter:validateRangeYearQuarter
    };
    
});
