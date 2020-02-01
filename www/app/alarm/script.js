// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // 設定画面遷移
        .state('alarm', {
            url: '/alarm/index',
            templateUrl: 'app/alarm/index.html',
            controller: 'SettingAlarmController',
            title: "menu.alarm",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]            
        });

}]);


// アラーム設定コントローラ
myApp.controller('SettingAlarmController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, SharedScopes, MyDBService, MyFeedService) {
	
	// 設定取得
	MyDBService.connect().then(
		function(db) {
			return MyDBService.select(db, new SettingAlarmTableCls());
		}
	).then(
		function(results) {
			$scope.alarm = results[0];
			
			$scope.nextAlarm = ( angular.isDefined(feedAlarmTimeout) ? results[0].displayNextAlarm() : null);
		}
	);

	loadHistoryList();
	
	function loadHistoryList() {

		// 履歴取得
		MyDBService.connect().then(
			function(db) {
				return MyDBService.select(db, new AlarmHistoryTableCls(), "col_start_timestamp DESC");
			}
		).then(
			function(historyList) {
				$scope.histories = historyList;
			}
		);
		
	}
	
	$scope.save = function() {
		console.log("id="+ $scope.alarm.col_id + ", interval="+ $scope.alarm.col_alarm_hour);
	
		// 登録実行
		MyDBService.connect().then(
			function(db) {
				return MyDBService.save(db, $scope.alarm);
			}
		).then(
			function(result) {
				
				if ( angular.isDefined(feedAlarmTimeout) ) {
					// フィードアラームが設定済みなら、一旦キャンセル
					$timeout.cancel(feedAlarmTimeout);
					feedAlarmTimeout = undefined;
				}
				
				MyFeedService.setNextAlarm();
				
				$translate('message.alarm.success').then(
					function (txt) {
						ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
						
						// 履歴再読み込み
						loadHistoryList();
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
	    	$translate(['intro.alarm.overview'
	    				, 'intro.alarm.alarm_hour'
	    				, 'intro.alarm.save'
	    				, 'intro.alarm.history'
	    				, 'intro.alarm.delete'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.alarm.overview']
					        },
					        {
					            element: '#alarm_hour',
					            intro: translations['intro.alarm.alarm_hour']
					        },
					        {
					            element: '#save',
					            intro: translations['intro.alarm.save']
					        },
					        {
					            element: '#history',
					            intro: translations['intro.alarm.history']
					        },
					        {
					            element: '#delete',
					            intro: translations['intro.alarm.delete']
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