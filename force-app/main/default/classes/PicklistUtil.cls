public with sharing class PicklistUtil {
	/**
     * 連動選択リスト情報を取得
     * @param dependToken 連動項目
     * @return Map<制御項目値, List<連動項目値>>
     */
	public static Map<String, List<String>> getDependentPicklistValues(Schema.sObjectField dependToken) {
	    // 連動項目のresult取得
	    Schema.DescribeFieldResult depend = dependToken.getDescribe();
	    // 制御項目のトークンを取得
	    Schema.sObjectField controlToken = depend.getController();

	    // 制御項目を取得できない場合は終了
	    if (controlToken == null) {
	        return new Map<String, List<String>>();
	    }
	 
	    // 制御項目のresult取得
	    Schema.DescribeFieldResult control = controlToken.getDescribe();
	    List<Schema.PicklistEntry> controlEntries;
	    // 制御項目ががBoolea型でない場合はPicklistEntryのListに追加
	    if (control.getType() != Schema.DisplayType.Boolean) {
	        controlEntries = control.getPicklistValues();
	    }
	 
	    String base64map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	    // 連動項目の選択リスト作成
	    Map<String,List<String>> dependentPicklistValues = new Map<String,List<String>>();

	    // 連動項目の選択値でループ処理
	    for (Schema.PicklistEntry entry : depend.getPicklistValues()) {
	        // 選択値がアクティブでかつ、validForを取得できる場合のみ処理
	        // Schema.PicklistEntryオブジェクトをserializeでjson文字列に変換することで"validFor"を取得できるようにする(jsonにしないと取得できない)
	        if (entry.isActive() && String.isNotEmpty(String.valueOf(((Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(entry))).get('validFor')))) {
	            // "validFor"から値を取得
	            List<String> base64chars = String.valueOf(((Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(entry))).get('validFor')).split('');

	            // 制御項目の選択値の数だけループ(制御項目がチェックボックスの場合は2回処理)
	            for (Integer index = 0; index < (controlEntries != null ? controlEntries.size() : 2); index++) {
					Object controlValue;
					if (controlEntries == null) {
						controlValue = (Object) (index == 1);
					} else if (controlEntries[index].isActive()) {
						controlValue = (Object) controlEntries[index].getLabel();
					}

	                Integer bitIndex = index / 6;
	                if (bitIndex > base64chars.size() - 1) {
	                    break;
	                }
	                Integer bitShift = 5 - Math.mod(index, 6);
	                if  (controlValue == null || (base64map.indexOf(base64chars[ bitIndex ]) & (1 << bitShift)) == 0)
	                    continue;
	                if (!dependentPicklistValues.containsKey((String) controlValue)) {
	                    dependentPicklistValues.put((String) controlValue, new List<String>());
	                }
	                dependentPicklistValues.get((String) controlValue).add(entry.getLabel());
	            }
	        }
	    }
	    return dependentPicklistValues;
	}
}
