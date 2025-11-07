/**
 * @author Sergio Arce - sarce@veic.org
 * @date   11/15/24
 * Script File:	otl_california.js
 * Script Name:	otl_california.js
 * Script Type:	Library
 * Description:	This will have all the Overtime Laws Logic from the State of California 
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 11/15/24   Sergio Arce        File Creation
 */

define([], function () {

    function calculateRegularPayHrs(workedHrs, totalHrs) {
        // Check if all values in workedHrs from index 0 to 5 are greater than 0
        const allGreaterThanZero = workedHrs.slice(0, 6).every(hour => hour > 0);
      
        // Helper function to calculate the sum product with the 'if' logic for values greater than 8
        function sumProduct(hours) {
          return hours.reduce((sum, hour) => sum + (hour > 8 ? 8 : hour), 0);
        }
      
        // Calculate the sum product for the relevant range of hours
        let result;
        if (allGreaterThanZero) {
          result = Math.min(40, totalHrs, sumProduct(workedHrs.slice(0, 6)));
        } else {
          result = Math.min(40, totalHrs, sumProduct(workedHrs.slice(0, 7)));
        }
      
        return result;
    }

    function calculateOvertime(workedHrs, totalHrs, doubleTimeHrs) {
        // Calculate the sum of workedHrs[0] to workedHrs[6] which is Monday to Sunday
        let totalWorkedHours = workedHrs.reduce((acc, val) => acc + val, 0);
        
        // Perform the final calculation
        let result = totalWorkedHours - totalHrs - doubleTimeHrs;
        
        return result;
    }

    function calculateDoubleOvertime(workedHrs) {
        let totalDoubleOvertime = 0;
        
        // Loop through worked hours (from workedHrs[0] to workedHrs[5]) which is Monday to Saturday
        for (let i = 0; i < 6; i++) {
            if (workedHrs[i] > 12) {
                totalDoubleOvertime += workedHrs[i] - 12;
            }
        }
        
        // Special condition for workedHrs[6] (workedHrs[6] is Sunday)
        if (workedHrs[0] > 0 && workedHrs[1] > 0 && workedHrs[2] > 0 && workedHrs[3] > 0 &&
            workedHrs[4] > 0 && workedHrs[5] > 0 && workedHrs[6] > 8) {
                totalDoubleOvertime += workedHrs[6] - 8;
        }
        
        return totalDoubleOvertime;
    }  

    return {
        calculateRegularPayHrs: calculateRegularPayHrs,
        calculateOvertime: calculateOvertime,
        calculateDoubleOvertime: calculateDoubleOvertime
    }
});

