/**
 * @NApiVersion 2.x
 */
define(['N/search', 'N/record', 'N/file', 'N/xml', 'N/format', 'N/render', '../2.x/GD_Common.js', '../2.x/GD_Constants.js'],
    
    function(search, record, file, xml, format, render, GD_Common, GD_Constants) {

        /**
         * Generates the PDF for the checks
         * 
         * @param {string} procRecId - The id of the processing Record
         * @returns {file.file} - The PDF to be downloaded.
         */
        function getPdf(procRecId) {
            var procRec = record.load({
                type: 'customrecordgd_printdealerrefunds_proc',
                id: procRecId,
                isDynamic: true
            });
            var refundIds = procRec.getValue({fieldId: 'custrecordgd_dealerrefundsproc_refunds'});

            var html = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>";
            var htmlArray = [];
            if (refundIds != null) {

                var dealerRefundsToPrintGrouped = getSearchResults(refundIds, true);
                var dealerRefundsToPrint = getSearchResults(refundIds, false);
                dealerRefundsToPrint.sort(sortCreditMemoResults);
                
                if (dealerRefundsToPrintGrouped != null) {
                    for (var i = 0; i < dealerRefundsToPrintGrouped.length; i++) {
                        if (i%100 == 0 && i != 0) {
                            html = html + '</pdf>';
                            htmlArray.push(html);
                            html = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>";
                        }
                        var dealerRefundId = dealerRefundsToPrintGrouped[i].getValue({name: 'internalid', join: 'appliedToTransaction', summary: 'GROUP'});
                        html = html + getDealerRefundCheckHTML(dealerRefundId, dealerRefundsToPrint);
                    }
                    html = html + '</pdf>';
                    htmlArray.push(html);
                } else {
                    htmlArray.push(html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' + '&nbsp;' + '</body>' + '</pdf>');
                }
            } else {
                htmlArray.push(html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' + '&nbsp;' + '</body>' + '</pdf>');
            }
            return splicePdfs(htmlArray);
        }

        /**
         * Generates the PDF for a single check
         * 
         * @param {string} refundId - The id of the refund check to be printed
         * @returns {file.file} - The PDF to be downloaded.
         */
        function getSingleCheckPdf(refundId) {
            var html = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>";
            if (refundId) {
                var dealerRefundsToPrint = getSearchResults([refundId], false);
                dealerRefundsToPrint.sort(sortCreditMemoResults);
                if (dealerRefundsToPrint.length > 0) {
                    html = html + getDealerRefundCheckHTML(refundId, dealerRefundsToPrint);
                } else {
                    html = html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">'
                    + 'The Dealer Refund that you have tried to print has already been applied'
                    + ' and the check could not be printed.' + '</body>';
                }
            } else {
                html = html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' + '&nbsp;' + '</body>';
            }
            html = html + '</pdf>';
            return render.xmlToPdf({xmlString: html});
        }

        /**********Helper Functions for the Helper Functions**********/

        /**
         * Gets the search data for pdf generation
         * 
         * @param {Array} refundIds
         * @returns {search.ResultSet}
         */
        function getSearchResults(refundIds, grouped) {
            var filters = [];
            filters.push(["type","anyof","CustCred"]); 
            filters.push("AND");
            filters.push(["appliedtotransaction.type","anyof","CustRfnd"]);
            filters.push("AND");
            filters.push(["mainline","is","T"]);
            filters.push("AND");
            filters.push(["appliedtolinkamount","notequalto","0.00"]);
            filters.push("AND");
            filters.push(["appliedtotransaction.internalid", "anyof", refundIds]);

            var columns = [];
            if (grouped) {
                columns.push(search.createColumn({name: "internalid", join: "appliedToTransaction", summary: "GROUP"}));
                columns.push(search.createColumn({name: "appliedtotransaction", summary: "GROUP"}));
                columns.push(search.createColumn({name: "custbodyrvstobeprinted", join: "appliedToTransaction", summary: "GROUP"}));
                columns.push(search.createColumn({name: "amount", join: "appliedToTransaction", summary: "GROUP"}));
                columns.push(search.createColumn({name: "entity", join: "appliedToTransaction", summary: "GROUP"}));
                columns.push(search.createColumn({name: "tranid", join: "appliedToTransaction", summary: "GROUP", sort: search.Sort.ASC}));
                columns.push(search.createColumn({name: "trandate", join: "appliedToTransaction", summary: "GROUP"}));
            } else {
                columns.push(search.createColumn({name: "internalid", join: "appliedToTransaction"}));
                columns.push("appliedtotransaction");
                columns.push(search.createColumn({name: "tobeprinted", join: "appliedToTransaction"}));
                columns.push(search.createColumn({name: "amount", join: "appliedToTransaction"}));
                columns.push(search.createColumn({name: "trandate", join: "appliedToTransaction"}));
                columns.push(search.createColumn({name: "tranid", join: "appliedToTransaction"}));
                columns.push("appliedtolinktype");
                columns.push("appliedtolinkamount");
                columns.push("trandate");
                columns.push(search.createColumn({name: "tranid", sort: search.Sort.ASC}));
                columns.push("entity");
                columns.push("custbodyrvsentityprintoncheckas");
                columns.push("memo");
                columns.push("otherrefnum");
                columns.push("amount");
                columns.push("custbodyrvsunit");
                columns.push(search.createColumn({name: "id", join: "CUSTBODYRVSCREATEDFROMCLAIM"}));
                columns.push(search.createColumn({name: "id", join: "CUSTBODYRVSCREATEDFROMSPIFF"}));
                columns.push(search.createColumn({name: "billaddress", join: "appliedToTransaction"}));
                columns.push("statusref");
                columns.push("billaddress1");
                columns.push("billaddress2");
                columns.push("billaddressee");
                columns.push("billattention");
                columns.push("billcountry");
                columns.push("billcity");
                columns.push("billstate");
                columns.push("billzip");
                columns.push("location");
            }

            var searchPages = search.create({
                type: search.Type.CREDIT_MEMO,
                filters: filters,
                columns: columns
            }).runPaged({pageSize: 1000});

            var allResults = new Array();
            searchPages.pageRanges.forEach(function(pageRange) {
                searchPages.fetch({
                    index : pageRange.index
                }).data.forEach(function(result) {
                    allResults.push(result);
                })
            });
            return allResults
        }

        /**
         * Return the HTML for a given refund check
         * 
         * @param {string} dealerRefundId
         * @param {integer} dealerRefundsToPrint
         * @returns {string} xml string for the given Dealer Refund Check
         */
        function getDealerRefundCheckHTML(dealerRefundId, dealerRefundsToPrint) {
            var checkHTML = '';
            var creditMemos = getCreditMemoElements(dealerRefundId, dealerRefundsToPrint);

            if (creditMemos != null && creditMemos.length > 0) {
                var element = creditMemos[0];

                var printOnCheckAs = xml.escape({xmlText: element.getValue({name: 'custbodyrvsentityprintoncheckas'})});
                if (printOnCheckAs == null || printOnCheckAs == '')
                    printOnCheckAs = xml.escape({xmlText: element.getText({name: 'entity'})});
                 
                var amount = element.getValue({name: 'amount', join: 'appliedToTransaction'});
                var checkNumber = element.getValue({name: 'tranid', join: 'appliedToTransaction'});
                
                var date = format.parse({value: element.getValue({name: 'trandate', join: 'appliedToTransaction'}), type: format.Type.DATE});
                var dateString = date.getMonth()+1 + '/' + date.getDate() + '/' + date.getFullYear();
                 
                var addressee = xml.escape({xmlText: element.getValue({name: 'billaddressee'})});
                var address1 = xml.escape({xmlText: element.getValue({name: 'billaddress1'})});
                var address2 = xml.escape({xmlText: element.getValue({name: 'billaddress2'})}) || '';
                var voucherSection1TopPaddingPx = '115px';
                var voucherSection2TopPaddingPx = '45px';
                if  (address2 != '') {
                    address1 =  address1 + '<br />' + address2;
                    voucherSection1TopPaddingPx = '100px';
                    voucherSection2TopPaddingPx = '30px';
                }
            
                var city = xml.escape({xmlText: element.getValue({name: 'billcity'})});
                var state = xml.escape({xmlText: element.getValue({name: 'billstate'})});
                var zip = xml.escape({xmlText: element.getValue({name: 'billzip'})});
                var country = element.getValue({name: 'billcountry'});
                if (country == null) {
                     country = '';
                } else if (country == 'CA') {
                    country = 'Canada';
                }
                country = xml.escape({xmlText: country});
                var attention = xml.escape({xmlText: element.getValue({name: 'billattention'})});
                var attentionHTML = '';
                if (attention != null && attention != '') {
                    attentionHTML = '<tr>' + 
                                        '<td style="width:50px;">' + 
                                            '&nbps;' + 
                                        '</td>' +
                                        '<td>' + 
                                            attention +
                                        '</td>' +
                                    '</tr>';
                }
                
                // need ** in front so that the total length of this string is 8
                var amountWithPadding = GD_Common.addCommas(GD_Common.paddingLeft(amount, '*', 8));

                // remove the cents from the amount so that when we spell out the amount, the cents comes in as 10/100 instead of the wording
                var amountNoCents = amount.substr(0, amount.indexOf('.'));
                var amountCents = amount.substr(amount.indexOf('.')+1, amount.length-amount.indexOf('.')) + '/100';
                if (amountCents.length == 1)
                    amountCents += '0';

                var amountInEnglish = GD_Common.convertCurrencyToEnglish(amountNoCents);
        
                var totalAmountString = GD_Common.addCommas(format.format({value: Math.abs(amount), type: format.Type.CURRENCY}));

                // 91 spaces total on the number line
                // capitalize the first character
                var amountInEnglishWithPadding = GD_Common.paddingRight(amountInEnglish + ' and ' + amountCents, '*', 109);
                amountInEnglishWithPadding = amountInEnglishWithPadding.charAt(0).toUpperCase() + amountInEnglishWithPadding.substr(1,amountInEnglishWithPadding.length-1);
                
                var claimsPerPage = 19;

                // there are two different sections separated only by the padding
                var voucherLineSection1 = getVoucherHeaderSection(voucherSection1TopPaddingPx, printOnCheckAs, totalAmountString, checkNumber, dateString, 0);                
                var voucherLineSection2 = getVoucherHeaderSection(voucherSection2TopPaddingPx, printOnCheckAs, totalAmountString, checkNumber, dateString, 381);
                
                var voucherLinesInner = '';

                for (var i=0; i<claimsPerPage; i++) {
                    if (creditMemos[i] != null) {
                        var unit = xml.escape({xmlText: creditMemos[i].getText({name: 'custbodyrvsunit'})});
                        var claimId = xml.escape({xmlText: creditMemos[i].getValue({name: 'id', join: 'custbodyrvscreatedfromclaim'})});
                        var spiffId = xml.escape({xmlText: creditMemos[i].getValue({name: 'id', join: 'custbodyrvscreatedfromspiff'})});
                        var claimAmount = GD_Common.addCommas(format.format({value: Math.abs(parseFloat(creditMemos[i].getValue({name: 'amount'}))), type: format.Type.CURRENCY}));
                        var amountPaid = GD_Common.addCommas(format.format({value: Math.abs(parseFloat(creditMemos[i].getValue({name: 'appliedtolinkamount'}))), type: format.Type.CURRENCY}));
                        var creditMemoDate = creditMemos[i].getValue({name: 'trandate'});
                        
                        var poNumber = creditMemos[i].getValue({name: 'otherrefnum'});
                        var memo = creditMemos[i].getValue({name: 'memo'});
                        
                        if (poNumber != null && poNumber != '') {
                            poNumber = xml.escape({xmlText: poNumber});
                        } else {
                            poNumber = '';
                        }
                        
                        var maxMemoPOLength = 200;   
                        if (poNumber.length > maxMemoPOLength) {
                            poNumber = poNumber.substring(0, maxMemoPOLength);
                        }
                            
                        if (memo != null && memo != '') {
                            memo = xml.escape({xmlText: memo});
                        } else {
                            memo = '';  
                        }
                            
                        if (memo.length > maxMemoPOLength) {
                            memo = memo.substring(0, maxMemoPOLength);
                        }
                            
                        if (claimId != '') {
                            claimId = 'Claim #' + claimId;      
                        }
                            
                        if (spiffId != '') {
                            claimId = 'Spiff #' + spiffId;
                        }
                        
                        voucherLinesInner += 
                            '<tr>' + 
                                '<td style="padding-top:20px;">' + 
                                    creditMemoDate + 
                                '</td>' +
                                '<td>' + 
                                    claimId + 
                                '</td>' +
                                '<td>' + 
                                    poNumber + 
                                '</td>' +
                                '<td style="word-wrap: break-word; padding: 1px;">' + 
                                    memo + 
                                '</td>' +
                                '<td align="right">' + 
                                '</td>' +
                                '<td>' + 
                                    unit + 
                                '</td>' +
                                '<td align="right">' + 
                                    claimAmount + 
                                '</td>' +
                                '<td align="right">' + 
                                    amountPaid + 
                                '</td>' +
                            '</tr>';
                    } else {
                        voucherLinesInner += 
                            '<tr>' + 
                                '<td style="padding-top:20px;">' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                                '<td>' + 
                                    '&nbsp;' + 
                                '</td>' +
                            '</tr>';
                    }            
                }
                voucherLineSection1 += voucherLinesInner + '</table>';
                voucherLineSection2 += voucherLinesInner + '</table>';
                 
                checkHTML = 
                    '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' +
                        '<table width="100%" cellpadding="0" style="padding-top:0px; padding-left:8px;">' +
                            '<tr>' + 
                                '<td>' + 
                                    '<table width="100%" cellpadding="0" style="padding-top:5px;">' +
                                        '<tr>' + 
                                            '<td style="width:630px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td style="font-size:6pt;">' + 
                                                checkNumber + 
                                            '</td>' +
                                        '</tr>' +  
                                    '</table>' + 
                                '</td>' +
                            '</tr>' +  
                            '<tr>' + 
                                '<td>' + 
                                    '<table width="100%" cellpadding="0" style="padding-top:5px;">' +
                                        '<tr>' + 
                                            '<td style="width:575px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td>' + 
                                                dateString + 
                                            '</td>' +
                                        '</tr>' +  
                                    '</table>' + 
                                '</td>' +
                            '</tr>' +  
                            '<tr>' + 
                                '<td>' + 
                                    '<table width="100%" cellpadding="0" style="padding-top:25px;">' +
                                        '<tr>' + 
                                            '<td style="width:55px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td style="width:520px;">' + 
                                                printOnCheckAs + 
                                            '</td>' +
                                            '<td>' + 
                                                '&nbsp; &nbsp;' + amountWithPadding + 
                                            '</td>' +
                                        '</tr>' +  
                                    '</table>' + 
                                '</td>' +
                            '</tr>' +  
                            '<tr>' + 
                                '<td>' + 
                                    '<table width="100%" cellpadding="0" style="padding-top:25px;">' +
                                        '<tr>' + 
                                            '<td style="width:0px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td>' + 
                                                amountInEnglishWithPadding +
                                            '</td>' +
                                        '</tr>' +  
                                    '</table>' + 
                                '</td>' +
                            '</tr>' + 
                            '<tr>' + 
                                '<td>' + 
                                    '<table width="100%" cellpadding="0" style="padding-top:12px;">' +
                                        '<tr>' + 
                                            '<td style="width:50px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td>' + 
                                                addressee +
                                            '</td>' +
                                        '</tr>' +  
                                        attentionHTML + 
                                        '<tr>' + 
                                            '<td style="width:50px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td>' + 
                                                address1 +
                                            '</td>' +
                                        '</tr>' + 
                                                address2 + 
                                        '<tr>' + 
                                            '<td style="width:50px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td>' + 
                                                city + ', ' + state + ' ' + zip +
                                            '</td>' +
                                        '</tr>' +
                                        '<tr>' + 
                                            '<td style="width:50px;">' + 
                                                '&nbps;' + 
                                            '</td>' +
                                            '<td>' + 
                                                country +
                                            '</td>' +
                                        '</tr>' +  
                                    '</table>' + 
                                '</td>' +
                            '</tr>' + 
                            '<tr>' + 
                                '<td>' + 
                                    voucherLineSection1 +
                                '</td>' +
                            '</tr>' + 
                            '<tr>' + 
                                '<td>' + 
                                    voucherLineSection2 +
                                '</td>' +
                            '</tr>' + 
                        '</table>' +  
                    '</body>';
            }
            return checkHTML;
        }

        /**
         * Returns an array of search elements by refund. These elements are credit memos and are used for the voucher.
         * 
         * @param {string} dealerRefundId
         * @returns {integer} dealerRefundsToPrint
         */
        function getCreditMemoElements(dealerRefundId, dealerRefundsToPrint) {
            var creditMemos = null;
            var dealerRefundIdFoundStartIndex = null;
            for (i=0; i < dealerRefundsToPrint.length; i++) {
                var tempDealRefundId = dealerRefundsToPrint[i].getValue({name: 'internalid', join: 'appliedToTransaction'});
                if (tempDealRefundId == dealerRefundId)
                {
                    // found the start index so break
                    dealerRefundIdFoundStartIndex = i;
                    break;
                }
            }

            if (dealerRefundIdFoundStartIndex != null)
            {
                // loop looping to find all the credits for the dealer refund
                // return the list of credit memos
                
                var index = dealerRefundIdFoundStartIndex;
                creditMemos = new Array();
                while (index < dealerRefundsToPrint.length)
                {
                    var tempDealRefundId = dealerRefundsToPrint[index].getValue({name: 'internalid', join: 'appliedToTransaction'});
                    if (tempDealRefundId == dealerRefundId)
                    {
                        creditMemos[creditMemos.length] = dealerRefundsToPrint[index];
                    }
                    else
                    {
                        index = dealerRefundsToPrint.length+1;
                    }
                    
                    index++;
                }
            }

            return creditMemos;
        }

        /**
         * Returns the voucher header section of HTML code.
         * 
         * @param {string} paddingTopPixels - number of pixels of padding to add to the top
         * @param {string} printOnCheckAs - The name to be printed on the check
         * @param {string} totalAmountString - the total amount
         * @param {string} checkNumber - the check number
         * @param {string} dateString - date
         * @returns {string} html string for the voucher header
         */
        function getVoucherHeaderSection(paddingTopPixels, printOnCheckAs, totalAmountString, checkNumber, dateString, topPadding)
        {
            var html = 
                '<table width="100%" cellpadding="0" style="position:absolute; top: ' + topPadding + 'px; padding-top:' + paddingTopPixels + '; font-size:8pt;">' +
                    '<tr>' + 
                        '<td style="font-style:italic;" colspan="5">' + 
                            printOnCheckAs + ' - $' + totalAmountString + ' - Check #' + checkNumber + ' - ' + dateString +
                        '</td>' +
                    '</tr>' + 
                    '<tr>' + 
                        '<td colspan="5">' + 
                            '&nbsp;' + 
                        '</td>' +
                    '</tr>' +
                    '<tr>' + 
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:8%;">' + 
                            'Date' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:17%;">' + 
                            'Claim/Spiff #' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:15%;">' + 
                            'PO #' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:18%; word-wrap: break-word;">' + 
                            'Memo' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:1%;">' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:15%;">' + 
                            'VIN' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:13%;" align="right">' + 
                            'Claim Total' + 
                        '</td>' +
                        '<td style="font-weight:bold; border-bottom:1px solid black; width:13%;" align="right">' + 
                            'Amt Paid' + 
                        '</td>' +
                    '</tr>';

            return html;
        }

        /**
         * Sort the credit memo results by refund id and then credit memo number.
         * 
         * @param {search.searchResult} element1
         * @param {search.searchResult} element2
         * @returns {integer}
         */
        function sortCreditMemoResults(element1, element2) {
            var e1InternalId = parseInt(element1.getValue({name: 'internalid', join: 'appliedToTransaction'}));
            var e1TranId = parseInt(element1.getValue({name: 'tranid'}));
            var e2InternalId = parseInt(element2.getValue({name: 'internalid', join: 'appliedToTransaction'}));
            var e2TranId = parseInt(element2.getValue({name: 'tranid'}));

            if (e1InternalId > e2InternalId) {
                return 1;
            }
            else if (e1InternalId < e2InternalId) {
                return -1;
            }
            else
            {
                if (e1TranId > e2TranId) {
                    return 1;
                }
                else if (e1TranId < e2TranId) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
        }

        /**
         * Takes in an array of html strings, makes each one into a pdf, and splices them into a single pdf.
         * We are doing this because render cannot create a pdf from an html string that has more than
         * 100,000 entity expansions, which is what we were getting when running multiple hundreds of checks.
         * 
         * @param {Array} htmlArray - Array of html strings to make into PDFs and splice together
         * @returns {File.file}
         */
        function splicePdfs(htmlArray) {
            if (htmlArray.length < 1)
                return null;
            if (htmlArray.length == 1)
                return render.xmlToPdf({xmlString: htmlArray[0]});
            var fileIds = [];
            for (var i = 0; i < htmlArray.length; i++) {
                var tempFile = render.xmlToPdf({xmlString: htmlArray[i]});
                tempFile.name = 'Temporary Print Refund PDF (' + i + ').pdf';
                tempFile.folder = GD_Constants.GD_FOLDER_DEALERREFUNDSTEMP;
                tempFile.isOnline = true;
                var fileId = tempFile.save();
                fileIds.push(fileId);
            }
            var html = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdfset>";
            search.create({
                type: "file",
                filters: [["internalid", "anyof", fileIds]],
                columns: ["url"]
            }).run().each(function(result) {
                var fileUrl = result.getValue({name: 'url'});
                fileUrl = fileUrl.replace(/&/g, '&amp;');
                html = html + '<pdf src="' + fileUrl + '"></pdf>';
                return true;
            });
            html = html + '</pdfset>';
            var splicedFile = render.xmlToPdf({xmlString: html});
            for (var i = 0; i < fileIds.length; i++) {
                try {
                    file.delete({id: fileIds[i]});
                } catch (err) {
                    log.error('File: ' + fileIds[i] + ' Deletion Error', err);
                }
            }
            return splicedFile;
        }

        return {
            getPdf: getPdf,
            getSingleCheckPdf: getSingleCheckPdf,
            getSearchResults: getSearchResults,
            getCreditMemoElements: getCreditMemoElements,
            sortCreditMemoResults: sortCreditMemoResults,
            splicePdfs: splicePdfs
        };

});
