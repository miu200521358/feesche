// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // 設定画面遷移
        .state('crawl', {
            url: '/crawl/index',
            templateUrl: 'app/crawl/index.html',
            controller: 'SettingClawlController',
            title: "menu.crawl",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]            
        });

}]);


// タイマー設定コントローラ
myApp.controller('SettingClawlController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$interval', '$q', '$timeout', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $interval, $q, $timeout, SharedScopes, MyDBService, MyFeedService) {
	
    loadSetting();
    
	// 設定取得
    function loadSetting() {
    	MyDBService.connect().then(
    		function(db) {
    			return MyDBService.select(db, new SettingCrawlTableCls());
    		}
    	).then(
    		function(results) {
    			$scope.crawl = results[0];
                
        		$scope.nextCrawl = results[0].displayNextCrawl();
    		}
    	);
    }
	
	loadHistoryList();
	
	function loadHistoryList() {

		// 履歴取得
		MyDBService.connect().then(
			function(db) {
				return MyDBService.select(db, new CrawlHistoryTableCls(), "col_start_timestamp DESC");
			}
		).then(
			function(historyList) {
				$scope.histories = historyList;
			}
		);
	}
	
	$scope.save = function() {
		console.log("id="+ $scope.crawl.col_id + ", interval="+ $scope.crawl.col_interval);
	    
        var crawlTbl = new SettingCrawlTableCls($scope.crawl.col_id, $scope.crawl.col_interval);
        // 次の時間も一緒に計算する
        crawlTbl.calcNextCrawl();
        
		// 登録実行
		MyDBService.connect().then(
			function(db) {
				return MyDBService.save(db, crawlTbl);
			}
		).then(
			function(result) {
				// 保存成功メッセージ
				return $translate(['message.save.success', 'message.crawl.confirm.title', 'message.crawl.confirm.message']);
			}, function (err) {
				// 保存失敗メッセージ
				return $translate(['message.save.failure']);
			}
		// ).then(
		// 	function (translations) {
		// 		console.log("tbl: "+ JSON.stringify(translations));
		// 		if (!translations['message.save.failure']) {
		// 			// 保存成功時は、タイマー開始有無を確認する
		// 			ons.notification.confirm({
		// 				title: translations['message.crawl.confirm.title'],
		// 				messageHTML: translations['message.save.success'] + "<br>"+ translations['message.crawl.confirm.message'],
		// 				callback: function(answer) {
		// 					console.log("answer="+ answer);
		// 					if (answer) {
		// 						// タイマーOKの場合のみ、タイマー開始処理実行
  //                               
  //   							// とりあえず一回全取得
		// 						MyFeedService.crawlAllFeed();
		// 						
  //                               // Androidの場合
  //                               if (monaca.isAndroid) {
  //                                   
  //                                   window.BackgroundTimer.onTimerEvent(function(){
  //                                       // タイマー処理するイベントを登録
  //   									MyFeedService.crawlAllFeed();
  //                                   });
  //                                   
  //                                   window.BackgroundTimer.start(function(){
  //                                       // 成功した場合
  //           							
  //       								$translate('message.crawl.start.success').then(
  //       									function (txt) {
  //       										ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
  //       										
  //       										// 履歴再読み込み
  //       										loadHistoryList();
  //                                               // 設定再読み込み
  //                                               loadSetting();
  //       									}, function (translationId) {
  //       										ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
  //       									}
  //       								);
  //                                       
  //                                   },  function() {
  //                                       //失敗した場合
  //       						
  //       								$translate('message.crawl.start.failure').then(
  //       									function (txt) {
  //       										ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
  //       										
  //       										// 履歴再読み込み
  //       										loadHistoryList();
  //       									}, function (translationId) {
  //       										ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
  //       									}
  //       								);
  //                                       
  //                                   }, {
  //                                       // 設定
  //                                       timerInterval: crawlTbl.calcIntervalMilliseconds(),
  //                                       // 端末再起動したら、タイマーリスタート
  //                                       startOnBoot: true,
  //                                       // アプリを終了してもタイマーは終了しない
  //                                       stopOnTerminate: false
  //                                   });
  //                               }
  //                               // iOSは別途要実装
  //                               else if (monaca.isIOS) {
  //                                   console.error("iOS版タイマー処理未実装");
  //                               }
  //                               
		// 					}
		// 					else {
		// 						// タイマーNGの場合、タイマー停止
  //                               
  //                               // 次回予定にNULL設定
  //                   			$scope.crawl.col_next_crawl_timestamp = null;
  //                               
  //                               MyDBService.connect().then(
  //                               	function(db) {
  //                           			return MyDBService.save(db, $scope);
  //                           		}
  //                           	).then(){
  //                                   function() {
  //                                       
  //           							
  //                                       // Androidの場合
  //                                       if (monaca.isAndroid) {
  //                                           window.BackgroundTimer.stop(function(){
  //                                               // 成功した場合
  //                                   
  //                       						$translate('message.crawl.stop.success').then(
  //               									function (txt) {
  //               										ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
  //               										
  //               										// 履歴再読み込み
  //               										loadHistoryList();
  //               									}, function (translationId) {
  //               										ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
  //               									}
  //               								);
  //                                               
  //                                               
  //                                           },  function() {
  //                                               //失敗した場合
  //                                               
  //                       						$translate('message.crawl.stop.failure').then(
  //               									function (txt) {
  //               										ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
  //               										
  //               										// 履歴再読み込み
  //               										loadHistoryList();
  //                                                       // 設定再読み込み
  //                                                       loadSetting();
  //               									}, function (translationId) {
  //               										ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
  //               									}
  //               								);
  //                                               
  //                                               
  //                                           });
  //                                       }
  //                                       // iOSは別途要実装
  //                                       else if (monaca.isIOS) {
  //                                           console.error("iOS版タイマー処理未実装");
  //                                       }
  //                                       
  //                                       
  //                                       
  //                                       
  //                                   }
  //                           	}
  //                   		}
		// 				}
		// 			});
		// 		}
		// 		else {
		// 			ons.notification.toast(translations['message.save.failure'], ONS_NOTIFICATION_TOAST_OPTIONS);
		// 		}
		// 	}, function (translationId) {
		// 		ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
		// 	}
		);

	};
	
	$scope.deleteCrawlHistory = function(data) {
		$translate(['message.delete.confirm.title', 'message.delete.confirm.message'])
		.then(function (translations) {
			ons.notification.confirm({
				title: translations['message.delete.confirm.title'],
				message: translations['message.delete.confirm.message'],
				callback: function(answer) {
					console.log("answer="+ answer);
					if (answer) {
						// 削除OKの場合のみ、削除処理実行
						
						MyDBService.connect()
						.then(function(db) {
							// 削除処理
							return MyDBService.delete(db
								, new CrawlHistoryTableCls());
						})
						.then(
							function(result) {
								console.log("result = "+ result);
								if (result) {
									// 削除成功メッセージ
									return $translate('message.delete.success');
								}
								else {
									// 削除失敗メッセージ
									return $translate('message.delete.failure');
								}
							}
						)
						.then(
							function (txt) {
								ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
								// 再読み込み
								loadHistoryList();
							}, function (translationId) {
								ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
							}
						)
						;
					}
				}
			});
		}, function (translationIds) {
			ons.notification.alert('Failed to Translate');
		})
		;
	};
		
	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.crawl.overview'
	    				, 'intro.crawl.interval'
	    				, 'intro.crawl.save'
	    				, 'intro.crawl.history'
	    				, 'intro.crawl.delete'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.crawl.overview']
					        },
					        {
					            element: '#interval',
					            intro: translations['intro.crawl.interval']
					        },
					        {
					            element: '#save',
					            intro: translations['intro.crawl.save']
					        },
					        {
					            element: '#history',
					            intro: translations['intro.crawl.history']
					        },
					        {
					            element: '#delete',
					            intro: translations['intro.crawl.delete']
					        }
					    ];
	    			
	    			// ステップを返す
				    deferred.resolve(steps);
	    		}
	    	);
		}, 0);
		
		return deferred.promise;
    };
    			
	
}]);