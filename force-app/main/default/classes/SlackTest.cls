@isTest
private class SlackTest {

    @isTest static void integrateToSlack_01() {
        MFMock mock = new MFMock();
        mock.addResponse(200, '{"ok":true}');
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        List<Slack.ProcessData> slackMessageList = new List<Slack.ProcessData>();
        Slack.ProcessData slackMessage = new Slack.ProcessData();
        slackMessage.channel = 'sfdc';
        slackMessage.message = 'API Test Message';
        slackMessage.username = '3a-inc.salesforce';
        slackMessageList.add(slackMessage);
        Slack.integrateToSlack(slackMessageList);
        Test.stopTest();

        System.assertEquals(1, mock.getCalloutCount());
    }
}