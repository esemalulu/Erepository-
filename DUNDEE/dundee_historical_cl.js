/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define([
  'SuiteScripts/dundee_historical_pageinit.js'
], function(p) {

  return {
    pageInit: p.pageInit, fieldChanged: p.fieldChanged 
  }

})
