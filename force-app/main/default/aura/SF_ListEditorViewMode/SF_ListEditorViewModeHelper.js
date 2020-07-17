({
	getColumnDefinitions: function (cmp, recordList) {
		var columns = [];
		var spinner = cmp.find('loadingSpinner');
		$A.util.removeClass(spinner, "slds-hide");
		// create a server side action.
		var action = cmp.get("c.getColumnInfo");
		action.setParams({
			"objectName": cmp.get('v.objectName'),
			"fields": cmp.get('v.fields')
		});

		// set a call back
		// 項目情報取得コールバック
		action.setCallback(this, function (a) {
			// store the response return value (wrapper class insatance)
			var result = a.getReturnValue();
			// console.log('result ---->' + JSON.stringify(result));
			// set the component attributes value with wrapper class properties.
			if (result && a.getState() === "SUCCESS") {
				// console.log('result: ' + JSON.stringify(result));
				var referFields = [];
				var addressFields = [];
				var uniqueFields = [];
				var percentFields = [];
				var pickListFields = [];

				// ligthtning:datatable -> columns 用に加工
				for (var i = 0; i < result.length; i++) {
					var column;
					// if data is reference then change type to url
					if (result[i].type.toLowerCase() == 'id' || result[i].type.toLowerCase() == 'reference') {
						result[i].type = 'url';
						referFields.push({
							originField: result[i].apiName,
							backgroundLink: 'refer' + result[i].typeAttribute.label.fieldName,
							displayField: result[i].typeAttribute.label.fieldName,
							referenceTo: result[i].referenceTo ? result[i].referenceTo : cmp.get('v.objectName')
						});
						result[i].apiName = 'refer' + result[i].typeAttribute.label.fieldName;
						// if data is address then change type to url and add background link to google map
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: result[i].typeAttribute,
							sortable: true
						};
					} else if (result[i].type.toLowerCase() == 'address') {
						result[i].type = 'url';
						addressFields.push(result[i].apiName);
						var labelValue = {
							fieldName: result[i].apiName
						};
						var typeAttribute = {
							target: '_self',
							label: labelValue
						};
						result[i].typeAttribute = typeAttribute;
						result[i].apiName = 'refer' + result[i].apiName;
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: result[i].typeAttribute,
							sortable: true
						};
					} else if (result[i].type.toLowerCase() == 'unique') {
						result[i].type = 'url';
						uniqueFields.push(result[i].apiName);
						result[i].apiName = 'refer' + result[i].apiName;
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: result[i].typeAttribute,
							sortable: true
						};
					} else if (result[i].type.toLowerCase() === 'percent') {
						// result[i].type = 'text';
						percentFields.push(result[i].apiName);
						result[i].apiName = 'per' + result[i].apiName;
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: {maximumFractionDigits: 10},
							sortable: true
						};
					} else if (result[i].type.toLowerCase() == 'date') {
						result[i].type = 'date-local';
						var typeAttribute = {
							timeZone: 'Asia/Tokyo',
							year: 'numeric',
							month: '2-digit',
							day: '2-digit'
						};
						result[i].typeAttribute = typeAttribute;
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: result[i].typeAttribute,
							sortable: true
						};
					} else if (result[i].type.toLowerCase() == 'datetime') {
						result[i].type = 'date';
						var typeAttribute = {
							timeZone: 'Asia/Tokyo',
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
							hour: '2-digit',
							minute: '2-digit',
							hour12: false
						};
						result[i].typeAttribute = typeAttribute;
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: result[i].typeAttribute,
							sortable: true
						};
					} else if (result[i].type.toLowerCase() == 'number' || result[i].type.toLowerCase() == 'currency') {
						var cellAttribute = {
							alignment: 'left'
						};
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							typeAttributes: result[i].typeAttribute,
							sortable: true,
							cellAttributes: cellAttribute
						};
					} else if (result[i].type.toLowerCase() == 'action') {
						column = {
							type: 'action',
							typeAttributes: result[i].typeAttribute
						};
					} else if (result[i].type.toLowerCase() === 'picklist') {
						pickListFields.push({
							"apiFieldName": result[i].apiName,
							"picklistOptions": result[i].picklistOptions
						});
						result[i].apiName = 'pick' + result[i].apiName;
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: result[i].type.toLowerCase(),
							sortable: true
						};
					} else if (result[i].type.toLowerCase() === 'boolean') {
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: 'boolean',
							sortable: true
						};
					} else {
						column = {
							label: result[i].label,
							fieldName: result[i].apiName,
							type: 'text',
							sortable: true
						};
					}
					columns.push(column);
				}

				var linksReferFieldsToFix = []
				// for all refer field, add 2 more columns: 1 label + 1 background link
				for (var j = 0; j < referFields.length; j++) {
					var referField = referFields[j];
					for (var i = 0; i < recordList.length; i++) {
						if (recordList[i][referField.originField]) {
                            // add column for background link
                            linksReferFieldsToFix.push(this.fixLink(
                                cmp,
                                recordList[i][referField.originField],
                                referField.referenceTo
                            ));
                        }
					}
				}

				// for all address fields, add more compound fields
				for (var j = 0; j < addressFields.length; j++) {
					var addressField = addressFields[j];
					// console.log('addressField: ' + addressField);
					var city = addressField.replace('Address', 'City');
					var state = addressField.replace('Address', 'State');
					var country = addressField.replace('Address', 'Country');
					var postalCode = addressField.replace('Address', 'PostalCode');
					var street = addressField.replace('Address', 'Street');
					for (var i = 0; i < recordList.length; i++) {
						if (recordList[i][addressField]) {
							var cityStr = '';
							var stateStr = '';
							var countryStr = '';
							var postalCodeStr = '';
							var streetStr = '';

							if (recordList[i][city]) {
								cityStr = recordList[i][city] + ', ';
							}
							if (recordList[i][state]) {
								stateStr = recordList[i][state] + ', ';
							}
							if (recordList[i][country]) {
								countryStr = recordList[i][country] + ', ';
							}
							if (recordList[i][postalCode]) {
								postalCodeStr = recordList[i][postalCode] + ', ';
							}
							if (recordList[i][street]) {
								streetStr = recordList[i][street] + ', ';
							}
							recordList[i][addressField] = postalCodeStr + countryStr + stateStr + cityStr + streetStr
							recordList[i]['refer' + addressField] = 'http:// google.com/maps/search/' + postalCodeStr + countryStr + stateStr + cityStr + streetStr
						}
					}
				}
				var linksUniqueFieldsToFixed = [];
				for (var j = 0; j < uniqueFields.length; j++) {
					for (var i = 0; i < recordList.length; i++) {
						// add column for background link
						linksUniqueFieldsToFixed.push(this.fixLink(
							cmp,
							recordList[i]['Id'],
							cmp.get('v.objectName')
						));
					}
				}
				// if there is unique field, then add referId column
				recordList.forEach(function (record) {
					percentFields.forEach(function (percentField) {
						record['per' + percentField] = record[percentField] / 100;
					});

					pickListFields.forEach(function (pickListField) {
						const originalValue = record[pickListField.apiFieldName];
						const option = pickListField.picklistOptions.find(opt => opt.value === originalValue);
						if (option) {
							record['pick' + pickListField.apiFieldName] = option.label;
						}
					});
				});

				var that = this;
				// var reverse = direct !== 'asc';
				// if (field != undefined && direct != undefined) {
				//   if(field.indexOf('refer') == 0) {
				//     field = field.replace('refer', '');
				//   }
				//   reverse = !reverse ? 1 : -1;
				//   recordList.sort(function(a, b) {
				//         if(a[field] == '' || a[field] == undefined) return 1;
				//         if(b[field] == '' || b[field] == undefined) return -1;
				//         return reverse * ((a[field] > b[field]) - (b[field] > a[field]));
				//   })
				// }

				// Set initial width
				Promise.all(linksUniqueFieldsToFixed).then($A.getCallback(function (urls) {
					// Name 項目
					for (var j = 0; j < uniqueFields.length; j++) {
						var uniqueField = uniqueFields[j];
						for (var i = 0; i < recordList.length; i++) {
							// add column for background link
							recordList[i]['refer' + uniqueField] = urls[i];
						}
					}
					return Promise.all(linksReferFieldsToFix);
				})).then($A.getCallback(function (urls) {
					// 参照項目
					for (var j = 0; j < referFields.length; j++) {
						var referField = referFields[j];
						for (var i = 0; i < recordList.length; i++) {
							if (recordList[i][referField.originField]) {
								// add column for background link
								recordList[i][referField.backgroundLink] = urls[(j * recordList.length + i)];
								// add column for display field
								var displayFields = referField.displayField.split('.');

								if (displayFields.length == 1) {
									recordList[i][referField.displayField] = recordList[i][displayFields[0]];
								} else if (displayFields.length == 2) {
									// console.log('fields: ' + displayFields);
									recordList[i][referField.displayField] = recordList[i][displayFields[0]][displayFields[1]];
								}
							}
						}
					}
				})).then($A.getCallback(function (result) {
					let dom = cmp.find('checkSizeBox').getElement();
					dom.classList.remove('slds-hide');
					let initWidthCols = that.getWidthCols(recordList, dom);
					dom.style.width = "100%";
					let widthBlank = dom.offsetWidth;
					dom.style.width = "auto";
					that.setWidthColumns(columns, initWidthCols, dom, widthBlank);
					dom.classList.add('slds-hide');
					cmp.set('v.data', recordList);
					cmp.set('v.rawData', recordList);
					cmp.set('v.columns', columns);
				}));
			}
			else if (state === "ERROR") {
				var errors = a.getError();
				console.error(errors);
			}
			$A.util.addClass(spinner, 'slds-hide');
		});
		// enqueue the action
		$A.enqueueAction(action);
	},

	getRelationshipName: function (cmp) {
		// console.log('getRelationshipName --> parentField: ' + cmp.get('v.parentField'));
		var action = cmp.get("c.getChildRelationshipName");
		action.setParams({
			"childObject": cmp.get('v.objectName'),
			"parentObject": cmp.get('v.parentObject'),
			"parentField": cmp.get('v.parentField'),
		});

		// set a call back
		action.setCallback(this, function (a) {
			// store the response return value (wrapper class insatance)
			var result = a.getReturnValue();
			// console.log('getRelationshipName: ' + result);
			// set the component attributes value with wrapper class properties.
			if (result && a.getState() === "SUCCESS") {
				var count = cmp.get('v.data').length;
				cmp.set('v.relationField', result);
			}
			// Dung chỉnh sửa
			else if (a.getState() === "ERROR") {
				var errors = a.getError();
				console.error(errors);
			}
		});
		// enqueue the action
		$A.enqueueAction(action);
	},

	getObjectLabel: function (cmp) {
		var action = cmp.get("c.getObjectLabel");
		action.setParams({
			"objectName": cmp.get('v.objectName'),
		});
		// set a call back
		action.setCallback(this, function (a) {
			// store the response return value (wrapper class insatance)
			var result = a.getReturnValue();
			// console.log('result ---->' + JSON.stringify(result));
			// set the component attributes value with wrapper class properties.
			if (result && a.getState() === "SUCCESS") {
				// var count = cmp.get('v.data').length;
				var hasMoreRecord = cmp.get("v.hasMoreRecord");
				var dataList = cmp.get("v.recordList");

				var lblRecShow = hasMoreRecord ? dataList.length + '+' : dataList.length;
				var defaultObjectLabel = cmp.get("v.defaultLabel");
				if (defaultObjectLabel !== "") {
					cmp.set("v.title", defaultObjectLabel + '（' + lblRecShow + '）');
				} else {
					cmp.set("v.title", result + '（' + lblRecShow + '）');
				}
				cmp.set("v.titleStyleClass", '');
				cmp.set('v.objectLabel', result);
			}
			else if (state === "ERROR") {
				var errors = a.getError();
				console.error(errors);
			}
		});
		// enqueue the action
		$A.enqueueAction(action);
	},

	getTabStyle: function (cmp) {
		var action = cmp.get("c.getTabStyle");
		action.setParams({
			"objectName": cmp.get('v.objectName'),
		});

		// set a call back
		action.setCallback(this, function (a) {
			// store the response return value (wrapper class insatance)
			var result = a.getReturnValue();
			// console.log('getTabStyle: result ---->' + JSON.stringify(result));
			if (result == '') {
				result = 'standard:custom';
			}
			// set the component attributes value with wrapper class properties.
			if (result && a.getState() === "SUCCESS") {
				cmp.set('v.iconName', result);
			}
			else if (state === "ERROR") {
				var errors = a.getError();
				console.error(errors);
			}
		});
		// enqueue the action
		$A.enqueueAction(action);
	},
	handleEditRow: function (cmp, event) {
		// console.log('into handleEditRow');
		var recordId = cmp.get('v.selectedRowId');
		var editRecordEvent = $A.get("e.force:editRecord");
		editRecordEvent.setParams({
			"recordId": recordId
		});
		editRecordEvent.fire();
	},
	handleDeleteRow: function (cmp) {
		// console.log('into handleDeleteRow');
		var recordId = cmp.get('v.selectedRowId');
		// console.log('handleDeleteRow recordId: ' + recordId);
		var action = cmp.get("c.deleteRelatedRecord");
		// console.log('action: ' + action);
		action.setParams({
			"recordId": recordId
		});
		// set a call back
		action.setCallback(this, function (a) {
			// store the response return value (wrapper class insatance)
			var result = a.getReturnValue();
			// set the component attributes value with wrapper class properties.
			if (result && a.getState() === "SUCCESS") {
				// console.log('deleted successfully');
				var compEvent = cmp.getEvent("refreshRecordList");
				compEvent.setParams({
					parentField: cmp.get('v.parentField'),
				});
				compEvent.fire();
			}
			else if (state === "ERROR") {
				var errors = a.getError();
				console.error(errors);
			}

		});
		// enqueue the action
		$A.enqueueAction(action);
	},
	getWidthCols: function (records, dom) {
		let widthCols = {};
		let widthCurrentField = 0;
		records.forEach(record => {
			for (var field in record) {
				if ((typeof record[field]) != 'object') {
					widthCurrentField = this.getWidthTextOnDOM(dom, record[field])
					if (widthCols[field]) {
						widthCols[field] = widthCurrentField > widthCols[field] ? widthCurrentField : widthCols[field];
					} else {
						widthCols[field] = widthCurrentField;
					}
				}
			}
		})
		return widthCols;
	},
	setWidthColumns: function (cols, widthCols, dom, widthBlank) {
		let fieldCompared = '';
		let widthLable = 0;
		cols.forEach(col => {

			fieldCompared = col.typeAttributes && col.typeAttributes.label ? col.typeAttributes.label.fieldName : col.fieldName;
			widthLable = this.getWidthTextOnDOM(dom, col.label);
			if (widthCols[fieldCompared]) {
				col.initialWidth = widthLable > widthCols[fieldCompared] ? widthLable : widthCols[fieldCompared];
			} else {
				col.initialWidth = widthLable;
			}
			widthBlank -= col.initialWidth;
		});
		if (widthBlank > 0) {
			cols[cols.length - 2].initialWidth = null;
		}
	},
	getWidthTextOnDOM: function (dom, text) {
		dom.innerHTML = text;
		return dom.offsetWidth + 50;
	},
	fixLink: function (cmp, recordId, objectName) {
		var navService = cmp.find("navService");
		// Sets the route to /lightning/o/Account/home
		var pageReference = {
			type: 'standard__recordPage',
			attributes: {
				objectApiName: objectName,
				actionName: 'view',
				recordId: recordId
			}
		};
		cmp.set("v.pageReference", pageReference);
		// Set the URL on the link or use the default if there's an error
		return navService.generateUrl(pageReference);
	}
})