
// =========================================
// LABWATCH - DASHBOARD
// =========================================

const client = window.supabaseClient;


// =========================================
// CHECK LOGIN
// =========================================

async function checkAuthentication() {

    const {
        data: { session },
        error
    } = await client.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        return null;
    }

    if (!session) {
        window.location.href = "index.html";
        return null;
    }

    return session;
}


// =========================================
// LOAD PROFILE
// =========================================

async function loadProfile(userId) {

    const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Profile error:", error);
        return;
    }

    if (!data) return;

    document.getElementById("userName").textContent =
        data.full_name;

    document.getElementById("userRole").textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";

    const initials = data.full_name
        .split(" ")
        .map(word => word.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();

    document.querySelector(".user-avatar").textContent =
        initials;
}


// =========================================
// LOAD EQUIPMENT
// =========================================

async function loadEquipment() {

    const { data, error } = await client
        .from("equipment")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("Equipment error:", error);
        return;
    }

    const equipment = data || [];

    updateStatistics(equipment);
    updateCondition(equipment);
    updateRecentEquipment(equipment);
    updateMaintenance(equipment);
}


// =========================================
// UPDATE STATISTICS
// =========================================

function updateStatistics(data) {

    const total = data.length;

    const good = data.filter(
        item => item.condition === "baik"
    ).length;

    const monitor = data.filter(
        item => item.condition === "cukup"
    ).length;

    const critical = data.filter(
        item => item.condition === "buruk"
    ).length;

    document.getElementById("totalEquipment").textContent =
        total;

    document.getElementById("goodEquipment").textContent =
        good;

    document.getElementById("monitorEquipment").textContent =
        monitor;

    document.getElementById("criticalEquipment").textContent =
        critical;
}


// =========================================
// UPDATE CONDITION
// =========================================

function updateCondition(data) {

    const good = data.filter(
        item => item.condition === "baik"
    ).length;

    const fair = data.filter(
        item => item.condition === "cukup"
    ).length;

    const poor = data.filter(
        item => item.condition === "buruk"
    ).length;

    const damaged = data.filter(
        item => item.status === "dalam_perbaikan"
    ).length;

    document.getElementById("conditionGood").textContent =
        good;

    document.getElementById("conditionFair").textContent =
        fair;

    document.getElementById("conditionPoor").textContent =
        poor;

    document.getElementById("conditionDamaged").textContent =
        damaged;
}


// =========================================
// RECENT EQUIPMENT
// =========================================

function updateRecentEquipment(data) {

    const container = document.getElementById(
        "recentEquipment"
    );

    const recent = data.slice(0, 5);

    if (recent.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                Belum ada equipment.
            </div>
        `;

        return;
    }

    container.innerHTML = recent.map(item => `

        <div class="recent-item">

            <div class="recent-item-info">

                <strong>
                    ${escapeHtml(item.name)}
                </strong>

                <span>
                    ${escapeHtml(item.code)}
                    •
                    ${escapeHtml(item.lab_location)}
                </span>

            </div>

            <span class="condition-badge ${getConditionClass(item.condition)}">
                ${formatCondition(item.condition)}
            </span>

        </div>

    `).join("");
}


// =========================================
// UPDATE MAINTENANCE
// =========================================

function updateMaintenance(data) {

    const active = data.filter(
        item => item.status === "aktif"
    ).length;

    const maintenance = data.filter(
        item => item.status === "dalam_perbaikan"
    ).length;

    const inactive = data.filter(
        item => item.status === "nonaktif"
    ).length;

    const today = new Date();

    const maintenanceDue = data.filter(item => {

        if (!item.last_maintenance_date) {
            return true;
        }

        const lastMaintenance = new Date(
            item.last_maintenance_date + "T00:00:00"
        );

        const difference =
            today - lastMaintenance;

        const days =
            difference / (1000 * 60 * 60 * 24);

        return days > 180;

    }).length;

    document.getElementById("activeEquipment").textContent =
        active;

    document.getElementById("inMaintenance").textContent =
        maintenance;

    document.getElementById("inactiveEquipment").textContent =
        inactive;

    document.getElementById("maintenanceDue").textContent =
        maintenanceDue;
}


// =========================================
// DASHBOARD STAT CARD CLICK
// =========================================

function setupDashboardCards() {

    const cardConfigurations = [
        {
            id: "totalEquipment",
            filter: "",
            title: "Total Equipment"
        },
        {
            id: "goodEquipment",
            filter: "baik",
            title: "Good Condition"
        },
        {
            id: "monitorEquipment",
            filter: "cukup",
            title: "Need Monitoring"
        },
        {
            id: "criticalEquipment",
            filter: "buruk",
            title: "Critical"
        }
    ];

    cardConfigurations.forEach(config => {

        const valueElement = document.getElementById(
            config.id
        );

        if (!valueElement) return;

        const card = valueElement.closest(".stat-card");

        if (!card) return;

        card.style.cursor = "pointer";
        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");

        card.title = `Lihat daftar ${config.title}`;

        const openEquipment = () => {

            const url = config.filter
                ? `equipment.html?condition=${encodeURIComponent(config.filter)}`
                : "equipment.html";

            window.location.href = url;

        };

        card.addEventListener("click", openEquipment);

        card.addEventListener("keydown", event => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();
                openEquipment();

            }

        });

    });

}


// =========================================
// CONDITION CLASS
// =========================================

function getConditionClass(condition) {

    switch (condition) {

        case "baik":
            return "good";

        case "cukup":
            return "fair";

        case "buruk":
            return "poor";

        default:
            return "";

    }
}


// =========================================
// FORMAT CONDITION
// =========================================

function formatCondition(condition) {

    switch (condition) {

        case "baik":
            return "Baik";

        case "cukup":
            return "Cukup";

        case "buruk":
            return "Buruk";

        default:
            return condition || "-";

    }
}


// =========================================
// SECURITY
// =========================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
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
    .addEventListener("click", async function () {

        const confirmed = confirm(
            "Apakah kamu yakin ingin logout?"
        );

        if (!confirmed) return;

        await client.auth.signOut();

        window.location.href = "index.html";

    });


// =========================================
// INITIALIZE
// =========================================

async function initializeDashboard() {

    const session = await checkAuthentication();

    if (!session) return;

    await loadProfile(session.user.id);

    await loadEquipment();

    setupDashboardCards();

}

initializeDashboard();
