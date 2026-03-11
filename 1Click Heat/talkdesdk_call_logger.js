/**
 * @NApiVersion 2.x
 * @NScriptType RESTlet
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    // Set your secret API key here
    var API_KEY = 'talkdesk_netsuite_2024_x7k9mQ2pL5nR8wT3'; // REPLACE THIS

    /**
     * Normalize phone number to digits only for comparison
     */
    function normalizePhone(phone) {
        if (!phone) return '';
        // Remove all non-digit characters
        var digitsOnly = phone.replace(/\D/g, '');
        // If it starts with 1 and is 11 digits (North American), keep all digits
        // Otherwise just return the digits
        return digitsOnly;
    }

    function post(context) {
        try {
            log.audit('RESTlet Called', 'Received request: ' + JSON.stringify(context));
            
            // Verify API key
            var providedKey = context.apiKey;
            if (providedKey !== API_KEY) {
                log.error('Authentication Failed', 'Invalid API key provided');
                return { 
                    status: 'error', 
                    message: 'Invalid API key' 
                };
            }

            log.audit('Authentication', 'API key verified successfully');

            var phone = context.phone;
            var direction = context.direction;
            var duration = context.duration;
            var recordingUrl = context.recordingUrl;

            // Normalize the incoming phone number
            var normalizedPhone = normalizePhone(phone);
            log.audit('Phone Normalization', 'Original: ' + phone + ' | Normalized: ' + normalizedPhone);

            // Search for Lead by normalized phone number
            // We'll search multiple phone fields and normalize them in the filter
            var leadSearch = search.create({
                type: search.Type.LEAD,
                filters: [
                    ['formulatext: REGEXP_REPLACE({phone}, \'[^0-9]\', \'\')', 'is', normalizedPhone],
                    'OR',
                    ['formulatext: REGEXP_REPLACE({altphone}, \'[^0-9]\', \'\')', 'is', normalizedPhone],
                    'OR',
                    ['formulatext: REGEXP_REPLACE({mobilephone}, \'[^0-9]\', \'\')', 'is', normalizedPhone]
                ],
                columns: ['internalid', 'phone', 'altphone', 'mobilephone']
            });

            var leadId = null;
            var matchedPhone = '';
            
            leadSearch.run().each(function (result) {
                leadId = result.getValue('internalid');
                matchedPhone = result.getValue('phone') || result.getValue('altphone') || result.getValue('mobilephone');
                log.audit('Lead Found', 'Lead ID: ' + leadId + ' | Matched Phone: ' + matchedPhone);
                return false; // only get first match
            });

            // If no lead found, try searching customers
            if (!leadId) {
                log.audit('Lead Search', 'No lead found, searching customers...');
                
                var customerSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [
                        ['formulatext: REGEXP_REPLACE({phone}, \'[^0-9]\', \'\')', 'is', normalizedPhone],
                        'OR',
                        ['formulatext: REGEXP_REPLACE({altphone}, \'[^0-9]\', \'\')', 'is', normalizedPhone],
                        'OR',
                        ['formulatext: REGEXP_REPLACE({mobilephone}, \'[^0-9]\', \'\')', 'is', normalizedPhone]
                    ],
                    columns: ['internalid', 'phone', 'altphone', 'mobilephone']
                });

                customerSearch.run().each(function (result) {
                    leadId = result.getValue('internalid');
                    matchedPhone = result.getValue('phone') || result.getValue('altphone') || result.getValue('mobilephone');
                    log.audit('Customer Found', 'Customer ID: ' + leadId + ' | Matched Phone: ' + matchedPhone);
                    return false;
                });
            }

            if (!leadId) {
                log.error('No Match', 'No lead or customer found with phone: ' + phone + ' (normalized: ' + normalizedPhone + ')');
                return { 
                    status: 'no_match', 
                    message: 'No lead or customer found with phone: ' + phone 
                };
            }

            // Create Phone Call activity record
            var phoneCall = record.create({
                type: record.Type.PHONE_CALL,
                isDynamic: true
            });

            phoneCall.setValue('title', 'Talkdesk Call - ' + direction);
            phoneCall.setValue('company', leadId);
            phoneCall.setValue('status', 'COMPLETE');
            phoneCall.setValue('phone', phone); // Use original Talkdesk format
            phoneCall.setValue('message', 
                'Direction: ' + direction +
                '\nDuration: ' + duration + ' seconds' +
                '\nMatched NetSuite Phone: ' + matchedPhone +
                (recordingUrl ? '\nRecording: ' + recordingUrl : '')
            );

            var callId = phoneCall.save();

            log.audit('Success', 'Phone call created with ID: ' + callId);

            return { 
                status: 'success', 
                leadId: leadId,
                phoneCallId: callId,
                matchedPhone: matchedPhone
            };

        } catch (e) {
            log.error('Script Error', e.message + ' | Stack: ' + e.stack);
            return { 
                status: 'error', 
                message: e.message 
            };
        }
    }

    return {
        post: post
    };
});