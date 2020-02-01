// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
    	// スケジュール画面
		.state('schedule_list', {
	        url: '/',
	        templateUrl: 'app/schedule/list.html',
	        controller: 'ScheduleListController',
	        title: "menu.schedule",
	        onEnter: ['$rootScope', function($rootScope) {
	            $rootScope.splitter.left.close();
	        }],
	        params: {
	        	"displayDate": null,
                "viewName": null,
                "filterGroupId": null,
                "filterGroupColor": null
	        }
	    })    
        // 詳細画面遷移
        .state('schedule_detail', {
            url: '/schedule/detail',
	        title: "menu.schedule",
            templateUrl: 'app/schedule/detail.html',
	        controller: 'ScheduleDetailController',
            params: {
            	"displayDate": null,
                "viewName": null,
                "filterGroupId": null,
                "filterGroupColor": null
            }
        })

}]);


// スケジュールリスト画面用コントローラ
myApp.controller('ScheduleListController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout' , 'uiCalendarConfig', 'ngIntroService', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, uiCalendarConfig, ngIntroService, SharedScopes, MyDBService, MyFeedService) {
	
	// 直で指定（念のため）
	$translate.use(findLanguage());
	
    console.log(JSON.stringify($stateParams));
    
	console.log("$stateParams.displayDate");
	console.log($stateParams.displayDate);
	
	var nowDate = moment();
	if ($stateParams.displayDate) {
		// 開始期間が設定されていたら、デフォルト日に設定
		nowDate = $stateParams.displayDate;
	}
	
    
    // 最初はカレンダー形式表示
	$scope.viewName = "month";
	
    // ビューが指定されていたら、それに対応する
    console.log("$stateParams.viewName");
	console.log($stateParams.viewName);
    if ($stateParams.viewName) {
        $scope.viewName = $stateParams.viewName;
    }
    
    // フィルターIDにデフォルト値 or 前設定値
    $scope.filterGroupId = -1;
    $scope.filterGroupColor = "#999999";
    if ($stateParams.filterGroupId) {
        $scope.filterGroupId = $stateParams.filterGroupId;
        $scope.filterGroupColor = $stateParams.filterGroupColor;
	}

	console.log("nowDate: "+ nowDate.format());

	col_firstday_of_week = localStorage.getItem("col_firstday_of_week");
	if (!col_firstday_of_week) {
		// 初期値がまだ設定されていなければ、0固定
		col_firstday_of_week = 0;
		// ローカルストレージにも保存する
		localStorage.setItem("col_firstday_of_week", col_firstday_of_week);
	}

	col_event_limit = localStorage.getItem("col_event_limit");
	if (!col_event_limit) {
		// 初期値がまだ設定されていなければ、固定値
		col_event_limit = 3;
		// ローカルストレージにも保存する
		localStorage.setItem("col_event_limit", col_event_limit);
	}
	// 数値変換
	col_event_limit = eval(col_event_limit);
	if (col_event_limit == 0) {
		// 0設定の場合、false再指定
		col_event_limit = false;
	}
	else {
		// 日付入れての行数っぽいので、1足しとく
		col_event_limit += 1;
	}
	
    $scope.uiConfig = {
		calendar:{
			defaultDate: nowDate,           // 表示日は保持したもの
            defaultView: $scope.viewName,   // 初期表示ビューを切り替える
			header:{
				left: 'filter,shown',
				center: 'prev,title,next',
				right: 'filter,shown'   // サイズ調整のため、設定だけする。（表示はしない）
			},
			buttonIcons: {
			    prev: 'fa fa fa-angle-left',
			    next: 'fa fa fa-angle-right'
			},
            customButtons: {
                filter: {
                    icon: 'fa fa fa-filter',
                    click: function() {
                        console.log("filter click");
                        
                        ons.createDialog('app/schedule/dialogFilter.html', {parentScope: $scope}).then(function(dialog) {
                            // 親にダイアログを渡す
                            $scope.dialogFilter = dialog;
                            // ダイアログを表示
                            dialog.show();
                        });
                    }
                },
                shown: {
                    icon: 'fa fa fa-check-square-o',
                    click: function() {
                        console.log("shown click");
                                        
                    	$translate(['message.shown.confirm.title', 'message.shown.confirm.message'])
                		.then(function (translations) {
                			ons.notification.confirm({
                				title: translations['message.shown.confirm.title'],
                				message: translations['message.shown.confirm.message'],
                				callback: function(answer) {
                					console.log("answer="+ answer);
                					if (answer) {
                						// 既読OKの場合のみ、既読処理実行
                                        
                                        var targetEvents = uiCalendarConfig.calendars['myCalendar'].fullCalendar('clientEvents', function(event){
                                            // フィルターに該当するか否か(全件OR指定ID)
                                            var isFilterd = ($scope.filterGroupId < 0 || event.filter_id == $scope.filterGroupId);
                                            
                                            if ($scope.viewName == "listNews") {
                                                // 新規のみはフィルターをかける
                                                return isFilterd && event.col_shown_flg == 0;
                                            }
                                            else if ($scope.viewName == "listAlarm") {
                                                // アラームのみはフィルターをかける
                                                return isFilterd && event.col_alarm_flg == 1;
                                            }
                                            else {
                                                // カレンダーと月リストは全件表示
                                                return isFilterd && true;
                                            }
                                        });
                            	        
                                        var feedList = [];
                                        for (var event of targetEvents) {
                                            var feed = new FeedTableCls();
                                            feed.col_id = event.col_id;
                                            feedList.push(feed);
                                            
                                            // 対象イベントを閲覧済みに設定
                                            event.col_shown_flg = 1;
                                            event['borderColor'] = "";
                                        }
                                        
                                        console.log(JSON.stringify(feedList));
                                        
                        				// 非同期でフィードを表示済みに変更
                                        // 枠線表示を終えた後に処理する
                        				MyFeedService.saveFeedListShown(feedList).then(() => {                                    
                                            $translate('message.shown.success').then(
                                                function (txt) {
                                                	ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);                                        
                                                    // イベント更新
                                                    uiCalendarConfig.calendars['myCalendar'].fullCalendar('updateEvents', targetEvents);
                                                    uiCalendarConfig.calendars['myCalendar'].fullCalendar('rerenderEvents');
                                            	}, function (translationId) {
                                            		ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
                                            	}
                                            );            
                        				});

                					}
                				}
                			});
                		}, function (translationIds) {
                			ons.notification.alert('Failed to Translate');
                		})
                		;                        
                        
                    }
                }
            },
		    views: {
		        month: {
		            titleFormat: 'YYYY/MM'
		        },
    	        listMonth: {
		            titleFormat: 'YYYY/MM'
		        },
                listNews: {
    	            titleFormat: 'YYYY',
                    type: 'list',
                    duration: {
                        months: 24
                    }
		        },
                listAlarm: {
    	            titleFormat: 'YYYY',
                    type: 'list',
                    duration: {
                        months: 24
                    }
		        }
            },
            viewRender: function(view, element) {
                console.log("viewRender view="+ view.name);
                console.log("start="+ view.start.format('LLLL') + ", end="+ view.end.format('LLLL'));
                // console.log("intervalStart="+ view.intervalStart.format('LLLL') + ", intervalEnd="+ view.intervalEnd.format('LLLL'));
                
                // ビュー描画直前に表示範囲内のイベントだけ取得する
                loadEvent(view.start, view.end, (view.name == "listNews"), (view.name == "listAlarm"));
                
                // // リスト系のものは高さCSSを直挿入
                // if ( view.name.indexOf("list") >= 0) {
                //     $('.fc-list-view .fc-scroller').css('height', 'auto  !important');
                // }
            },
		    dayClick: function(date, jsEvent, view) {
		
			    // ローディングフラグON
			    $rootScope.isLoading = true;			
			    
		    	// 日付押下時処理
		    	$state.go("schedule_detail", {
		    		// 言語でロケール再設定
					"displayDate": date.locale(findLanguage()),
					"viewName": $scope.viewName,
                    "filterGroupId": $scope.filterGroupId,
                    "filterGroupColor": $scope.filterGroupColor
				});
		    },
		    eventClick: function(calEvent, jsEvent, view) {
		
			    // ローディングフラグON
			    $rootScope.isLoading = true;			
		    	
		    	// 日付押下時処理
		    	$state.go("schedule_detail", {
					"displayDate": calEvent.start,
					"viewName": $scope.viewName,
                    "filterGroupId": $scope.filterGroupId,
                    "filterGroupColor": $scope.filterGroupColor
				});
		    },
            eventRender: function eventRender( event, element, view ) {
                // console.log("eventRender filterGroupId="+ $scope.filterGroupId + ", filter_id="+ event.filter_id);
                
                // フィルターに該当するか否か(全件OR指定ID)
                var isFilterd = ($scope.filterGroupId < 0 || event.filter_id == $scope.filterGroupId);
                
                if (view.name == "listNews") {
                    // 新規のみはフィルターをかける
                    return isFilterd && event.col_shown_flg == 0;
                }
                else if (view.name == "listAlarm") {
                    // アラームのみはフィルターをかける
                    return isFilterd && event.col_alarm_flg == 1;
                }
                else {
                    // カレンダーと月リストは全件表示
                    return isFilterd && true;
                }
            },
			eventAfterAllRender: function(view){
				console.log("eventAfterAllRender view="+ view.name);
			},
            loading: function(isLoading, view) {
    		    // ローディングフラグ切り替え
			    $rootScope.isLoading = isLoading;
			},
			eventLimit: col_event_limit,
			firstDay: col_firstday_of_week,
			height: 'parent',
			locale: findLanguage(),		// 言語：ユーザ環境準拠
			timezone: 'local'			// タイムゾーン：ユーザ環境準拠
		}
	};
	
	$(document).ready(function(){
		// 年月部分押下時に今日に戻る
	    $("#myCalendar").find(".fc-toolbar h2").mousedown(function() {
	    	console.log("title.mousedown");
	    	animateMoveCalendar();
	    	uiCalendarConfig.calendars['myCalendar'].fullCalendar('today');
	    });
	    
		// 次へ部分押下時にアニメーションする
	    $("#myCalendar").find(".fc-next-button").mousedown(function() {
	    	console.log("next.mousedown");
	    	animateMoveCalendar();
	    });
	    
		// 次へ部分押下時にアニメーションする
	    $("#myCalendar").find(".fc-prev-button").mousedown(function() {
	    	console.log("prev.mousedown");
	    	animateMoveCalendar();
	    });
        
        // フィルタアイコンの色を変える
        $("#myCalendar").find(".fa-filter").css('color', $scope.filterGroupColor);
	});
    
    // イベントなしメッセージを翻訳文に再設定
    $translate('schedule.no_feed_event')
        .then(
        	function (txt) {
    			$scope.uiConfig.calendar.noEventsMessage = txt;
            }, function (translationId) {
        		$scope.uiConfig.calendar.noEventsMessage = translationId;
    		}
    	);
    
    // イベントを設定
    function loadEvent(start, end, isNew, isAlarm) {
    	var feedList = [];
    	var groupList = [];
    	var textList = [];
        
    	MyDBService.connect().then(
    		function(db) {
                // 取得範囲日付start
                var startCondition = new FeedTableCls();
                startCondition.col_entry_parse_date = start;
                
                // 取得範囲日付end
                var endCondition = new FeedTableCls();
                endCondition.col_entry_parse_date = end;

                // その他の検索条件
                var condition = new FeedTableCls();
                if (isNew) {
                    // 新規イベント
                    condition.col_shown_flg = 0;                
                }
                if (isAlarm) {
                    // アラームイベント
                    condition.col_alarm_flg = 1;                
                }
                
        		// フィードリスト
    			return MyDBService.selectRangeDate(db, startCondition, endCondition, condition, null);		
    		}
    	).then(
    		function (results){
    			feedList = results;
                
                // console.log(JSON.stringify(feedList));
    			
    			return MyDBService.connect()
    		}
    	).then(
    		function (db) {
    			// フィルタグループリスト
    			return MyDBService.select(db, new SettingFilterGroupTableCls(), "col_order_by ASC");		
    		}
    	).then(
    		function (results){
    			groupList = results;
                
                // ダイアログ用スコープにも設定
                $scope.filterGroups = results;
                
                console.log("filterGroups: size="+ results.length);
    			
    			return MyDBService.connect()
    		}
    	).then(
    		function (db) {
    			// フィルタテキストリスト
    			return MyDBService.selectFilterTextByGroupOrder(db);		
    		}
    	).then(
    		function(results) {
    			textList = results;
    			matchGroup(groupList, textList, feedList);
    			
    			var events = [];
    			
    			for (var feed of feedList) {
    				var event = {
    	                    title  	        : feed.col_entry_title,
    	                    start  	        : feed.col_entry_parse_date,
    	                    allDay 	        : true,
    	                    color	        : feed.color,
                            col_id          : feed.col_id,
                            col_shown_flg   : feed.col_shown_flg,
                            col_alarm_flg   : feed.col_alarm_flg,
                            filter_id   : feed.filter_id
    	                };
    	                
    	            if (feed.col_shown_flg != 1) {
    	            	// 未表示の場合、枠線を付ける
    	            	event['borderColor'] = 'gold';
    	            }
    	            
    				events.push(event);
    			}
    		
    			return events;
    		}
    	).then(
    		function(events) {
    			if (events.length > 0) {
                    // 既存のソースは一旦削除
        			uiCalendarConfig.calendars['myCalendar'].fullCalendar('removeEventSources');
                    // 取得し直したイベントを追加
        			uiCalendarConfig.calendars['myCalendar'].fullCalendar('addEventSource', events);
                    // 祝日を設定
                    loadHoliday();
    			}
    		}
    	);
    }
	
	var dbParams;
	MyDBService.connect().then(
		function(db) {
			// パラメータ管理TBL
			return MyDBService.select(db, new SettingParamsTableCls());		
		}
	).then(
		function(results) {
			dbParams = results[0];  
			if (dbParams.col_initial == 0) {
				// 初期フラグOFFの場合、Welcomeメッセージ表示
				$translate(['message.welcome.title', 'message.welcome.message1', 'message.welcome.message2', 'message.welcome.message3'])
					.then(
						function (translations) {
							ons.notification.alert({
									"title": translations['message.welcome.title'],
									"messageHTML": translations['message.welcome.message1'] +"<br>"+ translations['message.welcome.message2'] +"<br>"+ translations['message.welcome.message3'],
									"cancelable": false,
									"modifier": "material",
									"callback": function() {
										MyDBService.connect().then(
											function(db) {
												// 初期フラグOFF
												dbParams.col_initial = 1;
												// パラメータ管理TBL
												return MyDBService.save(db, dbParams);		
											}
										);									
									}
								});
						}, function (translationId) {
							ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
						}
					);				
			}
		}
	)
	
    // 次に遷移する
    $scope.next = function () {
    	animateMoveCalendar();
    	uiCalendarConfig.calendars['myCalendar'].fullCalendar('next');
    };

    // 前に遷移する
    $scope.prev = function () {
    	animateMoveCalendar();
    	uiCalendarConfig.calendars['myCalendar'].fullCalendar('prev');
    };
    
    // スケジュールを更新する
    $scope.loadFeed = function($done) {
		// イベントログ
		gaTrackEvent('ScheduleList', 'loadFeed');
		
        $timeout(() => {
            MyFeedService.crawlAllFeed().finally(() => {
                console.log("** loadFeed finish");
                
                var view = uiCalendarConfig.calendars['myCalendar'].fullCalendar('getView');
                
                // イベント再取得
                loadEvent(view.start, view.end, (view.name == "listNews"), (view.name == "listAlarm"));
                
                $done();
            });
        }, 1000);
    }
    
    $scope.changeView = function(viewName) {
        // スピードダイアルを閉じる
        scheduleDial.hideItems();
    	animateMoveCalendar();
    	uiCalendarConfig.calendars['myCalendar'].fullCalendar('changeView', viewName);
    	$scope.viewName = viewName;
    }
    
    $scope.filterSchedule = function(filterGroupId, filterGroupColor) {
        console.log("filterSchedule: filterGroupId="+ filterGroupId +", filterGroupColor="+ filterGroupColor );
        $scope.filterGroupId = filterGroupId;
        $scope.filterGroupColor = filterGroupColor;
        
        // フィルタアイコンの色を変える
        $("#myCalendar").find(".fa-filter").css('color', filterGroupColor);
        
        // ダイアログを閉じる
        $scope.dialogFilter.hide();
        
        // イベントレンダリング
        uiCalendarConfig.calendars['myCalendar'].fullCalendar('rerenderEvents');
    }
	
	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.schedule_list.overview'
            			, 'intro.schedule_list.overview_list'
            			, 'intro.schedule_list.overview_list_new'
                		, 'intro.schedule_list.overview_list_alarm'
                		, 'intro.schedule_list.pull_to_hook'
        				, 'intro.schedule_list.title'
	    				, 'intro.schedule_list.type'
	    				, 'intro.schedule_list.next'
	    				, 'intro.schedule_list.prev'
	    				, 'intro.schedule_list.event'
        				, 'intro.schedule_list.list_event'
        				, 'intro.schedule_list.list_event_new'
            			, 'intro.schedule_list.list_event_alarm'
            			, 'intro.schedule_list.filter'
            			, 'intro.schedule_list.shown'
	    	]).then(
	    		function (translations) {
	    			var steps = [];
                    
        			if ($scope.viewName == 'month') {
	    				// カレンダー形式の場合
	    				steps.push({
				            intro: translations['intro.schedule_list.overview']
				        });
	    			}
            		else if ($scope.viewName == 'listMonth') {
        				// リスト形式の場合
	    				steps.push({
				            intro: translations['intro.schedule_list.overview_list']
				        });
        			}
        			else if ($scope.viewName == 'listNews') {
            			// 新規リスト形式の場合
	    				steps.push({
				            intro: translations['intro.schedule_list.overview_list_new']
				        });
        			}
                    else if ($scope.viewName == 'listAlarm') {
            			// アラームリスト形式の場合
	    				steps.push({
				            intro: translations['intro.schedule_list.overview_list_alarm']
				        });
        			}
                    
                    steps.push({
			            intro: translations['intro.schedule_list.pull_to_hook']
                    });
	    			
	    			if ($scope.viewName == 'month') {
	    				// カレンダー形式の場合
	    				steps.push({
				            element: '#myCalendar .fc-h-event',
				            intro: translations['intro.schedule_list.event']
				        });
	    			}
        			else if ($scope.viewName == 'listMonth') {
	    				// リスト形式の場合
	    				steps.push({
				            element: '#myCalendar .fc-list-item-title',
				            intro: translations['intro.schedule_list.list_event']
				        });
	    			}
        			else if ($scope.viewName == 'listNews') {
	    				// 新規追加リスト形式の場合
	    				steps.push({
				            element: '#myCalendar .fc-list-item-title',
				            intro: translations['intro.schedule_list.list_event_new']
				        });
	    			}
                    else if ($scope.viewName == 'listAlarm') {
	    				// アラームリスト形式の場合
	    				steps.push({
				            element: '#myCalendar .fc-list-item-title',
				            intro: translations['intro.schedule_list.list_event_alarm']
				        });
	    			}
                    
                    steps.push({
        	            element: '#type',
			            intro: translations['intro.schedule_list.type']
                    });

                    // ツールバー回り
                    steps.push({
    		            element: '#myCalendar .fc-toolbar h2',
			            intro: translations['intro.schedule_list.title']
			        });
                    
                    steps.push({
			            element: '#myCalendar .fc-next-button',
			            intro: translations['intro.schedule_list.next']
    		        });
                    
                    steps.push({
			            element: '#myCalendar .fc-prev-button',
			            intro: translations['intro.schedule_list.prev']
        	        });
	    			
                    steps.push({
    		            element: '#myCalendar .fa-filter',
			            intro: translations['intro.schedule_list.filter']
    		        });
                    steps.push({
    		            element: '#myCalendar .fa-check-square-o',
			            intro: translations['intro.schedule_list.shown']
    		        });
	    			
	    			// ステップを返す
				    deferred.resolve(steps);
	    		}
	    	);
		}, 0);
		
		return deferred.promise;
    }
    
	
}]);

function animateMoveCalendar() {
	$("#onsPage").fadeToggle();
	$("#onsPage").fadeToggle("slow");
}

function animateMoveCalendarDetail() {
	$("#onsPage").fadeToggle();
	$("#onsPage").fadeToggle("slow");
}


// スケジュール詳細画面用コントローラ
myApp.controller('ScheduleDetailController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$sce', '$q', '$timeout', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $sce, $q, $timeout, SharedScopes, MyDBService, MyFeedService) {
	
	// 直で指定（念のため）
	$translate.use(findLanguage());
	
	// ロケールに合わせたフォーマッタで表示
	$scope.date = $stateParams.displayDate;
	$scope.displayDate = $stateParams.displayDate.format('LL');
    // ビューを保持
    $scope.viewName = $stateParams.viewName;
    
    // フィルターIDにデフォルト値 or 前設定値
    $scope.filterGroupId = -1;
    $scope.filterGroupColor = "#999999";
    if ($stateParams.filterGroupId) {
        $scope.filterGroupId = $stateParams.filterGroupId;
        $scope.filterGroupColor = $stateParams.filterGroupColor;
    }
	
	loadList();
	
	function loadList() {
		// イベントを設定
		var feedList = [];
		var groupList = [];
		var textList = []
		MyDBService.connect().then(
			function(db) {
				// 日付を指定
				var condition = new FeedTableCls();
				condition.col_entry_parse_date = $scope.date;
				console.log("col_entry_parse_date: "+ condition.col_entry_parse_date.format("YYYY-MM-DD HH:mm:ss"));
				
				return MyDBService.select(db, condition, "col_entry_title ASC");		
			}
		).then(
			function (results){
				feedList = results;
				
				return MyDBService.connect()
			}
		).then(
			function (db) {
				// フィルタグループリスト
				return MyDBService.select(db, new SettingFilterGroupTableCls());		
			}
		).then(
			function (results){
				groupList = results;
				
				return MyDBService.connect()
			}
		).then(
			function (db) {
				// フィルタテキストリスト
				return MyDBService.selectFilterTextByGroupOrder(db);		
			}
		).then(
			function(results) {
				textList = results;
				matchGroup(groupList, textList, feedList);
                
                // 実際に表示するフィードリスト
                var showFeedList = [];
                if ($scope.filterGroupId > 0) {
                    // フィルタが設定されている場合、絞り込む
                    for (var feed of feedList) {
                        if ($scope.filterGroupId == feed.filter_id) {
                            showFeedList = feed;
                        }
                    }
                }
                else {
                    showFeedList = feedList;
                }
				
				for (var feed of showFeedList) {
					feed['message'] = createShareMessage(feed);
                    
                    if (feed.col_shown_flg != 1) {
                        feed['borderColor'] = 'gold';
                    }
                    else {
                        feed['borderColor'] = feed['color'];
                    }
				}
    			
				// 非同期でフィードを表示済みに変更
                // 枠線表示を終えた後に処理する
				MyFeedService.saveFeedListShown(showFeedList);
			    
				return showFeedList;
			}
		).then(
			function(events) {
				$scope.results = events;
			}
		).then(
			// アラームONの数を調べる
			MyDBService.connect().then(
				function(db) {
					var condition = new FeedTableCls();
					condition.col_alarm_flg = 1;
					
					return MyDBService.select(db, condition, null);		
				}
			).then(resultList => {
				console.log("scheduleDetail alarms: "+ resultList.length);
				console.log("scheduleDetail isSubscription(): "+ isSubscription());
				$scope.canAlarm = (isSubscription() || (resultList.length < 5)); 
				console.log("$scope.canAlarm: "+ $scope.canAlarm);
			})
		);
	}
	
	$scope.prev = function() {
		animateMoveCalendarDetail();
		// 表示日を-1日
		$scope.date = $scope.date.add('days', -1);
		$scope.displayDate = $scope.date.format('LL');
		// リスト読み直し
		loadList();
	}
	
	$scope.next = function() {
		animateMoveCalendarDetail();
		// 表示日を-1日
		$scope.date = $scope.date.add('days', 1);
		$scope.displayDate = $scope.date.format('LL');
		// リスト読み直し
		loadList();
	}
	
	$scope.jump = function(data) {
		var url = $sce.trustAsResourceUrl(data.col_entry_link);
		
		console.log("url="+ url);
		
		// システムのデフォルトブラウザで開く
		window.open(url, '_system');
	}
	
	// シェアボタン用メッセージ
	function createShareMessage(data) {
		// パース日付
		var shareMessage = "["+ moment(data.col_entry_parse_date).locale(findLanguage()).format('LL') + "] "
			// エントリータイトル
			+ data.col_entry_title
			// サイト名
			+ " ("+ data.col_name + ") - "
			// エントリーURL
			+ data.col_entry_link
			// FeeScheサイト用リンク
			+ " - by FeeSche: http://feesche.tech/";
			
		console.log("share: "+ shareMessage);
		
		return shareMessage;
	}

	$scope.setAlarm = function(data) {
		// イベントログ		
		gaTrackEvent('ScheduleDetail', 'setAlarm', data.col_entry_link);
		
		// アラートフラグを反転させる
		data.col_alarm_flg = (data.col_alarm_flg == 1 ? 0 : 1);

		if (data.col_alarm_flg == 1) {
			// アラーム時間を当日8時で設定
			var alarmMoment = moment(data.col_entry_parse_date);
			alarmMoment.hour(8);
			alarmMoment.minute(0);
			alarmMoment.second(0);
		
			if (isSubscription()) {
				// 課金している場合、日付設定可能
				// 日付ピッカープラグイン表示
				cordova.plugins.DateTimePicker.show({
					mode: "datetime",
					date: alarmMoment.toDate(),
					allowOldDates: false,
					allowFutureDates: true,
					minuteInterval: 15,
					locale: findLanguage(),
					okText: "SELECT",
					cancelText: "CANCEL",
					android: {
						theme: 16974126, // Theme_DeviceDefault_Dialog
						calendar: false,
						is24HourView: true
					},
					success: function(newDate) {
						// Handle new date.
						console.log(JSON.stringify(newDate));
						// 日付を含めてアラーム設定
						$scope.setAlarmDateTime(data, moment(newDate));
					},
					cancel: function() {
						console.log("Cancelled");
						return;
					},
					error: function (err) {
						// Handle error.
						console.error(err);
						return;
					}
				});
			}
			else {
				// 課金していない場合、固定時間でアラーム設定
				$scope.setAlarmDateTime(data, alarmMoment);
			}
		}
		else {
			$scope.setAlarmDateTime(data, null);
		}
	}

	$scope.setAlarmDateTime = function(data, alarmMoment) {
		if (alarmMoment != null) {
			alarmMoment.locale(findLanguage());

			// アラーム時刻をDBに保持
			data.col_alarm_date = alarmMoment;
		
			console.log("alarmMoment: "+ JSON.stringify(alarmMoment));

			// アラートを設定する
			cordova.plugins.notification.local.schedule({
				// IDはデータのIDで連動させる
				id: data.col_id,
				title: "FeeSche",
				text: data.col_entry_title,
				foreground: false,
				smallIcon: "res://icon_notify",
				// icon: "res://icon_notify"
				trigger: { at: alarmMoment.toDate() }
			});	
		}
		else {
			// アラート削除
			cordova.plugins.notification.local.cancel([data.col_id],
				function(){
					console.log("notification.local.cancel: "+ data.col_id);
				});
		}

		// アラートフラグを反転させる
		MyDBService.connect()
		.then(function(db) {
			return MyDBService.save(db, data);
		})
		.then(
			function(result) {
				console.log("result = "+ result);
				if (data.col_alarm_flg == 1) {
					// アラートONメッセージ
					return $translate('message.alarm.active');
				}
				else {
					// アラートOFFメッセージ
					return $translate('message.alarm.passive');
				}
			}
		)
		.then(
			function (txt) {
				if (alarmMoment != null) {
					txt = alarmMoment.format('LLL') + "<br>"+ txt;
				}
				ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
				// 再読み込み
				loadList();
			}, function (translationId) {
				ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
			}
		);
		
	}

	$scope.share = function(data) {
		gaTrackEvent('ScheduleDetail', 'share', data.col_entry_link);
		
		window.plugins.socialsharing.share(data.message);
	}
    
    // 修正ボタン押下時処理
    $scope.modify = function(data) {
		gaTrackEvent('ScheduleDetail', 'modify', data.col_entry_link);
		
		// 日付ピッカープラグイン表示
		cordova.plugins.DateTimePicker.show({
			mode: "date",
            // パース日付を元にする
			date: moment(data.col_entry_parse_date).toDate(),
            // 過去日付もOK
			allowOldDates: true,
			allowFutureDates: true,
			minuteInterval: 15,
			locale: findLanguage(),
			okText: "SELECT",
			cancelText: "CANCEL",
			android: {
				theme: 16974126, // Theme_DeviceDefault_Dialog
				calendar: false,
				is24HourView: true
			},
			success: function(newDate) {
				// Handle new date.
				console.log(JSON.stringify(newDate));
				// パース日付に再設定(時間は12時を固定設定)
				data.col_entry_parse_date = moment(new Date(newDate)).hours(12);
				
				MyDBService.connect()
				.then(function(db) {
					return MyDBService.save(db, data);
				})
				.then(
					function(result) {
						console.log("result = "+ result);
						if (result) {
							// 更新成功
							return $translate('message.date_update.success');
						}
						else {
							// 更新失敗
							return $translate('message.date_update.failure');
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
				);
			},
			cancel: function() {
				console.log("Cancelled");
				return;
			},
			error: function (err) {
				// Handle error.
				console.error(err);
				return;
			}
		});
    }
	

	// 削除ボタン押下時処理
	$scope.delete = function(data) {
		// イベントログ
		gaTrackEvent('ScheduleDetail', 'delete', data.col_entry_link);
		
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
							return MyDBService.delete(db, data);
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
	    	$translate(['intro.schedule_detail.overview'
	    				, 'intro.schedule_detail.title'
	    				, 'intro.schedule_detail.type'
	    				, 'intro.schedule_detail.next'
	    				, 'intro.schedule_detail.prev'
	    				, 'intro.schedule_detail.entry_title'
	    				, 'intro.schedule_detail.entry_content'
	    				, 'intro.schedule_detail.entry_edit'
	    				, 'intro.schedule_detail.entry_link'
	    				, 'intro.schedule_detail.entry_share'
	    				, 'intro.schedule_detail.entry_alarm'
	    				, 'intro.schedule_detail.entry_delete'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.schedule_detail.overview']
					        },
					        {
					            element: '#displayDate',
					            intro: translations['intro.schedule_detail.title']
					        },
					        {
					            element: '#next',
					            intro: translations['intro.schedule_detail.next']
					        },
					        {
					            element: '#prev',
					            intro: translations['intro.schedule_detail.prev']
					        },
					        {
					            element: '.entry_title',
					            intro: translations['intro.schedule_detail.entry_title']
					        },
					        {
					            element: '.entry_content',
					            intro: translations['intro.schedule_detail.entry_content']
					        },
					        {
					            element: '.entry_edit',
					            intro: translations['intro.schedule_detail.entry_edit']
					        },
					        {
					            element: '.entry_link',
					            intro: translations['intro.schedule_detail.entry_link']
					        },
					        {
					            element: '.entry_share',
					            intro: translations['intro.schedule_detail.entry_share']
					        },
					        {
					            element: '.entry_alarm',
					            intro: translations['intro.schedule_detail.entry_alarm']
					        },
					        {
					            element: '.entry_delete',
					            intro: translations['intro.schedule_detail.entry_delete']
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



// フィルタとイベントを掛け合わせる
function matchGroup(groupList, textList, feedList) {
	var colorList = [];
	var regTextList = [];
	var regList = [];
    var filterList = [];
	if (textList.length > 0) {
		var prevGroupId = null;
		for (var t of textList) {
			if (prevGroupId == null) {
				prevGroupId = t.col_group_id;
				regTextList.push([]);
				regTextList[regTextList.length - 1].push(t.col_text);
				colorList.push(getGroupColor(groupList, t.col_group_id));
                filterList.push(t.col_group_id);
			}
			else {
				if (prevGroupId == t.col_group_id) {
					// 前と同じグループ
					regTextList[regTextList.length - 1].push(t.col_text);
				}
				else {
					// 前と違うグループ
					prevGroupId = t.col_group_id;
					regTextList.push([]);
					regTextList[regTextList.length - 1].push(t.col_text);
					colorList.push(getGroupColor(groupList, t.col_group_id));
                    filterList.push(t.col_group_id);
				}
			}
		}
		
		console.log("regTextList: "+ JSON.stringify(regTextList));
		
		for (var r of regTextList) {
			regList.push("(" + r.join("|") + ")");
		}
	}
	
	// console.log("regList: "+ JSON.stringify(regList));
	// console.log("colorList: "+ JSON.stringify(colorList));
	// console.log("feedList: "+ JSON.stringify(feedList));
	
	for (var feed of feedList) {
		for (var n = 0 ; n < regList.length; n++) {
			var entryTxt = (feed.col_entry_title + ":"+ feed.col_entry_content);
			var match = entryTxt.match(new RegExp(regList[n], 'i'));
			
			// console.log(entryTxt);
			// console.log(regList[n]);
			// console.log(match);
			
			if (match) {
				// 正規表現に合致した場合、対応する色を設定する
                feed['filter_id'] = filterList[n];
				feed['color'] = colorList[n];
				break;
			}
			else {
                feed['match'] = -1;
                feed['filter_id'] = "99999999";
				if (feed.col_id == 1) {
					// ID=1のイベントは初期設定なので特別色
					feed['color'] = "#AC6273";
				}
				else {
					feed['color'] = "#999999";
				}
			}
		}
	}
	
}


// グループIDからカラーを取得する
function getGroupColor(groupList, groupId) {
	for (var g of groupList) {
		if (g.col_id == groupId) {
			console.log("getGroupColor: groupId="+ groupId + ", color: "+ g.col_color);
			return g.col_color;
		}
	}
}


