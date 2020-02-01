// テーブル：フィード情報
var FeedTableCls = (function () {
    // コンストラクタ
    function FeedTableCls(id, name, url, entry_title, entry_link, entry_content, entry_published_date, entry_parse_date, entry_parse_date_end, alarm_flg, alarm_date, shown_flg) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_FEED", id);

        // サブクラス自身のプロパティ
		// カラム：サイト名称
		this.col_name = name;
		
		// カラム：サイトURL
		this.col_url = url;
		
		// カラム：フィードエントリー：タイトル
		this.col_entry_title = entry_title;
		
		// カラム：フィードエントリー：リンク
		this.col_entry_link = entry_link;
		
		// カラム：フィードエントリー：内容
		this.col_entry_content = entry_content;
		
		// カラム：フィードエントリー：日付
		this.col_entry_published_date = entry_published_date;
    	
		// カラム：フィードの内容から取得した日付
		this.col_entry_parse_date = entry_parse_date;		
    	
		// カラム：フィードの内容から取得した日付(End)
		this.col_entry_parse_date_end = entry_parse_date_end;		
        
        // カラム：アラーム有無(0=無し)
        this.col_alarm_flg = alarm_flg;
        
        // カラム：アラーム時刻
        this.col_alarm_date = alarm_date;
        
        // カラム：表示済み有無(0=未表示)
        this.col_shown_flg = shown_flg;
        
    }
    
    // configure prototype
    FeedTableCls.prototype = new BaseTableCls();
    FeedTableCls.prototype.constructor = FeedTableCls;
    
    // col_entry_title, col_entry_content から日付を抽出して、
    // col_entry_parse_date に設定します
    FeedTableCls.prototype.parseDate = function () {
        // まずはタイトルの日付情報を判定
        if (!this.parseDateByTxt(this.col_entry_title)) {
            // タイトルで日付が取れなければ、本文チェック
            if(!this.parseDateByTxt(this.col_entry_content)) {
				// タイトルからも日付がとれなければ、発行日を設定
				if (this.col_entry_published_date) {
					console.log("parseDate col_entry_published_date: "+ this.col_entry_published_date.format());
					this.col_entry_parse_date = this.col_entry_published_date;
					
					// 時間はクリア
					this.col_entry_parse_date.hours(12);
					this.col_entry_parse_date.minute(0);
					this.col_entry_parse_date.second(0);
					this.col_entry_parse_date.millisecond(0);					
				}
				else {
					// 発行日も入ってなければ、本日日付
					this.col_entry_parse_date = moment();
					
					// 時間はクリア
					this.col_entry_parse_date.hours(12);
					this.col_entry_parse_date.minute(0);
					this.col_entry_parse_date.second(0);
					this.col_entry_parse_date.millisecond(0);					
				}
			}
        }
    };
    
    // 指定文字列から日付をパースして結果を返します
    FeedTableCls.prototype.parseDateByTxt = function (txt) {
        // txtから日付をパース
        var result = chrono.parseDate(txt);
    	console.log("■■FeedTableCls.parseDate result: "+ result + "/"+ txt);
    	if (result) {
    		// 結果がある場合のみ、取得日付に設定
    		if (result.start && result.start.date()) {
    			// 開始日付がある場合
		    	console.log("■■■FeedTableCls.parseDate startDate result: "+ result.start.date() + "/"+ txt);
		    	this.col_entry_parse_date = moment(result.start.date()).locale(findLanguage());
    		}
    		else {
		    	this.col_entry_parse_date = moment(result).locale(findLanguage());
    		}
            
	    	// 時間はクリア
    		this.col_entry_parse_date.hours(12);
    		this.col_entry_parse_date.minute(0);
    		this.col_entry_parse_date.second(0);
    		this.col_entry_parse_date.millisecond(0);
            
        	// END結果がある場合は、別途取得日付に設定
    		if (result.end && result.end.date()) {
    			// 終了日付がある場合
		    	console.log("■■■FeedTableCls.parseDate endDate result: "+ result.end.date() + "/"+ txt);
		    	this.col_entry_parse_date_end = moment(result.end.date()).locale(findLanguage());
            	// 時間はクリア
        		this.col_entry_parse_date_end.hours(12);
        		this.col_entry_parse_date_end.minute(0);
        		this.col_entry_parse_date_end.second(0);
        		this.col_entry_parse_date_end.millisecond(0);
    		}
            
            // 設定できたらtrueを返す
            return true;
		}
        
        // 結果がなければfalse
        return false;
    };

    return FeedTableCls; // return constructor
})();


// テーブル：設定：フィルターグループ
var SettingFilterGroupTableCls = (function () {
    // コンストラクタ
    function SettingFilterGroupTableCls(id, name, color, order_by) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_SETTING_FILTER_GROUP", id);

        // サブクラス自身のプロパティ
		// カラム：グループ名称
		this.col_name = name;
		
		// カラム：グループカラー
		this.col_color = color;
		
		// カラム：表示順
		this.col_order_by = order_by;
    }
    
    // configure prototype
    SettingFilterGroupTableCls.prototype = new BaseTableCls();
    SettingFilterGroupTableCls.prototype.constructor = SettingFilterGroupTableCls;

    return SettingFilterGroupTableCls; // return constructor
})();

// テーブル：設定：フィルター文字列グループ
var SettingFilterTextTableCls = (function () {
    // コンストラクタ
    function SettingFilterTextTableCls(id, group_id, text) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_SETTING_FILTER_TEXT", id);
		
		// カラム：フィルターグループID
		this.col_group_id = group_id;
		
		// カラム：フィルター文字列
		this.col_text = text;
    }
    
    // configure prototype
    SettingFilterTextTableCls.prototype = new BaseTableCls();
    SettingFilterTextTableCls.prototype.constructor = SettingFilterTextTableCls;

    return SettingFilterTextTableCls; // return constructor
})();


// テーブル：設定：フィード情報
var SettingFeedTableCls = (function () {
    // コンストラクタ
    function SettingFeedTableCls(id, name, url, retention_days) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_SETTING_FEED", id);

        // サブクラス自身のプロパティ
		// カラム：サイト名称
		this.col_name = name;
    	
		// カラム：サイトURL
		this.col_url = url;
    	
		// カラム：保持日数
		this.col_retention_days = retention_days;
    }
    
    // configure prototype
    SettingFeedTableCls.prototype = new BaseTableCls();
    SettingFeedTableCls.prototype.constructor = SettingFeedTableCls;

    return SettingFeedTableCls; // return constructor
})();


// テーブル：設定：タイマー情報
var SettingCrawlTableCls = (function () {
    // コンストラクタ
    function SettingCrawlTableCls(id, interval, next_crawl_timestamp) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_SETTING_CRAWL", id);

        // サブクラス自身のプロパティ
		// カラム：取得間隔
		this.col_interval = interval;
		
		// 次回予定タイマー
		this.col_next_crawl_timestamp = next_crawl_timestamp;
    }
    
    // configure prototype
    SettingCrawlTableCls.prototype = new BaseTableCls();
    SettingCrawlTableCls.prototype.constructor = SettingCrawlTableCls;
    
    // 巡回間隔ミリ秒算出
    SettingCrawlTableCls.prototype.calcIntervalMilliseconds = function () {
        // TODO とりあえず分単位。
        // 時間単位 * 60 * 60 * 1000;
        return eval(this.col_interval) * 60 * 1000;
    }    
    
    // 巡回間隔から次の予定時刻を算出
    SettingCrawlTableCls.prototype.calcNextCrawl = function () {
        var nextCrawl =  moment().add(this.calcIntervalMilliseconds(), 'milliseconds');
        
		console.log("nexCrawl: "+ nextCrawl.locale('ja').format('LLLL'));
        
        this.col_next_crawl_timestamp = nextCrawl.valueOf();
    }    
    
    // ロケールに合わせて、次回予定時刻表示
    SettingCrawlTableCls.prototype.displayNextCrawl = function () {
        if (!this.col_next_crawl_timestamp) return null;
    	return moment(this.col_next_crawl_timestamp).locale(findLanguage()).format('LLL');
    };

    return SettingCrawlTableCls; // return constructor
})();



// テーブル：設定：アラーム情報
var SettingAlarmTableCls = (function () {
    // コンストラクタ
    function SettingAlarmTableCls(id, alarm_hour, next_alarm_timestamp) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_SETTING_ALARM", id);
		
		// カラム：アラーム時刻(7時等の数字だけ保持)
		this.col_alarm_hour = alarm_hour;
		
		// 次回予定タイマー
		this.col_next_alarm_timestamp = next_alarm_timestamp;
    }
    
    // configure prototype
    SettingAlarmTableCls.prototype = new BaseTableCls();
    SettingAlarmTableCls.prototype.constructor = SettingAlarmTableCls;

    SettingAlarmTableCls.prototype.displayNextAlarm = function () {
        if (!this.col_next_alarm_timestamp) return null;
    	return moment(this.col_next_alarm_timestamp).locale(findLanguage()).format('LLL');
    };

    return SettingAlarmTableCls; // return constructor
})();


// テーブル：設定：パラメータ管理
var SettingParamsTableCls = (function () {
    // コンストラクタ
    function SettingParamsTableCls(id, initial, firstday_of_week, event_limit) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_SETTING_PARAMS", id);

        // サブクラス自身のプロパティ
		// カラム：初期表示完了有無
		this.col_initial = initial;

		// カラム：カレンダーの始まり曜日
		this.col_firstday_of_week = firstday_of_week;
    	
		// カラム：イベント表示上限
		this.col_event_limit = event_limit;		
	}
    
    // configure prototype
    SettingParamsTableCls.prototype = new BaseTableCls();
    SettingParamsTableCls.prototype.constructor = SettingParamsTableCls;

    return SettingParamsTableCls; // return constructor
})();


// テーブル：タイマー履歴
var CrawlHistoryTableCls = (function () {
    // コンストラクタ
    function CrawlHistoryTableCls(id, start_timestamp) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_CRAWL_HISTORY", id);

        // サブクラス自身のプロパティ
		// カラム：開始タイムスタンプ(数値)
		this.col_start_timestamp = start_timestamp;
    }
    
    // configure prototype
    CrawlHistoryTableCls.prototype = new BaseTableCls();
    CrawlHistoryTableCls.prototype.constructor = CrawlHistoryTableCls;
    
    CrawlHistoryTableCls.prototype.displayStartTime = function () {
    	return moment(this.col_start_timestamp).locale(findLanguage()).format('LLL');
    };

    return CrawlHistoryTableCls; // return constructor
})();



// テーブル：アラーム履歴
var AlarmHistoryTableCls = (function () {
    // コンストラクタ
    function AlarmHistoryTableCls(id, start_timestamp) {
        // 親クラスのコンストラクタ呼び出し
        BaseTableCls.call(this, "TBL_ALARM_HISTORY", id);

        // サブクラス自身のプロパティ
		// カラム：開始タイムスタンプ(数値)
		this.col_start_timestamp = start_timestamp;
    }
    
    // configure prototype
    AlarmHistoryTableCls.prototype = new BaseTableCls();
    AlarmHistoryTableCls.prototype.constructor = AlarmHistoryTableCls;
    
    AlarmHistoryTableCls.prototype.displayStartTime = function () {
    	return moment(this.col_start_timestamp).locale(findLanguage()).format('LLL');
    };

    return AlarmHistoryTableCls; // return constructor
})();












function BaseTableCls(tableName, id) {
	this.table_name = tableName;
	
	// ID (オートインクリメント用)
	this.col_id = id;
	
	// カラムリストを返す
	this.getColumns = function() {
		var columns = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0) {
				columns.push(p);
			}
		}
		
		return columns;
	};
	
	// IDを除いたカラムリストを返す
	this.getColumnsIgnoreId = function() {
		var columns = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		// ただしIDは除く
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && p.toLowerCase() != "col_id") {
				columns.push(p);
			}
		}
		
		return columns;
	};
	
	// 値リストを返す
	this.getValues = function() {
		var values = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0) {
				if (this[p] instanceof moment) {
					values.push(this[p].valueOf());
				}
				else {				
					values.push(this[p]);
				}
			}
		}
		
		return values;
	};
	
	// IDを除いた値リストを返す
	this.getValuesIgnoreId = function() {
		var values = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		// ただしIDは除く
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && p.toLowerCase() != "col_id") {
				if (this[p] instanceof moment) {
					// momentはタイムスタンプに変換
					values.push(this[p].valueOf());
				}
				else {				
					values.push(this[p]);
				}
			}
		}
		
		return values;
	};

    // 値が入っているCOLリストを返す
	this.getColumnsWithValue = function() {
		var columns = [];
		
		// 自身の中で"col_"から始まっており、かつ値が入っているCOLだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && (this[p] || this[p] == 0)) {
                columns.push(p);
			}
		}
		
		return columns;
	};

    // 値が入っている値リストを返す
    this.getValuesWithValue = function() {
		var values = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && (this[p] || this[p] == 0)) {
				if (this[p] instanceof moment) {
					values.push(this[p].valueOf());
				}
				else {
                    if (this[p] == 0) {
                        values.push(0);
                    }
                    else {
        				values.push(this[p]);                    
                    }
				}
			}
		}
		
		return values;
	};

    // 値が入っているCOLリストを返す
	this.getColumnsWithValueIgnoreId = function() {
		var columns = [];
		
		// 自身の中で"col_"から始まっており、かつ値が入っているCOLだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && p.toLowerCase() != "col_id" && (this[p] || this[p] == 0)) {
                columns.push(p);
			}
		}
		
		return columns;
	};

    // 値が入っている値リストを返す
    this.getValuesWithValueIgnoreId = function() {
		var values = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && p.toLowerCase() != "col_id" && (this[p] || this[p] == 0)) {
				if (this[p] instanceof moment) {
					values.push(this[p].valueOf());
				}
				else {
                    if (this[p] == 0) {
                        values.push(0);
                    }
                    else {
        				values.push(this[p]);                    
                    }
				}
			}
		}
		
		return values;
	};

    // 値が入っている値リストを返す(Momentは維持したまま)
    this.getValuesWithValueMoment = function() {
		var values = [];
		
		// 自身の中で"col_"から始まるのだけ抽出する
		for (var p in this) {
			if (p.toLowerCase().indexOf("col_") == 0 && (this[p] || this[p] == 0)) {
                if (this[p] == 0) {
                    values.push(0);
                }
                else {
    				values.push(this[p]);                    
                }
			}
		}
		
		return values;
	};
				
}

