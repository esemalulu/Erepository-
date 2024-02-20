/**
 * Allow end user handling of dealer groups
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/ui/serverWidget'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{serverWidget} serverWidget
     */
    (record, search, serverWidget) => {

        var form;

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            var logTitle = 'onRequest';
            var request = scriptContext.request;
            var groupId = request.parameters.group_id;
            log.audit(logTitle, 'Dealer Group: ' + groupId);


            if (request.method == 'GET') {

                // Create Form
                form = serverWidget.createForm({
                    title: 'Dealer Group'
                });
                form.addSubmitButton({});
                form.clientScriptModulePath = './KLC_GD_DealerGroups_CS.js';

                // Header Fields
                addHeaderFields(groupId);

                // Sublist
                var sublist = addSublist();

                // Set Sublist Values
                if (groupId) {
                    setSublist(sublist, groupId);
                }

                // Complete Form
                scriptContext.response.writePage({
                    pageObject: form
                });
            } else {
                // POST - update Group Members
                // get list of Group Members from Suitelet

                if (groupId) {
                    var memberCount = request.getLineCount('sublist');
                    var memberArr = [];
                    log.debug(logTitle, 'POST Group ID: ' + groupId);

                    for (var i = 0; i < memberCount; i++) {

                        var member = request.getSublistValue({
                            group: 'sublist',
                            name: 'member',
                            line: i
                        });
                        memberArr.push(member);
                    }

                    // Update Group
                    updateGroup(memberArr, groupId);

                }
                // redirect to Suitelet
                scriptContext.response.sendRedirect({
                    identifier: 'customscript_klc_gd_dealer_groups_sl',
                    type: 'SUITELET',
                    id: 'customdeploy_klc_gd_dealer_groups_sl'
                });
            }

        }

        function addHeaderFields(groupId) {

            // Add Header Fields
            var groupIdFld = form.addField({
                id: 'group_id',
                label: 'Dealer Group',
                type: serverWidget.FieldType.SELECT,
                source: '-8'
            });

            // Field Defaults
            if (groupId) groupIdFld.defaultValue = groupId;

        }

        function addSublist() {

            // Add Sublist
            var sublist = form.addSublist({
                id: 'sublist',
                label: 'Group Members',
                type: serverWidget.SublistType.INLINEEDITOR
            });
            sublist.addField({
                id: 'member',
                label: 'Name',
                type: serverWidget.FieldType.SELECT,
                source: 'customer'
            });

            return sublist;

        }

        function setSublist(sublist, groupId) {

            // Set Sublist
            var logTitle = 'setSublist';
            var line = 0;

            // Search for group members
            var entitygroupSearchObj = search.create({
                type: "entitygroup",
                filters:
                    [
                        ["internalid", "anyof", groupId],
                        "AND",
                        ["groupmember.isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "groupMember"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "groupMember",
                            sort: search.Sort.ASC,
                        })
                    ]
            });
            entitygroupSearchObj.run().each(function (result) {

                var groupMember = result.getValue({
                    name: "internalid",
                    join: "groupMember"
                });
                log.debug(logTitle, 'Group Member: ' + groupMember);

                sublist.setSublistValue({
                    id: 'member',
                    line: line,
                    value: groupMember
                });
                line++;
                return true;
            });

        }

        function updateGroup(memberArr, groupId) {

            // Load Group
            var logTitle = 'updateGroup'
            var groupRec = record.load({
                type: 'entitygroup',
                id: groupId
            });
            var grpMemberCount = groupRec.getLineCount('groupmembers');
            log.audit(logTitle, 'Group Members: ' + JSON.stringify(memberArr));

            for (var i = 0; i < grpMemberCount; i++) {
                // for each Group Member
                var grpMember = groupRec.getSublistValue({
                    sublistId: 'groupmembers',
                    fieldId: 'memberkey',
                    line: i
                });
                grpMember = grpMember.toString();
                var memberIndex = memberArr.indexOf(grpMember);
                log.debug(logTitle, 'Group Member: ' + grpMember);
                log.debug(logTitle, 'Group Member Index: ' + memberIndex);

                if (memberIndex < 0) {
                    // If not in array, remove member
                    record.detach({
                        record: {
                            type: 'customer',
                            id: grpMember
                        },
                        from: {
                            type: 'entitygroup',
                            id: groupId
                        }
                    });
                    // Update Dealwr
                    record.submitFields({
                        type: record.Type.CUSTOMER,
                        id: grpMember,
                        values: {
                            custentitygd_dealergroup: null,
                            custentitygd_reportingdealergrp: null
                        }
                    });
                    log.debug(logTitle, 'Removed Group Member: ' + grpMember);
                } else {
                    // If in array, remove from array
                    memberArr.splice(memberIndex, 1);
                    log.debug(logTitle, 'No Change Group Member: ' + grpMember);
                }
            }

            // Add any members remaining in array
            for (var j in memberArr) {
                log.debug(logTitle, 'Add Group Member: ' + memberArr[j]);
                record.attach({
                    record: {
                        type: 'customer',
                        id: memberArr[j]
                    },
                    to: {
                        type: 'entitygroup',
                        id: groupId
                    }
                });

                // Update Dealwr
                record.submitFields({
                    type: record.Type.CUSTOMER,
                    id: memberArr[j],
                    values: {
                        custentitygd_dealergroup: groupId,
                        custentitygd_reportingdealergrp: groupId
                    }
                });
            }

            log.audit(logTitle, 'Updated Group ID: ' + groupId);

        }

        return {onRequest}

    });
