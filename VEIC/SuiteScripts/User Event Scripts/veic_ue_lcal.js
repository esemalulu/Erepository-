/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/ui/serverWidget', 'N/log', 'SuiteScripts/Lib/veic_master_lib.js'],
    function (record, serverWidget, log, lib) {

        function beforeLoad(context) {
            if (context.type === context.UserEventType.VIEW){
                var newRecord = context.newRecord;

                // let mon =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_one"});
                // let monTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_one_tb"});

                // let tue =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_two"});
                // let tueTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_two_tb"});

                // let wed =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_three"});
                // let wedTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_three_tb"});

                // let thu =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_four"});
                // let thuTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_four_tb"});

                // let fri =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_five"});
                // let friTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_five_tb"});

                // let sat =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_six"});
                // let satTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_six_tb"});

                // let sun =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_seven"});
                // let sunTB =  newRecord.getValue({fieldId:"custrecord_veic_lcal_day_seven_tb"});

                var form = context.form;

                var weekTab = form.addFieldGroup({
                    id: 'custpage_week_tab', // Tab ID
                    label: 'Week'            // Tab Label
                });
                
                // Define the Inline HTML field
                var htmlField = form.addField({
                    id: 'custpage_inline_html_week',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Week',  // This is the label
                    container: 'custpage_week_tab'
                });
    
                // Ensure the field is visible
                htmlField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });
    
                let env = lib.nsEnvironment();

                let tableString = "<table><tr><th style='width:15%'>MON</th> <th style='width:15%'>TUE</th> <th style='width:15%'>WED</th> <th style='width:15%'>THU</th> <th style='width:15%'>FRI</th> <th style='width:15%'>SAT</th> <th style='width:15%'>SUN</th></tr><tr>";

                for (let i = 1; i < 8; i++) {
                    let dayId = "custrecord_veic_lcal_day_"+numberToLetter(i);
                    let dayHr =  newRecord.getValue({fieldId:dayId});

                    let tbId = "custrecord_veic_lcal_day_"+numberToLetter(i)+"_tb";
                    let dayTBRec =  newRecord.getValue({fieldId:tbId});
                    
                    var linkUrl = 'https://1072652'+env+'.app.netsuite.com/app/accounting/transactions/timebill.nl?id='+dayTBRec;
                    var htmlContent = '<td><a href="' + linkUrl + '" target="_blank">' + dayHr + '</a></td>';
                    
                    // Append htmlContent to tableString
                    tableString += htmlContent;

                }
                
                tableString += "</tr></table>";

                // Define the URL and the link text
                //var linkUrl = 'https://1072652'+env+'.app.netsuite.com/app/accounting/transactions/timebill.nl?id='+monTB;
                
                // Create the HTML for the link
                //var htmlContent = '<div id="monday">MON<br><a href="' + linkUrl + '" target="_blank">' + mon + '</a></div>';
                //var htmlContent = '<div id="monday">MON<br><a href="' + linkUrl + '" target="_blank">' + mon + '</a></div>';
                
                // Set the content of the Inline HTML field
                htmlField.defaultValue = tableString;
    
                // Log for debugging
                log.debug({
                    title: 'Inline HTML Field Added',
                    details: 'The hyperlink was added to the Inline HTML field.'
                });
            }  
        }

        function numberToLetter(num) {
            const numberWords = [
                'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'
            ];
        
            if (num >= 0 && num <= 10) {
                return numberWords[num];
            } else {
                return 'Number out of range';
            }
        }

        return {
            beforeLoad: beforeLoad
        };

    });
