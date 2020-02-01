// 祝日を読み込む
function loadHoliday() {
	var holidayUrl = getHolidayIcsUrl();
	
	if (holidayUrl) {
	    // 祝日を設定
	    holiday_ics = {
	    	url: holidayUrl,
	    	event_properties:{color:'#C40026'}
	    }
		
		load_ics("#myCalendar", holiday_ics);
	}
}

// 祝日用カレンダー名
function getHolidayIcsUrl(){
    var lang = getHolidayIcsLanguage();
    getHolidayIcsCountry(function(country) {
        if (lang && country) {
            return 'https://calendar.google.com/calendar/ical/'+ country + '__'+ lang +'@holiday.calendar.google.com/public/full.ics';
    	}
    });
}

// 祝日用カレンダー名(言語)
function getHolidayIcsLanguage(){
    var lang = findLanguage();
	
    // 変換が必要なものはここで変換する
	
	return lang;
}

// 祝日用カレンダー名(国)
function getHolidayIcsCountry(callback){
    plugins.country.get(function (countryCode) {
        if (countryCode.toUpperCase() == 'JP') {
    		callback("japanese");
    	}
        
        callback(null);        
    }, function() {
        console.log("country get error");
    });
}

