({
    isValueInPicklistOptions: function(component) {
        	var selectOptions = component.get("v.selectOptions");
        	var value = component.get("v.value");
    		if (typeof selectOptions !== 'undefined') {
            for (var i = 0; i < selectOptions.length; i++) {
                if (selectOptions[i].value == value) return true;
            }
          }
        return false;
    },    
    
    checkAndFormatTimeInput: function(component) {
        if(component.get('v.type') === 'time') {
            var value = component.get('v.value');
            if (value !== null) {
                var splValue = value.split(":");
                if (splValue[0].length === 1) {
                    value = "0" + value;
                }
                component.set('v.value', value);
            }
        }
    }, 
    
    enableOrDisableFields: function(component) {
        var allInputTypes = [];
        allInputTypes.push(component.find("myCheckbox"));
        allInputTypes.push(component.find("myPicklist"));
        //console.log(component.find("myPicklist").get());
        allInputTypes.push(component.find("myStandardInput"));
        //console.log(allInputTypes);
        for (var i = 0; i < allInputTypes.length; i++) {
            if (typeof allInputTypes[i] !== 'undefined' && typeof allInputTypes[i].getElement === 'function') {
                allInputTypes[i].getElement().disabled = component.get("v.disabled");
            }
        }
    }
})