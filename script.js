const API_URL = "http://localhost:3000";
let allReports = [];
let currentFilter = "ALL";
let currentUnresolvedFilter = "ALL";
let currentResolvedFilter = "ALL";
let currentDashboardFilter = "ALL";
let dashboardMap, unresolvedMap;
let dashboardHeatLayer, unresolvedHeatLayer;
const delhiBounds = L.latLngBounds([28.20, 76.80], [28.95, 77.80]);
const themeToggle = document.getElementById('theme-toggle');
const iconMoon = document.querySelector('.icon-moon');
const iconSun = document.querySelector('.icon-sun');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    iconMoon.style.display = 'none';
    iconSun.style.display = 'block';
}
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
        iconMoon.style.display = 'none';
        iconSun.style.display = 'block';
        localStorage.setItem('theme', 'dark');
    } else {
        iconMoon.style.display = 'block';
        iconSun.style.display = 'none';
        localStorage.setItem('theme', 'light');
    }
    if (dashboardMap) dashboardMap.invalidateSize();
    if (unresolvedMap) unresolvedMap.invalidateSize();
});
function showPage(page) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(page + '-page').classList.add('active');
    const navMap = { 'home': 0, 'track': 1, 'unresolved': 2, 'resolved': 3, 'login': 4 };
    if (navMap[page] !== undefined) {
        document.querySelectorAll('.nav-btn')[navMap[page]]?.classList.add('active');
    }
    if (page === 'dashboard') {
        setTimeout(() => { initDashboardMap(); loadDashboardReports(); }, 300);
    } else if (page === 'unresolved') {
        setTimeout(() => { initUnresolvedMap(); loadUnresolvedReports(); }, 300);
    } else if (page === 'resolved') {
        setTimeout(() => { loadResolvedReports(); }, 300);
    } else if (page === 'home') {
        setTimeout(() => { loadHomeStats(); }, 300);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function initDashboardMap() {
    if (dashboardMap) { dashboardMap.remove(); }
    dashboardMap = L.map('dashboardMap', { maxBounds: delhiBounds, maxBoundsViscosity: 1.0, minZoom: 10, maxZoom: 18 });
    dashboardMap.fitBounds(delhiBounds);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(dashboardMap);
    dashboardMap.invalidateSize();
}
function initUnresolvedMap() {
    if (unresolvedMap) { unresolvedMap.remove(); }
    unresolvedMap = L.map('unresolvedMap', { maxBounds: delhiBounds, maxBoundsViscosity: 1.0, minZoom: 10, maxZoom: 18 });
    unresolvedMap.fitBounds(delhiBounds);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(unresolvedMap);
    unresolvedMap.invalidateSize();
}
async function loadReports() {
    try {
        const response = await fetch(`${API_URL}/reports`);
        allReports = await response.json();
        return allReports;
    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Error loading reports', 'error');
        return [];
    }
}
async function loadHomeStats() {
    const reports = await loadReports();
    document.getElementById('homeTotalReports').textContent = reports.length;
    document.getElementById('homePendingReports').textContent = reports.filter(r => r.status === 'Pending').length;
    document.getElementById('homeResolvedReports').textContent = reports.filter(r => r.status === 'Resolved').length;
}
async function loadDashboardReports() {
    const reports = await loadReports();
    document.getElementById('dashTotalReports').textContent = reports.length;
    document.getElementById('dashPendingReports').textContent = reports.filter(r => r.status === 'Pending').length;
    document.getElementById('dashResolvedReports').textContent = reports.filter(r => r.status === 'Resolved').length;
    displayDashboardReports(reports);
}
function displayDashboardReports(reports) {
    const list = document.getElementById('dashboardList');
    list.innerHTML = '';
    let filteredReports = reports;
    if (currentDashboardFilter !== 'ALL') {
        filteredReports = reports.filter(r => r.status === currentDashboardFilter);
    }
    let heatPoints = [];
    filteredReports.forEach(report => {
        heatPoints.push([report.latitude, report.longitude, report.upvotes + 1]);
        const li = document.createElement('li');
        li.className = 'report-item';
        li.innerHTML = `
            <div class="report-header">
                <div class="report-title">📍 ${report.issue_category}</div>
                <span class="report-status ${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
            </div>
            <div class="report-details">
                <div class="report-detail"><strong>Colony:</strong> ${report.colony}</div>
                <div class="report-detail"><strong>ID:</strong> ${report.id}</div>
                <div class="report-detail"><strong>Upvotes:</strong> 👍 ${report.upvotes}</div>
                <div class="report-detail"><strong>Date:</strong> ${new Date(report.timestamp).toLocaleDateString()}</div>
            </div>
            <p style="color: var(--text-secondary); margin: 12px 0;">${report.description}</p>
            <div class="report-image">
                <img src="${API_URL}/${report.image_url}" alt="Report Image" onerror="this.style.display='none'">
            </div>
            <div class="report-actions">
                <select class="status-select" data-id="${report.id}" style="padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; font-weight: 600; background: var(--bg-input); color: var(--text-primary);">
                    <option ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option ${report.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                    <option ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
                <button class="btn btn-secondary" onclick="navigateToLocation(${report.latitude}, ${report.longitude})">🗺️ Navigate</button>
                <button class="btn btn-danger" onclick="deleteReport('${report.id}')">🗑️ Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
    if (dashboardHeatLayer) { dashboardMap.removeLayer(dashboardHeatLayer); }
    if (heatPoints.length > 0) {
        dashboardHeatLayer = L.heatLayer(heatPoints, { radius: 20, blur: 35, maxZoom: 17, minOpacity: 0.5 }).addTo(dashboardMap);
        dashboardMap.invalidateSize();
    }
}
async function loadUnresolvedReports() {
    const reports = await loadReports();
    displayUnresolvedReports(reports);
}
function displayUnresolvedReports(reports) {
    const list = document.getElementById('unresolvedList');
    list.innerHTML = '';
    let filteredReports = reports.filter(r => r.status !== 'Resolved');
    if (currentUnresolvedFilter !== 'ALL') {
        filteredReports = filteredReports.filter(r => r.status === currentUnresolvedFilter);
    }
    let heatPoints = [];
    filteredReports.forEach(report => {
        heatPoints.push([report.latitude, report.longitude, report.upvotes + 1]);
        const li = document.createElement('li');
        li.className = 'report-item';
        li.innerHTML = `
            <div class="report-header">
                <div class="report-title">📍 ${report.issue_category}</div>
                <span class="report-status ${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
            </div>
            <div class="report-details">
                <div class="report-detail"><strong>Colony:</strong> ${report.colony}</div>
                <div class="report-detail"><strong>ID:</strong> ${report.id}</div>
                <div class="report-detail"><strong>Endorsement:</strong>  ${report.upvotes}</div>
            </div>
            <p style="color: var(--text-secondary); margin: 12px 0;">${report.description}</p>
            <div class="vote-buttons">
                <button class="vote-btn upvote" onclick="upvoteReport('${report.id}')">👍 Endorse (${report.upvotes})</button>
                <button class="btn btn-secondary" onclick="navigateToLocation(${report.latitude}, ${report.longitude})">🗺️ Navigate</button>
            </div>
        `;
        list.appendChild(li);
    });
    if (unresolvedHeatLayer) { unresolvedMap.removeLayer(unresolvedHeatLayer); }
    if (heatPoints.length > 0) {
        unresolvedHeatLayer = L.heatLayer(heatPoints, { radius: 20, blur: 35, maxZoom: 17, minOpacity: 0.5 }).addTo(unresolvedMap);
        unresolvedMap.invalidateSize();
    }
}
async function loadResolvedReports() {
    const reports = await loadReports();
    displayResolvedReports(reports);
}
function displayResolvedReports(reports) {
    const list = document.getElementById('resolvedList');
    list.innerHTML = '';
    let filteredReports = reports.filter(r => r.status === 'Resolved');
    filteredReports.forEach(report => {
        const li = document.createElement('li');
        li.className = 'report-item';
        li.innerHTML = `
            <div class="report-header">
                <div class="report-title">📍 ${report.issue_category}</div>
                <span class="report-status resolved">✓ Resolved</span>
            </div>
            <div class="report-details">
                <div class="report-detail"><strong>Colony:</strong> ${report.colony}</div>
                <div class="report-detail"><strong>ID:</strong> ${report.id}</div>
                <div class="report-detail"><strong>Resolved:</strong> ${new Date(report.timestamp).toLocaleDateString()}</div>
            </div>
            <p style="color: var(--text-secondary); margin: 12px 0;">${report.description}</p>
            <div class="report-image">
                <img src="${API_URL}/${report.image_url}" alt="Report Image" onerror="this.style.display='none'">
            </div>
        `;
        list.appendChild(li);
    });
}
function filterDashboard(status) {
    currentDashboardFilter = status;
    document.querySelectorAll('#dashboard-page .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadDashboardReports();
}
function filterUnresolved(status) {
    currentUnresolvedFilter = status;
    document.querySelectorAll('#unresolved-page .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadUnresolvedReports();
}
function filterResolved(status) {
    currentResolvedFilter = status;
    loadResolvedReports();
}
function searchResolved() {
    const search = prompt('Enter colony name to search:');
    if (!search) return;
    const list = document.getElementById('resolvedList');
    const reports = allReports.filter(r => r.status === 'Resolved');
    const filtered = reports.filter(r => r.colony.toLowerCase().includes(search.toLowerCase()));
    list.innerHTML = '';
    if (filtered.length === 0) {
        list.innerHTML = '<li class="report-item" style="text-align:center;color:#888;">No results found for "' + search + '"</li>';
        return;
    }
    filtered.forEach(report => {
        const li = document.createElement('li');
        li.className = 'report-item';
        li.innerHTML = `
            <div class="report-header">
                <div class="report-title">📍 ${report.issue_category}</div>
                <span class="report-status resolved">✓ Resolved</span>
            </div>
            <div class="report-details">
                <div class="report-detail"><strong>Colony:</strong> ${report.colony}</div>
                <div class="report-detail"><strong>ID:</strong> ${report.id}</div>
                <div class="report-detail"><strong>Resolved:</strong> ${new Date(report.timestamp).toLocaleDateString()}</div>
            </div>
            <p style="color: var(--text-secondary); margin: 12px 0;">${report.description}</p>
            <div class="report-image">
                <img src="${API_URL}/${report.image_url}" alt="Report Image" onerror="this.style.display='none'">
            </div>
        `;
        list.appendChild(li);
    });
    showToast(`Found ${filtered.length} result(s)`, 'success');
}
async function trackComplaint() {
    const id = document.getElementById('trackInput').value.trim();
    if (!id) { showToast('Please enter acknowledgement number', 'error'); return; }
    try {
        const response = await fetch(`${API_URL}/report-status/${id}`);
        if (response.ok) {
            const report = await response.json();
            displayTrackResult(report);
        } else {
            showToast('Report not found', 'error');
        }
    } catch (error) {
        showToast('Error tracking complaint', 'error');
    }
}
function displayTrackResult(report) {
    const result = document.getElementById('trackResult');
    const icon = document.getElementById('trackIcon');
    document.getElementById('trackId').textContent = `ID: ${report.id}`;
    document.getElementById('trackColony').textContent = report.colony;
    document.getElementById('trackCategory').textContent = report.issue_category;
    document.getElementById('trackStatus').textContent = report.status;
    document.getElementById('trackDate').textContent = new Date(report.timestamp).toLocaleDateString();
    if (report.status === 'Resolved') {
        icon.style.background = 'rgba(22, 163, 74, 0.2)';
        icon.style.color = 'var(--success)';
        icon.textContent = '✓';
        document.getElementById('trackTitle').textContent = 'Complaint Resolved';
    } else {
        icon.style.background = 'rgba(234, 88, 12, 0.2)';
        icon.style.color = 'var(--warning)';
        icon.textContent = '⏳';
        document.getElementById('trackTitle').textContent = 'Complaint Pending';
    }
    const imgContainer = document.getElementById('trackImageContainer');
    const img = document.getElementById('trackImage');
    if (report.image_url) {
        img.src = `${API_URL}/${report.image_url}`;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
    }
    result.classList.add('show');
}
document.getElementById('reportForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const file = document.getElementById('imageInput').files[0];
    if (!file) { showToast('Please capture an image', 'error'); return; }
    const colony = document.getElementById('colony').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    if (!latitude || !longitude) { showToast('Waiting for GPS location...', 'error'); return; }
    const formData = new FormData();
    formData.append('image', file);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('colony', colony);
    formData.append('mobile', mobile);
    try {
        const response = await fetch(`${API_URL}/report`, { method: 'POST', body: formData });
        const result = await response.json();
        document.getElementById('ackNumber').textContent = result.acknowledgement;
        document.getElementById('successMessage').style.display = 'block';
        document.getElementById('reportForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        showToast('Report submitted successfully!', 'success');
        loadHomeStats();
    } catch (error) {
        console.error(error);
        showToast('Submission failed. Please try again.', 'error');
    }
});
document.getElementById('imageInput').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
});
let latitude = null;
let longitude = null;
function getLocation() {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
        function(position) {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            document.getElementById('latitude').textContent = `Latitude: ${latitude.toFixed(6)}`;
            document.getElementById('longitude').textContent = `Longitude: ${longitude.toFixed(6)}`;
            showToast('Location detected!', 'success');
        },
        function() { showToast('Location access denied', 'error'); }
    );
}
getLocation();
document.addEventListener('change', async function(e) {
    if (e.target.classList.contains('status-select')) {
        const id = e.target.dataset.id;
        const status = e.target.value;
        try {
            await fetch(`${API_URL}/report/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            showToast('Status updated!', 'success');
            loadDashboardReports();
        } catch (error) {
            showToast('Error updating status', 'error');
        }
    }
});
async function deleteReport(id) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
        await fetch(`${API_URL}/report/${id}`, { method: 'DELETE' });
        showToast('Report deleted!', 'success');
        loadDashboardReports();
    } catch (error) {
        showToast('Error deleting report', 'error');
    }
}
async function upvoteReport(id) {
    try {
        await fetch(`${API_URL}/upvote/${id}`, { method: 'POST' });
        showToast('Support added!', 'success');
        loadUnresolvedReports();
    } catch (error) {
        showToast('Error adding support', 'error');
    }
}
function navigateToLocation(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username === 'admin' && password === 'admin') {
        showToast('Login successful!', 'success');
        showPage('dashboard');
        document.getElementById('loginForm').reset();
    } else {
        showToast('Invalid credentials', 'error');
    }
}
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    toast.className = `toast ${type}`;
    toastIcon.textContent = type === 'success' ? '✓' : '✕';
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
document.addEventListener('DOMContentLoaded', function() {
    loadHomeStats();
});
