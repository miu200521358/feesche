// フィード取得バックグラウンドモードキー
var FEESCHE_FEED_CRAWL_KEY = "FEESCHE_FEED_CRAWL_KEY";
// フィードアラームバックグラウンドモードキー
var FEESCHE_FEED_ALARM_KEY = "FEESCHE_FEED_ALARM_KEY";

myApp.service('MyFeedService', ['$q', '$timeout', '$http', '$sce', 'MyDBService', function($q, $timeout, $http, $sce, MyDBService){
    // フィードをパースして、フィードリストを返します
 	this.parseFeed = function (name, url) {
    	console.log("checkFeed: url="+ url);
 		
		var deferred = $q.defer();
		
		$timeout(function(){
			$http({
				method: 'GET',
				url: $sce.trustAsUrl(url)
			}).then(function successCallback(response) {
				console.log("MyFeedService parse success");
				// console.log(response);
				
				// console.log("MyFeedService parse success response.data -----------");
				// console.log(response.data);
				
				var feedList = parseXml2Feed(name, url, response.data);
				
				if (feedList.length > 0) {
					// フィードが取得できた場合、成功を返す
					deferred.resolve(feedList);
				}
				else {
					// フィードが取得できなかった場合、失敗でレスポンスそのものを返す
					deferred.reject(response);
				}
			}, function errorCallback(response) {
				// 失敗した場合
				console.log("MyFeedService parse failure");
				deferred.reject(response);
			});
		});
		
		return deferred.promise;
    };
    

	// フィードを保存します
	this.saveFeed = function(feedList) {
        var deferred = $q.defer();
        
		MyDBService.connect().then(
			function(db) {
				// 実行リストにフィードを登録
				var promises = [];
				
				for (var feed of feedList) {
					promises.push(MyDBService.saveFeed(db, feed));
				}
				
				// フィード登録処理を遅延実行
				$q.all(promises).finally(() => {
                    console.log("*** saveFeed finish");
                    deferred.resolve(true);
				});
			}
  		);
                  
		return deferred.promise;
    };
    
    // 全フィードをクロールして保存します。
    this.crawlAllFeed = function() {
    	console.log("crawlAllFeed start "+ moment().format('YYYY/MM/DD hh:mm:ss'));
        
    	var deferred = $q.defer();
    	
		MyDBService.connect()
		.then(function(db) {
			// 開始時刻を履歴に設定
			return MyDBService.save(db, 
				new CrawlHistoryTableCls(null, moment().valueOf()));
		}).then(
			function() {
				// 設定取得
				MyDBService.connect()
				.then(
					function(db) {
						return MyDBService.select(db, new SettingCrawlTableCls());
					}
				).then(
					results => {
						// 次回クロール予定を算出して設定
                        results[0].calcNextCrawl();
						
						// 非同期で保存
						MyDBService.connect().then(
							function(db) {
								return MyDBService.save(db, results[0]);
							}
						);
					}
				);
			}
		)
		.then( result => {
			// リスト取得
			MyDBService.connect().then(
				function(db) {
					return MyDBService.select(db, new SettingFeedTableCls());
				}
			).then( feedSettingList => {
				// 実行リストにフィードを登録
				var promises = [];

				// アラーム除去
				promises.push(this.alarmOffExpired());
				
				for (var feedSetting of feedSettingList) {
                    // 削除
					promises.push(this.deleteFeedSetting(feedSetting));
                    // クローリング
    				promises.push(this.crawlFeedSetting(feedSetting));
				}
				
				// フィード登録処理を遅延実行
				$q.all(promises).finally(() => {
                    console.log("*** crawlAllFeed finish");
                    deferred.resolve(true);
				});
			});
		});
    	
		return deferred.promise;
        
    };
    
    // フィードサイト1件ずつのクロール処理
    this.crawlFeedSetting = function(feedSetting) {
    	console.log("crawlFeedSetting: "+ feedSetting.col_name);
		
        var deferred = $q.defer();
        
		// URLを元にパースする
		this.parseFeed(feedSetting.col_name, feedSetting.col_url)
		.then(
			feedList => {
				// 取得したフィードを保存する
				this.saveFeed(feedList).finally(() => {
                    console.log("*** crawlFeedSetting finish");
                    deferred.resolve(true);    			    
				});
			}
		);
        
		return deferred.promise;
    };
    
    // フィードサイト1件ずつの削除処理
    this.deleteFeedSetting = function(feedSetting) {
        console.log("deleteFeedSetting: "+ feedSetting.col_name);
		
        var deferred = $q.defer();
    
    	MyDBService.connect().then(
    		function(db) {
                // 開始はUnixEpochベース
                var startCondition = new FeedTableCls();
                startCondition.col_entry_parse_date = moment().year(1970);
                
                // 終了は現在から保持日数直前まで
                var endCondition = new FeedTableCls();
                endCondition.col_entry_parse_date = moment().subtract(feedSetting.col_retention_days, 'days');
                
                // 条件としてURL
                var condition = new FeedTableCls();
                condition.col_url = feedSetting.col_url;
                
    			return MyDBService.selectRangeDate(db, startCondition, endCondition, condition, null);
    		}
    	).then(feedList => {
            MyDBService.connect().then(db => {
				// 実行リストにフィードを登録
				var promises = [];
				
				for (var feed of feedList) {
					promises.push(MyDBService.delete(db, feed));
				}
				
				// フィード削除処理を遅延実行
				$q.all(promises).finally(() => {
                    console.log("*** deleteFeed finish");
                    deferred.resolve(true);
				});
			});
    	});
        
		return deferred.promise;
    };
    

    // フィード全体アラームオフ処理
    this.alarmOffExpired = function() {
        console.log("alarmOffExpired:");
		
        var deferred = $q.defer();
    
    	MyDBService.connect().then(
    		function(db) {
                // 開始はUnixEpochベース
                var startCondition = new FeedTableCls();
                startCondition.col_alarm_date = moment().year(1970);
                
                // 終了は現在直前まで
                var endCondition = new FeedTableCls();
                endCondition.col_alarm_date = moment().subtract(10, 'minutes');
                
                // 条件としてアラームON
                var condition = new FeedTableCls();
                condition.col_alarm_flg = 1;
                
    			return MyDBService.selectRangeDate(db, startCondition, endCondition, condition, null);
    		}
    	).then(feedList => {
            MyDBService.connect().then(db => {
				// 実行リストにフィードを登録
				var promises = [];
				
				for (var feed of feedList) {
					// アラームをOFFにする
					feed.col_alarm_flg = 0;
					feed.col_alarm_date = null;
					promises.push(MyDBService.save(db, feed));
				}
				
				// フィード保存処理を遅延実行
				$q.all(promises).finally(() => {
                    console.log("*** alarmOffExpired finish");
                    deferred.resolve(true);
				});
			});
    	});
        
		return deferred.promise;
    };
	
	
    this.alarmFeed = function() {
    	console.log("alarmFeed start "+ moment().format('YYYY/MM/DD hh:mm:ss'));
    	
		MyDBService.connect()
		.then(function(db) {
			// 開始時刻を履歴に設定
			return MyDBService.save(db, 
				new AlarmHistoryTableCls(null, moment().valueOf()));
		})
		.then( result => {
			// 今日の日付でアラーム対象のものを検索する
			var condition = new FeedTableCls();
			condition.col_entry_parse_date = moment();
			condition.col_alarm_flg = 1;
			
			// リスト取得
			MyDBService.connect().then(
				function(db) {
					return MyDBService.select(db, condition);
				}
			).then( feedList => {
				// アラーム対象がある場合
				// TODO ローカル通知
				
				
				// TODO 次回通知を設定
				alert(feedList.length);
				
				
				var promises = [];
				
				for (var feed of feedList) {
					promises.push(this.alarmFeedOff(feed));
				}
				
				// フィードアラームOFF処理を遅延実行
				$q.all(promises);
			});
		});
    };

	// フィードを表示済みに変更
    this.saveFeedListShown = function(feedList) {
		var promises = [];
    	
        var deferred = $q.defer();
    	
		for (var feed of feedList) {
			promises.push(this.saveFeedShown(feed));
		}
    
    	// フィード登録処理を遅延実行
		$q.all(promises).then(() => {
            deferred.resolve(true);
		});
		        
		return deferred.promise;
    };
    
	// フィードを表示済みに変更
    this.saveFeedShown = function(feed) {
		var deferred = $q.defer();
		
		MyDBService.connect()
		.then(function(db) {
			feed.col_shown_flg = 1;
			
			// 開始時刻を履歴に設定
			MyDBService.save(db, feed).then(() => {
				deferred.resolve(true);
			});
		});

		return deferred.promise;
    };
    
	// フィードのアラートをOFFに変更
    this.alarmFeedOff = function(feed) {
		MyDBService.connect()
		.then(function(db) {
			feed.col_alarm_flg = 0;
			
			// 開始時刻を履歴に設定
			MyDBService.save(db, feed);
		});
    };
        
    this.setNextAlarm = function() {
		
		// 設定取得
		MyDBService.connect().then(
			function(db) {
				return MyDBService.select(db, new SettingAlarmTableCls());
			}
		).then(
			results => {
				// 翌日の指定時刻を設定
				var nextAlarm = moment().add(1, 'days').hour(results[0].col_alarm_hour).minutes(0).seconds(0).milliseconds(0);
				
				results[0].col_next_alarm_timestamp = nextAlarm.valueOf();
				
				// 非同期で保存
				MyDBService.connect().then(
					function(db) {
						return MyDBService.save(db, results[0]);
					}
				);
				
				console.log("nextAlarm: "+ nextAlarm.locale('ja').format('LLLL'));
				
				// 翌日の指定時刻から現在を引いて、ミリ秒算出
				var delay = nextAlarm.valueOf() - moment().valueOf();
				
				console.log("delay: "+ delay);
				
				// フィードインターバルを設定
				// 時間単位
				feedAlarmTimeout = $timeout(
					function() {
						this.alarmFeed();
					}
					, delay
				);		    	
			}
		);
		
    };
	
}]);

// フィードXMLをDB用クラスに変換します
function parseXml2Feed(name, url, data) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(data, "application/xml");
    
    var feedList = [];
    
    var channels = doc.getElementsByTagName('channel');
    if (channels.length > 0) {
    	var items = channels[0].getElementsByTagName('item');
    	if (items.length > 0) {
		    // Rss2.0取得(.rss)
		    for (var i = 0; i < items.length; i++) {
		    	var feed = new FeedTableCls();
		    	feed.col_name = name;
		    	feed.col_url = url;
		    	feed.col_alarm_flg = 0;
		    	feed.col_shown_flg = 0;
		    	
		    	if (items[i].getElementsByTagName('title').length > 0) {
			    	feed.col_entry_title = trimFeedContent(items[i].getElementsByTagName('title')[0].innerHTML);
		    	}
		    	if (items[i].getElementsByTagName('link').length > 0) {
		    		feed.col_entry_link = items[i].getElementsByTagName('link')[0].innerHTML;
		    	}
		    	if (items[i].getElementsByTagName('pubDate').length > 0) {
					// momentに受け渡す
					// 発行日を先に判定
			    	feed.col_entry_published_date = moment(items[i].getElementsByTagName('pubDate')[0].innerHTML);
			    	// console.log("feed.col_entry_published_date: "+ feed.col_entry_published_date.format());
		    	}
		    	if (items[i].getElementsByTagName('description').length > 0) {
			    	feed.col_entry_content = trimFeedContent(items[i].getElementsByTagName('description')[0].innerHTML);
			    	// 内容から日付を抽出
			    	feed.parseDate();
		    	}
		    	
		    	feedList.push(feed);
		    	
		    	console.log(JSON.stringify(feed));
		    }
    	}
    	else {
		    // Rss1.0取得(.rdf)
		    var items = doc.getElementsByTagName('item');
		    for (var i = 0; i < items.length; i++) {
		    	var feed = new FeedTableCls();
		    	feed.col_name = name;
		    	feed.col_url = url;
		    	feed.col_alarm_flg = 0;
		    	feed.col_shown_flg = 0;
		    	
		    	if (items[i].getElementsByTagName('title').length > 0) {
			    	feed.col_entry_title = trimFeedContent(items[i].getElementsByTagName('title')[0].innerHTML);
		    	}
		    	if (items[i].getElementsByTagName('link').length > 0) {
		    		feed.col_entry_link = items[i].getElementsByTagName('link')[0].innerHTML;
		    	}
		    	if (items[i].getElementsByTagName('dc:date').length > 0) {
		    		// momentに受け渡す
					// 発行日を先に判定
			    	feed.col_entry_published_date = moment(items[i].getElementsByTagName('dc:date')[0].innerHTML);
			    	// console.log("feed.col_entry_published_date: "+ feed.col_entry_published_date.format());
		    	}
		    	if (items[i].getElementsByTagName('description').length > 0) {
			    	feed.col_entry_content = trimFeedContent(items[i].getElementsByTagName('description')[0].innerHTML);
			    	// 内容から日付を抽出
			    	feed.parseDate();
		    	}
		    	
		    	feedList.push(feed);
		    	
		    	console.log(JSON.stringify(feed));
		    }
    	}
    }
    else {    	
	    // Atom取得
	    var entries = doc.getElementsByTagName('entry');
	    for (var i = 0; i < entries.length; i++) {
	    	var feed = new FeedTableCls();
	    	feed.col_name = name;
	    	feed.col_url = url;
	    	feed.col_alarm_flg = 0;
	    	feed.col_shown_flg = 0;
	    	
	    	if (entries[i].getElementsByTagName('title').length > 0) {
		    	feed.col_entry_title = trimFeedContent(entries[i].getElementsByTagName('title')[0].innerHTML);
	    	}
	    	if (entries[i].getElementsByTagName('link').length > 0) {
	    		feed.col_entry_link = entries[i].getElementsByTagName('link')[0].getAttribute("href");
	    		console.log("feed.col_entry_link: "+ feed.col_entry_link);
	    	}
	    	if (entries[i].getElementsByTagName('updated').length > 0) {
	    		// momentに受け渡す
				// 発行日を先に判定
				feed.col_entry_published_date = moment(entries[i].getElementsByTagName('updated')[0].innerHTML);
		    	// console.log("feed.col_entry_published_date: "+ feed.col_entry_published_date.format());
	    	}
	    	if (entries[i].getElementsByTagName('summary').length > 0) {
		    	feed.col_entry_content = trimFeedContent(entries[i].getElementsByTagName('summary')[0].innerHTML);
		    	// 内容から日付を抽出
		    	feed.parseDate();
	    	}
	    	
	    	feedList.push(feed);
	    	
	    	// console.log(JSON.stringify(feed));
	    }
    }
    
    return feedList;
}

// Feed内の文字列を適切っぽくtrimする
function trimFeedContent(txt) {
	// 正しくなければnull
	if (!txt) return null;
	
	// CDDATAはreplace
	txt = txt.replace(/^\<\!\[CDATA\[/i, "");
	txt = txt.replace(/\]\]\>$/i, "");
	txt = txt.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
	
	return txt;
}

