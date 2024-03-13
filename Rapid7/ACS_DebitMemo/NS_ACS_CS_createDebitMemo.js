/**
 *@NApiVersion 2.x
 */
define(['N/record', 'N/currentRecord', 'N/search', 'N/url'], function (record, currentRecord, search, url) {

    function createNewDebitMemo(context) {
        var payment_data = {}
        var cur_record = currentRecord.get();



        payment_data.id = cur_record.id;
        payment_data.subsidiary = cur_record.getValue({
            fieldId: 'subsidiary'
        })
        payment_data.customer = context.customer
        payment_data.department = context.department
        payment_data.location = context.location
        payment_data.debit_account = context.debitaccount
        payment_data.credit_account = context.creditaccount
        payment_data.exchangerate = context.exchangerate
        payment_data.currency = context.currency
        payment_data.postingperiod = context.postingperiod
        payment_data.total = context.total
        var createrecord = true; 


        console.log(payment_data)


        try {
            if (createrecord){
                var accountids = [payment_data.credit_account, payment_data.debit_account]
                var linetype = ['credit', 'debit']

                var DM_record = record.create({
                    type: context.recordtype,
                    isDynamic: true,
                })
    
                DM_record.setValue({
                    fieldId: 'subsidiary',
                    value: payment_data.subsidiary
                })
    
                DM_record.setValue({
                    fieldId: 'custbodydebit_memo_payment',
                    value: payment_data.id
                })

                DM_record.setValue({
                    fieldId: 'currency',
                    value: payment_data.currency
                })

                DM_record.setValue({
                    fieldId: 'exchangerate',
                    value: payment_data.exchangerate
                })
    
                console.log(DM_record.getValue({
                    fieldId: 'custbodydebit_memo_payment'
                }))
    
                for (var i = 0; i < accountids.length; i++) {
                    DM_record.selectNewLine({
                        sublistId: 'line'
                    })
    
                    DM_record.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: accountids[i]
                    })
    
                    DM_record.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: linetype[i],
                        value: payment_data.total
                    })
    
                    DM_record.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'entity',
                        value: payment_data.customer
                    })
    
                    DM_record.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: payment_data.department
                    })
    
                    DM_record.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'location',
                        value: payment_data.location
                    })
    
                    DM_record.commitLine({
                        sublistId: 'line'
                    })
                }

                var bookLineCount = DM_record.getLineCount({ sublistId: 'accountingbookdetail' });
                if (bookLineCount) {
                    DM_record.selectLine({
                        sublistId: 'accountingbookdetail',
                        line: 0
                    })

                    DM_record.setCurrentSublistValue({
                        sublistId: 'accountingbookdetail',
                        fieldId: 'exchangerate',
                        value: payment_data.exchangerate
                    })
                }

                //------------------------
                if(payment_data.postingperiod == true && payment_data.currency != 1)
                {
                    var accountIDs = [582, accountids[1]]
                    var glamount = 0;
                    var glsearch = search.load({
                        id: 'customsearchr7scriptdebitmemosearch'
                    })

                    glsearch.filters.push(
                        search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.IS,
                            values: payment_data.id
                        })
                    )

                    glsearch.run().each(function(result) {
                        var account = result.getValue({
                            name: 'account'
                        });
                        var amount = result.getValue({
                            name: 'amount'
                        });

                        if (account == accountIDs[0]) {
                            glamount = amount
                            return false;
                        }
            
                        return true;
                    });

                   
                    for(var j = 0; j<2; j++){
                        DM_record.selectNewLine({
                            sublistId: 'line'
                        })
        
                        DM_record.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: accountIDs[j]
                        })
        
                        DM_record.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: linetype[j],
                            value: parseFloat(glamount/payment_data.exchangerate).toFixed(2)
                        })
                        if(accountIDs[j] != accountIDs[0])
                        {
                            DM_record.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: payment_data.customer
                            })
                        }
        
                        DM_record.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: payment_data.department
                        })
        
                        DM_record.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'location',
                            value: payment_data.location
                        })
        
                        DM_record.commitLine({
                            sublistId: 'line'
                        })
                    }
                   
                }

    
                var id = DM_record.save()

                var domainURL = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });
    
                window.location.replace("https://" + domainURL + "/app/accounting/transactions/custom.nl?id=" + id + "&customtype=105&whence=");
            }
            else{
                alert("Payment must be applied to a record first.")
            }

        } catch (e) {
            console.log(e)
        }

    }


    return {
        createDebitMemo: createNewDebitMemo
    }
});