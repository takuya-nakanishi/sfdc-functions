public with sharing class MFFetcher implements Queueable, Database.AllowsCallouts {
    private static final Integer per_page = 100;
    private static final String mfHistoryType = 'MFActivity';

    private Enum MFApiType {invoice, quote, history}
    private MFApiType apiType;
    private Integer page;

    private Set<String> mfQuoteIds;     // MF見積Id
    private Set<String> mfBillingIds;   // MF請求Id

    // コンストラクタ
    public MFFetcher(MFApiType apiType) {
        this.mfQuoteIds = new Set<String>();
        this.mfBillingIds = new Set<String>();
        this.apiType = apiType;
        this.page = 1;
    }

    /**
     * MFの全ての見積/請求を取り込む
     * [以下の順番で取り込む]
     * 1. 見積
     * 2. 請求
     * 3. 履歴
     */
    public static void fetchMFRecords() {
        fetchQuotes();
    }

    // 見積取込開始
    @TestVisible
    private static void fetchQuotes() {
        MFFetcher fetcher = new MFFetcher(MFApiType.quote);
        System.enqueueJob(fetcher);
    }

    // 請求取込開始
    @TestVisible
    private static void fetchInvoices() {
        MFFetcher fetcher = new MFFetcher(MFApiType.invoice);
        System.enqueueJob(fetcher);
    }

    // 履歴取込開始
    @TestVisible
    private static void fetchHistories() {
        MFFetcher fetcher = new MFFetcher(MFApiType.history);
        System.enqueueJob(fetcher);
    }

    // 見積(単独)取込
    public static void fetchQuote(String mfQuoteId) {
        DateTime fetchedTime = DateTime.now();
        MFQuoteDto.Response resData = MFUtil.getMFQuote(mfQuoteId);
        // 取引先チェック
        Id accountId = MFUtil.getAccountIdByMFId(resData.data.attributes.partner_id);
        if (accountId == null) {
            return;
        }
        Set<String> mfTags = new Set<String> (resData.data.attributes.tags);
        Id oppId = MFUtil.getSingleOppIdByMFTags(mfTags);
        Quote__c quote = getQuoteByApiData(
            resData.data,
            accountId,
            oppId,
            mfTags.contains('send'),
            fetchedTime
        );
        List<QuoteDetail__c> quoteDetails = new List<QuoteDetail__c>();
        for (MFQuoteDto.ResponseQuoteItem mfItem : resData.included) {
            quoteDetails.add(getQuoteDetailByApiData(mfQuoteId, mfItem));
        }

        // 一度明細は削除
        delete [select Id from QuoteDetail__c where Quote__r.MFQuoteId__c = :mfQuoteId];
        upsert quote Quote__c.MFQuoteId__c;
        insert quoteDetails;
    }

    // 請求(単独)取込
    public static void fetchInvoice(String mfBillingId) {
        DateTime fetchedTime = DateTime.now();
        MFBillingDto.Response resData = MFUtil.getMFBilling(mfBillingId);
        // 取引先チェック
        Id accountId = MFUtil.getAccountIdByMFId(resData.data.attributes.partner_id);
        if (accountId == null) {
            return;
        }
        Set<String> mfTags = new Set<String> (resData.data.attributes.tags);
        Id oppId = MFUtil.getSingleOppIdByMFTags(mfTags);
        Invoice__c invoice = getInvoiceByApiData(
            resData.data,
            accountId,
            oppId,
            mfTags.contains('send'),
            fetchedTime
        );
        List<InvoiceDetail__c> invoiceDetails = new List<InvoiceDetail__c>();
        for (MFBillingDto.ResponseBillingItem mfItem : resData.included) {
            invoiceDetails.add(getInvoiceDetailByApiData(mfBillingId, mfItem));
        }

        // 一度明細は削除
        delete [select Id from InvoiceDetail__c where Invoice__r.MFBillingId__c = :mfBillingId];
        upsert invoice Invoice__c.MFBillingId__c;
        insert invoiceDetails;
    }

    // ジョブ実行時の処理
    public void execute(QueueableContext context) {
        Integer limitPage;
        DateTime fetchedTime = DateTime.now();

        if (this.apiType == MFApiType.quote) {
            MFQuoteDto.ResponseQuoteArray resData = MFUtil.getMFQuoteArray(this.page, per_page);
            limitPage = resData.meta.total_pages;
            syncQuote(resData, fetchedTime);

            if (limitPage < this.page) {
                this.page ++;
                System.enqueueJob(this);
            } else {
                delete [
                    select Id from Quote__c
                    where MFQuoteId__c not in :this.mfQuoteIds
                ];
                if (Test.isRunningTest() == false) {
                    syncOpportunity(this.mfQuoteIds);
                    fetchInvoices();
                }
            }
        } else if (this.apiType == MFApiType.invoice) {
            MFBillingDto.ResponseBillingArray resData = MFUtil.getMFBillingArray(this.page, per_page);
            limitPage = resData.meta.total_pages;
            syncInvoice(resData, fetchedTime);

            if (limitPage < this.page) {
                this.page ++;
                System.enqueueJob(this);
            } else if (this.mfBillingIds.isEmpty() == false) {
                delete [
                    select Id from Invoice__c
                    where MFBillingId__c not in :this.mfBillingIds
                ];
                if (Test.isRunningTest() == false) {
                    fetchHistories();
                }
            }
        } else if (this.apiType == MFApiType.history) {
            MFHistoryDto.Response resData = MFUtil.getMFHistory(this.page, per_page);
            limitPage = resData.meta.total_pages;
            syncHistory(resData, fetchedTime);

            if (limitPage < this.page) {
                this.page ++;
                System.enqueueJob(this);
            } else {
                delete [
                    select Id from Task
                    where RecordType.DeveloperName = :mfHistoryType
                    and WhatId = null
                ];
            }
        }
    }

    // 見積処理
    private void syncQuote(MFQuoteDto.ResponseQuoteArray resData, DateTime fetchedTime) {
        // Set<MF取引先Id>
        Set<String> mfAccountIds = new Set<String>();
        for (MFQuoteDto.ResponseQuote mfQuote : resData.data) {
            mfAccountIds.add(mfQuote.attributes.partner_id);
        }
        Map<String, Id> mfAccountIdMap = MFUtil.getMFAccountIdMap(mfAccountIds);
        // Map<MF明細Id, MFId>
        Map<String, String> mfDetailMap = new Map<String, String>();
        List<String> mfTags = new List<String>();

        for (MFQuoteDto.ResponseQuote mfQuote : resData.data) {
            if (mfAccountIdMap.containsKey(mfQuote.attributes.partner_id) == false) {
                continue;
            }
            this.mfQuoteIds.add(mfQuote.id);
            mfTags.addAll(mfQuote.attributes.tags);
            for (MFQuoteDto.ResponseQuoteItem mfItem : mfQuote.relationships.items.data) {
                mfDetailMap.put(mfItem.id, mfQuote.id);
            }
        }
        // Map<タグ, 案件Id>
        Map<String, Id> tagOppIdMap = MFUtil.getTagOppIdMap(mfTags);
        List<Quote__c> quotes = new List<Quote__c>();
        List<QuoteDetail__c> quoteDetails = new List<QuoteDetail__c>();

        for (MFQuoteDto.ResponseQuote mfQuote : resData.data) {
            Id accountId = mfAccountIdMap.get(mfQuote.attributes.partner_id);
            if (accountId == null) {
                continue;
            }
            Set<String> quoteTag = new Set<String> (mfQuote.attributes.tags);
            Id oppId = getOppIdByTagOppIdMap(tagOppIdMap, quoteTag);
            quotes.add(getQuoteByApiData(
                mfQuote,
                accountId,
                oppId,
                quoteTag.contains('send'),
                fetchedTime
            ));
        }
        for (MFQuoteDto.ResponseQuoteItem mfItem : resData.included) {
            String mfQuoteId = mfDetailMap.get(mfItem.id);
            if (mfQuoteId != null) {
                quoteDetails.add(getQuoteDetailByApiData(mfQuoteId, mfItem));
            }
        }
        // 既存明細は一度削除
        delete [
            select Id from QuoteDetail__c
            where Quote__r.MFQuoteId__c in :mfDetailMap.values()
        ];

        if (quotes.isEmpty() == false) {
            upsert quotes Quote__c.MFQuoteId__c;
        }
        if (quoteDetails.isEmpty() == false) {
            insert quoteDetails;
        }
    }

    // 請求処理
    private void syncInvoice(MFBillingDto.ResponseBillingArray resData, DateTime fetchedTime) {
        // Set<MF取引先Id>
        Set<String> mfAccountIds = new Set<String>();
        for (MFBillingDto.ResponseBilling mfBilling : resData.data) {
            mfAccountIds.add(mfBilling.attributes.partner_id);
        }
        Map<String, Id> mfAccountIdMap = MFUtil.getMFAccountIdMap(mfAccountIds);
        // Map<MF明細Id, MFId>
        Map<String, String> mfDetailMap = new Map<String, String>();
        List<String> mfTags = new List<String>();

        for (MFBillingDto.ResponseBilling mfBilling : resData.data) {
            if (mfAccountIdMap.containsKey(mfBilling.attributes.partner_id) == false) {
                continue;
            }
            this.mfBillingIds.add(mfBilling.id);
            mfTags.addAll(mfBilling.attributes.tags);
            for (MFBillingDto.ResponseBillingItem mfItem : mfBilling.relationships.items.data) {
                mfDetailMap.put(mfItem.id, mfBilling.id);
            }
        }
        // Map<タグ, 案件Id>
        Map<String, Id> tagOppIdMap = MFUtil.getTagOppIdMap(mfTags);
        List<Invoice__c> invoices = new List<Invoice__c>();
        List<InvoiceDetail__c> invoiceDetails = new List<InvoiceDetail__c>();

        for (MFBillingDto.ResponseBilling mfBilling : resData.data) {
            Id accountId = mfAccountIdMap.get(mfBilling.attributes.partner_id);
            if (accountId == null) {
                continue;
            }
            Set<String> billingTag = new Set<String> (mfBilling.attributes.tags);
            Id oppId = getOppIdByTagOppIdMap(tagOppIdMap, billingTag);
            invoices.add(getInvoiceByApiData(
                mfBilling,
                accountId,
                oppId,
                billingTag.contains('send'),
                fetchedTime
            ));
        }
        for (MFBillingDto.ResponseBillingItem mfItem : resData.included) {
            String mfBillingId = mfDetailMap.get(mfItem.id);
            if (mfBillingId != null) {
                invoiceDetails.add(getInvoiceDetailByApiData(mfBillingId, mfItem));
            }
        }
        // 既存明細は一度削除
        delete [
            select Id from InvoiceDetail__c
            where Invoice__r.MFBillingId__c in :mfDetailMap.values()
        ];

        if (invoices.isEmpty() == false) {
            upsert invoices Invoice__c.MFBillingId__c;
        }
        if (invoiceDetails.isEmpty() == false) {
            insert invoiceDetails;
        }
    }

    // 履歴処理
    private void syncHistory(MFHistoryDto.Response resData, DateTime fetchedTime) {
        // MFID
        Set<String> mfIds = new Set<String>();
        for (MFHistoryDto.ResponseHistory hisData : resData.data) {
            mfIds.add(hisData.attributes.document_id);
        }
        // Map<MFId, 見積/請求ID>
        Map<String, Id> mfIdMap = new Map<String, Id>();
        for (Quote__c quote : [select Id, MFQuoteId__c from Quote__c where MFQuoteId__c in :mfIds]) {
            mfIdMap.put(quote.MFQuoteId__c, quote.Id);
        }
        for (Invoice__c invoice : [select Id, MFBillingId__c from Invoice__c where MFBillingId__c in :mfIds]) {
            mfIdMap.put(invoice.MFBillingId__c, invoice.Id);
        }

        List<Task> histories = new List<Task>();
        Id recTypeId = sObjectType.Task.getRecordTypeInfosByDeveloperName().get(mfHistoryType).getRecordTypeId();
        for (MFHistoryDto.ResponseHistory hisData : resData.data) {
            DateTime sentAt = hisData.attributes.sent_at;
            Date sentDate = (sentAt == null) ? null : sentAt.date();
            Id whatId = mfIdMap.get(hisData.attributes.document_id);

            if (whatId != null) {
                histories.add(new Task(
                    MFHistoryId__c = hisData.id,
                    Subject = hisData.attributes.type + 'で送付',
                    ActivityDate = sentDate,
                    Status = 'Completed',
                    WhatId = whatId,
                    RecordTypeId = recTypeId,
                    Description = 'マネーフォワード クラウド請求書'
                ));
            }
        }
        upsert histories Task.MFHistoryId__c;
    }

    // 取込データから見積を作成
    private static Quote__c getQuoteByApiData(
        MFQuoteDto.ResponseQuote mfQuote,
        Id accountId,
        Id oppId,
        Boolean hasSend,
        DateTime fetchedTime
    ) {
        return new Quote__c(
            MFQuoteId__c = mfQuote.id,
            Account__c = accountId,
            Opportunity__c = oppId,
            Name = mfQuote.attributes.quote_number,
            LastMFFetchedTime__c = fetchedTime,
            CreateDate__c = mfQuote.attributes.quote_date,
            LimitDate__c = mfQuote.attributes.expired_date,
            Amount__c = mfQuote.attributes.total_price,
            Tax__c = mfQuote.attributes.excise_price,
            OrderStatus__c = mfQuote.attributes.order_status,
            EmailStatus__c = mfQuote.attributes.transmit_status,
            PostingStatus__c = mfQuote.attributes.posting_status,
            Remarks__c = mfQuote.attributes.note,
            HasSend__c = hasSend
        );
    }

    // 取込データから見積明細を作成
    private static QuoteDetail__c getQuoteDetailByApiData(String mfQuoteId, MFQuoteDto.ResponseQuoteItem mfItem) {
        return new QuoteDetail__c(
            Quote__r = new Quote__c(MFQuoteId__c = mfQuoteId),
            MFItemCode__c = mfItem.attributes.item_code,
            Name = mfItem.attributes.name,
            Unit__c = mfItem.attributes.unit,
            UnitPrice__c = mfItem.attributes.unit_price,
            Quantity__c = mfItem.attributes.quantity,
            HasTax__c = mfItem.attributes.is_excise,
            SortNumber__c = mfItem.attributes.disp_order
        );
    }

    // 取込データから請求レコードを作成
    private static Invoice__c getInvoiceByApiData(
        MFBillingDto.ResponseBilling mfBilling,
        Id accountId,
        Id oppId,
        Boolean hasSend,
        DateTime fetchedTime
    ) {
        return new Invoice__c(
            MFBillingId__c = mfBilling.id,
            Account__c = accountId,
            Name = mfBilling.attributes.billing_number,
            Opportunity__c = oppId,
            LastMFFetchedTime__c = fetchedTime,
            CreateDate__c = mfBilling.attributes.billing_date,
            LimitDate__c = mfBilling.attributes.due_date,
            Amount__c = mfBilling.attributes.total_price,
            Tax__c = mfBilling.attributes.excise_price,
            PaymentStatus__c = mfBilling.attributes.payment_status,
            EmailStatus__c = mfBilling.attributes.email_status,
            PostingStatus__c = mfBilling.attributes.posting_status,
            Remarks__c = mfBilling.attributes.note,
            HasSend__c = hasSend
        );
    }

    // 取込データから請求明細を作成
    private static InvoiceDetail__c getInvoiceDetailByApiData(String mfId, MFBillingDto.ResponseBillingItem mfItem) {
        return new InvoiceDetail__c(
            Invoice__r = new Invoice__c(MFBillingId__c = mfId),
            MFItemCode__c = mfItem.attributes.item_code,
            Name = mfItem.attributes.name,
            Unit__c = mfItem.attributes.unit,
            UnitPrice__c = mfItem.attributes.unit_price,
            Quantity__c = mfItem.attributes.quantity,
            HasTax__c = mfItem.attributes.is_excise,
            SortNumber__c = mfItem.attributes.disp_order
        );
    }

    // タグから案件IDを取得する
    private static Id getOppIdByTagOppIdMap(Map<String, Id> oppIdMap, Set<String> mfTags) {
        for (String mfTag : mfTags) {
            Id oppId = oppIdMap.get(mfTag);
            if (oppId != null) {
                return oppId;
            }
        }
        return null;
    }

    // 商談ごとに最新見積日の見積を同期にする
    private static void syncOpportunity(Set<String> mfQuoteIds) {
        Set<Id> oppIds = new Set<Id>();
        List<Quote__c> quotes = new List<Quote__c>();

        for (Quote__c quote : [
            select Opportunity__c, SyncOpportunity__c, CreateDate__c
            from Quote__c
            where MFQuoteId__c in :mfQuoteIds
            and Opportunity__c != null
            order by CreateDate__c desc
        ]) {
            if (oppIds.contains(quote.Opportunity__c) == false) {
                quote.SyncOpportunity__c = true;
                quotes.add(quote);
                oppIds.add(quote.Opportunity__c);
            }
        }
        update quotes;
    }
}