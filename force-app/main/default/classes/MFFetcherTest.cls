@isTest
private class MFFetcherTest {

    // 請求書一覧
    @isTest private static void test_OK_fetchInvoices() {
        Account customer = TestDataFactory.createAccount('テスト商事', false);
        customer.MFAccountId__c = 'MF_ACC_ID';
        customer.MFDepartmentId__c = 'MF_DEPT_ID';
        insert customer;

        MFBillingDto.ResponseBillingArray billings = (MFBillingDto.ResponseBillingArray)JSON.deserialize(
            TestDataFactory.billingsJson, MFBillingDto.ResponseBillingArray.class);
        billings.data[0].id = 'MF_BILL_ID';
        billings.data[0].attributes.partner_id = 'MF_ACC_ID';
        String billingsJson = JSON.serialize(billings);

        MFMock mock = new MFMock();
        mock.addResponse(200, billingsJson);
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        MFFetcher.fetchInvoices();
        Test.stopTest();

        // 請求が作成されている事
        List<Invoice__c> invoices = [select Id from Invoice__c where Account__c = :customer.Id];
        System.assertEquals(1, invoices.size());
    }

    // 請求書
    @isTest private static void test_OK_fetchInvoice() {
        Account customer = TestDataFactory.createAccount('テスト商事', false);
        customer.MFAccountId__c = 'MF_ACC_ID';
        customer.MFDepartmentId__c = 'MF_DEPT_ID';
        insert customer;

        MFBillingDto.Response billing = (MFBillingDto.Response)JSON.deserialize(
            TestDataFactory.billingJson, MFBillingDto.Response.class);
        billing.data.id = 'MF_BILL_ID';
        billing.data.attributes.partner_id = 'MF_ACC_ID';
        String billingJson = JSON.serialize(billing);

        MFMock mock = new MFMock();
        mock.addResponse(200, billingJson);
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        MFFetcher.fetchInvoice('MF_BILL_ID');
        Test.stopTest();

        // 請求が作成されている事
        List<Invoice__c> invoices = [select Id from Invoice__c where Account__c = :customer.Id];
        System.assertEquals(1, invoices.size());        
    }

    // 見積書一覧
    @isTest private static void test_OK_fetchQuotes() {
        Account customer = TestDataFactory.createAccount('テスト商事', false);
        customer.MFAccountId__c = 'MF_ACC_ID';
        customer.MFDepartmentId__c = 'MF_DEPT_ID';
        insert customer;

        MFQuoteDto.ResponseQuoteArray quotes = (MFQuoteDto.ResponseQuoteArray)JSON.deserialize(
            TestDataFactory.quotesJson, MFQuoteDto.ResponseQuoteArray.class);
        quotes.data[0].id = 'MF_BILL_ID';
        quotes.data[0].attributes.partner_id = 'MF_ACC_ID';
        String quotesJson = JSON.serialize(quotes);

        MFMock mock = new MFMock();
        mock.addResponse(200, quotesJson);
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        MFFetcher.fetchQuotes();
        Test.stopTest();

        // 見積が作成されている事
        List<Quote__c> quoteRecords = [select Id from Quote__c where Account__c = :customer.Id];
        System.assertEquals(1, quoteRecords.size());        
    }

    // 見積書
    @isTest private static void test_OK_fetchQuote() {
        Account customer = TestDataFactory.createAccount('テスト商事', false);
        customer.MFAccountId__c = 'MF_ACC_ID';
        customer.MFDepartmentId__c = 'MF_DEPT_ID';
        insert customer;

        MFQuoteDto.Response quote = (MFQuoteDto.Response)JSON.deserialize(
            TestDataFactory.quoteJson, MFQuoteDto.Response.class);
        quote.data.id = 'MF_QUOTE_ID';
        quote.data.attributes.partner_id = 'MF_ACC_ID';
        String quoteJson = JSON.serialize(quote);

        MFMock mock = new MFMock();
        mock.addResponse(200, quoteJson);
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        MFFetcher.fetchQuote('MF_QUOTE_ID');
        Test.stopTest();

        // 請求が作成されている事
        List<Quote__c> quoteRecords = [select Id from Quote__c where Account__c = :customer.Id];
        System.assertEquals(1, quoteRecords.size());        
    }

    // 送付履歴
    @isTest private static void test_OK_fetchHistories() {
        Account customer = TestDataFactory.createAccount('テスト商事', false);
        customer.MFAccountId__c = 'MF_ACC_ID';
        customer.MFDepartmentId__c = 'MF_DEPT_ID';
        insert customer;

        MFMock mock = new MFMock();
        mock.addResponse(200, TestDataFactory.historiesJson);
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        MFFetcher.fetchHistories();
        Test.stopTest();
    }
}