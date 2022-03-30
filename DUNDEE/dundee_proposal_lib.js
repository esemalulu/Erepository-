/**
 *@NApiVersion 2.x
 */
define([
 'N/search',
 'N/record',
 'N/runtime',
 'N/render',
 'N/file',
 'N/xml',
 'N/config',
 'N/util',
 'SuiteScripts/moment.js',
 'SuiteScripts/underscore.js'
], function(search, record, runtime, render, file, xml, config, util, moment, _) {

  var companyInfo = null

  function _getData() {
    return {
      styles:         file.load({ id: 549 }).getContents(),
      logo:           xml.escape({ xmlText: file.load({ id: 554 }).url }),
      signature:      xml.escape({ xmlText: file.load({ id: 556 }).url }),
      fonts: {
        normal:       xml.escape({ xmlText: file.load({ id: 177 }).url }),
        italic:       xml.escape({ xmlText: file.load({ id: 174 }).url }),
        bold:         xml.escape({ xmlText: file.load({ id: 172 }).url }),
        bolditalic:   xml.escape({ xmlText: file.load({ id: 173 }).url }),
        light:        xml.escape({ xmlText: file.load({ id: 175 }).url }),
        lightitalic:  xml.escape({ xmlText: file.load({ id: 176 }).url })
      },
      company: {
        name:         companyInfo.getText({
          fieldId: 'companyname'
        }),
        url:          companyInfo.getText({
          fieldId: 'url'
        }),
        fax:          companyInfo.getText({
          fieldId: 'fax'
        }),
        address:      companyInfo.getText({
          fieldId: 'mainaddress_text'
        }).replace(/\nCanada/ig, '').replace(/\n/ig, '<br/>'),
        phone:        '(905) 829-3336'
      }
    }
  }

  /*
    Responsible for creating the due diligence document
    returns: A completed PDF document
  */
  var GenerateDueDiligence = function(obj) {

    if (!companyInfo) companyInfo = config.load({
      type: config.Type.COMPANY_INFORMATION
    })

    var renderer = render.create(),
        formTitle = [companyInfo.getText({
          fieldId: 'companyname'
        }), 'Due Diligence Document']

    // collect the data records for the proposal, asset, and the customer
    var thisProposal = record.load({
      type: record.Type.ESTIMATE, id: obj.proposal
    })
    var thisAsset = record.load({
      type: record.Type.JOB, id: thisProposal.getValue({ fieldId: 'entity' })
    })
    var thisCustomer = record.load({
      type: record.Type.CUSTOMER, id: thisAsset.getValue({ fieldId: 'parent' })
    })

    renderer.templateContent = file.load({ id: 555 }).getContents()
    renderer.addCustomDataSource({
      alias:  'data',
      format: render.DataSource.JSON,
      data:   JSON.stringify(util.extend(_getData(), {
        reportname:     xml.escape({ xmlText: formTitle.join(' - ') }),
        reportdate:     moment(thisProposal.getValue({
          fieldId: 'trandate'
        })).format('MMMM D, YYYY'),
        customer: {
          address:  xml.escape({
            xmlText: search.lookupFields({
              type: thisCustomer.type, id: thisCustomer.id, columns: ['billaddress']
            }).billaddress
          }).replace(/\n/ig, '<br/>'),
          name: (function(){
            // first search for primary contacts on the project asset (job)
            var projectAssetPrimary = search.lookupFields({
              type: record.Type.JOB, id: thisAsset.id, columns: [
                'contactprimary.entityid'
              ]
            })
            if (projectAssetPrimary['contactprimary.entityid'].length)
              return projectAssetPrimary['contactprimary.entityid']
            if (thisCustomer.getValue({
              fieldId: 'isperson'
            }) == 'T') return [thisCustomer.getValue({
              fieldId: 'firstname'
            }), thisCustomer.getValue({
              fieldId: 'lastname'
            })].join(' ')
            var customerPrimary = search.lookupFields({
              type: record.Type.CUSTOMER, id: thisCustomer.id, columns: [
                'contactprimary.entityid'
              ]
            })
            if (customerPrimary['contactprimary.entityid'].length)
              return customerPrimary['contactprimary.entityid']
            return 'To whom it may concern'
          })()
        },
        proposal: {
          amount:   thisProposal.getValue({ fieldId: 'total' }),
          compensation: thisProposal.getValue({ fieldId: 'custbody_dundee_legalcomp' }),
          salesrep: thisProposal.getText({ fieldId: 'salesrep' }),
          docs: obj.docs,
          duediligence: xml.escape({ xmlText: thisProposal.getValue({ fieldId: 'custbody4' }) })
        }
      }))
    })
    var pdfFile = renderer.renderAsPdf()
    pdfFile.name = formTitle.concat(moment(thisProposal.getValue({
      fieldId: 'trandate'
    })).format('MMMM D YYYY')).join(' - ')+".pdf"
    return pdfFile

  }


  /*
    Responsible for creating the proposal document
    returns: A completed PDF document
  */
  var GenerateProposal = function(obj) {

    if (!companyInfo) companyInfo = config.load({
      type: config.Type.COMPANY_INFORMATION
    })

    var renderer = render.create(),
        formTitle = [companyInfo.getText({
          fieldId: 'companyname'
        }), 'Proposal']

    // collect the data records for the proposal, asset, and the customer
    var thisProposal = record.load({
      type: record.Type.ESTIMATE, id: obj.proposal
    })
    var thisAsset = record.load({
      type: record.Type.JOB, id: thisProposal.getValue({ fieldId: 'entity' })
    })
    var thisCustomer = record.load({
      type: record.Type.CUSTOMER, id: thisAsset.getValue({ fieldId: 'parent' })
    })
    var thisSalesRep = record.load({
      type: record.Type.EMPLOYEE, id: thisProposal.getValue({ fieldId: 'salesrep' })
    })

    renderer.templateContent = file.load({ id: 550 }).getContents()
    renderer.addCustomDataSource({
      alias:  'data',
      format: render.DataSource.JSON,
      data:   JSON.stringify(util.extend(_getData(), {
        reportname:     xml.escape({ xmlText: formTitle.join(' - ') }),
        reportdate:     moment(thisProposal.getValue({
          fieldId: 'trandate'
        })).format('MMMM D, YYYY'),
        customer: {
          address:  xml.escape({
            xmlText: search.lookupFields({
              type: thisCustomer.type, id: thisCustomer.id, columns: ['billaddress']
            }).billaddress
          }).replace(/\n/ig, '<br/>'),
          name: xml.escape({
            xmlText: (function(){
              // first search for primary contacts on the project asset (job)
              var projectAssetPrimary = search.lookupFields({
                type: record.Type.JOB, id: thisAsset.id, columns: [
                  'contactprimary.entityid'
                ]
              })
              if (projectAssetPrimary['contactprimary.entityid'].length)
                return projectAssetPrimary['contactprimary.entityid']
              if (thisCustomer.getValue({
                fieldId: 'isperson'
              }) == 'T') return [thisCustomer.getValue({
                fieldId: 'firstname'
              }), thisCustomer.getValue({
                fieldId: 'lastname'
              })].join(' ')
              var customerPrimary = search.lookupFields({
                type: record.Type.CUSTOMER, id: thisCustomer.id, columns: [
                  'contactprimary.entityid'
                ]
              })
              if (customerPrimary['contactprimary.entityid'].length)
                return customerPrimary['contactprimary.entityid']
              return 'To whom it may concern'
            })()
          })
        },
        proposal: {
          amount:   thisProposal.getValue({ fieldId: 'total' }),
          compensation: thisProposal.getValue({ fieldId: 'custbody_dundee_legalcomp' }),
          landowner: xml.escape({ xmlText: thisAsset.getValue({ fieldId: 'custentity21' }) }),
          lessee: xml.escape({ xmlText: thisAsset.getValue({ fieldId: 'custentity22' }) }),
          expires: (function() {
            if (!thisProposal.getValue({ fieldId: 'duedate' })) return ''
            return moment(thisProposal.getValue({ fieldId: 'duedate' })).format('MMMM D, YYYY')
          })(),
          address: (function(){
            var addressidlist = []
            for (var i=0; i<thisProposal.getLineCount({
              sublistId: 'item'
            }); i++) {
              if (thisProposal.getSublistValue({
                sublistId: 'item', line: i, fieldId: 'custcol_dd_address'
              })) addressidlist.push(thisProposal.getSublistValue({
                sublistId: 'item', line: i, fieldId: 'custcol_dd_address'
              }))
            }
            if (!addressidlist) return [xml.escape({ xmlText: thisAsset.getValue({ fieldId: 'defaultaddress' }) })]
            var addr = []
            var searchAddresses = search.create({
              type: thisAsset.type, filters: [
                ['internalid', 'anyof', thisAsset.id]
              ], columns: [
                search.createColumn({ name: 'addressinternalid', join: 'address' }),
                search.createColumn({ name: 'address1', join: 'address' }),
                search.createColumn({ name: 'custrecord_dd_pin', join: 'address' })
              ]
            }).run().each(function(result) {
              if (result.getValue({ name: 'custrecord_dd_pin', join: 'address' }))
                var address = ['PIN:', result.getValue({ name: 'custrecord_dd_pin', join: 'address' })].join(' ')
              else var address = result.getValue({ name: 'address1', join: 'address' })
              if (addressidlist.indexOf(result.getValue({ name: 'addressinternalid', join: 'address' })) > -1)
                addr.push(xml.escape({ xmlText: address }))
              return true
            })
            return addr
          })(),
          pin: xml.escape({ xmlText: thisAsset.getValue({ fieldId: 'custentity20' }) }),
          notes: xml.escape({ xmlText: thisProposal.getValue({ fieldId: 'custbody3' }) }),
          marketsegment: thisAsset.getText({ fieldId: 'custentity8' }).map(function(segment) {
            return xml.escape({ xmlText: segment })
          }).join(',<br/>'),
          items: (function() {
            var items = []
            for (var i=0; i<thisProposal.getLineCount({
              sublistId: 'item'
            }); i++) {
              items.push({
                description:  xml.escape({ xmlText: thisProposal.getSublistValue({
                  sublistId: 'item', line: i, fieldId: 'description'
                }) }),
                quantity:     thisProposal.getSublistValue({
                  sublistId: 'item', line: i, fieldId: 'quantity'
                }),
                amount:       thisProposal.getSublistValue({
                  sublistId: 'item', line: i, fieldId: 'amount'
                }),
                perportion:   thisProposal.getSublistValue({
                  sublistId: 'item', line: i, fieldId: 'custcol1'
                }),
                paymentfreq:  thisProposal.getSublistText({
                  sublistId: 'item', line: i, fieldId: 'custcol3'
                }),
                datefirstpay: (function() {
                  if (!thisProposal.getSublistValue({
                    sublistId: 'item', line: i, fieldId: 'custcol4'
                  })) return ''
                  return moment(thisProposal.getSublistValue({
                    sublistId: 'item', line: i, fieldId: 'custcol4'
                  })).format('MMMM D, YYYY')
                })(),
                totalannual:  thisProposal.getSublistText({
                  sublistId: 'item', line: i, fieldId: 'custcol2'
                })
              })
            }
            return items
          })(),
          salesrep: {
            name:   xml.escape({ xmlText: thisSalesRep.getText({ fieldId: 'entityid' }) }),
            email:  thisSalesRep.getText({ fieldId: 'email' }),
            phone:  xml.escape({ xmlText: thisSalesRep.getText({ fieldId: 'phone' }) })
          }
        }
      }))
    })
    renderer.addRecord({
      templateName: 'proposal', record: thisProposal
    })
    var pdfFile = renderer.renderAsPdf()
    pdfFile.name = formTitle.concat(moment(thisProposal.getValue({
      fieldId: 'trandate'
    })).format('MMMM D YYYY')).join(' - ')+'.pdf'
    return pdfFile

  }

  return {
    GenerateProposal: GenerateProposal,
    GenerateDueDiligence: GenerateDueDiligence
  }
})
