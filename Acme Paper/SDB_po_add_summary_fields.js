/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 */
define(['N/record', 'N/runtime', 'N/task', 'N/search', 'N/redirect'],
    function (record, runtime, task, search, redirect) {
        function beforeLoad(context) {
            try {
                var rec = context.newRecord;

              //Added purchase order redirect for sales person 13/5
                if (rec.type == record.Type.PURCHASE_ORDER) {
                    var userRole = runtime.getCurrentUser().role;
                    var salesPersonRoleId = 1045;

                    if (userRole == salesPersonRoleId) redirect.redirect({
                        url: 'https://5774630.app.netsuite.com/app/center/card.nl?sc=-29'
                    });
                }
              
                if (context.type != 'view' && rec.type != 'purchaseorder') {
                    return;
                }

                var form = context.form;
                var html = `
                <script>
                    var table = document.getElementsByClassName("totallingtable")
                    var tbody = table[0].getElementsByTagName("tbody")[0];
                    
                    var url= new URL(document.URL);
                    var params = new URLSearchParams(url.search);
                    var recordId = params.get("id")
                    var record = nlapiLoadRecord("purchaseorder", recordId);
                    var lineCount = record.getLineItemCount("item")
                    var totalPieces = 0;
                    var totalWeight = 0;
                    var totalCube = 0;
                    var totalQtyReceived = 0;
                    var totalRateReceived = 0;
                    for (let i = 1; i <= lineCount; i++) {
                        record.selectLineItem("item", i);
                        var itemQty = Number(record.getCurrentLineItemValue("item", "quantity"))
                        var itemWeight = Number(record.getCurrentLineItemValue("item", "custcol_item_weight"))
                        var itemCube = Number(record.getCurrentLineItemValue("item", "custcol_item_cube_ft"))
                        
                        var receivedQuantity = Number(record.getCurrentLineItemValue("item", "quantityreceived"))
                        var rate = Number(record.getCurrentLineItemValue("item", "rate"))
                        
                        totalQtyReceived += Number(receivedQuantity);
                        totalRateReceived += (Number(rate) * Number(receivedQuantity))
                        totalPieces += itemQty;
                        totalWeight += (itemWeight * itemQty);
                        totalCube += itemCube * itemQty;
                    }
                    tbody.innerHTML = GetHTMLLine("Total Pieces", totalPieces) + GetHTMLLine("Total Weight", totalWeight.toFixed(2)) + GetHTMLLine("Total Cube", totalCube.toFixed(2)) + tbody.getInnerHTML()
                    jQuery('.bgmd.totallingbg').append('<table class="totallingtable" cellspacing="0" cellpadding="0px" border="0px"> <caption style="display: none">Received Summary</caption> <tbody> <tr> <td> <div class="uir-field-wrapper"> <span class="smalltextnolink uir-label"> <span class="smalltextnolink"> <a class="smalltextnolink" tabindex="-1">Total Pieces</a> </span> </span> <span class="uir-field inputreadonly"> ' + totalQtyReceived + '</span> </div> </td> </tr> <tr></tr> <tr> <td> <div class="uir-field-wrapper"> <span class="smalltextnolink uir-label"> <span class="smalltextnolink"> <a class="smalltextnolink" tabindex="-1">Total</a> </span> </span> <span class="uir-field inputreadonly"> ' + totalRateReceived.toFixed(2) + '</span> </div> </td> <td></td> </tr> </tbody> </table>');
                    function GetHTMLLine(name, value) {
                       
                        return  '<tr>\\n            <td>\\n                <div class="uir-field-wrapper">\\n                    <span class="smalltextnolink uir-label">\\n                        <span\\n                            class="smalltextnolink">\\n\\n                            <a class="smalltextnolink" tabindex="-1">'+ name + '</a>\\n                        </span>\\n                    </span>\\n                    <span class="uir-field inputreadonly"> '+ value +'</span>\\n                </div>\\n            </td>\\n        </tr>';
                    }
                </script>
                `;
                form.addField({
                    id: "custpage_summary_fields",
                    label: "Summary Fields",
                    type: 'inlinehtml'
                }).defaultValue = html;
            }
            catch (error) {
                log.error('Error in beforeLoad', error.toString());
            }
        }

        function beforeSubmit(context) {
            try {
                var newRecord = context.newRecord;
                var vendorNotes = newRecord.getValue('custbody_acc_noted_to_vendor');
                if (!vendorNotes) return;
                var newNotes = vendorNotes.replaceAll('--', '');
                log.debug('DATA: ', { id: newRecord.id, vendorNotes, newNotes });
                newRecord.setValue('custbody_acc_noted_to_vendor', newNotes);
            } catch (error) {
                log.error('ERROR', error);
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit
        };
    });