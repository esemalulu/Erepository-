/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/config', 'N/runtime', 'N/workflow'], function(search, record, config, runtime, workflow) {

// Add deletes after creates
//Add task move
//Add segment Move
//Add error tracking

  function getInputData() {
    try {
      log.debug("BEGIN GID")
      var retObj = {}
      var myScript = runtime.getCurrentScript()

      var customerSearch = myScript.getParameter({
        name: 'custscript_cp_time_sea'
      });

      var loadedSearch = search.load({
        id: customerSearch
      })



      return loadedSearch
    } catch (e) {
      log.error("ERR", e)
    }


  }

  function map(context) {
    try {
      log.debug("BEGIN MAP")
      var tranId = context.key
      var values = JSON.parse(context.value).values
      var fromProject = values.custrecord_cp_time_project_fr['value']
      var toProject = values.custrecord_cp_time_project_to['value']
      var fromTask = values.custrecord_cp_time_task_fr['value']
      var toTask = values.custrecord_cp_time_task_to['value']
      var employee = values.custrecord_cp_time_user['value']
      var transferType = values.custrecord_cp_time_type['value']
      var timeItem = values.custrecord_cp_time_item['value']
      var charge = values.custrecord_cp_time_charge
      var tTime = values.custrecord_cp_time_timeentry
      var hoursAdj = values.custrecord_cp_time_hours
      var jeRate = values.custrecord_cp_time_js_rate
      var billableRate = values.custrecord_cp_time_bill_rate
      var openPeriod = values.custrecord_cp_time_period
      var rl1 = values.custrecord_cp_time_seg_rl1['value']
      var rl2 = values.custrecord_cp_time_seg_rl2['value']
      var workAct = values.custrecord_cp_time_seg_wa['value']
      var workLoc = values.custrecord_cp_time_seg_loc['value']
      var euFy = values.custrecord_cp_time_seg_eufy['value']
      var chForm = values.custrecord_cp_time_seg_form['value']
      var bub = values.custrecord_cp_time_seg_bub['value']
      var alYear = values.custrecord_cp_time_seg_year['value']
      var quantity
      var chargeDate
      var chargeMemo
      var laborCost
      var timeEntry
      var invoice
      var timeArr = []
      
    

      if(charge!=''&&charge!=null){

        var chargeLoad = record.load({type:'charge',id:charge})
        timeEntry =  chargeLoad.getValue({fieldId:'timerecord'})
        invoice = chargeLoad.getValue({fieldId:'invoice'})
        quantity = chargeLoad.getValue({fieldId:'quantity'})
        laborCost = findJERate(timeEntry,quantity)
        chargeDate = chargeLoad.getValue({fieldId:'billdate'})
        chargeMemo = chargeLoad.getValue({fieldId:'memo'})

        log.debug("Records","Time Entry: "+timeEntry+", Invoice:"+invoice+", Charge: "+charge)

      } else {
        timeEntry =  tTime
        var timeLoad = record.load({type:'timebill',id:timeEntry})
        invoice = null
        quantity = timeLoad.getValue({fieldId:'hours'})
        laborCost = findJERate(timeEntry,quantity)
        chargeDate = timeLoad.getValue({fieldId:'trandate'})
        chargeMemo = timeLoad.getValue({fieldId:'memo'})

        log.debug("Records","Time Entry: "+timeEntry+", Invoice:"+invoice+", Charge: "+charge)

      }

        if(invoice!=''&&invoice!=null){
          var invoiceLoad = record.load({type:'invoice',id:invoice})
          var chargeLine = invoiceLoad.findSublistLineWithValue({sublistId:"item",fieldId:"chargetype",value:'-13'})
          var lineCharges = invoiceLoad.getSublistValue({sublistId:"item",fieldId:"charges",line:chargeLine})
          log.debug("lineCharges",lineCharges)
          log.debug("chargeLine",chargeLine)



          if(chargeLine!=null && lineCharges.length>0){
            if(lineCharges.indexOf(charge)!='-1'){
                invoiceLoad.removeLine({sublistId:"item",line:chargeLine})

            }

          }
          invoiceLoad.save()
          log.debug("Charge Line Removed From Invoice",chargeLine)

        }

        

    
          var timeVoid  = config.load({
                          type: 'timevoid',
                          isDynamic: true
                          });

           var line = timeVoid.findSublistLineWithValue({
           sublistId: 'time',
           fieldId: 'timeid',
           value: timeEntry
           });
        log.debug("Voiding Time "+timeEntry,line)
           if(line != -1)
           {

           timeVoid.selectLine({
           sublistId: 'time',
           line: line
            });

        timeVoid.setCurrentSublistValue({
           sublistId: 'time',
           fieldId: 'timecheck',
           value: true
        });

        timeVoid.commitLine({
           sublistId: 'time'
        });

        var timeVoidId = timeVoid.save();


        log.debug("Time Entry Voided",timeVoidId)

        if(charge!=''&&charge!=null && openPeriod == 'T'){

          var chargeRecordDelete = record.delete({
            type: record.Type.CHARGE,
            id: charge,
          });

          log.debug("Charge Record Deleted",charge)

        }

          var timeRecordDelete = record.delete({
            type: record.Type.TIME_BILL,
            id: timeEntry,
          });
          log.debug("Time Entry Record Deleted",timeEntry)
        }



        if(transferType == '1'&& hoursAdj == quantity){
          log.debug("FULL TRANSFER")
          var newTimeID = createTime(employee,chargeDate,quantity,toProject,toTask,timeItem,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
          
          log.debug("Full Hours Transferred to new Time Entry", newTimeID)

          if(openPeriod=='F'){
            var newJEID = createJournal(chargeDate,laborCost,hoursAdj,toProject,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)            
            log.debug("New Journal Entry Created", newJEID)
            
            var reloadedTime = record.load({type:record.Type.TIME_BILL,id:newTimeID})
            reloadedTime.setValue({fieldId:"posted",value:true,ignoreFieldChange:false})
            reloadedTime.setValue({fieldId:"custcol_cp_time_je",value:newJEID,ignoreFieldChange:false})
            reloadedTime.setValue({fieldId:"custcol_cp_time_jcr",value:laborCost,ignoreFieldChange:false})
            var newTimeID = reloadedTime.save()
            log.debug("New Time Entry Posted", newTimeID)

            


            
            //var newChargeID = createCharge(toProject,chargeDate,newTimeID,chargeMemo,timeItem,billableRate,quantity)
            
            //log.debug("New Charge Created for Time", newChargeID)
          }

          timeArr.push(newTimeID)

        }else if(transferType == '2' && hoursAdj < quantity){
          var origProjHours = quantity-hoursAdj
          var newprojHours = hoursAdj

          
          var newTimeID = createTime(employee,chargeDate,hoursAdj,toProject,toTask,timeItem,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
          log.debug("PARTIAL TRANSFER CREATING TIME FOR NEW PROJECT",newTimeID)
          timeArr.push(newTimeID)
          
          var origTimeID = createTime(employee,chargeDate,origProjHours,fromProject,fromTask,timeItem,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
          log.debug("PARTIAL TRANSFER CREATING TIME FOR ORIGINAL PROJECT",origTimeID)
          timeArr.push(origTimeID)
          
          log.debug("Partial Hours Transferred Between Time Entries", "New Time: "+newTimeID+", Original Time: "+origTimeID)

          if(openPeriod=='F'){
            var newJEID = createJournal(chargeDate,jeRate,hoursAdj,toProject,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
            log.debug("New Journal Entry Created", newJEID)
            
            var reloadedTime = record.load({type:record.Type.TIME_BILL,id:newTimeID})
            reloadedTime.setValue({fieldId:"posted",value:true,ignoreFieldChange:false})
            reloadedTime.setValue({fieldId:"custcol_cp_time_je",value:newJEID,ignoreFieldChange:false})
            reloadedTime.setValue({fieldId:"custcol_cp_time_jcr",value:jeRate,ignoreFieldChange:false})
            var newTimeID = reloadedTime.save()
            log.debug("New Time Entry Posted", newTimeID)

          
      
            //var newChargeID = createCharge(toProject,chargeDate,newTimeID,chargeMemo,timeItem,billableRate,hoursAdj)
            //log.debug("New Charge Created for Time", newChargeID)

            var origJEID = createJournal(chargeDate,jeRate,origProjHours,fromProject,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
            log.debug("Original Journal Entry Created", origJEID)

            var reloadedTime = record.load({type:record.Type.TIME_BILL,id:origTimeID})
            reloadedTime.setValue({fieldId:"posted",value:true,ignoreFieldChange:false})
            reloadedTime.setValue({fieldId:"custcol_cp_time_je",value:origJEID,ignoreFieldChange:false})
            reloadedTime.setValue({fieldId:"custcol_cp_time_jcr",value:jeRate,ignoreFieldChange:false})
            var newTimeID = reloadedTime.save()
            log.debug("Original Time Entry Posted", newTimeID)


            
            if(charge!=''&& charge!=null){
              //var origCharge = createCharge(fromProject,chargeDate,newTimeID,chargeMemo,timeItem,billableRate,origProjHours)
              //log.debug("Original Charge Created for Time", origCharge)
            }
            
          }




        }else if(transferType == '3'){
          var newTimeID = createTime(employee,chargeDate,hoursAdj,toProject,toTask,timeItem,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
          timeArr.push(newTimeID)
          log.debug("1 Way ADJ CREATING TIME FOR NEW PROJECT",newTimeID)

            if(openPeriod=='F'){
              var newJEID = createJournal(chargeDate,jeRate,hoursAdj,toProject,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear)
              log.debug("New Journal Entry Created", newJEID)

              var reloadedTime = record.load({type:record.Type.TIME_BILL,id:newTimeID})
              reloadedTime.setValue({fieldId:"posted",value:true,ignoreFieldChange:false})
              reloadedTime.setValue({fieldId:"custcol_cp_time_je",value:newJEID,ignoreFieldChange:false})
              reloadedTime.setValue({fieldId:"custcol_cp_time_jcr",value:jeRate,ignoreFieldChange:false})
              var newTimeID = reloadedTime.save()
              log.debug("New Time Entry Posted", newTimeID)
              
            }
          
        }

      

        
      


    } catch (e) {
      record.submitFields({type:"customrecord_cp_time_tran",id:tranId,values:{"custrecord_cp_time_error":"Script Line "+e.lineNumber+" Error: "+e}})
    }

    context.write({
      key: tranId,
      value: timeArr
    })
    

  }

  function reduce(context){
    try{
      log.debug("Starting Reduce",context)
      var queueID = context.key
      var timeArr = JSON.parse(context.values[0])
      record.submitFields({type:"customrecord_cp_time_tran",id:queueID,values:{"custrecord_cp_time_newtime":timeArr}})
    }catch(e){
      record.submitFields({type:"customrecord_cp_time_tran",id:queueID,values:{"custrecord_cp_time_error":"Script Line "+e.lineNumber+" Error: "+e}})
    }
  
  }

  function createTime(employee,chargeDate,hoursAdj,project,task,timeItem,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear){
    var newTimeEntry = record.create({type:record.Type.TIME_BILL})
    newTimeEntry.setValue({fieldId:"employee",value:employee,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"trandate",value:chargeDate,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"hours",value:hoursAdj,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"customer",value:project,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"casetaskevent",value:task,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"item",value:timeItem,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"memo",value:chargeMemo,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"approvalstatus",value:3,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"cseg_veic_mmprog",value:rl1,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"cseg_veic_eeu_initi",value:rl2,ignoreFieldChange:false})
    // newTimeEntry.setValue({fieldId:"cseg_paactivitycode",value:workAct,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"cseg_veic_emp_loc",value:workLoc,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"cseg_veic_eeu_fiscy",value:euFy,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"department",value:chForm,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"class",value:bub,ignoreFieldChange:false})
    newTimeEntry.setValue({fieldId:"cseg_alloc_year",value:alYear,ignoreFieldChange:false})
    var newTimeID = newTimeEntry.save()
    return newTimeID
    
  }

  function createJournal(chargeDate,jeRate,projHours,project,chargeMemo,rl1,rl2,workAct,workLoc,euFy,chForm,bub,alYear){
    var origJE = record.create({type:record.Type.JOURNAL_ENTRY,isDynamic:false})
    origJE.setValue({fieldId:"subsidiary",value:"1",ignoreFieldChange:false})
    origJE.setValue({fieldId:"trandate",value:chargeDate,ignoreFieldChange:false})
    origJE.setValue({fieldId:"approved",value:true,ignoreFieldChange:false})
    
    origJE.setSublistValue({sublistId:"line",fieldId:"account",line:0,value:214})
    origJE.setSublistValue({sublistId:"line",fieldId:"debit",line:0,value:(jeRate*projHours).toFixed(2)})
    origJE.setSublistValue({sublistId:"line",fieldId:"memo",line:0,value:"Time Entry for VEIC: Action, Inc. : 10425 Charge Based Dev Project 01; memo: test"}) // fix
    origJE.setSublistValue({sublistId:"line",fieldId:"entity",line:0,value:project})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_mmprog",line:0,value:rl1})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_eeu_initi",line:0,value:rl2})
    // origJE.setSublistValue({sublistId:"line",fieldId:"cseg_paactivitycode",line:0,value:workAct})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_emp_loc",line:0,value:workLoc})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_eeu_fiscy",line:0,value:euFy})
    origJE.setSublistValue({sublistId:"line",fieldId:"department",line:0,value:chForm})
    origJE.setSublistValue({sublistId:"line",fieldId:"class",line:0,value:bub})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_alloc_year",line:0,value:alYear})

    origJE.setSublistValue({sublistId:"line",fieldId:"account",line:1,value:384})
    origJE.setSublistValue({sublistId:"line",fieldId:"credit",line:1,value:(jeRate*projHours).toFixed(2)})
    origJE.setSublistValue({sublistId:"line",fieldId:"memo",line:1,value:"Time Entry for VEIC: Action, Inc. : 11425 Charge Based Dev Project 11; memo: test"}) // fix
    origJE.setSublistValue({sublistId:"line",fieldId:"entity",line:1,value:project})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_mmprog",line:1,value:rl1})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_eeu_initi",line:1,value:rl2})
    // origJE.setSublistValue({sublistId:"line",fieldId:"cseg_paactivitycode",line:1,value:workAct})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_emp_loc",line:1,value:workLoc})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_veic_eeu_fiscy",line:1,value:euFy})
    origJE.setSublistValue({sublistId:"line",fieldId:"department",line:1,value:chForm})
    origJE.setSublistValue({sublistId:"line",fieldId:"class",line:1,value:bub})
    origJE.setSublistValue({sublistId:"line",fieldId:"cseg_alloc_year",line:1,value:alYear})
    var origJEID = origJE.save()
    return origJEID
    
  }


  function createCharge(project,chargeDate,timeId,chargeMemo,timeItem,billableRate,hoursAdj){
    var newCharge = record.create({type:record.Type.CHARGE,isDynamic:true})
    newCharge.setValue({fieldId:"billto",value:project,ignoreFieldChange:false})
    newCharge.setValue({fieldId:"stage",value:"READY_FOR_BILLING",ignoreFieldChange:false})
    newCharge.setValue({fieldId:"chargedate",value:chargeDate,ignoreFieldChange:false})
    newCharge.setValue({fieldId:"chargetype",value:"-13",ignoreFieldChange:false})
    newCharge.setValue({fieldId:"timerecord",value:timeId,ignoreFieldChange:false})
    newCharge.setValue({fieldId:"memo",value:chargeMemo,ignoreFieldChange:false})
    newCharge.setValue({fieldId:"billingitem",value:timeItem,ignoreFieldChange:false})
    newCharge.setValue({fieldId:"rate",value:billableRate,ignoreFieldChange:false})
    newCharge.setValue({fieldId:"quantity",value:hoursAdj,ignoreFieldChange:false})
    var newChargeID = newCharge.save()
    return newChargeID
    
  }

  function findJERate(timeId,quantity){
      var jeRate
      var amount
    
      var journalentrySearchObj = search.create({
       type: "journalentry",
       filters:
       [
          ["type","anyof","Journal"], 
          "AND", 
          ["time.internalidnumber","equalto",timeId]
       ],
       columns:
       [
          search.createColumn({
             name: "internalid",
             join: "time",
             label: "Internal ID"
          }),
          search.createColumn({name: "amount", label: "Amount"})
       ]
    });

    journalentrySearchObj.run().each(function(result){
       amount = result.getValue({name:"amount"})
    });

    jeRate = (amount/quantity).toFixed(2) 
      
  return jeRate
    
  }








  return {
    getInputData: getInputData,
    map: map,
    reduce:reduce

  };
});
