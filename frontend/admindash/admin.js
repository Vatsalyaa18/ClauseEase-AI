const API = "http://127.0.0.1:5000";

const currentUser = JSON.parse(localStorage.getItem("clauseEaseUser"));

async function loadAdmin() {

const res = await fetch(`${API}/api/admin/dashboard`,{
headers:{
"X-User-Email": currentUser.email
}
});

const data = await res.json();

document.getElementById("totalUsers").textContent = data.total_users;
document.getElementById("totalReports").textContent = data.total_reports;


// -------- ADMINISTRATORS --------

const adminDiv = document.getElementById("adminList");
adminDiv.innerHTML = "";

data.admins.forEach(a => {

const row = document.createElement("tr");

row.innerHTML = `
<td>${a.id}</td>
<td>${a.name}</td>
<td>${a.email}</td>
`;

adminDiv.appendChild(row);

});


// -------- USERS --------

const userDiv = document.getElementById("userList");
userDiv.innerHTML = "";

data.users.forEach(u => {

const row = document.createElement("tr");

row.innerHTML = `
<td>${u.id}</td>
<td>${u.name}</td>
<td>${u.email}</td>
`;

userDiv.appendChild(row);

});


// -------- REPORTS --------

const reportsDiv = document.getElementById("adminReports");
reportsDiv.innerHTML = "";

data.reports.forEach(r => {

const row = document.createElement("tr");

row.innerHTML = `
<td>${r.id}</td>
<td>${r.filename}</td>
<td>${new Date(r.created_at).toLocaleString()}</td>
`;

reportsDiv.appendChild(row);

});

}

loadAdmin();