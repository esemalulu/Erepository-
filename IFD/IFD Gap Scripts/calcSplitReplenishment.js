/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Oct 2016     rafe
 *
 */
/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function calcSplits(request, response) {

    var context = nlapiGetContext();
    var scriptAllowance = context.getRemainingUsage();
    nlapiLogExecution('DEBUG', 'Remaining usage', scriptAllowance);
    var today = new Date();
    var day = today.getDate();
    var month = (today.getMonth()) + 1;
    var year = today.getFullYear();
    var hour = parseInt(today.getHours()) + 2;
    var amPm = 'AM';
    if (hour >= 13) {
        hour = hour - 12;
        amPm = 'PM';
    }
    var minutes = today.getMinutes();
    if (minutes.length == 1) {
        minutes = '0' + minutes;
    }
    today = month + '/' + day + '/' + year + '       ' + hour + ':' + minutes + ' ' + amPm;
    // run search

    // Get master case data

    var masterData = nlapiSearchRecord('item', 'customsearch_master_case_item_search'); // Load the master Item data 

    if (!masterData) {
        return;
    }
    nlapiLogExecution('debug','masterData',masterData.length);




    // Get Splits Data
    var itemsResult = nlapiSearchRecord('item', 'customsearch_ifd_split_replen'); // Load the items to replenish 
    nlapiLogExecution('debug', 'started', today);

    if (!itemsResult) {
        nlapiLogExecution('debug', 'items to be replenished', 'None Found');
    }
    //if (itemsResult.length > 59){
    //	body =+ ' ***** Report Exceeds Maximum Length - This May Be A List of Requirements ******\n';
    // }

    if (itemsResult) {
        nlapiLogExecution('debug', 'items to be replenished', itemsResult.length);
        var c = ',';
        var report = 'Indianhead Foodservice Distributor,,,,Split Replenishment Report,,,,Date: ' + today +',Results,'+itemsResult.length+ '\n\n Split Item, Description, Master Item, Split PF, Split QOH, PF Max, Cases to Split, Master Cases Avail., Master Pick Face, Per Case Split, Actual\n\n';

        if (itemsResult.length > 999) {
            //body += ' ***** Report Exceeds Maximum Length - This May Be A Partial List of Requirements ******\n';
        }
        var max = 0;

        if (itemsResult.length > 999) {
            max = 999;
        }
        if (itemsResult.length < 999) {
            max = itemsResult.length;
        }


        //for (var j = 0; j < itemsResult.length; j++) {
        for (var j = 0; j < max; j++) {
            var columns = itemsResult[j].getAllColumns();
            var item = itemsResult[j].getValue(columns[0]);
            var itemText = itemsResult[j].getValue(columns[0]);
            var descritpion = itemsResult[j].getValue(columns[1]);
            var splitConversion = parseInt(itemsResult[j].getValue(columns[2]));
            var masterItem = itemsResult[j].getValue(columns[3]);
            var masterItemText = itemsResult[j].getText(columns[3]);
            var splitPickFace = itemsResult[j].getValue(columns[4]);
            var pickFaceMax = parseInt(itemsResult[j].getValue(columns[5]));
            var pickFaceMin = parseInt(itemsResult[j].getValue(columns[6]));
            var splitQoh = parseInt(itemsResult[j].getValue(columns[7]));
            var splitQty = parseInt(itemsResult[j].getValue(columns[8]));
            var splitAllocated = parseInt(itemsResult[j].getValue(columns[9]));
            var deficit = pickFaceMax - splitQoh;
            nlapiLogExecution('debug', 'splitQoh', splitQoh);
            nlapiLogExecution('debug', 'pickFaceMax', pickFaceMax);
            nlapiLogExecution('debug', 'deficit', deficit);
            nlapiLogExecution('debug', 'masterItem', masterItem);
            var casesToSplit = deficit / splitConversion;
            casesToSplit = Math.floor(casesToSplit);
            nlapiLogExecution('debug', 'casesToSplit', casesToSplit);
            if (casesToSplit > 0) {
            	var masterPF;
            	var masterAvail;
               
                var counter = masterData.length;
                for (var k = 0; k < counter; k++) {
                    var masterColumns = masterData[k].getAllColumns();
                    var resultItem = masterData[k].getValue(masterColumns[0]);
                    //var resultItem = masterData[k].getText(masterColumns[0]);
                    nlapiLogExecution('debug', 'resultItem', resultItem);
                    masterPF = masterData[k].getText(masterColumns[1]);
                    masterAvail = masterData[k].getValue(masterColumns[2]);
                   // report+='result item='+resultItem+' master Item '+masterItem+'\n';
                    if (resultItem == masterItemText) {                       
                        nlapiLogExecution('debug', 'masterPF', masterPF);
                        nlapiLogExecution('debug', 'counter', counter);
                        report += itemText + c +descritpion+c+ masterItemText + c + splitPickFace + c + splitQoh + c + pickFaceMax + c + casesToSplit + c + masterAvail + c + masterPF+c+splitConversion+c+'_____________________\n\n';
                        counter = masterData.length; //exit loop}
                    }
                    
                }
            
                
            }
        }
    }
    nlapiLogExecution('debug','report', report);
    var pickSheet = nlapiCreateFile('pickSheet.csv', 'CSV', report);
    pickSheet.setEncoding('UTF-8');           
  //save file to the file cabinet                   
    pickSheet.setFolder('1546');  
    var id = nlapiSubmitFile(pickSheet);
    nlapiSetRedirectURL('TASKLINK', 'LIST_MEDIAITEMFOLDER', '1546', false);// 20 points  
    
}