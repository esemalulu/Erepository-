/**
 * @author Sergio Arce - sarce@veic.org
 * @date   11/15/24
 * Script File:	overtime_laws_main_function.js
 * Script Name:	overtime_laws_main_function.js
 * Script Type:	Library
 * Description:	This will have the main functions for the Overtime Laws project 
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 11/15/24   Sergio Arce        File Creation
 * 04/02/25   Sergio Arce        Added the Labor Cost Audit Log Record Creation 
 */

define([
    'N/record', 
    'SuiteScripts/Lib/veic_master_lib.js', 
    'SuiteScripts/Lib/Overtime_Laws/overtime_laws_extra_functions.js', 
    'SuiteScripts/Lib/Overtime_Laws/Special_States/otl_california.js',
    'SuiteScripts/Lib/Overtime_Laws/Special_States/otl_alaska_and_nevada.js',
    'SuiteScripts/Lib/Overtime_Laws/Special_States/otl_colorado.js',
    'SuiteScripts/Lib/Overtime_Laws/Special_States/otl_oregon.js',
    'SuiteScripts/Lib/Overtime_Laws/Regular_States/otl_regular_states.js',
    ], function (record, lib, libotlef, libotls_ca, libotls_ak_nv, libotls_co, libotls_or, libotls_rs) {
    //Declare Contract Type Values
    const SALARIED = '1'
    const HOURLY = '2'

    // Set Values for Overtime law Category
    const STANDARD = '1';
    const SPECIAL = '2';

    //Overtime Law for Special Work Location Values
    const ALASKA = '2'
    const CALIFORNIA = '5'
    const COLORADO = '6'
    const NEVADA = '28'
    const OREGON = '37'

    //Right now we are testing with Harjit Gill - ID: 7

    function calculateAdjustedRate(adjustedParam) {
        let adjustedLabourCostRate = 0;
        // Calculate Salaried
        if( adjustedParam.employeeContractType === SALARIED ){
        }

        // Calculate Hourly
        if( adjustedParam.employeeContractType === HOURLY ){
            log.debug('adjustedParam', adjustedParam);
            //SergioLogicBegins
            
            let stateType = libotlef.specialStateCheck(adjustedParam.workLocation);
            log.debug('stateType', stateType);
            let dateLogicValues = dateLogic(adjustedParam); 
            let masterArrayhrs = dateLogicValues[0];
            let masterArrayFull = dateLogicValues[1];
            log.debug('masterArrayhrs', masterArrayhrs);
            log.debug('masterArrayFull', masterArrayFull);
            let hrRate = adjustedParam.employeeProvisionalRate;
            let totalHrs = adjustedParam.hours;
            //Time Variables
            let regularPayHrs = 0;
            let doublePayHrs = 0;
            let regularOTPayHrs = 0;
            
            let extraTimeData;
            let hrRateOT = 0;
            let hrRateDT = 0;

            if(stateType === SPECIAL){
                //Overtime Variables
                extraTimeData = libotlef.getExtraTimeValues(adjustedParam.workLocation, SPECIAL);
                hrRateOT = extraTimeData[0].hrRateOT;
                hrRateDT = extraTimeData[0].hrRateDT;
                log.debug('hrRateOT Special', hrRateOT);
                log.debug('hrRateDT Special', hrRateDT);

                if( adjustedParam.workLocation === CALIFORNIA ) {
                    regularPayHrs = libotls_ca.calculateRegularPayHrs(masterArrayhrs, totalHrs);
                    doublePayHrs = libotls_ca.calculateDoubleOvertime(masterArrayhrs);
                    regularOTPayHrs = libotls_ca.calculateOvertime(masterArrayhrs, regularPayHrs, doublePayHrs)
                    log.debug('Final Numbers CA', regularPayHrs+'-'+regularOTPayHrs+'-'+doublePayHrs);
                }else if( adjustedParam.workLocation === ALASKA || adjustedParam.workLocation === NEVADA ) {
                    regularPayHrs = libotls_ak_nv.calculateRegularPayHrs(masterArrayhrs);
                    regularOTPayHrs = libotls_ak_nv.calculateOvertime(masterArrayhrs, regularPayHrs, totalHrs);
                    log.debug('Final Numbers AK-NV', regularPayHrs+'-'+regularOTPayHrs);
                }else if( adjustedParam.workLocation === COLORADO ) {
                    regularPayHrs = libotls_co.calculateRegularPayHrs(masterArrayhrs);
                    regularOTPayHrs = libotlef.calculateOvertime(masterArrayhrs, regularPayHrs);
                    log.debug('Final Numbers CO', regularPayHrs+'-'+regularOTPayHrs);
                }else if( adjustedParam.workLocation === OREGON ) {
                    regularPayHrs = libotls_or.calculateRegularPayHrs(masterArrayhrs);
                    regularOTPayHrs = libotlef.calculateOvertime(masterArrayhrs, regularPayHrs);
                    log.debug('Final Numbers OR', regularPayHrs+'-'+regularOTPayHrs);
                }
            }else if(stateType === STANDARD){
                //Overtime Variables
                extraTimeData = libotlef.getExtraTimeValues(adjustedParam.workLocation, STANDARD);
                hrRateOT = extraTimeData[0].hrRateOT;
                hrRateDT = extraTimeData[0].hrRateDT;
                log.debug('hrRateOT Standard', hrRateOT);
                log.debug('hrRateDT Standard', hrRateDT);

                regularPayHrs = libotls_rs.calculateRegularPayHrs(masterArrayhrs);
                regularOTPayHrs = libotlef.calculateOvertime(masterArrayhrs, regularPayHrs);
                log.debug('Final Numbers Regular States', regularPayHrs+'-'+regularOTPayHrs);
            }
            
            //The master calculation for both state types
            let hrsLogicData = hrsCalculationLogic(hrRate, hrRateOT, hrRateDT, regularPayHrs, regularOTPayHrs, doublePayHrs, adjustedParam, masterArrayFull);
            adjustedLabourCostRate = hrsLogicData[0];
            let newLCALRecId = hrsLogicData[1];
            //SergioLogicEnds

            //Update Employee Record Labor Cost Value with adjustedLabourCostRate
            libotlef.updateEmployeeRecord(adjustedParam.employeeId, adjustedLabourCostRate, newLCALRecId)
        }

        //return {jobCostVariance,adjustedLabourCostRate,overtimeRateCalculation}
        return adjustedLabourCostRate;
    }

    function dateLogic(adjustedParam){
        let fromDate = adjustedParam.fromDate;
        let toDate = adjustedParam.toDate;
        log.debug('fromDate', fromDate);
        log.debug('toDate', toDate);

        let fromDateD = new Date(fromDate);
        let toDateD = new Date(toDate);

        const getDatesBetween = (startDate, endDate) => {
            const dates = [];

            let currentDate = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate()
            );

            while (currentDate <= endDate) {
                dates.push(currentDate.toString());

                currentDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDate.getDate() + 1,
                );
            }

            return dates;
        };

        let daysRange = getDatesBetween(fromDateD, toDateD);
        log.debug('daysRange', daysRange);
        let masterArrayDays = [];
        for (let x = 0; x < daysRange.length; x++) {
            let dayR = new Date(daysRange[x]);
            masterArrayDays.push({'date': getDateFormat(dayR)}); 
        } 

        log.debug('masterArrayDays', masterArrayDays);

        let dailyHoursArrayF = adjustedParam.dailyHoursValues;
        
        log.debug('dailyHoursArrayF', dailyHoursArrayF);
        for (let d = 0; d < dailyHoursArrayF.length; d++) {
            let arrayValueM = dailyHoursArrayF[d];
            log.debug('arrayValueM', arrayValueM);
            for (let ii = 0; ii < masterArrayDays.length; ii++) {
                let dayRS = masterArrayDays[ii].date;
                if(dayRS == arrayValueM.date){
                    masterArrayDays[ii]['hrs'] = parseInt(arrayValueM.durationDecimal);
                    masterArrayDays[ii]['tbId'] = parseInt(arrayValueM.tbId);
                }
            }
        }

        for (let iii = 0; iii < masterArrayDays.length; iii++) {
            if(!lib.isNotEmpty(masterArrayDays[iii].hrs)){
                 masterArrayDays[iii]['hrs'] = 0;
            }
        }

        log.debug('masterArrayDays 2', masterArrayDays);

        let masterArrayhrs = [];
        for (let iiii = 0; iiii < masterArrayDays.length; iiii++) {
            let hrsR = masterArrayDays[iiii].hrs;
            masterArrayhrs.push(hrsR);
        }

        log.debug('masterArrayhrs', masterArrayhrs);

        return [masterArrayhrs, masterArrayDays];
    }

    function hrsCalculationLogic(hrRate, hrRateOT, hrRateDT, totalTime, totalHrsOT, totalHrsDT, adjustedParam, masterArrayFull){
        let regHrsTotal = totalTime*hrRate;
        let otTotal = (totalHrsOT*hrRateOT)*hrRate;
        let dotTotal = (totalHrsDT*hrRateDT)*hrRate;

        let totalMaxHrs = totalTime+totalHrsOT+totalHrsDT;

        let finalSubTotal = (regHrsTotal+otTotal+dotTotal);
        let finalTotal = finalSubTotal/totalMaxHrs;

        log.debug('totalTime','totalTime: '+totalTime);
        log.debug('totalTime $','totalTime: $'+regHrsTotal);

        log.debug('totalHrsOT','totalHrsOT: '+totalHrsOT);
        log.debug('totalHrsOT $','totalHrsOT: $'+otTotal);

        log.debug('totalHrsDT','totalHrsDT: '+totalHrsDT);
        log.debug('totalHrsDT $','totalHrsDT: $'+dotTotal);

        log.debug('Subtotal', 'Subtotal: $'+finalSubTotal);
        log.debug('finalTotal','finalTotal: $'+finalTotal.toFixed(2));

        //In here we are going to create the Labor Cost Audit Log Record
        let newLCALRecId = createLCAL(totalTime, regHrsTotal, totalTime, totalHrsOT, otTotal, totalHrsDT, dotTotal, finalSubTotal, finalTotal.toFixed(2), adjustedParam, masterArrayFull)
        log.debug('newLCALRecId', newLCALRecId);

        return [finalTotal.toFixed(2), newLCALRecId];
    }

    function getDateFormat(date){
        return ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
    }

    function createLCAL(totalTime, regHrsTotal, totalTime, totalHrsOT, otTotal, totalHrsDT, dotTotal, finalSubTotal, finalTotal, adjustedParam, masterArrayFull){
        let newLCAL = record.create({type:"customrecord_veic_labor_cost_audit_log"});
        
        //Record Information
        let nameStructure = "Labor Cost Audit Log Record For: "+adjustedParam.employee+" - From: "+adjustedParam.fromDate+" - To: "+adjustedParam.toDate;
        newLCAL.setValue({fieldId:"name",value: nameStructure});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_time_sheet",value: adjustedParam.timeSheetId});
        
        //Employee Fields Section
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_employee",value: adjustedParam.employeeId});
        
        let empRec = record.load({
            type: 'employee',
            id: adjustedParam.employeeId
        });

        let empLocation = empRec.getText({
            fieldId: 'cseg_veic_emp_loc'
        });
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_emp_location",value: empLocation});

        newLCAL.setValue({fieldId:"custrecord_veic_lcal_hourly_rate",value: adjustedParam.employeeProvisionalRate});
        
        //Week Section
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_one",value: masterArrayFull[0].hrs});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_two",value: masterArrayFull[1].hrs});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_three",value: masterArrayFull[2].hrs});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_four",value: masterArrayFull[3].hrs});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_five",value: masterArrayFull[4].hrs});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_six",value: masterArrayFull[5].hrs});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_seven",value: masterArrayFull[6].hrs});

        //Time Bill Record
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_one_tb",value: masterArrayFull[0].tbId});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_two_tb",value: masterArrayFull[1].tbId});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_three_tb",value: masterArrayFull[2].tbId});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_four_tb",value: masterArrayFull[3].tbId});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_five_tb",value: masterArrayFull[4].tbId});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_six_tb",value: masterArrayFull[5].tbId});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_seven_tb",value: masterArrayFull[6].tbId});

        //Total Hours Section
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_reg_pay_hrs",value: totalTime});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_ot_hrs",value: totalHrsOT});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_double_time_hrs",value: totalHrsDT});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_total_hrs",value: adjustedParam.hours});

        //Total Hours Pay Section
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_regular_pay",value: "$"+regHrsTotal.toFixed(2)});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_ot_pay",value: "$"+otTotal.toFixed(2)});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_double_time_pay",value: "$"+dotTotal.toFixed(2)});
        newLCAL.setValue({fieldId:"custrecord_veic_lcal_day_total",value: "$"+finalSubTotal.toFixed(2)});

        newLCAL.setValue({fieldId:"custrecord_veic_lcal_labor_cost",value: finalTotal});

        //Add dollar sign on Total Hrs Pay - DONE
        //Add 2 decimals to regular pay, OT Pay and DT Pay - DONE
        //Change the days from day 1 to Mon - to all - DONE
        //Add hyperlink to the hr on the week section

        let newLCALId = newLCAL.save()
        return newLCALId
    }

    return {
        calculateAdjustedRate: calculateAdjustedRate
    }
});

