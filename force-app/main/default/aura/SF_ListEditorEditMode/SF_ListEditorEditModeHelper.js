({
	getRelatedListForEdit : function(component, objectName, fields, sObjectName, parentField, helper, event){
		var action = component.get("c.getRelatedList");
		var params = {
				"sObjectName": sObjectName,
				"objectName": objectName,
				"showFields": fields,
				"parentField" : parentField
		};
		
		action.setParams(params);
		action.setCallback(this, function(an) {
			var state = an.getState();
			if (state === "SUCCESS") {
				var returnValue=an.getReturnValue();
				component.set("v.relatedList", returnValue);
				if(!component.get('v.filterFields')) helper.buildFilterFields(component,returnValue);
				var records = component.get("v.recordList");
				component.set("v.requiredFields", returnValue.requiredFields);
				var rowsWithCells = helper.prepareRows(component,records, -1);
				var rowsLoad = component.get("v.rowsInit");
				var hasMoreRecord = component.get("v.hasMoreRecord");
				var lblRecShow = hasMoreRecord ? rowsLoad + '+' : rowsWithCells.length;
				var defaultObjectLabel = component.get("v.defaultLabel");
				if (defaultObjectLabel !== "") {
					component.set("v.title",  defaultObjectLabel + '（' + lblRecShow + '）');
				} else {
					component.set("v.title",  returnValue.labelName + '（' + lblRecShow + '）');
				}
				component.set("v.records", rowsWithCells);
				component.set("v.numbRecLoaded", rowsWithCells.length);
				component.set("v.defaultRecordTypeId", returnValue.defaultRecordTypeId);
				
				if(!parentField && returnValue.lstExtraFields.length > 0){
					component.set("v.parentField", returnValue.lstExtraFields[returnValue.lstExtraFields.length - 1]);
				}
			}
		});
		// enqueue the action 
		$A.enqueueAction(action);
	}	,
	cloneARow : function(component,event,helper,indexRow) {
        var rows = component.get("v.records");
        var newRow =  JSON.parse(JSON.stringify(component.get("v.records["+indexRow+"]")));
        newRow.DMLType='toInsert';
		newRow.Id = null;
		//let's link it to this this record .
		var parentField = component.get("v.parentField");
		newRow[parentField]=component.get("v.recordId");
		newRow=helper.tuneRowForUpdateableOnInsert(newRow);
		newRow=this.removeEncryptedFieldValue(newRow);
		rows.splice(indexRow + 1, 0, newRow);
        component.set("v.records", this.updateRowIndex(rows)); 
	},
	removeEncryptedFieldValue : function(row){
		for (let i = 0; i<row.cells.length; i++) {
			if(row.cells[i].fieldType == "ENCRYPTEDSTRING"){
				row.cells[i].value = "";
			}
		}
		return row;
	},
	prepareRows : function(component,rows, newRowIndex) {
		var rl = component.get("v.relatedList");
		var requiredFields = component.get("v.requiredFields");
		rows.forEach( function (row, rowIndex) {
			row.DMLType='toUpdate';
			row.isVisible=true;
			row.DMLError=false;
			//Build cells by matching layout columns and records returned by apex
			var cells = [];
			rl.lstObjectFields.forEach( function (field, colIndex) {
				var cell = {}
				var fieldApiNameSplit = field.fieldApiName.split('.');
				cell.value = row[fieldApiNameSplit[0]];
				cell.isEditable=true;
				for (var k=1; k < fieldApiNameSplit.length; k++){
					if (cell.value!=null) {
						cell.value=cell.value[fieldApiNameSplit[k]];
					}
					cell.isEditable=false;
				}

				cell.fieldApiName=field.fieldApiName;
				cell.format=field.format;
				cell.fieldType=field.fieldType;
				
				if(field.controlFieldName) {
					let controllingValue = row[field.controlFieldName];
					cell.picklistOptions = field.picklistDependencyOptions[controllingValue];
				} else {
					cell.picklistOptions = field.picklistOptions;
				}
				
				cell.relationship = field.relationship;
				cell.isVisible = field.isVisible;
				cell.isUpdateable = field.isUpdateable;
				cell.isCreateable = field.isCreateable;
				cell.UpdateableOnlyOnCreate = field.UpdateableOnlyOnCreate; 

				// If cell is nonupdateable
				if (!cell.isUpdateable) {
					cell.isEditable=false;
					if (cell.fieldType == 'DATETIME' && cell.value) {
						var strTargetDt = new Date(cell.value).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"});
						var targetDt = new Date(strTargetDt);
						var realMonth = targetDt.getMonth() + 1;
						cell.value = targetDt.getFullYear() + '/' + 
												realMonth.toString().padStart(2,"0") + '/' + 
												targetDt.getDate().toString().padStart(2,"0") + ' ' + 
												targetDt.getHours().toString().padStart(2,"0") + ':' + targetDt.getMinutes().toString().padStart(2,"0");
					}
				}

				if (newRowIndex >= 0) {
					if(cell.isCreateable && cell.fieldType !== 'ID') {
						cell.isEditable=true;
					}
					cell.rowIndex = newRowIndex;	
				} else {
					cell.rowIndex = rowIndex;
				}
				cell.colIndex = colIndex;

				if (field.htmlInputType != null){
					cell.inputMainType = field.htmlInputType.mainType;
					cell.inputSubType = field.htmlInputType.subType;
					cell.inputFormatType = field.htmlInputType.formatType;
					cell.inputScale = field.htmlInputType.scale;

					if (cell.inputMainType === 'calculated' || cell.fieldApiName === 'RecordTypeId') {
						cell.isEditable=false;
					}
				} else {
					cell.isEditable=false;
					cell.inputMainType='undefined';
				}
				cell.isRequired = requiredFields.some(field => field === cell.fieldApiName);
				
				cells.push(cell);
			});
			row.cells = cells;
		});
		return rows; 
	}, 
	addRow : function(component,event,helper) {
		var rl = component.get("v.relatedList"); 
		var rows = component.get("v.records");
		var parentField = component.get("v.parentField");
		var defaultRecordTypeId = component.get("v.defaultRecordTypeId");
		var defaultValueAddList = component.get("v.defaultValueAddList");
		try {
			var defaultValues = JSON.parse(defaultValueAddList);
		} catch (err) {
			var defaultValues = [];
		}

		var newRow = {};
		//let's simulate the retrieval of an empty record from apex.  
		for (var i = 0; i < rl.lstObjectFields.length; i++) {
				var field = rl.lstObjectFields[i];
				if (field.fieldApiName == 'OwnerId'){
					newRow[field.fieldApiName] = $A.get("$SObjectType.CurrentUser.Id");
				} else if (field.fieldType == "ID" || field.fieldType == "REFERENCE"){
					newRow[field.fieldApiName] = null;
				} else if (!field.isUpdateable){
					newRow[field.fieldApiName] = '';
				} else if (field.htmlInputType != null && field.htmlInputType.subType == "number"){
					newRow[field.fieldApiName] = 0;
				} else if (field.htmlInputType != null && field.htmlInputType.subType == "date"){
					newRow[field.fieldApiName] = '';
				} else if (field.fieldType == "DATETIME"){
					newRow[field.fieldApiName] = new Date().toISOString();
				} else {
					newRow[field.fieldApiName]='';
				}

				if (field.fieldApiName in defaultValues) {
					newRow[field.fieldApiName] = defaultValues[field.fieldApiName];
				} else if ('defaultValue' in field) {
					newRow[field.fieldApiName] = field.defaultValue;
				}

				newRow.RecordTypeId = defaultRecordTypeId;
		}
		//let's link it to this this record .
		newRow[parentField]=component.get("v.recordId");
		
		//let's prepare the row 
		var rowsWithCells = this.prepareRows(component,[newRow], rows.length);
		rowsWithCells[0].DMLType='toInsert';
		rowsWithCells[0]= this.tuneRowForUpdateableOnInsert(rowsWithCells[0]);
		rows=rows.concat(rowsWithCells);
		
		component.set("v.records",rows);
	},
	tuneRowForUpdateableOnInsert : function(row){
		for (var i=0; i<row.cells.length; i++) {
			if (row.cells[i].UpdateableOnlyOnCreate) {
				row.cells[i].isEditable = (row.DMLType=='toInsert') ? true : false;
			} else if(row.cells[i].fieldApiName === 'Id'){
				row.cells[i].value = '';
			}
			if (row.cells[i].fieldApiName !== 'Id' && !row.cells[i].isEditable && (row.cells[i].value ==='' || row.cells[i].value === null)) {
				/**
				 * No16
				 * Add ' && row.cells[i].isCreateable ' to if statement to use
				*/
				row.cells[i].isEditable = true;
			}
		}
		return row;
	},

	updateRowIndex: function (rows) {
		rows.forEach( function(row, rowIndex) {
			row.cells.forEach( function(cell) {
				cell.rowIndex = rowIndex;
			});
		});
		return rows;
	},
	
	tagRowForDeletion : function(component,indexRow) {
		var records = component.get("v.records");
		var newDMLType = records[indexRow].DMLType !== 'toInsert' ? 'toDelete' : 'doNothing';
		records[indexRow].DMLType = newDMLType;
		records[indexRow].isVisible = false;
		component.set("v.records", records);
	},
	
	prepareRecordsToSave : function(component,event,helper) {
		var rl = component.get("v.relatedList");
		var rows = component.get("v.records");
		var lstShowFieldFls = [];
		var savingRecords= { recUpdates : [], recInserts : [], recDeletes : []}; 
		// If list rows empty
		if (rows == null) {
			return null;
		}
		var recIndex = 0;
		var lstItemEmpty = [];
		var orderFieldWithPrefix = component.get("v.orderFieldWithPre");
		for (var i = 0; i < rows.length; i++) {
				var rec = {};
				rec.sobjectType = component.get("v.objectName");
				rec.Id=rows[i].Id;
				/* Valid blank record
				* No14
				* Set isBlank to true to use
				*/
				rows[i].isBlank = false
				for (var j = 0; j < rows[i].cells.length; j++) {
						if(rows[i].cells[j].value){
							rows[i].isBlank = false; 
						} 
							if (rows[i].cells[j].isUpdateable || (rows[i].cells[j].isCreateable 
										&& rows[i].DMLType =='toInsert')){
												
											if(i == 0) {
												lstShowFieldFls.push(rows[i].cells[j].fieldApiName);
											}
											
											rec[rows[i].cells[j].fieldApiName] = rows[i].cells[j].value;
											if (rows[i].cells[j].fieldType == 'DATETIME' 
															&& rows[i].cells[j].value != null){
													rec[rows[i].cells[j].fieldApiName] = rows[i].cells[j].value;
											}
											if (rows[i].cells[j].fieldType === 'TIME' && rows[i].cells[j].value !== null){
												var splValue = rows[i].cells[j].value.split(":");
												if (splValue.length === 2) {
													this.clearTimeSuffix(splValue);
													var newTime = splValue.join(':') + ":00.000";
													if (splValue[0].length === 1) {
														newTime = "0" + newTime;
													}
													rec[rows[i].cells[j].fieldApiName] = newTime;
												}
											}                      
											if (rows[i].cells[j].fieldApiName == 'OwnerId' 
															&& rows[i].cells[j].value == null){
													rec[rows[i].cells[j].fieldApiName] = $A.get("$SObjectType.CurrentUser.Id");
													component.set("v.records[" + i + "].cells[" + j + "].value", $A.get("$SObjectType.CurrentUser.Id"));  
											} 
							}	 
				}
				recIndex = recIndex + 1;
				
				// Only setting when the order field is existance.
				if(orderFieldWithPrefix !== ''){
					rec[orderFieldWithPrefix] = recIndex - 1;
				}
				
				//For records to insert, add the extra fields that are not on the layout 
				if (rows[i].DMLType =='toInsert') {
						for (var j = 0; j < rl.lstExtraFields.length; j++){
							rec[rl.lstExtraFields[j]] = rows[i][rl.lstExtraFields[j]]; 
						}
				}
				switch (rows[i].DMLType) {
						case 'toDelete':
								savingRecords.recDeletes.push(rec);
								break;
						case 'toUpdate':
								savingRecords.recUpdates.push(rec);
								break;
						case 'toInsert':
							if(!rows[i].isBlank) {
								savingRecords.recInserts.push(rec);
							}else{
								rows[i].DMLType = null;
							}
							break;
								
							
				}
		}
		// clean the records emty:
		if(lstItemEmpty.length >0){
			lstItemEmpty.sort(function(a,b){return b-a});
			for(var k = 0; k < lstItemEmpty.length; k++){
				rows.splice(lstItemEmpty[k],1);
			}
		}

		component.set("v.records", rows);
		component.set("v.fieldsFls", lstShowFieldFls);

		return savingRecords;
	},
	afterSaveCleaning : function(component,event,helper,saveResult) {
		var rows = component.get("v.records");
		var insertCount = 0;
		var updateCount=0;
		var deleteCount=0;
		var errorsCount = {insertErrors : 0, updateErrors : 0, deleteErrors : 0, totalErrors : 0}; 
		for (var i = 0; i < rows.length; i++) {
				rows[i].DMLError=false;  
				switch (rows[i].DMLType) {
						case 'toInsert':
								if (saveResult.insertResults[insertCount].isSuccess) {
										rows[i].Id = saveResult.insertResults[insertCount].id;
										rows[i].DMLType='toUpdate';
										rows[i].DMLError=false;
										rows[i]=helper.tuneRowForUpdateableOnInsert(rows[i]);
								} else {
										rows[i].DMLError=true;
										errorsCount.insertErrors++;
										rows[i].DMLMessage=saveResult.insertResults[insertCount].error; 
								}   
								insertCount++;
								break;
						case 'toDelete':
								if (!saveResult.deleteResults[deleteCount].isSuccess) {
										rows[i].DMLType = 'toUpdate';
										rows[i].DMLError = true;
										errorsCount.deleteErrors++;  
										rows[i].isVisible = true;
										rows[i].DMLMessage = saveResult.deleteResults[deleteCount].error;    
								} else{
										rows[i].DMLType='doNothing';  
								}    
								deleteCount++;
								break;
						case 'toUpdate':
								if (!saveResult.updateResults[updateCount].isSuccess) {
										rows[i].DMLError = true;
										errorsCount.updateErrors++;  
										rows[i].DMLMessage = saveResult.updateResults[updateCount].error;  
								}
								updateCount++;
				}  
		}
		//full refresh and rerender of "v.records" attribute
		component.set("v.records",rows);
		errorsCount.totalErrors = errorsCount.updateErrors + errorsCount.deleteErrors + errorsCount.insertErrors; 
		return errorsCount;
	},
	showToast : function(component, event, title, message, type) {
		var toastEvent = $A.get("e.force:showToast");
		toastEvent.setParams({
				"title": title,
				"message": message,
				"type" : type,
				"duration" : 4000
		});
		toastEvent.fire();
	},

  /*setVerticalTabIndex : function(cmp, helper){
			console.log('into setVerticalTabIndex');
			var tbodyElement = cmp.find('dataGridBody').getElement();
			var trElements = tbodyElement.querySelectorAll('tr');
			var tabindex;
			var inputElement; //act like last td
			var firstInPutElement;
			if(trElements)
			{	
				console.log('rows: ' + trElements.length);
				for(var j = 0; j < trElements.length; j++){
					var trElement = trElements[j];
					var tdElements = trElement.querySelectorAll('td .cSF_EditInputCmp .slds-form-element');
					var inputElements = [];
					console.log('cols: ' + tdElements.length);
					for(var k = 0; k < tdElements.length; k++){
                        //trElements.length * k + j +1: tabindex
                        //tdElements.length * j + k: index
                        var inputCmp = cmp.find("inputCmp")[tdElements.length * j + k];
    					inputCmp.updateTabIndexMethod(trElements.length * k + j +1);
					}
				}
			}
			//var spanTag = document.createElement("SPAN");
			//spanTag.setAttribute('tabindex', tabindex + 1);
			//spanTag.setAttribute("class", "dummySpan");
			//spanTag.onfocus = function(){firstInPutElement.focus()};
			//inputElement.parentElement.appendChild(spanTag);
	},
	
	removeVerticalTabIndex : function(cmp, helper){
		console.log('into removeVerticalTabIndex');
		var tbodyElement = cmp.find('dataGridBody').getElement();
		var trElements = tbodyElement.querySelectorAll('tr');
		var tdElement; //act like last td
		if(trElements)
		{
		  for(var j = 0; j < trElements.length; j++){
		    var trElement = trElements[j];
		    var tdElements = trElement.querySelectorAll('td input');
		    for(var k = 0; k < tdElements.length; k++){
		      tdElement = tdElements[k];
		      tdElement.removeAttribute('tabindex');
		    }
		  }
		}
		var dummySpan = tdElement.parentElement.querySelectorAll('.dummySpan')[0];
		dummySpan.removeAttribute('tabindex');
	},*/
	loadMoreRecord : function(component,event, helper) {
		var objectName = component.get('v.objectName');
		var fields = component.get('v.showFields');
		var rowsToLoad = component.get('v.rowsToLoad');
		var recordId = component.get('v.recordId');
		var sObjectName = component.get('v.parentObject');		
		var currRecords = component.get("v.records");
		var offset = currRecords.length;
		//var numbRecordLoad  = component.get("v.rowsToLoad");
		var parentField  = component.get("v.parentField");
		// var currentLoaded = component.get("v.numbRecLoaded");
		var conditionsFilterList = component.get('v.conditionsFilterList');

		var sortColName =  component.get("v.sortField");
		var sortDESC = component.get("v.isOrderDESC");

		// Incase load more than 1000 record.
		// if(currentLoaded + rowsToLoad > 1000){
		// 	rowsToLoad = 1000 - currentLoaded;
		// }

		var action = component.get("c.getRecordList");
		action.setParams({
				"objectName": objectName,
				"fields": fields,
				"limitRecs": rowsToLoad,
				"recordId": recordId,
				"sObjectName": sObjectName,
				"parentField": parentField,
				// "offset": currentLoaded,
				"offset": offset,
				"filter": conditionsFilterList,
				"isOrderDESC": sortDESC,
				"orderField": sortColName
	  });

		action.setCallback(this, function(response) {
				var state = response.getState();
				if (state === "SUCCESS") {
						let lstReturnValue = response.getReturnValue();				
						let rowsWithCells = helper.prepareRows(component,lstReturnValue.records, -1);
						// currentLoaded = currentLoaded + rowsWithCells.length;
						// component.set("v.numbRecLoaded", currentLoaded);
						currRecords = currRecords.concat(rowsWithCells);
						component.set("v.records", currRecords);
						component.set("v.hasMoreRecord", lstReturnValue.hasMoreRecord);
						// if (!lstReturnValue.hasMoreRecord) {
						// 	var btnLoadMore = component.find("btnLoadMore");
						// 	$A.util.addClass(btnLoadMore, "slds-hide");
						// }
				} else {
						console.log('Error: ' + response.getError());
				}	
				var spinner = component.find("loadingSpinner");
				$A.util.addClass(spinner, "slds-hide");
		});

		$A.enqueueAction(action);
	},
	getOrderFieldWithPrefix: function(component, objectName){
		var action = component.get("c.getOrderFieldWithPrefix");
		var params = {
				"objectName": objectName
		};
		
		action.setParams(params);
		action.setCallback(this, function(response) {
				var state = response.getState();
				if (state === "SUCCESS") {
						var returnValue = response.getReturnValue();
						component.set("v.orderFieldWithPre", returnValue);
			} else {
				console.log('Error: ' + response.getError());
			}

			var spinner = component.find("loadingSpinner");
			$A.util.addClass(spinner, "slds-hide");
		});
		// enqueue the action 
		$A.enqueueAction(action);
	},
	buildFilterFields: function(component,fields){
		//Build cells by matching layout columns and records returned by apex
		var cells = fields.lstObjectFields.map((field,i)=>{
			var cell = {}
			cell.label = field.fieldName;
			cell.isEditable=true;
			cell.value = null;
			cell.fieldApiName=field.fieldApiName;
			cell.format=field.format;
			cell.fieldType=field.fieldType;
			cell.picklistOptions = field.picklistOptions;
			cell.relationship = field.relationship;
			cell.hasTwoValue = false;
			if(field.fieldType == "DATE" || field.fieldType == "DATETIME" || field.fieldType == "DOUBLE"){
				cell.minValue = null;
				cell.hasTwoValue = true;
				cell.maxValue = null;
			}
			if (field.htmlInputType != null){
				cell.inputMainType = field.htmlInputType.mainType;
				cell.inputSubType = field.htmlInputType.subType;
				cell.inputFormatType = field.htmlInputType.formatType;
				cell.inputScale = field.htmlInputType.scale;

				if (cell.inputMainType === 'calculated' || cell.fieldApiName === 'RecordTypeId') {
					cell.isEditable=false;
				}
			} else {					
				cell.isEditable=false;
				cell.inputMainType='undefined';
			}
				return cell;
		});
		component.set('v.filterFields',cells);			
	},
	isLoading: function(component, isLoading){
		var spinner = component.find("loadingSpinner");
		if(isLoading){
			$A.util.removeClass(spinner, "slds-hide");
		}else{
			$A.util.addClass(spinner, "slds-hide");
		}
		
	},
	clearTimeSuffix: function(timeSplited){
		let newMin = parseInt(timeSplited[1]);
		let newHour = parseInt(timeSplited[0]);
		if(timeSplited[1].includes('PM')){
			newHour = newHour == 12 ? 0 : newHour + 12;
		}
		timeSplited[0] = newHour > 9 ? newHour.toString() :  '0' + newHour.toString();
		timeSplited[1] = newMin > 9 ? newMin.toString() :  '0' + newMin.toString();
	}
})