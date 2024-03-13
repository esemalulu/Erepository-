/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define([
    'N/format',
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    './CryptoJS.min'
], function (format, log, record, runtime, search, cryptoJs) {
    function logRequestAndResponse(transaction, request, response, usedApi) {
        usedApi = usedApi || false;
        var requestHash = getRequestHash(request);

        var logRecord = record.create({ type: 'customrecord_r7_avalara_log' })
            .setValue({ fieldId: 'custrecord_r7_ava_log_transaction', value: transaction.id || null })
            .setValue({ fieldId: 'custrecord_r7_ava_log_request', value: request || '' })
            .setValue({ fieldId: 'custrecord_r7_ava_log_response', value: JSON.stringify(response) })
            .setValue({ fieldId: 'custrecord_r7_ava_log_request_hash', value: requestHash || '' })
            .setValue({ fieldId: 'custrecord_r7_ava_log_used_api', value: usedApi });

        try {
            logRecord.save();
        } catch(ex) {
            log.error({ title: 'Error saving request', details: { message: ex.message, stack: ex.stack } });
        }
    }

    function shouldSkipTaxCalculation(transaction, request) {
        var oldHash = transaction.getValue({ fieldId: 'custbody_r7_avalara_request_hash' });
        var newHash = getRequestHash(request);

        if (oldHash !== newHash) {
            transaction.setValue({ fieldId: 'custbody_r7_avalara_request_hash', value: newHash });
        }

        return oldHash === newHash;
    }

    function getPreviousResponse(transaction, request) {
        const transactionDate = transaction.getValue({ fieldId: 'trandate' });
        const requestHash = getRequestHash(request);

        var dateValue = format.format({
            type: format.Type.DATE,
            value: transactionDate
        });

        // Find the most recent Avalara Request Log entry with this request hash
        var results = search.create({
            type: 'customrecord_r7_avalara_log',
            filters: [
                ['created', 'onorafter', dateValue],
                'and', ['custrecord_r7_ava_log_request_hash', 'is', requestHash]
            ],
            columns: [
                { name: 'created', sort: search.Sort.DESC }
            ]
        }).run().getRange({ start: 0, end: 1 });

        // If we found one, load the record and get the full response.  Search results only return first 4000 characters
        if (results && results.length === 1) {
            var avalaraLogId = results[0].id;
            var avalaraLog = record.load({
                type: 'customrecord_r7_avalara_log',
                id: avalaraLogId
            });

            var previousResponse = avalaraLog.getValue({ fieldId: 'custrecord_r7_ava_log_response' });
            previousResponse = JSON.parse(previousResponse);

            if (previousResponse.code) {
                return previousResponse
            }
        }
    }

    function shouldUseBillingAddress(transaction) {
        var RAPID7_INTERNATIONAL = '10';
        var subsidiary = transaction.getValue({ fieldId: 'subsidiary' });

        return subsidiary === RAPID7_INTERNATIONAL;
    }

    function replaceShipToWithBillTo(request, transaction, createdFromRecord) {
        var line1, line2, city, region, postalCode, country, latitude, longitude;
        var line3 = '';

        var requestBody = JSON.parse(request);

        if (!requestBody || !requestBody.createTransactionModel || !requestBody.createTransactionModel.Lines) {
            return request;
        }

        // Get the Bill To address from the current record.
        var billAddress = transaction.getSubrecord({
            fieldId: 'billingaddress'
        });

        if (billAddress) {
            line1 = billAddress.getValue({ fieldId: 'addr1' }) || '';
            line2 = billAddress.getValue({ fieldId: 'addr2' }) || '';
            city = billAddress.getValue({ fieldId: 'city' }) || '';
            region = billAddress.getValue({ fieldId: 'state' }) || '';
            postalCode = billAddress.getValue({ fieldId: 'zip' }) || '';
            country = billAddress.getValue({ fieldId: 'country' }) || '';
            latitude = transaction.getValue({ fieldId: 'custbody_ava_billto_latitude' });
            longitude = transaction.getValue({ fieldId: 'custbody_ava_billto_longitude' });
        } else {
            line1 = createdFromRecord.getValue({ fieldId: 'billaddr1' }) || '';
            line2 = createdFromRecord.getValue({ fieldId: 'billaddr2' }) || '';
            city = createdFromRecord.getValue({ fieldId: 'billcity' }) || '';
            region = createdFromRecord.getValue({ fieldId: 'billstate' }) || '';
            postalCode = createdFromRecord.getValue({ fieldId: 'billzip' }) || '';
            country = createdFromRecord.getValue({ fieldId: 'billcountry' }) || '';
            latitude = transaction.getValue({ fieldId: 'custbody_ava_billto_latitude' });
            longitude = transaction.getValue({ fieldId: 'custbody_ava_billto_longitude' });
        }

        var address = {
            line1: line1.substring(0, 50),
            line2: line2.substring(0, 100),
            line3: '',
            city: city.substring(0, 50),
            region: region,
            postalCode: postalCode.substring(0, 11),
            country: getMappedCountry(country),
            latitude: latitude,
            longitude: longitude
        }

        requestBody.createTransactionModel.Lines.forEach(function(line) {
            if (!line.addresses || !line.addresses.ShipTo) {
                return;
            }

            line.addresses.ShipTo = address
        });

        return JSON.stringify(requestBody);
    }

    function getMappedCountry(country) {
        var countryMap = {
            'AS': 'US',
            'FM': 'US',
            'GU': 'US',
            'MH': 'US',
            'MP': 'US',
            'PW': 'US',
            'PR': 'US',
            'UM': 'US',
            'VI': 'US',
            'American Samoa': 'US',
            'Virgin Islands (USA)': 'US',
            'US Minor Outlying Islands': 'US',
            'Micronesia, Federal State of': 'US',
            'Northern Mariana Islands': 'US',
            'United Kingdom (GB)': 'GB',
            'Germany': 'DE',
            'Australia': 'AU',
            'Denmark': 'DK',
            'Japan': 'JP',
            'Canada': 'CA',
            'Singapore': 'SG',
            'Bonaire, Saint Eustatius and Saba': 'BQ',
            'Ceuta and Melilla': 'EA',
            'Congo, Democratic Republic of': 'CD',
            'Congo, Republic of': 'CG',
            'Croatia/Hrvatska': 'HR',
            'Heard and McDonald Islands': 'HM',
            'Holy See (City Vatican State)': 'VA',
            'Korea, Democratic People\'s Republic': 'KP',
            'Myanmar (Burma)': 'MM',
            'Pitcairn Island': 'PN',
            'St. Pierre and Miquelon': 'PM',
            'Svalbard and Jan Mayen Islands': 'SJ'
        };

        return countryMap[country] || country;
    }

    function getRequestHash(request) {
        var r7request;

        // Make sure we're working with a copy of the request object, not the request itself
        if (typeof request === 'object') {
            r7request = JSON.parse(JSON.stringify(request));
        } else {
            r7request = JSON.parse(request);
        }

        var model = r7request.createTransactionModel;

        if (!model) {
            return;
        }

        // Remove the timestamp from the request, otherwise request body is ALWAYS different
        delete model.code;

        // Remove these values since Avalara sends them optionally in client vs server-side calculations
        delete model.type;
        delete model.commit;
        delete model.referenceCode;

        // Remove line item descriptions from the request.  These differ between client/server so the hashes are
        // different if we don't remove these lines.
        if (Array.isArray(model.Lines)) {
            model.Lines.forEach(function (line) {
                delete line.description;
            });
        }

        return cryptoJs.MD5(JSON.stringify(r7request)).toString();
    }

    return {
        logRequestAndResponse: logRequestAndResponse,
        shouldSkipTaxCalculation: shouldSkipTaxCalculation,
        getPreviousResponse: getPreviousResponse,
        shouldUseBillingAddress: shouldUseBillingAddress,
        replaceShipToWithBillTo: replaceShipToWithBillTo
    };
});