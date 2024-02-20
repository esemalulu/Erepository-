/**
 * @NApiVersion 2.1
 */

define([
    'N/record',
    'N/runtime',
    'N/search',
    'N/query',
    'N/cache',
    'N/format',
    'N/encode',
    'N/file',
    '../lib/GD_LIB_QAConstants',
    '../models/QATest',
    '../models/QATestLine'],
    /**
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     * @param {query} query
     * @param {cache} cache
     * @param {format} format
     * @param {encode} encode
     * @param {file} file
     * @param Constants
     * @param {QATest} QATest
     * @param {QATestLine} QATestLine
     * @returns {QAData}
     */
    (
        record,
        runtime,
        search,
        query,
        cache,
        format,
        encode,
        file,
        Constants,
        QATest,
        QATestLine) => {

        class QAData {
            constructor() {
                this.CACHE_NAME = 'QAData';
                this.useCache = false;
                // Make sure to bind the functions to this class
                this.getUnits = this.getUnits.bind(this);
                this.getLocations = this.getLocations.bind(this);
                this.getTestTypes = this.getTestTypes.bind(this);
                this.getTemplates = this.getTemplates.bind(this);
                this.getTemplateLines = this.getTemplateLines.bind(this);
                this.getReasonCodes = this.getReasonCodes.bind(this);
                this.getCompletedTests = this.getCompletedTests.bind(this);
                this.getTest = this.getTest.bind(this);
                this.uploadFile = this.uploadFile.bind(this);
                this.fileTypeLookup = this.fileTypeLookup.bind(this);
            }

            /**
             * Returns all locations for use with the QA Testing Mobile Application.
             * @returns {{records}}
             */
            getLocations() {
                const sql = `SELECT
                        location.Id as internalid,
                        location.name
                    FROM
                        location
                    WHERE
                        NVL(location.custrecordrvs_location_isproduction, 'F') =  'T' AND NVL(location.isinactive, 'F') = 'F'`;

                let locationCache = cache.getCache({
                    name: this.CACHE_NAME,
                    scope: cache.Scope.PUBLIC
                });

                return locationCache.get({
                    key: 'getLocations',
                    ttl: 7200, //2 hours
                    loader: () => {
                        return this.getRecordsFromSQL(sql);
                    }
                });
            }

            getReasonCodes() {
                const sql = `SELECT 
                        reasonCode.ID AS internalid,
                        reasonCode.name AS name,
                        reasonCode.custrecordqareasoncode_category AS categoryId,
                        BUILTIN.DF(reasonCode.custrecordqareasoncode_category) AS categoryName
                    FROM 
                        customrecordrvsqareasoncode reasonCode
                    WHERE
                        NVL(reasonCode.isinactive, 'F') = 'F'`;
                return this.getRecordsFromSQL(sql);
            }

            getTemplateLines(dataIn) {
                const templateId = dataIn?.templateId;
                if (templateId) {
                    let sql = `SELECT
                    templateLine.id as templateLineId,
                    templateLine.custrecordqatemplateline_qatesttemplate as templateId,
                    templateLine.name,
                    templateLine.custrecordqatemplateline_code as code,
                    templateLine.custrecordqatemplateline_qacategory as categoryId,
                    BUILTIN.DF(templateLine.custrecordqatemplateline_qacategory) as categoryName,	
                    templateLine.custrecordqatemplateline_flatratecode as flatRate,	
                    templateLine.custrecordqatemplateline_questiontype as type,
                    templateLine.custrecordqatemplateline_sortorder as sortOrder	
                FROM
	                CUSTOMRECORDRVSQATEMPLATELINE templateLine
                WHERE
                    templateLine.custrecordqatemplateline_qatesttemplate IN ('${templateId}')`;
                    if (dataIn?.version) {
                        sql += ` AND templateLine.custrecordqatemplateline_startversion <= ${dataIn.version}`;
                        sql += ` AND NVL(templateLine.custrecordqatemplateline_endversion, 1) >= 1
                         ORDER BY templateLine.custrecordqatemplateline_code`;
                    }
                    log.debug('getTemplateLines', sql);
                    const temp = this.getRecordsFromSQL(sql).records;
                    const records = [];
                    if(temp && temp.length) {
                        temp.forEach(line => {
                            records.push({
                                templateLineId: line.templatelineid,
                                templateId: line.templateid,
                                name: line.name,
                                code: line.code,
                                categoryId: line.categoryid,
                                categoryName: line.categoryname,
                                flatRate: line.flatrate,
                                type: line.type,
                                sortOrder: line.sortorder,
                                value: true
                            });
                        });
                    }
                    return records;
                }
                return {
                    'records': []
                }
            }

            getTemplates() {
                const sql = `SELECT
                template.ID AS templateId,
                    template.name AS name,
                    template.custrecordqatesttemplate_currentversion AS currentVersionId,
                    template.custrecordqatesttemplate_testtype as type
                FROM customrecordrvsqatesttemplate template
                WHERE NVL(template.isinactive, 'F') = 'F'`;
                return this.getRecordsFromSQL(sql);
            }

            /**
             * Returns all test types in the system with their associated Templates.  For use with the QA Mobile App.
             * @returns {{records}}
             */
            getTestTypes() {
                const sql = `SELECT 
                    CUSTOMRECORDRVSQATESTTYPE.ID AS typeId,
                    CUSTOMRECORDRVSQATESTTYPE.name AS name,
                    CUSTOMRECORDRVSQATESTTYPE.custrecordqatesttype_taborder AS taborder,
                    CUSTOMRECORDRVSQATESTTEMPLATE.ID AS templateId,
                    CUSTOMRECORDRVSQATESTTEMPLATE.name AS templateName,
                    CUSTOMRECORDRVSQATESTTEMPLATE.custrecordqatesttemplate_testtype as division_id,
                    BUILTIN.DF(CUSTOMRECORDRVSQATESTTEMPLATE.custrecordqatesttemplate_testtype) as division_value,
                    CUSTOMRECORDRVSQATESTVERSION.custrecordtestversion_number AS currentVersionNumber  
                FROM 
                    CUSTOMRECORDRVSQATESTTYPE
                INNER JOIN CUSTOMRECORDRVSQATESTTEMPLATE ON CUSTOMRECORDRVSQATESTTYPE.custrecordqatesttype_template = CUSTOMRECORDRVSQATESTTEMPLATE.ID
                INNER JOIN CUSTOMRECORDRVSQATESTVERSION ON CUSTOMRECORDRVSQATESTTEMPLATE.custrecordqatesttemplate_currentversion = CUSTOMRECORDRVSQATESTVERSION.ID
                WHERE 
                    (NVL(CUSTOMRECORDRVSQATESTTYPE.isinactive, 'F') = 'F' AND NVL(CUSTOMRECORDRVSQATESTTYPE.custrecordqatesttype_hideinapp, 'F') = 'F')
                ORDER BY 
                    CUSTOMRECORDRVSQATESTTYPE.custrecordqatesttype_taborder`;


                if(this.useCache) {
                    let testTypeCache = cache.getCache({
                        name: this.CACHE_NAME,
                        scope: cache.Scope.PUBLIC
                    });

                    return testTypeCache.get({
                        key: 'getTestTypes',
                        ttl: 7200, //2 hours
                        loader: () => {
                            return this.getRecordsFromSQL(sql);
                        }
                    });
                }
                const results = this.getRecordsFromSQL(sql);
                // Get the unique division ids and values as an array of objects.
                const foundDivisionsSet = new Set();
                results.divisions = results.records.reduce((divisions, record) => {
                    if (!foundDivisionsSet.has(record.division_id)) {
                        foundDivisionsSet.add(record.division_id);
                        divisions.push({
                            id: record.division_id,
                            value: record.division_value
                        });
                    }
                    return divisions;
                }, []);
                return results;
            }

            /**
             * Gets the Units that are not shipped and have an online date less than or equal to today
             * @returns {{records: *[]}}
             */
            getUnits(dataIn) {

                const getUnitsFromSQL = (dataIn) => {
                    log.debug('getUnitsFromSQL', dataIn);
                    let sql = `SELECT 
                      Unit.ID as internalid, 
                      Unit.name, 
                      Unit.custrecordunit_serialnumber AS serialnumber, 
                      Unit.custrecordunit_model AS model, 
                      BUILTIN.DF(Unit.custrecordunit_model) AS modelname,
                      Unit.custrecordunit_dealer AS dealer, 
                      BUILTIN.DF(Unit.custrecordunit_dealer) AS dealername,                      
                      Unit.custrecordunit_location AS location, 	 
                    FROM 
                      CUSTOMRECORDRVSUNIT as Unit
                    WHERE 	  
                      Unit.custrecordunit_shipdate IS NULL
                      AND Unit.created BETWEEN BUILTIN.RELATIVE_RANGES('LY', 'START', 'DATETIME_AS_DATE') AND BUILTIN.RELATIVE_RANGES('TY', 'END', 'DATETIME_AS_DATE')
                      AND NVL(Unit.custrecordunit_shippingstatus, 1) != 3
                      AND NVL(Unit.isinactive, 'F') = 'F'
                      AND Unit.custrecordunit_onlinedate <= BUILTIN.RELATIVE_RANGES('TODAY', 'END', 'DATETIME_AS_DATE')`;

                    // If a location is passed in, only get the Units from that location
                    if (dataIn?.location) {
                        sql += ` AND Unit.custrecordunit_location = ${dataIn.location}`;
                    }
                    sql += ` ORDER BY serialnumber ASC`;
                    log.debug('getUnitsFromSQL', sql);
                    // Run the query as a paged query and return the results as a mapped result set
                    const records = [];
                    const results = query.runSuiteQLPaged({query: sql, pageSize: 1000});
                    for (let i = 0; i < results.pageRanges.length; i++) {
                        const page = results.fetch(i);
                        const pageResults = page.data.asMappedResults();
                        records.push(...pageResults);
                        //log.debug("Mapped Results",pageResults);
                    }
                    log.debug('getUnits', `Found ${records.length} Units`);
                    return {
                        'records': records
                    }
                }
                return getUnitsFromSQL(dataIn);

                const locationKey = dataIn?.location ? dataIn.location : 'all';
                const cacheKey = `getUnits-${locationKey}`;
                let unitCache = cache.getCache({
                    name: this.CACHE_NAME,
                    scope: cache.Scope.PUBLIC
                });
                return unitCache.get({
                    key: cacheKey,
                    ttl: 7200, //2 hours
                    loader: () => {
                        return getUnitsFromSQL(dataIn);
                    }
                });
            }

            getRecordsFromSQL(sql) {
                const resultSet = query.runSuiteQL({query: sql});
                const resultsObj = resultSet.asMappedResults();
                return {
                    'records': resultsObj
                }
            }

            getResultsFromSQL(sql) {
                log.debug('getResultsFromSQL', `${sql}`);
                const resultSet = query.runSuiteQL({query: sql});
                return resultSet.asMappedResults();
            }

            getTestImages(testId) {
                const images = [];
                const searchObj = search.create({
                    type: 'customrecordrvsqatestline',
                    filters:
                        [
                            ['custrecordqatestline_qatest.internalidnumber', 'equalto', testId],
                            'AND',
                            ['custrecordqatestline_qafailedimage', 'noneof', '@NONE@']
                        ],
                    columns:
                        [
                            search.createColumn({name: 'custrecordqatestline_qafailedimage', label: 'Image File'})
                        ]
                });
                searchObj.run().each(function(result){
                   images.push({
                       testLineId: Number(result.id),
                       qaFailedImageId: result.getValue({name: 'custrecordqatestline_qafailedimage'}),
                       qaFailedImageUrl: result.getText({name: 'custrecordqatestline_qafailedimage'}),
                   });
                    return true;
                });
                return images;
            }
            /**
             * Returns the test with the given internalid.
             * @param dataIn
             * @returns {QATest}
             */
            getTest(dataIn) {
                const testType = Number(dataIn?.testType) || 0;
                const unit = Number(dataIn?.unit) || 0;
                const testId = Number(dataIn?.testId) || 0;
                log.debug('getTest', `testType: ${testType}, unit: ${unit}, testId: ${testId}`);
                let sql = `
                    SELECT CUSTOMRECORDRVSQATEST.ID                                              as internalid,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_qatesttemplate                 AS templateid,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_testtype                       AS testtype,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_version                        AS version,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_systemshold                    AS systemshold,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_status                         AS status,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_tobeprinted                    AS tobeprinted,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_comments                       AS comments,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_qatemplateline         AS templateline,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_qacategory             as categoryId,
                           BUILTIN.DF(CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_qacategory) AS categoryName,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_flatratecode           AS flatrate,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_value                  AS lineValue,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_sortorder              AS sortorder,
                           CUSTOMRECORDRVSQATESTLINE.name                                        AS name,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_code                   AS code,
                           CUSTOMRECORDRVSQATESTLINE.ID                                          AS testlineid,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_notes                  AS notes,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_reasoncode             AS reasoncodeid,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_fixed                  AS fixed,                          
                           CUSTOMRECORDRVSQATEST.custrecordqatest_user                           AS custrecordqatest_user,
                           BUILTIN.DF(CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_userfixed)  AS fixeduser,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_userfixed              AS fixeduserid,
                           CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_fixeddate              AS fixeddate,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_unit                           AS unit,
                           CUSTOMRECORDRVSQATEST.custrecordqatest_date                           AS lineDate
                    FROM CUSTOMRECORDRVSQATEST,
                         CUSTOMRECORDRVSQATESTLINE
                    WHERE CUSTOMRECORDRVSQATEST.ID = CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_qatest`;

                if (testId) {
                    sql += ` AND CUSTOMRECORDRVSQATEST.ID = ${testId}`;
                } else {
                    sql += ` AND CUSTOMRECORDRVSQATEST.custrecordqatest_testtype = ${testType} AND CUSTOMRECORDRVSQATEST.custrecordqatest_unit = ${unit}`;
                }

                const qaTest = new QATest();
                let results;

                /* if(!testId) {
                     let testCache = cache.getCache({
                         name: this.CACHE_NAME,
                         scope: cache.Scope.PUBLIC
                     });
                     testCache.remove({key: `getTest-${testType}-${unit}`});
                     results = testCache.get({
                         key: `getTest-${testType}-${unit}`,
                         ttl: 7200, //2 hours
                         loader: () => {
                             log.debug('getTest', `getTest-${testType}-${unit}`);
                             log.debug('getTest sql', sql);
                             const temp = this.getResultsFromSQL(sql);
                             log.debug('Results length', temp.length);
                             return temp;
                         }
                     });
                 } else {*/
                results = this.getResultsFromSQL(sql);
                //}

                log.debug('getTest Results length', results.length);
                // no tests found so get lines from template
                if (!results || !results.length && !testId) {
                    const templateInfo = this.getTestTemplateAndVersion(testType);
                    log.debug('getTest templateInfo', templateInfo);
                    qaTest.testId = 0;
                    qaTest.templateId = templateInfo.templateid;
                    qaTest.typeId = testType;
                    qaTest.version = templateInfo.version;
                    qaTest.date = format.format({value: new Date(), type: format.Type.DATE});
                    qaTest.user = runtime.getCurrentUser().id;
                    qaTest.unit = unit;
                    qaTest.systemsHold = false;
                    qaTest.isCompleted = false;
                    qaTest.toBePrinted = false;
                    qaTest.status = 1;
                    qaTest.comments = '';
                    qaTest.testLines = this.getTemplateLines({'templateId': templateInfo.templateid, 'version': templateInfo.version});
                    return qaTest;
                }

                // test found so get lines from test
                for (let i = 0; i < results.length; i++) {
                    const line = results[i];
                    if (i === 0) {
                        qaTest.testId = line.internalid;
                        qaTest.templateId = line.templateid;
                        qaTest.typeId = line.testtype;
                        qaTest.version = line.version;
                        qaTest.date = line.linedate;
                        qaTest.user = line.user;
                        qaTest.unit = line.unit;
                        qaTest.status = Number(line.status);
                        qaTest.systemsHold = line.systemshold === 'T';
                        qaTest.isCompleted = line.status === 2;
                        qaTest.toBePrinted = line.tobeprinted === 'T';
                        qaTest.comments = line.comments;
                    }
                    log.debug('getTest line', line);
                    const testLine = new QATestLine();
                    testLine.testLineId = line.testlineid;
                    testLine.templateLineId = line.templateline;
                    testLine.categoryId = line.categoryid;
                    testLine.categoryName = line.categoryname;
                    testLine.flatRate = line.flatrate;
                    testLine.value = line.linevalue === 'T' || !line.linevalue ? true : false;
                    testLine.sortOrder = line.sortorder;
                    testLine.name = line.name;
                    testLine.code = line.code;
                    testLine.notes = line.notes;
                    testLine.reasonCodeId = line.reasoncodeid;
                    testLine.fixed = line.fixed === 'T';
                    testLine.fixedUser = line.fixeduser;
                    testLine.fixedUserId = line.fixeduserid;
                    testLine.fixedDate = line.fixeddate;
                    qaTest.testLines.push(testLine);
                }
                // Get any images that may be attached.
                const images = this.getTestImages(qaTest.testId);
                if(images.length) {
                    // Set the images on the test lines, associated by the testLineId
                    qaTest.testLines.forEach(testLine => {
                        const image = images.find(image => image.testLineId === Number(testLine.testLineId));
                        if(image) {
                            testLine.qaFailedImageId = image.qaFailedImageId;
                            testLine.qaFailedImageUrl = image.qaFailedImageUrl;
                        }
                    });
                }
                return qaTest;
            }

            getTestTemplateAndVersion(testType) {
                const sql = `SELECT 
                    CUSTOMRECORDRVSQATESTTEMPLATE_SUB.id_join AS templateid,
                    CUSTOMRECORDRVSQATESTTEMPLATE_SUB.custrecordtestversion_number AS version
                 FROM 
                    CUSTOMRECORDRVSQATESTTYPE, 
                    (SELECT 
                        CUSTOMRECORDRVSQATESTTEMPLATE.ID AS ID, 
                        CUSTOMRECORDRVSQATESTTEMPLATE.ID AS id_join, 
                        CUSTOMRECORDRVSQATESTVERSION.custrecordtestversion_number AS custrecordtestversion_number 
                    FROM CUSTOMRECORDRVSQATESTTEMPLATE, CUSTOMRECORDRVSQATESTVERSION 
                    WHERE CUSTOMRECORDRVSQATESTTEMPLATE.custrecordqatesttemplate_currentversion = CUSTOMRECORDRVSQATESTVERSION.ID
                    ) CUSTOMRECORDRVSQATESTTEMPLATE_SUB 
                    WHERE CUSTOMRECORDRVSQATESTTYPE.custrecordqatesttype_template = CUSTOMRECORDRVSQATESTTEMPLATE_SUB.ID
                    AND CUSTOMRECORDRVSQATESTTYPE.ID = ${testType}`;
                const results = this.getResultsFromSQL(sql);
                if (results?.length)
                    return results[0];
                return null;
            }

            /**
             * Gets the completed tests for a unit.
             * @param dataIn
             * @returns {[]}
             */
            getCompletedTests(dataIn) {
                const unit = Number(dataIn?.unit) || 0;
                if (!unit) return [];

                var searchObj = search.create({
                    type: 'customrecordrvsqatest',
                    filters:
                        [
                            ['custrecordqatest_unit', 'anyof', unit],
                            'AND',
                            ['custrecordqatest_status', 'anyof', '2']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'name',
                                sort: search.Sort.ASC,
                                label: 'ID'
                            }),
                            search.createColumn({name: 'custrecordqatest_testtype', label: 'QA Test Type'}),
                            search.createColumn({name: 'custrecordqatest_unit', label: 'Unit'}),
                            search.createColumn({name: 'custrecordqatest_status', label: 'Systems Hold'})
                        ]
                });
                const results = [];
                searchObj.run().each(function (result) {
                    results.push({
                        internalid: result.id,
                        testType: result.getValue({name: 'custrecordqatest_testtype'}),
                        unit: result.getValue({name: 'custrecordqatest_unit'}),
                        status: result.getValue({name: 'custrecordqatest_status'})
                    });
                    return true;
                });
                return results;

                // Using SQL is MUCH slower than using a search for this one.
                /* const sql = `SELECT
                         QAtest.ID as internalid,
                         QAtest.custrecordqatest_testtype as testType,
                         QAtest.custrecordqatest_status as status,
                         QAtest.custrecordqatest_unit as unit
                     FROM
                         CUSTOMRECORDRVSQATEST as QAtest
                     WHERE
                         QAtest.custrecordqatest_status = 2 AND QATest.custrecordqatest_unit = ${unit}`;
                 const results = this.getResultsFromSQL(sql);
                 if (results?.length)
                     return results;
                 return [];*/
            }

            saveTest(dataIn) {
                log.debug('saveTest', dataIn);
                const SUBLIST_TEST_LINES = 'recmachcustrecordqatestline_qatest';
                const test = dataIn.data.test;
                if(!test) throw 'No test data provided.';
                try {
                    log.debug('UNIT', test.unit);
                    let testRec = null;
                    // if there is a testId then this is an existing test to load
                    if (test.testId) {
                        testRec = record.load({type: 'customrecordrvsqatest', id: test.testId, isDynamic: true});
                    } else {
                        testRec = record.create({type: 'customrecordrvsqatest', isDynamic: true});
                        testRec.setValue({fieldId: 'custrecordqatest_testtype', value: test.typeId});
                        testRec.setValue({fieldId: 'custrecordqatest_qatesttemplate', value: test.templateId});
                        testRec.setValue({fieldId: 'custrecordqatest_version', value: test.version});
                        testRec.setValue({fieldId: 'custrecordqatest_date', value: new Date()});
                        testRec.setValue({fieldId: 'custrecordqatest_unit', value: test.unit});
                    }
                    testRec.setValue({fieldId: 'custrecordqatest_user', value: runtime.getCurrentUser().id});
                    testRec.setValue({fieldId: 'custrecordqatest_status', value: test.status});
                    testRec.setValue({fieldId: 'custrecordqatest_tobeprinted', value: test.toBePrinted});
                    testRec.setValue({fieldId: 'custrecordqatest_comments', value: test.comments});
                    test.testLines.forEach(testLine => {
                        //log.debug('testLine.testLineId', testLine.testLineId);
                        const lineNumber = testRec.findSublistLineWithValue({
                            sublistId: SUBLIST_TEST_LINES,
                            fieldId: 'id',
                            value: testLine.testLineId
                        });
                        //log.debug('lineNumber', lineNumber);
                        if (testLine.templateLineId && lineNumber === -1) {
                            testRec.selectNewLine({sublistId: SUBLIST_TEST_LINES});
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_qatemplateline',
                                value: testLine.templateLineId
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_qacategory',
                                value: testLine.categoryId
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_flatratecode',
                                value: testLine.flatRate
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_value',
                                value: testLine.value
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_sortorder',
                                value: testLine.sortOrder
                            });
                            testRec.setCurrentSublistValue({sublistId: SUBLIST_TEST_LINES, fieldId: 'name', value: testLine.name});
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_code',
                                value: testLine.code
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_notes',
                                value: testLine.notes || ''
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_reasoncode',
                                value: testLine.reasonCodeId || ''
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_qafailedimage',
                                value: testLine.qaFailedImageId || ''
                            });
                            testRec.commitLine({sublistId: SUBLIST_TEST_LINES});
                        } else {
                            //log.debug('EDITING EXISTING LINE', lineNumber);
                            testRec.selectLine({sublistId: SUBLIST_TEST_LINES, line: lineNumber});
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_value',
                                value: testLine.value
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_notes',
                                value: testLine.notes || ''
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_reasoncode',
                                value: testLine.reasonCodeId || ''
                            });
                            testRec.setCurrentSublistValue({
                                sublistId: SUBLIST_TEST_LINES,
                                fieldId: 'custrecordqatestline_qafailedimage',
                                value: testLine.qaFailedImageId || ''
                            });
                            if (testLine.fixed) {
                                testRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_TEST_LINES,
                                    fieldId: 'custrecordqatestline_fixed',
                                    value: testLine.fixed
                                });
                                testRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_TEST_LINES,
                                    fieldId: 'custrecordqatestline_userfixed',
                                    value: runtime.getCurrentUser().id
                                });
                                testRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_TEST_LINES,
                                    fieldId: 'custrecordqatestline_fixeddate',
                                    value: new Date()
                                });
                            } else {
                                testRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_TEST_LINES,
                                    fieldId: 'custrecordqatestline_fixed',
                                    value: false
                                });
                                testRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_TEST_LINES,
                                    fieldId: 'custrecordqatestline_userfixed',
                                    value: null
                                });
                                testRec.setCurrentSublistValue({
                                    sublistId: SUBLIST_TEST_LINES,
                                    fieldId: 'custrecordqatestline_fixeddate',
                                    value: null
                                });
                            }
                            testRec.commitLine({sublistId: SUBLIST_TEST_LINES});
                        }
                    });
                    return testRec.save();
                } catch (e) {
                    log.error({title: 'Error saving test', details: e});
                    throw e;
                }
                return null;
            }
            uploadFile(dataIn) {
                let failed, fileId, fileUrl
//{"method":"uploadFile","data":{"file":"data:image/jpeg;ba
                const base64Data = dataIn.data.file.replace(/^data:.*base64,/i, '');
                log.debug('filename', dataIn?.data?.fileName);
                log.debug('testLineId', dataIn?.data?.testLineId);
                log.debug('fileGUID', dataIn?.data?.fileGUID);
                log.debug('uploadFile', dataIn);
                const fileInfo = this.fileTypeLookup(dataIn.data.fileName);
                const extension = dataIn?.data?.fileName.split('.').pop().toLowerCase();
                log.debug('fileInfo', fileInfo);
                const fileType = fileInfo.type;
                const decodeBase64Data = fileInfo.decodeBase64Data;

                try {
                    let contents = base64Data;
                    if (decodeBase64Data)
                    {
                        contents = encode.convert({
                            string: contents,
                            inputEncoding: encode.Encoding.BASE_64,
                            outputEncoding: encode.Encoding.UTF_8
                        });
                    }

                    let imageuploadsfolder = runtime.getCurrentScript().getParameter({
                            name: 'custscript_gd_qa_image_folder'
                        });


                    const netSuiteFileData = {
                        name: `${dataIn.data.testLineId || dataIn.data.fileGUID} - ${runtime.getCurrentUser().id} - ${new Date().getTime()}.${extension}`,
                        description: dataIn.data.fileName,
                        fileType: fileType,
                        contents: contents,
                        encoding: file.Encoding.UTF8,
                        folder: imageuploadsfolder,
                        isOnline: true
                    };

                    const uploadedFile = file.create(netSuiteFileData);

                    failed = false;
                    fileId = uploadedFile.save().toString();
                    fileUrl = file.load({id: fileId}).url;
                    if(dataIn.data.testLineId) {
                        record.submitFields({
                            type: 'customrecordrvsqatestline',
                            id: dataIn.data.testLineId,
                            values: {
                                custrecordqatestline_qafailedimage: fileId,
                                custrecordqatestline_value: false
                            }
                        });
                    }
                } catch (error) {
                    failed = true;
                }

                if (!failed)
                    return {id: fileId, url: fileUrl};
                return null;
            }

            deleteFile(dataIn) {
                log.debug('deleteFile', dataIn);
                const fileId = dataIn.fileId;
                const testLineId = dataIn.testLineId;
                if(!fileId) return false;
                try {
                    if(testLineId) {
                        record.submitFields({
                            type: 'customrecordrvsqatestline',
                            id: testLineId,
                            values: {
                                custrecordqatestline_qafailedimage: null
                            }
                        });
                    }
                    file.delete({
                        id: fileId
                    });
                    return true;
                } catch (error) {
                    log.error({title: 'Error deleting file', details: error});
                    return false;
                }
            }

            fileTypeLookup(fileName)
            {
                const extension = fileName.split('.').pop().toLowerCase();

                switch (extension)
                {
                    case 'dwg': case 'dwf': case 'dxf': case 'dwt': case 'plt':
                    return { type: file.Type.AUTOCAD, decodeBase64Data: false };
                    case 'bmp':
                        return { type: file.Type.BMPIMAGE, decodeBase64Data: false };
                    case 'csv':
                        return { type: file.Type.CSV, decodeBase64Data: true };
                    case 'xls': case 'xlsx':
                    return { type: file.Type.EXCEL, decodeBase64Data: false };
                    case 'swf':
                        return { type: file.Type.FLASH, decodeBase64Data: false };
                    case 'gif':
                        return { type: file.Type.GIFIMAGE, decodeBase64Data: false };
                    case 'gz':
                        return { type: file.Type.GZIP, decodeBase64Data: false };
                    case 'ico': case 'icon':
                    return { type: file.Type.ICON, decodeBase64Data: false };
                    case 'jpg': case 'jpeg':
                    return { type: file.Type.JPGIMAGE, decodeBase64Data: false };
                    case 'eml': case 'msg':
                    return { type: file.Type.MESSAGERFC, decodeBase64Data: false };
                    case 'mp3':
                        return { type: file.Type.MP3, decodeBase64Data: false };
                    case 'mpg': case 'mpeg':
                    return { type: file.Type.MPEGMOVIE, decodeBase64Data: false };
                    case 'pdf':
                        return { type: file.Type.PDF, decodeBase64Data: false };
                    case 'pjpeg':
                        return { type: file.Type.PJPGIMAGE, decodeBase64Data: false };
                    case 'png':
                        return { type: file.Type.PNGIMAGE, decodeBase64Data: false };
                    case 'ps': case 'eps':
                    return { type: file.Type.POSTSCRIPT, decodeBase64Data: false };
                    case 'ppt': case 'pptx':
                    return { type: file.Type.POWERPOINT, decodeBase64Data: false };
                    case 'mpp':
                        return { type: file.Type.MSPROJECT, decodeBase64Data: false };
                    case 'mov':
                        return { type: file.Type.QUICKTIME, decodeBase64Data: false };
                    case 'sms':
                        return { type: file.Type.SMS, decodeBase64Data: false };
                    case 'tif': case 'tiff':
                    return { type: file.Type.TIFFIMAGE, decodeBase64Data: false };
                    case 'vsd': case 'vsdX':
                    return { type: file.Type.VISIO, decodeBase64Data: false };
                    case 'doc': case 'dot': case 'docx':
                    return { type: file.Type.WORD, decodeBase64Data: false };
                    case 'zip':
                        return { type: file.Type.ZIP, decodeBase64Data: false };
                    default:
                        return { type: file.Type.PLAINTEXT, decodeBase64Data: true };
                }
            }
        }

        return QAData;

    });
