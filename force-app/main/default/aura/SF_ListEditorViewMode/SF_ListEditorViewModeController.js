({
	init: function(cmp, event, helper) {
        var recordList = cmp.get('v.recordList');
        const isHaveNoError = cmp.get("v.isHaveNoError");
        let condition = cmp.get('v.conditionsFilterList');
        cmp.set('v.originCondition',condition);
		if (recordList.length > 0 && isHaveNoError) {
            helper.getColumnDefinitions(cmp, recordList);
            helper.getObjectLabel(cmp);
        	helper.getRelationshipName(cmp);
            helper.getTabStyle(cmp);
		} else {
            var defaultObjectLabel = cmp.get("v.defaultLabel");
            if (defaultObjectLabel !== "") {
                cmp.set("v.title",  defaultObjectLabel);
            }
        }
    },

    reloadData: function(cmp, event, helper) {
        var recordList = cmp.get('v.recordList');
        const isHaveNoError = cmp.get("v.isHaveNoError");
        if (isHaveNoError) {
            helper.getColumnDefinitions(cmp, recordList);
            helper.getObjectLabel(cmp);
            helper.getRelationshipName(cmp);
            helper.getTabStyle(cmp);
        }
    },

    refresh: function(cmp, event, helper) {
        var compEvent = cmp.getEvent("refreshRecordList");
        compEvent.fire();
    },

    updateColumnSorting: function(cmp, event, helper) {
        var fieldName;
        var temp = event.getParam('fieldName');
        var prefixes = ['refer','per','pick'];
        console.log('temp: ' + temp);
        cmp.set("v.sortedBy", temp);

        fieldName = temp;
        prefixes.some(prefix => {
            if (temp.indexOf(prefix) == 0) {
                fieldName = temp.slice(prefix.length);
                return true;
            }
        });

    	var sortDirection = event.getParam('sortDirection');
        cmp.set("v.sortedDirection", sortDirection);
        cmp.set('v.orderField',fieldName);
        cmp.set('v.isOrderDESC',sortDirection == 'desc');
    },

    handleRowAction: function(cmp, event, helper) {
    	var action = event.getParam('action');
        var row = event.getParam('row');
        var rows = cmp.get('v.rawData');
        var rowIndex = rows.indexOf(row);
        var recordId = rows[rowIndex]['Id'];
        cmp.set('v.selectedRowId', recordId);
        //console.log('recordId: ' + recordId);
        switch (action.name) {
            case 'edit':
                helper.handleEditRow(cmp,event);
                break;
            case 'delete':
                cmp.set("v.isOpen", true);
                break;
        }
    },

    deleteRecord: function(cmp, event, helper) {
        helper.handleDeleteRow(cmp);
        cmp.set("v.isOpen", false);
    },

    closeModel: function(component, event, helper) {
      component.set("v.isOpen", false);
    },

    navigateToListView: function(cmp, event, helper) {
        //console.log('into navigateToListView');
        window.open('/lightning/r/' + cmp.get('v.recordId') + '/related/' + cmp.get('v.relationField') + '/view','_top')
    },

    switchMode: function(cmp, event, helper) {
    	cmp.set('v.isEditMode',true);
    },

    addMode: function(cmp, event, helper) {
        var objectName = cmp.get('v.objectName');
        var parentField = cmp.get('v.parentField');
        var recordId = cmp.get('v.recordId');
        var objectDefaultValue = JSON.parse(cmp.get('v.defaultValueAddList'));
        objectDefaultValue[parentField] = recordId;
        var createObjectEvent = $A.get("e.force:createRecord");
        createObjectEvent.setParams({
            "entityApiName": objectName,
            "defaultFieldValues": objectDefaultValue
        });
        createObjectEvent.fire();
    },

    onChangeParent: function(cmp, event, helper) {
        var compEvent = cmp.getEvent("refreshRecordList");
        //console.log('parent field: ' + cmp.get('v.parentField'));
        compEvent.setParams({parentField: cmp.get('v.parentField')});
        compEvent.fire();
    },

    toggleFilterPopup: function(cmp,event,helper) {
        let isShowFilter = cmp.get('v.isShowFilter');
        cmp.set('v.isShowFilter',!isShowFilter);
    },

    setFilter: function(cmp,event,helper) {
        let conditionsFilterList = cmp.get('v.originCondition');
        let filterFields = cmp.get('v.filterFields');
        filterFields.forEach((field) => {
            if (conditionsFilterList && conditionsFilterList.trim()&&(field.value || field.minValue || field.maxValue)) conditionsFilterList+= ' AND ';
            if (field.hasTwoValue) {
                if (field.minValue) {
                    if (field.fieldType != 'DOUBLE') field.minValue = field.minValue.replace('/','-');
                    conditionsFilterList += ` ${field.fieldApiName} >= ${field.minValue}`;
                    if (field.maxValue) {
                        conditionsFilterList+=' AND ';
                    }
                }
                if (field.maxValue) {
                    if (field.fieldType != 'DOUBLE') field.maxValue = field.maxValue.replace('/','-');
                    conditionsFilterList += `${field.fieldApiName} <= ${field.maxValue}`;
                }
            } else {
                if (field.value) {
                    conditionsFilterList +=`${field.fieldApiName} = '${field.value}'`;
                }
            }
        })
        cmp.set('v.conditionsFilterList',conditionsFilterList);
        cmp.set('v.isShowFilter',false);
        var compEvent = cmp.getEvent("refreshRecordList");
        compEvent.fire();
    }
})