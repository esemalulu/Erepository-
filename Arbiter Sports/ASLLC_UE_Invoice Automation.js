/**
 * @NApiVersion 2.X
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 

 define(['N/record',
        'N/search',
        'N/format',
        'N/runtime',
        'N/log',
        'N/render',
        'N/file',
		'N/email'
        ],

function(record, search, format, runtime, log, render, file, email) {


    function afterSubmit(context) 
    {

      var thisRec = context.newRecord;
      var recType = thisRec.type;
      var recId = thisRec.id;

      if(recId)

       //log.error('Record Id', recId);

       var objRecord = record.load({'type': recType,'id': recId,'isDynamic': true});

        var status = objRecord.getValue({'fieldId':'orderstatus'});
        var trxDate = objRecord.getValue({'fieldId':'trandate'});
        var form = objRecord.getValue({'fieldId':'customform'});
        var autoProcess = objRecord.getValue({'fieldId':'custbody_asllc_automatic_process'});


       log.error('CONTEXT', context.type);
       log.error('STATUS', status);
       log.error('Auto Process', autoProcess);

		//if(context.type == context.UserEventType.CREATE && status == 'B'  )
		if(context.type == context.UserEventType.CREATE && status == 'B' && autoProcess == true )
		{

            var itemFulfil = record.transform({
            fromType: 'salesorder',
            fromId: recId,
            toType: 'itemfulfillment',
            isDynamic: true
            })
            var itemFulfilId = itemFulfil.save();


            var invoice = record.transform({
            fromType: 'salesorder',
            fromId: recId,
            toType: 'invoice',
            isDynamic: true
            })
            var invoiceId = invoice.save();


            var invoiceObj = record.load({
                type: record.Type.INVOICE,
                id: invoiceId,
                isDynamic: true,
            });

          var entity = invoiceObj.getValue({'fieldId':'entity'});

            var emailTempId = 3; // internal id of the email template created

            var emailTemp = record.load({
                type: record.Type.EMAIL_TEMPLATE,
                id: emailTempId,
                isDynamic: true,
            });

            var emailSubj = emailTemp.getValue({'fieldId':'subject'});
            var emailBody = emailTemp.getValue({'fieldId':'content'});


 			var xmlTemplateFile = file.load('Templates/PDF Templates/invoicePDFTemplate.xml');
			var renderer = render.create();
            renderer.templateContent = xmlTemplateFile.getContents();
            renderer.addRecord('record', record.load({
                type: record.Type.INVOICE,
                id: invoiceId
            }));

            var invoicePdf = renderer.renderAsPdf();


          email.send({
            author: -5,
            recipients: 'elijah@semalulu.com',
            subject: 'TESTING',
            body: emailBody,
            attachments: [invoicePdf],
            relatedRecords: {transactionId: invoiceId, entityId: entity }
          });



		}


	}


    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };




});