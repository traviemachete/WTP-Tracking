const sheetId = '1OF8QYGVpeiKjVToRvJQfTuKUreZTOcc9yZYxQXlh5vQ';
const apiKey = 'AIzaSyBJ99_hsyJJQe4SyntE4SzORk8S0VhNF7I';
const sheetNames = ['เอน คอนเนค', 'อินโนวาเทค โซลูชั่น', 'พินพอยท์ อินโนเวชั่น', 'อีสาน-ส่วนกลาง', 'เอสทีอาร์ อินโนเวชั่น', 'เขต 7'];

const map = L.map('map').setView([15.2, 101.0], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const statusLayers = {
  "อยู่ในประกัน": L.layerGroup().addTo(map),
  "หมดประกัน": L.layerGroup().addTo(map)
};

const allMarkers = [];

function getDynamicRadius(zoom) {
  if (zoom >= 12) return 8;
  if (zoom >= 10) return 6;
  if (zoom >= 8) return 4;
  return 2;
}

async function loadSheet(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.values) return;
  const [headersRaw, ...rows] = data.values;
  const headers = headersRaw.map(h => h.trim());
  const idx = col => headers.indexOf(col);

  rows.forEach((row, i) => {
    const lat = parseFloat(row[idx("Lat")]?.trim());
    const lng = parseFloat(row[idx("Long")]?.trim());
    const name = row[idx("พื้นที่")] || "-";
    const type = row[idx("Type")] || "-";
    const year = row[idx("ปีงบประมาณ")] || "-";
    const company = row[idx("บริษัท")] || "-";
    const province = row[idx("จังหวัด")] || "-";
    const status = (row[idx("Status")] || "").trim();
    const endDate = row[idx("วันที่หมดระยะประกัน")] || "-";
    const contact = row[idx("ชื่อผู้ดูแล")] || "-";
    const phone = row[idx("เบอร์โทร/ผู้ดูแล")] || "-";
    const mapUrl = row[idx("แผนที่")] || "";

    if (!lat || !lng || !status || !statusLayers[status]) return;

    const color = status === "หมดประกัน" ? "red" : "green";
    const radius = getDynamicRadius(map.getZoom());

    const marker = L.circleMarker([lat, lng], {
      color, fillColor: color, fillOpacity: 0.8, radius
    });

    marker.bindPopup(`
      <b>${name}</b><br/>
      บริษัท: ${company}<br/>
      จังหวัด: ${province}<br/>
      ประเภท: ${type}<br/>
      ปีงบประมาณ: ${year}<br/>
      สถานะ: <b style="color:${color}">${status}</b><br/>
      วันที่หมดระยะประกัน: ${endDate}<br/>
      ผู้ดูแล: ${contact}<br/>
      เบอร์โทร: ${phone}<br/>
      ลิงก์แผนที่: <a href="${mapUrl}" target="_blank">เปิดดู</a>
    `);

    marker._meta = { type, year, status, name: name.toLowerCase(), province: province.toLowerCase() };
    marker.addTo(statusLayers[status]);
    allMarkers.push(marker);
  });
}

Promise.all(sheetNames.map(loadSheet));

map.on("zoomend", () => {
  const zoom = map.getZoom();
  allMarkers.forEach(marker => marker.setRadius(getDynamicRadius(zoom)));
});

function applyFilter() {
  const type = document.getElementById("typeFilter").value;
  const year = document.getElementById("yearFilter").value;
  const status = document.getElementById("statusFilter").value;
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  allMarkers.forEach(marker => {
    const m = marker._meta;
    const visible = (!type || m.type === type) && (!year || m.year === year) && (!status || m.status === status) && (!search || m.name.includes(search) || m.province.includes(search));
    if (visible) marker.addTo(statusLayers[m.status]); else map.removeLayer(marker);
  });
}

function resetFilters() {
  document.getElementById("typeFilter").value = "";
  document.getElementById("yearFilter").value = "";
  document.getElementById("statusFilter").value = "";
  document.getElementById("searchInput").value = "";
  applyFilter();
}

["typeFilter", "yearFilter", "statusFilter", "searchInput"].forEach(id =>
  document.getElementById(id)?.addEventListener("change", applyFilter)
);
document.getElementById("searchInput").addEventListener("input", applyFilter);

document.getElementById("toggleFilterBtn").addEventListener("click", () => {
  const panel = document.getElementById("filterPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});
