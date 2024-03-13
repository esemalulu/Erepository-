/**
 * @NApiVersion 2.1
 * @NScriptType restlet
 */

define(['N/record', 'N/runtime', 'N/error', 'N/format', 'N/search', 'N/log', './Grab_ACR_ProductTypes_library_2_0.js', 'N/task'], callback);

function callback(record, runtime, error, format, search, log, acrProductTypesLibrary, task) {
    function post(request) {
        log.debug({
            title: 'request',
            details: request,
        });

        const response = {
            status: 'ok',
        };

        switch (request.restletFunction) {
            case 'mergeProjectToTemplate':
                response.result = mergeProjectToTemplate(request);
                break;
            case 'compareToAvailableAddOns':
                response.result = compareToAvailableAddOns(request);
                break;
            case 'scheduleMapReduce':
                response.result = scheduleMapReduce(request);
                break;
            case 'recalculateTax':
                response.result = recalculateTax(request);
                break;
            case undefined:
                response.status = 'error';
                response.error = 'No restlet function provided. Please specify a valid "restletFunction" property to your request.';
                break;
            default:
                response.status = 'error';
                response.error = 'No such restlet function found.';
                break;
        }

        return response;
    }

    function mergeProjectToTemplate(request) {
        if (isEmpty(request.projectTemplate) || request.projectTemplate === undefined) {
            return {
                error: 'Missing required request argument "projectTemplate": No template provided!',
                status: 'failed',
            };
        }

        // project to request map
        const PROJECT_FIELDS_FROM_REQUEST_MAP = {
            companyname: 'name',
            customer: 'customer',
            parent: 'customer',
        };

        const PROJECT_FIELDS_FROM_TEMPLATE_MAP = {
            custentityr7_prj_contracted_work: 'custentityr7_prj_contracted_work',
            custentityr7jobrevreporttype: 'custentityr7jobrevreporttype',
            isutilizedtime: 'isutilizedtime',
            wfinstances: 'wfinstances',
            isproductivetime: 'isproductivetime',
            recalculateprojectplanoverride: 'recalculateprojectplanoverride',
            allowtasktimeforrsrcalloc: 'allowtasktimeforrsrcalloc',
            estimatedlaborrevenue: 'estimatedlaborrevenue',
            isexempttime: 'isexempttime',
            projecttemplatestored: 'projecttemplatestored',
            materializetime: 'materializetime',
            allowtime: 'allowtime',
            jobbillingtype: 'jobbillingtype',
            limittimetoassignees: 'limittimetoassignees',
            forecastchargerunondemand: 'forecastchargerunondemand',
            useallocatedtimeforforecast: 'useallocatedtimeforforecast',
            allowexpenses: 'allowexpenses',
            allowallresourcesfortasks: 'allowallresourcesfortasks',
            includecrmtasksintotals: 'includecrmtasksintotals',
        };

        const ASSIGNEE_NECCESARY_FIELDS = [
            'cost',
            'estimatedwork',
            'price',
            'resource',
            'serviceitem',
            'unitcost',
            'unitprice',
            // 'units',
        ];

        const PREDECESSOR_NECCESARY_FIELDS = ['lagdays', 'task', 'type'];

        class ProjectFromTemplate {
            constructor(request) {
                this.template = {
                    id: null,
                    record: null,
                    tasks: {
                        sorted: null,
                        byId: null,
                    },
                };
                this.project = {
                    id: null,
                    record: null,
                    customer: null,
                    name: null,
                    requestFields: null,
                    tasks: {
                        sorted: null,
                        byId: null,
                        ids: null,
                    },
                };
                this.taskValuesToSubmit = {};

                this.template.id = request.projectTemplate;
                this.project.customer = request.newProjectInfo.customer;
                this.project.name = request.newProjectInfo.name;
                this.project.requestFields = request.newProjectInfo.fields ? request.newProjectInfo.fields : {};

                const eventIdSort = (a, b) => (Number(a.fields.eventid) > Number(b.fields.eventid) ? 1 : -1);
                // define template tasks getters
                Object.defineProperty(this.template.tasks, 'sorted', {
                    get() {
                        return Object.values(this).sort(eventIdSort);
                    },
                    enumerable: false,
                });
                Object.defineProperty(this.template.tasks, 'byId', {
                    get() {
                        return this;
                    },
                    enumerable: false,
                });
                // define project tasks getters
                Object.defineProperty(this.project.tasks, 'sorted', {
                    get() {
                        return Object.values(this).sort(eventIdSort);
                    },
                    enumerable: false,
                });
                Object.defineProperty(this.project.tasks, 'byId', {
                    get() {
                        return this;
                    },
                    enumerable: false,
                });
                Object.defineProperty(this.project.tasks, 'ids', {
                    get() {
                        return Object.keys(this);
                    },
                    enumerable: false,
                });
            }

            assignTemplateProjectRecord() {
                this.template.record = JSON.parse(
                    JSON.stringify(
                        record.load({
                            type: record.Type.PROJECT_TEMPLATE,
                            id: this.template.id,
                        })
                    )
                );
            }

            assignTemplateTaskRecords() {
                const projectTemplateTasksSearch = search.create({
                    type: search.Type.PROJECT_TASK,
                    filters: [['projecttemplate.internalid', 'anyof', request.projectTemplate]],
                    columns: [
                        search.createColumn({
                            name: 'internalid',
                            sort: search.Sort.ASC,
                        }),
                    ],
                });
                projectTemplateTasksSearch.run().each((result) => {
                    this.addTemplateTask(
                        record.load({
                            type: record.Type.PROJECT_TASK,
                            id: result.id,
                        })
                    );
                    return true;
                });
            }

            addTemplateTask(taskRecord) {
                // copy as object and remove annoying 'currentline' prop
                this.template.tasks[taskRecord.id] = JSON.parse(
                    JSON.stringify(taskRecord, (name, val) => (name === 'currentline' ? undefined : val))
                );
            }

            createProjectRecord() {
                const newProject = record.create({
                    type: record.Type.JOB,
                    isDynamic: true,
                });
                for (const [fieldId, property] of Object.entries(PROJECT_FIELDS_FROM_REQUEST_MAP)) {
                    newProject.setValue({
                        fieldId: fieldId,
                        value: this.project[property],
                    });
                }
                for (const [fieldId, property] of Object.entries(PROJECT_FIELDS_FROM_TEMPLATE_MAP)) {
                    let fieldValue = this.template.record.fields[property];
                    newProject.setValue({
                        fieldId: fieldId,
                        value: fieldValue === 'T' ? true : fieldValue === 'F' ? false : fieldValue,
                    });
                }
                for (const [fieldId, fieldValue] of Object.entries(this.project.requestFields)) {
                    newProject.setValue({
                        fieldId: fieldId,
                        value: fieldValue,
                    });
                }
                this.project.record = JSON.parse(JSON.stringify(newProject));
                this.project.id = newProject.save({
                    enableSourcing: true,
                });
            }

            createTaskRecords() {
                this.template.tasks.sorted.forEach((templateTask) => {
                    // initiate taskObj and construct:
                    const taskObj = (this.taskValuesToSubmit[templateTask.clone] = {
                        fields: {},
                        sublists: {
                            assignee: [],
                            predecessor: [],
                        },
                    });

                    // set initial mandatory fields
                    taskObj.fields.company = this.project.id;
                    taskObj.fields.title = templateTask.fields.title;

                    // if there are assignees => estimated work belongs to this task
                    if (Object.keys(templateTask.sublists.assignee).length !== 0) {
                        taskObj.fields.estimatedwork = templateTask.fields.estimatedwork;
                    }
                    // set nonbillabletask value => make boolean of "T"/"F" checkbox values
                    taskObj.fields.nonbillabletask = templateTask.fields.nonbillabletask === 'T';
                    // build parent/sibling relations
                    // there should always be a clone available at this stage, since the tasks are sorted by thier appearance on the template
                    if (templateTask.fields.parent !== undefined) {
                        taskObj.fields.parent = this.template.tasks.byId[templateTask.fields.parent].clone;
                    }

                    // built assignee sublist arr
                    for (const [lineName, lineObj] of Object.entries(templateTask.sublists.assignee)) {
                        if (lineName !== 'currentline') {
                            const tempObj = {};
                            ASSIGNEE_NECCESARY_FIELDS.forEach((fieldId) => {
                                if (lineObj[fieldId]) {
                                    tempObj[fieldId] = lineObj[fieldId];
                                }
                            });
                            taskObj.sublists.assignee.push(tempObj);
                        }
                    }

                    // built predecessor sublist arr
                    for (const [lineName, lineObj] of Object.entries(templateTask.sublists.predecessor)) {
                        if (lineName !== 'currentline') {
                            const tempObj = {};
                            PREDECESSOR_NECCESARY_FIELDS.forEach((fieldId) => {
                                if (lineObj[fieldId]) {
                                    if (fieldId === 'task') {
                                        // set fieldValue to related clone task
                                        tempObj[fieldId] = this.template.tasks.byId[lineObj[fieldId]].clone;
                                    } else {
                                        tempObj[fieldId] = lineObj[fieldId];
                                    }
                                }
                            });
                            taskObj.sublists.predecessor.push(tempObj);
                        }
                    }
                    // done with taskObj construction

                    // create record and assign fields:
                    const newProjectTask = record.create({
                        type: record.Type.PROJECT_TASK,
                        isDynamic: true,
                    });

                    // set fields
                    for (const [fieldId, fieldValue] of Object.entries(taskObj.fields)) {
                        newProjectTask.setValue({
                            fieldId: fieldId,
                            value: fieldValue,
                        });
                    }

                    // set sublists
                    for (const [sublistId, sublistLinesArray] of Object.entries(taskObj.sublists)) {
                        sublistLinesArray.forEach((sublistLine) => {
                            newProjectTask.selectNewLine({
                                sublistId: sublistId,
                            });
                            for (const [sublistFieldId, sublistFieldValue] of Object.entries(sublistLine)) {
                                newProjectTask.setCurrentSublistValue({
                                    sublistId: sublistId,
                                    fieldId: sublistFieldId,
                                    value: sublistFieldValue,
                                });
                            }
                            newProjectTask.commitLine({
                                sublistId: sublistId,
                            });
                        });
                    }

                    // save
                    const newTaskRecordId = newProjectTask.save();
                    this.project.tasks[newTaskRecordId] = JSON.parse(JSON.stringify(newProjectTask));

                    // build relation on object level for next tasks
                    templateTask.clone = newTaskRecordId;
                });
            }
        }

        const timeToProcessStart = new Date();
        const newProject = new ProjectFromTemplate(request);

        try {
            newProject.assignTemplateProjectRecord();
            newProject.assignTemplateTaskRecords();
            newProject.createProjectRecord();
            newProject.createTaskRecords();

            const timeToProcessEnd = new Date();
            const processingTime = timeToProcessEnd - timeToProcessStart;
            log.audit({
                title: `Project succesfully created in ${processingTime} milliseconds`,
                details: `Project with ${newProject.project.id} with all project tasks for customer ${newProject.project.customer} is created.`,
            });
            return {
                success: true,
                projectId: newProject.project.id,
                projectTasksIds: newProject.project.tasks.ids,
                processingTime: processingTime,
                remainingUsage: runtime.getCurrentScript().getRemainingUsage(),
            };
        } catch (error) {
            log.error({
                title: 'Error during Project creation',
                details: error,
            });
            return {
                success: false,
                projectId: newProject.project.id,
                projectTasksIds: newProject.project.tasks.ids,
                error: error,
            };
        }
    }

    function compareToAvailableAddOns(request) {

        Date.prototype.addDays = function(days) {
            var date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        }

        const functionResult = {
            created_LFMs: {},
        };

        const arrProductTypesByRecId = acrProductTypesLibrary.grabAllProductTypes(true);
        const now = new Date();

        const licenseRecord = record.load({
            type: request.licenseRecord.type,
            id: request.licenseRecord.id,
        });
        const allFields = licenseRecord.getFields();

        const aclAddonSearch = search.create({
            type: 'customrecordr7acladdoncomponents',
            filters: [['custrecordr7acladdon_fieldid', 'isnot', 'id'], 'AND', ['custrecordr7acladdon_value', 'noneof', '7', '8', '10', '13', '14', '15']],
            columns: [
                'custrecordr7acladdon_fieldid',
                'custrecordr7acladdon_fieldtype',
                'custrecordr7acladdon_value',
                'custrecordr7acladdon_specificvalue',
            ],
        });
        const resultSet = aclAddonSearch.run();
        resultSet.each((result) => {
            let createAddOn = false;
            const addOnId = result.id;
            const fieldId = result.getValue(resultSet.columns[0]);
            const fieldType = result.getValue(resultSet.columns[1]);
            // const valueId = result.getValue(resultSet.columns[2]);
            const specificValue = result.getValue(resultSet.columns[3]);
            const fieldValue = licenseRecord.getValue({ fieldId: fieldId });

            if (allFields.indexOf(fieldId) !== -1) {
                if (fieldType === 'date' || fieldType === 'integer') {
                    if (isEmpty(specificValue) && !isEmpty(fieldValue)) {
                        createAddOn = true;
                        if (
                            [
                                'custrecordr7inplicenselicensedassets',
                                'custrecordr7nxlicensenumberips',
                                'custrecordr7managedservicesips',
                            ].indexOf(fieldId) !== -1 &&
                            (fieldValue == '1' || fieldValue == '0')
                        ) {
                            createAddOn = false;
                        }

                        if (request.isRenewal && arrProductTypesByRecId[licenseRecord.type]['expiration'] == fieldId) {
                            createAddOn = false;
                        }
                    }
                } else if (
                    !isEmpty(specificValue) &&
                    fieldValue === (specificValue === 'T' ? true : specificValue) &&
                    fieldValue !== false
                ) {
                    createAddOn = true;
                } else if (isEmpty(specificValue) && fieldType === 'select') {
                    createAddOn = true;
                }
            }

            if (createAddOn) {
                allFields[allFields.indexOf(fieldId)] = '';
                const fields = request.fields;

                let fmrStart = fields['startDate'];
                // if add on is a date, it should take effect immediatly
                if (fieldType === 'date') {
                    fmrStart = format.format({
                        value: now,
                        type: format.Type.DATE,
                    });
                    // if add on is NOT a date, end date should be current max end date
                } else if (!isEmpty(request.parentEndDateOfActivationKey)) {
                    endDate = request.parentEndDateOfActivationKey;
                }

                let status;
                if (dateWithoutTime(new Date(fmrStart)) >= dateWithoutTime(now.addDays(1))) {
                    status = 1;
                } else {
                    status = 3;
                }

                let lfmObj = {
                    custrecordr7licfmfeature: addOnId,
                    custrecordr7licfmvalue: fieldType === 'integer' ? '' + fieldValue : fieldValue,
                    custrecordr7licfmsalesorder: fields['salesorder'],
                    custrecordr7licfmstartdate: format.parse({
                        value: fmrStart,
                        type: format.Type.DATE,
                    }),
                    custrecordr7licfmenddate: format.parse({
                        value: fields['expirationDate'],
                        type: format.Type.DATE,
                    }),
                    custrecordr7licfmproductkey: fields['activationKey'],
                    custrecordr7licfmstatus: status,
                    custrecordr7licfmaclcreated: true,
                    custrecordr7licfmitemlineid: fields['lineId'],
                };

                const lfmORecord = record.create({
                    type: 'customrecordr7licensefeaturemanagement',
                    isDynamic: true,
                });
                for (const [fieldId, fieldValue] of Object.entries(lfmObj)) {
                    log.debug({
                        title: fieldId,
                        details: fieldValue,
                    });
                    lfmORecord.setValue({
                        fieldId: fieldId,
                        value: fieldValue,
                    });
                }
                try {
                    let lfmId = lfmORecord.save({
                        enableSourcing: true,
                    });
                    if (functionResult.created_LFMs[fields['activationKey']] === undefined) {
                        functionResult.created_LFMs[fields['activationKey']] = [lfmId];
                    } else {
                        functionResult.created_LFMs[fields['activationKey']].push(lfmId);
                    }
                } catch (err) {
                    let er = {
                        message: `Could not create LFM for activation key ${fields['activationKey']}`,
                        lfm_name: addOnId,
                        error: err,
                    };
                    if (functionResult.errors === undefined) {
                        functionResult.errors = [er];
                    } else {
                        functionResult.errors.push(er);
                    }
                }
            }

            return true;
        });

        return functionResult;
    }

    function dateWithoutTime(dateTime) {
        let date = new Date(dateTime.getTime());
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    function isEmpty(value) {
        return value === '' || value === ' ' || value === null;
    }

    function scheduleMapReduce(request) {
        const fields = request.fields;
        log.audit("scheduleMapReduce request.fields", fields);
        if(isEmpty(fields.scriptId) || fields.scriptId == undefined){
            return {
                error: 'Missing required request argument "scriptId": No script ID provided!',
                status: 'failed',
            };
        }
        try{
            const mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: fields.scriptId,
                deploymentId:  fields.deployId,
                params: fields.params,
            });
            const mrTaskId = mrTask.submit();
            return mrTaskId;
        } catch(e){
            return {
                error: 'Could not execute Map/Reduce. Full error message: '+e,
                status: 'failed'
            };
        }
        
    }

    function recalculateTax(request) {
        const type = request.type;
        const id = request.id;

        if (!type || !id) {
            return {
                isSuccess: false,
                error: '"type" and "id" are required.'
            }
        }

        try {
            record.load({ type: type, id: id })
                .setValue({ fieldId: 'custbody_r7_avalara_request_hash', value: '' })
                .save();

            return { isSuccess: true };
        } catch(ex) {
            return {
                isSuccess: false,
                error: ex.message
            };
        }
    }

    return {
        post: post,
    };
}
