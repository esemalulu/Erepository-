/**
 * Allow end user handling of pcn groups
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

        var form, pcnGroupIdFld;

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

            if (request.method == 'GET') {

                // Get Parameters
                var location = request.parameters.location;
                var group = request.parameters.group;
                log.audit(logTitle, 'Location: ' + location + ' | Group: ' + group);

                // Create Form
                form = serverWidget.createForm({
                    title: 'PCN Groups'
                });
                form.addSubmitButton({});
                form.clientScriptModulePath = './KLC_GD_PCNgroups_CS.js';

                // Header Fields
                addHeaderFields(location, group);

                // Sublist
                var sublist = addSublist();

                // Set Sublist Values
                if (location && group) {
                    var groupId = getGroupID(location, group);
                    if (groupId) {
                        setSublist(sublist, groupId);
                        pcnGroupIdFld.defaultValue = groupId;
                    }
                }

                // Complete Form
                scriptContext.response.writePage({
                    pageObject: form
                });
            } else {
                // POST - update Group Members
                // get list of Group Members from Suitelet
                var groupId = request.parameters.group_id;
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
                    identifier: 'customscript_klc_gd_pcn_groups_sl',
                    type: 'SUITELET',
                    id: 'customdeploy_klc_gd_pcn_groups_sl'
                });
            }

        }

        function addHeaderFields(location, group) {

            // Add Header Fields
            var locationFld = form.addField({
                id: 'location',
                label: 'Location',
                type: serverWidget.FieldType.SELECT,
                source: 'location'
            });
            var pcnGroupFld = form.addField({
                id: 'group',
                label: 'PCN Group',
                type: serverWidget.FieldType.SELECT
            });
            pcnGroupIdFld = form.addField({
                id: 'group_id',
                label: 'PCN Group ID',
                type: serverWidget.FieldType.SELECT,
                source: 'entitygroup'
            });
            pcnGroupIdFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            // Add PCN Group list values
            pcnGroupFld.addSelectOption({
                value: ' ',
                text: ' '
            });
            pcnGroupFld.addSelectOption({
                value: 'pcnpendappgrp',
                text: 'PENDING APPROVAL'
            });
            pcnGroupFld.addSelectOption({
                value: 'pcnpendappnoteonly',
                text: 'PENDING APPROVAL NOTIFICATION ONLY'
            });
            pcnGroupFld.addSelectOption({
                value: 'pcnfinalappgrp',
                text: 'FINAL APPROVAL'
            });
            pcnGroupFld.addSelectOption({
                value: 'pcncompgrp',
                text: 'COMPLETE'
            });
            pcnGroupFld.addSelectOption({
                value: 'pcnrejectgrp',
                text: 'REJECTED'
            });

            // Field Defaults
            if (location) locationFld.defaultValue = location;
            if (group) pcnGroupFld.defaultValue = group;

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
                source: 'employee'
            });

            return sublist;

        }

        function getGroupID(location, group) {

            // Lookup Group ID from location
            var logTitle = 'getGroupID';
            var fieldId = 'custrecordgd_location_' + group;
            var locationLookup = search.lookupFields({
                type: search.Type.LOCATION,
                id: location,
                columns: fieldId
            });
            var groupIdObj = locationLookup[fieldId][0];
            log.debug(logTitle, 'Group ID Object: ' + JSON.stringify(groupIdObj));
            if (!groupIdObj) return;

            var groupId = groupIdObj.value;
            log.debug(logTitle, 'Group ID: ' + groupId);

            return groupId;

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
                    var id = record.detach({
                        record: {
                            type: 'employee',
                            id: grpMember
                        },
                        from: {
                            type: 'entitygroup',
                            id: groupId
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
                var id = record.attach({
                    record: {
                        type: 'employee',
                        id: memberArr[j]
                    },
                    to: {
                        type: 'entitygroup',
                        id: groupId
                    }
                });
            }

            log.audit(logTitle, 'Updated Group ID: ' + groupId);

        }

        return {onRequest}

    });
