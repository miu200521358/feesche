// 引用元：https://github.com/leonaard/icalendar2fullcalendar
function data_req (url, callback) {
    req = new XMLHttpRequest()
    req.addEventListener('load', callback)
    req.open('GET', url)
    req.send()
}

function load_ics(calendar_id, ics){
    data_req(ics.url, function(){
        $(calendar_id).fullCalendar('addEventSource', fc_events(this.response, ics.event_properties))
    })
}
