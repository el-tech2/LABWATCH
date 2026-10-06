// =========================================
// LABWATCH - DASHBOARD
// =========================================

const client = window.supabaseClient;


// =========================================
// CHECK LOGIN
// =========================================

async function checkAuthentication() {

    const {
        data: {
            session
        }
    } = await client.auth.getSession();


    if (!session) {

        window.location.href =
            "index.html";

        return null;
    }


    return session;
}


// =========================================
// LOAD PROFILE
// =========================================

async function loadProfile(userId) {

    const {
        data,
        error
    } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;
    }


    if (data) {

        document.getElementById(
            "userName"
        ).textContent =
            data.full_name;


        document.getElementById(
            "userRole"
        ).textContent =
            data.role === "admin"
                ? "Administrator"
                : "Technician";


        // Avatar
        const initials =
            data.full_name
                .split(" ")
                .map(word => word.charAt(0))
                .join("")
                .substring(0, 2)
                .toUpperCase();


        document.querySelector(
            ".user-avatar"
        ).textContent = initials;
    }
}


// =========================================
// LOAD EQUIPMENT
// =========================================

async function loadEquipment() {

    const {
        data,
        error
    } = await client
        .from("equipment")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Equipment error:",
            error
        );

        return;
    }


    if (!data) {
        return;
    }


    updateStatistics(data);

    updateCondition(data);

    updateRecentEquipment(data);

    updateMaintenance(data);
}


// =========================================
// UPDATE STATISTICS
// =========================================

function updateStatistics(data) {

    const total =
        data.length;


    const good =
        data.filter(
            item =>
                item.condition === "Baik"
        ).length;


    const monitor =
        data.filter(
            item =>
                item.condition === "Cukup"
        ).length;


    const critical =
        data.filter(
            item =>
                item.condition === "Buruk"
        ).length;


    document.getElementById(
        "totalEquipment"
    ).textContent = total;


    document.getElementById(
        "goodEquipment"
    ).textContent = good;


    document.getElementById(
        "monitorEquipment"
    ).textContent = monitor;


    document.getElementById(
        "criticalEquipment"
    ).textContent = critical;
}


// =========================================
// CONDITION
// =========================================

function updateCondition(data) {

    const good =
        data.filter(
            item =>
                item.condition === "Baik"
        ).length;


    const fair =
        data.filter(
            item =>
                item.condition === "Cukup"
        ).length;


    const poor =
        data.filter(
            item =>
                item.condition === "Buruk"
        ).length;


    const damaged =
        data.filter(
            item =>
                item.condition === "Dalam_perbaikan"
        ).length;


    document.getElementById(
        "conditionGood"
    ).textContent = good;


    document.getElementById(
        "conditionFair"
    ).textContent = fair;


    document.getElementById(
        "conditionPoor"
    ).textContent = poor;


    document.getElementById(
        "conditionDamaged"
    ).textContent = damaged;
}


// =========================================
// RECENT EQUIPMENT
// =========================================

function updateRecentEquipment(data) {

    const container =
        document.getElementById(
            "recentEquipment"
        );


    const recent =
        data.slice(0, 5);


    if (recent.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                Belum ada equipment.
            </div>
        `;

        return;
    }


    container.innerHTML =
        recent.map(item => `

            <div class="recent-item">

                <div class="recent-item-info">

                    <strong>
                        ${escapeHtml(
                            item.name
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            item.code
                        )}
                        •
                        ${escapeHtml(
                            item.lab_location
                        )}
                    </span>

                </div>

                <span
                    class="condition-badge ${getConditionClass(item.condition)}"
                >
                    ${escapeHtml(
                        item.condition
                    )}
                </span>

            </div>

        `).join("");
}


// =========================================
// MAINTENANCE
// =========================================

function updateMaintenance(data) {

    const active =
        data.filter(
            item =>
                item.status === "Active"
        ).length;


    const maintenance =
        data.filter(
            item =>
                item.status === "Maintenance"
        ).length;


    const inactive =
        data.filter(
            item =>
                item.status === "Inactive"
        ).length;


    // Untuk sementara:
    // equipment yang maintenance terakhirnya
    // lebih dari 180 hari dianggap due.

    const today =
        new Date();


    const maintenanceDue =
        data.filter(item => {

            if (!item.last_maintenance_date) {
                return true;
            }


            const lastMaintenance =
                new Date(
                    item.last_maintenance_date
                );


            const difference =
                today -
                lastMaintenance;


            const days =
                difference /
                (1000 * 60 * 60 * 24);


            return days > 180;

        }).length;


    document.getElementById(
        "activeEquipment"
    ).textContent = active;


    document.getElementById(
        "inMaintenance"
    ).textContent = maintenance;


    document.getElementById(
        "inactiveEquipment"
    ).textContent = inactive;


    document.getElementById(
        "maintenanceDue"
    ).textContent = maintenanceDue;
}


// =========================================
// CONDITION CLASS
// =========================================

function getConditionClass(condition) {

    switch (condition) {

        case "Good":
            return "good";

        case "Fair":
            return "fair";

        case "Poor":
            return "poor";

        case "Damaged":
            return "damaged";

        default:
            return "";
    }
}


// =========================================
// SECURITY
// =========================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================
// LOGOUT
// =========================================

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Apakah kamu yakin ingin logout?"
                );


            if (!confirmed) {
                return;
            }


            await client.auth.signOut();


            window.location.href =
                "index.html";

        }
    );


// =========================================
// INITIALIZE
// =========================================

async function initializeDashboard() {

    const session =
        await checkAuthentication();


    if (!session) {
        return;
    }


    await loadProfile(
        session.user.id
    );


    await loadEquipment();
}


initializeDashboard();