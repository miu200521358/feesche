// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // 設定画面遷移
        .state('subscription', {
            url: '/subscription/index',
            templateUrl: 'app/subscription/index.html',
            controller: 'SubscriptionController',
            title: "menu.subscription",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]            
        });

}]);


// 定期購入コントローラ
myApp.controller('SubscriptionController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$interval', '$q', '$timeout', 'SharedScopes', 'MyDBService', 'MyFeedService', function($scope, $state, $rootScope, $stateParams, $translate, $interval, $q, $timeout, SharedScopes, MyDBService, MyFeedService) {
	
    // 定期購入ステータス
    $scope.isSubscriptionMonthly = false;
    $scope.isSubscriptionYearly = false;
        
    store.refresh();
	
	$scope.priceSubscriptionMonthly = priceSubscriptionMonthly;
	$scope.priceSubscriptionYearly = priceSubscriptionYearly;

    // 月額確認
    prepareSubscription(FEESCHE_SUBSCRIPTIONS_MONTHLY, function(result){
        //月額課金が継続されています
	    $scope.isSubscriptionMonthly = true;
	    
        $translate('subscription.status_monthly')
        .then(
        	function(txt) {
        		$scope.displaySubscriptionStatus = txt;
        	}
        );
    });
    
    // 年額確認
    prepareSubscription(FEESCHE_SUBSCRIPTIONS_YEARLY, function(result){
	    $scope.isSubscriptionYearly = true;
        
        $translate('subscription.status_yearly')
        .then(
        	function(txt) {
        		$scope.displaySubscriptionStatus = txt;
        	}
        );
    });

	$scope.subscribeMonthly = function() {
		// イベントログ
		gaTrackEvent('Subscription', 'monthly');

		// 月額定期購入
		
	    // 購入ダイアログ表示
	    store.order(FEESCHE_SUBSCRIPTIONS_MONTHLY);
	    
	    // 購入完了イベント
	    store.when(FEESCHE_SUBSCRIPTIONS_MONTHLY).approved(function(product) {
	    	console.log(JSON.stringify(product));
	    	
	    	product.verify();
	    });
	    
		store.when(FEESCHE_SUBSCRIPTIONS_MONTHLY).unverified(function(product) {
			//store.validatorで callback(false)時に実行される。認証の失敗
			alert("認証に失敗しました");
			//認証に失敗した時の処理を書く
		});
		
		store.when(FEESCHE_SUBSCRIPTIONS_MONTHLY).verified(function(product) {
			product.finish();// storeの購入情報をfinishedにする
		});

	    store.refresh();
	}
	
	$scope.subscribeYearly = function() {
		// イベントログ
		gaTrackEvent('Subscription', 'yearly');

		// 年額定期購入
		
	    // 購入ダイアログ表示
	    store.order(FEESCHE_SUBSCRIPTIONS_YEARLY);
	    
	    // 購入完了イベント
	    store.when(FEESCHE_SUBSCRIPTIONS_YEARLY).approved(function(product) {
	    	console.log(JSON.stringify(product));
	    	
	    	product.verify();
	    });
	    
		store.when(FEESCHE_SUBSCRIPTIONS_YEARLY).unverified(function(product) {
			//store.validatorで callback(false)時に実行される。認証の失敗
			alert("認証に失敗しました");
			//認証に失敗した時の処理を書く
		});
		
		store.when(FEESCHE_SUBSCRIPTIONS_YEARLY).verified(function(product) {
			product.finish();// storeの購入情報をfinishedにする
		});

	    store.refresh();
	}

	$scope.isAndroid = function() {
		return /(android)/i.test(navigator.userAgent);
	}
	
	$scope.isIOS = function() {
		return /(ipod|iphone|ipad)/i.test(navigator.userAgent);
	}

	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.subscription.overview'
	    				, 'intro.subscription.status'
	    				, 'intro.subscription.subscription_monthly'
	    				, 'intro.subscription.subscription_yearly'
	    				, 'intro.subscription.subscription_cancel'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.subscription.overview']
					        },
					        {
					            element: '#status',
					            intro: translations['intro.subscription.status']
					        },
					        {
					            element: '#subscription_monthly',
					            intro: translations['intro.subscription.subscription_monthly']
					        },
					        {
					            element: '#subscription_yearly',
					            intro: translations['intro.subscription.subscription_yearly']
					        },
					        {
					            element: '#subscription_cancel',
					            intro: translations['intro.subscription.subscription_cancel']
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

