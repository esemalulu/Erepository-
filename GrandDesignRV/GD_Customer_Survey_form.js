/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @author Dheeraj Vaniyamparambath
 * @description This script will post the customer survey response to the claim.
 */
define(['N/file', 'N/record', 'N/ui/serverWidget', 'N/redirect', 'N/render', 'N/search'],
    /**
     * @param {file} file
     * @param {record} record
     * @param {search} search
     * @param {transaction} transaction
     * @param {serverWidget} serverWidget
     */
    function (file, record, serverWidget, redirect, render, search) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            if (context.request.method === 'GET') {
                try {
                   
                    context.response.writePage({
                        pageObject: createSurveyForm(context)
                    });
                } catch (e) {
                    log.debug({
                        title: 'Error while loading Customer Survey form',
                        details: e.message
                    })
                }
            } else {

                try {
                    var custSurveyJson = createSurveyResponseRec(context);
                } catch (e) {
                    log.debug({
                        title: 'Error while creating the Custoemr Survey record',
                        details: e.message
                    })
                }
            }
        }


        function createSurveyForm(context) {
            var request = context.request;
             var claim= context.request.parameters.claim;
log.debug({title:"claim",details:claim});
            // Add Fields
            var form = serverWidget.createForm({
                title: 'Customer Survey Form'
            });
           var fieldgroup_acct_logo = form.addFieldGroup({
                id: 'logo_details',
                label: ' '
            });
          
          var fieldgroup_verb = form.addFieldGroup({
                id: 'verbiage',
                label: ' '
            });
                    var htmlImage = form.addField({
    id: 'custpage_htmlfield',
    type: serverWidget.FieldType.INLINEHTML,
    label: 'HTML Image',
    container: 'logo_details'
});
htmlImage.defaultValue = "<img src='https://3598857-sb2.app.netsuite.com/core/media/media.nl?id=77&c=&h=fC9gYwu4fn1my5X8WBxYnLHyEJQAFMsAhk-BJzshO3Fiy0a3' alt='Oracle Netsuite logo'>"; 

           var htmlHeader = form.addField({
            id: 'custpage_header',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' ',
       container: 'verbiage' 
        }).defaultValue = '<p style=\'font-size:14px\'><i>We value your opinion. Please take a moment to share with us comments about your recent service experience at our authorized Grand Design RV dealer.</i></p><br><br>';



            var svsexp = form.addFieldGroup({
                id: 'svc_exp',
                label: 'How satisfied are you with your recent service experience at your dealer?*'
            });
          svsexp.isMandatory = true;
            var svsappt = form.addFieldGroup({
                id: 'svc_appt',
                label: 'How long did it take you to schedule a service appointment for your RV?*'
            });
          svsappt.isMandatory = true;
            var dlreview = form.addFieldGroup({
                id: 'dealer_review',
                label: 'Did the dealer thoroughly review and document your service concerns?*'
            });
          dlreview.isMandatory = true;
            var svcadvCOmm = form.addFieldGroup({
                id: 'svs_adv',
                label: 'How satisfied are you with the communication provided by your Service Advisors throughout the repair of your RV?*'
            });
          svcadvCOmm.isMandatory = true;
            var svctime = form.addFieldGroup({
                id: 'svs_duration',
                label: 'How long did it take to service your RV?*'
            });
          svctime.isMandatory = true;
            var repairSat = form.addFieldGroup({
                id: 'repair_satisfaction',
                label: 'How satisfied are you with the repairs made to your RV?*'
            });
          repairSat.isMandatory = true;
            var repOrder = form.addFieldGroup({
                id: 'repair_order',
                label: 'Were you asked to sign a final repair order?*'
            });
          repOrder.isMandatory = true;
            var dealerRecom = form.addFieldGroup({
                id: 'dealer_recom',
                label: 'On a scale of 1-10, with 1 being not at all likely and 10 being extremely likely. How likely are you to recommend this dealer for service to a friend or family member?*'
            });
           dealerRecom.isMandatory = true;
            var addFeedback = form.addFieldGroup({
                id: 'add_feedback',
                label: 'Please feel free to provide any additional feedback in the space provided below.'
            });
           //addFeedback.isMandatory = true;
           var claimNum = form.addField({
                id: 'custpage_claim',
                type: serverWidget.FieldType.TEXT,
                label: ' ',
                container: 'svc_claim'
            });
          claimNum.defaultValue =claim;
          claimNum.updateDisplayType({
    displayType : serverWidget.FieldDisplayType.HIDDEN
});

            var questOne = form.addField({
                id: 'custpage_svc_exp',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
               // source: '2985',
                container: 'svc_exp'
            });
          questOne.addSelectOption({
    value : '',
    text : ''
});
        //  questOne.isMandatory = true;

questOne.addSelectOption({
    value : '1',
    text : '4 = Extremely Satisfied'
});
          questOne.addSelectOption({
    value : '2',
    text : '3 = Somewhat Satisfied'
});
          questOne.addSelectOption({
    value : '3',
    text : '2 = Neither'
});
          questOne.addSelectOption({
    value : '4',
    text : '1 = Somewhat Dissatisfied'
});
         questOne.addSelectOption({
    value : '5',
    text : '0 = Very Dissatisfied'
});
            var questTwo = form.addField({
                id: 'custpage_svc_appt',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
                //source: '2986',
                container: 'svc_appt'
            });
          questTwo.addSelectOption({
    value : '',
    text : ''
});
// questTwo.isMandatory = true;
questTwo.addSelectOption({
    value : '1',
    text : '4 = 0-2 weeks'
});
          questTwo.addSelectOption({
    value : '2',
    text : '3 = 2-3 weeks'
});
          questTwo.addSelectOption({
    value : '3',
    text : '2 = 3-4 weeks'
});
          questTwo.addSelectOption({
    value : '4',
    text : '1 = 4-5 weeks'
});
          questTwo.addSelectOption({
    value : '5',
    text : '0 = More than 6 Weeks'
});
            var questThree = form.addField({
                id: 'custpage_svc_dealer_review',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
                //source: '2985',
                container: 'dealer_review'
            });
        //   questThree.isMandatory = true;
             questThree.addSelectOption({
    value : '',
    text : ''
});
          questThree.addSelectOption({
    value : '1',
    text : '4 = Extremely Satisfied'
});
          questThree.addSelectOption({
    value : '2',
    text : '3 = Somewhat Satisfied'
});
          questThree.addSelectOption({
    value : '3',
    text : '2 = Neither'
});
          questThree.addSelectOption({
    value : '4',
    text : '1 = Somewhat Dissatisfied'
});
          questThree.addSelectOption({
    value : '5',
    text : '0 = Very Dissatisfied'
});
            var questFour= form.addField({
                id: 'custpage_svc_adv_comm',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
                //source: '2985',
                container: 'svs_adv'
            });
         // questFour.isMandatory = true;
           questFour.addSelectOption({
    value : '',
    text : ''
});
          questFour.addSelectOption({
    value : '1',
    text : '4 = Extremely Satisfied'
});
          questFour.addSelectOption({
    value : '2',
    text : '3 = Somewhat Satisfied'
});
          questFour.addSelectOption({
    value : '3',
    text : '2 = Neither'
});
          questFour.addSelectOption({
    value : '4',
    text : '1 = Somewhat Dissatisfied'
});
          questFour.addSelectOption({
    value : '5',
    text : '0 = Very Dissatisfied'
});
            var questFive = form.addField({
                id: 'custpage_svc_svs_duration',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
                //source: '2986',
                container: 'svs_duration'
            });
         //  questFive.isMandatory = true;
                 questFive.addSelectOption({
    value : '',
    text : ''
});

questFive.addSelectOption({
    value : '1',
    text : '4 = 0-2 weeks'
});
          questFive.addSelectOption({
    value : '2',
    text : '3 = 2-3 weeks'
});
          questFive.addSelectOption({
    value : '3',
    text : '2 = 3-4 weeks'
});
          questFive.addSelectOption({
    value : '4',
    text : '1 = 4-5 weeks'
});
          questFive.addSelectOption({
    value : '5',
    text : '0 = More than 6 Weeks'
});
            var questSix = form.addField({
                id: 'custpage_svc_repair_satisfaction',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
              //  source: '2985',
                container: 'repair_satisfaction'
            });
         // questSix.isMandatory = true;
            questSix.addSelectOption({
    value : '',
    text : ''
});
          questSix.addSelectOption({
    value : '1',
    text : '4 = Extremely Satisfied'
});
          questSix.addSelectOption({
    value : '2',
    text : '3 = Somewhat Satisfied'
});
          questSix.addSelectOption({
    value : '3',
    text : '2 = Neither'
});
          questSix.addSelectOption({
    value : '4',
    text : '1 = Somewhat Dissatisfied'
});
          questSix.addSelectOption({
    value : '5',
    text : '0 = Very Dissatisfied'
});
            var questSeven = form.addField({
                id: 'custpage_svc_repair_order',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
                //source: '93',
                container: 'repair_order'
            });
         //  questSeven.isMandatory = true;
           questSeven.addSelectOption({
    value : '',
    text : ''
});
          questSeven.addSelectOption({
    value : '1',
    text : 'Yes'
});
          questSeven.addSelectOption({
    value : '2',
    text : 'No'
});
            var questEight = form.addField({
                id: 'custpage_svc_dealer_recom',
                type: serverWidget.FieldType.SELECT,
                label: ' ',
                //source: '2988',
                container: 'dealer_recom'
            });
          //  questEight.isMandatory = true;
           questEight.addSelectOption({
    value : '',
    text : ''
});
          questEight.addSelectOption({
    value : '1',
    text : '10'
});
          questEight.addSelectOption({
    value : '2',
    text : '9'
});
          questEight.addSelectOption({
    value : '3',
    text : '8'
});
          questEight.addSelectOption({
    value : '4',
    text : '7'
});
          questEight.addSelectOption({
    value : '5',
    text : '6'
});
          questEight.addSelectOption({
    value : '6',
    text : '5'
});
          questEight.addSelectOption({
    value : '7',
    text : '4'
});
          questEight.addSelectOption({
    value : '8',
    text : '3'
});
          questEight.addSelectOption({
    value : '9',
    text : '2'
});
          questEight.addSelectOption({
    value : '10',
    text : '1'
});
            var questNine = form.addField({
                id: 'custpage_svc_add_feedback',
                type: serverWidget.FieldType.TEXTAREA,
                label: ' ',
                container: 'add_feedback'
            });

            form.addSubmitButton({
                label: 'Submit Survey'
            });
//form.clientScriptModulePath = 'SuiteScripts/GD_Customer_Survey_form.js';
form.clientScriptFileId = 35171441;
            return form;
        }

        function createSurveyResponseRec(context) {


            var venRecId;
            var caseNum;
            var jsonObj = {};
            var records = [];
            var request = context.request;
            log.debug({title:"Response",details:request.parameters});
            var questOne = request.parameters.custpage_svc_exp;
            var questTwo = request.parameters.custpage_svc_appt;
            var questThree = request.parameters.custpage_svc_dealer_review;
            var questFour = request.parameters.custpage_svc_adv_comm;
            var questFive = request.parameters.custpage_svc_svs_duration;
            var questSix = request.parameters.custpage_svc_repair_satisfaction;
            var questSeven = request.parameters.custpage_svc_repair_order;
            var questEight = request.parameters.custpage_svc_dealer_recom;
            var questNine = request.parameters.custpage_svc_add_feedback;
              var claim = request.parameters.custpage_claim;
            log.debug({title:"Response",
            details: questOne+" , " +questTwo+ " , "+questThree +" , "+questFour+" , "+questFive+" , "+questSix+" , "+
            questSeven+"  , "+questEight+" , "+questNine+" , "+claim});
           
            var createSvyRec = record.create({
                type: 'customrecord_gd_customer_survey',
                isDynamic: true,

            });
          createSvyRec.setValue({
                fieldId: 'custrecord_gd_customer_survey_claim',
                value: claim
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_cust_survey_svc_exp',
                value: questOne
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_customer_svc_appt_duration',
                value: questTwo
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_cust_survey_dealer_exp',
                value: questThree
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_customer_svc_adv_comm',
                value: questFour
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_cust_svc_duration',
                value: questFive
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_cust_survey_repair_exp',
                value: questSix
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_customer_svc_sign_order',
                value: questSeven
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_customer_survey_recommend',
                value: questEight
            });
            createSvyRec.setValue({
                fieldId: 'custrecord_gd_additional_feedback',
                value: questNine
            });
			svyRecId = createSvyRec.save({enableSourcing: true,ignoreMandatoryFields: true});

			var newFile = file.load({id:35171440})  //replace id value with HTML file's Internal ID from File Cabinet.
    		var contents = newFile.getContents()
    		context.response.write(contents)
     
        }

        function printDateTime(datetype, addDays, addHours) {

            var d = new Date();
            if (addDays > 0) {
                d.setDate(d.getDate() + addDays);
            }
            if (addHours > 0) {
                d.setHours(d.getHours() + addHours);
            }
            var myMonth = d.getMonth() + 1;
            var myDay = d.getDate();
            var myYear = d.getFullYear();
            var myHour = d.getHours();
            var myMin = d.getMinutes();
            if (myMin > 10) {
                myMin = "0" + myMin;
            }
            if (myHour > 12) {
                myHour = myHour - 12;
                myMin = myMin + " PM";
            } else {
                myMin = myMin + " AM";
            }

            var myTime = myHour + ":" + myMin;
            var myDate;
            switch (datetype) {
                case 'datetime':
                    myDate = myMonth + "/" + myDay + "/" + myYear + " " + myTime;
                    break;
                case 'date':
                    myDate = myMonth + "/" + myDay + "/" + myYear;
                    break;
                case 'time':
                    myDate = myTime;
                    break;
                default:
                    myDate = myMonth + "/" + myDay + "/" + myYear;
            }

            return myDate;
        }



       function today() {
            var now = new Date();
            return format.format({
                value: now,
                type: format.Type.DATETIME
            });
        }


        return {
            onRequest: onRequest
        };

    });