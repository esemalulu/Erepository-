/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

define(["N/ui/serverWidget", "N/search", "N/render", "N/email", "N/runtime","N/record","N/workflow"], function (serverWidget, search, render, email, runtime, record, workflow) {
    function onRequest(context) {
        var params = context.request.parameters;
        log.debug("params: ", params)
        if (params.sendEmails) {
            var form = serverWidget.createForm({ title: "Send emails ship points" });

            const userId = runtime.getCurrentUser()?.id || -5;
            const transactionId = params.transactionId;
            const emailsToSent = JSON.parse(params.sendEmails);
            const emailsToSentLabel = JSON.parse(params.sendEmailsLabel);

            const transactionName = search.lookupFields({
                type: 'purchaseorder',
                id: transactionId,
                columns: "tranid"
            })?.tranid;

            var transactionFile = render.transaction({
                entityId: parseInt(transactionId),
                printMode: render.PrintMode.PDF
            });
            transactionFile.folder = -11;
            var fileId = transactionFile.save();

            if (emailsToSent && emailsToSent.length > 0) {
                var subject = `Acme Paper ${transactionName}`;
                var message = `Attached is Acme Paper ${transactionName}`;
                log.debug("emailsToSent: ", emailsToSent)
               var transactionRecord = record.load({type:"purchaseorder", id: transactionId})
                createMessage(transactionRecord, subject, message, fileId, emailsToSent);

                // email.send({
                //     author: userId,
                //     body: `Attached is Acme Paper ${transactionName}`,
                //     recipients: emailsToSent,
                //     subject: `Acme Paper ${transactionName}`,
                //     attachments: [transactionFile]
                // });

                var htmlField = form.addField({
                    id: 'custpage_html_field',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Custom HTML Field'
                }).defaultValue =
                    `
                     <style>
 
                         fieldset{
                             display: flex;
                             flex-direction: column;
                             align-content: center;
                             padding: 1rem;
                             width: 200px;
                             heigth: 200px;
                         }
 
                         legend {
                             background-color: #000;
                             color: #fff;
                             padding: 3px 6px;
                         }
                     </style>
 
                     <fieldset>
                         <legend>Emails sent</legend>
                         <div class="emails-container">
                         </div>
                     </fieldset>
 
                     <script>
                         var emailsContainer = document.querySelector(".emails-container");
 
                         var emailsToSent = ${JSON.stringify(emailsToSentLabel)};
                         console.log("emailsToSent", emailsToSent)
 
                         if(emailsToSent && emailsToSent.length > 0){
                             emailsToSent.forEach((email) => {
                                 emailsContainer.innerHTML += email + "<br>"
                             });
                         }
                     </script>
                     `
            }
            else {
                var htmlField = form.addField({
                    id: 'custpage_html_field',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Custom HTML Field'
                }).defaultValue =
                    `
                     <h1>Emails could not be sent</h1>
                     `
            }

            context.response.writePage(form);

        }
        else {
            var form = serverWidget.createForm({ title: "Send emails ship points" });

            const vendorId = params.vendorId;

            const shipPointRecords = getShipPointRecords();
            if (!shipPointRecords || shipPointRecords.length < 1) return;
            log.debug("🚀 ~ shipPointRecords:", shipPointRecords);

            const shipPointOrder = getShipPointsOrder(vendorId);
            if (!shipPointOrder || shipPointOrder.length < 1) return;
            log.debug("🚀 ~ shipPointOrder:", shipPointOrder)

            // Filter items to render with ship points inside vendor order
            var filteredShipPoints = shipPointRecords.filter(shipPoint => {
                return shipPointOrder.some(order => order.id === shipPoint.shipPointValue);
            });
            log.debug("🚀 ~ filteredShipPoints:", filteredShipPoints);

            var htmlField = form.addField({
                id: 'custpage_html_field',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Custom HTML Field'
            }).defaultValue = renderShipPoints(filteredShipPoints);

            context.response.writePage(form);
        }
    }

    // ---------------------- AUXILIAR FUNCTIONS ------------------------------------------

    function createMessage(transactionRecord, subject, message, fileId, recordsToSend) {
        try {
            // let messageRecord = record.create({
            //     type: "message",
            //     isDynamic: true
            // });

            // messageRecord.setValue({
            //     fieldId: 'transaction',
            //     value: transactionRecord.id
            // });
            // messageRecord.setValue({
            //     fieldId: "entity",
            //     value: transactionRecord.getValue('entity')
            // });
            // messageRecord.setValue({
            //     fieldId: 'subject',
            //     value: subject
            // });
            // messageRecord.setValue({
            //     fieldId: 'message',
            //     value: message
            // });
            // messageRecord.setValue({
            //     fieldId: 'recipient',
            //     value: Number(recordsToSend[0])
            // });

            // // Add attachment
            // messageRecord.insertLine({
            //     sublistId: "mediaitem",
            //     line: 0
            // });
            // messageRecord.setCurrentSublistValue({
            //     sublistId: "mediaitem",
            //     fieldId: "mediaitem",
            //     value: fileId,
            // });
            // messageRecord.commitLine({
            //     sublistId: "mediaitem",
            // });

            // var messageId = messageRecord.save({
            //     enableSourcing: false,
            //     ignoreMandatoryFields: true
            // });

            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: transactionRecord.id,
                values: {custbody_sdb_emails_array : recordsToSend.join(';')},   
            });
            workflow.initiate({
                recordType: record.Type.PURCHASE_ORDER,
                recordId: transactionRecord.id,
                workflowId: 'customworkflow_sdb_send_po_emails'
            });
            workflow.trigger({
                recordId: transactionRecord.id,
                recordType: record.Type.PURCHASE_ORDER,
                workflowId: 'customworkflow_sdb_send_po_emails',
                actionId: 'workflowaction_send_email',
            });
        } catch (e) {
            log.error("ERROR in createMessage: ", e);
        }

    }

    function getShipPointRecords() {
        let shipPointRecords = [];

        var customrecord_sdb_ship_point_contactsSearchObj = search.create({
            type: "customrecord_sdb_ship_point_contacts",
            filters:
                [
                ],
            columns:
                [
                    search.createColumn({ name: "custrecord_sdb_ship_point", label: "Ship Point" }),
                    search.createColumn({ name: "custrecord_sdb_contacts_ship_point", label: "Contacts" })
                ]
        });
        var searchResultCount = customrecord_sdb_ship_point_contactsSearchObj.runPaged().count;
        log.debug("customrecord_sdb_ship_point_contactsSearchObj result count", searchResultCount);
        customrecord_sdb_ship_point_contactsSearchObj.run().each(function (result) {
            var newResult = JSON.parse(JSON.stringify(result));

            log.debug("newResult", newResult);
            log.debug("newResult2", newResult.values.custrecord_sdb_ship_point);

            let obj = {};
            obj.shipPointValue = newResult.values.custrecord_sdb_ship_point[0].value || "";
            obj.shipPointText = newResult.values.custrecord_sdb_ship_point[0].text || "";
            obj.contacts = newResult.values.custrecord_sdb_contacts_ship_point || [];

            shipPointRecords.push(obj);

            return true;
        });

        return shipPointRecords;
    }

    function renderShipPoints(shipPoints) {
        try {
            if (!shipPoints || shipPoints.length < 1) {
                return `
                     <h1>There are no contacts associated with ship points inside order vendor.</h1>
                 `
            }

            // Render ship points
            let renderShipPoints = ``;
            let renderContacts = ``;

            shipPoints.forEach(shipPoint => {
                renderShipPoints += `<input type="radio" id="${shipPoint.shipPointValue}" name="ship-points" value="${shipPoint.shipPointValue}" />
                                 <label for="${shipPoint.shipPointValue}">${shipPoint.shipPointText}</label><br><br>`;

                log.debug("shipPoint", shipPoint);

                if (!shipPoint?.contacts) return;

                // Render all contacts
                shipPoint.contacts.forEach((contact) => {
                    const contactEmail = search.lookupFields({
                        type: 'contact',
                        id: contact.value,
                        columns: "email"
                    })?.email;

                    renderContacts +=
                        `<div class="contact-container" style="display:none">
                         <input type="checkbox" data-id="${contact.value}" data-email="${contactEmail}" data-shipPoint="${shipPoint.shipPointValue}" id="${contact.value}" name="contact"/>
                         <label for="scales">${contact.text} (${contactEmail})</label>
                     </div>`;
                });
            });


            let content = `
 
             <section style="display:flex; gap: 10em">
                 <div>
                     <h1>Ship Points</h1>
 
                     ${renderShipPoints}
                 </div>
 
                 <div class="contacts-container">
                     <h1>Contacts</h1>
                     <div class="contacts-render">
                         ${renderContacts}
                     </div>
                     <h3 class="message-no-results" style="display:none">Ship point does not have contacts associated</h3>
                 </div>
 
             </section>
             <a href="#" id="trigger-sent-email">Send email</a>
 
             <script>
                 const shipPoints = document.querySelectorAll("[name='ship-points']");
 
                 const buttonSentEmail = document.getElementById("trigger-sent-email");
 
                 buttonSentEmail.addEventListener("click", () => {
 
                     var contactsToSend = [];
                     var contactsToSendLabel = [];
 
                     // Get all contacts that are selected
                     var allContactsElements = document.querySelectorAll(".contact-container");
 
                     if(allContactsElements && allContactsElements.length){
                         allContactsElements.forEach(contactDiv => {
                             var contactInput = contactDiv.querySelector("input");
 
                             if(contactInput.checked){
                                contactsToSend.push(contactInput.dataset.id);
                                contactsToSendLabel.push(contactInput.dataset.email);
                             }
                         });
 
                         window.location.href = window.location.href + "&sendEmails=" + JSON.stringify(contactsToSend)+ "&sendEmailsLabel=" + JSON.stringify(contactsToSendLabel);
                     }
                 });
 
                 shipPoints.forEach(function (element) {
                     element.addEventListener("click", function (e){
 
                         var hasContacts = false;
 
                         hideContactDisplays();
 
                         var messageError = document.querySelector(".message-no-results");
                         messageError.style.display = "block";
 
                         var shipPointValueSelected = e.currentTarget.value;
 
                         var allContactsElements = document.querySelectorAll(".contact-container");
 
                         if(!allContactsElements.length) return;
 
                         allContactsElements.forEach((contactDiv) => {
                             var shipPointContact = contactDiv.querySelector("input").dataset.shippoint;
                             
                             if(shipPointContact && shipPointContact == shipPointValueSelected){
                                 contactDiv.style.display = "block";
 
                                 hasContacts = true;
                             }
 
                             if(hasContacts){
                                 var messagError = document.querySelector(".message-no-results");
                                 messagError.style.display = "none";
                             }
                             
                         })
 
                     });
                 });
 
                 function hideContactDisplays(){
                     var messageError = document.querySelector(".message-no-results");
                     messageError.style.display = "none";
 
                     var allContactsElements = document.querySelectorAll(".contact-container");
 
                     if(allContactsElements && allContactsElements.length){
                         allContactsElements.forEach(contactDiv => {
                             contactDiv.style.display = "none";
                             contactDiv.querySelector("input").checked = false;
                         });
                     }
                 }
             </script>
             `;

            return content;

        }
        catch (error) {
            log.error("Error rendering", error);
        }

    }

    function getShipPointsOrder(vendorId) {
        let shipPoints = [];

        var vendorSearchObj = search.create({
            type: "vendor",
            filters:
                [
                    ["internalid", "anyof", vendorId]
                ],
            columns:
                [
                    search.createColumn({ name: "addressinternalid", label: "Address Internal ID" }),
                    search.createColumn({ name: "addresslabel", label: "Address Label" })
                ]
        });
        var searchResultCount = vendorSearchObj.runPaged().count;
        log.debug("vendorSearchObj result count", searchResultCount);
        vendorSearchObj.run().each(function (result) {
            let obj = {};
            obj.id = result.getValue({ name: 'addressinternalid' });
            obj.label = result.getValue({ name: 'addresslabel' });

            shipPoints.push(obj);

            return true;
        });

        return shipPoints;
    }

    return {
        onRequest: onRequest,
    };
});