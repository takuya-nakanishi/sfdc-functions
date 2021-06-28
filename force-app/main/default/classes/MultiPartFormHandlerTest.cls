@isTest
private class MultiPartFormHandlerTest {

  // 正常系
  @isTest static void test_uploadFileToCloudSign_OK_01() {
    MFMock mock = new MFMock();
    String responseJson = '{"id":"xxx"}';
    mock.addResponse(200, responseJson);
    Test.setMock(HttpCalloutMock.class, mock);

    String contractName = 'テスト契約書';
    String fileName = 'CONTRACT_202012.pdf';
    Blob fileData = Blob.valueOf('AAA');
    String endPoint = 'https://api.cloudsign.jp/documents/sampld_docid_xxx/files';
    Integer timeOut = 10 * 1000;
    String accessToken = 'sample_token_xxx';
    // テスト開始
    Test.startTest();
    System.assertNotEquals(null, MultiPartFormHandler.uploadFileToCloudSign(contractName, fileName, fileData, endPoint, timeOut, accessToken));
    Test.stopTest();
  }

  // 正常系
  @isTest static void test_safelyPad_OK_01() {
    Test.startTest();
    System.assertNotEquals(null, MultiPartFormHandler.safelyPad('xxx', 'abc123=', '\r\n'));
    Test.stopTest();
  }

  // 正常系
  @isTest static void test_writeBoundary_OK_01() {
    Test.startTest();
    System.assertNotEquals(null, MultiPartFormHandler.writeBoundary());
    Test.stopTest();
  }

  // 正常系
  @isTest static void test_writeBoundary_OK_02() {
    Test.startTest();
    System.assertNotEquals(null, MultiPartFormHandler.writeBoundary(MultiPartFormHandler.EndingType.Cr));
    System.assertNotEquals(null, MultiPartFormHandler.writeBoundary(MultiPartFormHandler.EndingType.None));
    Test.stopTest();
  }

  // 正常系
  @isTest static void test_writeBodyParameter_OK_01() {
    Test.startTest();
    System.assertNotEquals(null, MultiPartFormHandler.writeBodyParameter('name', 'テスト契約書'));
    Test.stopTest();
  }

  // 正常系
  @isTest static void test_writeFileBody_OK_01() {
    System.assertNotEquals(null, MultiPartFormHandler.writeFileBody('uploadfile', Blob.valueOf('AAA'), 'テスト契約書.pdf'));
  }
}