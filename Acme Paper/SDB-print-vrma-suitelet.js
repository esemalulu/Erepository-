/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/*
* TYPE    Suitelet
*/
define([
    "N/record",
    "N/log",
    "N/search",
    "N/render",
	"N/email"
], function ( record, log, search, render,email) {
    function onRequest(context) {
        switch (context.request.method) {
            case 'GET':
                try {
                    const VRA_TEMPLATE_ID = 'CUSTTMPL_151_5774630_SB1_335';
                    var vra_id = context.request.parameters.custom_param_vra_id;
                    if (!vra_id) {
                        return false;
                    }
					var vendor_email = context.request.parameters.custom_param_vendor_email
					var option = context.request.parameters.custom_param_option;

					if(option=='print'){
					  var pdfTemplate = getRecordDataAndGenerateTemplate(VRA_TEMPLATE_ID,vra_id,option,context)
					  context.response.writeFile(pdfTemplate, true);
					}
					if(option=='email')  generateAndSendEmail(VRA_TEMPLATE_ID,vendor_email,vra_id,option,context)
                } catch (e) {
                    log.error('error', `${e} | ${e.message}`);
                }
                break;
        }
    }

	function generateAndSendEmail(VRA_TEMPLATE_ID,vendor_email , vra_id, option, context){
		try {
			var record_id = parseInt(vra_id);
			const vra_fieldlookup = search.lookupFields({
				type: search.Type.VENDOR_RETURN_AUTHORIZATION,
				id: record_id,
				columns: ["tranid"],
			});
			var tranId = vra_fieldlookup.tranid
			if (vendor_email)
			{
			 var renderer = getRecordDataAndGenerateTemplate(VRA_TEMPLATE_ID,vra_id)
			 renderer.name = `${tranId}.pdf`;
			 email.send({
				 //Internal ID of 'No Reply' Employee. This employee exists ONLY in PROD
				 author: 96988,
				 recipients: vendor_email,
				 subject: "Vendor Return Authorization  - " + tranId,
				 body: "Attached file",
				 attachments: [renderer],
				 relatedRecords: {
					 transactionId: record_id,
				 },
			 });
			 if(option=='email')context.response.write('200');
		}
		} catch (error) {
			log.debug('generateAndSendEmail ERROR: ', error)
			if(option=='email')context.response.write('404');
			if(option=='print')context.response.write('ERROR: THE RECORD IS LOCKED');
		}
	}

	function getRecordDataAndGenerateTemplate(VRA_TEMPLATE_ID, vra_id, option,context ){
		try {
			var rec = record.load({
				type: "vendorreturnauthorization",
				id: vra_id
			});
			//-----------------------ITEMS DATA--------------------------------
			var itemsData = [];

			var lineCount = rec.getLineCount('item');
			for (var i = 0; i < lineCount; i++) {
				var index =i+1;
				var itemData = {};
				

				itemData.item = checkAmpersand(rec.getSublistText({
					sublistId: 'item',
					fieldId: 'item',
					line: i
				}));
				itemData.quantity = rec.getSublistValue({
					sublistId: 'item',
					fieldId: 'quantity',
					line: i
				});
				itemData.units = rec.getSublistValue({
					sublistId: 'item',
					fieldId: 'units',
					line: i
				});
				itemData.description = checkAmpersand(rec.getSublistValue({
					sublistId: 'item',
					fieldId: 'description',
					line: i
				}));
				itemData.vendorname = checkAmpersand(rec.getSublistText({
					sublistId: 'item',
					fieldId: 'vendorname',
					line: i
				}));
				var currentRate = rec.getSublistValue({
					sublistId: 'item',
					fieldId: 'rate',
					line: i
				});
				currentRate > 0 ? itemData.rate = currentRate.toFixed(2) : itemData.rate = '0.00';
				var currentAmount = rec.getSublistValue({
					sublistId: 'item',
					fieldId: 'amount',
					line: i
				});
				currentAmount > 0 ? itemData.amount = currentAmount.toFixed(2) : itemData.amount = '0.00';
				itemData.line= index,
				itemData.buyer = rec.getSublistText({
					sublistId: 'item',
					fieldId: 'custcol_acc_buyer',
					line: i
				});
				itemsData.push(itemData);
			}
			//----------------------------- OBJECT DATA -----------------------------
			var objData = {
				tranid: rec.getValue('tranid') != '' ? rec.getValue('tranid'): '-',
				vendor:rec.getText('entity') != '' ? rec.getText('entity'): '-',
				trandate: rec.getText('trandate') != '' ? rec.getText('trandate') : '-',
				location: rec.getText('location') != '' ? rec.getText('location') : '-',
				amount: rec.getText('usertotal') != '' ? rec.getText('usertotal') : '-', 
				notesToVendor:  rec.getText('custbody_acc_noted_to_vendor') != '' ? rec.getText('custbody_acc_noted_to_vendor') : '-', 
				buyer: rec.getText('custbody_acc_buyer') != '' ? rec.getText('custbody_acc_buyer') : '-', 
				shipto: rec.getText('custbody6') != '' ? rec.getText('custbody6') : '-', 
				items: itemsData,
			}

			//----------------------------------PRINT PDF ---------------------------------------
			var renderer = render.create();

			renderer.setTemplateByScriptId(VRA_TEMPLATE_ID);
			
			renderer.addCustomDataSource({
				format: render.DataSource.OBJECT,
				alias: "data",
				data: objData,
			});
			var pdfName = renderer.renderAsPdf();
			return pdfName;
		} catch (error) {
			log.debug('getRecordDataAndGenerateTemplate  ERROR: ',error)
			if(option=='email')context.response.write('404');
			if(option=='print')context.response.write('ERROR: THE RECORD IS LOCKED');
			
		}
	}

	function checkAmpersand(string) {
		if (string.includes('&')) {
			return string.replace(/&/g, ' and ');
		} else {
			return string;
		}
	}

    return {
        onRequest
    }
});