/**
 * @NApiVersion 2.x
 */

/**
 * Copyright (c) 2019 Trajectory Inc.
 * 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: TJI NetSuite Library 2
 * @Module: COMMON
 * @Version: 1.0.60
 * @Company: Trajectory Inc.
 * @CreationDate: 20170707
 * @FileName: TJINC_NS_Library_SS2.js
 * @NamingStandard: TJINC_NSJ-2-0-0
 */
define([], function () {
    var b_activeLog = false;
    var s_version = '1.0.60';
    var s_userAgentFireWin = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0';
    var s_userAgentFireMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:66.0) Gecko/20100101 Firefox/66.0';
    var s_userAgentChroMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36';

    return {
        addDays: function (date, days) {
            var result = new Date(date);
            result.setDate(result.getDate() + Number(days));
            return result;
        },

      //Added 12/23/2021 - Elijah Semalulu - "Need By Date" on PO Line Items needs to be in incremented by ONLY business days
        addBusinessDays: function (baseDate, daysToAdd) {
          var newDate = new Date(baseDate);
          var bussDayCounter = 0;
          while(bussDayCounter < daysToAdd )
          {
            newDate.setDate(newDate.getDate() + 1);
            if ( newDate.getDay() == 0 ) {
              newDate.setDate(newDate.getDate() + 1);
            } else if ( newDate.getDay() == 6 ) {
              newDate.setDate(newDate.getDate() + 2);
            }
            bussDayCounter++;
          }
          return newDate;
        },

        addMonths: function (date, m) {
            var d = new Date(date);  // Clone
            var years = Math.floor(m / 12);
            var months = m - (years * 12);
            if (years) d.setFullYear(d.getFullYear() + years);
            if (months) d.setMonth(d.getMonth() + months);
            return d;
        },

        alert: function (msg, title) {
            if (title === undefined || !title) {
                title = '';
            }
            Ext.Msg.alert(title, msg);
        },

        date2str: function (format, date) {
            return format.format({ value: date, type: format.Type.DATE });
        },

        dateDiff_inDays: function (d1, d2) {
            var t2 = d2.getTime();
            var t1 = d1.getTime();

            return Math.ceil((t2 - t1) / (24 * 3600 * 1000));
        },

        dateDiff_inWeeks: function (d1, d2) {
            var t2 = d2.getTime();
            var t1 = d1.getTime();

            return Math.ceil((t2 - t1) / (24 * 3600 * 1000 * 7));
        },

        dateDiff_inMonths: function (d1, d2) {
            var d1Y = d1.getFullYear();
            var d2Y = d2.getFullYear();
            var d1M = d1.getMonth();
            var d2M = d2.getMonth();

            return (d2M + 12 * d2Y) - (d1M + 12 * d1Y);
        },

        dateDiff_inYears: function (d1, d2) {
            return d2.getFullYear() - d1.getFullYear();
        },

        disableFields: function (o_data) {
            var i;
            var i_line;
            var o_field;
            var b_value;
            var b_clean;
            var o_rec = o_data.recordId;
            var a_field = o_data.fieldId;
            var s_sublist = o_data.sublistId;

            if (o_data.isDisabled === undefined) {
                b_value = true;
            } else {
                b_value = o_data.isDisabled;
            }

            if (o_data.isCleaned === undefined) {
                b_clean = false;
            } else {
                b_clean = o_data.isCleaned;
            }

            if (s_sublist) {
                if (o_data.line === undefined) {
                    i_line = true;
                } else {
                    i_line = o_data.line;
                }

                for (i = 0; i < a_field.length; i++) {
                    o_field = o_rec.getSublistField({ sublistId: s_sublist, fieldId: a_field[i], line: i_line });
                    if (o_field) {
                        o_field.isDisabled = b_value;

                        if (b_clean && b_value) {
                            o_rec.setCurrentSublistValue({ sublistId: s_sublist, fieldId: a_field[i], value: '', ignoreFieldChange: true });
                        }
                    }
                }

            } else {
                for (i = 0; i < a_field.length; i++) {
                    o_field = o_rec.getField({ fieldId: a_field[i] });
                    if (o_field) {
                        o_field.isDisabled = b_value;

                        if (b_clean && b_value) {
                            o_rec.setValue({ fieldId: a_field[i], value: '', ignoreFieldChange: true });
                        }
                    }
                }
            }
        },

        getActiveLog: function () {
            return b_activeLog;
        },

        getBoolValue: function (b_value) {
            if (b_value === true || b_value === 'T') {
                return true;
            } else {
                return false;
            }
        },

        getCountries: function (file) {
            var o_file = file.load({ id: '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/json/TJINC_Country.js' });
            if (o_file) {
                return JSON.parse(o_file.getContents());
            } else {
                return [];
            }
        },

        getErrorMsg: function (errorObj) {
            if (errorObj == '[object nlobjError]') {
                return errorObj.getDetails() + errorObj.getStackTrace();
            } else if (errorObj == '[object Object]') {
                return errorObj.message;
            } else {
                return errorObj;
            }
        },

        getIndex: function (o_rec, s_list, s_field, value, i_idx) {
            var i_line;
            var i_first;
            var s_new = value.toString();
            var i_count = o_rec.getLineCount(s_list);

            if (i_idx) {
                i_first = i_idx;
            } else {
                i_first = 0;
            }

            if (o_rec.isdynamic) {
                for (i_line = i_first; i_line < i_count; i_line++) {
                    o_rec.selectLine({ sublistId: s_list, line: i_line });
                    if (o_rec.getCurrentSublistValue({ sublistId: s_list, fieldId: s_field }).toString() === s_new) {
                        return i_line;
                    }
                }

            } else {
                for (i_line = i_first; i_line < i_count; i_line++) {
                    if (o_rec.getSublistValue({ sublistId: s_list, fieldId: s_field, line: i_line }).toString() === s_new) {
                        return i_line;
                    }
                }
            }
            return -1;
        },

        getItemRecordType: function (s_itemType) {
            var s_recordType;
            // Compare item type to its record type counterpart
            switch (s_itemType.toLowerCase()) {
                case 'assembly':
                    s_recordType = 'assemblyitem';
                    break;

                case 'giftcert':
                    s_recordType = 'giftcertificateitem';
                    break;

                case 'invtpart':
                    s_recordType = 'inventoryitem';
                    break;

                case 'kit':
                    s_recordType = 'kititem';
                    break;

                case 'noninvtpart':
                    s_recordType = 'noninventoryitem';
                    break;

                case 'service':
                    s_recordType = 'serviceitem';
                    break;
            }
            return s_recordType;
        },

        getStyle: function (style, selector) {
            var o_rule;
            var o_sheet;
            var a_sheets = document.styleSheets;
            for (var i = 0, l = a_sheets.length; i < l; i++) {
                o_sheet = a_sheets[i];
                if (!o_sheet.cssRules) { continue; }
                for (var j = 0, k = o_sheet.cssRules.length; j < k; j++) {
                    o_rule = o_sheet.cssRules[j];
                    if (o_rule.selectorText && o_rule.selectorText.split(',').indexOf(selector) !== -1) {
                        return o_rule.style[style];
                    }
                }
            }
            return null;
        },

        getVersion: function () {
            return s_version;
        },

        hide: function (jQuery, objId) {
            jQuery('#' + objId).hide();
        },

        isOnJSON: function (s_json, key, value) {
            var b_found = false;
            if (s_json) {
                var o_json = JSON.parse(s_json);
                if (o_json) {
                    for (var i = 0; i < o_json.length; i++) {
                        if (o_json[i][key] === value) {
                            b_found = true;
                            i = o_json.length;
                        }
                    }
                }
            }
            return b_found;
        },

        isProduction: function (runtime) {
            return (runtime.accountId.indexOf('_') === -1);
        },

        log: function (s_title, s_details) {
            if (b_activeLog) {
                if (s_details === null) {
                    s_details = '';
                }

                if (typeof navigator === 'undefined') {
                    log.debug(s_title, s_details);

                } else {
                    switch (navigator.userAgent) {
                        case s_userAgentFireMac:
                        case s_userAgentChroMac:
                        case s_userAgentFireWin:
                            console.log(s_title + ' - ' + s_details);
                            break;
                        default:
                            log.debug(s_title, s_details);
                    }
                }
            }
        },

        // Inserts HTML line breaks before all newlines in a string
        nl2br: function (s_str, b_isXhtml) {
            var breakTag = (b_isXhtml || typeof b_isXhtml === 'undefined') ? '<br />' : '<br>';
            return (s_str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
        },

        searchAll: function (o_data) {
            if (o_data.total === undefined) {
                o_data.total = 0;
            }

            var i_size = 1000;
            var o_total = [];
            var i_min = 0;

            if (o_data.total && o_data.total < i_size) {
                i_size = o_data.total;
            }

            var i_max = i_size;
            var o_search = o_data.search;
            var o_result = o_search.runPaged({ pageSize: i_size });
            var i_pages = parseInt(o_result.count / i_size);

            while (i_pages-- >= 0) {
                o_result = o_search.run().getRange(i_min, i_max);
                o_total = o_total.concat(o_result);
                i_min = i_max;
                i_max += i_size;

                if (o_data.total && o_data.total < i_max) {
                    i_max = o_data.total;
                }
            }
            return o_total;
        },

        setActiveLog: function (b_active) {
            b_activeLog = b_active;
        },

        setCurrentSublistValue: function (o_rec, s_sublist, a_field, a_value) {
            for (var i = 0; i < a_field.length; i++) {
                o_rec.setCurrentSublistValue({ sublistId: s_sublist, fieldId: a_field[i], value: a_value[i] });
            }
            return o_rec;
        },

        toTitle: function (s_str) {
            return s_str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
        },

        trim: function (s_stringToTrim) {
            if (s_stringToTrim === null) {
                return s_stringToTrim;
            }
            return s_stringToTrim.toString().replace(/^\s+|\s+$/g, '');
        },

        valEmail: function (email) {  // W3C
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        }
    };
});