/**
 * Display UI for client feedback report
 *
 * @method clientReport
 * @param {Object} request
 * @param {Object} response
 */
function clientReport(request, response)
{
  echo(getHeader());
  echo(getBody());
  echo(getFooter());
}
 
function getHeader()
{ 
  var html = new Array();
  
  html.push('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">');
  html.push('<head>');
  html.push('<title>Client feedback report</title>');
  
  // CSS
  
  // YUI
  html.push('<link rel="stylesheet" type="text/css" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/reset/reset-min.css" />');
  html.push('<link rel="stylesheet" type="text/css" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/datatable/assets/skins/sam/datatable.css" />');
  html.push('<link rel="stylesheet" type="text/css" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/calendar/assets/skins/sam/calendar.css" />');
  html.push('<link rel="stylesheet" type="text/css" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/button/assets/skins/sam/button.css" />');
  html.push('<link type="text/css" rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/autocomplete/assets/skins/sam/autocomplete.css">');
  
  // Custom
  // feedback_report.css
  html.push('<link rel="stylesheet" type="text/css" href="https://system.netsuite.com/core/media/media.nl?id=1464&c=720154&h=5d954ba80c6d8442ba63&_xt=.css" />');

  // SCRIPTS
  
  // YUI: Shared
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/yahoo-dom-event/yahoo-dom-event.js"></script>');
  
  // YUI: AutoComplete
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/datasource/datasource-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/connection/connection-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/animation/animation-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/json/json-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/autocomplete/autocomplete-min.js"></script>');
  
  // YUI: Calendar
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/calendar/calendar-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/element/element-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/container/container-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/menu/menu-min.js"></script>');
  html.push('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/button/button-min.js"></script>');
  
  // Custom
  html.push('<!-- sweet_date2_lib.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=1776&c=720154&h=15f122cb50fb7b0ea723&_xt=.js"></script>');
  html.push('<!-- client_feedback_report.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=1461&c=720154&h=c31e2c6fa77e4f0ae272&_xt=.js"></script>'); 
  html.push('<!-- calendar.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=250&c=720154&h=550258ecd230fad919a6&_xt=.js"></script>');
  
  html.push('</head>');
  html.push('<body class="yui-skin-sam">');
   
  return html.join("\n");
}

function getBody() 
{
  var html = new Array();
  
  html.push('    <div id="back-to-netsuite">');
  html.push('      &rarr; <a href="/app/center/card.nl">Go back</a>');
  html.push('    </div>');
  html.push('    <h1>Client feedback report</h1>');
  html.push('    ');
  html.push('    <div id="main">');
  html.push('      <div id="search-filters">');
  html.push('        ');
  
  // Buyer
  html.push("<fieldset>\n");
  html.push("  <legend>Buyer</legend>\n");
  html.push('  <div>' + "\n");
  html.push('   <input id="custentity_bo_buyer" name="custentity_bo_buyer" type="hidden" value="">');
  html.push('   <input id="buyer_field" name="buyer" type="text" value="">');
  html.push('   <div class="yui-skin-sam" id="buyer_autocomplete"></div>');
  html.push('   <div id="buyer_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'buyer_field\', \'custentity_bo_buyer\')">Clear</a></div>');
  html.push('   <div id="buyer-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  html.push("  </div>\n");
  html.push("</fieldset>\n");

  // Client Account
  html.push("<fieldset>\n");
  html.push("  <legend>Client Account</legend>\n");
  html.push('  <div>' + "\n");
  html.push('   <input id="parent" name="parent" type="hidden" value="">');
  html.push('   <input id="client_field" name="client" type="text" value="">');
  html.push('   <div class="yui-skin-sam" id="client_autocomplete"></div>');
  html.push('   <div id="client_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'client_field\', \'parent\')">Clear</a></div>');
  html.push('   <div id="client-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  html.push("  </div>\n");
  html.push("</fieldset>\n");

  // Course
  html.push("<fieldset>\n");
  html.push("  <legend>Course</legend>\n");
  html.push('  <div>' + "\n");
  html.push('   <input id="custentity_bo_course" name="custentity_bo_course" type="hidden" value="">');
  html.push('   <input id="course_field" name="client" type="text" value="">');
  html.push('   <div class="yui-skin-sam" id="course_autocomplete"></div>');
  html.push('   <div id="course_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'course_field\', \'custentity_bo_course\')">Clear</a></div>');
  html.push('   <div id="course-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  html.push("  </div>\n");
  html.push("</fieldset>\n");

  // Coach
  html.push("<fieldset>\n");
  html.push("  <legend>Coach</legend>\n");
  html.push('  <div>' + "\n");
  html.push('   <input id="custentity_bo_coach" name="custentity_bo_coach" type="hidden" value="">');
  html.push('   <input id="coach_field" name="coach" type="text" value="">');
  html.push('   <div class="yui-skin-sam" id="coach_autocomplete"></div>');
  html.push('   <div id="coach_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'coach_field\', \'custentity_bo_coach\')">Clear</a></div>');
  html.push('   <div id="coach-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  html.push("  </div>\n");
  html.push("</fieldset>\n");
  
  // Country
  html.push("<fieldset>\n");
  html.push("  <legend>Country</legend>\n");
  html.push('  <div>' + "\n");
  html.push('   <input id="custentity_bo_eventcountry" name="custentity_bo_eventcountry" type="hidden" value="">');
  html.push('   <input id="country_field" name="country" type="text" value="">');
  html.push('   <div class="yui-skin-sam" id="country_autocomplete"></div>');
  html.push('   <div id="country_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'country_field\', \'custentity_bo_eventcountry\')">Clear</a></div>');
  html.push('   <div id="country-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  html.push("  </div>\n");
  html.push("</fieldset>\n");
  
  // Booking
  html.push("<fieldset>\n");
  html.push("  <legend>Booking</legend>\n");
  html.push('  <div>' + "\n");
  html.push('   <input id="internalid" name="internalid" type="hidden" value="">');
  html.push('   <input id="job_field" name="job" type="text" value="">');
  html.push('   <div class="yui-skin-sam" id="job_autocomplete"></div>');
  html.push('   <div id="job_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'job_field\', \'internalid\')">Clear</a></div>');
  html.push('   <div id="job-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  html.push("  </div>\n");
  html.push("</fieldset>\n");

  // Start date
  html.push("<fieldset>\n");
  html.push("  <legend>Event date</legend>\n");  
  html.push('        <div class="search-filters-row">');
  html.push('          <div id="start-date">');
  html.push('            <select id="start-day" name="start-day">');
  html.push('              <option value="01">01</option>');
  html.push('              <option value="02">02</option>');
  html.push('              <option value="03">03</option>');
  html.push('              <option value="04">04</option>');
  html.push('              <option value="05">05</option>');
  html.push('              <option value="06">06</option>');
  html.push('              <option value="07">07</option>');
  html.push('              <option value="08">08</option>');
  html.push('              <option value="09">09</option>');
  html.push('              <option value="10">10</option>');
  html.push('              <option value="11">11</option>');
  html.push('              <option value="12">12</option>');
  html.push('              <option value="13">13</option>');
  html.push('              <option value="14">14</option>');
  html.push('              <option value="15">15</option>');
  html.push('              <option value="16">16</option>');
  html.push('              <option value="17">17</option>');
  html.push('              <option value="18">18</option>');
  html.push('              <option value="19">19</option>');
  html.push('              <option value="20">20</option>');
  html.push('              <option value="21">21</option>');
  html.push('              <option value="22">22</option>');
  html.push('              <option value="23">23</option>');
  html.push('              <option value="24">24</option>');
  html.push('              <option value="25">25</option>');
  html.push('              <option value="26">26</option>');
  html.push('              <option value="27">27</option>');
  html.push('              <option value="28">28</option>');
  html.push('              <option value="29">29</option>');
  html.push('              <option value="30">30</option>');
  html.push('              <option value="31">31</option>');
  html.push('            </select>  ');
  html.push('            <select id="start-month" name="start-month">');
  html.push('              <option value="01">01</option>');
  html.push('              <option value="02">02</option>');
  html.push('              <option value="03">03</option>');
  html.push('              <option value="04">04</option>');
  html.push('              <option value="05">05</option>');
  html.push('              <option value="06">06</option>');
  html.push('              <option value="07">07</option>');
  html.push('              <option value="08">08</option>');
  html.push('              <option value="09">09</option>');
  html.push('              <option value="10">10</option>');
  html.push('              <option value="11">11</option>');
  html.push('              <option value="12">12</option>');
  html.push('            </select>');
  html.push('            <input type="text" id="start-year" name="start-year" value="" size="4" />');
  html.push('          </div>');
  html.push('          <div id="end-date">');
  html.push('            <select id="end-day" name="end-day">');
  html.push('              <option value="01">01</option>');
  html.push('              <option value="02">02</option>');
  html.push('              <option value="03">03</option>');
  html.push('              <option value="04">04</option>');
  html.push('              <option value="05">05</option>');
  html.push('              <option value="06">06</option>');
  html.push('              <option value="07">07</option>');
  html.push('              <option value="08">08</option>');
  html.push('              <option value="09">09</option>');
  html.push('              <option value="10">10</option>');
  html.push('              <option value="11">11</option>');
  html.push('              <option value="12">12</option>');
  html.push('              <option value="13">13</option>');
  html.push('              <option value="14">14</option>');
  html.push('              <option value="15">15</option>');
  html.push('              <option value="16">16</option>');
  html.push('              <option value="17">17</option>');
  html.push('              <option value="18">18</option>');
  html.push('              <option value="19">19</option>');
  html.push('              <option value="20">20</option>');
  html.push('              <option value="21">21</option>');
  html.push('              <option value="22">22</option>');
  html.push('              <option value="23">23</option>');
  html.push('              <option value="24">24</option>');
  html.push('              <option value="25">25</option>');
  html.push('              <option value="26">26</option>');
  html.push('              <option value="27">27</option>');
  html.push('              <option value="28">28</option>');
  html.push('              <option value="29">29</option>');
  html.push('              <option value="30">30</option>');
  html.push('              <option value="31">31</option>');
  html.push('            </select>  ');
  html.push('            <select id="end-month" name="end-month">');
  html.push('              <option value="01">01</option>');
  html.push('              <option value="02">02</option>');
  html.push('              <option value="03">03</option>');
  html.push('              <option value="04">04</option>');
  html.push('              <option value="05">05</option>');
  html.push('              <option value="06">06</option>');
  html.push('              <option value="07">07</option>');
  html.push('              <option value="08">08</option>');
  html.push('              <option value="09">09</option>');
  html.push('              <option value="10">10</option>');
  html.push('              <option value="11">11</option>');
  html.push('              <option value="12">12</option>');
  html.push('            </select>');
  html.push('            <input type="text" id="end-year" name="end-year" value="" size="4" />');
  html.push('          </div>');  
  html.push("  </div>\n");
  html.push("</fieldset>\n");
  
  html.push('        <div class="search-filters-row">  ');
  html.push('          <button id="run-report-button" class="submit" onclick="runReport()">Run report</button>');
  html.push('        </div>');
  html.push('      </div><!-- Close: search-filters -->');
  
  html.push('      <div id="progressbar" style="display: none">');
  html.push('        <div id="loading">Loading...</div>');
  html.push('        <div id="progress-bar-container">');
  html.push('          <img id="progress-bar" src="https://netsuite.themindgym.com/reports/images/percentImage.png" alt="0%" class="percent-image" />');
  html.push('        </div>');
  html.push('      </div>');
  
  /*
  html.push('      ');
  html.push('      <div id="export" style="display: none">');
  html.push('        <form method="post" action="https://netsuite.themindgym.com/reports/generate_csv.php" id="export-form">');
  html.push('          <input type="hidden" id="export-data" name="export-data" value="" />');
  html.push('          <input type="hidden" id="export-fields" name="export-fields" value="" />');
  html.push('          <input type="hidden" id="export-label" name="export-label" value="client_feedback_report" />');
  html.push('          <a href="#" onclick="document.getElementById(\'export-form\').submit()">Export as CSV</a>');
  html.push('        </form>');
  html.push('      </div><!-- Close: export -->');
  html.push('      <div id="fail">');
  html.push('        Sorry - the feedback report could not contact Netsuite. <strong>Try refreshing the page.</strong>');
  html.push('      </div>');
  html.push('      ');
  */
  html.push('      <div id="container">');
  html.push('      </div>');
  html.push('    </div>');
  
  return html.join("\n");
}

function getFooter()
{ 
  var html = new Array();
  html.push('</body>');
  html.push('</html>'); 
  return html.join("\n");
}

/**
 * A simple alias to response.writeLine
 *
 * @method echo
 * @param {String} string
 */
function echo(string)
{
  response.writeLine(string);
}
