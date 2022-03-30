/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/search',
  'N/config',
  'N/file',
  'N/record',
  'N/url',
  'N/https',
  'N/file',
  'N/render',
  'N/email',
  'SuiteScripts/underscore.js',
  'SuiteScripts/moment.js',
  'SuiteScripts/numeral.js',
  'SuiteScripts/dundee_proposal_lib.js',
],
function(runtime, ui, search, config, file, record, url, https, file, render, email, _, moment, numeral, lib) {

  /*
    Shows the initial form to the user, based upon what informaiton we choose to send.
  */
  var _BuildFormDD = function(context) {

    // create the form object
    var form = ui.createForm({
      hideNavBar: true,
      title: [
        'Send Due Diligence Documentation'
      ].join(' - ')
    })

    // load up the template.....
    var template = record.load({
      type: record.Type.EMAIL_TEMPLATE, id: 4
    })

    // helpful hidden fields first..
    var fieldList = [
      {id: 'custpage_proposalid', label: 's', type: ui.FieldType.TEXT, hidden: true, value: context.request.parameters.proposal},
      {id: 'custpage_doctype', label: 's', type: ui.FieldType.TEXT, hidden: true, value: 'duediligence'},
      {id: 'custpage_baseurl', label: 's', type: ui.FieldType.TEXT, hidden: true, value: url.resolveScript({
        scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, params: {
          proposal: context.request.parameters.proposal
        }
      })},
      {id: 'custpage_subject', label: 'Subject', type: ui.FieldType.TEXT, container: 'emailmain', value: template.getValue({
        fieldId: 'subject'
      }), size: {
        height: 200, width: 62
      }},
      {id: 'custpage_body', label: 'Body', type: ui.FieldType.RICHTEXT, container: 'emailmain', value: template.getValue({
        fieldId: 'content'
      }), size: {
        height: 200, width: 100
      }},
      {id: 'custpage_origleaseagreement', label: 'Original Lease Agreement', type: ui.FieldType.CHECKBOX, container: 'requirementsmain', value: 'T'},
      {id: 'custpage_govissuedid', label: 'Passport or Birth Certificate', type: ui.FieldType.CHECKBOX, container: 'requirementsmain', value: 'T'},
      {id: 'custpage_recentanntax', label: 'Most Recent Annual Property Tax Statement', type: ui.FieldType.CHECKBOX, container: 'requirementsmain', value: 'T'},
      {id: 'custpage_prooflastpay', label: 'Proof of Last Three Mortgage Payments', type: ui.FieldType.CHECKBOX, container: 'requirementsmain', value: 'T'},
      {id: 'custpage_twoyearleasepay', label: 'Two Years of Historical Lease Payments', type: ui.FieldType.CHECKBOX, container: 'requirementsmain', value: 'T'},
      {id: 'custpage_constatingdoc', label: 'Copy of the Constating Documents of the Corporation', type: ui.FieldType.CHECKBOX, container: 'requirementsmain', value: 'T'},

      {id: 'custpage_addressto', label: 'Address Email To', type: ui.FieldType.SELECT, container: 'main', mandatory: true},
      {id: 'custpage_testsendtome', label: 'Test Send to Me', type: ui.FieldType.CHECKBOX, container: 'main', help: 'Want to see how your client sees the emails? Check this box to send email to you only, irrespective of other selections.', startcol: true},
      {id: 'custpage_ccme', label: 'CC Me', type: ui.FieldType.CHECKBOX, container: 'main', value: 'T'}
    ]

    // main line section, offer content to show
    form.addFieldGroup({
      id: 'main', label: 'Main'
    })

    form.addSubtab({
      id: 'email', label: 'Email'
    })
    form.addFieldGroup({
      id: 'emailmain', label: 'Email Content', tab: 'email'
    }).isSingleColumn = true
    form.addSubtab({
      id: 'requirements', label: 'Documentation Requested'
    })
    form.addFieldGroup({
      id: 'requirementsmain', label: 'What Documents are Required?', tab: 'requirements'
    })
    var reqList = form.addSublist({
      id: 'custpage_recipients', label: 'CC Recipients', type: ui.SublistType.LIST
    })
    ;[
      { id: 'select', type: ui.FieldType.CHECKBOX, label: 'Select' },
      { id: 'contact', type: ui.FieldType.SELECT, label: 'Contact', source: record.Type.CONTACT, hidden: true },
      { id: 'contactname', type: ui.FieldType.TEXT, label: 'Contact', inline: true },
      { id: 'email', type: ui.FieldType.EMAIL, label: 'EMAIL', inline: true },
      { id: 'role', type: ui.FieldType.TEXT, label: 'Role', inline: true }
    ].map(function(field) {
      var fld = reqList.addField(field)
      if (field.inline) fld.updateDisplayType({
        displayType: ui.FieldDisplayType.INLINE
      })
      if (field.hidden) fld.updateDisplayType({
        displayType: ui.FieldDisplayType.HIDDEN
      })
    })

    // for the fields added to the array, create them all
    fieldList.map(function(field) {
      var fld = form.addField(field)
      if (field.hidden) fld.updateDisplayType( { displayType: ui.FieldDisplayType.HIDDEN })
      if (field.value) fld.defaultValue = field.value
      if (field.help) fld.setHelpText({ help: field.help })
      if (field.size) fld.updateDisplaySize({
        height: field.size.height || null,
        width: field.size.width || null
      })
      if (field.mandatory) fld.isMandatory = true
      if (field.startcol) fld.updateBreakType({
        breakType: ui.FieldBreakType.STARTCOL
      })
    })

    // get the available contacts for this record
    var index = 0
    var contacts = search.create({
      type: record.Type.CONTACT, filters: [
        ['isinactive', 'is', 'F'], 'and',
        ['formulanumeric:LENGTH({email})', 'greaterthan', 0], 'and',
        ['job.internalid', 'anyof', search.lookupFields({
          type: record.Type.ESTIMATE, id: context.request.parameters.proposal, columns: ['entity']
        }).entity[0].value]
      ], columns: [
        search.createColumn({ name: 'email' }),
        search.createColumn({ name: 'role' }),
        search.createColumn({ name: 'entityid', sort: search.Sort.ASC })
      ]
    }).run().each(function(result) {
      reqList.setSublistValue({
        id: 'contact', line: index, value: result.id
      })
      reqList.setSublistValue({
        id: 'contactname', line: index, value: result.getValue({ name: 'entityid' }) || ' '
      })
      reqList.setSublistValue({
        id: 'email', line: index, value: result.getValue({ name: 'email' })
      })
      reqList.setSublistValue({
        id: 'role', line: index, value: result.getText({ name: 'role' }) || ' '
      })
      form.getField({
        id: 'custpage_addressto'
      }).addSelectOption({
        value: result.id, text: result.getValue({ name: 'entityid' })
      })
      index++
      return true
    })

    // add the buttons
    if (runtime.getCurrentUser().role != '1002') form.addSubmitButton({
      label: 'Send' // submit
    })
    var baseURL = url.resolveScript({
      scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, params: {
        proposal: context.request.parameters.proposal
      }
    })
    form.addButton({
      id: 'custpage_previewproposal', label: 'Preview', functionName: 'previewDD'
    })
    form.addButton({
      id: 'custpage_close', label: 'Close', functionName: 'close'
    })

    // add the client script to the form
    form.clientScriptFileId = file.load({
      id: 'SuiteScripts/dundee_proposal_cl.js'
    }).id

    // respond to the user
    context.response.writePage({
      pageObject: form
    })

  }


  /*
    Shows the initial form to the user, based upon what informaiton we choose to send.
  */
  var _BuildFormProp = function(context) {

    // create the form object
    var form = ui.createForm({
      hideNavBar: true,
      title: [
        'Send Proposal'
      ].join(' - ')
    })

    // load up the template.....
    var template = record.load({
      type: record.Type.EMAIL_TEMPLATE, id: 3
    })

    // helpful hidden fields first..
    var fieldList = [
      {id: 'custpage_proposalid', label: 's', type: ui.FieldType.TEXT, hidden: true, value: context.request.parameters.proposal},
      {id: 'custpage_doctype', label: 's', type: ui.FieldType.TEXT, hidden: true, value: 'proposal'},
      {id: 'custpage_baseurl', label: 's', type: ui.FieldType.TEXT, hidden: true, value: url.resolveScript({
        scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, params: {
          proposal: context.request.parameters.proposal
        }
      })},
      {id: 'custpage_subject', label: 'Subject', type: ui.FieldType.TEXT, container: 'emailmain', value: template.getValue({
        fieldId: 'subject'
      }), size: {
        height: 200, width: 62
      }},
      {id: 'custpage_body', label: 'Body', type: ui.FieldType.RICHTEXT, container: 'emailmain', value: template.getValue({
        fieldId: 'content'
      }), size: {
        height: 200, width: 100
      }},
      {id: 'custpage_addressto', label: 'Address Email To', type: ui.FieldType.SELECT, container: 'main', mandatory: true},
      {id: 'custpage_testsendtome', label: 'Test Send to Me', type: ui.FieldType.CHECKBOX, container: 'main', help: 'Want to see how your client sees the emails? Check this box to send email to you only, irrespective of other selections.', startcol: true},
      {id: 'custpage_ccme', label: 'CC Me', type: ui.FieldType.CHECKBOX, container: 'main', value: 'T'}
    ]

    // main line section, offer content to show
    form.addFieldGroup({
      id: 'main', label: 'Main'
    })
    form.addSubtab({
      id: 'email', label: 'Email'
    })
    form.addFieldGroup({
      id: 'emailmain', label: 'Email Content', tab: 'email'
    }).isSingleColumn = true
    var reqList = form.addSublist({
      id: 'custpage_recipients', label: 'CC Recipients', type: ui.SublistType.LIST
    })
    ;[
      { id: 'select', type: ui.FieldType.CHECKBOX, label: 'Select' },
      { id: 'contact', type: ui.FieldType.TEXT, label: 'Contact', hidden: true },
      { id: 'contactname', type: ui.FieldType.TEXT, label: 'Contact', inline: true },
      { id: 'email', type: ui.FieldType.EMAIL, label: 'EMAIL', inline: true },
      { id: 'role', type: ui.FieldType.TEXT, label: 'Role', inline: true }
    ].map(function(field) {
      var fld = reqList.addField(field)
      if (field.inline) fld.updateDisplayType({
        displayType: ui.FieldDisplayType.INLINE
      })
      if (field.hidden) fld.updateDisplayType({
        displayType: ui.FieldDisplayType.HIDDEN
      })
    })

    // for the fields added to the array, create them all
    fieldList.map(function(field) {
      var fld = form.addField(field)
      if (field.hidden) fld.updateDisplayType( { displayType: ui.FieldDisplayType.HIDDEN })
      if (field.value) fld.defaultValue = field.value
      if (field.help) fld.setHelpText({ help: field.help })
      if (field.size) fld.updateDisplaySize({
        height: field.size.height || null,
        width: field.size.width || null
      })
      if (field.mandatory) fld.isMandatory = true
      if (field.startcol) fld.updateBreakType({
        breakType: ui.FieldBreakType.STARTCOL
      })
    })

    // get the available contacts for this record
    var index = 0
    var contacts = search.create({
      type: record.Type.CONTACT, filters: [
        ['isinactive', 'is', 'F'], 'and',
        ['formulanumeric:LENGTH({email})', 'greaterthan', 0], 'and',
        ['job.internalid', 'anyof', search.lookupFields({
          type: record.Type.ESTIMATE, id: context.request.parameters.proposal, columns: ['entity']
        }).entity[0].value]
      ], columns: [
        search.createColumn({ name: 'email' }),
        search.createColumn({ name: 'role' }),
        search.createColumn({ name: 'entityid', sort: search.Sort.ASC })
      ]
    }).run().each(function(result) {
      reqList.setSublistValue({
        id: 'contact', line: index, value: result.id
      })
      reqList.setSublistValue({
        id: 'contactname', line: index, value: result.getValue({ name: 'entityid' }) || ' '
      })
      reqList.setSublistValue({
        id: 'email', line: index, value: result.getValue({ name: 'email' })
      })
      reqList.setSublistValue({
        id: 'role', line: index, value: result.getText({ name: 'role' }) || ' '
      })
      index++
      form.getField({
        id: 'custpage_addressto'
      }).addSelectOption({
        value: result.id, text: result.getValue({ name: 'entityid' })
      })
      return true
    }.bind(this))
    var thisProposal = record.load({
      type: record.Type.ESTIMATE, id: context.request.parameters.proposal
    })
    if (thisProposal.getValue({ fieldId: 'salesrep' })) {
      var thisrep = record.load({
        type: record.Type.EMPLOYEE, id: thisProposal.getValue({ fieldId: 'salesrep' })
      })
      if (thisrep.getValue({ fieldId: 'email' })) {
        if (reqList.lineCount == -1)
          var index = 0
        else var index = reqList.lineCount
        reqList.setSublistValue({
          id: 'contact', line: index, value: thisProposal.getValue({ fieldId: 'salesrep' })
        })
        reqList.setSublistValue({
          id: 'contactname', line: index, value: [thisrep.getValue({ fieldId: 'firstname' }), thisrep.getValue({ fieldId: 'lastname' })].join(" ")
        })
        reqList.setSublistValue({
          id: 'email', line: index, value: thisrep.getValue({ fieldId: 'email' })
        })
        reqList.setSublistValue({
          id: 'role', line: index, value: 'Sales Rep'
        })
      }
    }

    // add the buttons
    if (runtime.getCurrentUser().role != '1002') form.addSubmitButton({
      label: 'Send' // submit
    })
    var baseURL = url.resolveScript({
      scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, params: {
        proposal: context.request.parameters.proposal
      }
    })
    form.addButton({
      id: 'custpage_previewproposal', label: 'Preview', functionName: 'previewProposal'
    })
    form.addButton({
      id: 'custpage_close', label: 'Close', functionName: 'close'
    })

    // add the client script to the form
    form.clientScriptFileId = file.load({
      id: 'SuiteScripts/dundee_proposal_cl.js'
    }).id

    // respond to the user
    context.response.writePage({
      pageObject: form
    })

  }

  var _BuildRepEdit = function(context) {

    if (context.request.method == https.Method.POST) {

      var thisProposal = record.load({
        type: record.Type.ESTIMATE, id: context.request.parameters.custpage_proposalid
      })
      var offerPerc = numeral(search.lookupFields({
        type: 'customrecord_dundee_offertype', id: context.request.parameters.custpage_offertype, columns: ['custrecord_dundee_offer_perc']
      }).custrecord_dundee_offer_perc)
      var origOfferPerc = numeral(search.lookupFields({
        type: 'customrecord_dundee_offertype', id: thisProposal.getValue({ fieldId: 'custbody_dundee_offertype' }), columns: ['custrecord_dundee_offer_perc']
      }).custrecord_dundee_offer_perc)

      thisProposal.setValue({
        fieldId: 'custbody2', value: context.request.parameters.custpage_status
      })
      thisProposal.setValue({
        fieldId: 'custbody_dundee_offertype', value: context.request.parameters.custpage_offertype
      })
      for (var i=0; i<thisProposal.getLineCount({
        sublistId: 'item'
      }); i++) {
        if (thisProposal.getSublistValue({
          sublistId: 'item', line: i, fieldId: 'amount'
        }) > 0) {
          var quantity = thisProposal.getSublistValue({
            sublistId: 'item', line: i, fieldId: 'quantity'
          }), rate = thisProposal.getSublistValue({
            sublistId: 'item', line: i, fieldId: 'rate'
          }), amount = thisProposal.getSublistValue({
            sublistId: 'item', line: i, fieldId: 'amount'
          })
          if (!quantity) break
          if (!amount) break
          thisProposal.setSublistValue({
            sublistId: 'item', line: i, fieldId: 'amount', value: (function() {
              var origOfferAmount = numeral(amount).divide(origOfferPerc)
              return origOfferAmount.multiply(offerPerc).value()
            })(), options: {
              ignoreFieldChange: true
            }
          })
        }
      }

      thisProposal.save()

      return context.response.write("<html><head><script type='text/javascript'>function run() { window.opener.location.reload(false); window.close() };</script></head><body onload='run();'></body></html>")
    }

    // create the form object
    var form = ui.createForm({
      hideNavBar: true,
      title: [
        'Edit Proposal'
      ].join(' - ')
    })

    form.addFieldGroup({
      id: 'main', label: 'Main'
    }).isSingleColumn = true
    var fieldList = [
      {id: 'custpage_proposalid', label: 's', type: ui.FieldType.TEXT, hidden: true, value: context.request.parameters.proposal},
      {id: 'custpage_action', label: 's', type: ui.FieldType.TEXT, hidden: true, value: context.request.parameters.action},
      {id: 'custpage_offertype', label: 'Offer Type', type: ui.FieldType.SELECT, container: 'main'},
      {id: 'custpage_status', label: 'Estimate Status', type: ui.FieldType.SELECT, container: 'main'}
    ]
    // for the fields added to the array, create them all
    ;fieldList.map(function(field) {
      var fld = form.addField(field)
      if (field.hidden) fld.updateDisplayType( { displayType: ui.FieldDisplayType.HIDDEN })
      if (field.value) fld.defaultValue = field.value
      if (field.help) fld.setHelpText({ help: field.help })
      if (field.size) fld.updateDisplaySize({
        height: field.size.height || null,
        width: field.size.width || null
      })
      if (field.mandatory) fld.isMandatory = true
      if (field.startcol) fld.updateBreakType({
        breakType: ui.FieldBreakType.STARTCOL
      })
    })
    var thisProposal = record.load({
      type: record.Type.ESTIMATE, id: context.request.parameters.proposal
    })
    search.create({
      type: 'customrecord_dundee_offertype', filters: [
        ['isinactive', 'is', 'F']
      ], columns: [
        search.createColumn({ name: 'name' }),
        search.createColumn({ name: 'custrecord_dundee_offer_perc', sort: search.Sort.DESC })
      ]
    }).run().each(function(result) {
      form.getField({
        id: 'custpage_offertype'
      }).addSelectOption({
        value: result.id, text: result.getValue({ name: 'name' }), isSelected: result.id == thisProposal.getValue({
          fieldId: 'custbody_dundee_offertype'
        })
      })
      return true
    })
    search.create({
      type: 'customlist9', filters: [
        ['isinactive', 'is', 'F']
      ], columns: [
        search.createColumn({ name: 'name' }),
      ]
    }).run().each(function(result) {
      form.getField({
        id: 'custpage_status'
      }).addSelectOption({
        value: result.id, text: result.getValue({ name: 'name' }), isSelected: result.id == thisProposal.getValue({
          fieldId: 'custbody2'
        })
      })
      return true
    })

    // add the buttons
    form.addButton({
      id: 'custpage_close', label: 'Close', functionName: '(function() { return window.close(); })'
    })
    form.addSubmitButton({
      label: 'Save' // submit
    })
    // respond to the user
    context.response.writePage({
      pageObject: form
    })

  }

  var onRequest = function(context) {

    if (context.request.method == https.Method.GET) {
      if (context.request.parameters.action == 'sendprop') return _BuildFormProp(context)
      if (context.request.parameters.action == 'senddd') return _BuildFormDD(context)
      if (context.request.parameters.action == 'previewproposal') return context.response.writeFile({
        file: lib.GenerateProposal({
          proposal: context.request.parameters.proposal
        }), isInline: true
      })
      if (context.request.parameters.action == 'editprop') return _BuildRepEdit(context)
      if (context.request.parameters.action == 'previewdd') return context.response.writeFile({
        file: lib.GenerateDueDiligence({
          proposal: context.request.parameters.proposal,
          docs: {
            origleaseagreement:     context.request.parameters.custparam_origleaseagreement,
      		  govissuedid:            context.request.parameters.custparam_govissuedid,
      		  recentanntax:           context.request.parameters.custparam_recentanntax,
      		  prooflastpay:           context.request.parameters.custparam_prooflastpay,
      		  twoyearleasepay:        context.request.parameters.custparam_twoyearleasepay,
      		  constatingdoc:          context.request.parameters.custparam_constatingdoc
          }
        }), isInline: true
      })
    } else if (context.request.method == https.Method.POST) {

      if (context.request.parameters.custpage_action == 'editprop')
        return _BuildRepEdit(context)

      //collect the recipents
      var recipients = [context.request.parameters.custpage_addressto],
          cc_recipients = [],
          docs = []
      for (var i=0; i<context.request.getLineCount({
        group: 'custpage_recipients'
      }); i++) {
        if (context.request.getSublistValue({
          group: 'custpage_recipients', line: i, name: 'select'
        }) == 'T') cc_recipients.push(context.request.getSublistValue({
          group: 'custpage_recipients', line: i, name: 'contact'
        }))
      }
      if (context.request.parameters.custpage_ccme == 'T')
        cc_recipients.push(runtime.getCurrentUser().id)

      // override
      if (context.request.parameters.custpage_testsendtome == 'T') {
        recipients = [runtime.getCurrentUser().id]
        cc_recipients = []
      }

      //go through the template, and create the body and subject
      var renderer = render.create()
      renderer.templateContent = context.request.parameters.custpage_body
      renderer.addRecord({
        templateName: 'employee', record: record.load({
          type: record.Type.EMPLOYEE, id: runtime.getCurrentUser().id
        })
      })
      renderer.addRecord({
        templateName: 'contact', record: record.load({
          type: record.Type.CONTACT, id: context.request.parameters.custpage_addressto
        })
      })
      var thisProposal = record.load({
        type: record.Type.ESTIMATE, id: context.request.parameters.custpage_proposalid
      })
      renderer.addRecord({
        templateName: 'transaction', record: thisProposal
      })

      if (context.request.parameters.custpage_doctype == 'duediligence')
        docs.push(lib.GenerateDueDiligence({
          proposal: context.request.parameters.custpage_proposalid,
          docs: {
            origleaseagreement:     context.request.parameters.custpage_origleaseagreement,
      		  govissuedid:            context.request.parameters.custpage_govissuedid,
      		  recentanntax:           context.request.parameters.custpage_recentanntax,
      		  prooflastpay:           context.request.parameters.custpage_prooflastpay,
      		  twoyearleasepay:        context.request.parameters.custpage_twoyearleasepay,
      		  constatingdoc:          context.request.parameters.custpage_constatingdoc
          }
        }))
      else if (context.request.parameters.custpage_doctype == 'proposal')
        docs.push(lib.GenerateProposal({
          proposal: context.request.parameters.custpage_proposalid
        }))

      // now generate the email and send it!
      var relatedRecords = undefined
      if (context.request.parameters.custpage_testsendtome != 'T') {
        relatedRecords = {
          entityId:       parseInt(thisProposal.getValue({ fieldId: 'entity' })),
          transactionId:  parseInt(context.request.parameters.custpage_proposalid)
        }
      }
      email.send({
        author:         runtime.getCurrentUser().id,
        recipients:     recipients,
        cc:             cc_recipients,
        subject:        context.request.parameters.custpage_subject,
        body:           renderer.renderAsString(),
        attachments:    docs,
        relatedRecords: relatedRecords
      })

      // create the form object
      var form = ui.createForm({
        hideNavBar: true,
        title: [
          (function() {
            if (context.request.parameters.custpage_doctype == 'duediligence')
              return 'Send Due Diligence Documentation'
            if (context.request.parameters.custpage_doctype == 'proposal')
              return 'Send Proposal'
          })(),
          'OK'
        ].join(' - ')
      })

      form.addField({
        id: 'custpage_thanks', type: ui.FieldType.INLINEHTML, label: 's'
      }).defaultValue = '<p>Your email is sending now, feel free to close this window.</p>'

      form.addButton({
        id: 'custpage_close', label: 'Close', functionName: '(function() { return window.close(); })'
      })
      context.response.writePage({
        pageObject: form
      })
    }

  }



  return {
    onRequest: onRequest
  }
})
