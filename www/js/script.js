var myApp = angular.module('MyApp', ['onsen', 'ui.router', 'ui.calendar', 'swipe', 'ngCookies', 'ngSanitize', 'ngMessages', 'pascalprecht.translate', 'colorpicker.module', 'angular-intro', 'as.sortable']);

// 画面遷移初期設定
myApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	
    // 初期表示設定
    $urlRouterProvider.otherwise("/");
    
}]);

// 戻る機能のコントローラの割り当て
myApp.controller('BackController', ['$rootScope', '$scope', '$state', '$translate', function($rootScope, $scope, $state, $translate) {

    // ツールバーの戻るアイコン押下時の処理
    $scope.backNavi = function() {
        // 戻る処理実行
        console.log("backNavi");
        stateBack($rootScope, $state, $translate, null);
    };
	
}]);


// ツールバー右部分コントローラの割り当て
myApp.controller('ToolRightController', ['$rootScope', '$scope', '$state', '$translate' ,'$timeout', '$location', '$anchorScroll', 'ngIntroService', 'SharedScopes', 'MyFeedService', function($rootScope, $scope, $state, $translate, $timeout, $location, $anchorScroll, ngIntroService, SharedScopes, MyFeedService) {
    
    $scope.loadFeed = function() {
		// イベントログ
		gaTrackEvent('ToolRight', 'loadFeed');
        
    	// 子供のスコープを取得
        var childScope = SharedScopes.getScope($state.current.controller);
        
        // 更新メッセージ
        $translate('schedule.hook_action')
        .then(
            function (txt) {
                ons.notification.toast(txt, ONS_NOTIFICATION_TOAST_OPTIONS);
            }, function (translationId) {
                ons.notification.toast(translationId, ONS_NOTIFICATION_TOAST_OPTIONS);
            }
        );

        if (childScope.uiConfig) {
            // カレンダーがある場合、子の更新処理を呼び出す
            childScope.loadFeed(function(){});
        }
        else {
            // 自前で呼び出す
            $timeout(() => {
                MyFeedService.crawlAllFeed().finally(() => {
                    console.log("** loadFeed finish");
                });
            }, 1000);
        }
    }


    $scope.showIntro = function () {
		// イベントログ
        gaTrackEvent('ToolRight', 'showIntro');
        
    	console.log("$state");
    	console.log($state.current.controller);
    	console.log("SharedScopes");
    	
    	// 子供のスコープを取得
    	var childScope = SharedScopes.getScope($state.current.controller);
    	
		// 最上部遷移
		// $location.hash('pageTop');
		// $anchorScroll();
    
	    childScope.getIntroOptionsSteps()
	    .then(
			function(steps) {
				// ローディングFLG=OFF
				$rootScope.isLoading = false;
				
				// 一旦intro.jsをクリア
			    ngIntroService.clear();
			    // ステップを子どもから取得
			    $scope.IntroOptions['steps'] = steps;
			    // オプションを設定
			    ngIntroService.setOptions($scope.IntroOptions);
			    // intro.js開始
			    ngIntroService.start();
	    	}		    	
	    );
    }

    $scope.IntroOptions = {
        showStepNumbers		: false,
        showBullets			: false,
        exitOnOverlayClick	: true,
        exitOnEsc			: true,
        hidePrev			: true,
        hideNext			: true,
        showBullets			: true,
        nextLabel			: 'Next >',
        prevLabel			: '< Prev',
        skipLabel			: 'Exit',
        doneLabel			: 'Finish'
    };
    
    $scope.showInterstitial = function() {
        
    }

}]);


// 画面遷移時の処理
myApp.run(['$rootScope', '$transitions', '$state', '$translate', 'MySubscriptionService', function($rootScope, $transitions, $state, $translate, MySubscriptionService){
    // main 画面への遷移（初期表示前）
    $transitions.onBefore({to: 'schedule_list'}, function(trans){
        if (trans.$from().url == "") {
            console.log("onBefore initialize");
            // 初期表示の場合
            $rootScope.isSubscription = {};
        }
        
        // ローディングフラグON
        $rootScope.isLoading = true;
        console.log("onBefore isLoading: "+ $rootScope.isLoading);
        
        ons.ready(function(){
            // on mobile device, we must wait the 'deviceready' event fired by cordova
            if(/(ipad|iphone|ipod|android|windows phone)/i.test(navigator.userAgent)) {
                document.addEventListener('deviceready', function(e) {
                    onDeviceReady($rootScope, trans, MySubscriptionService, e);
                }, false);
            } else {
                onDeviceReady($rootScope, trans, MySubscriptionService, null);
            }
        });
    });

    // main 画面以外への遷移（初期表示以外）
    $transitions.onBefore({to: function(state){ return state != 'schedule_list' }}, function(trans){
        // main以外の場合
        console.log("$transitions.onBefore: "+ trans.$from() +" -> "+ trans.$to() +" / "+ trans.params());

        if (trans.$from() != trans.$to()) {
            // 遷移情報（from→toの両方+パラメータを保持）を画面スタック
            $rootScope.pages.push(trans);

            // 遷移HTMLをnavigatorに追加する
            $rootScope.navi.pushPage(trans.$to().self.templateUrl);
        }
    });
    
    // 全画面表示成功後
    $transitions.onSuccess({to: "*"}, function(trans){
        console.log("onSuccess trans: "+ trans);

        // Analytics
        gaTraciView(""+ trans.$to());

    	// タイトルを翻訳する
    	$translate(trans.$to().title)
    		.then(
				function (txt) {
					$rootScope.pageTitle = txt;
				}, function (translationId) {
					$rootScope.pageTitle = translationId;
				}
			);            
    });
    
    // main 画面への遷移（初期表示完了）
    $transitions.onSuccess({to: 'schedule_list'}, function(trans){
        // main画面読み込み成功
        
        // Analytics
        gaTraciView(""+ trans.$to());

    	// タイトルを翻訳する
    	$translate(trans.$to().title)
    		.then(
				function (txt) {
					$rootScope.pageTitle = txt;
				}, function (translationId) {
					$rootScope.pageTitle = translationId;
				}
			);            
        
        // 画面スタック初期化
        $rootScope.pages = [];
    });
    
    // Android の戻るキー押下時処理
    document.addEventListener("backbutton", function(e){
        // 戻る処理実行（イベントを引き継ぐ）
        console.log("backbutton");
        stateBack($rootScope, $state, $translate, e);
    }, false);

}]);

// デバイス準備完了処理
var onDeviceReady = function($rootScope, trans, MySubscriptionService, e) {
    console.log("onDeviceReady");

    if (trans.$from().url == "") {
        console.log("onDeviceReady initialize");
        
        // 初期表示時
        initializeAdmob();
        initializeStore(MySubscriptionService, function(result){
            console.log("onDeviceReady isSubscription="+ result);

            // TODO
            // 課金されていなければバナー表示
            if (!result) {
                createAdMobBanner();
            }
            
        });
    }

}


// 戻る処理
var stateBack = function($rootScope, $state, $translate, e) {
    console.log("--------------------------");
    console.log("stateBack: $root="+ $rootScope +", $state="+ $state + ", e="+ e);

    if (e) {
        // イベントがある場合は一旦止める
        e.preventDefault();
    }

    if ($rootScope.pages.length < 1) {
		$translate(['message.finish.confirm.title', 'message.finish.confirm.message'])
		.then(function (translations) {
            // キューがない場合、アプリを終了するか確認する
            ons.notification.confirm({
                title: translations['message.finish.confirm.title'],
                message: translations['message.finish.confirm.message'],
                callback: function(answer) {
                    if (answer) {
                        navigator.app.exitApp();
                        return;
                    }
                }
            });
            
        }, function (translationIds) {
            ons.notification.alert('Failed to Translate');
        });
    }
    else {
        // 現在のステート
        console.log("current: "+ $state.current);
        console.log("current.name: "+ $state.current.name);
        console.log("current.url: "+ $state.current.url);
        console.log("$rootScope.pages.length: "+ $rootScope.pages.length);

        console.log("* * * *"); 

        // 最新の遷移情報（from→toの両方を保持）を取得する
        var nowPage = $rootScope.pages[$rootScope.pages.length - 1];
        // 画面スタックをポップする
        $rootScope.pages.pop();

        console.log("* back: "+ $state.current.name + " => "+ nowPage);
        console.log(nowPage.$from().name);
        console.log("params: "+ JSON.stringify(nowPage.params()));

        // 最新の遷移情報のfromを元に、戻る方向（前画面）の遷移を実行する
        // パラメータもそのまま再設定する
        $state.go(nowPage.$from().name, nowPage.params());
        // 遷移して追加されたので除去しておく
        $rootScope.pages.pop();

        // 戻る処理実行後のステート
        console.log("current: "+ $state.current);
        console.log("current.name: "+ $state.current.name);
        console.log("current.url: "+ $state.current.url);
        console.log("$rootScope.pages.length: "+ $rootScope.pages.length);
    }
}

// 多言語対応設定
myApp.config(['$translateProvider', function($translateProvider) {
	// 言語ファイルの読み込み
	$translateProvider.useStaticFilesLoader({
		prefix: 'assets/i18n/locale-',
		suffix: '.json'
	});
	// デフォルトの言語キー（画面のを設定）
	$translateProvider.preferredLanguage(findLanguage());
	// 選択言語にリソースが見つからない場合の言語
	$translateProvider.fallbackLanguage('en');
	// キーに対応するリソースが見つからない場合に console 出力
	$translateProvider.useMissingTranslationHandlerLog();
	// 選択言語の保存先として localStorage を指定
	$translateProvider.useLocalStorage();
	// サニタイズ設定
	$translateProvider.useSanitizeValueStrategy('escape','sanitizeParameters');
	// 実際に使用する言語
	$translateProvider.use(findLanguage());
	
	console.log("resolveClientLocale: "+ $translateProvider.resolveClientLocale());
	console.log("findLanguage(): "+ findLanguage());
}]);

// ローディングタグ
myApp.directive('myLoader', function() {
        return {
            restrict : 'E',
            replace: true,
            templateUrl: "loader.html"
        };
    });

// ローディングタグ
myApp.directive('myContents', function() {
        return {
            restrict : 'E',
            transclude: true,
            replace: false,
            scope: {
            	'modifier': '@'
            },
            template: "<a id=\"pageTop\"></a><div style=\"height: 90%;padding: 1em;\" ng-transclude></div>"
		};
    });

// スコープの共有
myApp.factory('SharedScopes', function ($rootScope) {
    var sharedScopes = {};

    return {
        setScope: function (key, value) {
            sharedScopes[key] = value;
        },
        getScope: function (key) {
            return sharedScopes[key];
        }
    };
});

// ユーザ環境の言語を返す
function findLanguage() {
    try {
        var lang = (navigator.browserLanguage || navigator.language || navigator.userLanguage);
        console.log("findLanguage: "+ lang);
        
        // 中国はそのまま返す
        if (lang.indexOf >= "zh_CN") {
            return lang;
        }

        // その他は2文字
		return lang.substr(0, 2);
    } catch (e) {
        return "en";
    }
}

// notification.toastのoption
var ONS_NOTIFICATION_TOAST_OPTIONS = {
	animation: "fade",
	timeout: 2 * 1000,
	modifier: "material"
}
