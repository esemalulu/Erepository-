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
WHERE CUSTOMRECORDRVSQATEST.ID = CUSTOMRECORDRVSQATESTLINE.custrecordqatestline_qatest

SELECT templateLine.id                                              as templateLine,
       templateLine.custrecordqatemplateline_qatesttemplate         as templateId,
       templateLine.name,
       templateLine.custrecordqatemplateline_code                   as code,
       templateLine.custrecordqatemplateline_qacategory             as categoryId,
       BUILTIN.DF(templateLine.custrecordqatemplateline_qacategory) as categoryName,
       templateLine.custrecordqatemplateline_flatratecode           as flatRate,
       templateLine.custrecordqatemplateline_questiontype           as type,
       templateLine.custrecordqatemplateline_sortorder              as sortOrder
FROM CUSTOMRECORDRVSQATEMPLATELINE templateLine
WHERE templateLine.custrecordqatemplateline_qatesttemplate IN ('3')
  AND templateLine.custrecordqatemplateline_startversion <= 1
  AND NVL(templateLine.custrecordqatemplateline_endversion, 1) >= 1

SELECT
    QAtest.ID as internalid,
    QAtest.custrecordqatest_testtype as testType,
    QAtest.custrecordqatest_status as status,
    QAtest.custrecordqatest_unit as unit
FROM
    CUSTOMRECORDRVSQATEST as QAtest
WHERE
    QATest.Unit = 2231053

SELECT
    Unit.ID as internalid,
    Unit.name,
    Unit.custrecordunit_serialnumber AS serialnumber,
    Unit.custrecordunit_model AS model,
    Unit.custrecordunit_dealer AS dealer,
    Unit.custrecordunit_location AS location,
FROM
    CUSTOMRECORDRVSUNIT as Unit
WHERE
    Unit.custrecordunit_shipdate IS NULL
  AND Unit.created BETWEEN BUILTIN.RELATIVE_RANGES('TY', 'START', 'DATETIME_AS_DATE')
  AND BUILTIN.RELATIVE_RANGES('TY', 'END', 'DATETIME_AS_DATE')
  AND NVL(Unit.custrecordunit_shippingstatus, 1) != 3
  AND NVL(Unit.isinactive, 'F') = 'F'
  AND Unit.custrecordunit_onlinedate <= BUILTIN.RELATIVE_RANGES('TODAY', 'END', 'DATETIME_AS_DATE')