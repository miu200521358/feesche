var FEESCHE_SUBSCRIPTIONS_MONTHLY = "feesche_subscriptions_monthly";
var FEESCHE_SUBSCRIPTIONS_YEARLY = "feesche_subscriptions_yearly";

var isSubscriptionMonthly = false;
var isSubscriptionYearly = false;

var priceSubscriptionMonthly = "";
var priceSubscriptionYearly = "";

// 購入情報の初期化
initializeStore = function(MySubscriptionService, callback) {
    console.log("initializeStore");

    if (!window.store) {
        console.error('Store not available');
        return;
    }
    
    // Let's set a pretty high verbosity level, so that we see a lot of stuff
    // in the console (reassuring us that something is happening).
    // store.verbosity = store.DEBUG;

    // 認証
    store.validator = function(product, callback2) {
        MySubscriptionService.validate(product)
        .then(
            function(result, product) {
                // 認証OK
                callback2(true, product);
            }, function(result, message) {
                // 認証NG
                callback2(false , message);
            }
        )
    };

    // We register a dummy product. It's ok, it shouldn't
    // prevent the store "ready" event from firing.
    // 月額定期購入
    store.register({
        id:    FEESCHE_SUBSCRIPTIONS_MONTHLY,
        alias: "Monthly subscription",
        type:  store.PAID_SUBSCRIPTION
    });

    // 年定期購入
    store.register({
        id:    FEESCHE_SUBSCRIPTIONS_YEARLY,
        alias: "Yearly subscription",
        type:  store.PAID_SUBSCRIPTION
    });

    // When every goes as expected, it's time to celebrate!
    // The "ready" event should be welcomed with music and fireworks,
    // go ask your boss about it! (just in case)
    store.ready(function() {
        console.log("STORE READY");
    });

    // After we've done our setup, we tell the store to do
    // it's first refresh. Nothing will happen if we do not call store.refresh()
    store.refresh();
    
    // // 月額確認
    // prepareSubscription(FEESCHE_SUBSCRIPTIONS_MONTHLY, function(result){
    //     console.log("initializeStore monthly result="+ result);
    //     isSubscriptionMonthly = result;
    // });
    
    // // 年額確認
    // prepareSubscription(FEESCHE_SUBSCRIPTIONS_YEARLY, function(result){
    //     console.log("initializeStore yearly result="+ result);
    //     isSubscriptionYearly = result;
    // });

    checkSubscription(callback);
}


function checkSubscription(callback) {
    prepareSubscription(FEESCHE_SUBSCRIPTIONS_MONTHLY, function(result) {
        console.log("checkSubscription monthly result="+ result);
        
        isSubscriptionMonthly = result;

        prepareSubscription(FEESCHE_SUBSCRIPTIONS_YEARLY, function(result) {
            console.log("checkSubscription yearly result="+ result);
            
            isSubscriptionYearly = result;

            callback(isSubscription());
        });
    });
}

function isSubscription() {
    console.log("isSubscriptionMonthly: "+ isSubscriptionMonthly);
    console.log("isSubscriptionYearly: "+ isSubscriptionYearly);
    return isSubscriptionMonthly || isSubscriptionYearly;
}

// サブスクリプションの準備をする
function prepareSubscription(id, callback) {
    console.log("prepareSubscription id="+ id);

    if (!window.store) {
        console.error('Store not available');
        callback(false);
        return;
    }
    
    // サブスクリプションを一旦承認する
    store.when(id).approved(function(product) {
        console.log("prepareSubscription approved product="+ JSON.stringify(product));

        product.verify();
    });
    
    // 認証に成功した場合
    store.when(id).verified(function(product) {
        console.log("prepareSubscription verified product="+ JSON.stringify(product));
        
        product.finish();
    });

    // 認証に失敗した場合
    store.when(id).unverified(function(product) {
        console.log("prepareSubscription unverified product="+ JSON.stringify(product));
    });
    
    // updateをかける
    store.when(id).updated(function(product) {
        console.log("prepareSubscription updated product="+ JSON.stringify(product));
        // alert("prepareSubscription updated product="+ JSON.stringify(product));
        
        if (id == FEESCHE_SUBSCRIPTIONS_MONTHLY) {
            // 月額金額設定
            priceSubscriptionMonthly = product.price;
        }
        else if (id == FEESCHE_SUBSCRIPTIONS_YEARLY) {
            // 年額金額設定
            priceSubscriptionYearly = product.price;
        }

        if (product.owned) {
            console.log("○ "+ id + " is owned");
            // 課金してたら、バナー隠す
            hideAdMobBanner();
            callback(true);
            return;
        }
        else {
            console.error("× "+ id + " is not owned");
            callback(false);
        }
    });
}

myApp.service('MySubscriptionService', ['$rootScope', '$q', '$timeout', '$http', '$sce', function($rootScope, $q, $timeout, $http, $sce){

    // validateをかけます
    this.validate = function (product) {
    	console.log("MySubscriptionService.validate product="+ JSON.stringify(product));
 		
		var deferred = $q.defer();
		
		$timeout(function(){
            $http({
                method : 'POST',
                url: 'https://citrine21358.mixh.jp/tools/feesche/validate.php',
                data: product
            }).then(function(response) {
                console.log("data: "+ JSON.stringify(response.data));
                console.log("status: "+ JSON.stringify(response.status));
                console.log("headers: "+ JSON.stringify(response.headers));
                console.log("config: "+ JSON.stringify(response.config));
                
                if(response.data['res'] == "1"){
                    console.log("認証OK...");
                    deferred.resolve(true, product);
                }else{
                    //認証失敗時は、何度か自動でリトライするらしい
                    console.error("認証失敗");
                    deferred.reject(false , "Impossible to proceed with validation");
                }
            }, function(response) {
                console.log("data: "+ JSON.stringify(response.data));
                console.log("status: "+ JSON.stringify(response.status));
                console.log("headers: "+ JSON.stringify(response.headers));
                console.log("config: "+ JSON.stringify(response.config));
                
                deferred.reject(false , "Impossible to proceed with validation");
            });
		});
		
		return deferred.promise;
    };
    
}]);

