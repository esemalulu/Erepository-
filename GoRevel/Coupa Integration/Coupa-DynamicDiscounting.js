/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 *
 * Name: Coupa-DynamicDiscounting.js
 *
 * Script Type: Map/Reduce
 *
 * Description: Map/Reduce script for Dynamic Discounting for Customers with payment-channel as ERP
 *
 * Script Id: customscript_coupa_dd_integration
 *
 * Deployment Id: customdeploy_coupa_dd_integration_adhoc
 ********************************************************************************/

define(['N/email', 'N/error', 'N/https', 'N/record', 'N/runtime', 'N/search', './Coupa-DynamicDiscountingModule', './Coupa - OpenIDConnect 2.0'],
    /**
     * @param{email} email
     * @param{error} error
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     */
    function (email, error, https, record, runtime, search, dynamicDiscounting, oidc) {


        /**
         * Marks the beginning of the Map/Reduce process and generates input data. Initiates the Coupa Module and validates the Environment.
         * After validating the environment calls searchCoupaInvoices to get CoupaPay Invoices and returns the Invoices to Reduce stage
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array} inputSummary
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        function getInputData() {
            try {
                var requestHeader = oidc.getAPIHeader();
                var coupaModule = new dynamicDiscounting.coupa();           //Initialize the Coupa Module
                if (coupaModule.isEnvironmentValid) {
                    var payInvoices = coupaModule.searchCoupaInvoices(requestHeader);           //Fetch CoupaPay Invoices from Coupa Instance
                    /*log.audit({
                        title: 'payInvoices to be processed -returned from getInputData()',
                        details: JSON.stringify(payInvoices)
                    });*/
                    return payInvoices;
                } else {
                    throw 'Error - script is running in non prod environment and not using a ' + this.url_test_contains + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
                }
            } catch (e) {
                if (typeof e == 'string' && e.indexOf('Error - script is running in non prod environment') > -1) {
                    log.error({
                        title: 'Error in getInputData()',
                        details: 'Incorrect Environment Error'
                    });
                    throw 'Error - script is running in non prod environment and not using a ' + this.url_test_contains + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
                } else {
                    log.error({
                        title: 'Error in getInputData()',
                        details: JSON.stringify(e)
                    });
                }
            }
        }


        /**
         * Executes when the reduce entry point is triggered and applies to each group. Calls processPayInvoice to process CoupaPay Invoice and Update VendorBill.
         * After successfully updating the VB the payInvoice is marked as exported
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        function reduce(context) {
            try {
                log.audit({
                    title: 'Processing payInvoice[' + context.key + '] in reduce Stage',
                    details: context.values[0]
                });
                var invoiceObject = context.values[0];           //Get the Invoice object to be processed
                if (invoiceObject) {
                    var scriptRef = runtime.getCurrentScript();
                    log.debug("Remaining Governance Units before processing payInvoice: ", scriptRef.getRemainingUsage());
                    var payInvoice = JSON.parse(invoiceObject);
                    var coupaModule = new dynamicDiscounting.coupa();
                    var responseObject = coupaModule.processPayInvoice(payInvoice, payInvoice.invoice_id,payInvoice.requestHeader);           //Process the Pay Invoice and returns
                    if (responseObject && responseObject.processed && payInvoice.id) {
                        log.debug("Marking Invoice with Id: " + payInvoice.id + " in Coupa as exported", "Remaining usage: " + scriptRef.getRemainingUsage());
                        coupaModule.setInvoiceExported(payInvoice.id, payInvoice.requestHeader);
                    } else {
                        log.audit({
                            title: 'Unable to process CoupaPay Invoice with Id: ' + payInvoice.id,
                            details: 'Not marking the Invoice as exported'
                        });
                    }
                    log.debug("Remaining Governance Units after processing payInvoice: ", scriptRef.getRemainingUsage());
                } else {
                    log.audit({
                        title: 'Invoice Object sent from getInputData() is invalid',
                        details: invoiceObject
                    });
                }
            } catch (e) {
                log.error({
                    title: 'Error in Reduce Stage',
                    details: JSON.stringify(e)
                });
                throw e;
            }
        }


        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @author Yogesh Jagdale
         * @since 5.0.0
         */
        function summarize(summary) {
            var coupaModule = new dynamicDiscounting.coupa();
            var scriptName = "Coupa - Dynamic Discounting process";
            var contents = '';
            summary.reduceSummary.errors.iterator().each(function (key, value) {
                contents += "Vendor Bill (ID " + value + ") against CoupaPay Invoice(ID " + key + ") <br><br>";
                return true;
            });
            if (contents) {           //If any Errors are reported in Reduce Summary send out an email to the Recipient/s in the script parameter
                coupaModule.sendFailureSummary(summary, scriptName);
            }
            log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
            log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
            log.debug('Summary Yields', 'Total Yields: ' + summary.yields);
            log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
            log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));
            log.debug('——-SCRIPT——-', '——-END——-');
        }


        return {
            config: {           //Configuration object to retry for 3 times in case the Coupa instance is unreachable or unexpected error.
                retryCount: 3,
                exitOnError: true
            },
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });