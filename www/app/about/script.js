// 遷移処理
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $stateProvider
        // 設定画面遷移
        .state('about', {
            url: '/about/index',
            templateUrl: 'app/about/index.html',
            controller: 'AboutController',
            title: "menu.about",
            onEnter: ['$rootScope', function($rootScope) {
                $rootScope.splitter.left.close();
            }]            
        });

}]);


// Aboutコントローラ
myApp.controller('AboutController', ['$scope', '$state', '$rootScope', '$stateParams', '$translate', '$q', '$timeout', "$sce", "SharedScopes", function($scope, $state, $rootScope, $stateParams, $translate, $q, $timeout, $sce, SharedScopes) {
	
	$scope.histories = [];
	
	$translate(['about.history.ver01_00_00.version', 'about.history.ver01_00_00.message'])
	.then(
		function(translations) {
			$scope.histories.push({
				"version": translations['about.history.ver01_00_00.version'],
				"message": translations['about.history.ver01_00_00.message']
			});
		}
	);
	
	$scope.jumpForm = function() {
		// イベントログ
		gaTrackEvent('About', 'jumpForm');
		
		var url = $sce.trustAsResourceUrl("https://docs.google.com/forms/d/e/1FAIpQLSfJQ30ER5gHWgU6LRaipY0t9DTMu0qU8oYHYZRGUx-Rik-L_w/viewform?usp=sf_link");
		
		console.log("url="+ url);
		
		// システムのデフォルトブラウザで開く
		window.open(url, '_system');
	}
	
	$scope.jumpRate = function() {
		// イベントログ
		gaTrackEvent('About', 'jumpRate');
		
		var url = $sce.trustAsResourceUrl("https://play.google.com/store/apps/details?id=jp.comfycolor.feesche");
		
		console.log("url="+ url);
		
		// システムのデフォルトブラウザで開く
		window.open(url, '_system');
	}
	
	$scope.share = function() {
		// イベントログ
		gaTrackEvent('About', 'share');
		
		window.plugins.socialsharing.share("FeeSche: http://feesche.tech/");
	}
	

	// intro.js ----------------------------------------------
	
	// スコープを共有する
	SharedScopes.setScope($state.current.controller, $scope);

    $scope.getIntroOptionsSteps = function() {
		var deferred = $q.defer();
		
		$timeout(function(){
	    	$translate(['intro.about.overview'
	    				, 'intro.about.share'
	    				, 'intro.about.rate'
	    				, 'intro.about.contact'
	    	]).then(
	    		function (translations) {
	    			var steps = [
					        {
					            intro: translations['intro.about.overview']
					        },
					        {
					            element: '#share',
					            intro: translations['intro.about.share']
					        },
					        {
					            element: '#rate',
					            intro: translations['intro.about.rate']
					        },
					        {
					            element: '#contact',
					            intro: translations['intro.about.contact']
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