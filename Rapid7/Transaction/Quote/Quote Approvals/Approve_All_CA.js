/*
 * @author efagone
 */

function approveAllRecs(){

	var quoteId = nlapiGetRecordId();
	var userId = nlapiGetUser();
	
	if (quoteId != null && quoteId != '') {
        var nowDateTime = nlapiDateToString(new Date(), "datetimetz");

        var arrSearchFilters = new Array();
        arrSearchFilters[0] = new nlobjSearchFilter("custrecordr7approvalquote", null, "is", quoteId);
        arrSearchFilters[1] = new nlobjSearchFilter("custrecordr7approvalstatus", null, "anyof", new Array(1, 2, 4));

        var arrSearchColumns = new Array();
        arrSearchColumns[0] = new nlobjSearchColumn("custrecordr7approvalapprover");
        arrSearchColumns[1] = new nlobjSearchColumn("custrecordr7approvalcomments");

        var arrSearchResults = nlapiSearchRecord("customrecordr7approvalrecord", null, arrSearchFilters, arrSearchColumns);

        for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
            var searchResult = arrSearchResults[i];
            var approvalId = searchResult.getId();
            var currentApprover = searchResult.getText(arrSearchColumns[0]);
            var comments = searchResult.getValue(arrSearchColumns[1]);

            if (comments != null && comments != "") {
                comments = ": " + comments;
            }
            if (comments == null) {
                comments = "";
            }
            var newComments = "Approval Override (" + currentApprover + ")" + comments;

            var fields = new Array();
            fields[0] = "custrecordr7approvalcomments";
            fields[1] = "custrecordr7approvalstatus";
            fields[2] = "custrecordr7approvalapprover";
            fields[3] = "custrecordr7approvaldateresponded";

            var values = new Array();
            values[0] = newComments;
            values[1] = 3;
            values[2] = userId;
            values[3] = nowDateTime;

            nlapiSubmitField("customrecordr7approvalrecord", approvalId, fields, values);
        }

        nlapiSubmitField("estimate", quoteId, "custbodyr7quoteorderapprovalstatus", 3);

        //now email the approved quote to salesrep

        var fields = new Array();
        fields[0] = "salesrep";
        fields[1] = "tranid";
        fields[2] = "entity";
        fields[3] = "custbodyr7_approved_quote_pdf";

        var quoteValues = nlapiLookupField("estimate", quoteId, fields);
        var quoteText = nlapiLookupField("estimate", quoteId, fields, "text");

        var records = new Array();
        records["transaction"] = quoteId;

        var salesRep = quoteValues["salesrep"];
        var quoteNumber = quoteValues["tranid"];
        var customerName = quoteText["entity"];
        var salesRepText = quoteText["salesrep"];

        var subject = "Quote " + quoteNumber + " is approved";
        var body =
            "" +
            "CUSTOMER: " +
            customerName +
            "\nQUOTE: " +
            quoteNumber +
            "\nSALES REP: " +
            salesRepText +
            "\n\nYour Quote has been approved and is attached.";

        function setTimeout(aFunction, milliseconds) {
            var date = new Date();
            date.setMilliseconds(date.getMilliseconds() + milliseconds);
            while (new Date() < date) {}

            return aFunction();
        }
		nlapiLogExecution('DEBUG', 'email sent here', 'yes')
        // https://issues.corp.rapid7.com/browse/APPS-16546 delay email sending to give system some time to stamp APPROVED status on the quote, otherwise DRAFT background remains
        setTimeout(function () {
			var fileQuotePDFId =  quoteValues['custbodyr7_approved_quote_pdf'];
			var fileQuotePDF = fileQuotePDFId ? nlapiLoadFile(fileQuotePDFId) : nlapiPrintRecord("transaction", quoteId, "PDF");
            nlapiSendEmail(userId, salesRep, subject, body, null, null, records, fileQuotePDF);
        }, 1000);
    }
}