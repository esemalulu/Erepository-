/**
 * @NApiVersion 2.x
 */
define(['N/search', 'N/record', 'N/file', 'N/xml', 'N/format', 'N/render', 'N/config', '../2.x/GD_Common.js', './GD_PDR_HelperChecks.js'],
    
    function(search, record, file, xml, format, render, config, GD_Common, checksHelper) {

        /**
         * Generates the PDF for the vouchers
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

                var dealerRefundsToPrintGrouped = checksHelper.getSearchResults(refundIds, true);
                var dealerRefundsToPrint = checksHelper.getSearchResults(refundIds, false);
                dealerRefundsToPrint.sort(checksHelper.sortCreditMemoResults);

                if (dealerRefundsToPrintGrouped != null && dealerRefundsToPrintGrouped.length > 0) {
                    var companyInfo = config.load({type: config.Type.COMPANY_INFORMATION});
                    var pageLogoId = companyInfo.getValue({fieldId: 'pagelogo'});
                    var pageLogoUrl = '';
                    if (pageLogoId) {
                        var pageLogo = file.load({id: pageLogoId});
                        pageLogoUrl = xml.escape({xmlText: pageLogo.url});
                    }
                    var memosPrinted = 0;
                    for (var i = 0; i < dealerRefundsToPrintGrouped.length; i++) {
                        if (memosPrinted%100 == 0 && memosPrinted != 0) {
                            html = html + '</pdf>';
                            htmlArray.push(html);
                            html = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>";
                        }
                        var dealerRefundId = dealerRefundsToPrintGrouped[i].getValue({name: 'internalid', join: 'appliedToTransaction', summary: 'GROUP'});

                        // get the list of credit memos for this refund
                        var creditMemos = checksHelper.getCreditMemoElements(dealerRefundId, dealerRefundsToPrint);

                        // only print the voucher if the number of credit memos returned is greater than the # of claims per page.
                        // this is because they only want to batch print vouchers where the number of credit lines is greater than those that can fit on the remit stub
                        var claimsPerPage = 19;

                        if (creditMemos != null && creditMemos.length > claimsPerPage)
                        {
                            html = html + getDealerRefundVoucherHTML(dealerRefundId, dealerRefundsToPrint, companyInfo, pageLogoUrl, creditMemos);
                            memosPrinted++;
                        }
                    }
                    if (html != "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>") {
                        html = html + '</pdf>';
                        htmlArray.push(html);
                    }
                } else {
                    htmlArray.push(html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' + 'All the credits on the checks selected fit on the remit stubs so there are no vouchers to print.' + '</body></pdf>');
                }
            } else {
                htmlArray.push(html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' + '&nbsp;' + '</body></pdf>');
            }
            return checksHelper.splicePdfs(htmlArray);
        }

        /**
         * Generates the PDF for a single voucher
         * 
         * @param {string} refundId - The id of the refund voucher to be printed.
         * @returns {file.file} - The PDF to be downloaded.
         */
        function getSingleVoucherPdf(refundId) {
            var html = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>";
            if (refundId) {
                var dealerRefundsToPrint = checksHelper.getSearchResults(refundId, false);
                dealerRefundsToPrint.sort(checksHelper.sortCreditMemoResults);

                var companyInfo = config.load({type: config.Type.COMPANY_INFORMATION});
                var pageLogoId = companyInfo.getValue({fieldId: 'pagelogo'});
                var pageLogoUrl = '';
                if (pageLogoId) {
                    var pageLogo = file.load({id: pageLogoId});
                    pageLogoUrl = xml.escape({xmlText: pageLogo.url});
                }
                var creditMemos = checksHelper.getCreditMemoElements(refundId, dealerRefundsToPrint);

                if (dealerRefundsToPrint.length > 0) {
                    html = html + getDealerRefundVoucherHTML(refundId, dealerRefundsToPrint, companyInfo, pageLogoUrl, creditMemos);
                } else {
                    html = html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">'
                    + 'The Dealer Refund that you have tried to print has already been applied'
                    + ' and the voucher could not be printed.' + '</body>';
                }
            } else {
                html = html + '<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' + '&nbsp;' + '</body>';
            }
            return render.xmlToPdf({xmlString: html + '</pdf>'});
        }

        /**********Helper Functions for the Helper Functions**********/

        /**
         * Return the HTML for a given refund voucher
         * 
         * @param {string} dealerRefundId
         * @param {string} dealerRefundsToPrint
         * @param {record.record} companyInfo
         * @param {string} logoUrl
         * @param {array}
         */
        function getDealerRefundVoucherHTML(dealerRefundId, dealerRefundsToPrint, companyInfo, logoUrl, creditMemos) {
            var voucherHTML = '';

            if (creditMemos != null && creditMemos.length > 0) {
                var element = creditMemos[0];

                var printOnCheckAs = xml.escape({xmlText: element.getValue({name: 'custbodyrvsentityprintoncheckas'})});
                if (printOnCheckAs == null || printOnCheckAs == '')
                    printOnCheckAs = xml.escape({xmlText: element.getText({name: 'entity'})});
                 
                var amount = element.getValue({name: 'amount', join: 'appliedToTransaction'});
                
                var date = format.parse({value: element.getValue({name: 'trandate', join: 'appliedToTransaction'}), type: format.Type.DATE});
                var dateString = date.getMonth()+1 + '/' + date.getDate() + '/' + date.getFullYear();

                var checkNumber = element.getValue({name: 'tranid', join: 'appliedToTransaction'});
                 
                var addressee = xml.escape({xmlText: element.getValue({name: 'billaddressee'})});
                var address1 = xml.escape({xmlText: element.getValue({name: 'billaddress1'})});
                var address2 = xml.escape({xmlText: element.getValue({name: 'billaddress2'})}) || '';
                if  (address2 != '') {
                    address1 =     address1 + '<br />' + address2;
                }
                var city = xml.escape({xmlText: element.getValue({name: 'billcity'})});
                var state = xml.escape({xmlText: element.getValue({name: 'billstate'})});
                var zip = xml.escape({xmlText: element.getValue({name: 'billzip'})});
                var country = element.getValue({name: 'billcountry'});
                if (country == null)
                     country = '';
                else if (country == 'CA')
                    country = 'Canada';
                country = xml.escape({xmlText: country});
                var attention = xml.escape({xmlText: element.getValue({name: 'billattention'})});
                var attentionHTML = '';
                if (attention != null && attention != '') {
                    attentionHTML = '<tr>' + 
                                        '<td>' + 
                                            attention +
                                        '</td>' +
                                    '</tr>';
                }

                var totalAmountString = GD_Common.addCommas(format.format({value: Math.abs(amount), type: format.Type.CURRENCY}));

                var companyAddress = companyInfo.getSubrecord({fieldId: 'mainaddress'});
                var companyName = companyInfo.getValue({fieldId: 'companyname'});
                var companyAddress1 = companyAddress.getValue({fieldId: 'addr1'});
                var companyCity = companyAddress.getValue({fieldId: 'city'}); 
                var companyState = companyAddress.getValue({fieldId: 'state'}); 
                var companyZip = companyAddress.getValue({fieldId: 'zip'});

                var amountHTML = 
                    '<table width="100%">' +
                        '<tr>' + 
                            '<td style="width:70%">' + 
                                '&nbsp;' + 
                            '</td>' +
                            '<td style="width:20%; font-weight:bold;">' + 
                                'Total Amount' + 
                            '</td>' +
                            '<td style="width:10%;" align="right;">' + 
                                '$' + totalAmountString + 
                            '</td>' +
                        '</tr>' +     
                    '</table>';

                var voucherLineSection = 
                    '<table width="100%">' +
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
                            '<td style="font-weight:bold; border-bottom:1px solid black; width:19%;">' + 
                                'Memo' + 
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
                
                var pageBreakCounter = 0;
                for (var i = 0; i < creditMemos.length; i++) {
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
                
                        voucherLineSection += 
                            '<tr style="page-break-after: auto;">' + 
                                '<td>' + 
                                    creditMemoDate + 
                                '</td>' +
                                '<td>' + 
                                    claimId + 
                                '</td>' +
                                '<td style="font-size:7pt;">' + 
                                    poNumber + 
                                '</td>' +
                                '<td style="word-wrap: break-word; font-size:7pt;">' + 
                                    memo + 
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
                        voucherLineSection += 
                            '<tr style="page-break-after: auto;">' + 
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
                 
                voucherLineSection += '</table>';
                 
                voucherHTML = 
                    '<body style="font-size:10pt; font-family:sans-serif;" size="Letter">' +
                        '<table width="100%">' +
                            '<tr>' +
                                '<td style="width:50%;">' +
                                    '<img src="' + logoUrl + '" width="150px" height="92px" />' +
                                '</td>' +
                                '<td style="font-size:18pt; font-weight:bold; width:50%; vertical-align:bottom;" colspan="2">' +
                                    'Payment Voucher' +
                                '</td>' +
                            '</tr>' +
                            '<tr>' +
                                '<td style="padding-top:10px; width:50%;">' +
                                    companyName +
                                '</td>' +
                                '<td style="padding-top:10px; width:25%;">' +
                                    'Date' +
                                '</td>' +
                                '<td style="padding-top:10px; width:25%;">' +
                                    dateString +
                                '</td>' +
                            '</tr>' +
                            '<tr>' +
                                '<td>' + 
                                    companyAddress1 +
                                '</td>' +
                                '<td>' + 
                                    'Check #' +
                                '</td>' +
                                '<td>' + 
                                    checkNumber +
                                '</td>' +
                            '</tr>' +  
                            '<tr>' + 
                                '<td>' + 
                                    companyCity + ', ' + companyState + ' ' + companyZip +
                                '</td>' +
                            '</tr>' +
                            '<tr>' + 
                                '<td>' + 
                                    //spacer
                                '</td>' +
                            '</tr>' +    
                            '<tr>' + 
                                '<td>' + 
                                    //spacer
                                '</td>' +
                            '</tr>' + 
                            '<tr>' + 
                                '<td>' + 
                                    //spacer
                                '</td>' +
                            '</tr>' + 
                            '<tr>' + 
                                '<td style="font-weight:bold;">' + 
                                    'Paid To' +
                                '</td>' +
                            '</tr>' +  
                            '<tr>' + 
                                '<td>' + 
                                    addressee +
                                '</td>' +
                            '</tr>' +  
                            attentionHTML +
                            '<tr>' + 
                                '<td>' + 
                                    address1 +
                                '</td>' +
                            '</tr>' +  
                            '<tr>' + 
                                '<td>' + 
                                    city + ', ' + state + ' ' + zip +
                                '</td>' +
                            '</tr>' +
                            '<tr>' + 
                                '<td>' + 
                                    country +
                                '</td>' +
                            '</tr>' +               
                        '</table>' +
                        voucherLineSection +
                        amountHTML +
                    '</body>';
            }
            return voucherHTML;
        }

        return {
            getPdf: getPdf,
            getSingleVoucherPdf: getSingleVoucherPdf
        };

    });
