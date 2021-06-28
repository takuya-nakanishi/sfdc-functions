public with sharing class CloudSignFlowHandler {

  public class FlowData {
    @InvocableVariable(required=true label='処理ID')
    public String execute_id;

    @InvocableVariable(required=true label='契約レコードID')
    public String recordId;

    @InvocableVariable(label='ContentVersion Id (カンマ区切り)')
    public String contentVersionIds;

    @InvocableVariable(label='送付メッセージ')
    public String message;
  }

  @InvocableMethod(label='クラウドサイン連携')
  public static void execute(List<FlowData> dataList) {
    List<Contract__c> contracts = new List<Contract__c>();

    for (FlowData data : dataList) {
      // 契約書送付
      if (data.execute_id.equals('send_contract')) {
        List<Id> contentVersionIds = data.contentVersionIds.replaceAll('\\s', '').split(';');
        String csRecordId = CloudSign.publishSendContract(data.recordId, contentVersionIds, data.message);
        contracts.add(new Contract__c(
          Id = data.recordId,
          CloudSignId__c = csRecordId
        ));
      }
    }
    update contracts;
  }
}
