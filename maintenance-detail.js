
// =========================================
// LABWATCH - MAINTENANCE DETAIL
// =========================================

const client = window.supabaseClient;

const params = new URLSearchParams(window.location.search);
const maintenanceId = params.get("id");


// =========================================
// INITIALIZE
// =========================================

async function initializeMaintenanceDetail() {

    const loading =
        document.getElementById("detailLoading");

    const content =
        document.getElementById("detailContent");

    const errorBox =
        document.getElementById("detailError");

    try {

        const {
            data: {
                session
            }
        } = await client.auth.getSession();

        if (!session) {

            window.location.href = "index.html";
            return;

        }

        await loadUserInfo(session.user.id);

        if (!maintenanceId) {

            throw new Error(
                "ID maintenance tidak ditemukan."
            );

        }

        const {
            data,
            error
        } = await client
            .from("maintenance_records")
            .select(`
                *,
                equipment:equipment_id (
                    id,
                    code,
                    name
                ),
                technician:technician_id (
                    id,
                    full_name
                )
            `)
            .eq("id", maintenanceId)
            .single();

        if (error) {
            throw error;
        }

        renderMaintenanceDetail(data);

        loading.classList.add("hidden");
        content.classList.remove("hidden");

    }

    catch (error) {

        console.error(
            "Maintenance detail error:",
            error
        );

        loading.classList.add("hidden");

        errorBox.textContent =
            error.message ||
            "Gagal memuat detail maintenance.";

        errorBox.classList.remove("hidden");

    }

}


// =========================================
// USER PROFILE
// =========================================

async function loadUserInfo(userId) {

    const {
        data,
        error
    } = await client
        .from("profiles")
        .select("full_name, role")
        .eq("id", userId)
        .single();

    if (error) {
        throw error;
    }

    document.getElementById("userName").textContent =
        data.full_name || "User";

    document.getElementById("userRole").textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";

    document.getElementById("userAvatar").textContent =
        getInitials(data.full_name);

}


// =========================================
// RENDER DETAIL
// =========================================

function renderMaintenanceDetail(item) {

    const equipmentCode =
        item.equipment?.code || "-";

    const equipmentName =
        item.equipment?.name || "-";

    const technicianName =
        item.technician?.full_name || "-";

    const duration =
        getDurationText(item);

    const condition =
        getEquipmentConditionText(item.equipment_usable);


    document.getElementById("detailEquipmentCode").textContent =
        equipmentCode;

    document.getElementById("detailEquipmentName").textContent =
        equipmentName;

    document.getElementById("detailDate").textContent =
        formatDate(item.maintenance_date);

    document.getElementById("detailType").textContent =
        formatMaintenanceType(item.maintenance_type);

    document.getElementById("detailEquipment").textContent =
        `${equipmentCode} - ${equipmentName}`;

    document.getElementById("detailTechnician").textContent =
        technicianName;

    document.getElementById("detailStartedAt").textContent =
        formatDateTime(item.started_at);

    document.getElementById("detailCompletedAt").textContent =
        formatDateTime(item.completed_at);

    document.getElementById("detailDuration").textContent =
        duration;

    document.getElementById("detailDurationBadge").textContent =
        duration;

    document.getElementById("detailNextDate").textContent =
        formatDate(item.next_maintenance_date);

    document.getElementById("detailDescription").textContent =
        item.description || "Tidak ada deskripsi.";

    document.getElementById("detailResult").textContent =
        item.result || "Belum ada hasil maintenance.";

    document.getElementById("detailCondition").textContent =
        condition;

}


// =========================================
// FORMAT MAINTENANCE TYPE
// =========================================

function formatMaintenanceType(type) {

    const types = {

        rutin: "Rutin",

        perbaikan: "Perbaikan",

        penggantian_komponen: "Penggantian Komponen",

        pembersihan: "Pembersihan"

    };

    return types[type] || type || "-";

}


// =========================================
// FORMAT DATE
// =========================================

function formatDate(date) {

    if (!date) {
        return "-";
    }

    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

}


// =========================================
// FORMAT DATE TIME
// =========================================

function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString(
        "id-ID",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


// =========================================
// DURATION
// =========================================

function getDurationText(item) {

    if (!item.started_at) {
        return "Belum tercatat";
    }

    if (!item.completed_at) {
        return "Sedang berlangsung";
    }

    const start =
        new Date(item.started_at).getTime();

    const end =
        new Date(item.completed_at).getTime();

    if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        end < start
    ) {
        return "Data waktu tidak valid";
    }

    let remaining =
        Math.floor((end - start) / 1000);

    const days =
        Math.floor(remaining / 86400);

    remaining %= 86400;

    const hours =
        Math.floor(remaining / 3600);

    remaining %= 3600;

    const minutes =
        Math.floor(remaining / 60);

    const seconds =
        remaining % 60;

    const parts = [];

    if (days > 0) {
        parts.push(`${days} hari`);
    }

    if (hours > 0) {
        parts.push(`${hours} jam`);
    }

    if (minutes > 0) {
        parts.push(`${minutes} menit`);
    }

    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds} detik`);
    }

    return parts.join(" ");

}


// =========================================
// EQUIPMENT CONDITION
// =========================================

function getEquipmentConditionText(value) {

    if (value === true) {
        return "Bisa digunakan kembali";
    }

    if (value === false) {
        return "Tidak bisa digunakan";
    }

    return "Belum ditentukan";

}


// =========================================
// INITIALS
// =========================================

function getInitials(name) {

    return (name || "User")
        .split(" ")
        .map(word =>
            word.charAt(0).toUpperCase()
        )
        .join("")
        .substring(0, 2);

}


// =========================================
// LOGOUT
// =========================================

document
    .getElementById("logoutButton")
    .addEventListener("click", async () => {

        const confirmed = confirm(
            "Apakah kamu yakin ingin logout?"
        );

        if (!confirmed) {
            return;
        }

        await client.auth.signOut();

        window.location.href = "index.html";

    });


// =========================================
// START
// =========================================

initializeMaintenanceDetail();
