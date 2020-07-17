({

	doInit : function (component, event, helper){
		component.set("v.noPicklistMatch",!helper.isValueInPicklistOptions(component));
	},

	refresh : function (component, event, helper){
		//enable or disable the components
		helper.enableOrDisableFields(component);
	},

	initEditDataForm : function(component, event, helper) {
		helper.checkAndFormatTimeInput(component);
		component.set("v.noPicklistMatch",!helper.isValueInPicklistOptions(component));
	},

	onChange : function(component, event, helper) {
		// Incase not a textbox
		if (typeof(event.currentTarget.type) !== 'undefined'){
            component.set("v.value",event.currentTarget.value);
		} else {
			var valueChanged = component.get("v.value");
			// Checking by type
			var subType = component.get("v.subType");
			if(subType === 'tel'){
				var regexTel = RegExp(/^[0-9]{2,3}-[0-9]{0,4}-[0-9]{0,4}/);
				if(!regexTel.test(valueChanged) && valueChanged !==''){
					component.set('v.errorMsg', '電話番号形式で入力してください。');
					$A.util.addClass(component.find('myStandardInput'), 'slds-has-error');
				} else {
					component.set('v.errorMsg', '');
					$A.util.removeClass(component.find('myStandardInput'), 'slds-has-error');
				}
			} else if(subType === 'email'){
				var regexMail = RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
				if(!regexMail.test(valueChanged) && valueChanged !==''){
					component.set('v.errorMsg', 'メールアドレス形式で入力してください。');
				} else {
					component.set('v.errorMsg', '');
					$A.util.removeClass(component.find('myStandardInput'), 'slds-has-error');
				}
			} else if(subType === 'number'){
				var regexNumb = RegExp(/^(\+|-)?\d*\.?\d*$/);
				if(!regexNumb.test(valueChanged)){
					component.set('v.errorMsg', '半角数字で入力してください。 ');
					valueChanged = 0;
				} else {
					//Round with scale
					var currentScale = component.get("v.scale");
					valueChanged = Math.round(Number(valueChanged) * (1/currentScale))/(1/currentScale).toFixed(Math.log10(1/currentScale));
					component.set('v.errorMsg', '');
					$A.util.removeClass(component.find('myStandardInput'), 'slds-has-error');
				}
			} else if(subType === 'url'){
				var regexUrl = RegExp(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g);
				if(!regexUrl.test(valueChanged) && valueChanged !==''){
					component.set('v.errorMsg', 'URL形式で入力してください。');
				} else {
					component.set('v.errorMsg', '');
				}
			}
			component.set("v.value",valueChanged);
			$A.util.addClass(component.find('myStandardInput'), 'item-changed');
		}
		var fieldChangedEvent = $A.get("e.c:SF_EditInputChangeEvent");
		fieldChangedEvent.setParams({
			"fieldName" : component.get("v.name"),
			"fieldType" : component.get("v.type"),
			"rowIndex" :  component.get("v.rowIndex"),
			"newValue" : valueChanged
		});
		fieldChangedEvent.fire();
	},

	lostFocus : function(component) {
		if(component.get("v.subType") === "number" && component.get("v.value") === ''){
			component.set("v.value",0);
		}
	},

	clearText : function(component, event, helper) {
		if (event && typeof(event.currentTarget.type) !== 'undefined'){
			component.set("v.value",'');
			var subType = component.get("v.subType");
			if(subType === 'number'){
				component.set("v.value",null);
			}

			$A.util.addClass(component.find('myStandardInput'), 'item-changed');
			component.find('myStandardInput').focus();
			// var eventChange = component.getEvent('change');
			// eventChange.fire();
		}		
	},

	/*
    updateTabIndex: function(cmp, event){
    	console.log('into update tab index event');
    	var params = event.getParam('arguments');
    	if(params){
    		var tabIndex = params.tabIndex;
    		console.log('tabindex: ' + tabIndex);
    		cmp.set('v.tabIndex', tabIndex);
    	}
	}
	*/
})