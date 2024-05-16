/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/search', 'N/log', 'N/record', 'N/ui/serverWidget', 'N/runtime'], function (search, log, record, serverWidget, runtime) {
    /**If there is a need to add a filter for changing how many hours ago the results are,
     * change the '24' in the formula ({now} - {date}) * 24 for the variable that has how
     * many hours ago the rsults should be.*/
    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;

            if (request.method == 'GET') {

                var form = serverWidget.createForm({
                    title: 'Addresses added in the last 24 hours',
                    // hideNavBar: false
                });

                var addressSublist = addSublistField(form);

                var addressesCreated = getAddressesNotes();
                var addressesFields = getAddressesFields(addressesCreated);
                addSublistData(addressSublist, addressesFields);

                response.writePage(form);
            }
        } catch (error) {
            log.debug('onRequest: ', error)
        }
    }



    function getAddressesNotes() {
        try {
            var systemnoteSearchObj = search.create({
                type: "systemnote",
                filters:
                    [
                        ["formulanumeric: ({now} - {date}) * 24", "lessthanorequalto", "1"],
                        "AND",
                        ["field", "anyof", "CUSTRECORD_EVX_ENABLE_SHIPTO"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "record", label: "Record" }),
                        search.createColumn({ name: "date", label: "Date" }),
                        search.createColumn({ name: "name", label: "Set by" })
                    ]
            });
            var addressesNotes = [];

            var searchResultCount = systemnoteSearchObj.runPaged().count;
            if (searchResultCount < 1) return addressesNotes;

            systemnoteSearchObj.run().each(function (result) {
                addressesNotes.push({
                    internalId: result.getValue({ name: "record" }),
                    date: new Date(result.getValue({ name: "date" })),
                    SetBy: result.getValue({ name: "name" })
                });
                return true;
            });

            return addressesNotes;
        } catch (error) {
            log.debug('Error in getAddressesNotes', error)
        }
    }


    function getAddressesFields(addressesCreated) {
        try {
            // var filters = [];
            var filter = ["address.internalid", "anyof"]
            for (var i = 0; i < addressesCreated.length; i++) {
                filter.push(addressesCreated[i].internalId)
                // filters.push(["address.internalid", "is", addressesCreated[i].internalId]);
                // if(i+1 < addressesCreated.length) filters.push("OR");
            }
            var customerSearchObj = search.create({
                type: "customer",
                filters: [filter],
                columns:
                    [
                        search.createColumn({ name: "altname", label: "Name" }),
                        search.createColumn({ name: "accountnumber", label: "Account" }),
                        search.createColumn({
                            name: "internalid",
                            join: "Address",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "address",
                            join: "Address",
                            label: "Address"
                        }),
                        search.createColumn({
                            name: "address1",
                            join: "Address",
                            label: "Address 1"
                        }),
                        search.createColumn({
                            name: "address2",
                            join: "Address",
                            label: "Address 2"
                        }),
                        search.createColumn({
                            name: "address3",
                            join: "Address",
                            label: "Address 3"
                        }),
                        search.createColumn({
                            name: "addressinternalid",
                            join: "Address",
                            label: "Address Internal ID"
                        }),
                        search.createColumn({
                            name: "addresslabel",
                            join: "Address",
                            label: "Address Label"
                        }),
                        search.createColumn({
                            name: "addressphone",
                            join: "Address",
                            label: "Address Phone"
                        }),
                        search.createColumn({
                            name: "addressee",
                            join: "Address",
                            label: "Addressee"
                        }),
                        search.createColumn({
                            name: "custrecord175",
                            join: "Address",
                            label: "ACME Ship TO"
                        }),
                        search.createColumn({
                            name: "attention",
                            join: "Address",
                            label: "Attention"
                        }),
                        search.createColumn({
                            name: "city",
                            join: "Address",
                            label: "City"
                        }),
                        search.createColumn({
                            name: "country",
                            join: "Address",
                            label: "Country"
                        }),
                        search.createColumn({
                            name: "countrycode",
                            join: "Address",
                            label: "Country Code"
                        }),
                        search.createColumn({
                            name: "isdefaultbilling",
                            join: "Address",
                            label: "Default Billing Address"
                        }),
                        search.createColumn({
                            name: "isdefaultshipping",
                            join: "Address",
                            label: "Default Shipping Address"
                        }),
                        search.createColumn({
                            name: "custrecord_evx_enable_shipto",
                            join: "Address",
                            label: "Enable EvoX Ship-To"
                        }),
                        search.createColumn({
                            name: "custrecord_evx_shipping_email",
                            join: "Address",
                            label: "EvoX Ship-To Email (Username)"
                        }),
                        search.createColumn({
                            name: "custrecord_ava_customergstin",
                            join: "Address",
                            label: "GSTIN"
                        }),
                        search.createColumn({
                            name: "custrecord_custom_kc_customer_no",
                            join: "Address",
                            label: "Kimberly Clark Customer No"
                        }),
                        search.createColumn({
                            name: "custrecord_address_shiplist_no",
                            join: "Address",
                            label: "Network Number"
                        }),
                        search.createColumn({
                            name: "custrecord_acc_omnitracs_location_id",
                            join: "Address",
                            label: "Omnitracs Location ID"
                        }),
                        search.createColumn({
                            name: "custrecord_route",
                            join: "Address",
                            label: "Route"
                        }),
                        search.createColumn({
                            name: "custrecord_ship_zone",
                            join: "Address",
                            label: "Ship Zone"
                        }),
                        search.createColumn({
                            name: "custrecordcustrecord_addr_taxcert",
                            join: "Address",
                            label: "Ship-To Resale/Exemption Cert#"
                        }),
                        search.createColumn({
                            name: "custrecord_sdb_shipping_method",
                            join: "Address",
                            label: "Shipping Method"
                        }),
                        search.createColumn({
                            name: "state",
                            join: "Address",
                            label: "State/Province"
                        }),
                        search.createColumn({
                            name: "statedisplayname",
                            join: "Address",
                            label: "State/Province Display Name"
                        }),
                        search.createColumn({
                            name: "custrecord_stop",
                            join: "Address",
                            label: "Stop"
                        }),
                        search.createColumn({
                            name: "zipcode",
                            join: "Address",
                            label: "Zip Code"
                        })
                    ]
            });
            var addressesFields = [];

            var searchResultCount = customerSearchObj.runPaged().count;
            if (searchResultCount < 1) return addressesFields;

            customerSearchObj.run().each(function (result) {
                var notes = addressesCreated.find(address => address.internalId == result.getValue({
                    name: "internalid",
                    join: "Address"
                }));
                addressesFields.push({
                    SetBy: notes.SetBy,
                    DateModified: notes.date,
                    Name: result.getValue({ name: "altname", label: "Name" }),
                    Account: result.getValue({ name: "accountnumber", label: "Account" }),
                    InternalID: result.getValue({
                        name: "internalid",
                        join: "Address"
                    }),
                    Address: result.getValue({
                        name: "address",
                        join: "Address"
                    }),
                    Address1: result.getValue({
                        name: "address1",
                        join: "Address"
                    }),
                    Address2: result.getValue({
                        name: "address2",
                        join: "Address"
                    }),
                    Address3: result.getValue({
                        name: "address3",
                        join: "Address"
                    }),
                    AddressInternalID: result.getValue({
                        name: "addressinternalid",
                        join: "Address"
                    }),
                    AddressLabel: result.getValue({
                        name: "addresslabel",
                        join: "Address"
                    }),
                    AddressPhone: result.getValue({
                        name: "addressphone",
                        join: "Address"
                    }),
                    Addressee: result.getValue({
                        name: "addressee",
                        join: "Address"
                    }),
                    ACMEShipTO: result.getValue({
                        name: "custrecord175",
                        join: "Address"
                    }),
                    Attention: result.getValue({
                        name: "attention",
                        join: "Address"
                    }),
                    City: result.getValue({
                        name: "city",
                        join: "Address"
                    }),
                    Country: result.getValue({
                        name: "country",
                        join: "Address"
                    }),
                    CountryCode: result.getValue({
                        name: "countrycode",
                        join: "Address"
                    }),
                    DefaultBillingAddress: result.getValue({
                        name: "isdefaultbilling",
                        join: "Address"
                    }),
                    DefaultShippingAddress: result.getValue({
                        name: "isdefaultshipping",
                        join: "Address"
                    }),
                    EnableEvoXShipTo: result.getValue({
                        name: "custrecord_evx_enable_shipto",
                        join: "Address"
                    }),
                    EvoXShipToEmail: result.getValue({
                        name: "custrecord_evx_shipping_email",
                        join: "Address"
                    }),
                    GSTIN: result.getValue({
                        name: "custrecord_ava_customergstin",
                        join: "Address"
                    }),
                    KimberlyClarkCustomerNo: result.getValue({
                        name: "custrecord_custom_kc_customer_no",
                        join: "Address"
                    }),
                    NetworkNumber: result.getValue({
                        name: "custrecord_address_shiplist_no",
                        join: "Address"
                    }),
                    OmnitracsLocationID: result.getValue({
                        name: "custrecord_acc_omnitracs_location_id",
                        join: "Address"
                    }),
                    Route: result.getValue({
                        name: "custrecord_route",
                        join: "Address"
                    }),
                    ShipZone: result.getValue({
                        name: "custrecord_ship_zone",
                        join: "Address"
                    }),
                    ShipToResale: result.getValue({
                        name: "custrecordcustrecord_addr_taxcert",
                        join: "Address"
                    }),
                    ShippingMethod: result.getValue({
                        name: "custrecord_sdb_shipping_method",
                        join: "Address"
                    }),
                    StateProvince: result.getValue({
                        name: "state",
                        join: "Address"
                    }),
                    StateProvinceDisplayName: result.getValue({
                        name: "statedisplayname",
                        join: "Address"
                    }),
                    Stop: result.getValue({
                        name: "custrecord_stop",
                        join: "Address"
                    }),
                    ZipCode: result.getValue({
                        name: "zipcode",
                        join: "Address"
                    }),
                });
            });

            return addressesFields;
        } catch (error) {
            log.debug("error in getAddressesFields", error);
        }
    }

    function addSublistField(form) {
        try {
            var addressSublist = form.addSublist({
                id: 'custpage_sublist',
                label: 'Ship to Addresses within the last 24 hours',
                type: serverWidget.SublistType.LIST,
            });

            addressSublist.addField({
                id: 'custpage_col_internal_id',
                label: 'Address Id',
                type: serverWidget.FieldType.TEXTAREA,
            });
            addressSublist.addField({
                id: 'custpage_customer_name',
                label: 'Customer Name',
                type: serverWidget.FieldType.TEXT,
            });
            addressSublist.addField({
                id: 'custpage_customer_account',
                label: 'Customer Account',
                type: serverWidget.FieldType.TEXT
            });

            //Addresses fields
            addressSublist.addField({
                id: 'custpage_address',
                label: "Address",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_address1',
                label: "Address 1",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_address2',
                label: "Address 2",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_addres3',
                label: "Address 3",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_address_label',
                label: "Address Label",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_phone',
                label: "Address Phone",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_addressee',
                label: "Addressee",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_acme_shipto',
                label: "ACME Ship TO",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_attention',
                label: "Attention",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_city',
                label: "City",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_country',
                label: "Country",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_country_code',
                label: "Country Code",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_default_billing_address',
                label: "Default Billing Address",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_default_shipping_address',
                label: "Default Shipping Address",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_enable_evox',
                label: "Enable EvoX Ship-To",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_evox_email',
                label: "EvoX Ship-To Email (Username)",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_gstin',
                label: "GSTIN",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_kc_number',
                label: "Kimberly Clark Customer No",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_network_number',
                label: "Network Number",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_omnitracs_id',
                label: "Omnitracs Location ID",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_route',
                label: "Route",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_ship_zone',
                label: "Ship Zone",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_shipto_resale',
                label: "Ship-To Resale/Exemption Cert#",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_shipping_method',
                label: "Shipping Method",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_state',
                label: "State/Province",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_state_display',
                label: "State/Province Display Name",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_stop',
                label: "Stop",
                type: serverWidget.FieldType.TEXT
            });
            addressSublist.addField({
                id: 'custpage_zip',
                label: "Zip Code",
                type: serverWidget.FieldType.TEXT
            });
            //End of addresses fields

            addressSublist.addField({
                id: 'custpage_created_by',
                label: 'Created By',
                type: serverWidget.FieldType.TEXT
            });
            
            addressSublist.addField({
                id: 'custpage_datemodified',
                label: 'Date Modified',
                type: serverWidget.FieldType.TEXT
            });

            return addressSublist;

        } catch (error) {
            log.debug("error addSublistField", error)
        }
    }

    function addSublistData(addressSublist, results) {
        try {
            log.debug('results.length', results.length);
            if (!results) return;

            for (var i = 0; i < results.length; i++) {
                var account = runtime.accountId
                if (account.includes("_")) {
                    account = account.replace("_", "-")
                }
                var urlValue = `https://${account}.app.netsuite.com/app/common/address/address.nl?id=${results[i].InternalID}`
                addressSublist.setSublistValue({
                    id: 'custpage_col_internal_id',
                    line: i,
                    value: '<a target="_blank" href="' + urlValue + '">' + results[i].InternalID + '</a>'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_customer_name',
                    line: i,
                    value: (results[i] && results[i].Name) ? results[i]?.Name : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_customer_account',
                    line: i,
                    value: (results[i] && results[i].Account) ? results[i]?.Account : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_address',
                    line: i,
                    value: (results[i] && results[i].Address) ? results[i]?.Address : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_address1',
                    line: i,
                    value: (results[i] && results[i].Address1) ? results[i]?.Address1 : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_address2',
                    line: i,
                    value: (results[i] && results[i].Address2) ? results[i]?.Address2 : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_addres3',
                    line: i,
                    value: (results[i] && results[i].Address3) ? results[i]?.Address3 : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_address_label',
                    line: i,
                    value: (results[i] && results[i].AddressLabel) ? results[i]?.AddressLabel : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_phone',
                    line: i,
                    value: (results[i] && results[i].AddressPhone) ? results[i]?.AddressPhone : 'N/A'
                });

                addressSublist.setSublistValue({
                    id: 'custpage_addressee',
                    line: i,
                    value: (results[i] && results[i].Addressee) ? results[i]?.Addressee : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_acme_shipto',
                    line: i,
                    value: (results[i] && results[i].ACMEShipTO) ? results[i]?.ACMEShipTO : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_attention',
                    line: i,
                    value: (results[i] && results[i].Attention) ? results[i]?.Attention : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_city',
                    line: i,
                    value: (results[i] && results[i].City) ? results[i]?.City : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_country',
                    line: i,
                    value: (results[i] && results[i].Country) ? results[i]?.Country : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_country_code',
                    line: i,
                    value: (results[i] && results[i].CountryCode) ? results[i]?.CountryCode : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_default_billing_address',
                    line: i,
                    value: (results[i] && results[i].DefaultBillingAddress) ? results[i]?.DefaultBillingAddress : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_default_shipping_address',
                    line: i,
                    value: (results[i] && results[i].DefaultShippingAddress) ? results[i]?.DefaultShippingAddress : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_enable_evox',
                    line: i,
                    value: (results[i] && results[i].EnableEvoXShipTo) ? results[i]?.EnableEvoXShipTo : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_evox_email',
                    line: i,
                    value: (results[i] && results[i].EvoXShipToEmail) ? results[i]?.EvoXShipToEmail : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_gstin',
                    line: i,
                    value: (results[i] && results[i].GSTIN) ? results[i]?.GSTIN : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_kc_number',
                    line: i,
                    value: (results[i] && results[i].KimberlyClarkCustomerNo) ? results[i]?.KimberlyClarkCustomerNo : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_network_number',
                    line: i,
                    value: (results[i] && results[i].NetworkNumber) ? results[i]?.NetworkNumber : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_omnitracs_id',
                    line: i,
                    value: (results[i] && results[i].OmnitracsLocationID) ? results[i]?.OmnitracsLocationID : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_route',
                    line: i,
                    value: (results[i] && results[i].Route) ? results[i]?.Route : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_ship_zone',
                    line: i,
                    value: (results[i] && results[i].ShipZone) ? results[i]?.ShipZone : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_shipto_resale',
                    line: i,
                    value: (results[i] && results[i].ShipToResale) ? results[i]?.ShipToResale : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_shipping_method',
                    line: i,
                    value: (results[i] && results[i].ShippingMethod) ? results[i]?.ShippingMethod : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_state',
                    line: i,
                    value: (results[i] && results[i].StateProvince) ? results[i]?.StateProvince : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_state_display',
                    line: i,
                    value: (results[i] && results[i].StateProvinceDisplayName) ? results[i]?.StateProvinceDisplayName : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_stop',
                    line: i,
                    value: (results[i] && results[i].Stop) ? results[i]?.Stop : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_zip',
                    line: i,
                    value: (results[i] && results[i].ZipCode) ? results[i]?.ZipCode : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_created_by',
                    line: i,
                    value: (results[i] && results[i].SetBy) ? results[i]?.SetBy : 'N/A'
                });
                addressSublist.setSublistValue({
                    id: 'custpage_datemodified',
                    line: i,
                    value: (results[i] && results[i].DateModified) ? results[i]?.DateModified : 'N/A'
                });

            }
            return;
        } catch (error) {
            log.debug("error addSublistData", error)
        }
    }

    return {
        onRequest: onRequest
    };
});
