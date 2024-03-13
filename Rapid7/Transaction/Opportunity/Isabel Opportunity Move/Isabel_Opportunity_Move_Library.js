/**
 * @NApiVersion 2.1
 * @NScriptType module
 * @module
 * @description
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log', 'N/email', 'N/error'], function (record, search, runtime, log, email, error) {

    function createNewOpp(opportunityId) {
        try {
            var sessionObj = runtime.getCurrentSession();

            var errorString;
            var oldOpp = record.load({
                type: record.Type.OPPORTUNITY,
                id: opportunityId,
            });
            var oppObj = getOldOppFields(opportunityId, oldOpp);
            validateOppFields(oppObj);
            var newOpp = record.create({
                type: record.Type.OPPORTUNITY,
                isDynamic: true,
            });
            log.debug('header ', oppObj.header);
            newOpp.setValue({
                fieldId: 'customform',
                value: oppObj.header['customform'],
            });
            errorString = setHeaders(oppObj, newOpp, sessionObj, opportunityId, errorString);

            // since the core issue of currency being changed is custom addresses on transaction => set default address in case of custom or empty addresses
            // https://issues.corp.rapid7.com/browse/APPS-16661
            function getCustomerDefaultAddress(entity, addressField) {
                var addressFound = false;
                var customerRec = record.load({
                    type: record.Type.CUSTOMER,
                    id: entity,
                    isDynamic: false,
                });

                var addressLines = customerRec.getLineCount({ sublistId: 'addressbook' });

                for (var i = 0; i < addressLines; i++) {
                    var isDefaultAddress = customerRec.getSublistValue({
                        sublistId: 'addressbook',
                        fieldId: addressField === 'shipaddresslist' ? 'defaultshipping' : 'defaultbilling',
                        line: i,
                    });

                    if (isDefaultAddress == 'T' || isDefaultAddress === true) {
                        addressFound = true;
                        return customerRec.getSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'id',
                            line: i,
                        });
                    }
                }
                if (!addressFound) {
                    var errorText =
                        'Custom address is selected on Opportunity and no default address is set on the Customer page. Custom addresses are not carryed over to new Opportunity and are set to default billing/shiping addresses from the Customer page. Please select an existing address on the Opportunity or create a new one. You can also set default addresses on the Customer page. Do not procced with -Custom- address';
                    var addressError = error.create({
                        name: 'ADDRESS__ERROR',
                        message: errorText,
                        notifyOff: false,
                    });
                    throw addressError;
                }
            }

            function setAddressInfo(obj) {
                //
                for (var fieldId in obj) {
                    if (fieldId == 'shipaddresslist' || fieldId == 'billaddresslist') {
                        if (!isEmpty(obj[fieldId])) {
                            newOpp.setValue({
                                fieldId: fieldId,
                                value: obj[fieldId],
                            });
                            break;
                        } else {
                            newOpp.setValue({
                                fieldId: fieldId,
                                value: getCustomerDefaultAddress(newOpp.getValue('entity'), fieldId),
                            });
                        }
                    }
                }
            }
            // address info setting (!shipaddress first!)
            setAddressInfo(oppObj.addressInfo.shiping);
            setAddressInfo(oppObj.addressInfo.billing);

            newOpp.setValue({
                fieldId: 'location',
                value: 29,
            });
            // avoid the departmnet empty value in some cases before the record save.
            newOpp.setValue({
                fieldId: 'department',
                value: oppObj.header['department'],
            });
            newOpp.setValue({
                fieldId: 'currency',
                value: oppObj.header['currency'],
            });
            newOpp.setValue({
                fieldId: 'title',
                value: oppObj.header['title'],
            });
            for (var line in oppObj.lines) {
                var inGroup = oldOpp.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'ingroup',
                    line: line,
                });
                var itemId = oldOpp.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: line,
                });
                if (!inGroup && itemId != 0) {
                    newOpp.selectNewLine({
                        sublistId: 'item',
                    });
                    for (var lineProp in oppObj.lines[line]) {
                        if (oppObj.lines[line][lineProp] || oppObj.lines[line][lineProp] === 0) {
                            try {
                                //  if its DISC or Partner Discount set proper rate (absolute or percent)
                                if (lineProp == 'rate' && (oppObj.lines[line]['item'] == '51' || oppObj.lines[line]['item'] == '-6')) {
                                    if (oppObj.lines[line]['rate'] && oppObj.lines[line]['rate'] != oppObj.lines[line]['amount']) {
                                        oppObj.lines[line]['rate'] = oppObj.lines[line]['rate'] + '%';
                                        // oppObj.lines[line]['amount'] = ''
                                        newOpp.setCurrentSublistText({
                                            sublistId: 'item',
                                            fieldId: lineProp,
                                            value: oppObj.lines[line][lineProp],
                                        });
                                    }
                                } else {
                                    newOpp.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: lineProp,
                                        value: oppObj.lines[line][lineProp],
                                    });
                                }
                            } catch (ex) {
                                log.error('tried to set line field ' + lineProp, oppObj.lines[line][lineProp]);
                                var tempArrofErrdOpp = JSON.parse(sessionObj.get({ name: 'arrofErrdOpp' }));
                                sessionObj.set({
                                    name: 'arrofErrdOpp',
                                    value: JSON.stringify(tempArrofErrdOpp.push({ parentOppId: opportunityId, errorMessage: ex.message })),
                                });
                                errorString = errorString ? errorString + '\n' + ex.message : ex.message;
                            }
                        }
                    }
                    try {
                        newOpp.commitLine({
                            sublistId: 'item',
                        });
                    } catch(e) {
                        // https://issues.corp.rapid7.com/browse/APPS-20524
                        // Tax code is not being set when Netherlands is the ship to - forcing a value to allow saves
                        // Inside a try-catch, so we only add tax code to lines that need it.
                        if(e.message.indexOf('Tax Code') !== -1) {
                            newOpp.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                value: 2051,
                            });
                            newOpp.commitLine({
                                sublistId: 'item',
                            });
                        }
                    }
                } else if (inGroup && itemId != 0) {
                    newOpp.selectLine({
                        sublistId: 'item',
                        line: line,
                    });
                    for (var lineProp in oppObj.lines[line]) {
                        if (!oppObj.lines[line]['amount']) {
                            oppObj.lines[line]['amount'] = 0;
                        }
                        if ((oppObj.lines[line][lineProp] || oppObj.lines[line][lineProp] === 0) && lineProp != 'item') {
                            try {
                                newOpp.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: lineProp,
                                    value: oppObj.lines[line][lineProp],
                                });
                            } catch (ex) {
                                log.error('tried to set line field ' + lineProp, oppObj.lines[line][lineProp]);
                                var tempArrofErrdOpp = JSON.parse(sessionObj.get({ name: 'arrofErrdOpp' }));
                                sessionObj.set({
                                    name: 'arrofErrdOpp',
                                    value: JSON.stringify(tempArrofErrdOpp.push({ parentOppId: opportunityId, errorMessage: ex.message })),
                                });
                                errorString = errorString ? errorString + '\n' + ex.message : ex.message;
                            }
                        }
                    }
                    newOpp.commitLine({
                        sublistId: 'item',
                    });
                }
            }
            //fix for APPS-18913 - The subsidiary R7 Intl had a new nexus added, which when adding address
            //info to a record, causes previous set fields to be deleted; so this readds those missing fields..
            errorString = setHeaders(oppObj, newOpp, sessionObj, opportunityId, errorString);
            var newOppid = newOpp.save();

            record.submitFields({
                type: record.Type.OPPORTUNITY,
                id: opportunityId,
                values: { custbodyr7_opp_move_error: errorString },
            });

            log.audit('new opp is created from ' + opportunityId, newOppid);
            if (newOppid) {
                sessionObj.set({
                    name: 'countOfCreated',
                    value: (Number(sessionObj.get({ name: 'countOfCreated' })) + 1).toString(),
                });
                updateOldOpp(opportunityId, newOppid);
            }
            return newOppid;
        } catch (ex) {
            log.error('Error in copy copyAndModifyOpp', ex);
            sessionObj.set({
                name: 'countOfFailed',
                value: (Number(sessionObj.get({ name: 'countOfFailed' })) + 1).toString(),
            });
            sessionObj.set({
                name: 'arrofFaildOpp',
                value: JSON.stringify(
                    JSON.parse(sessionObj.get({ name: 'arrofFaildOpp' })).push({ parentOppId: opportunityId, errorMessage: ex.message })
                ),
            });
            errorString = errorString ? errorString + '\n' + ex.message : ex.message;
            record.submitFields({
                type: record.Type.OPPORTUNITY,
                id: opportunityId,
                values: { custbodyr7_opp_move_error: errorString },
            });

        }
    }

    function setHeaders(oppObj, newOpp, sessionObj, opportunityId, errorString) {
        for (var headerProp in oppObj.header) {
            if (typeof oppObj.header[headerProp] === 'string' && oppObj.header[headerProp].substr(0, 4) == 'http') {
                oppObj.header[headerProp] = encodeURI(oppObj.header[headerProp]);
            }
            if (oppObj.header[headerProp] && headerProp != 'customform' && oppObj.header[headerProp] !== []) {
                try {
                    var oppObjVal = oppObj.header.hasOwnProperty(headerProp) ? oppObj.header[headerProp] : null;
                    var beforeVal = newOpp.getValue(headerProp);
                    if(oppObjVal != beforeVal) {
                        newOpp.setValue({
                            fieldId: headerProp,
                            value: oppObjVal,
                        });
                    }
                } catch (ex) {
                    log.error('tried to set field ' + headerProp, oppObj.header[headerProp]);
                    var tempArrofErrdOpp = JSON.parse(sessionObj.get({name: 'arrofErrdOpp'}));
                    sessionObj.set({
                        name: 'arrofErrdOpp',
                        value: JSON.stringify(tempArrofErrdOpp.push({
                            parentOppId: opportunityId,
                            errorMessage: ex.message
                        })),
                    });
                    errorString = errorString ? errorString + '\n' + ex.message : ex.message;
                }
            }
        }
        return errorString;
    }

    function validateOppFields(oppObj) {
        checkAndUpdateEmployeProp(oppObj, 'salesrep', 'custscriptr7_default_salesrep');
        checkAndUpdateEmployeProp(oppObj, 'custbodyr7trancreatedby', 'custscript_r7_default_salesrep');
        checkAndUpdateEmployeProp(oppObj, 'custbodyr7presalesopprep', 'custscript_r7_default_presalesrep');
        checkAndUpdateEmployeProp(oppObj, 'custbodyr7idrrep', 'custscript_r7_default_presalesrep');
        if (oppObj['header']['entitystatus'] == 14) {
            oppObj['header']['entitystatus'] = 101;
        }
    }

    function checkAndUpdateEmployeProp(oppObj, propertyName, parameterName) {
        if (oppObj['header'][propertyName]) {
            var salesRepId = oppObj['header'][propertyName];
            log.debug('checking if employee is inactive for field ' + propertyName, salesRepId);
            var defaultEmployee = runtime.getCurrentScript().getParameter({
                name: parameterName,
            });
            var salesRepIsInactive = search.lookupFields({
                type: record.Type.EMPLOYEE,
                id: salesRepId,
                columns: ['isinactive'],
            });
            log.debug('salesRepIsInactive', salesRepIsInactive);
            if (salesRepIsInactive.isinactive) {
                log.debug('employee is inactive, changing to dafault');
                oppObj['header'][propertyName] = defaultEmployee;
            }
        }
    }

    function updateOldOpp(opportunityId, newOppId) {
        record.submitFields({
            type: record.Type.OPPORTUNITY,
            id: opportunityId,
            values: {
                entitystatus: 101,
                custbodycopiedtor7intl: true,
                custbodyr7copyofoppnumber: newOppId,
            },
        });
    }

    function getOldOppFields(opportunityId, oldOpp) {
        oppObj = {
            header: {},
            addressInfo: {
                billing: {},
                shiping: {},
            },
            lines: [],
        };
        for (var headerProp in oppObjectFileds.header) {
            oppObj['header'][oppObjectFileds.header[headerProp]] = oldOpp.getValue(oppObjectFileds.header[headerProp]);
        }

        oppObj['header']['subsidiary'] = 10;
        oppObj['header']['custbodycopiedfromllc'] = true;
        oppObj['header']['custbodyr7copyofoppnumber'] = opportunityId;
        oppObj['header']['custbodyr7createfromoppcreateddate'] = oldOpp.getValue('trandate');

        // getting old Opp Address info
        function collectAddressInfo(prop) {
            Object.getOwnPropertyNames(oppObjectFileds.addressInfo[prop]).forEach(function (key) {
                oppObj['addressInfo'][prop][key] = oldOpp.getValue(key);
            });
        }
        collectAddressInfo('billing');
        collectAddressInfo('shiping');

        for (var oppLine = 0; oppLine < oldOpp.getLineCount('item'); oppLine++) {
            oppObj['lines'].push({});
            for (var lineProp in oppObjectFileds.line) {
                try {
                    oppObj['lines'][oppLine][oppObjectFileds.line[lineProp]] = oldOpp.getSublistValue({
                        sublistId: 'item',
                        fieldId: oppObjectFileds.line[lineProp],
                        line: oppLine,
                    });
                } catch (ex) {
                    log.error('error in header set field', ex);
                }
            }
            oppObj['lines'][oppLine]['location'] = 29;
        }
        return oppObj;
    }

    var oppObjectFileds = {
        // order matters in some cases (sensitive fields are moved to the bottom of the list to avoid loss of values)
        header: [
            'customform',
            'entity',
            'subsidiary',
            'department',
            'actionitem',
            'altsalesrangehigh',
            'altsalesrangelow',
            'altsalestotal',
            'balance',
            'buyingreason',
            'buyingtimeframe',
            'class',
            'consolidatebalance',
            'currency',
            'currencyname',
            'currencysymbol',
            'documentstatus' /*'entitynexus'*/,
            'entitystatus',
            'entitytaxregnum',
            'estgrossprofit',
            'estgrossprofitpercent',
            'estimatedbudget',
            'exchangerate',
            'expectedclosedate',
            'externalid',
            'forecasttype',
            'isbasecurrency',
            'isbudgetapproved',
            'job',
            'leadsource',
            'memo',
            //'nexus',
            'onetime',
            'probability',
            'projaltsalesamt',
            'projectedtotal',
            'rangehigh',
            'rangelow',
            'recurannually',
            'recurmonthly',
            'recurquarterly',
            'recurweekly',
            'salesgroup',
            'salesreadiness',
            'source',
            'status',
            'statusRef',
            'subsidiarytaxregnum',
            'syncpartnerteams',
            'syncsalesteams',
            'taxdetailsoverride',
            'taxregoverride',
            'title',
            'total',
            'totalcostestimate',
            'unbilledorders',
            'weightedtotal',
            'winlossreason',
            'custbodyr7opportunitysupportcases',
            'custbodyr7opportunityissues',
            'custbodyr7verballyconfirmed',
            'custbodyr7custcareoppconfirmedby',
            'custbodyr7transactionrenewalopp',
            'custbodyr7opprenewalcontact',
            'custbodyr7accountmanagementworkflow',
            'custbodyr7storeddateoffirstsale',
            'custbodyr7opprenewalbuyers',
            'custbodyr7opprenewalrecommenders',
            'custbodyr7opprenewaltesters',
            'custbodyr7tranwinlossreason',
            'custbodyr7escalation',
            'custbodyr7escalationtype',
            'custbodyr7escalationteam',
            'custbodyr7oppinitialyearmultideal',
            'custbodyr7contractautomationrecs',
            'custbodyr7oppatrisknextsteps',
            'custbodyr7oppcustcareprogramgoals',
            'custbodyr7oppcustcareintegrations',
            'custbodyr7oppcustcarefiscalyearend',
            'custbodyr7oppcustcareamterritory',
            'custbody_prod_view',
            'custbodyr7salesrepmismatch',
            'custbodyr7includeinrenewalforecast',
            'custbodyr7oppwinlossdescription',
            'custbodyr7oppdatestage04',
            'custbodyr7oppdatestage05',
            'custbodyr7oppdatestage06',
            'custbodyr7dateinternalreporting',
            'custbodyr7billingresponsibleparty',
            'custbodyr7oppdistributor',
            'custbodyr7partnerdealtype',
            'custbodyr7opppartnerrep',
            'custbodyr7opppartnerrepemail',
            'custbodyr7opportunitymarketingassist',
            'custbodyr7revenueterritory',
            'custbodyr7nonrevenuesalesreps',
            'custbodyr7salesrepmanagerhistorical',
            'custbodyr7salesrepterritoryhistorical',
            'custbodyr7opportunitytype',
            'custbodyr7oppwinner',
            'custbodyr7oppwinlosscategory',
            'custbodyr7transleadsourcecategory',
            'custbodyr7opprenewalautomationcreated',
            'custbodyr7opprarequiresmanualreview',
            'custbodyr7oppinterestedparties',
            'custbodyr7oppcreateevent',
            'custbodyr7credithold',
            'custbodyr7oppbasecurrencytotal',
            'custbodyr7categorypurchased',
            'custbodyr7statussalesselected',
            'custbodyr7salesterritoryhistoricalcust',
            'custbodyr7amountrenewalcoterm',
            'custbodyr7amountrenewalmultiyr',
            'custbodyr7renewaltotalamount',
            'custbodyr7opportunitymarketodonotsync',
            'custbodyr7ratefieldpopulated',
            'custbody_ava_billtousecode',
            'custbody_ava_shipto_latitude',
            'custbody_ava_shiptousecode',
            'custbody_ava_billto_latitude',
            'custbody_ava_billto_longitude',
            'custbody_ava_shipto_longitude',
            'custbodyr7originatingtask',
            'custbodyr7oppqpr',
            'custbodyr7oppexpectedclosedateamadjust',
            'custbodyr7oppincludeinforecast',
            'custbodyr7opptechnicallyrecommended',
            'custbodyr7oppcurrency',
            'custbodyr7oppmeddicmmetrics',
            'custbodyr7opptechrecindicator',
            'custbodyr7opportunityqualificationdate',
            'custbodyr7oppbdrcreatedopportunity',
            'custbodyr7oemtransaction',
            'custbodyr7opp_rejected',
            'custbodyr7terminationreason',
            'custbodyr7terminationdetail',
            'custbodyr7amquoted',
            'custbodyr7customerregion',
            'custbodyr7marketinginfluenced',
            'custbodyr7assist',
            'custbodyr7_calculate_acv',
            'custbodyr7erosionreason',
            'custbodyr7erosioncomments',
            'custbodyr7csminvolvement',
            'custbodyr7opplogentriessalesrep',
            'custbodyr7renewalacvtotal',
            'custbodyr7opportunityoffering',
            'custbodyr7opportunityincumbent',
            'custbodyr7opportunityotherincumbent',
            'custbodyr7opportunitycompetitor',
            'custbodyr7opportunitycompetitorsolutio',
            'custbodyr7opportunityothercompetitor',
            'custbodyr7opportunityothercompsolution',
            'custbodyr7opportunitywinlossreason1',
            'custbodyr7opportunitywinlossubreason1',
            'custbodyr7oppwinlossreason2',
            'custbodyr7oppwinlosssubreason2',
            'custbodyr7oppwinlossreason3',
            'custbodyr7oppwinlosssubreason3',
            'custbodyr7opptaskthatcreatedopp',
            'custbodyr7idrrep',
            'custbodyr7oppincludeinmvmforecast',
            'custbodyr7oppcreatedbyaeroletype',
            'custbodyr7proposals_sow_link',
            'custbodyr7presalesenvironment',
            'custbodyr7sipdate',
            'custbodyr7presalesneed',
            'custbodyr7presalesevaluationcriteria',
            'custbodyr7presalesevaluationprocess',
            'custbodyr7oppevalclosedate',
            'custbodyr7presalesopppriority',
            'custbodyr7opprecommendationdate',
            'custbodyr7presalesoppstatus',
            'custbodyr7presalesoppnotes',
            'custbodyr7presalesoppatrisk',
            'custbodyr7presalesopprep',
            'custbodyr7opppresalesnextplay',
            'custbodyr7customdeployment',
            'custbodyr7oppnumberofremotenetworks',
            'custbodyr7osplatform',
            'custbodyr7dbplatform',
            'custbodyr7othertechnicalrequirements',
            'custbodyr7oppspresalesredflags',
            'custbodyr7oppevalclosereason',
            'custbodyr7currentsiemsolution',
            'custbodyr7presalesuserinsightcontact',
            'custbodycustr7oppuipocstatus',
            'custbodyr7uipocnots',
            'custbodyr7appspiderpocstatus',
            'custbodyr7appspiderpocnotes',
            'custbodyr7appspiderse',
            'custbodyr7userinsightse',
            'custbodyr7externalips',
            'custbodyr7internalips',
            'custbodyr7opportunitybudget',
            'custbodyr7decisionmakingprocess',
            'custbodyr7timeline',
            'custbodyr7poprocess',
            'custbodyr7need',
            'custbodyr7salesoppapprovedproject',
            'custbodyr7oppcurrententerprisescanner',
            'custbodyr7oppcurrentexternalscanner',
            'custbodyr7oppcurrentwebscanner',
            'custbodyr7oppissueswithcurrentsolution',
            'custbodyr7discussedprojectwithbuyer',
            'custbodyr7oppneedforproductservice',
            'custbodyr7currententerprisescannerdate',
            'custbodyr7currentexternalscannerdate',
            'custbodyr7oppcurrentwebscannerrenewal',
            'custbodyr7oppcurrentpenetrationtest',
            'custbodyr7oppcurrentpenetrationrenewal',
            'custbodyr7oppsolutioninplaceby',
            'custbodyr7oppbuyers',
            'custbodyr7oppsspoketobuyers',
            'custbodyr7opptesters',
            'custbodyr7oppsspoketotesters',
            'custbodyr7oppcoacheshelp',
            'custbodyr7opprecommenders',
            'custbodyr7opportunityevaluating',
            'custbodyr7oppnextsteps',
            'custbodyr7oppcurrentdbscanner',
            'custbodyr7oppcurrentdbscannerrenewal',
            'custbodyr7oppvulnerabilitymgmntprog',
            'custbodyr7oppsubjecttopcicompliance',
            'custbodyr7oppsubjecttofisma',
            'custbodyr7oppsubjecttonerc',
            'custbodyr7recommenderlastcalldate',
            'custbodyr7buyerlastcalldate',
            'custbodyr7testerlastcalldates',
            'custbodyr7oppbusinesspain',
            'custbodyr7opptechnicalpain',
            'custbodyr7oppdesiredpbos',
            'custbodyr7opptechnicalcriteria',
            'custbodyr7oppfinancialcriteria',
            'custbodyr7oppvendorcriteria',
            'custbodyr7oppmetrics',
            'custbodyr7oppdecisionprocess',
            'custbodyr7minimumrequiredcapabilities',
            'custbodyr7oppchampion',
            'custbodyr7oppeconomicbuyer',
            'custbodyr7oppcompetitionchampion',
            'custbodyr7coveredopp',
            'custbodyr7oppconsequenceofnodecision',
            'custbodyr7oppmetasploitnumberofusers',
            'custbodyr7oppmanagercomments',
            'custbodyr7oppvisibilityintoapprovalpro',
            'custbodyr7oppsspoketorecommenders',
            'custbodyr7oppcustcarebudgetconfirmed',
            'custbodyr7opprapid7track',
            'custbodyr7oppmeddiceeconomicbuyer',
            'custbodyr7oppmeddicddecisioncriteria',
            'custbodyr7oppmeddicddecisionprocess',
            'custbodyr7oppmeddiciiidentifypain',
            'custbodyr7oppmeddiccchampion',
            'custbodyr7oppuidevinvolvement',
            'custbodyr7appspidertechrec',
            'custbodyr7trancreatedby',
            'custbodyr7trancreatedbydept',
            'custbodyr7opporiginatingleadsource',
            'custbodyr7_renewalautomation_error',
            'custbodyr7radoublefix_opp',
            'custbodyr7acvtotalamount',
            'custbody_r7_arm_item_update_date',
            'custbody_arm_item_replace_error',
            'custbodyr7salesrepold',
            'custbodyr7salesregionhistorical',
            'custbodyr7proddata_opptotal',
            'custbodyr7categorypurch_lastchecked',
            'custbodyr7opplegalinvolvement',
            'custbodyr7opplegalnotes',
            'custbodycustbodyr7oppdiscoverydate',
            'custbodycopiedfromllc',
            'custbodyr7copiedopplogo',
            'custbodyr7createfromoppcreateddate',
            'custbodyr7copyofoppnumber',
            'custbodyr7_renewal_forecast_type',
            'custbodyr7auto_renewal_opp',
            'custbodyr7_item_replacement_date',
            'custbody_r7_total_exp_cash_arr',
            'custbody_r7_total_arr',
            'custbody_r7_total_arr_usd',
            'custbodyr7upliftpercentage',
            'custbodyr7baselineuplift',
            'salesrep',
            'partner',
        ],
        addressInfo: {
            billing: {
                billaddresslist: null,
                // removed since leads to unexpected addresses setup. if no pickvalue provided => sets default address to opp
                // 'billaddress': null,
                // 'billingaddress': null,
                // 'billisresidential': null,
            },
            shiping: {
                shipaddresslist: null,
                // removed since leads to unexpected addresses setup. if no pickvalue provided => sets default address to opp
                // 'shipaddress': null,
                // 'shippingaddress': null,
                // 'shipisresidential': null,
                // 'shipoverride': null,
            },
        },
        line: [
            'item',
            'price',
            'rate',
            'altsalesamt',
            'billingschedule',
            'billvariancestatus',
            'catchupperiod',
            'class',
            'costestimate',
            'costestimaterate',
            'costestimatetype',
            'daysbeforeexpiration',
            'deferrevrec',
            'department',
            'description',
            'expectedshipdate',
            'fromjob',
            'grossamt',
            'isestimate',
            'istaxable',
            'isvsoebundle',
            'job',
            'matrixtype',
            'options',
            'printitems',
            'quantity',
            'rateschedule',
            'subscription',
            'tax1amt',
            'taxcode',
            'taxrate1',
            'units',
            'amount',
            'custcolr7amountdiscountinline',
            'custcolr7opamountrenewalbaseline',
            'custcolr7opamountrenewalcotermline',
            'custcolr7opamountrenewalmultiyearline',
            'custcolr7_category_purchased_expire',
            'custcolr7_category_purchased_lock',
            'custcolr7_category_purchased',
            'custcolr7renewedfromlineid',
            'custcolr7contractrenewal',
            'custcolr7createdfromra',
            'custcolr7createdfromra_lineid',
            'custcolr7enddate',
            'custcol_ava_incomeaccount',
            'custcolr7iscotermline',
            'custcolr7translinecontact',
            'custcolr7itemmsproductkey',
            'custcol_ava_item',
            'custcolr7itemcategorypurchased',
            'custcol_item_category',
            'custcolr7itemrateprediscount',
            'custcolr7translicenselink',
            'custcolr7translicenseid',
            'custcolr7_monthlydatalimit_gb',
            'custcolr7acvamount',
            'custcolr7acvenddate',
            'custcolr7acvstartdate',
            'custcolr7opamtrenewbasetermdaysline',
            'custcol_ava_shiptousecode',
            'custcol_ava_shipto_latitude',
            'custcol_ava_shipto_longitude',
            'custcolr7startdate',
            'custcol_ava_taxcodemapping',
            'custcol_ava_udf1',
            'custcol_ava_udf2',
            'custcol_r7uniquerevenuegrouping',
            'custcol_ava_upccode',
            'custcol_r7_expected_arr',
        ],
    };

    function isEmpty(value) {
        return value === '' || value === ' ' || value === null || value === undefined;
    }

    return {
        createNewOpp: createNewOpp,
    };
});