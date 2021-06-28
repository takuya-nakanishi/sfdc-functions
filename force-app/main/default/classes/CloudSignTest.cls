@isTest
private class CloudSignTest {

  // 正常系
  @isTest static void test_getAccessToken_OK_01() {
    MFMock mock = new MFMock();
    String responseJson =
      '{' +
      '  "access_token": "token",' +
      '  "expires_in": 3600,' +
      '  "token_type": "Bearer"' +
      '}';
    mock.addResponse(200, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);
    // テスト開始
    Test.startTest();
    System.assertEquals('token', CloudSign.getAccessToken());
    Test.stopTest();  
  }

  // 正常系
  @isTest static void test_createCSDocument_OK_01() {
    MFMock mock = new MFMock();
    String responseJson =
      '{' +
      '  "id": "document_id"' +
      '}';
    mock.addResponse(200, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);
    // テスト開始
    Test.startTest();
    CloudSign.ContractResponse resData = CloudSign.createCSDocument('業務委託基本契約', 'テストメッセージ', 'token');
    System.assertEquals('document_id', resData.id);
    Test.stopTest();  
  }

  // 正常系
  @isTest static void test_addFile_OK_01() {
    MFMock mock = new MFMock();
    String responseJson =
      '{' +
      '  "id": "document_id"' +
      '}';
    mock.addResponse(200, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);
    // 連携用ファイル
    String fileName = 'テスト契約書.pdf';
    ContentVersion data = new ContentVersion(
      Title = fileName,
      PathOnClient = fileName,
      VersionData = Blob.valueOf('AAA')
    );
    insert data;
    // テスト開始
    Test.startTest();
    CloudSign.ContractResponse resData = CloudSign.addFile('sample_docid_xxx', data, 'sample_token_xxx');
    System.assertEquals('document_id', resData.id);
    Test.stopTest();  
  }

  // 正常系
  @isTest static void test_addParticipant_OK_01() {
    MFMock mock = new MFMock();
    String responseJson =
      '{' +
      '  "id": "document_id"' +
      '}';
    mock.addResponse(200, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);
    // テスト開始
    Test.startTest();
    CloudSign.ContractResponse resData = CloudSign.addParticipant('document_id', 'test@test.com', 'テスト 太郎', '株式会社テスト商事', 'token');
    System.assertEquals('document_id', resData.id);
    Test.stopTest();
  }

  // 正常系
  @isTest static void test_sendDocument_OK_01() {
    MFMock mock = new MFMock();
    String responseJson =
      '{' +
      '  "id": "document_id"' +
      '}';
    mock.addResponse(200, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);
    // テスト開始
    Test.startTest();
    CloudSign.ContractResponse resData = CloudSign.sendDocument('document_id', 'token');
    Test.stopTest();
    System.assertEquals('document_id', resData.id);
  }

  // 正常系
  @isTest static void test_deleteDocument_OK_01() {
    MFMock mock = new MFMock();
    String responseJson = '';
    mock.addResponse(204, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);
    // テスト開始
    Test.startTest();
    CloudSign.deleteDocument('document_id', 'token');
    Test.stopTest();
  }
}