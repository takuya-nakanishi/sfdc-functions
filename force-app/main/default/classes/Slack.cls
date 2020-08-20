/**
 * Slack の chat.postMessage API を利用する。
 * 詳細は以下を参照
 * https://api.slack.com/methods/chat.postMessage
 */
public with sharing class Slack {

    public class ProcessData {
        // 送信先チャネル
        @InvocableVariable(required=true)
        public String channel;

        // メッセージ
        @InvocableVariable(required=true)
        public String message;

        // 表示名
        @InvocableVariable(required=true)
        public String username;
    }

    @InvocableMethod(label='Slackへ通知')
    public static void integrateToSlack(List<ProcessData> dataList) {
        for (ProcessData data : dataList) {
            postMessageAsync(data.channel, data.message, data.username);
        }
    }

    @Future(callout=true)
    public static void postMessageAsync(String channel, String message, String username) {
        postMessage(channel, message, username);
    }

    public static void postMessage(String channel, String message, String username) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://slack.com/api/chat.postMessage');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer xoxb-890881505392-1126521349233-J2s2wZPkDVsByX4QEpGflc4i');
        req.setBody(
            '{' +
            '    "channel" : "' + channel + '",' +
            '    "text" : "' + message + '",' +
            '    "username" : "' + username + '"' +
            '}'
        );
        Http h = new Http();
        HttpResponse res = h.send(req);
        System.debug(res.getStatus());
        System.debug(res.getBody());
    }
}