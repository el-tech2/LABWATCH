
// ==================================================
// LABWATCH
// EQUIPMENT DETAIL
// HEALTH SCORE + MAINTENANCE HISTORY
// ==================================================

const client = window.supabaseClient;

// ==================================================
// GLOBAL VARIABLES
// ==================================================

let currentUser = null;
let currentProfile = null;
let equipment = null;
let maintenanceHistory = [];

// ==================================================
// INITIALIZE PAGE
// ==================================================

async function initializeDetailPage() {
    try {
        // Check login session
        const {
            data: { session },
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
            window.location.href = "index.html";
            return;
        }

        currentUser = session.user;

        // Load user profile
        await loadProfile();

        if (!currentProfile) {
            showDetailError("Profile pengguna tidak ditemukan.");
            return;
        }

        // Get equipment ID from URL
        const params = new URLSearchParams(
            window.location.search
        );

        const equipmentId = params.get("id");

        if (!equipmentId) {
            showDetailError("ID equipment tidak ditemukan.");
            return;
        }

        // Load equipment information
        await loadEquipmentDetail(equipmentId);

        if (!equipment) return;

        // Load maintenance history
        await loadMaintenanceHistory(equipmentId);

        // Display maintenance history
        renderMaintenanceHistory();

    } catch (error) {
        console.error("Detail initialization error:", error);

        showDetailError(
            "Terjadi kesalahan saat memuat halaman."
        );
    }
}

// ==================================================
// LOAD USER PROFILE
// ==================================================

async function loadProfile() {
    const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Profile error:", error);
        throw error;
    }

    currentProfile = data;

    const fullName = data.full_name || "User";

    document.getElementById("userName").textContent =
        fullName;

    document.getElementById("userRole").textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";

    const initials = fullName
        .split(" ")
        .map(word => word.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);

    document.getElementById("userAvatar").textContent =
        initials;
}

// ==================================================
// LOAD EQUIPMENT
// ==================================================

async function loadEquipmentDetail(equipmentId) {
    const { data, error } = await client
        .from("equipment")
        .select("*")
        .eq("id", equipmentId)
        .single();

    if (error) {
        console.error("Equipment detail error:", error);

        showDetailError("Equipment tidak ditemukan.");

        return;
    }

    equipment = data;

    renderEquipmentDetail();
}

// ==================================================
// LOAD MAINTENANCE HISTORY
// ==================================================

async function loadMaintenanceHistory(equipmentId) {
    const { data, error } = await client
        .from("maintenance_records")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("maintenance_date", {
            ascending: false
        });

    if (error) {
        console.error("Maintenance history error:", error);

        maintenanceHistory = [];

        renderMaintenanceHistoryError(
            "Riwayat maintenance gagal dimuat. Periksa izin akses database."
        );

        return;
    }

    const records = data || [];

    // Collect technician IDs
    const technicianIds = [
        ...new Set(
            records
                .map(item => item.technician_id)
                .filter(Boolean)
        )
    ];

    let technicianMap = {};

    // Load technician names from profiles
    if (technicianIds.length > 0) {
        const {
            data: technicians,
            error: technicianError
        } = await client
            .from("profiles")
            .select("id, full_name")
            .in("id", technicianIds);

        if (technicianError) {
            console.error(
                "Technician history error:",
                technicianError
            );
        } else {
            technicianMap = Object.fromEntries(
                (technicians || []).map(item => [
                    item.id,
                    item.full_name
                ])
            );
        }
    }

    // Combine maintenance records with technician names
    maintenanceHistory = records.map(item => ({
        ...item,
        technician_name:
            technicianMap[item.technician_id] ||
            "Tidak diketahui"
    }));

    // Sort newest maintenance first
    maintenanceHistory.sort((a, b) => {
        const dateA = new Date(
            a.started_at || a.maintenance_date
        ).getTime();

        const dateB = new Date(
            b.started_at || b.maintenance_date
        ).getTime();

        return dateB - dateA;
    });
}

// ==================================================
// RENDER EQUIPMENT DETAIL
// ==================================================

function renderEquipmentDetail() {
    document.getElementById("detailLoading")
        .classList.add("hidden");

    document.getElementById("detailContent")
        .classList.remove("hidden");

    // Equipment header
    document.getElementById("detailCode").textContent =
        equipment.code || "-";

    document.getElementById("detailName").textContent =
        equipment.name || "-";

    document.getElementById("detailCategory").textContent =
        equipment.category || "-";

    document.getElementById("detailStatus").innerHTML = `
        <span class="status-badge ${getStatusClass(equipment.status)}">
            ${formatStatus(equipment.status)}
        </span>
    `;

    // Equipment information
    document.getElementById("infoCode").textContent =
        equipment.code || "-";

    document.getElementById("infoName").textContent =
        equipment.name || "-";

    document.getElementById("infoCategory").textContent =
        equipment.category || "-";

    document.getElementById("infoBrand").textContent =
        equipment.brand || "-";

    document.getElementById("infoModel").textContent =
        equipment.model || "-";

    document.getElementById("infoPurchaseYear").textContent =
        equipment.purchase_year || "-";

    document.getElementById("infoLocation").textContent =
        equipment.lab_location || "-";

    document.getElementById("infoCondition").innerHTML = `
        <span class="condition-badge ${getConditionClass(equipment.condition)}">
            ${formatCondition(equipment.condition)}
        </span>
    `;

    document.getElementById("infoStatus").innerHTML = `
        <span class="status-badge ${getStatusClass(equipment.status)}">
            ${formatStatus(equipment.status)}
        </span>
    `;

    document.getElementById("infoMaintenance").textContent =
        formatDate(equipment.last_maintenance_date);

    // Calculate Health Score
    const health = calculateHealthScore(equipment);

    renderHealthScore(health);
}

// ==================================================
// RENDER MAINTENANCE HISTORY
// ==================================================

function renderMaintenanceHistory() {
    const body = document.getElementById(
        "maintenanceHistoryBody"
    );

    const totalCount = maintenanceHistory.length;

    // Count only records with valid start and finish times
    const completedRecords = maintenanceHistory.filter(item => {
        return (
            item.started_at &&
            item.completed_at &&
            getDurationSeconds(
                item.started_at,
                item.completed_at
            ) !== null
        );
    });

    // Calculate total service duration
    const totalDurationSeconds = completedRecords.reduce(
        (total, item) => {
            return total + getDurationSeconds(
                item.started_at,
                item.completed_at
            );
        },
        0
    );

    // Summary: total services
    document.getElementById("totalServiceCount")
        .textContent = totalCount;

    // Summary: total duration
    document.getElementById("totalServiceDuration")
        .textContent = formatDuration(totalDurationSeconds);

    // Summary: number of records
    document.getElementById("maintenanceHistoryCount")
        .textContent = `${totalCount} records`;

    
    // Summary: latest maintenance date
    // Gunakan tanggal dari riwayat maintenance jika tersedia.
    // Jika belum ada riwayat, gunakan tanggal lama dari equipment.

    
const latestRecord = maintenanceHistory[0];

    const lastMaintenanceDate = latestRecord
        ? latestRecord.maintenance_date
        : equipment.last_maintenance_date;

    document.getElementById("lastServiceDate").textContent =
        lastMaintenanceDate
            ? formatDate(lastMaintenanceDate)
            : "Belum ada";



    // Empty history
    if (totalCount === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="8" class="history-empty">
                    <strong>Belum ada riwayat maintenance</strong>
                    <span>
                        Riwayat servis equipment akan muncul di sini.
                    </span>
                </td>
            </tr>
        `;

        return;
    }

    // Display history
    body.innerHTML = maintenanceHistory.map(
        (item, index) => `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${formatDate(item.maintenance_date)}
                </td>

                <td>
                    ${escapeHtml(
                        formatMaintenanceType(item.maintenance_type)
                    )}
                </td>

                <td>
                    ${escapeHtml(item.technician_name)}
                </td>

                <td>
                    ${formatDateTime(item.started_at)}
                </td>

                <td>
                    ${formatDateTime(item.completed_at)}
                </td>

                <td>
                    ${escapeHtml(getDurationText(item))}
                </td>

                <td>
                    ${escapeHtml(item.result || "-")}
                </td>
            </tr>
        `
    ).join("");
}

// ==================================================
// MAINTENANCE HISTORY ERROR
// ==================================================

function renderMaintenanceHistoryError(message) {
    const body = document.getElementById(
        "maintenanceHistoryBody"
    );

    body.innerHTML = `
        <tr>
            <td colspan="8" class="history-empty">
                <strong>Riwayat tidak dapat dimuat</strong>
                <span>${escapeHtml(message)}</span>
            </td>
        </tr>
    `;

    document.getElementById("totalServiceCount")
        .textContent = "-";

    document.getElementById("totalServiceDuration")
        .textContent = "-";

    document.getElementById("lastServiceDate")
        .textContent = "-";

    document.getElementById("maintenanceHistoryCount")
        .textContent = "Gagal dimuat";
}

// ==================================================
// CALCULATE SERVICE DURATION
// ==================================================

function getDurationSeconds(start, end) {
    if (!start || !end) {
        return null;
    }

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (
        Number.isNaN(startTime) ||
        Number.isNaN(endTime) ||
        endTime < startTime
    ) {
        return null;
    }

    return Math.floor(
        (endTime - startTime) / 1000
    );
}

// ==================================================
// GET DURATION TEXT
// ==================================================

function getDurationText(item) {
    if (!item.started_at) {
        return "Belum tercatat";
    }

    if (!item.completed_at) {
        return "Sedang berlangsung";
    }

    const seconds = getDurationSeconds(
        item.started_at,
        item.completed_at
    );

    if (seconds === null) {
        return "Data waktu tidak valid";
    }

    return formatDuration(seconds);
}

// ==================================================
// FORMAT DURATION
// ==================================================

function formatDuration(totalSeconds) {
    if (
        totalSeconds === null ||
        totalSeconds === undefined ||
        totalSeconds < 0
    ) {
        return "Belum tercatat";
    }

    let remaining = Math.floor(totalSeconds);

    const days = Math.floor(remaining / 86400);
    remaining %= 86400;

    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

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

// ==================================================
// FORMAT MAINTENANCE TYPE
// ==================================================

function formatMaintenanceType(type) {
    switch (type) {
        case "rutin":
            return "Rutin";

        case "perbaikan":
            return "Perbaikan";

        case "penggantian_komponen":
            return "Penggantian Komponen";

        case "pembersihan":
            return "Pembersihan";

        default:
            return type || "-";
    }
}

// ==================================================
// FORMAT DATE
// ==================================================

function formatDate(value) {
    if (!value) {
        return "Belum ada data";
    }

    // Date-only values are parsed locally to avoid
    // timezone shifting the displayed calendar date.
    const parts = String(value).split("-");

    if (parts.length !== 3) {
        return "-";
    }

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// ==================================================
// FORMAT DATE AND TIME
// ==================================================

function formatDateTime(value) {
    if (!value) {
        return "Belum tercatat";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

// ==================================================
// HEALTH SCORE CALCULATION
// ==================================================

function calculateHealthScore(equipment) {
    let score = 100;

    const breakdown = [];

    // ----------------------------------------------
    // 1. CONDITION
    // ----------------------------------------------

    let conditionPenalty = 0;

    if (equipment.condition === "baik") {
        conditionPenalty = 0;
    } else if (equipment.condition === "cukup") {
        conditionPenalty = 20;
    } else if (equipment.condition === "buruk") {
        conditionPenalty = 40;
    }

    score -= conditionPenalty;

    breakdown.push({
        label: "Kondisi Equipment",
        value: conditionPenalty,
        description:
            equipment.condition === "baik"
                ? "Kondisi equipment baik."
                : equipment.condition === "cukup"
                    ? "Equipment dalam kondisi cukup."
                    : "Equipment berada dalam kondisi buruk."
    });

    // ----------------------------------------------
    // 2. EQUIPMENT AGE
    // ----------------------------------------------

    const currentYear = new Date().getFullYear();

    let agePenalty = 0;

    let ageDescription =
        "Equipment masih relatif baru.";

    if (equipment.purchase_year) {
        const age =
            currentYear - Number(equipment.purchase_year);

        if (age <= 2) {
            agePenalty = 0;
        } else if (age <= 5) {
            agePenalty = 10;
            ageDescription =
                "Equipment berusia 3–5 tahun.";
        } else if (age <= 8) {
            agePenalty = 20;
            ageDescription =
                "Equipment berusia 6–8 tahun.";
        } else {
            agePenalty = 30;
            ageDescription =
                "Equipment berusia lebih dari 8 tahun.";
        }
    }

    score -= agePenalty;

    breakdown.push({
        label: "Usia Equipment",
        value: agePenalty,
        description: ageDescription
    });

    // ----------------------------------------------
    // 3. MAINTENANCE
    // ----------------------------------------------

    let maintenancePenalty = 0;

    let maintenanceDescription =
        "Maintenance masih relatif baru.";

    if (equipment.last_maintenance_date) {
        const lastMaintenance = new Date(
            equipment.last_maintenance_date + "T00:00:00"
        );

        const today = new Date();

        const difference =
            today.getTime() - lastMaintenance.getTime();

        const days = Math.floor(
            difference / (1000 * 60 * 60 * 24)
        );

        if (days <= 90) {
            maintenancePenalty = 0;
        } else if (days <= 180) {
            maintenancePenalty = 5;
            maintenanceDescription =
                "Maintenance terakhir 3–6 bulan lalu.";
        } else if (days <= 365) {
            maintenancePenalty = 10;
            maintenanceDescription =
                "Maintenance terakhir 6–12 bulan lalu.";
        } else {
            maintenancePenalty = 20;
            maintenanceDescription =
                "Equipment belum di-maintenance lebih dari 1 tahun.";
        }
    } else {
        maintenancePenalty = 20;
        maintenanceDescription =
            "Belum terdapat data maintenance.";
    }

    score -= maintenancePenalty;

    breakdown.push({
        label: "Maintenance",
        value: maintenancePenalty,
        description: maintenanceDescription
    });

    // ----------------------------------------------
    // 4. STATUS
    // ----------------------------------------------

    let statusPenalty = 0;

    let statusDescription = "Equipment aktif.";

    if (equipment.status === "aktif") {
        statusPenalty = 0;
    } else if (equipment.status === "dalam_perbaikan") {
        statusPenalty = 15;
        statusDescription =
            "Equipment sedang dalam perbaikan.";
    } else if (equipment.status === "nonaktif") {
        statusPenalty = 20;
        statusDescription =
            "Equipment berstatus nonaktif.";
    }

    score -= statusPenalty;

    breakdown.push({
        label: "Status Equipment",
        value: statusPenalty,
        description: statusDescription
    });

    // ----------------------------------------------
    // NORMALIZE SCORE
    // ----------------------------------------------

    score = Math.max(
        0,
        Math.min(100, score)
    );

    // ----------------------------------------------
    // RISK LEVEL
    // ----------------------------------------------

    const risk = calculateRiskLevel(score);

    // ----------------------------------------------
    // RECOMMENDATION
    // ----------------------------------------------

    const recommendation = generateRecommendation(
        score,
        equipment
    );

    return {
        score,
        risk,
        recommendation,
        breakdown
    };
}

// ==================================================
// CALCULATE RISK LEVEL
// ==================================================

function calculateRiskLevel(score) {
    if (score >= 80) {
        return {
            level: "GOOD",
            title: "Kondisi Baik",
            description:
                "Equipment berada dalam kondisi yang baik dan dapat digunakan secara normal.",
            className: "good"
        };
    }

    if (score >= 60) {
        return {
            level: "MONITOR",
            title: "Perlu Dipantau",
            description:
                "Equipment masih dapat digunakan, tetapi perlu dilakukan pemantauan berkala.",
            className: "monitor"
        };
    }

    if (score >= 40) {
        return {
            level: "WARNING",
            title: "Perlu Perhatian",
            description:
                "Equipment memiliki beberapa faktor risiko dan disarankan untuk segera diperiksa.",
            className: "warning"
        };
    }

    return {
        level: "CRITICAL",
        title: "Kondisi Kritis",
        description:
            "Equipment memiliki risiko tinggi dan memerlukan tindakan maintenance segera.",
        className: "critical"
    };
}

// ==================================================
// GENERATE RECOMMENDATION
// ==================================================

function generateRecommendation(score, equipment) {
    if (score >= 80) {
        return "Equipment dapat digunakan secara normal. Lakukan pemeriksaan rutin sesuai jadwal maintenance.";
    }

    if (score >= 60) {
        return "Lakukan monitoring kondisi equipment dan jadwalkan pemeriksaan berkala untuk mencegah penurunan kondisi.";
    }

    if (score >= 40) {
        if (equipment.status === "dalam_perbaikan") {
            return "Prioritaskan proses perbaikan dan lakukan pemeriksaan ulang sebelum equipment digunakan kembali.";
        }

        return "Disarankan melakukan pemeriksaan dan maintenance dalam waktu dekat.";
    }

    return "Segera lakukan pemeriksaan menyeluruh dan maintenance. Pertimbangkan menghentikan penggunaan equipment sampai kondisi dinyatakan aman.";
}

// ==================================================
// RENDER HEALTH SCORE
// ==================================================

function renderHealthScore(health) {
    document.getElementById("healthScore").textContent =
        health.score;

    const riskBadge = document.getElementById("riskBadge");

    riskBadge.textContent = health.risk.level;

    riskBadge.className =
        `risk-badge ${health.risk.className}`;

    document.getElementById("riskTitle").textContent =
        health.risk.title;

    document.getElementById("riskDescription").textContent =
        health.risk.description;

    document.getElementById("recommendationText").textContent =
        health.recommendation;

    renderScoreBreakdown(health.breakdown);
}

// ==================================================
// RENDER SCORE BREAKDOWN
// ==================================================

function renderScoreBreakdown(breakdown) {
    const container = document.getElementById(
        "scoreBreakdown"
    );

    container.innerHTML = breakdown.map(item => `
        <div class="score-item">

            <div class="score-item-top">

                <strong>
                    ${escapeHtml(item.label)}
                </strong>

                <span>
                    -${item.value} poin
                </span>

            </div>

            <p>
                ${escapeHtml(item.description)}
            </p>

        </div>
    `).join("");
}

// ==================================================
// FORMAT CONDITION
// ==================================================

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

// ==================================================
// CONDITION CSS CLASS
// ==================================================

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

// ==================================================
// FORMAT STATUS
// ==================================================

function formatStatus(status) {
    switch (status) {
        case "aktif":
            return "Aktif";

        case "dalam_perbaikan":
            return "Dalam Perbaikan";

        case "nonaktif":
            return "Nonaktif";

        default:
            return status || "-";
    }
}

// ==================================================
// STATUS CSS CLASS
// ==================================================

function getStatusClass(status) {
    switch (status) {
        case "aktif":
            return "active";

        case "dalam_perbaikan":
            return "maintenance";

        case "nonaktif":
            return "inactive";

        default:
            return "";
    }
}

// ==================================================
// ESCAPE HTML
// ==================================================

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

// ==================================================
// SHOW DETAIL ERROR
// ==================================================

function showDetailError(message) {
    document.getElementById("detailLoading").innerHTML = `
        <div class="detail-error">

            <strong>
                Equipment tidak dapat dimuat
            </strong>

            <p>
                ${escapeHtml(message)}
            </p>

            <a href="equipment.html">
                ← Kembali ke Equipment
            </a>

        </div>
    `;
}

// ==================================================
// LOGOUT
// ==================================================

document
    .getElementById("logoutButton")
    .addEventListener("click", async function() {

        const confirmed = confirm(
            "Apakah kamu yakin ingin logout?"
        );

        if (!confirmed) {
            return;
        }

        await client.auth.signOut();

        window.location.href = "index.html";
    });

// ==================================================
// START APPLICATION
// ==================================================

initializeDetailPage();
