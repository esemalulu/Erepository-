/**
 * Display UI for course feedback report
 *
 * @method courseReport
 * @param {Object} request
 * @param {Object} response
 */
function courseReport(request, response)
{
  echo(getHeader());
  echo(getBody());
  echo(getFooter()); 
}              
 
function getHeader()
{ 
  var html = new Array();
  
  html.push('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">');
  html.push('<html>');
  html.push('<head>');
  html.push('<title>Course feedback report</title>');
  html.push('<link type="text/css" rel="stylesheet" href="https://netsuite.themindgym.com/yui/2.5.2/build/datatable/assets/skins/sam/datatable.css" />');
  html.push('<link rel="stylesheet" type="text/css" href="https://netsuite.themindgym.com/yui/2.5.2/build/calendar/assets/skins/sam/calendar.css" />');
  html.push('<link rel="stylesheet" type="text/css" href="https://netsuite.themindgym.com/yui/2.5.2/build/button/assets/skins/sam/button.css" />');
  html.push('<style type="text/css">');
  html.push('@import "https://netsuite.themindgym.com/reports/css/feedback_report.css";');
  html.push('</style>');
  html.push('<!-- yui_report_combo.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=296&c=720154&h=480acce3cff5bb63db4e&_xt=.js"></script>');
  html.push('<!-- async_manager.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=289&c=720154&h=3b1b8ff4d9d5af353ef6&_xt=.js"></script>');    
  html.push('<!-- course_feedback_report.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=249&c=720154&h=e67f92687d4340f202ff&_xt=.js"></script>');    
  html.push('<!-- calendar.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=250&c=720154&h=550258ecd230fad919a6&_xt=.js"></script>');
  html.push('<!-- progress_bar.js --><script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=290&c=720154&h=ad0ac249d37e391d1ec5&_xt=.js"></script>');    

  html.push('</head>');
  html.push('<body class="yui-skin-sam">');
  
  var output = '';
  
  for(line in html) {
    output += html[line] + "\n";
  }
  
  return output;
}

function getBody() 
{
  var html = new Array();

  html.push('    <div id="back-to-netsuite">');
  html.push('      &rarr; <a href="https://system2.netsuite.com/app/center/card.nl">Back to Netsuite</a>');
  html.push('    </div>');  
  html.push('    <h1>Course feedback report</h1>');
  html.push('    ');
  html.push('    <div id="main">');
  html.push('      <div id="search-filters">');
  html.push('        ');
  html.push('        <div class="search-filters-row">');
  html.push('          <select id="custentity_bo_coach" name="custentity_bo_coach" style="width: 20em" disabled="true">');
  html.push('            <option value="">All coaches</option>');
  html.push('          </select>');
  html.push('          <select id="course_group" name="course_group" style="width: 20em" disabled="true">');
  html.push('            <option value="">All course groups</option>');
  html.push('          </select>');
  html.push('          <select id="custentity_bo_course" name="custentity_bo_course" style="display: none; width: 20em" disabled="true">');
  html.push('            <option value="">All courses</option>');
  html.push('          </select>');
  html.push('        </div>');
  html.push('        ');
  html.push('        <div class="search-filters-row">');
  html.push('          <div id="start-date">');
  html.push('            <select id="start-day" name="start-day">');
  html.push('            	<option value="01">01</option>');
  html.push('            	<option value="02">02</option>');
  html.push('            	<option value="03">03</option>');
  html.push('            	<option value="04">04</option>');
  html.push('            	<option value="05">05</option>');
  html.push('            	<option value="06">06</option>');
  html.push('            	<option value="07">07</option>');
  html.push('            	<option value="08">08</option>');
  html.push('            	<option value="09">09</option>');
  html.push('            	<option value="10">10</option>');
  html.push('            	<option value="11">11</option>');
  html.push('            	<option value="12">12</option>');
  html.push('            	<option value="13">13</option>');
  html.push('            	<option value="14">14</option>');
  html.push('            	<option value="15">15</option>');
  html.push('            	<option value="16">16</option>');
  html.push('            	<option value="17">17</option>');
  html.push('            	<option value="18">18</option>');
  html.push('            	<option value="19">19</option>');
  html.push('            	<option value="20">20</option>');
  html.push('            	<option value="21">21</option>');
  html.push('            	<option value="22">22</option>');
  html.push('            	<option value="23">23</option>');
  html.push('            	<option value="24">24</option>');
  html.push('            	<option value="25">25</option>');
  html.push('            	<option value="26">26</option>');
  html.push('            	<option value="27">27</option>');
  html.push('            	<option value="28">28</option>');
  html.push('            	<option value="29">29</option>');
  html.push('            	<option value="30">30</option>');
  html.push('            	<option value="31">31</option>');
  html.push('            </select>  ');
  html.push('        ');
  html.push('            <select id="start-month" name="start-month">');
  html.push('            	<option value="01">01</option>');
  html.push('            	<option value="02">02</option>');
  html.push('            	<option value="03">03</option>');
  html.push('            	<option value="04">04</option>');
  html.push('            	<option value="05">05</option>');
  html.push('            	<option value="06">06</option>');
  html.push('            	<option value="07">07</option>');
  html.push('            	<option value="08">08</option>');
  html.push('            	<option value="09">09</option>');
  html.push('            	<option value="10">10</option>');
  html.push('            	<option value="11">11</option>');
  html.push('            	<option value="12">12</option>');
  html.push('            </select>');
  html.push('        ');
  html.push('      			<input type="text" id="start-year" name="start-year" value="" size="4" />');
  html.push('    	    </div>');
  html.push('          <div id="end-date">');
  html.push('            <select id="end-day" name="end-day">');
  html.push('            	<option value="01">01</option>');
  html.push('            	<option value="02">02</option>');
  html.push('            	<option value="03">03</option>');
  html.push('            	<option value="04">04</option>');
  html.push('            	<option value="05">05</option>');
  html.push('            	<option value="06">06</option>');
  html.push('            	<option value="07">07</option>');
  html.push('            	<option value="08">08</option>');
  html.push('            	<option value="09">09</option>');
  html.push('            	<option value="10">10</option>');
  html.push('            	<option value="11">11</option>');
  html.push('            	<option value="12">12</option>');
  html.push('            	<option value="13">13</option>');
  html.push('            	<option value="14">14</option>');
  html.push('            	<option value="15">15</option>');
  html.push('            	<option value="16">16</option>');
  html.push('            	<option value="17">17</option>');
  html.push('            	<option value="18">18</option>');
  html.push('            	<option value="19">19</option>');
  html.push('            	<option value="20">20</option>');
  html.push('            	<option value="21">21</option>');
  html.push('            	<option value="22">22</option>');
  html.push('            	<option value="23">23</option>');
  html.push('            	<option value="24">24</option>');
  html.push('            	<option value="25">25</option>');
  html.push('            	<option value="26">26</option>');
  html.push('            	<option value="27">27</option>');
  html.push('            	<option value="28">28</option>');
  html.push('            	<option value="29">29</option>');
  html.push('            	<option value="30">30</option>');
  html.push('            	<option value="31">31</option>');
  html.push('            </select>  ');
  html.push('        ');
  html.push('            <select id="end-month" name="end-month">');
  html.push('            	<option value="01">01</option>');
  html.push('            	<option value="02">02</option>');
  html.push('            	<option value="03">03</option>');
  html.push('            	<option value="04">04</option>');
  html.push('            	<option value="05">05</option>');
  html.push('            	<option value="06">06</option>');
  html.push('            	<option value="07">07</option>');
  html.push('            	<option value="08">08</option>');
  html.push('            	<option value="09">09</option>');
  html.push('            	<option value="10">10</option>');
  html.push('            	<option value="11">11</option>');
  html.push('            	<option value="12">12</option>');
  html.push('            </select>');
  html.push('        ');
  html.push('      			<input type="text" id="end-year" name="end-year" value="" size="4" />');
  html.push('    	    </div>');
  html.push('    	  </div>');
  html.push('    	  ');
  html.push('    	  <div class="search-filters-row">  ');
  html.push('          <button id="run-report-button" class="submit-disabled" onclick="runCourseFeedbackReport()" disabled="true">Run report</button>');
  html.push('        </div>');
  html.push('      ');
  html.push('      </div><!-- Close: search-filters -->');
  html.push('    ');
  html.push('      <div id="loading">');
  html.push('        Loading form controls (hold tight)');
  html.push('      </div>');
  html.push('      ');
  html.push('      <div id="progress-bar-container">');
  html.push('        <img id="progress-bar" src="https://netsuite.themindgym.com/reports/images/percentImage.png" alt="0%" class="percent-image" />        ');
  html.push('      </div>');
  html.push('            ');
  html.push('      <div id="export" style="display: none">');
  html.push('        <form method="post" action="https://netsuite.themindgym.com/reports/generate_csv.php" id="export-form">');
  html.push('          <input type="hidden" id="export-data" name="export-data" value="" />');
  html.push('          <input type="hidden" id="export-fields" name="export-fields" value="" />');
  html.push('          <input type="hidden" id="export-label" name="export-label" value="course_feedback_report" />          ');
  html.push('          <a href="#" onclick="document.getElementById(\'export-form\').submit()">Export as CSV</a>');
  html.push('        </form>');
  html.push('      </div><!-- Close: export -->  	');
  html.push('            ');
  html.push('      <div id="fail">');
  html.push('        Sorry - the feedback report could not contact Netsuite. <strong>Try refreshing the page.</strong>');
  html.push('      </div>');
  html.push('      ');
  html.push('      <div id="data-table">');
  html.push('      </div>');
  html.push('    </div>');
    
  var output = '';
  
  for(line in html) {
    output += html[line] + "\n";
  }
  
  return output;
}

function getFooter()
{ 
  var html = new Array();
  html.push('</body>');
  html.push('</html>'); 
  
  var output = '';
  
  for(line in html) {
    output += html[line] + "\n";
  }
  
  return output;
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