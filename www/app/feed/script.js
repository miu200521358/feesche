// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // リスト画面遷移
        .state('feed_list', {
            url: '/feed/list',
            templateUrl: 'app/feed/list.html',
            controller: "SettingFeedListController",
            title: "menu.feed",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]
        })
        // 詳細画面遷移
        .state('feed_detail', {
            url: '/feed/detail',
            templateUrl: 'app/feed/detail.html',
            controller: "SettingFeedDetailController",
            title: "menu.feed",
            params: {
            	"status": null,
            	"data": null
            }
        });

}]);

// フィードリストコントローラ
myApp.controller('SettingFeedListController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', 'SharedScopes', 'MyDBService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, SharedScopes, MyDBService) {

	console.log("proposedLanguage(): "+ $translate.proposedLanguage());
	
	// 登録ボタンが押せるか
	$scope.canAdd = false;
	
	loadList();
	
	// リスト読込処理
	function loadList() {
		// リスト取得
		MyDBService.connect().then(
			function(db) {
				return MyDBService.select(db, new SettingFeedTableCls());
			}
		).then(
			function(resultList) {
				$scope.results = resultList;
				
				if (isSubscription()) {
					console.log("Feed isSubscriptions: true");

					// 定期購入が行われている場合、TRUE
					$scope.canAdd = true;
				}
				else {
					console.log("Feed isSubscriptions resultList: "+ resultList.length);
					
					// 定期購入が行われていない場合
					if (resultList.length >= 10) {
						// 既定回数以上は登録できない
						$scope.canAdd = false;
					}
					else {
						// 既定回数未満なら登録可能
						$scope.canAdd = true;
					}
				}
		
				// ローディングフラグOFF
				$rootScope.isLoading = false;			
			}
		);
	};
	
	$scope.showDetailByList = function(data) {
		// イベントログ
		gaTrackEvent('FeedList', 'showDetailByList');
				
		$state.go("feed_detail", {
			"status": "modify",
			"data": data
		});
	};
	
	$scope.delete = function(data) {
		// イベントログ
		gaTrackEvent('FeedList', 'delete');
		
		$translate(['message.delete.confirm.title', 'message.delete.confirm.message', 'setting.feed.delete_note'])
		.then(function (translations) {
			ons.notification.confirm({
				title: translations['message.delete.confirm.title'],
				message: translations['setting.feed.delete_note'] + "<br>"+ translations['message.delete.confirm.message'],
				callback: function(answer) {
					console.log("answer="+ answer);
					if (answer) {
						// 削除OKの場合のみ、削除処理実行
						
						MyDBService.connect()
						.then(function(db) {
							// 削除処理
							
							// フィードイベントも削除
							var feedEventCondition = new FeedTableCls();
							feedEventCondition.col_url = data.col_url;
							MyDBService.delete(db, feedEventCondition);

							// レコードそのものも変更
							return MyDBService.delete(db
								, new SettingFeedTableCls(data.col_id, null, null));
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
								loadList();
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
	    	$translate(['intro.feed_list.overview'
	    				, 'intro.feed_list.feed_name'
	    				, 'intro.feed_list.feed_url'
	    				, 'intro.feed_list.feed_retention_days'
	    				, 'intro.feed_list.modify'
	    				, 'intro.feed_list.delete'
	    				, 'intro.feed_list.add'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.feed_list.overview']
					        },
					        {
					            element: '.feed_name',
					            intro: translations['intro.feed_list.feed_name']
					        },
					        {
					            element: '.feed_url',
					            intro: translations['intro.feed_list.feed_url']
					        },
					        {
					            element: '.feed_retention_days',
					            intro: translations['intro.feed_list.feed_retention_days']
					        },
					        {
					            element: '.modify',
					            intro: translations['intro.feed_list.modify']
					        },
					        {
					            element: '.delete',
					            intro: translations['intro.feed_list.delete']
					        },
					        {
					            element: '#add',
					            intro: translations['intro.feed_list.add']
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

// フィード詳細コントローラ
myApp.controller('SettingFeedDetailController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, SharedScopes, MyDBService, MyFeedService) {
	console.log($stateParams.status);

	if ($stateParams.status == "modify") {
		$scope.feed = $stateParams.data;
	}
	else {
		$scope.feed = new SettingFeedTableCls();
		// 保持はデフォルト30日
		$scope.feed.col_retention_days = 30;
	}
	
	$scope.save = function() {
		// イベントログ
		gaTrackEvent('FeedDetail', 'save', $scope.feed.col_url);
		
		console.log("id="+ $scope.feed.col_id + ", name="+ $scope.feed.col_name + ", url="+ $scope.feed.col_url);

	    // ローディングフラグON
	    $rootScope.isLoading = true;			
		
		// URLの有効チェック
		MyFeedService.parseFeed($scope.feed.col_name, $scope.feed.col_url).then(
			function (feedList) {
				// URLに正常にアクセスできた場合(フィードが取れた場合)
				console.log("parseFeed res success");
				// console.log(feedList);
				
				// 登録実行
				MyDBService.connect().then(
					function(db) {
						return MyDBService.save(db, 
							new SettingFeedTableCls($scope.feed.col_id, $scope.feed.col_name, $scope.feed.col_url, $scope.feed.col_retention_days));
					}
				).then(
					function(result) {
						console.log("save after");
						// console.log(feedList);
						// フィードを非同期で保存します
						MyFeedService.saveFeed(feedList);
						
						return result;
					}
				).then(
					function(result) {
						// 保存成功メッセージ
						return $translate('message.save.success');
					}, function (err) {
						// 保存失敗メッセージ
						return $translate('message.save.failure');
					}
				).then(
					function (txt) {
						ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
						
						// 前画面に戻る
						stateBack($rootScope, $state, null);
					}, function (translationId) {
						ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
					}
				);
								
				
			}, function (response) {
				// URLアクセスに失敗した場合
				console.log("parseFeed res failure");
				console.log(response);
				$translate(['setting.feed.url.invalid.title', 'setting.feed.url.invalid.text1', 'setting.feed.url.invalid.text2']).then(
						function (translations) {
							ons.notification.alert({
									"title": translations['setting.feed.url.invalid.title'],
									"messageHTML": translations['setting.feed.url.invalid.text1'] + "<br>"+ translations['setting.feed.url.invalid.text2'],
									"cancelable": true,
									"modifier": "material"
								});
						}, function (translationId) {
							ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
						}
					);
			}
		);
		

	};

	
	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.feed_detail.overview'
	    				, 'intro.feed_detail.feed_name'
	    				, 'intro.feed_detail.feed_url'
	    				, 'intro.feed_detail.feed_retention_days'
	    				, 'intro.feed_detail.save'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.feed_detail.overview']
					        },
					        {
					            element: '#feed_name',
					            intro: translations['intro.feed_detail.feed_name']
					        },
					        {
					            element: '#feed_url',
					            intro: translations['intro.feed_detail.feed_url']
					        },
					        {
					            element: '#feed_retention_days',
					            intro: translations['intro.feed_detail.feed_retention_days']
					        },
					        {
					            element: '#save',
					            intro: translations['intro.feed_detail.save']
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