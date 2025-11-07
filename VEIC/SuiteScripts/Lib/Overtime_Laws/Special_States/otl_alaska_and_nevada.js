/**
 * @author Sergio Arce - sarce@veic.org
 * @date   11/15/24
 * Script File:	otl_alaska_and_nevada.js
 * Script Name:	otl_alaska_and_nevada.js
 * Script Type:	Library
 * Description:	This will have all the Overtime Laws Logic from the State of Alaska and Nevada 
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 11/18/24   Sergio Arce        File Creation
 */

define([], function () {

    function calculateRegularPayHrs(workedHrs) {
        // Sum the minimum of each worked hour and 8
        const totalHours = workedHrs.reduce((sum, hours) => sum + Math.min(hours, 8), 0);
        
        // Return the minimum of 40 and the calculated total hours
        return Math.min(40, totalHours);
    }

    function calculateOvertime(workedHrs, totalHrs, totalFHrs) {
        let excessHours = workedHrs.reduce((sum, hrs) => {
        return sum + (hrs > 8 ? hrs - 8 : 0);
        }, 0);

        // Final calculation of the result (MAX part of the formula)
        let result = Math.max(excessHours, totalFHrs - totalHrs);

        return result;
    }

    return {
        calculateRegularPayHrs: calculateRegularPayHrs,
        calculateOvertime: calculateOvertime
    }
});

