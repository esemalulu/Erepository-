// noinspection JSCheckFunctionSignatures

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {
    function updateOppTotal(oppId) {
        if (!oppId) {
            return;
        }

        const hasAdvanced = updateIncludeProdData(oppId);

        const filters = [
            ['isinactive', 'is', 'T'],
            'and', ['custrecordr7competproddataopportunity', 'anyof', oppId],
        ];

        if (hasAdvanced) {
            filters.push('and', ['custrecordr7proddata_include', 'is', 'T'])
        }

        search.create({
            type: 'customrecordr7competitiveproductdata',
            filters,
            columns: [
                { name: 'custrecordr7competproddataprojtotal', summary: 'sum' },
                { name: 'formulanumeric', summary: 'max', formula: '{custrecordr7competproddataopportunity.department.id}' },
                { name: 'custbodyr7opprenewalautomationcreated', join: 'custrecordr7competproddataopportunity', summary: 'max' }
            ]
        }).run()
            .getRange({ start: 0, end: 1 })
            .forEach(result => {
                const columns = result.columns;
                const newTotal = Number(result.getValue(columns[0]) || 0);
                const oppDept = Number(result.getValue(columns[1]));
                const raCreatedOpp = result.getValue(columns[2]) === 'T';

                log.debug({ title: 'oppDept', details: oppDept });

                if (oppDept === 10 || raCreatedOpp) {
                    return;
                }

                record.submitFields({
                    type: record.Type.OPPORTUNITY,
                    id: oppId,
                    values: {
                        'projectedtotal': newTotal
                    }
                });
            });
    }

    function getProdDataTranAmounts(oppId){

        var objProdData = {};
        objProdData.products = [];

        if (!oppId) {
            return objProdData;
        }

        const savedSearch = search.load({
            type: 'transaction',
            id: 17687
        });

        savedSearch.filterExpression = [
            ...savedSearch.filterExpression,
            'and', ['opportunity', 'anyof', oppId]
        ];

        const arrResults = savedSearch.run().getRange({ start: 0, end: 1000 });

        let highRank = null;
        // 0 == salesorder
        // 1 == estimate
        for (let i = 0; arrResults != null && i < arrResults.length; i++) {
            const columns = arrResults[i].columns;
            const categoryid = arrResults[i].getValue(columns[1]);
            const total = arrResults[i].getValue(columns[2]) || 0;
            const transaction_rank = parseInt(arrResults[i].getValue(columns[3]));
            const quantity = arrResults[i].getValue(columns[4]);
            const contractlength = arrResults[i].getValue(columns[5]);

            if (highRank != null && transaction_rank !== highRank){
                break;
            }

            highRank = transaction_rank;

            objProdData.products[objProdData.products.length] = {
                categoryid: categoryid,
                total: total,
                quantity: quantity,
                contractlength: contractlength,
                transaction_rank: transaction_rank,
                conclusion: (highRank === 0) ? 1 : '',
            };
        }

        objProdData.high_rank = highRank;

        return objProdData;
    }

    function updateIncludeProdData(oppId){
        if (!oppId) {
            return false;
        }

        const objData = getProdDataTranAmounts(oppId);
        const arrData = objData.products;

        const locked = (objData.high_rank === 0);
        let hasAdvanced = false;

        const results = search.create({
            type: 'customrecordr7competitiveproductdata',
            filters: [
                ['isinactive', 'is', 'T'],
                'and', ['custrecordr7competproddataopportunity', 'anyof', oppId]
            ],
            columns: [
                'internalid',
                'custrecordr7competproddataproduct',
                'custrecordr7competproddataprojtotal',
                'custrecordr7proddatawinner',
                'custrecordr7proddataloser',
                'custrecordr7competproddataconclusion'
            ]
        }).run().getRange({ start: 0, end: 0 });


        results.forEach(result => {
            const columns = result.columns;
            const recid = result.getValue(columns[0]);
            const categoryid = result.getValue(columns[1]);

            let total = 0;
            let found = false;
            let conclusion;

            for (var j = 0; arrData != null && j < arrData.length; j++) {

                if (arrData[j].categoryid === categoryid) {
                    found = true;
                    total = arrData[j].total;
                    conclusion = arrData[j].conclusion;

                    arrData.splice(j, 1);
                    hasAdvanced = true;

                    break;
                }
            }

            let values = {};

            if (found) {
                values['custrecordr7competproddataprojtotal'] = total;
                values['custrecordr7competproddatacontractlength'] = contractlength;
                values['custrecordr7proddataqty'] = quantity;
            } else if (objData.high_rank === 0) {
                conclusion = 2; //lost
            }

            if (conclusion === 2) {
                values['custrecordr7proddataloser'] =  90;
            }

            if (conclusion === 1) {
                values['custrecordr7proddatawinner'] = 90;
            }

            values['custrecordr7competproddataconclusion'] = conclusion;
            values['custrecordr7proddata_include'] = found;
            values['custrecordr7proddata_locked'] = locked;

            record.submitFields({
                type: 'customrecordr7competitiveproductdata',
                id: recid,
                values
            });
        });

        for (var j = 0; arrData != null && j < arrData.length; j++) {
            record.create({
                type: 'customrecordr7competitiveproductdata'
            }).setValue({ fieldId: 'custrecordr7competproddataproduct', value: arrData[j].categoryid })
                .setValue({ fieldId: 'custrecordr7competproddataopportunity', value: oppId })
                .setValue({ fieldId: 'custrecordr7proddata_include', value: true })
                .setValue({ fieldId: 'custrecordr7competproddataprojtotal', value: arrData[j].total })
                .setValue({ fieldId: 'custrecordr7competproddatacontractlength', value: arrData[j].contractlength })
                .setValue({ fieldId: 'custrecordr7proddataqty', value: arrData[j].quantity })
                .setValue({ fieldId: 'custrecordr7competproddataconclusion', value: arrData[j].conclusion })
                .setValue({ fieldId: 'custrecordr7proddatawinner', value: (arrData[j].conclusion === 1) ? 90 : '' })
                .setValue({ fieldId: 'custrecordr7proddataloser', value: (arrData[j].conclusion === 2) ? 90 : '' })
                .setValue({ fieldId: 'custrecordr7proddata_locked', value: locked })
                .save();

            hasAdvanced = true;
        }

        return hasAdvanced;
    }

    return {
        updateOppTotal
    };
});
