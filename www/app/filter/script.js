// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // リスト画面遷移
        .state('filter_list', {
            url: '/filter/list',
            templateUrl: 'app/filter/list.html',
            controller: 'SettingFilterListController',
            title: "menu.filter",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]
        })
        // 詳細画面遷移
        .state('filter_detail', {
            url: '/filter/detail',
            templateUrl: 'app/filter/detail.html',
            controller: 'SettingFilterDetailController',
            title: "menu.filter",
            params: {
            	"status": null,
            	"group": null,
            	"textList": null
            }
        });

}]);

// フィルターリストコントローラ
myApp.controller('SettingFilterListController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', 'SharedScopes', 'MyDBService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, SharedScopes, MyDBService) {
    
	// 登録ボタンが押せるか
	$scope.canAdd = false;

	loadList();
	
	// リスト読込処理
	function loadList() {
		// リスト取得
		MyDBService.connect().then(
			function(db) {
				return MyDBService.select(db, new SettingFilterGroupTableCls(), "col_order_by ASC");
			}
		).then(
			function(groupList) {
				$scope.groupList = groupList;
        		
				if (isSubscription()) {
					console.log("Filter isSubscriptions: true");

					// 定期購入が行われている場合、TRUE
					$scope.canAdd = true;
				}
				else {
					console.log("Filter isSubscriptions groupList: "+ groupList.length);
					
					// 定期購入が行われていない場合
					if (groupList.length >= 5) {
						// 既定回数以上は登録できない
						$scope.canAdd = false;
					}
					else {
						// 既定回数未満なら登録可能
						$scope.canAdd = true;
					}
				}
			}
		).then(
			MyDBService.connect().then(
				function(db) {
					return MyDBService.select(db, new SettingFilterTextTableCls());
				}
			).then(
				function(textList) {
					$scope.textList = textList;
    		
    				// ローディングフラグOFF
    				$rootScope.isLoading = false;			
                    
				}
			)			
		);
	};
	
	$scope.dragControlListeners = {
		// D&Dを許可する
		accept: function (sourceItemHandleScope, destSortableScope) {
			return true
		},
	    // アイテムが同一のリストでドラッグ&ドロップ（ソート）された場合に呼び出されるコールバック関数
	    orderChanged: function(event) {
			// イベントログ
			gaTrackEvent('FilterList', 'orderChanged');
					
	    	console.log("orderChanged");
	    	MyDBService.connect().then(
	    		function(db) {
					// 実行リストにフィルタを登録
					var promises = [];
					
			    	for (var n = 0; n < event.dest.sortableScope.modelValue.length; n++) {
				    	var group = event.dest.sortableScope.modelValue[n];
				    	console.log(group);
			    		group.col_order_by = (n+1);
			    		promises.push(MyDBService.save(db, group));
			    	}
					
					// フィード並び替え処理を遅延実行
					$q.all(promises).then(
						$translate('message.order.success')
						.then(
							function (txt) {
								ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
							}, function (translationId) {
								ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
							}
						)
					);
	    		}
    		);
	    		
	    }
	};

	$scope.detailModify = function(group) {
		// イベントログ
		gaTrackEvent('FilterList', 'detailModify');
		
		var targetTextList = [];
		for (var t of $scope.textList) {
			if (t.col_group_id == group.col_id) {
				targetTextList.push(t);
			}
		}
		
		$state.go("filter_detail", {
			"status": "modify",
			"group": group,
			"textList": targetTextList
		})
	};
	
	$scope.detailAdd = function(groupLength) {
		// イベントログ
		gaTrackEvent('FilterList', 'detailAdd');

		var group = new SettingFilterGroupTableCls();
		group.col_order_by = groupLength + 1;
		
		$state.go('filter_detail', {
			"status": "add",
			"group": group,
			"textList": null
		})
	}
	
	$scope.delete = function(data) {
		// イベントログ
		gaTrackEvent('FilterList', 'delete');

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
								, new SettingFilterGroupTableCls(data.col_id, null, null));
						})
						.then(
							function(result) {
								if (result) {
									// 親の削除に成功したら子
									return MyDBService.connect().then(
										function(db) {
											var textData = new SettingFilterTextTableCls();
											textData.col_group_id = data.col_id;
											return MyDBService.delete(db, textData);
										}
									);								
								}
								else {
									// 親に失敗してたらfalse
									return false;
								}
							}
						)
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
	    	$translate(['intro.filter_list.overview'
	    				, 'intro.filter_list.filter_name'
	    				, 'intro.filter_list.filter_text'
	    				, 'intro.filter_list.sort'
	    				, 'intro.filter_list.modify'
	    				, 'intro.filter_list.delete'
	    				, 'intro.filter_list.add'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.filter_list.overview']
					        },
					        {
					            element: '.filter_name',
					            intro: translations['intro.filter_list.filter_name']
					        },
					        {
					            element: '.filter_text',
					            intro: translations['intro.filter_list.filter_text']
					        },
					        {
					            element: '.sort',
					            intro: translations['intro.filter_list.sort']
					        },
					        {
					            element: '.modify',
					            intro: translations['intro.filter_list.modify']
					        },
					        {
					            element: '.delete',
					            intro: translations['intro.filter_list.delete']
					        },
					        {
					            element: '#add',
					            intro: translations['intro.filter_list.add']
					        }
					    ];
	    			
	    			// ステップを返す
				    deferred.resolve(steps);
	    		}
	    	);
		}, 0);
		
		return deferred.promise;
    }
    			
}]);

// フィルター詳細コントローラ
myApp.controller('SettingFilterDetailController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', 'SharedScopes', 'MyDBService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, SharedScopes, MyDBService) {
	console.log($stateParams.status);

	$scope.group = $stateParams.group;
	
	if ($stateParams.status == "modify") {
		$scope.input_text_list = $stateParams.textList;
	}
	else{
		$scope.input_text_list = [];
		$scope.input_text_list.push(new SettingFilterTextTableCls())
	}
	
	$scope.getFilterTextPattern = function() {
		if ($stateParams.status == "modify") {
			// 編集時は空値OK
			return ".*";
		}
		else {
			// 追加時は必須
			return ".+";
		}
	}
	
	$scope.addText = function () {
		$scope.input_text_list.push(new SettingFilterTextTableCls())
	}
	
	$scope.save = function() {
		// イベントログ
		gaTrackEvent('FilterDetail', 'save');
					
		console.log("id="+ $scope.group.col_id + ", group="+ $scope.group.col_name + ", color="+ $scope.group.col_color + ", order="+ $scope.group.col_order_by);
		
		var group = new SettingFilterGroupTableCls($scope.group.col_id, $scope.group.col_name, $scope.group.col_color, $scope.group.col_order_by);
		
		// 登録実行
		MyDBService.connect().then(
			function(db) {
				// まずは親のグループTBLを登録する
				return MyDBService.save(db, group);
			}
		).then(
			function(result) {
				MyDBService.connect().then(
					function(db) {
						if ($stateParams.status == "modify") {
							// 更新の場合、一旦フィルタテキストTBLは親IDで削除
							var textData = new SettingFilterTextTableCls();
							textData.col_group_id = group.col_id;
							return MyDBService.delete(db, textData);
						}
						else {
							// 新規の場合、スルー
							return true;
						}
					}
				).then(
					// 現在の親IDを取得する
					function(result) {
						if ($stateParams.status == "modify") {
							// 更新の場合は、登録されている親ID
							return group.col_id;
						}
						else {
							// 追加の場合は最新ID
							return MyDBService.connect().then(
								function(db) {
									return MyDBService.selectMaxId(db, new SettingFilterGroupTableCls());
								}
							);						
						}
					}
				)
				.then(
					function(groupId) {
						console.log("テキスト登録: groupId="+ groupId);
						return MyDBService.connect().then(
							function(db) {
								var promises = [];
								
								for (var text of $scope.input_text_list) {
									// 値が入っている場合のみ登録
									if (text.col_text && text.col_text.length > 0) {
										// IDは消す(新規登録)
										text.col_id = null;
										// 親IDを設定する
										text.col_group_id = groupId;
										promises.push(MyDBService.save(db, text));
									}
								}
								
								// テキスト登録処理を実行
								return $q.all(promises);						
							}
				  		)				
					}
				)
				.then(
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
			}
		)
		

	}


	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.filter_detail.overview'
	    				, 'intro.filter_detail.filter_name'
	    				, 'intro.filter_detail.filter_color'
	    				, 'intro.filter_detail.filter_text'
	    				, 'intro.filter_detail.add'
	    				, 'intro.filter_detail.save'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.filter_detail.overview']
					        },
					        {
					            element: '#filter_name',
					            intro: translations['intro.filter_detail.filter_name']
					        },
					        {
					            element: '#filter_color',
					            intro: translations['intro.filter_detail.filter_color']
					        },
					        {
					            element: '.filter_text',
					            intro: translations['intro.filter_detail.filter_text']
					        },
					        {
					            element: '#add',
					            intro: translations['intro.filter_detail.add']
					        },
					        {
					            element: '#save',
					            intro: translations['intro.filter_detail.save']
					        }
					    ];
	    			
	    			// ステップを返す
				    deferred.resolve(steps);
	    		}
	    	);
		}, 0);
		
		return deferred.promise;
    }
    				
}]);