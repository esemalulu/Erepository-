/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

define([
    'N/cache',
    'N/config',
    'N/email',
    'N/format',
    'N/log',
    'N/query',
    'N/record',
    'N/runtime',
    'N/url',
    'N/search'
], function (cache, config, email, format, log, query, record, runtime, url, search) {
    function getInputData() {
        return query.runSuiteQL({
            query: `
                SELECT t.tranid                                AS documentNumber,
                       t.id                                    AS transactionId,
                       t.foreigntotal                          AS transactionAmount,
                       ar.custrecordr7approvaldaterequested    AS dateRequested,
                       c.companyname                           AS companyName,
                       e.id                                    AS approverId,
                       e.email                                 AS approverEmail,
                       BUILTIN.DF(ar.custrecordr7approvalrule) AS approvalRule,
                       t.custbodyr7sid                         AS SID,
                       BUILTIN.DF(t.custbodyr7quoteorderapprovalstatus) as quoteStatus
                FROM customrecordr7approvalrecord ar
                         INNER JOIN transaction t ON ar.custrecordr7approvalquote = t.id
                         INNER JOIN customer c ON t.entity = c.id
                         INNER JOIN employee e ON ar.custrecordr7approvalapprover = e.id
                WHERE BUILTIN.DF(ar.custrecordr7approvalstatus) = 'Pending Approval'
                  AND t.type = 'Estimate'
                  AND BUILTIN.DF(t.custbodyr7quoteorderapprovalstatus) = 'Pending Approval'
                  AND ar.custrecordr7approvaldaterequested > '10/01/2022'
                  ${employeeIdWhereClause()}
            `
        }).asMappedResults();
    }

    function map(context) {
        const approvalGroupMap = getApprovalGroups();

        const approvalRecord = JSON.parse(context.value);
        const approverId = approvalRecord['approverid'];

        const deliveryEmail = approvalGroupMap[approverId] || approvalRecord['approveremail'];

        context.write({
            key: deliveryEmail,
            value: approvalRecord
        });
    }

    function reduce(context) {
        const { key: deliveryEmail, values } = context;
        const netsuiteAdmin = config.load({ type: config.Type.COMPANY_PREFERENCES })
            .getValue({ fieldId: 'custscriptr7_system_info_email_sender' });

        const data = getReduceDataFromContext(values);
        const emailBody = buildHtmlBody(data);

        log.debug({ title: deliveryEmail, details: emailBody });

        // noinspection JSCheckFunctionSignatures
        email.send({
            author: netsuiteAdmin,
            recipients: deliveryEmail,
            subject: 'Quote approval reminder',
            body: emailBody
        });
    }

    function summarize(context) {
        if (context.inputSummary.error) {
            log.debug({ title: 'context.inputSummary.error', details: context.inputSummary.error });
        }

        context.mapSummary.errors.iterator().each(function (key, error) {
            log.error({ title: `Map error: ${key}`, details: error });
        });

        context.reduceSummary.errors.iterator().each(function (key, error) {
            log.error({ title: `Reduce error: ${key}`, details: error });
        });
    }

    //////////////////////////////////////////////////

    /**
     * Converts the string values provided in the context to Javascript objects.
     *
     * @param values
     * @returns {*}
     */
    function getReduceDataFromContext(values) {
        return values.map(v => JSON.parse(v));
    }

    function buildHtmlBody(data) {
        const tableRows = buildTableRows(data);

        return `
            <html lang="en">
            <head>
                <title>Quote Approval Reminder Email</title>
                <style>
                    .approval-reminders .h3 {
                        margin-bottom: 2rem;
                    }
                
                    .approval-reminders th {
                        min-width: 100px;
                        padding: 0 10px;
                        font-weight: bold;
                        border: solid black 1px;
                    }
                
                    .approval-reminders td {
                        padding: 10px;
                        border: solid black 1px;
                    }
                
                    .approval-reminders td.amount {
                        text-align: right;
                    }
                
                    .approval-reminders td.approve-button {
                        padding: 10px 0 0 0;
                        text-align: center;
                    }
                
                    .approval-reminders img {
                        border: 0;
                    }
                </style>
                </head>
                <body>
                <div class="approval-reminders">
                <h3>You have quotes that are pending your approval.</h3>

                <table>
                <thead>
                    <tr>
                        <th>Quote</th>
                        <th>Date Requested</th>
                        <th align="left">Company Name</th>
                        <th>Amount</th>
                        <th>Rule</th>
                        <th>Approver Name</th>
                        <th>&nbsp;</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows.join('\n')}
                </tbody>
                </table>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Builds the HTML table rows for each quote requiring approval for a single email
     *
     * @param data
     * @returns {*}
     */
    function buildTableRows(data) {
        return data.map(row => {
            const {
                documentnumber, transactionid, transactionamount, daterequested, companyname, approverid,
                approvalrule, sid
            } = row;

            const formattedTransactionAmount = format.format({
                type: format.Type.CURRENCY,
                value: transactionamount
            });
            const approverName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: approverid,
                columns: ['entityid']
            })['entityid'];
            log.debug('approverName', approverName);
            
            // noinspection JSCheckFunctionSignatures
            const quoteUrl = getExternalTransactionUrl(transactionid);

            const suiteletUrl = url.resolveScript({
                scriptId: 'customscriptr7approvalssuitelet',
                deploymentId: 'customdeployr7_approvalssuitelet_quote',
                returnExternalUrl: true,
                params: {
                    custparamsid: sid,
                    custparamuser: approverid
                }
            });

            return `
                <tr>
                    <td><a href="${quoteUrl}">${documentnumber}</a></td>
                    <td>${daterequested}</td>
                    <td>${companyname}</td>
                    <td class="amount">${formattedTransactionAmount}</td>
                    <td>${approvalrule}</td>
                    <td>${approverName}</td>
                    <td class="approve-button">
                        <a href="${suiteletUrl}" target="_blank">
                            <img src="https://663271.app.netsuite.com/core/media/media.nl?id=74066&c=663271&h=oaKOQ9xhYZ-2wHpbdMJFZTaIM3y-kICftv0vSUeXkNDL4Tg1" alt="Approve button"/>
                        </a>
                    </td>
                </tr>
            `;
        });
    }

    /**
     * Get the approval group mapping from cache if it exists.  If it is not in cache,
     * builds the mapping and puts it in the cache and returns it.
     *
     * @returns {any}
     */
    function getApprovalGroups() {
        const approvalGroupCache = cache.getCache({
            name: 'approval_group_cache',
            scope: cache.Scope.PUBLIC
        });

        // noinspection JSCheckFunctionSignatures
        const cachedMapping = approvalGroupCache.get({
            key: 'approval_groups',
            loader: buildApprovalGroupMapping
        });

        return JSON.parse(cachedMapping);
    }

    /**
     * Creates a map object of employee ID => approval group email.  We use this to
     * See if the approval email should be sent to a group email inbox defined in
     * the Quote Approval Group records.
     *
     * @returns {{}}
     */
    function buildApprovalGroupMapping() {
        log.debug({ title: 'buildApprovalGroupMapping', details: 'Getting approval group meeting from database.' });

        const results = query.runSuiteQL({
            query: `
                SELECT custrecord_r7_shared_email_inbox AS emailInbox,
                       custrecord_r7_group_members      AS groupMembers
                FROM customrecord_r7_quote_approval_group
            `
        }).asMappedResults();

        const approvalMap = {};

        results.forEach(result => {
            const email = result['emailinbox'];
            if(result['groupmembers']){
                const members = result['groupmembers'].split(',').map(m => m.trim());

                members.forEach(member => {
                    approvalMap[member] = email;
                });
            }
        });

        log.debug({ title: 'approvalMap', details: approvalMap });

        return approvalMap;
    }

    function getExternalTransactionUrl(transactionId) {
        // noinspection JSCheckFunctionSignatures
        const quoteUrl = url.resolveRecord({
            recordType: record.Type.ESTIMATE,
            recordId: transactionId,
        });

        const accountId = runtime.accountId.toLowerCase().replace('_', '-');

        return `https://${accountId}.app.netsuite.com${quoteUrl}`;
    }

    /**
     * If employeeIds are specified in the script parameter, then only return approvals for those IDs.
     * If no employeeIds are specified, then all employees with a pending approval will receive a reminder.
     *
     * @returns {string}
     */
    function employeeIdWhereClause() {
        const employeeIdParameter = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_remind_only_emp_ids' });

        if (!employeeIdParameter) {
            return '';
        }

        const employeeIds = employeeIdParameter
            .split(',')
            .map(id => id.trim())
            .map(Number)
            .filter(Boolean);

        if (!employeeIds.length) {
            return '';
        }

        return `AND e.id IN (${employeeIds.join(',')})`;
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});