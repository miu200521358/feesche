const DB_NAME = "FeeScheDatabaseTest44";
// 本番用
// const DB_NAME = "FeeScheDatabase";

myApp.service('MyDBService', ['$q', '$timeout', '$translate', function($q, $timeout, $translate){
	// サービスで取り扱うテーブル一覧(クラスで管理)
	var TABLES = [
			[
				new SettingParamsTableCls(),
				new SettingFeedTableCls(),
				new FeedTableCls(),
				new SettingFilterGroupTableCls(),
				new SettingFilterTextTableCls(),
				new SettingCrawlTableCls(),
				new CrawlHistoryTableCls(),
				new SettingAlarmTableCls(),
				new AlarmHistoryTableCls()
			]
		];
	// 初期化時に登録するデータ
	var INITIALIZE = [];
	$translate(['message.welcome.title', 'message.welcome.message1', 'message.welcome.message2', 'message.welcome.message3', 'message.welcome.message4'])
		.then(
			function(translations) {
				INITIALIZE = [
					[
						new SettingParamsTableCls(null, 0, 0, 3),
						new FeedTableCls(null, "Sample", null, translations['message.welcome.title'], null, translations['message.welcome.message1'] + translations['message.welcome.message2'] + translations['message.welcome.message3'] + translations['message.welcome.message4'], moment(), moment(), moment(), 0, 0),
						new SettingFeedTableCls(null, "NASA Breaking News", "https://www.nasa.gov/rss/dyn/breaking_news.rss", 30),
						new SettingFeedTableCls(null, "コミックナタリー", "https://natalie.mu/comic/feed/news", 30),
    					new SettingFilterGroupTableCls(null, "Comic", "#5F8000", 1),
						new SettingFilterTextTableCls(null, 1,  "漫画"),
						new SettingFilterTextTableCls(null, 1,  "コミック"),
						new SettingFilterTextTableCls(null, 1,  "Comic"),
    					new SettingFilterGroupTableCls(null, "Space Station", "#72007F", 2),
    					new SettingFilterTextTableCls(null, 2,  "Space Station"),
    					new SettingFilterTextTableCls(null, 2,  "宇宙ステーション"),
						new SettingCrawlTableCls(null, 12, null),
						new SettingAlarmTableCls(null, 8, null)
					]
				];
			}
		);
	
	// DBへの接続
	// DBに何らかの処理を行う際には、必ずこれを通す
 	this.connect = function () {
		var deferred = $q.defer();
		
		$timeout(function(){
            console.log('Start connect');
            var db = window.openDatabase(DB_NAME, "", "FeeSche Database", 1024 * 1024);

			// バージョン管理付DB
			var M = new Migrator(db);
				// M.migration(1, function(tx){console.log(tx);})
			for (var n = 0; n < TABLES.length; n++) {
				// M.migration(1, function(tx){console.log(tx);})
				var m= n + 1;
				M.migration(m, function(tx){
					var idx = n - 1;
					console.log("create db ver."+ m + "/idx = "+ idx);
					// テーブル作成 ---------------
					
					for (var tbl of TABLES[idx]) {
						// リストにあるテーブルを作成していく
						console.log("tbl: "+ JSON.stringify(tbl));
						
						// 一旦既存のがあったら削除する
						var sql = 'DROP TABLE IF EXISTS '+ tbl.table_name;
						console.log(sql);
		                tx.executeSql(sql);
		                
		                // 改めてテーブルを作成する
		                sql = 'CREATE TABLE IF NOT EXISTS '+ tbl.table_name +' (col_id integer primary key autoincrement, '+ tbl.getColumnsIgnoreId().join(',') +')';
						console.log(sql);
		                tx.executeSql(sql);
					}
					
					for (var data of INITIALIZE[idx]) {
						console.log("data: "+ JSON.stringify(data));
						// 初期化データを挿入する
						console.log(data);
						
						var params = data.getValuesIgnoreId();
						
						// 値の数だけqueryを生成しておく
						var query = [];
						for (var p of params) {
							query.push("?");
						}
						
						// 初期データを投入する
						var sql = 'INSERT INTO '+ data.table_name +' ('+ data.getColumnsIgnoreId().join(',') +') VALUES ('+ query.join(',') +')';
						console.log(sql);
		                tx.executeSql(sql, params);
					}
				});
			}
			
			// 確定させる
			M.doIt();            
            
            console.log('End connect');
			deferred.resolve(db);
		}, 0);
		
		return deferred.promise;
    };
    
    // 検索条件を元にデータを返す
    // db: conncectで取得したdbクラス
    // condtion: BaseTableClsのサブクラス
    // orderByQuery: order by クエリ文字列
    this.select = function(db, condition, orderByQuery) {
		var deferred = $q.defer();
		
		var resultList = [];
		
		$timeout(function(){
			db.readTransaction(
                function(tx){
                	console.log("select 開始 TBL="+ condition.table_name);
                	
                	var sql = 'SELECT * FROM '+ condition.table_name;
                    var columns = condition.getColumnsWithValue();
                	var values = condition.getValuesWithValueMoment();
                	
                	var whereSql = "";
                	if ( columns.length > 0 ) {
                		// 条件があった場合、WHERE句追加
                		whereSql = " WHERE ";
                		for (var i = 0; i < columns.length; i++) {
                			if (i > 0) {
                				// 1個以上の場合、AND追加
                				whereSql += " AND ";
                			}
                			
                			if (values[i] instanceof moment) {
                				// momentoの場合、日付に変換してクエリにベタ書き(タイムスタンプに変更)
                				var fromDate = moment(values[i]).hours(0).minutes(0).seconds(0).milliseconds(0).add(-1, 'milliseconds');
                				var toDate = moment(values[i]).add(1, 'days').hours(0).minutes(0).seconds(0).milliseconds(0).add(-1, 'milliseconds');
                				console.log("fromDate: "+ fromDate.format('LLLL') +" -> toDate: "+ toDate.format('LLLL'));
                				
	                			whereSql += columns[i] + " > "+ fromDate.valueOf();
	                			whereSql += " AND "+ columns[i] + " < "+ toDate.valueOf();
	                			// valuesの指定はなくす
	                			values[i] = null;
                			}
                			else {
	                			whereSql += columns[i] + " = ?";
                			}
                		}
                		
                		// console.log(whereSql);
                	}
                	
                	sql += whereSql;

					if (orderByQuery) {
	                	sql += " ORDER BY "+ orderByQuery;
                	}
                	
                	console.log(sql);
                	
                	// valuesを取り直す（moment対策）
                	var values2 = [];
                	for (var v of values) {
                		if (v || v == 0) {
                			values2.push(v);
                		}
                	}
                	
                    tx.executeSql(sql , values2
                    	, function(tx, rs){
                    		// 成功時
		                    for (var i = 0; i < rs.rows.length; i++) {
		                        var row = rs.rows.item(i);
		                    	// console.log(row);
		                    	
		                    	// 検索条件のコンストラクタからオブジェクト再生成
		                    	var Const = condition.constructor;
	                    		var data = new Const();
	                    		
	                    		// 検索結果をオブジェクトに設定
		                    	for (var r in row) {
		                    		data[r] = row[r];
		                    	}
		                    	
	                    		// console.log(data); 
	                    		
	                    		resultList.push(data);
		                    }                    		
				            
				            console.log("resultList.length: "+ resultList.length);
							deferred.resolve(resultList);
                    	}, function(tx, err) {
                    		// SELECT失敗時
							console.error("select 失敗: TBL="+ condition.table_name);
							console.error(err);
							console.error(err.code);
							console.error(err.message);
							console.error(JSON.stringify(err));
							deferred.resolve(null);
                    	});
                }, 
                function(err){
                    // トランザクション失敗時
					console.error("select TRANSACTION 失敗: TBL="+ condition.table_name);
					console.error(err);
					console.error(err.code);
					console.error(err.message);			
                }, 
                function(){
                    // トランザクション成功時
					console.log("select TRANSACTION 成功: TBL="+ condition.table_name);
                }
			);
		}, 0);
		
		return deferred.promise;
    };
    
    // IDを元に、追加または更新を実行する
    // db: conncectで取得したdbクラス
    // data: BaseTableClsのサブクラス
    this.save = function(db, data) {
		var deferred = $q.defer();
		
		$timeout(function(){
			db.transaction(
                function(tx){
                	console.log("save 開始 TBL="+ data.table_name);
                	
                    // 値が入っているものだけ対象とする
					var params = data.getValuesWithValueIgnoreId();
					
					// 値の数だけqueryを生成しておく
					var columns = data.getColumnsWithValueIgnoreId();
					
					var sql = "";
					if (data.col_id) {
						// IDがある場合、更新
						var sets = [];
						
						for (var c of columns) {
							sets.push(c +" = ? ");
						}
						
						sql = 'UPDATE '+ data.table_name +' SET '+ sets.join(',') + " WHERE col_id = "+ data.col_id;
					}
					else {
						// IDがない場合、追加
						var sets = [];
						
						for (var c of columns) {
							sets.push("?");
						}
							
						sql = 'INSERT INTO '+ data.table_name +' ('+ data.getColumnsWithValueIgnoreId().join(',') +') VALUES ('+ sets.join(',') +')';
					}
			
					console.log(sql);
					console.log(JSON.stringify(params));						
                	
                    tx.executeSql(sql, params
                    	, function(tx, rs){
                    		// 成功時
							console.log("save executeSql 成功: TBL="+ data.table_name);
							deferred.resolve(true);
                    	}, function(tx, err) {
                    		// 失敗時
							console.error("save executeSql 失敗: TBL="+ data.table_name);
							console.error(err);
							console.error(err.code);
							console.error(err.message);
    						deferred.resolve(false);
                    	});
                }, 
                function(err){
                    // 失敗時
					console.error("save TRANSACTION 失敗: TBL="+ data.table_name);
					console.error(err);
					console.error(err.code);
					console.error(err.message);
                }, 
                function(){
                    // 成功時
					console.log("save TRANSACTION 成功: TBL="+ data.table_name);
				}
			);
		}, 0);
		
		return deferred.promise;
    };

    // IDを元に、削除を実行する
    // db: conncectで取得したdbクラス
    // data: BaseTableClsのサブクラス
    this.delete = function(db, condition) {
		var deferred = $q.defer();
		
		$timeout(function(){
			db.transaction(
                function(tx){
                	console.log("delete 開始 TBL="+ condition.table_name);
					
					var sql = 'DELETE FROM '+ condition.table_name;
					
                	var columns = [];
                	var values = [];
                	
                	// 条件オブジェクトで値が入っているものを条件として加える
                	for (var p in condition) {
						if (p.toLowerCase().indexOf("col_") == 0 && condition[p]) {
							columns.push(p);
							values.push(condition[p]);
						}
                	}
                	
                	var whereSql = "";
                	if ( columns.length > 0 ) {
                		// 条件があった場合、WHERE句追加
                		whereSql = " WHERE ";
                		for (var i = 0; i < columns.length; i++) {
                			if (i > 0) {
                				// 1個以上の場合、AND追加
                				whereSql += " AND ";
                			}
                			
                			whereSql += columns[i] + " = ?";
                		}
                		
                		// console.log(whereSql);
                	}
                	
                	sql += whereSql;
					
					console.log(sql);
                	
					// SQL実行
                    tx.executeSql(sql, values
                    	, function(tx, rs){
                    		// 成功時
							console.log("delete executeSql 成功: TBL="+ condition.table_name);
							deferred.resolve(true);
                    	}, function(tx, err) {
                    		// 失敗時
							console.error("delete executeSql 失敗: TBL="+ condition.table_name);
							console.error(err);
							console.error(err.code);
							console.error(err.message);
                    	});
                }, 
                function(err){
                    // 失敗時
					console.error("delete TRANSACTION 失敗: TBL="+ condition.table_name);
					console.error(err);
					console.error(err.code);
					console.error(err.message);
                }, 
                function(){
                    // 成功時
					console.log("delete TRANSACTION 成功: TBL="+ condition.table_name);
				}
			);
		}, 0);
		
		return deferred.promise;
    };
    
    this.maxTimestampBySiteUrl = function(db, feed) {
    	// サイトURLごとの取得最新日を検索する
		var deferred = $q.defer();
		
		$timeout(function(){
			db.readTransaction(
                function(tx){
                	var sql = 'SELECT MAX(col_entry_published_date) as max_timestamp FROM TBL_FEED WHERE col_url = ?';
                	
                    tx.executeSql(sql , [feed.col_url]
                    	, function(tx, rs){
                    		var maxTimestamp = 0;
                    		// 成功時
                    		if (rs.rows.length > 0) {
		                        maxTimestamp = rs.rows.item(0).max_timestamp;
		                        if (!maxTimestamp) {
		                        	maxTimestamp = 0;
		                        }
		                        // console.log("maxTimestamp あり: "+ maxTimestamp);
                    		}
							deferred.resolve(maxTimestamp);
                    	}, function(tx, err) {
                    		// SELECT失敗時
							console.error("maxTimestampBySiteUrl 失敗");
							console.error(err);
							console.error(err.code);
							console.error(err.message);
							console.error(JSON.stringify(err));
							deferred.resolve(-1);
                    	});
                }, 
                function(err){
                    // トランザクション失敗時
					console.error("maxTimestampBySiteUrl TRANSACTION 失敗");
					console.error(err);
					console.error(err.code);
					console.error(err.message);
                }, 
                function(){
                    // トランザクション成功時
					console.log("maxTimestampBySiteUrl TRANSACTION 成功");
                }
			);
		}, 0);
		
		return deferred.promise;
    };

	// 各TELの最大IDを取得する
    this.selectMaxId = function(db, condition) {
		var deferred = $q.defer();
		
		$timeout(function(){
			db.readTransaction(
                function(tx){
                	var sql = 'SELECT MAX(col_id) as max_id FROM '+ condition.table_name;
                	
					console.log(sql);
                	
                    tx.executeSql(sql,[]
                    	, function(tx, rs){
                    		var maxId = 0;
                    		// 成功時
                    		if (rs.rows.length > 0) {
		                        maxId = rs.rows.item(0).max_id;
		                        if (!maxId) {
		                        	maxId = 0;
		                        }
		                        // console.log("maxId あり: "+ max_id);
                    		}
							deferred.resolve(maxId);
                    	}, function(tx, err) {
                    		// SELECT失敗時
							console.error("selectMaxId 失敗");
							console.error(err);
							console.error(err.code);
							console.error(err.message);
							console.error(JSON.stringify(err));
							deferred.resolve(-1);
                    	});
                }, 
                function(err){
                    // トランザクション失敗時
					console.error("selectMaxId TRANSACTION 失敗");
					console.error(err);
					console.error(err.code);
					console.error(err.message);
				}, 
                function(){
                    // トランザクション成功時
					console.log("selectMaxId TRANSACTION 成功");
                }
			);
		}, 0);
		
		return deferred.promise;
    };
        
    this.saveFeed = function(db, feed) {
        
        var deferred = $q.defer();
        
    	// 最新取得日以降のもののみ登録対象とする
        $timeout(() => {        
        	this.maxTimestampBySiteUrl(db, feed)
        	.then( maxTimestamp => {
        		if ( feed.col_entry_published_date.valueOf() > maxTimestamp ) {
    		    	var condition = new FeedTableCls();
    		    	condition.col_entry_link = feed.col_entry_link;
    		    	
    		    	this.select(db, condition)
    		    	.then( resultList => {
    						if (resultList.length > 0) {
    							console.log("既存フィードあり col_id="+ resultList[0].col_id);
    							feed.col_id = resultList[0].col_id;
    						}
    						
    						// フィードパース日付があるものだけ登録
    						if (feed.col_entry_parse_date) {
    							this.save(db, feed).then((result) => {
                                    console.log("save result: "+ result);
        						    if (result) {
            							console.log("saveFeedPromise save success: "+ JSON.stringify(feed));
                                        deferred.resolve(true);
        						    }
                                    else {
            							console.log("saveFeedPromise save failure: "+ JSON.stringify(feed));
        								deferred.reject(false);
                                    }
    							});
    						}
                            else {
                                console.log("saveFeed 日付なし: "+ feed.col_url);                    
                                deferred.resolve(true);
                            }
    					},
    					function (response) {
    						console.log("saveFeed 失敗: response="+ JSON.stringify(response));
    					}
    		    	);		
        		}
                else {
                    console.log("saveFeed 対象外: "+ feed.col_url);                    
                    deferred.resolve(true);
                }
        	});
        }, 0);
        
		return deferred.promise;        
    };
    
    // グループの表示順に合わせてテキストリストを取得
    this.selectFilterTextByGroupOrder = function(db) {
		var deferred = $q.defer();
		
		var resultList = [];
		
		$timeout(function(){
			db.readTransaction(
                function(tx){
                	var groupCondtion = new SettingFilterGroupTableCls();
                	var textCondtion = new SettingFilterTextTableCls();
                	
                	var sql = 'SELECT textTbl.* FROM '+ groupCondtion.table_name + " groupTbl, "+ textCondtion.table_name +" textTbl "
                				+ " where groupTbl.col_id = textTbl.col_group_id "
                				+ " order by groupTbl.col_order_by ASC ";
                	
                	console.log(sql);
                	
                    tx.executeSql(sql , []
                    	, function(tx, rs){
                    		// 成功時
		                    for (var i = 0; i < rs.rows.length; i++) {
		                        var row = rs.rows.item(i);
		                    	// console.log(row);
		                    	
		                    	// 検索条件のコンストラクタからオブジェクト再生成
		                    	var Const = textCondtion.constructor;
	                    		var data = new Const();
	                    		
	                    		// 検索結果をオブジェクトに設定
		                    	for (var r in row) {
		                    		data[r] = row[r];
		                    	}
		                    	
	                    		// console.log(data); 
	                    		
	                    		resultList.push(data);
		                    }                    		
				            
				            console.log("resultList.length: "+ resultList.length);
							deferred.resolve(resultList);
                    	}, function(tx, err) {
                    		// SELECT失敗時
							console.error("selectFilterTextByGroupOrder 失敗");
							console.error(err);
							console.error(err.code);
							console.error(err.message);
							console.error(JSON.stringify(err));
							deferred.resolve(null);
                    	});
                }, 
                function(err){
                    // トランザクション失敗時
					console.error("selectFilterTextByGroupOrder TRANSACTION 失敗");
					console.error(err);
					console.error(err.code);
					console.error(err.message);
				}, 
                function(){
                    // トランザクション成功時
					console.log("selectFilterTextByGroupOrder TRANSACTION 成功");
                }
			);
		}, 0);
		
		return deferred.promise;
    };
    
    // 日付範囲を限定し、検索条件を元にデータを返す
    // db: conncectで取得したdbクラス
    // start: 日付範囲startを含む検索条件
    // end: 日付範囲endを含む検索条件
    // condtion: BaseTableClsのサブクラス
    // orderByQuery: order by クエリ文字列
    this.selectRangeDate = function(db, startCondition, endCondition, condition, orderByQuery) {
    	var deferred = $q.defer();
		
		var resultList = [];
		
		$timeout(function(){
			db.readTransaction(
                function(tx){
                	console.log("selectRangeDate 開始 TBL="+ condition.table_name);
                	
                	var sql = 'SELECT * FROM '+ condition.table_name;
                	var columns = condition.getColumnsWithValue();
                	var values = condition.getValuesWithValue();
                	
                	var whereSql = " WHERE ";
                    
                    // 開始の条件
                    var startCol = startCondition.getColumnsWithValue()[0];
                    var start = startCondition.getValuesWithValue()[0];
                    
                    // 終了の条件
                    var endCol = endCondition.getColumnsWithValue()[0];
                    var end = endCondition.getValuesWithValue()[0];
                    
                    // 日付範囲を限定
            		var startDate = moment(start).hours(0).minutes(0).seconds(0).milliseconds(0).add(-1, 'milliseconds');
    				var endDate = moment(end).add(1, 'days').hours(0).minutes(0).seconds(0).milliseconds(0).add(-1, 'milliseconds');
    				console.log("startDate: "+ startDate.format('LLLL') +" -> endDate: "+ endDate.format('LLLL'));
    				
        			whereSql += startCol + " > "+ startDate.valueOf();
        			whereSql += " AND "+ endCol + " < "+ endDate.valueOf();
                    
                	if ( columns.length > 0 ) {
                		// 条件があった場合、WHERE句追加
                        
                		for (var i = 0; i < columns.length; i++) {
            				// ANDは常に追加
            				whereSql += " AND ";
                			
                			if (values[i] instanceof moment) {
                				// momentoの場合、日付に変換してクエリにベタ書き(タイムスタンプに変更)
                				var fromDate = moment(values[i]).hours(0).minutes(0).seconds(0).milliseconds(0).add(-1, 'milliseconds');
                				var toDate = moment(values[i]).add(1, 'days').hours(0).minutes(0).seconds(0).milliseconds(0).add(-1, 'milliseconds');
                				console.log("fromDate: "+ fromDate.format('LLLL') +" -> toDate: "+ toDate.format('LLLL'));
                				
	                			whereSql += columns[i] + " > "+ fromDate.valueOf();
	                			whereSql += " AND "+ columns[i] + " < "+ toDate.valueOf();
	                			// valuesの指定はなくす
	                			values[i] = null;
                			}
                			else {
	                			whereSql += columns[i] + " = ?";
                			}
                		}
                		
                		// console.log(whereSql);
                	}
                	
                	sql += whereSql;

					if (orderByQuery) {
	                	sql += " ORDER BY "+ orderByQuery;
                	}
                	
                	console.log(sql);
                	
                	// valuesを取り直す（moment対策）
                	var values2 = [];
                	for (var v of values) {
                		if (v || v == 0) {
                			values2.push(v);
                		}
                	}
                	
                    tx.executeSql(sql , values2
                    	, function(tx, rs){
                    		// 成功時
		                    for (var i = 0; i < rs.rows.length; i++) {
		                        var row = rs.rows.item(i);
		                    	// console.log(row);
		                    	
		                    	// 検索条件のコンストラクタからオブジェクト再生成
		                    	var Const = condition.constructor;
	                    		var data = new Const();
	                    		
	                    		// 検索結果をオブジェクトに設定
		                    	for (var r in row) {
		                    		data[r] = row[r];
		                    	}
		                    	
	                    		// console.log(data); 
	                    		
	                    		resultList.push(data);
		                    }                    		
				            
				            console.log("resultList.length: "+ resultList.length);
							deferred.resolve(resultList);
                    	}, function(tx, err) {
                    		// SELECT失敗時
							console.error("select 失敗: TBL="+ condition.table_name);
							console.error(err);
							console.error(err.code);
							console.error(err.message);
							console.error(JSON.stringify(err));
							deferred.resolve(null);
                    	});
                }, 
                function(err){
                    // トランザクション失敗時
					console.error("select TRANSACTION 失敗: TBL="+ condition.table_name);
					console.error(err);
					console.error(err.code);
					console.error(err.message);
				}, 
                function(){
                    // トランザクション成功時
					console.log("select TRANSACTION 成功: TBL="+ condition.table_name);
                }
			);
		}, 0);
		
		return deferred.promise;
    };
            
}]);

// DBバージョン管理クラス
// 参考: http://blog.maxaller.name/2010/03/html5-web-sql-database-intro-to-versioning-and-migrations/
function Migrator(db){
	var migrations = [];
	this.migration = function(number, func){
		// console.log("migration number="+ number);
		// console.log(func);
		migrations[number] = func;
		// console.log("migration migrations[number]="+ migrations[number]);
	};
	var doMigration = function(number){
		// console.log("doMigration number="+ number);
		// console.log(migrations[number]);
		if(migrations[number]){
			db.changeVersion(db.version, String(number), function(t){
					migrations[number](t);
				}, function(err){
					if(console.error) console.error("Error!: %o", err);
				}, function(){
					doMigration(number+1);
				});
		}
	};
	this.doIt = function(){
		var initialVersion = parseInt(db.version) || 0;
		try {
			doMigration(initialVersion+1);
		} catch(e) {
			if(console.error) console.error(e);
		}
	};
}

