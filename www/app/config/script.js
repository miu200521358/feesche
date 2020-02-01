// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // 設定画面遷移
        .state('config', {
            url: '/config/index',
            templateUrl: 'app/config/index.html',
            controller: 'SettingConfigController',
            title: "menu.config",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]            
        });

}]);


// アラーム設定コントローラ
myApp.controller('SettingConfigController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, SharedScopes, MyDBService, MyFeedService) {
    
	// 設定取得
	MyDBService.connect().then(
		function(db) {
			return MyDBService.select(db, new SettingParamsTableCls());
		}
	).then(
		function(results) {
			$scope.config = results[0];
		}
	);

	$scope.save = function() {
		// イベントログ
		gaTrackEvent('Config', 'save');

		console.log("id="+ $scope.config.col_id + ", col_firstday_of_week="+ $scope.config.col_firstday_of_week);
		
		// 登録実行
		MyDBService.connect().then(
			function(db) {
				return MyDBService.save(db, $scope.config);
			}
		).then(
			function(result) {
				// 保存に成功したら、ローカルストレージにも保存する
				localStorage.setItem("col_firstday_of_week", $scope.config.col_firstday_of_week);
				localStorage.setItem("col_event_limit", $scope.config.col_event_limit);

				// 保存成功メッセージ
				return $translate('message.save.success');
			}, function (err) {
				// 保存失敗メッセージ
				return $translate('message.save.failure');
			}
		).then(
			function (txt) {
				ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
		}, function (translationId) {
				ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
			}
		);				
};
	
	
	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.config.overview'
	    				, 'intro.config.config_hour'
	    				, 'intro.config.save'
	    				, 'intro.config.history'
	    				, 'intro.config.delete'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.config.overview']
					        },
					        {
					            element: '#config_hour',
					            intro: translations['intro.config.config_hour']
					        },
					        {
					            element: '#save',
					            intro: translations['intro.config.save']
					        },
					        {
					            element: '#history',
					            intro: translations['intro.config.history']
					        },
					        {
					            element: '#delete',
					            intro: translations['intro.config.delete']
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