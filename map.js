document.addEventListener("DOMContentLoaded", function () {
  // 사무실 좌표 (교대역 근처)
  var officeLat = 37.492;
  var officeLng = 127.015;

  var mapContainer = document.getElementById('map');
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

  // POI 제거 (주변 상가/사무실 숨김)
  map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADMAP);
});


//document.addEventListener("DOMContentLoaded", function () {
//  new daum.roughmap.Lander({
//    "timestamp": "1779180009898",
//    "key": "o2q7yjgvpjn"
//  }).render();
//});
