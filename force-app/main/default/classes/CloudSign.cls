public with sharing class CloudSign {
  // API情報
  private static Map<String, APIConfigByRequest__mdt> apiConfigMap = CommonUtil.getApiConfigMap();
  // 例外
  public class CSException extends Exception {}

  // 書類作成/宛先へ送信
  public static String publishSendContract(Id contractId, List<Id> contentVersionIds, String message) {
    Contract__c contract = [
      select Id, Name,
        Account__r.Name,
        Account__r.RecordType.DeveloperName,
        CustomerSignedId__r.Email,
        CustomerSignedId__r.Name
      from Contract__c
      where Id = :contractId
      limit 1
    ];

    String apiToken = getAccessToken();
    ContractResponse csRecord = createCSDocument(contract.Name, message, apiToken);

    for (ContentVersion pdfData : [
      select Title, VersionData
      from ContentVersion
      where Id in :contentVersionIds
      order by CreatedDate desc
      limit 1
    ]) {
      addFile(csRecord.id, pdfData, apiToken);
    }

    addParticipant(
      csRecord.id,
      contract.CustomerSignedId__r.Email,
      contract.CustomerSignedId__r.Name,
      contract.Account__r.Name,
      apiToken);
    sendDocument(csRecord.id, apiToken);
    return csRecord.id;
  }

  // APIトークン取得
  @TestVisible
  private static String getAccessToken() {
    APIConfigByRequest__mdt apiConfig = apiConfigMap.get('CS_TOKEN');
    String endPoint =
      apiConfig.APIConfigByService__r.BasicEndpoint__c +
      apiConfig.EndpointPath__c + '?client_id=' + apiConfig.APIConfigByService__r.CLIENT_ID__c;
    // リクエスト
    HttpRequest req = new HttpRequest();
    req.setMethod(apiConfig.HttpMethod__c);
    req.setEndpoint(endPoint);

    Http h = new Http();
    HttpResponse res = h.send(req);
    // 失敗時
    if (res.getStatusCode() != apiConfig.SuccessSTNo__c) {
      ErrorResponse resData = (ErrorResponse)JSON.deserialize(res.getBody(), ErrorResponse.class);
      throw getCSException(resData);
    }
    AccessTokenResponse resData = (AccessTokenResponse)JSON.deserialize(res.getBody(), AccessTokenResponse.class);
    return resData.access_token;
  }

  // 書類(ファイル挿入前)作成
  @TestVisible
  private static ContractResponse createCSDocument(String contractName, String message, String accessToken) {
    APIConfigByRequest__mdt apiConfig = apiConfigMap.get('CS_CREATE_DOCUMENTS');
    Map<String, String> reqBodyProperties = new Map<String, String> {
      'title' => contractName,  // 書類タイトル
      'message' => message,     // 確認依頼メールへの追加メッセージ
      'can_transfer' => 'false' // 受信者に転送を許可しない
    };
    return sendIntegrateRequest(apiConfig, null, reqBodyProperties, accessToken);
  }

  // 書類にファイルを追加
  @TestVisible
  private static ContractResponse addFile(String csRecordId, ContentVersion pdfData, String accessToken) {
    APIConfigByRequest__mdt apiConfig = apiConfigMap.get('CS_ADD_FILES');
    String endPoint = getEndPoint(apiConfig, csRecordId);
    Integer timeOut;
    if (apiConfig.TimeOut__c != null) {
      timeOut = Integer.valueOf(apiConfig.TimeOut__c * 1000);
    }
    // リクエスト
    // 第１引数がクラウドサイン上のファイル名になる
    Httpresponse res = MultiPartFormHandler.uploadFileToCloudSign(pdfData.Title, pdfData.Title + '.pdf', pdfData.VersionData, endPoint, timeOut, accessToken);
    // 失敗時
    if (res.getStatusCode() != apiConfig.SuccessSTNo__c) {
      ErrorResponse resData = (ErrorResponse)JSON.deserialize(res.getBody(), ErrorResponse.class);
      throw getCSException(resData);
    }
    return (ContractResponse)JSON.deserialize(res.getBody(), ContractResponse.class);
  }

  // 宛先を追加
  @TestVisible
  private static ContractResponse addParticipant(String csRecordId, String email, String name, String organization, String accessToken) {
    APIConfigByRequest__mdt apiConfig = apiConfigMap.get('CS_ADD_PARTICIPANTS');
    Map<String, String> reqBodyProperties = new Map<String, String> {
      'email' => email,               // 宛先のメールアドレス
      'name' => name,                 // 宛先の名前
      'organization' => organization, // 宛先の会社名
      'language_code' => 'ja'         // 受信者の言語設定
    };
    return sendIntegrateRequest(apiConfig, csRecordId, reqBodyProperties, accessToken);
  }

  // 書類を送信
  @TestVisible
  private static ContractResponse sendDocument(String csRecordId, String accessToken) {
    APIConfigByRequest__mdt apiConfig = apiConfigMap.get('CS_SEND_DOCUMENTS');
    return sendIntegrateRequest(apiConfig, csRecordId, null, accessToken);
  }

  // 書類を削除
  @TestVisible
  private static void deleteDocument(String csRecordId, String accessToken) {
    APIConfigByRequest__mdt apiConfig = apiConfigMap.get('CS_DELETE_DOCUMENTS');
    HttpRequest req = new HttpRequest();
    req.setMethod(apiConfig.HttpMethod__c);
    req.setEndpoint(getEndPoint(apiConfig, csRecordId));
    req.setHeader('Authorization', 'Bearer ' + accessToken);
    req.setHeader('Accept', '*/*');
    if (apiConfig.TimeOut__c != null) {
      req.setTimeOut(Integer.valueOf(apiConfig.TimeOut__c) * 1000);
    }
    Http h = new Http();
    HttpResponse res = h.send(req);
    // 失敗時
    if (res.getStatusCode() != apiConfig.SuccessSTNo__c) {
      ErrorResponse resData = (ErrorResponse)JSON.deserialize(res.getBody(), ErrorResponse.class);
      throw getCSException(resData);
    }
  }

  // x-www-form-urlencoded のリクエスト実行
  // ContractResponse 形式でレスポンスが返ってくるAPIの共通処理
  // BODY = 登録情報を key=value 形式の & 接続した情報
  private static ContractResponse sendIntegrateRequest(
    APIConfigByRequest__mdt apiConfig, String csRecordId, Map<String, String> reqBodyProperties, String accessToken) {
    HttpRequest req = new HttpRequest();
    req.setMethod(apiConfig.HttpMethod__c);
    req.setEndpoint(getEndPoint(apiConfig, csRecordId));
    req.setHeader('Authorization', 'Bearer ' + accessToken);
    req.setHeader('Accept', 'application/json');
    // 登録情報がある場合
    if (reqBodyProperties != null) {
      req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      String requestBody = '';
      for (String key : reqBodyProperties.keySet()) {
        String value = reqBodyProperties.get(key);
        if (String.isNotBlank(value)) {
          requestBody += key + '=' + EncodingUtil.urlEncode(value, 'UTF-8') + '&';
        }
      }
      req.setBody(requestBody);
    }
    // タイムアウト
    if (apiConfig.TimeOut__c != null) {
      req.setTimeOut(Integer.valueOf(apiConfig.TimeOut__c) * 1000);
    }
    Http h = new Http();
    HttpResponse res = h.send(req);
    // 失敗時
    if (res.getStatusCode() != apiConfig.SuccessSTNo__c) {
      ErrorResponse resData = (ErrorResponse)JSON.deserialize(res.getBody(), ErrorResponse.class);
      throw getCSException(resData);
    }
    return (ContractResponse)JSON.deserialize(res.getBody(), ContractResponse.class);
  }

  // エンドポイントを取得
  private static String getEndPoint(APIConfigByRequest__mdt apiConfig, String bindId) {
    String endPoint = apiConfig.APIConfigByService__r.BasicEndpoint__c + apiConfig.EndpointPath__c;
    if (String.isNotBlank(bindId)) {
      endPoint = String.format(endPoint, new List<String> {bindId});
    }
    return endPoint;
  }

  /**
   * 例外を取得
   * @param errorDetail 以下のJSONで共通
   *  {
   *    "error": "エラー件名",
   *    "message": "エラー詳細"
   *  }
   */
  private static CSException getCSException(ErrorResponse resData) {
    CSException result = new CSException();
    result.setMessage(resData.error + '\n' + resData.message);
    return result;
  }

  /**
   * API用ラッパークラス
   */
  // エラー時のレスポンス
  public class ErrorResponse {
    public String error {get; set;}
    public String message {get; set;}
  }

  // アクセストークンのレスポンス
  public class AccessTokenResponse {
    public String access_token {get; set;}
    public Integer expires_in {get; set;}
    public String token_type {get; set;}
  }

  // APIレスポンス
  public class ContractResponse {
    // 書類Id
    public String id {get; set;}
    // 添付ファイル
    public List<ContractFile> files {get; set;}
  }
  public class ContractFile {
    public String id {get; set;}
  }
}