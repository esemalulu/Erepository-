/**
 * Copyright (c) 2023, Oracle and/or its affiliates.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ('Confidential Information'). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 *
 * Version          Date                      Author                                Remarks
 * 1.0              2023/11/23                vanessa.gomez                         Initial commit
 * **/

/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/record', 'N/search', 'N/runtime', 'N/format', 'N/render', 'N/file', 'N/email'],
    function (record, search, runtime, format, render, file, email) {
        'use strict';

        function getInputData() {
            try {
                var parameterSS = JSON.parse(runtime.getCurrentScript().getParameter('custscript_acs_ss'));

                return search.load(parameterSS); //customsearch_acs_bills_paid_cms_2 // ACS | Review Bills Paid with CM-Driver [DO NOT DELETE]
            } catch (ex) {
                log.error('getInputData', ex);
            }
        }

        function map(context) {
            try {
                var searchResults = JSON.parse(context.value);
                // Read Bill from saved search
                var stName = searchResults.values['GROUP(entity)'];
                var values = searchResults.values['GROUP(custentity_2663_email_address_notif.vendor)'];


                context.write({
                    key: JSON.stringify(stName),
                    value: JSON.stringify(values),
                });
            } catch (ex) {
                log.error('map', ex);
            }
        }

        function reduce(context) {
            const strMethodName = 'reduce';
            try {

                var stName= JSON.parse(context.key);

                stName = stName.value;
                log.debug('stName', stName);
                var contextValues = JSON.parse(context.values);
                log.debug('reduce context Values', contextValues);
                var parameterSSdet = JSON.parse(runtime.getCurrentScript().getParameter('custscript_acs_ss_detail'));

               var vendorbillSearchObj = search.load(parameterSSdet);

                var defaultFilters = vendorbillSearchObj.filters;

                var customFilters = [];
                //We will add the new filter in customFilters
                customFilters =
                {"name":"entity","operator":"anyof","values":[stName],"isor":false,"isnot":false,"leftparens":0,"rightparens":0};
                defaultFilters.push(customFilters);

                vendorbillSearchObj.filters = defaultFilters;

                var arrResult = vendorbillSearchObj.run();


                var srcResults = arrResult.getRange({
                    start: 0,
                    end: 1000});
                log.debug('scrResults', srcResults);

                if (!isEmpty(srcResults)) {
                    var parameterPdf = runtime.getCurrentScript().getParameter('custscript_acs_pdf'); // custtmpl_acs_vend_cred_remittance

                    var xmlTemplateFile = file.load('Templates/PDF Templates/custtmpl_acs_vend_cred_remittance.template.xml');

                    for (var i = 0; i < srcResults.length; i++) {

                        var srcResult = srcResults[i];

                        var pdfRecord = record.create({
                            type: 'customrecord_acs_bill_pais_summary'
                        });

                        pdfRecord.setValue('custrecord_acs_trandate', srcResult.getValue({name:'trandate', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_internalid', srcResult.getValue({name:'internalid', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_tranid', srcResult.getValue({name:'tranid', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_entity', srcResult.getText({name:'entity', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_statusref', srcResult.getValue({name:'statusref', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_amount', srcResult.getValue({name:'amount', summary:'MIN'}));
                        pdfRecord.setValue('custrecord_acs_applyinglinkamount', srcResult.getValue({name:'applyinglinkamount', summary:'SUM'}));
                        pdfRecord.setValue('custrecord_acs_formulatext', srcResult.getValue(srcResult.columns[7]));
                        pdfRecord.setValue('custrecord_acs_formulatext_1', srcResult.getValue(srcResult.columns[8]));
                        pdfRecord.setValue('custrecord_acs_billaddress', srcResult.getValue({name:'billaddress', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_billaddress1', srcResult.getValue({name:'billaddress1', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_billaddress2', srcResult.getValue({name:'billaddress2', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_billcity', srcResult.getValue({name:'billcity', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_billstate',srcResult.getValue({name:'billstate', summary:'GROUP'}));
                        pdfRecord.setValue('custrecord_acs_billzip', srcResult.getValue({name:'billzip', summary:'GROUP'}));

                        pdfRecord.save();
                    }
                    log.debug('save Custom Record', 'ok')

                    var billpaidSearchObj = search.load('customsearch_acs_ss_bill_paid_summary_pd');
                    var bpResult = billpaidSearchObj.run();
                    var results = bpResult.getRange({
                        start: 0,
                        end: 1000});
                    log.debug('results', results);

                    var renderer = render.create();
                    renderer.templateContent = xmlTemplateFile.getContents();
                    renderer.addSearchResults({
                        templateName: 'results',
                        searchResult: results
                    });

                    var newfile = renderer.renderAsPdf();

                    var stBill = new Array();
                    for (var j = 0; j < results.length; j++) {
                        var line = results[j];
                        log.debug('line', line);
                        log.debug('internalid',line.getValue({name:'custrecord_acs_internalid'}) );
                           record.delete({
                            type: 'customrecord_acs_bill_pais_summary',
                            id: line.id,
                        });

                        var internalid = line.getValue({name:'custrecord_acs_internalid'});

                        stBill.push(internalid);
                    }
                    log.debug('stBill', stBill);

                    var emailSubject = runtime.getCurrentScript().getParameter('custscript_acs_email_subject'); // 'IFD Payment Notification: Invoice Paid with Deductions'
                    var emailBody = runtime.getCurrentScript().getParameter('custscript_acs_email_body');

                    // 'The bills in the attached document have been paid with the corresponding credits as shown in column "CMs Applied to Bill'
                    var email_vendor = contextValues;
                    var sender = '-5';
                    var recipients = email_vendor;





                    email.send({
                        author: sender,
                        recipients: recipients,
                        subject: emailSubject,
                        body: emailBody,
                        attachments: [
                            newfile,
                        ],
                        relatedRecords: {
                            transactionId: stBill,
                        }
                    });
                }
            } catch (ex) {
                log.error(strMethodName, ex);
            }
        }


function summarize(summarizeContext) {
    const strMethodName = 'summarize';
    try {
        var type = summarizeContext.toString();
        var logObj = {};
        logObj['Usage Consumed'] = summarizeContext.usage;
        logObj['Concurrency Number '] = summarizeContext.concurrency;
        logObj['Number of Yields'] = summarizeContext.yields;
        log.audit('Type:' + type, JSON.stringify(logObj));
        if (summarizeContext.inputSummary.error) {
            log.error('Input Error', summarizeContext.inputSummary.error);
        }
        summarizeContext.mapSummary.errors
            .iterator()
            .each(function eachMapError(key, value) {
                log.error(key, value);
                return true;
            });

        summarizeContext.reduceSummary.errors
            .iterator()
            .each(function eachReduceError(key, value) {
                log.error(key, value);
                return true;
            });
    } catch (ex) {
        log.error(strMethodName, ex);
    }
}

        function parseAndFormatDateString(date) {
            // Assuming Date format is MM/DD/YYYY

              var parsedDateStringAsRawDateObject = format.parse({
                  value: date,
                  type: format.Type.DATE
              });
              return parsedDateStringAsRawDateObject;
        }

function isEmpty(stValue) {
    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) ||
        (stValue.constructor === Object && (function (v) {
            for (var k in v) return false;
            return true;
        })(stValue)));
}

return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
}

})
;


/*let xml =  '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">'
    xml += '<pdf>'
    xml += '<head>'
    xml += '<link name="NotoSans" type="font" subtype="truetype" src="${nsfont.NotoSans_Regular}" src-bold="${nsfont.NotoSans_Bold}" src-italic="${nsfont.NotoSans_Italic}" src-bolditalic="${nsfont.NotoSans_BoldItalic}" bytes="2" />'
    xml += '<#if.locale == "zh_CN">'
    xml +=    '<link name="NotoSansCJKsc" type="font" subtype="opentype" src="${nsfont.NotoSansCJKsc_Regular}" src-bold="${nsfont.NotoSansCJKsc_Bold}" bytes="2" />'
    xml += '<#elseif.locale == "zh_TW" />'
    xml +=   '<link name="NotoSansCJKtc" type="font" subtype="opentype" src="${nsfont.NotoSansCJKtc_Regular}" src-bold="${nsfont.NotoSansCJKtc_Bold}" bytes="2" />'
    xml += '<#elseif.locale == "ja_JP" /> '
    xml +=   '<link name="NotoSansCJKjp" type="font" subtype="opentype" src="${nsfont.NotoSansCJKjp_Regular}" src-bold="${nsfont.NotoSansCJKjp_Bold}" bytes="2" />'
    xml += '<#elseif.locale == "ko_KR" />'
    xml +=   '<link name = "NotoSansCJKkr" type = "font" subtype = "opentype" src = "${nsfont.NotoSansCJKkr_Regular}" src - bold = "${nsfont.NotoSansCJKkr_Bold}" bytes = "2" />'
    xml += '<#elseif.locale == "th_TH" />'
    xml +=   '<link name = "NotoSansThai" type = "font" subtype = "opentype" src = "${nsfont.NotoSansThai_Regular}" src - bold = "${nsfont.NotoSansThai_Bold}" bytes = "2" />'
    xml += '</#if>'
    xml += '<macrolist>';
    xml += '<macro id="nlheader">';
    xml += '<table className="header" style="width: 100%;">' ;
    xml += '<tr>' ;
    xml +=   '<td rowSpan="5" colSpan="50">';
    xml +=   '<#if companyInformation.logoUrl?length != 0><@filecabinet nstype="image" src="${companyInformation.logoUrl}" style="float: left; margin: 7px; dpi: 150" />' ;
    xml +=   '</#if>' ;
    xml +=   '<span className="nameandaddress">${companyInformation.companyName}</span>'
    xml +=   '<br/>'
    xml +=   '<span className="nameandaddress">${companyInformation.address1}</span>'
    xml +=   '<br/><span className="nameandaddress">${companyInformation.address2}</span>'
    xml +=   '<br/><span className="nameandaddress">${companyInformation.city}</span></td>'
    xml +=   '<td colSpan="50" align="right"><span className="title">Credits Applied Voucher</span>'
    xml +=   '</td>'
    xml +=  '</tr>'
    xml +=  '<tr>'
    xml +=  '<td colSpan="40" align="right" style="padding-bottom: 8px;"><b>Date:</b></td>'
    xml +=  '<td colSpan="10" align="right" style="padding-bottom: 8px;">12/12/2023</td>'
    xml +=  '</tr>'
    xml +=  '</table>'
    xml += '</macro>'
    xml += '<macro id="nlfooter">'
    xml += '<table class="footer" style="width: 100%;">'
    xml += '<tr>'
    xml +=   '<td align="center"><pagenumber/> of <totalpages/></td>'
    xml += '</tr>'
    xml += '</table>'
    xml +=   '</macro>'
    xml +=   '</macrolist>'
    xml +=   '<style type="text/css">* {<#if .locale == "zh_CN">'
    xml +=    'font-family: NotoSans, NotoSansCJKsc, sans-serif;'
    xml +=    '<#elseif .locale == "zh_TW">'
    xml +=    'font-family: NotoSans, NotoSansCJKtc, sans-serif;'
    xml +=    '<#elseif .locale == "ja_JP">'
    xml +=    'font-family: NotoSans, NotoSansCJKjp, sans-serif;'
    xml +=    '<#elseif .locale == "ko_KR">'
    xml +=    'font-family: NotoSans, NotoSansCJKkr, sans-serif;'
    xml +=    '<#elseif .locale == "th_TH">'
    xml +=    'font-family: NotoSans, NotoSansThai, sans-serif;'
    xml +=    '<#else>'
    xml +=    'font-family: NotoSans, sans-serif;'
    xml +=    '</#if>'
    xml +=    '}'
    xml +=    'table {'
    xml +=    'font-size: 8pt;'
    xml +=    'table-layout: fixed;'
    xml +=    '}'
    xml +=    'th {'
    xml +=    'font-weight: bold;'
    xml +=    'font-size: 8pt;'
    xml +=    'vertical-align: middle;'
    xml +=    'padding: 5px 6px 3px;'
    xml +=    'background-color: #e3e3e3;'
    xml +=    'color: #333333;'
    xml +=    '}'
    xml +=    'td {'
    xml +=    'padding: 4px 6px;'
    xml +=    'border:${debug_mode}px solid blue;'
    xml +=    'word-wrap: break-word;'
    xml +=    '}'
    xml +=    'td p { align:left }'
    xml +=    'th p { align:left }'
    xml +=    'b {'
    xml +=    'font-weight: bold;'
    xml +=    'color: #333333;'
    xml +=    '}'
    xml +=    'table.header td {'
    xml +=    'padding: 0px;'
    xml +=    'font-size: 10pt;'
    xml +=    '}'
    xml +=    'table.footer td {'
    xml +=    'padding: 0px;'
    xml +=    'font-size: 8pt;'
    xml +=    '}'
    xml +=    'table.itemtable tr {'
    xml +=    'border-bottom:0.25pt solid black;'
    xml +=    '}'
    xml +=    'table.itemtable th {'
    xml +=    'padding-bottom: 10px;'
    xml +=    'padding-top: 10px;'
    xml +=    '}'
    xml +=    'table.body td {'
    xml +=    'padding-top: 2px;'
    xml +=    '}'
    xml +=    'td.nameandaddress {'
    xml +=    'font-size: 8pt;'
    xml +=    'padding-top: 6px;'
    xml +=    'padding-bottom: 2px;'
    xml +=    '}'
    xml +=    'td.addressheader {'
    xml +=    'font-size: 8pt;'
    xml +=    'padding-top: 6px;'
    xml +=    'padding-bottom: 2px;'
    xml +=    '}'
    xml +=    'td.address {'
    xml +=    'padding-top: 0px;'
    xml +=    '}'
    xml +=    'span.title {'
    xml +=    'font-size: 20pt;'
    xml +=    'font-weight: bold;'
    xml +=    '}'
    xml +=    'span.number {'
    xml +=    'font-size: 10pt;'
    xml +=    '}'
    xml +=    'span.itemname {'
    xml +=    'font-weight: bold;'
    xml +=    'line-height: 150%;'
    xml +=    '}'
    xml +=    'hr {'
    xml +=    'width: 100%;'
    xml +=    'color: #d3d3d3;'
    xml +=    'background-color: #d3d3d3;'
    xml +=    'height: 1px;'
    xml +=    '}'
    xml +=    '</style>'
    xml +=    '</head>'
    xml +=    '<body header="nlheader" header-height="10%" footer="nlfooter" footer-height="20pt" padding="0.5in 0.5in 0.5in 0.5in" size="Letter">'
    xml +=    '<table style="width: 100%; margin-top: 0px;">'
    xml +=    '<tr>'
    xml +=    '<td class="addressheader" colspan="50" align="right"><b>${hrdResult.billaddress@label}:</b></td>'
    xml +=    '</tr>'
    xml +=    '<tr>'
    xml +=    '<td align="right" class="address" colspan="50" rowspan="2" vertical-align="top">'
    xml +=    '${hrdResult.entity}<br />'
    xml +=    '${hrdResult.billaddress1}<br />'
    xml +=    '${hrdResult.billcity}, ${hrdResult.billstate} ${hrdResult.billzip}'
    xml +=    '</td>'
    xml +=    '</tr>'
    xml +=    '</table>'
    xml +=    '<table class="itemtable" style="width: 100%; margin-top: 20px;">'
    xml += '<#list results as result>'
    xml += '<#if result_index == 0>'
    xml += '<thead>'
    xml += '<tr>'
    xml += '<th colspan="10">'
    xml += '<p> ${result.trandate@label} </p>'
    xml += '</th>'
    xml += '<th colspan="12">'
    xml += '<p> ${result.tranid@label} </p>'
    xml += '</th>'
    xml += '<th colspan="10">'
    xml += '<p> ${result.statusref@label} </p>'
    xml += '</th>'
    xml += '<th colspan="14">'
    xml += '<p>${result.amount@label} </p>'
    xml += '</th>'
    xml += '<th colspan="14">'
    xml += '<p>${result.applyinglinkamount@label} </p>'
    xml += '</th>'
    xml += '<th colspan="30">'
    xml += '<p>${result.formulatext@label}</p>'
    xml += '</th>'
    xml += '<th colspan="10">'
    xml += '<p>${result.formulatext_1@label?replace(" 1","")}</p>'
    xml += '</th>'
    xml += '</tr>'
    xml += '</thead>'
    xml += '</#if>'
    xml += '<tr>'
    xml += '<td colspan="10">${result.trandate}</td>'
    xml += '<td colspan="12">${result.tranid}</td>'
    xml += '<td colspan="10">${result.statusref}</td>'
    xml += '<td colspan="14">${result.amount}</td>'
    xml += '<td colspan="14">${result.applyinglinkamount}</td>'
    xml += '<td colspan="30" style="white-space:nowrap;">'
    xml += '<#if result.formulatext?lower_case?starts_with('+ 'lorem ipsum' + ') == false && result?has_next>'
    xml += '<#assign _CMs_Applied_to_Bills=(result.formulatext?eval) />'
    xml += '<#list _CMs_Applied_to_Bills as cm>'
    xml += '${cm}<br />'
    xml += '</#list>'
    xml += '</#if>'
    xml += '</td>'
    xml += '<td colspan="10">'
    xml += '<#if result.formulatext_1?lower_case?starts_with('+'lorem ipsum'+') == false && result?has_next>'
    xml += '<#assign _cms_ids=(result.formulatext_1?eval) />'
    xml += '<#list _cms_ids as cm>'
    xml += '${cm}<br />'
    xml += '</#list>'
    xml += '</#if>'
    xml += '</td>'
    xml += '</tr>'
    xml += '</#list>'
    xml += '</table>'
    xml += '</body></pdf>' */
