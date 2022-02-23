/**
 * Slack の chat.postMessage API を利用する。
 * 詳細は以下を参照
 * https://api.slack.com/methods/chat.postMessage
 */
public with sharing class Slack {
  private static SlackConfig__c config = SlackConfig__c.getOrgDefaults();

  public class SlackDetail {
    // モード (true:添付メッセージ, false:テキスト)
    @InvocableVariable(required=true label='添付モード')
    public Boolean isAttachment;

    // 基本
    @InvocableVariable(required=true label='メッセージ')
    public String text;

    @InvocableVariable(required=false label='チャネル')
    public String channel;

    @InvocableVariable(required=false label='送信者アイコン')
    public String icon_emoji;

    @InvocableVariable(required=false label='送信者名')
    public String username;

    // Message Attachments
    // 添付：その他プロパティ
    @InvocableVariable(required=false label='添付：タイトル')
    public String title;

    @InvocableVariable(required=false label='添付：タイトルリンク')
    public String title_link;

    @InvocableVariable(required=false label='添付：サイドバー色')
    public String color;

    @InvocableVariable(required=false label='添付：補足メッセージ')
    public String pretext;

    // 添付：項目 (1)
    @InvocableVariable(required=false label='添付：項目名 (1)')
    public String title1;

    @InvocableVariable(required=false label='添付：項目値 (1)')
    public String value1;

    @InvocableVariable(required=false label='添付：短く表示 (1)')
    public Boolean short1 = true;

    // 添付：項目 (2)
    @InvocableVariable(required=false label='添付：項目名 (2)')
    public String title2;

    @InvocableVariable(required=false label='添付：項目値 (2)')
    public String value2;

    @InvocableVariable(required=false label='添付：短く表示 (2)')
    public Boolean short2 = true;
  }

  @InvocableMethod(label='Slackへメッセージ送信')
  public static void sendMessage(List<SlackDetail> details) {
    if (String.isBlank(config.AccessToken__c)) {
      return;
    }

    // Sandbox の場合「test」に飛ばす
    Organization org = [select IsSandbox from Organization limit 1];

    for (SlackDetail detail : details) {
      if (org.IsSandbox) {
        detail.channel = 'test';
      }
      sendMessageAsync(getRequesetBody(detail));
    }
  }

  @Future(callout=true)
  private static void sendMessageAsync(String reqBody) {
    sendMessage(reqBody);
  }

  private static void sendMessage(String reqBody) {
    Http h = new Http();
    HttpRequest req = new HttpRequest();
    req.setEndpoint('https://slack.com/api/chat.postMessage');
    req.setMethod('POST');
    req.setHeader('Content-Type', 'application/json');
    req.setHeader('Authorization', 'Bearer ' + config.AccessToken__c);
    req.setBody(reqBody);
    HttpResponse res = h.send(req);
  }

  private static String getRequesetBody(SlackDetail detail) {
    Map<String, Object> reqBody = new Map<String, Object>();
    reqBody.put('channel', detail.channel);
    reqBody.put('icon_emoji', detail.icon_emoji);
    reqBody.put('username', detail.username);

    // テキストメッセージ送信
    if (detail.isAttachment == false) {
      reqBody.put('text', detail.text);

    // リッチメッセージ送信
    } else {
      // リクエスト情報サンプル
      /**
      "attachments": [
        {
        "fallback": "test",
        "color": "#FF8000",
        "pretext": "This is optional pretext that shows above the attachment.",
        "text": "This is the text of the attachment. It should appear just above an image of the Mattermost logo. The left border of the attachment should be colored orange, and below the image it should include additional fields that are formatted in columns. At the top of the attachment, there should be an author name followed by a bolded title. Both the author name and the title should be hyperlinks.",
        "author_name": "Mattermost",
        "author_icon": "https://mattermost.org/wp-content/uploads/2016/04/icon_WS.png",
        "author_link": "https://mattermost.org/",
        "title": "Example Attachment",
        "title_link": "https://docs.mattermost.com/developer/message-attachments.html",
        "fields": [
          {
          "short":false,
          "title":"Long Field",
          "value":"Testing with a very long piece of text that will take up the whole width of the table. And then some more text to make it extra long."
          },
          {
          "short":true,
          "title":"Column Two",
          "value":"Testing"
          }
        ],
        "image_url": "https://mattermost.org/wp-content/uploads/2016/03/logoHorizontal_WS.png"
        }
      ]
      */
      Map<String, Object> attData = new Map<String, Object>();
      attData.put('title', detail.title);
      attData.put('title_link', detail.title_link);
      attData.put('color', detail.color);
      attData.put('pretext', detail.pretext);
      attData.put('text', detail.text);

      // fields
      List<Map<String, Object>> fields = new List<Map<String, Object>>();
      if (String.isNotBlank(detail.title1) && String.isNotBlank(detail.value1)) {
        Map<String, Object> field = new Map<String, Object>();
        field.put('title', detail.title1);
        field.put('value', detail.value1);
        field.put('short', detail.short1);
        fields.add(field);
      }
      if (String.isNotBlank(detail.title2) && String.isNotBlank(detail.value2)) {
        Map<String, Object> field = new Map<String, Object>();
        field.put('title', detail.title2);
        field.put('value', detail.value2);
        field.put('short', detail.short2);
        fields.add(field);
      }
      if (fields.isEmpty() == false) {
        attData.put('fields', fields);
      }
      reqBody.put('attachments', new List<Map<String, Object>> {attData});
    }
    return JSON.serialize(reqBody);
  }
}