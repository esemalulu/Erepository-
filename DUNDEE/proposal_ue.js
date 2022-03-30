/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([
  'N/record',
  'N/search',
  'N/https',
  'N/runtime',
  'N/url',
  'N/log',
  'N/email',
  'N/render',
  'N/ui/serverWidget',
  'SuiteScripts/numeral.js'
], function(record, search, https, runtime, url, log, email, render, ui, numeral) {

  /* Add a button to send the proposal, some basic management functions. */
  var beforeLoad = function(context) {

    if ([
      context.UserEventType.EDIT,
      context.UserEventType.CREATE
    ].indexOf(context.type) > -1) {
      var fld = context.form.addField({
        id: 'custpage_offertype', type: ui.FieldType.SELECT, label: context.form.getField({
          id: 'custbody_dundee_offertype'
        }).label
      })
      context.form.insertField({
        field: fld, nextfield: 'custbody_dundee_offertype'
      })
      context.form.getField({
        id: 'custbody_dundee_offertype'
      }).updateDisplayType({
        displayType: ui.FieldDisplayType.HIDDEN
      })
      var offerTypes = {}
      search.create({
        type: 'customrecord_dundee_offertype', filters: [
          ['isinactive', 'is', 'F']
        ], columns: [
          search.createColumn({ name: 'name' }),
          search.createColumn({ name: 'custrecord_dundee_offer_perc', sort: search.Sort.DESC })
        ]
      }).run().each(function(result) {
        fld.addSelectOption({
          value: result.id, text: result.getValue({ name: 'name' }), isSelected: result.id == context.newRecord.getValue({
            fieldId: 'custbody_dundee_offertype'
          })
        })
        offerTypes[result.id] = result.getValue({ name: 'custrecord_dundee_offer_perc' })
        return true
      })
      var sl = context.form.getSublist({
        id: 'item'
      })
      var addrfld = sl.addField({
        id: 'custpage_addrchange', type: ui.FieldType.SELECT, label: 'Change Address'
      })
      context.form.addField({
        id: 'custpage_locals', type: ui.FieldType.INLINEHTML, label: 's'
      }).defaultValue = '<script type="text/javascript">var DUNDEESPARK_OFFERTYPES = '+JSON.stringify(offerTypes)+'; var confirm_old = confirm; var confirm = function(b) { if (b == "The line total amount is not equal to the item price times the quantity.  Is this correct?") return true; else return confirm_old(b); };</script>'

      if (context.type == context.UserEventType.CREATE) context.form.addField({
        id: 'custpage_origperc', type: ui.FieldType.INLINEHTML, label: 's'
      }).defaultValue = '<script type="text/javascript">var ORIG_PERC = 1;</script>'
      else if (context.type == context.UserEventType.EDIT) context.form.addField({
        id: 'custpage_origperc', type: ui.FieldType.INLINEHTML, label: 's'
      }).defaultValue = '<script type="text/javascript">var ORIG_PERC = '+numeral(offerTypes[context.newRecord.getValue({
        fieldId: 'custbody_dundee_offertype'
      })]).value()+';</script>'

      return
    }

    if ([
      context.UserEventType.VIEW
    ].indexOf(context.type) == -1)
      return;

    if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) return

    // determine the url for the suitelet to send the proposals via email
    var propurl = url.resolveScript({
      scriptId: 'customscript_dundee_proposal_sl', deploymentId: 1, params: {
        proposal: context.newRecord.id
      }
    })
    context.form.addButton({
      id: 'custpage_sendprop', label: 'Send Proposal', functionName: '(function() { return window.open(\''+[propurl, 'action=sendprop'].join('&')+'\', \'propwindow\', \'location=0,status=1,scrollbars=0,width=600,height=630\'); })'
    })
    context.form.addButton({
      id: 'custpage_senddd', label: 'Send Due Diligence Doc', functionName: '(function() { return window.open(\''+[propurl, 'action=senddd'].join('&')+'\', \'propwindow\', \'location=0,status=1,scrollbars=0,width=810,height=630\'); })'
    })
    context.form.addButton({
      id: 'custpage_editprop', label: 'Edit Proposal', functionName: '(function() { return window.open(\''+[propurl, 'action=editprop'].join('&')+'\', \'propwindow\', \'location=0,status=1,scrollbars=0,width=400,height=300\'); })'
    })

  }

  var afterSubmit = function(context) {

    var sendNotificationEmail = function() {
      if (!context.newRecord.getValue({
        fieldId: 'salesrep'
      })) return
      var template = record.load({
        type: record.Type.EMAIL_TEMPLATE, id: 5
      })
      var renderer = render.create()
      renderer.templateContent = template.getValue({
        fieldId: 'content'
      })
      renderer.addRecord({
        templateName: 'employee', record: record.load({
          type: record.Type.EMPLOYEE, id: context.newRecord.getValue({
            fieldId: 'salesrep'
          })
        })
      })
      var thisProposal = record.load({
        type: record.Type.ESTIMATE, id: context.newRecord.id
      })
      renderer.addRecord({
        templateName: 'transaction', record: thisProposal
      })
      renderer.addRecord({
        templateName: 'entity', record: record.load({
          type: record.Type.JOB, id: thisProposal.getValue({
            fieldId: 'entity'
          })
        })
      })
      email.send({
        author:         runtime.getCurrentUser().id,
        recipients:     context.newRecord.getValue({
          fieldId: 'salesrep'
        }),
        subject:        template.getValue({
          fieldId: 'subject'
        }),
        body:           renderer.renderAsString(),
        relatedRecords: {
          transactionId:parseInt(thisProposal.id)
        }
      })

    }

    if (context.type == context.UserEventType.CREATE && context.newRecord.getValue({
      fieldId: 'custbody1'
    })) sendNotificationEmail()
    if (context.type == context.UserEventType.EDIT) {
      if (context.newRecord.getValue({
        fieldId: 'custbody1'
      }) && !context.oldRecord.getValue({
        fieldId: 'custbody1'
      })) sendNotificationEmail()
    }
  }

  return {
    beforeLoad: beforeLoad,
    afterSubmit: afterSubmit
  }

})
