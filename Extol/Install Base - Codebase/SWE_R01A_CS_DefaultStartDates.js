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


/**
 * This script populates the Default Start Date & End Date of the transaction only on Create event
 *
 * @param (string) stEventType The type of event triggering this function
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function pageInit_DefaultStartDate(stEventType)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'Default Start Dates';
    //logger.enableDebug(); //comment this line to disable debug

    if (stEventType == "create")
    {

        logger.debug(MSG_TITLE, '=====Start=====');

        var stTranDate = nlapiGetFieldValue('trandate');
        if (stTranDate == null || stTranDate == undefined || stTranDate == '')
        {
            stTranDate = nlapiDateToString(new Date());
            nlapiSetFieldValue('startdate', stTranDate);
        }

        var dtStartDate = nlapiStringToDate(stTranDate);
        var dtEndDate = nlapiStringToDate(stTranDate);
        dtEndDate = nlapiAddDays(nlapiAddMonths(dtEndDate, 12), -1);
        logger.debug(MSG_TITLE, 'Start Date =' + dtStartDate);
        logger.debug(MSG_TITLE, 'End Date =' + dtEndDate);

        nlapiSetFieldValue('startdate', nlapiDateToString(dtStartDate));
//        nlapiSetFieldValue('enddate',nlapiDateToString(dtEndDate));

        logger.debug(MSG_TITLE, '======End======');
    }
}


function fieldChanged_computeEndDate(stType, stName, iLineNum)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'Compute End Dates';
    //logger.enableDebug(); //comment this line to disable debug

    /* Update End Date if Term in Months changed */
    if (stName == 'custbody_tran_term_in_months')
    {
        var iTerm = nlapiGetFieldValue('custbody_tran_term_in_months');
        logger.debug(MSG_TITLE, 'Term:' + iTerm);
        if (iTerm != null && iTerm != undefined && iTerm != '')
        {
            iTerm = parseInt(iTerm);
            var stStartDate = nlapiGetFieldValue('startdate');
            logger.debug(MSG_TITLE, 'Start Date:' + stStartDate);
            if (stStartDate != null && stStartDate != undefined && stStartDate != '')
            {
                nlapiSetFieldValue('enddate', nlapiDateToString(nlapiAddDays(nlapiAddMonths(nlapiStringToDate(stStartDate), iTerm), -1)), false);
                logger.debug(MSG_TITLE, 'End Date:' + nlapiDateToString(nlapiAddMonths(nlapiStringToDate(stStartDate), iTerm)));
            }
        }
    }

    /* Update End Date if Start Date changed */
    if (stName == 'startdate')
    {
        var stStartDate = nlapiGetFieldValue('startdate');
        logger.debug(MSG_TITLE, 'Start Date:' + stStartDate);
        if (stStartDate != null && stStartDate != undefined && stStartDate != '')
        {
            var iTerm = nlapiGetFieldValue('custbody_tran_term_in_months');
            logger.debug(MSG_TITLE, 'Term:' + iTerm);
            if (iTerm != null && iTerm != undefined && iTerm != '')
            {
                iTerm = parseInt(iTerm);
                nlapiSetFieldValue('enddate', nlapiDateToString(nlapiAddDays(nlapiAddMonths(nlapiStringToDate(stStartDate), iTerm), -1)), false);
                logger.debug(MSG_TITLE, 'End Date:' + nlapiDateToString(nlapiAddMonths(nlapiStringToDate(stStartDate), iTerm)));
            }
        }
    }
}


/**
 * This script populates the Rev Rec Start Date if it is empty and if the item category is of a specific type.
 *
 * @param (string) stListName The list where this is being executed
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function validateLine_defaultRevRecStartDate(stListName)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'Default Start Dates';
    //Maintenance Item
    var MSCONTRACT_TYPE =  '7';
    var MIDDLEOFMONTH = '15';
    
    //logger.enableDebug(); //comment this line to disable debug

    if (stListName == "item")
    {
        logger.debug(MSG_TITLE, '=====Start=====');

        var arrItemCatsToProcess = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_dflt_tran_start_dte_item_cats'));
        var stItemCat = nlapiGetCurrentLineItemValue('item', 'custcol_item_category');
        logger.debug(MSG_TITLE, 'arrItemCatsToProcess=' + arrItemCatsToProcess);
        logger.debug(MSG_TITLE, 'stItemCat=' + stItemCat);

        if (searchInList(arrItemCatsToProcess, stItemCat))
        {
            var stContractType = nlapiGetCurrentLineItemValue('item', 'custcol_quantity_type');
            var stStartDate = nlapiGetFieldValue('startdate');
            var iTermInMonths = nlapiGetFieldValue('custbody_tran_term_in_months');
            logger.debug(MSG_TITLE, 'Start Date =' + stStartDate);
            logger.debug(MSG_TITLE, 'Term in Months =' + iTermInMonths);

            if (stStartDate == null || stStartDate == undefined || stStartDate == '')
            {
                stStartDate = nlapiDateToString(new Date());
            }

            if (iTermInMonths == null || iTermInMonths == undefined || iTermInMonths == '')
            {
                iTermInMonths = 12;
            }

            var stOldTermInMonths = nlapiGetCurrentLineItemValue('item', 'revrecterminmonths');
            var stOldRevRecStartDate = nlapiGetCurrentLineItemValue('item', 'revrecstartdate');
            var stOldRevRecEndDate = nlapiGetCurrentLineItemValue('item', 'revrecenddate');

            if (stOldRevRecStartDate == null || stOldRevRecStartDate == undefined || stOldRevRecStartDate == '')
            {
                logger.debug(MSG_TITLE, 'Setting Rev Rec Start Date');
                nlapiSetCurrentLineItemValue('item', 'revrecterminmonths', '', false);
                nlapiSetCurrentLineItemValue('item', 'revrecenddate', '', false);
                nlapiSetCurrentLineItemValue('item', 'revrecstartdate', '', false);
                /* */
                if( stContractType == MSCONTRACT_TYPE ) 
                {    
                    var stTranDate     = nlapiStringToDate(stStartDate);     
                    var stTranDay      = stTranDate.getDate(); //Returns Day in Month          
                    if(stTranDay <= MIDDLEOFMONTH ) 
                    {
                        var firstDayOfMonthDate = new Date(stTranDate.getFullYear(), stTranDate.getMonth(),"1");
                        nlapiSetCurrentLineItemValue('item', 'revrecstartdate', nlapiDateToString(firstDayOfMonthDate), true);
                    } 
                    else 
                    {
                        //Add one month to transaction date
                        var stNextMonth  = nlapiAddMonths(stTranDate,1);
                        var firstDayNextMonthDate = new Date(stNextMonth.getFullYear(), stNextMonth.getMonth(),"1");    
                        nlapiSetCurrentLineItemValue('item', 'revrecstartdate', nlapiDateToString(firstDayNextMonthDate), true);
                    }
                } 
                else 
                {
                    nlapiSetCurrentLineItemValue('item', 'revrecstartdate', stStartDate, true);
                }   
                 
            }

            if (stOldTermInMonths == null || stOldTermInMonths == undefined || stOldTermInMonths == '')
            {
                logger.debug(MSG_TITLE, 'Setting Rev Rec Term In Months');
                nlapiSetCurrentLineItemValue('item', 'revrecterminmonths', iTermInMonths, true);
            }
            else
            {
                nlapiSetCurrentLineItemValue('item', 'revrecterminmonths', stOldTermInMonths, true);
            }

        }

        logger.debug(MSG_TITLE, '======End======');
    }
    return true;
}