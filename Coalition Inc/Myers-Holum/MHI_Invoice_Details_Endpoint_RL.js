/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/runtime', 'N/record', 'N/search', 'N/cache'], (runtime, record, search, cache) => {
  const COMMANDS = {
    load: 'load',
    submit: 'submit',
    customer: 'customer',
    customer_load: 'customer_load',
    agency_pay: 'agency_pay'
  };

  const updateCustomer = (context) => {
    const { type, data } = context;
    const isCustomerUpdate = type === COMMANDS.customer;
    const netsuiteId = data.netsuite_id;
    let response = { success: true };

    if (isCustomerUpdate && netsuiteId) {
      try {
        const newValues = setNewCustomerValues(data);

        if (Object.keys(newValues).length > 0) {
          record.submitFields({
            type: record.Type.CUSTOMER,
            id: netsuiteId,
            values: newValues,
            options: {
              ignoreMandatoryFields: true,
              enableFieldSourcing: false
            }
          });
        }
      } catch (e) {
        log.error('Error', e);
        response = { success: false, error: e.message };
      }
    }

    return response;
  };

  const validateInvoiceOrCustomer = (context) => {
    const { type, id } = context;
    let response = { success: false };

    if (type === COMMANDS.load) {
      try {
        const results = getTransactionData(id);
        const subsidiaryData = getSubsidiaryData(results.invoice.subsidiary);

        if (results.success) {
          response = setResponse({
            success: true,
            type,
            subsidiaryData,
            results
          });
        } else if (results.invoice) {
          response = setResponse({
            success: true,
            type,
            subsidiaryData,
            results
          });
        }
      } catch (e) {
        log.error('Error', e);
        response.error = e.message;
      }
    } else if (type === COMMANDS.agency_pay) {
      try {
        const portalCache = cache.getCache({
          name: `${id}-portal-cache`,
          scope: cache.Scope.PUBLIC
        });

        const selected = portalCache.get({
          key: 'invoice-pay-session'
        });

        log.debug('sel', selected);

        const invoices = JSON.parse(selected);

        const results = lookupInvoices(invoices);
        log.debug('results', results);
        const subsidiaryData = getSubsidiaryData(results.subsidiary);

        response = setResponse({
          success: true,
          type,
          subsidiaryData,
          results
        });
        log.debug('data', results);
      } catch (e) {
        log.error('Error', e);
        response.error = e.message;
      }
    } else if (type == COMMANDS.submit) {
      const results = getTransactionData(id, true);

      if (results.success) {
        response = setResponse({
          success: true,
          type,
          results
        });
      }
    } else if (type === COMMANDS.customer_load) {
      const customerData = getCustomerData(id);

      if (customerData.success) {
        const subsidiaryData = getSubsidiaryData(customerData.subsidiary);

        response = setResponse({
          success: true,
          type,
          subsidiaryData,
          customerData
        });
      }
    }

    log.audit('Response for Invoice/Customer ID: ' + id, response);

    return response;
  };

  const setNewCustomerValues = (data) => {
    const newValues = {};
    if (data.stripe_id) newValues.custentity_stripe_customerid = data.stripe_id;

    return newValues;
  };

  const getCustomerData = (customerId, isInvoice) => {
    const data = search.lookupFields({
      type: 'customer',
      id: customerId,
      columns: [
        'companyname',
        'custentity_stripe_customerid',
        'email',
        'billaddressee',
        'billaddress1',
        'billaddress2',
        'billcity',
        'billzipcode',
        'billcountry',
        'billstate',
        'custentity_internalid_hash',
        'subsidiary'
      ]
    });

    if (isInvoice) return data;

    try {
      const hasLine1 = data.billaddress1 && data.billaddress1.length > 0;
      const result = {
        success: true,
        id: customerId,
        stripe_id: data.custentity_stripe_customerid,
        name: data.billaddressee || data.companyname,
        hash: encodeURIComponent(data.custentity_internalid_hash),
        subsidiary: data.subsidiary && data.subsidiary[0] && data.subsidiary[0].value
      };

      result.country = (data.billcountry && data.billcountry[0] && data.billcountry[0].value) || 'US';
      result.state = data.billstate && data.billstate[0] && data.billstate[0].value;

      if (hasLine1) {
        result.address = {
          name: data.billaddressee,
          line1: data.billaddress1,
          line2: data.billaddress2,
          city: data.billcity,
          state: result.state,
          country: result.country,
          zip: data.billzipcode
        };
      }

      return result;
    } catch (e) {
      log.error('Error', e);
      return { success: false };
    }
  };

  const getInvCustomerData = (inv, invoiceAddress) => {
    const customerId = inv.getValue('entity');
    const data = getCustomerData(customerId, true);

    const { criteria, address, customerCountry } = setAddress(invoiceAddress, data);

    return {
      id: customerId,
      hash: encodeURIComponent(data.custentity_internalid_hash),
      stripe_id: data.custentity_stripe_customerid,
      address: address || {},
      name: address.name || data.companyname || data.altname,
      email: data.email,
      customer_country: customerCountry,
      country: criteria.country,
      state: criteria.state
    };
  };

  const getSubsidiaryData = (subsidiaryId) => {
    const data = { id: subsidiaryId };

    try {
      const results = search.lookupFields({
        type: search.Type.SUBSIDIARY,
        id: subsidiaryId,
        columns: [
          'namenohierarchy',
          'custrecord_stripe_account_id'
        ]
      });
      data.name = results.namenohierarchy;
      data.stripe_account = results.custrecord_stripe_account_id;
    } catch (e) {
      log.error('Error', e);
    }

    return data;
  };

  const getTransactionData = (internalId, isSubmitType) => {
    const inv = record.load({
      type: 'invoice',
      id: internalId
    });
    let response = { success: false, invoice: {} };

    if (isSubmitType) {
      try {
        const invoice = { amount_remaining: parseFloat(inv.getValue('amountremaining')) || 0.0 };
        response = {
          success: true,
          invoice
        };
      } catch (e) {
        log.error('Error', e);
        response.success = false;
      }
    } else {
      const currency = inv.getValue('currencysymbol');
      const currencySymbol = lookupCurrencySymbol(currency);
      const addressRec = inv.getSubrecord('billingaddress');
      const address = {
        name: addressRec.getValue('addressee'),
        line1: addressRec.getValue('addr1'),
        line2: addressRec.getValue('addr2'),
        city: addressRec.getValue('city'),
        state: addressRec.getValue('state'),
        zip: addressRec.getValue('zip'),
        country: addressRec.getValue('country')
      };

      try {
        const invoice = {
          details: true,
          id: internalId,
          subsidiary: inv.getValue('subsidiary'),
          currency: currency.toLowerCase() || 'usd',
          currency_symbol: currencySymbol,
          tran_number: inv.getValue('tranid'),
          customer_reference: inv.getValue('otherrefnum') || '',
          amount_remaining: parseFloat(inv.getValue('amountremaining')) || 0.0,
          subtotal: parseFloat(inv.getValue('subtotal')) || 0.0,
          total: parseFloat(inv.getValue('total')) || 0.0,
          tax_rate: parseFloat(inv.getValue('taxrate')) / 100.0,
          tax_total: parseFloat(inv.getValue('taxtotal')) || 0.0,
          discount_total: parseFloat(inv.getValue('discounttotal')) || 0.0,
          stripe_payment_id: inv.getValue('custbody_suitesync_authorization_code'),
          policy_number: inv.getText('custbody_policy_number') || 'NA',
          due_date: formatDate(inv.getValue('duedate') || inv.getValue('trandate')),
          issue_date: formatDate(inv.getValue('trandate'))
        };

        invoice.above_minimum = isAboveMinimum(inv);
        const customer = getInvCustomerData(inv, address);
        log.debug('customer', customer);

        response = {
          success: true,
          invoice,
          customer
        };
      } catch (e) {
        log.error('Error', e);

        const remaining = inv.getValue('amountremaining');
        const invNum = inv.getValue('tranid');
        const subsidiary = inv.getValue('subsidiary') || 1;

        response.invoice.details = false;
        response.invoice.subsidiary = subsidiary;
        response.invoice.tran_number = invNum || '';
        response.invoice.currency = currency.toLowerCase();
        response.invoice.amount_remaining = parseFloat(remaining) || 0.0;
      }
    }

    return response;
  };

  const isAboveMinimum = (inv) => {
    const fxRate = parseFloat(inv.getValue('exchangerate'));
    const remaining = parseFloat(inv.getValue('amountremaining'));

    return Number(fxRate * remaining) >= 0.5;
  };

  const lookupCurrencySymbol = (isoCode) => {
    let displaySymbol;

    const currSearch = search.create({
      type: 'currency',
      filters: ['symbol', 'is', isoCode],
      columns: ['internalid']
    });

    currSearch.run().each((res) => {
      const currencyRec = record.load({
        type: 'currency',
        id: res.id
      });
      displaySymbol = currencyRec.getValue('displaysymbol');
    });

    return displaySymbol;
  };

  const setAddress = (invoiceAddress, data) => {
    let address = {};
    const customerCountry = (data.billcountry && data.billcountry[0] && data.billcountry[0].value) || 'US';
    const customerState = data.billstate && data.billstate[0] && data.billstate[0].value;

    const criteria = {};

    if (invoiceAddress) {
      if (invoiceAddress.line1) address = invoiceAddress;

      criteria.country = invoiceAddress.country;
      criteria.state = invoiceAddress.state;
    } else {
      criteria.country = customerCountry;
      criteria.state = customerState;

      const hasLine1 = data.billaddress1 && data.billaddress1.length > 0;

      if (hasLine1) {
        address = {
          name: data.billaddressee,
          line1: data.billaddress1,
          line2: data.billaddress2,
          city: data.billcity,
          state: criteria.state,
          country: criteria.country,
          zip: data.billzipcode
        };
      }
    }

    return {
      address,
      customerCountry,
      criteria
    };
  };

  const setResponse = (params) => {
    const {
      type, success, subsidiaryData, results, customerData
    } = params;

    const data = {
      subsidiary: subsidiaryData
    };

    if (results) {
      if (type === COMMANDS.agency_pay) {
        data.currency = results.currency;
        data.currency_symbol = results.currency_symbol;
        data.total = results.total;
        data.above_minimum = results.above_minimum;
        data.invoices = results.invoices;
      } else {
        data.invoice = results.invoice;
      }

      data.customer = results.customer;
    }

    if (customerData) data.customer = customerData;

    const response = {
      type,
      success,
      data
    };

    return response;
  };

  const lookupInvoices = (invoiceIds) => {
    log.debug('nivoice ids', invoiceIds);
    const data = { invoices: [] };
    let customerId = null;

    const invSearch = search.create({
      type: 'invoice',
      filters: [['mainline', 'is', true], 'AND', ['internalid', 'anyof', invoiceIds]],
      columns: ['amountremaining', 'tranid', 'currency', 'currency.symbol', 'mainname', 'subsidiary']
    });

    invSearch.run().each((res) => {
      const curr = res.getValue('currency');
      const symbol = res.getValue({ name: 'symbol', join: 'currency' });
      const entity = res.getValue('mainname');
      const subsidiary = res.getValue('subsidiary');
      let shouldPush = true;

      if (entity && !customerId) customerId = entity;

      if (!data.currency) {
        data.currency = curr;
        data.currency_symbol = symbol;
      } else {
        shouldPush = data.currency === curr;
      }

      if (customerId) shouldPush = customerId === entity;

      if (!data.subsidiary) {
        data.subsidiary = subsidiary;
      } else {
        shouldPush = data.subsidiary === subsidiary;
      }

      if (shouldPush) {
        data.invoices.push({
          internal_id: res.id,
          tran_number: res.getValue('tranid'),
          amount_remaining: res.getValue('amountremaining')
        });
      }

      return true;
    });

    if (customerId) data.customer = getCustomerData(customerId);
    data.total = data.invoices.reduce((a, b) => a + parseFloat(b.amount_remaining), 0);
    data.above_minimum = data.total > 0;

    return data;
  };

  const formatDate = (date) => {
    const dateObj = new Date(date);
    // Format day/month/year to two digits
    const formattedDate = ('0' + dateObj.getDate()).slice(-2);
    const formattedMonth = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    const formattedYear = dateObj.getFullYear().toString();
    // Combine and format date string
    const dateString = formattedMonth + '/' + formattedDate + '/' + formattedYear;
    return dateString;
  };

  return {
    get: validateInvoiceOrCustomer,
    post: updateCustomer
  };
});
