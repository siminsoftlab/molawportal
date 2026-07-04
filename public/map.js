document.addEventListener("DOMContentLoaded", () => {

  // ⭐ daum 객체가 없으면 실행하지 않음 → 오류 방지
  if (typeof daum === "undefined" || !daum.roughmap) {
    console.warn("Daum map script not loaded yet.");
    return;
  }

  new daum.roughmap.Lander({
    "timestamp": "1779184856757",
    "key": "no827uetjj8",
    //"mapWidth": "100%",
    //"mapHeight": "360"
  }).render();
});


/*
document.addEventListener("DOMContentLoaded", function () {
  var officeLat = 37.492314;
  var officeLng = 127.015022;

  var mapContainer = document.getElementById('map');

  // ⭐ 여기서 kakao.maps.Map 선언이 반드시 필요함
  var mapOption = {
    center: new kakao.maps.LatLng(officeLat, officeLng),
    level: 3
  };

  var map = new kakao.maps.Map(mapContainer, mapOption);

  // 마커 표시
  var marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(officeLat, officeLng)
  });
  marker.setMap(map);

  // 주변 POI 제거
  map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADMAP);
});
*/
//document.addEventListener("DOMContentLoaded", function () {
//  new daum.roughmap.Lander({
//    "timestamp": "1779180009898",
//    "key": "o2q7yjgvpjn"
//  }).render();
//});
