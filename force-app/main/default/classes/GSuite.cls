public with sharing class GSuite {
    // GAS API Gateway (WebApp)
    private static String CLIENT_ID = '906619865042-4fs0vaisjclo0de3e3h7a485cljcgfji.apps.googleusercontent.com';
    private static String CLIENT_SECRET = 'rDQnbzZHEIpaEPUVIRajdgpK';
    private static String REDIRECT_URI = 'https://3a-inc.my.salesforce.com/apex/GSuiteRefreshToken';
    private static List<String> SCOPES = new List<String> {
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/script.external_request',
        'https://www.googleapis.com/auth/spreadsheets'
    };

    /**
     * GSuite API 通信でのエラー発生時に利用
     */
    public class GSuiteException extends Exception {
        public HttpResponse response;
        public String message;

        public GSuiteException(HttpResponse response, String message) {
            this.response = response;
            this.message = message;
        }
    }

    /**
     * パスワード認証用の画面URLを取得
     */
    @RemoteAction
    public static String getAuthenticationUrl() {
        String endPoint = 'https://accounts.google.com/o/oauth2/auth';
        List<String> params = new List<String> {
            'client_id=' + CLIENT_ID,
            'response_type=code',
            'scope=' + String.join(SCOPES, ' '),
            'redirect_uri=' + REDIRECT_URI,
            'access_type=offline',
            'prompt=consent'
        };
        return endPoint + '?' + String.join(params, '&');
    }

    /**
     * code から APIトークンを取得する
     * @param code コールバック時のURLパラメータ
     */
    @RemoteAction
    public static void setAccessTokenByCode(String code) {
        String endPoint = 'https://accounts.google.com/o/oauth2/token';
        List<String> params = new List<String> {
            'code=' + code,
            'client_id=' + CLIENT_ID,
            'client_secret=' + CLIENT_SECRET,
            'redirect_uri=' + REDIRECT_URI,
            'grant_type=authorization_code'
        };

        /** response_sample
        {
            "access_token": "xxxx",     // トークン
            "expires_in": 3599,             // 期限(秒)
            "refresh_token": "xxxx",    // リフレッシュトークン
            "scope": "scope_xxx scope_xxx", // スペースで結合されたSCOPE_URL
            "token_type": "Bearer"
        }
        */
        HttpResponse response = postAuthDataToGSuite(endPoint, params);
        Integer stNo = response.getStatusCode();

        // 成功 (status_no = 200)
        if (stNo == 200) {
            Map<String, Object> resMap = (Map<String, Object>) JSON.deserialize(response.getBody(), Map<String, Object>.class);
            String token = String.valueOf(resMap.get('access_token'));
            String refToken = String.valueOf(resMap.get('refresh_token'));
            Integer expiresIn = Integer.valueOf(resMap.get('expires_in'));
//#TODO カスタム設定へ保管

        }
        throw new GSuiteException(response, '');
    }

    /**
     * 期限切れのトークンをリフレッシュする
     * @param refToken リフレッシュトークン
     */
    public static void refreshAccessToken(String refToken) {
        String endPoint = 'https://www.googleapis.com/oauth2/v4/token';
        List<String> params = new List<String> {
            'refresh_token=' + refToken,
            'client_id=' + CLIENT_ID,
            'client_secret=' + CLIENT_SECRET,
            'grant_type=refresh_token'
        };

        /** response_sample
        {
            "access_token": "xxxx", // トークン
            "expires_in": 3599,         // 期限(秒)
            "scope": "scope_xxx scope_xxx", // スペースで結合されたSCOPE_URL
            "token_type": "Bearer"
        }
        */
        HttpResponse response = postAuthDataToGSuite(endPoint, params);
        Integer stNo = response.getStatusCode();

        // 成功 (status_no = 200)
        if (stNo == 200) {
            Map<String, Object> resMap = (Map<String, Object>) JSON.deserialize(response.getBody(), Map<String, Object>.class);
            String token = String.valueOf(resMap.get('access_token'));
            Integer expiresIn = Integer.valueOf(resMap.get('expires_in'));
//#TODO カスタム設定へ保管

        }
        throw new GSuiteException(response, '');
    }

    /**
     * コールアウト実行
     * @param endPoint
     * @param params
     */
    private static HttpResponse postAuthDataToGSuite(String endPoint, List<String> params) {
        Http h = new Http();
        HttpRequest req = new HttpRequest();
        req.setMethod('POST');
        req.setEndpoint(endPoint + '?' + String.join(params, '&'));
        req.setHeader('Content-Length', '0');
        return h.send(req);
    }

    /**
     * SES発注書帳票を取得
     * @param token
     */
    public static void createSESOrderPDF(String token) {
        String ssId = '1spAu_yaDjiHZ0e2EgcElUwuR7_hnkTwnzbcw3G12qGs';
        Map<String, String> postData = new Map<String, String> {
//#TODO
            '備考' => '',
            '小計' => '',
            '控除精算単位' => '',
            '控除精算単価' => '',
            '控除精算摘要' => '',
            '支払条件' => '',
            '案件名' => '',
            '消費税' => '',
            '発注先' => '',
            '発注単位' => '',
            '発注単価' => '',
            '発注摘要' => '',
            '発注数量' => '',
            '発注日' => '',
            '発注番号' => '',
            '納期' => '',
            '超過精算単位' => '',
            '超過精算単価' => '',
            '超過精算摘要' => ''
        };
        HttpResponse res = postDataToGSuite(ssId, postData, token);
        GasResponse resData = (GasResponse)JSON.deserialize(res.getBody(), GasResponse.class);
        Blob pdfData = EncodingUtil.base64Decode(resData.response.result);
//#TODO null -> 支払レコードID
        CommonUtil.createFileAndLink(pdfData, '発注書_xxxxxx.pdf', null);
    }

    /**
     * GAS Execution API へデータ送信
     * @param ssId
     * @param token
     * @param postData
     */
    private static HttpResponse postDataToGSuite(String ssId, Map<String, String> postData, String token) {
        Http h = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://script.googleapis.com/v1/scripts/' + ssId + ':run');
        req.setMethod('POST');
        req.setHeader('Authorization', 'Bearer ' + token);
        req.setHeader('Content-Type', 'application/json');
//#TODO
        req.setBody(
            '{' +
            '  "function": "doPost",' +
            '  "parameters": []' +
            '  "devMode": "false"' +
            '}'
        );
        return h.send(req);
    }

    private class GasResponse {
        public Boolean done {get; set;}
        public GasResponseData response {get; set;}
    }

    private class GasResponseData {
        public String result {get; set;}
    }
}