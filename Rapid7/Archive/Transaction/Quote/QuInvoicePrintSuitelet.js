/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 12 Jun 2017 akuznetsov
 * 
 */

//var QUINVOICE_ADV_PRINT_FORM_ID = 170;

/**
 * @param {nlobjRequest}
 *                request Request object
 * @param {nlobjResponse}
 *                response Response object
 * @returns {Void} Any output is written via response object
 */
//function renderRecord (request, response) {
//   if (request.getMethod() == 'GET') {
//        var quoteId = request.getParameter('quoteId');
//        var format = request.getParameter('format');
//        var tranId = request.getParameter('tranId');
//        if (format === undefined || format === null || format === '') {
//            format = 'PDF';
//        }
//        var props = new Array();
//        props.formnumber = QUINVOICE_ADV_PRINT_FORM_ID;
//        try{
//             var file = nlapiPrintRecord('TRANSACTION', quoteId, format, props);
//             var filename = tranId +'.pdf';
//            response.setContentType(file.getType(),filename, 'inline');
//            response.write(file.getValue());
//        }catch (e) {
//			// TODO: handle exception
//        	nlapiLogExecution('ERROR', 'Print Record', e);
//		}
        
 
//    }
//}


