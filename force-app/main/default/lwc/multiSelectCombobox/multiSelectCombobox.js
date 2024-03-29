import { LightningElement, api } from 'lwc';

export default class MultiSelectCombobox extends LightningElement {
  @api options;
  @api selectedValue;
  @api selectedValues = [];
  @api label;
  @api minChar = 2;
  @api disabled = false;
  @api multiSelect = false;
  @api placeholder;
  value;
  values = [];
  optionData;
  searchString;
  message;
  showDropdown = false;

  connectedCallback() {
    this.showDropdown = false;
    let optionData = this.options ? (JSON.parse(JSON.stringify(this.options))) : null;
    let value = this.selectedValue ? (JSON.parse(JSON.stringify(this.selectedValue))) : null;
    let values = this.selectedValues ? (JSON.parse(JSON.stringify(this.selectedValues))) : null;

    if (value || values) {
      let searchString;
      let count = 0;
      for (let i = 0; i < optionData.length; i++) {
        if (this.multiSelect) {
          if (values.includes(optionData[i].value)) {
            optionData[i].selected = true;
            count++;
          }
        } else {
          if (optionData[i].value == value) {
            searchString = optionData[i].label;
          }
        }
      }
      if (this.multiSelect) {
        this.searchString = count + ' Option(s) Selected';
      } else {
        this.searchString = searchString;
      }
    }
    this.value = value;
    this.values = values;
    this.optionData = optionData;
  }

  // added by Three-A Inc.
  @api get singleValue() {
    return this.value;
  }

  filterOptions(event) {
    this.searchString = event.target.value;
    if (this.searchString && this.searchString.length > 0) {
      this.message = '';
      if (this.searchString.length >= this.minChar) {
        let flag = true;
        for (let i = 0; i < this.optionData.length; i++) {
          if (this.optionData[i].label.toLowerCase().trim().startsWith(this.searchString.toLowerCase().trim())) {
            this.optionData[i].isVisible = true;
            flag = false;
          } else {
            this.optionData[i].isVisible = false;
          }
        }
        if (flag) {
          this.message = "No results found for '" + this.searchString + "'";
        }
      }
      this.showDropdown = true;
    } else {
      this.showDropdown = false;
    }
  }

  selectItem(event) {
    let selectedVal = event.currentTarget.dataset.id;
    if (selectedVal) {
      let count = 0;
      let options = JSON.parse(JSON.stringify(this.optionData));
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === selectedVal) {
          if (this.multiSelect) {
            if (this.values.includes(options[i].value)) {
              this.values.splice(this.values.indexOf(options[i].value), 1);
            } else {
              this.values.push(options[i].value);
            }
            options[i].selected = options[i].selected ? false : true;
          } else {
            this.value = options[i].value;
            this.searchString = options[i].label;
          }
        }
        if (options[i].selected) {
          count++;
        }
      }
      this.optionData = options;
      if (this.multiSelect)
        this.searchString = count + ' Option(s) Selected';
      if (this.multiSelect)
        event.preventDefault();
      else
        this.showDropdown = false;
    }
  }

  showOptions() {
    if (this.disabled == false && this.options) {
      this.message = '';
      this.searchString = '';
      let options = JSON.parse(JSON.stringify(this.optionData));
      for (let i = 0; i < options.length; i++) {
        options[i].isVisible = true;
      }
      if (options.length > 0) {
        this.showDropdown = true;
      }
      this.optionData = options;
    }
  }

  removePill(event) {
    let value = event.currentTarget.name;
    let count = 0;
    let options = JSON.parse(JSON.stringify(this.optionData));
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === value) {
        options[i].selected = false;
        this.values.splice(this.values.indexOf(options[i].value), 1);
      }
      if (options[i].selected) {
        count++;
      }
    }
    this.optionData = options;
    if (this.multiSelect)
      this.searchString = count + ' Option(s) Selected';
  }

  blurEvent() {
    let previousLabel;
    let count = 0;
    for (let i = 0; i < this.optionData.length; i++) {
      if (this.optionData[i].value === this.value) {
        previousLabel = this.optionData[i].label;
      }
      if (this.optionData[i].selected) {
        count++;
      }
    }

    if (this.multiSelect) {
      this.searchString = count + ' Option(s) Selected';
    } else {
      this.searchString = previousLabel;
    }

    this.showDropdown = false;

    this.dispatchEvent(new CustomEvent('select', {
      detail: {
        'payloadType': 'multi-select',
        'payload': {
          'value': this.value,
          'values': this.values
        }
      }
    }));
  }
}