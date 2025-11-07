/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/search', 'N/ui/serverWidget', 'N/https', 'N/record', 'N/format', 'N/url','N/redirect','N/error'],
    /**
     * @param{runtime} runtime
     * @param{search} search
     * @param{serverWidget} serverWidget
     */
    (runtime, search, serverWidget, https, record, format, url,redirect,error) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (context) => {

            const request = context.request;
            const response = context.response;

            if(request.method == https.Method.GET) {
              var params = context.request.parameters
              var job = params.project
              var stage= params.stage
              var use= params.use
              var type= params.type


              log.debug("params",params)
                const form = serverWidget.createForm({
                    title: 'Update Charges'
                });
                const rec = record.get;

                form.addSubmitButton({
                    label : 'Submit'
                });

                form.clientScriptFileId = 18551;

                var chargeStage = form.addField({id:"custpage_stage",label:"Stage",type:serverWidget.FieldType.SELECT})

                chargeStage.addSelectOption({value : '',text : ''});
                chargeStage.addSelectOption({value : 'READY_FOR_BILLING',text : 'Ready'});
                chargeStage.addSelectOption({value : 'BILLED',text : 'Processed'});
                chargeStage.addSelectOption({value : 'NON_BILLABLE',text : 'Non-Billable'});
                chargeStage.addSelectOption({value : 'HOLD_FOR_BILLING',text : 'Hold'});
                if(stage!=''&&stage!=null){
                  chargeStage.defaultValue = stage
                }
                var chargeUse = form.addField({id:"custpage_use",label:"Charge Use",type:serverWidget.FieldType.SELECT})
                chargeUse.addSelectOption({value : '',text : ''});
                chargeUse.addSelectOption({value : 'Forecast',text : 'Forecast'});
                chargeUse.addSelectOption({value : 'Actual',text : 'Actual'});
                if(use!=''&&use!=null){
                  chargeUse.defaultValue = use
                }
                var chargeType = form.addField({id:"custpage_type",label:"Charge Type",type:serverWidget.FieldType.SELECT,source:"chargetype"})
                if(type!=''&&type!=null){
                  chargeType.defaultValue = type
                }
                var project = form.addField({id:"custpage_project",label:"Project",type:serverWidget.FieldType.SELECT,source:"job"})
                if(job!=''&&job!=null){
                    project.defaultValue = job
                }


                const sublist = form.addSublist({
                    id: 'custpage_ss_to_sl_sublist',
                    type: serverWidget.SublistType.LIST,
                    label: 'Charges'
                });

                let checkbox = sublist.addField({
                    id: 'custpage_mark',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Select'
                });

                sublist.addMarkAllButtons();

                const searchObj = search.load({
                    id: 933
                });

                form.addButton({
            id : 'custpage_refresh',
            label : 'Refresh Charge List',
            functionName: "refresh()"
        });
        var iteSearchFilters = searchObj.filters;
        if(job!=''&&job!=null){
          var iteSearchFilterOne = search.createFilter({name:"internalidnumber",join:"job",operator:"equalto",values:job})
          iteSearchFilters.push(iteSearchFilterOne)
        }
        if(stage!=''&&stage!=null){
          var iteSearchFilterOne = search.createFilter({name:"stage",operator:"anyof",values:stage})
          iteSearchFilters.push(iteSearchFilterOne)
        }
        if(use!=''&&use!=null){
          var iteSearchFilterOne = search.createFilter({name:"use",operator:"anyof",values:use})
          iteSearchFilters.push(iteSearchFilterOne)
        }
        if(type!=''&&type!=null){
          var iteSearchFilterOne = search.createFilter({name:"chargetype",operator:"anyof",values:type})
          iteSearchFilters.push(iteSearchFilterOne)
        }

                let i = 0;
                let field;
                searchObj.run().each(function(result) {

                    for(let j = 0; j < searchObj.columns.length; j++) {

                        let column = searchObj.columns[j];


                        if(i == 0) {
                            field = sublist.addField({
                                id: `custpage_${column.name}_${j}`,
                                type: serverWidget.FieldType.TEXT,
                                label: column.label
                            });
                            log.debug("S",`custpage_${column.name}_${j}`)
                        }


                        let cellValue = result.getText(column);
                        if(!cellValue)
                            cellValue = result.getValue(column);
                        if(!cellValue)
                            cellValue = " ";
                        sublist.setSublistValue({
                            id: `custpage_${column.name}_${j}`,
                            line: i,
                            value: cellValue
                        });

                    }
                    i++;
                    return true;
                });

              var  selectField = sublist.addField({
                    id: `custpage_stage`,
                    type: serverWidget.FieldType.SELECT,
                    label: "Set Charge Stage to"
                }).updateDisplayType({
          displayType : serverWidget.FieldDisplayType.ENTRY
      });
      selectField.addSelectOption({
        value : '',
        text : ''
      });
      selectField.addSelectOption({
        value : 'HOLD_FOR_BILLING',
        text : 'Hold'
      });
      selectField.addSelectOption({
        value : 'READY_FOR_BILLING',
        text : 'Ready'
      });
      selectField.addSelectOption({
        value : 'NON_BILLABLE',
        text : 'Non-Billable'
      });
var memoField = sublist.addField({
      id: `custpage_memo`,
      type: serverWidget.FieldType.TEXTAREA,
      label: "Set Memo to"
  }).updateDisplayType({
displayType : serverWidget.FieldDisplayType.ENTRY
});
                response.writePage({
                    pageObject: form
                });

            }else{
              var itemArr = []
              var numLines = context.request.getLineCount({
                group: "custpage_ss_to_sl_sublist"
              })
          
              var index = 0
              for(var i =0;i<numLines;i++){
                try{
                  var select = context.request.getSublistValue({
                    group: 'custpage_ss_to_sl_sublist',
                    name: "custpage_mark",
                    line: i
                  });
              
                  if(select=='T'){
  
                    var internalID = context.request.getSublistValue({
                      group: 'custpage_ss_to_sl_sublist',
                      name: "custpage_internalid_0",
                      line: i
                    });
                    var currStage = context.request.getSublistValue({
                      group: 'custpage_ss_to_sl_sublist',
                      name: "custpage_stage_1",
                      line: i
                    });
                    var setStage = context.request.getSublistValue({
                      group: 'custpage_ss_to_sl_sublist',
                      name: "custpage_stage",
                      line: i
                    });
                    var memo = context.request.getSublistValue({
                      group: 'custpage_ss_to_sl_sublist',
                      name: "custpage_memo",
                      line: i
                    });
  
                    log.debug(currStage,setStage)
                      if((setStage!=''&&setStage!=null)||(memo!=''&&memo!=null)){
                        record.submitFields({type:"charge",id:internalID,values:{"stage":setStage,"memo":memo}})
                      }
                    
                    index++
  
                  }
                }catch(e){
                  log.debug("error",e)
                  var custom_error = error.create({
                    name: 'ERROR_UPDATING CHARGE',
                    message: 'Can not update Charge '+internalID+" from "+currStage+" stage to "+setStage,
                    notifyOff: false
                  });
                  throw custom_error.message
                  
                }
                

              }
            
            }

        }

        return {onRequest}

    });
