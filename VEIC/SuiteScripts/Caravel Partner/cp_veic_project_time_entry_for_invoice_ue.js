/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/ui/serverWidget'],
    function(record, search,serverWidget) {
            function beforeLoad(scriptContext) {
                    try{

                            //if (scriptContext.type === scriptContext.UserEventType.PRINT){

                            const invoiceRecord = scriptContext.newRecord;
                            const invoiceId = invoiceRecord.id;
                            const projectId = invoiceRecord.getValue('custbody_cp_project');
                            //const projectId = invoiceRecord.getValue('job');
                            log.debug('Status','Project ID: '+projectId);

                            let recordSearch = search.create({
                                    type: "timebill",
                                    filters:
                                        [
                                                ["type","anyof","A"],
                                                "AND",
                                                ["customer","anyof", projectId ],
                                                "AND",
                                                ["approvalstatus","anyof","3"],
                                                "AND",
                                                ["billable","is","T"],
                                                "AND",
                                                ["posted","is","F"]
                                        ],
                                    columns:
                                        [
                                                search.createColumn({name: "internalid", label: "Internal ID"}),
                                                search.createColumn({
                                                        name: "date",
                                                        sort: search.Sort.ASC,
                                                        label: "Date"
                                                }),
                                                search.createColumn({name: "employee", label: "Employee"}),
                                                search.createColumn({name: "customer", label: "Client"}),
                                                search.createColumn({name: "item", label: "Item"}),
                                                search.createColumn({name: "hours", label: "Duration"}),
                                                search.createColumn({name: "custcol_cp_labour_billing_rate", label: "Labour Billing rate"}),
                                                search.createColumn({name: "type", label: "Type"}),
                                                search.createColumn({name: "approvalstatus", label: "Approval Status"}),
                                                search.createColumn({name: "casetaskevent", label: "Case/Task/Event"}),
                                                search.createColumn({name: "isbillable", label: "Billable"}),
                                                search.createColumn({
                                                        name: "cost",
                                                        join: "projectTaskAssignment",
                                                        label: "Cost"
                                                })
                                        ]
                            });

                            let searchResultCount = recordSearch.runPaged().count;
                            log.debug("Time entry For Project Billing result count",searchResultCount);

                            let timeEntryData = [];
                            let totalSum = 0;

                            recordSearch.run().each(function(result) {

                                    //const itemName = result.getValue(result.columns[0])
                                    const employee = result.getText('employee')
                                    log.debug("Status", "employee: " + employee);

                                    const labourBillingRate = parseFloat( result.getValue('custcol_cp_labour_billing_rate'));
                                    log.debug("Status", "labourBillingRate: " + labourBillingRate);

                                    const hours = parseFloat(result.getValue('hours'));
                                    log.debug("Status", "hours: " + hours);

                                    // const projectName = result.getText(result.columns[2]);
                                    // log.debug("Status", "projectName: " + projectName);

                                    if(recordValidation(labourBillingRate)){

                                        const amount = ( labourBillingRate * hours );
                                        log.debug("Status", "Amount: " + amount);

                                            totalSum += amount;

                                            const itemObject = {
                                                    'employee': employee,
                                                    'rate': labourBillingRate,
                                                    'amount': amount,
                                                    //'amount': amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                                                    'itemSum': ""
                                            };
                                        timeEntryData.push(itemObject)
                                    }else{
                                        log.debug('STATUS','Labour Billing Rate Not Available')
                                    }

                                    return true;
                            });

                            const timeEntrySumObject = {
                                    'employee': 'Sum',
                                    'rate': "",
                                    'amount': "",
                                    'itemSum': totalSum
                            };
                            timeEntryData.push(timeEntrySumObject)

                            let timeEntryField = scriptContext.form.addField({
                                    id: 'custpage_item',
                                    type: serverWidget.FieldType.LONGTEXT,
                                    label: 'Time Entry Data'
                            });
                            timeEntryField.defaultValue = JSON.stringify(timeEntryData);
                            timeEntryField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                            log.debug("Status","Time Entry Data "+ JSON.stringify(timeEntryData));

                    } catch (e) { log.debug('Error', e.message) }
            }

            const recordValidation = (value) => {
                    if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN && value != 'undefined'&& value!= "- None -") {
                            return true;
                    } else {
                            return false;
                    }
            }

            return {
                    beforeLoad: beforeLoad
            }
    });