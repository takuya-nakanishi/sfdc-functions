@isTest
private class CloudSignFlowHandlerTest {

  @isTest static void test_sendContract_01() {
    MFMock mock = new MFMock();
    // トークン
    mock.addResponse(200,
      '{' +
      '  "access_token": "token",' +
      '  "expires_in": 3600,' +
      '  "token_type": "Bearer"' +
      '}');
    // CSレコード作成
    mock.addResponse(200,
      '{' +
      '  "id": "document_id"' +
      '}');
    // ファイル追加
    mock.addResponse(200,
      '{' +
      '  "id": "document_id"' +
      '}');
    // 宛先追加
    mock.addResponse(200,
      '{' +
      '  "id": "document_id"' +
      '}');
    // 送信
    mock.addResponse(200,
      '{' +
      '  "id": "document_id"' +
      '}');

    // データ作成
    Account acc = new Account(
      Name = 'テスト商事'
    );
    insert acc;

    Contact con = new Contact(
      LastName = 'テスト',
      FirstName = '太郎',
      Email = 'test@test.com',
      AccountId = acc.Id
    );
    insert con;

    Contract__c contract = new Contract__c(
      Account__c = acc.Id,
      CustomerSignedId__c = con.Id,
      Name = 'テスト商事様_基本契約',
      RecordTypeId = sObjectType.Contract__c.getRecordTypeInfosByDeveloperName().get('BasicContract').getRecordTypeId()
    );
    insert contract;

    // ファイル作成
    ContentVersion file = CommonUtil.createFileAndLink(
      Blob.valueOf('AAA'), '基本契約書.pdf', contract.Id, 'I', 'AllUsers');

    // テスト開始
    Test.setMock(HttpCalloutMock.class, mock);
    Test.startTest();
    List<CloudSignFlowHandler.FlowData> dataList = new List<CloudSignFlowHandler.FlowData>();
    CloudSignFlowHandler.FlowData data = new CloudSignFlowHandler.FlowData();
    data.execute_id = 'send_contract';
    data.recordId = contract.Id;
    data.contentVersionIds = file.Id;
    dataList.add(data);
    CloudSignFlowHandler.execute(dataList);
    Test.stopTest();
  }
}