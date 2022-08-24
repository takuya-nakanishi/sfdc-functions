import { LightningElement, track } from 'lwc';
import getOpps from '@salesforce/apex/AnkenKanriLogic.getOpps';

// 表示用
const cols = [
  { label: '案件名', fieldName: 'Name' },
  { label: '顧客名', fieldName: 'AccountName__c' },
  { label: '業界', fieldName: 'Industry__c' },
  { label: 'エリア', fieldName: 'Area__c' }
];

export default class CsvDownloader extends LightningElement {
  @track data;
  @track columns = cols;

  fieldMap;

  constructor() {
    super();
    this.getAnkenData();
    this.setFieldMap();
  }

  getAnkenData() {
    let fields = [];
    cols.forEach((col) => {
      fields.push(col.fieldName);
    });

    // 案件取得
    getOpps({
      fields: fields
    })
    .then((result) => {
      this.data = result;
    });
  }

  setFieldMap() {
    this.fieldMap = {};
    cols.forEach((col) => {
      this.fieldMap[col.fieldName] = col.label;
    });
  }

  downloadCSVFile() {
    let rowEnd = '\n';

    // ヘッダー
    let csvRows = [
      this.formatRow(Object.values(this.fieldMap))
    ];

    for (let i = 0; i < this.data.length; i++) {
      let record = this.data[i];
      let newRow = [];

      Object.keys(this.fieldMap).forEach((field) => {
        newRow.push(record[field]);
      });
      csvRows.push(this.formatRow(newRow));
    }

    let csvString = csvRows.join(rowEnd);
    // Creating anchor element to download
    let downloadElement = document.createElement('a');
    // This  encodeURI encodes special characters, except: , / ? : @ & = + $ # (Use encodeURIComponent() to encode these characters).
    downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvString);
    downloadElement.target = '_self';
    // CSV File Name
    downloadElement.download = 'Account Data.csv';
    // below statement is required if you are using firefox browser
    document.body.appendChild(downloadElement);
    // click() Javascript function to download CSV file
    downloadElement.click();
  }

  formatRow(row) {
    let result = [];
    row.forEach((col) => {
      if (!col) {
        col = '';
      }
      col = '"' + col + '"';
      result.push(col);
    });
    return result.join(',');
  }
}