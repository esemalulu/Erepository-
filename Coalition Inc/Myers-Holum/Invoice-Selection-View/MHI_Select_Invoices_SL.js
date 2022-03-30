/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
  'N/record',
  'N/search',
  'N/runtime',
  'N/format',
  'N/file',
  'N/render',
  'N/log',
  'N/ui/serverWidget',
  'N/cache',
  '../MHI_Utility_Lib_Plugin.js'],
(record, search, runtime, format, file, render, log, serverWidget, cache, utils) => {
  const CURRENT_SCRIPT = runtime.getCurrentScript();
  const onRequest = (context) => {
    if (context.request.method === 'GET') {
      const { parameters } = context.request;
      log.debug('params', context.request.parameters);
      if (parameters.loadInvoices) {
        log.debug('TEST!!!!');
        const invoices = loadInvoices(parameters.customerId);
        log.debug('invoices', invoices);
        context.response.write(JSON.stringify(invoices));
      } else {
        const indexFile = file.load('223542');
        const htmlContents = indexFile.getContents();
        context.response.write(htmlContents);
      }
    } else if (context.request.method === 'POST') {
      const { parameters } = context.request;
      if (parameters.paymentRedirect) {
        log.debug('context.req', context.request.body);
        const body = decodeURIComponent(context.request.body);
        const { customerId } = parameters;

        if (body) {
          const invoiceIds = body.split('=')[1].split(',');
          const portalCache = cache.getCache({
            name: `${customerId}-portal-cache`,
            scope: cache.Scope.PUBLIC
          });
          const customerHash = search.lookupFields({
            type: 'customer',
            id: customerId,
            columns: ['custentity_internalid_hash']
          }).custentity_internalid_hash;

          portalCache.put({
            key: 'invoice-pay-session',
            value: invoiceIds
          });

          const encodedHash = encodeURIComponent(customerHash);

          const res = `http://localhost:8080/agency-pay?id=${encodedHash}`;

          context.response.write(JSON.stringify({ sessionUrl: res }));
        }
      }
    }
  };

  const loadInvoices = (entityId, invoiceIds) => {
    const searchId = CURRENT_SCRIPT.getParameter('custscript_invoice_search');
    const invoiceSearch = search.load(searchId);

    if (entityId) {
      const customerFilter = search.createFilter({
        name: 'mainname',
        operator: 'anyof',
        values: entityId
      });
      invoiceSearch.filters.push(customerFilter);
    } else if (invoiceIds) {
      const invoiceFilter = search.createFilter({
        name: 'internalid',
        operator: 'anyof',
        values: invoiceIds
      });
      invoiceSearch.filters.push(invoiceFilter);
    }

    const invoices = [];
    invoiceSearch.run().each((res) => {
      invoices.push({
        internalId: res.id,
        tranid: res.getValue('tranid'),
        trandate: res.getValue('trandate'),
        duedate: res.getValue('duedate'),
        total: res.getValue('total'),
        amountremaining: res.getValue('amountremaining')
      });
      return true;
    });

    return invoices;
  };

  return {
    onRequest
  };
});
