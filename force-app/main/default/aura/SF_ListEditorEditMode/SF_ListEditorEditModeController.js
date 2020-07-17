({
	doInit: function(component, event, helper) {
	},
	reloadData : function(component, event, helper) {
		var spinner = component.find("loadingSpinner");
		$A.util.removeClass(spinner, "slds-hide");
		// console.log('hasMoreRecord: ' +component.get("v.hasMoreRecord"));
		// Load data related list:
		var objectName = component.get('v.objectName');
		var fields = component.get('v.showFields');
		var sObjectName = component.get('v.parentObject');
		var parentField = component.get('v.parentField');
	
		// Get related infor and setting data in grid
		helper.getRelatedListForEdit(component, objectName, fields, sObjectName, parentField, helper, event);
		helper.getOrderFieldWithPrefix(component, objectName);
		component.set("v.isUnsavedRecords",false);
	},
	refreshEditMode : function(component, event, helper){
		// console.log('refreshEditMode');
		// var btnLoadMore = component.find("btnLoadMore");
        // $A.util.removeClass(btnLoadMore, "slds-hide");
		var spinner = component.find("loadingSpinner");
		$A.util.removeClass(spinner, "slds-hide");
		// Reset all mode(tab, text)
		component.set("v.displayPicklistAsText", false);
		var relatedList = component.get("v.relatedList");
		var records = component.get("v.recordList");
		var rowsWithCells = helper.prepareRows(component,records, -1);
		var parentField = component.get("v.parentField");
		var rowsLoad = component.get("v.rowsInit");
		var hasMoreRecord = component.get("v.hasMoreRecord");
		var lblRecShow = hasMoreRecord ? rowsLoad + '+' : rowsWithCells.length;
		var defaultObjectLabel = component.get("v.defaultLabel");
        if (defaultObjectLabel !== "") {
            component.set("v.title",  defaultObjectLabel + '（' + lblRecShow + '）');
        } else {
            component.set("v.title",  relatedList.labelName + '（' + lblRecShow + '）');
        }
		component.set("v.records", rowsWithCells);
		component.set("v.isUnsavedRecords",false);
		component.set("v.displaySaveStatus",false);
		component.set("v.numbRecLoaded", rowsWithCells.length);
		if(!parentField && relatedList.lstExtraFields.length > 0){
			component.set("v.parentField", relatedList.lstExtraFields[relatedList.lstExtraFields.length - 1]);
		}
		$A.util.addClass(spinner, "slds-hide");
	},
	onFieldChange: function(component, event, helper) {
		if (event.getParam("fieldType") === "picklist" || event.getParam("fieldType") === "checkbox") {
			var columns = component.get("v.relatedList").lstObjectFields;
			var dependenField = columns.find( function(column) {
				return column.controlFieldName === event.getParam("fieldName");
			});

			if (dependenField) {
				var records = component.get("v.records");
				var rowIndex = event.getParam("rowIndex");
				var dependCellIndex = records[rowIndex].cells.findIndex( function(cell) {
					return cell.fieldApiName === dependenField.fieldApiName;
				});
				var newOptions = dependenField.picklistDependencyOptions[event.getParam("newValue")];

				records[rowIndex].cells[dependCellIndex].picklistOptions = newOptions;
				records[rowIndex].cells[dependCellIndex].value = '';
				component.set("v.records", records);
			}
		}
		component.set("v.displaySaveStatus",false);
		component.set("v.isUnsavedRecords",true); 
	},
	cloneRow: function(component, event, helper) { 
		var indexRow = event.getSource().get('v.value');
		helper.cloneARow(component,event,helper,indexRow);
		component.set("v.displaySaveStatus",false); 
		component.set("v.isUnsavedRecords",true); 
	},	   
	createRow: function(component, event, helper) { 
		helper.addRow(component,event,helper);
	},
	deleteRow: function(component, event, helper) {  
		var indexRow = event.getSource().get('v.value');
		helper.tagRowForDeletion(component,indexRow);  
		component.set("v.displaySaveStatus",false);
		component.set("v.isUnsavedRecords",true);  
	}, 
	menuClick:function(component,event, helper){
		var selectedMenuItemValue = event.getParam("value");

		if(selectedMenuItemValue==='save'){
			// var records = component.get("v.records");
			// console.log(JSON.parse(records));
		} else if(selectedMenuItemValue==='textMode'){
			var currentDisv = component.get('v.displayPicklistAsText');
			component.set('v.displayPicklistAsText', !currentDisv);
		} /*else if (selectedMenuItemValue==='tabMode'){
			var menuItem = component.find("tabModeItem");
			var status = menuItem.get("v.checked");

			// Toggle the icon.
			if(!status){
					helper.setVerticalTabIndex(component, helper);
			} else {
					helper.removeVerticalTabIndex(component, helper);
			}
			menuItem.set("v.checked", !status);
		}*/
	},
	moveToDetail : function(component, event){
		var recordId = event.getSource().get('v.value');
		window.open('/' + recordId);  

	},
	closeModal:function(component){    
		var cmpTarget = component.find('Modalbox');
		var cmpBack = component.find('Modalbackdrop');
		$A.util.removeClass(cmpBack,'slds-backdrop--open');
		$A.util.removeClass(cmpTarget, 'slds-fade-in-open'); 
	},
	loadMoreRecord:function(component, event, helper){
		var spinner = component.find("loadingSpinner");
		$A.util.removeClass(spinner, "slds-hide");
		helper.loadMoreRecord(component, event, helper);
	},
	sort : function(component, event, helper){
		var sortColName = event.currentTarget.dataset.colname;
		var sortDESC = component.get("v.isOrderDESC"),
		sortField = component.get("v.sortField"),
		sortDESC = (sortColName == sortField) ? !sortDESC : sortDESC;
		component.set("v.sortField", sortColName);
		component.set("v.isOrderDESC", sortDESC);
	},
	confirmModal: function(component, event, helper){
		if(component.get("v.isUnsavedRecords")){
			var cmpTarget = component.find('ModalConfirm');
			var cmpBack = component.find('ModalConfirmBackdrop');
			$A.util.addClass(cmpTarget, 'slds-fade-in-open');
			$A.util.addClass(cmpBack, 'slds-backdrop--open');
		} else {
			component.set('v.isEditMode',false);
		}
	},
	closeConfirmModal : function(component){
		var cmpTarget = component.find('ModalConfirm');
		var cmpBack = component.find('ModalConfirmBackdrop');
		$A.util.removeClass(cmpBack,'slds-backdrop--open');
		$A.util.removeClass(cmpTarget, 'slds-fade-in-open'); 
	},
	closeAllModal: function(component, event, helper){
		//Close the current confirm modal
		var cmpTarget = component.find('ModalConfirm');
		var cmpBack = component.find('ModalConfirmBackdrop');
		$A.util.removeClass(cmpBack,'slds-backdrop--open');
		$A.util.removeClass(cmpTarget, 'slds-fade-in-open');		

		//Close the edit modal
		component.set('v.isEditMode',false);
	},

	//DUC added
	dragstart: function(component, event, helper) {
			//console.log('dragstart->dragid: ' + event.target.dataset.dragId);
			component.set("v.dragid", event.target.dataset.dragId);
			event.dataTransfer.setData('Text', component.id);
	},
	drop: function(component, event, helper) {
			var oldIndex = component.get("v.dragid");
			//console.log('old index: ' + oldIndex);
			var newIndex = event.target.dataset.dragId;
			var pos = event.clientY;
			var target = event.target;
			//console.log('node type: ' + target.nodeName);

			var rect;
			if(target.nodeName == 'TD'){
				rect = target.firstChild.getBoundingClientRect();
			}	else if(target.nodeName == 'DIV') {
				rect = target.getBoundingClientRect();
			}

			if(pos > rect.bottom){
				//newIndex = parseInt(newIndex) + 1;
			} else if (pos < rect.top){
				newIndex = parseInt(newIndex) - 1;
			}

			//console.log('new index: ' + newIndex);

			if(newIndex && oldIndex){
				var values = component.get("v.records");

				while (newIndex < 0) {
					newIndex += values.length;
			}
				
				if (newIndex >= values.length) {
						var k = newIndex - values.length + 1;
						while (k--) {
								values.push(undefined);
						}
				}
				
				values.splice(newIndex, 0, values.splice(oldIndex, 1)[0]);
				component.set("v.records", values);
			}

			event.preventDefault();
	},	
	cancel: function(component, event, helper) {
			event.preventDefault();
	},
	mouseOverDragIcon: function(cmp, event, helper){
			var thisRow = event.currentTarget;
			var parentDiv = thisRow.parentElement.parentElement;
			parentDiv.setAttribute('draggable', true);
	},
	mouseOutDragIcon: function(cmp, event, helper){
			var thisRow = event.currentTarget;
			var parentDiv = thisRow.parentElement.parentElement;
			parentDiv.setAttribute('draggable', false);
	},
		//End DUC Added
	save: function(component, event, helper) {  
		//$A.util.removeClass(component.find("loadingSpinner"), "slds-hide");
		var spinner = component.find("loadingSpinner");
		$A.util.removeClass(spinner, "slds-hide");
		var lstTargetRecords = helper.prepareRecordsToSave(component,event,helper); 
		var parentField = component.get("v.parentField");
		var lstShowField = component.get("v.fieldsFls");
		var action = component.get("c.saveRecords");

		var params = {
			"sObjectName": component.get("v.parentObject"),
			"objectName": component.get("v.objectName"),
			"toUpdate": lstTargetRecords.recUpdates,
			"toInsert": lstTargetRecords.recInserts,
			"toDelete": lstTargetRecords.recDeletes,
			"recordId" : component.get("v.recordId"),
			"parentField" : parentField,
			"lstShowField" : lstShowField
		};
		action.setParams(params);
		action.setCallback(this, function(a) {
			var state = a.getState();
			if (state === "SUCCESS") {
				var ec = helper.afterSaveCleaning(component,event,helper,a.getReturnValue());
				component.set("v.displaySaveStatus",true);
				var spinner = component.find("loadingSpinner");
				$A.util.addClass(spinner, "slds-hide");
				if (ec.totalErrors!=0) {
					var msg = 'エラーで保存できなかったデータがあります。各行右端のエラーを確認ください。';
					helper.showToast(component,event,'',msg,'error');
				} else {
					//Close the edit modal
					component.set('v.displaySaveStatus',false);
					var objectLabelname = component.get("v.relatedList").labelName;
					helper.showToast(component,event,'',objectLabelname + 'が保存されました。','success');
					let refreshRecords = component.getEvent('refreshRecordList');
					component.set('v.isEditMode',false);
					refreshRecords.fire();
				}

				//if (!helper.isAnyVisibleRow(component)) component.set("v.displayCreateRowButton",true);
				//$A.get('e.force:refreshView').fire(); // Disabled because cause full component reload when component started from quick action.
			} else if (state === "ERROR") {
				var errors = a.getError();
				console.log(errors);
			}
			$A.util.addClass(component.find("loadingSpinner"), "slds-hide");   
		});

		$A.enqueueAction(action);		
	},
	showCreateRecordPopup: function(cmp,event,helper){
		let objectName = event.getParam('objectApiName');
		cmp.set('v.isCreateRecord',true);
		cmp.set('v.objectToCreate',objectName);
	},
	isLoading :function(cmp,event,helper){
		// helper.isLoading(cmp, cmp.get("v.isLoading"));
		if(cmp.get("v.isLoading")){
			helper.isLoading(cmp, true);
		}
	}
})