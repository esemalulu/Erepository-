function onAfterSubmit(type)
{

          var rec = nlapiLoadRecord( nlapiGetRecordType(), nlapiGetRecordId());

			var lineCount = rec.getLineItemCount('expense');
      		nlapiLogExecution('ERROR', 'lnecount', lineCount)

            var locArray = [];
            var deptArray = [];
            var classArray = [];


            for(var j=1; j <= lineCount; j++)
            {
                var getItemLocation = rec.getLineItemValue('expense', 'location', j);
                if(getItemLocation != '116')
                locArray.push(getItemLocation);
            }
      		nlapiLogExecution('ERROR', 'LOC ARRAY', locArray)

  
            for(var j=1; j <= lineCount; j++)
            {
                var getItemDept = rec.getLineItemValue('expense', 'department', j);
                if(getItemDept != '203')
                deptArray.push(getItemDept);
            }
      		nlapiLogExecution('ERROR', 'DEPT ARRAY', deptArray)

            for(var j=1; j <= lineCount; j++)
            {
                var getItemClass = rec.getLineItemValue('expense', 'class', j);
                if(getItemClass != '3')
                classArray.push(getItemClass);
            }

      		nlapiLogExecution('ERROR', 'CLASS ARRAY', classArray)
            if(locArray.length !== 0)
            {
              var locResult = !!locArray.reduce(function(a, b){ return (a === b) ? a : null; });
            }

            if(deptArray.length !== 0)
            {
              var depResult = !!deptArray.reduce(function(a, b){ return (a === b) ? a : null; });
            }

            if(classArray.length !== 0)
            {
              var classResult = !!classArray.reduce(function(a, b){ return (a === b) ? a : null; });
            }


      		nlapiLogExecution('ERROR', 'locResult', locResult)
      		nlapiLogExecution('ERROR', 'depResult', depResult)
      		nlapiLogExecution('ERROR', 'classResult', classResult)

            if((rec.getFieldValue('location') == '116' || rec.getFieldValue('location') == '435' || rec.getFieldValue('location') == '436') && locArray.length !== 0)
            {
                  if(locResult == true)
                  {
                    rec.setFieldValue('location', locArray[0]);
                  }
                  else
                  {
                    rec.setFieldValue('location', '6');
                  }
            }


            if(rec.getFieldValue('department') == '203' && deptArray.length !== 0)
            {
  				rec.setFieldValue('department', deptArray[0]);
            }
  
  

            if(rec.getFieldValue('class') == '3' && classArray.length !== 0)
            {
  				rec.setFieldValue('class', classArray[0]);
            }


			nlapiSubmitRecord(rec);


}







