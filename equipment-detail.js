// =========================================
// LABWATCH
// EQUIPMENT DETAIL + HEALTH SCORE
// =========================================

const client = window.supabaseClient;


// =========================================
// GLOBAL
// =========================================

let currentUser = null;

let currentProfile = null;

let equipment = null;


// =========================================
// INITIALIZE
// =========================================

async function initializeDetailPage() {

    try {

        // Check login

        const {
            data: {
                session
            }
        } = await client.auth.getSession();


        if (!session) {

            window.location.href =
                "index.html";

            return;
        }


        currentUser =
            session.user;


        // Load profile

        await loadProfile();


        // Get equipment ID

        const params =
            new URLSearchParams(
                window.location.search
            );


        const equipmentId =
            params.get("id");


        if (!equipmentId) {

            showDetailError(
                "ID equipment tidak ditemukan."
            );

            return;
        }


        // Load equipment

        await loadEquipmentDetail(
            equipmentId
        );


    } catch (error) {

        console.error(
            "Detail initialization error:",
            error
        );


        showDetailError(
            "Terjadi kesalahan saat memuat halaman."
        );

    }

}


// =========================================
// LOAD PROFILE
// =========================================

async function loadProfile() {

    const {
        data,
        error
    } = await client
        .from("profiles")
        .select("*")
        .eq(
            "id",
            currentUser.id
        )
        .single();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;
    }


    currentProfile =
        data;


    const fullName =
        data.full_name ||
        "User";


    document.getElementById(
        "userName"
    ).textContent =
        fullName;


    document.getElementById(
        "userRole"
    ).textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";


    const initials =
        fullName
            .split(" ")
            .map(
                word =>
                    word
                        .charAt(0)
                        .toUpperCase()
            )
            .join("")
            .substring(0, 2);


    document.getElementById(
        "userAvatar"
    ).textContent =
        initials;

}


// =========================================
// LOAD EQUIPMENT
// =========================================

async function loadEquipmentDetail(
    equipmentId
) {

    const {
        data,
        error
    } = await client
        .from("equipment")
        .select("*")
        .eq(
            "id",
            equipmentId
        )
        .single();


    if (error) {

        console.error(
            "Equipment detail error:",
            error
        );


        showDetailError(
            "Equipment tidak ditemukan."
        );


        return;
    }


    equipment =
        data;


    renderEquipmentDetail();

}


// =========================================
// RENDER DETAIL
// =========================================

function renderEquipmentDetail() {

    document.getElementById(
        "detailLoading"
    ).classList.add(
        "hidden"
    );


    document.getElementById(
        "detailContent"
    ).classList.remove(
        "hidden"
    );


    // Header

    document.getElementById(
        "detailCode"
    ).textContent =
        equipment.code || "-";


    document.getElementById(
        "detailName"
    ).textContent =
        equipment.name || "-";


    document.getElementById(
        "detailCategory"
    ).textContent =
        equipment.category || "-";


    document.getElementById(
        "detailStatus"
    ).innerHTML =
        `
        <span class="status-badge ${getStatusClass(
            equipment.status
        )}">
            ${formatStatus(
                equipment.status
            )}
        </span>
        `;


    // Information

    document.getElementById(
        "infoCode"
    ).textContent =
        equipment.code || "-";


    document.getElementById(
        "infoName"
    ).textContent =
        equipment.name || "-";


    document.getElementById(
        "infoCategory"
    ).textContent =
        equipment.category || "-";


    document.getElementById(
        "infoBrand"
    ).textContent =
        equipment.brand || "-";


    document.getElementById(
        "infoModel"
    ).textContent =
        equipment.model || "-";


    document.getElementById(
        "infoPurchaseYear"
    ).textContent =
        equipment.purchase_year || "-";


    document.getElementById(
        "infoLocation"
    ).textContent =
        equipment.lab_location || "-";


    document.getElementById(
        "infoCondition"
    ).innerHTML =
        `
        <span class="condition-badge ${getConditionClass(
            equipment.condition
        )}">
            ${formatCondition(
                equipment.condition
            )}
        </span>
        `;


    document.getElementById(
        "infoStatus"
    ).innerHTML =
        `
        <span class="status-badge ${getStatusClass(
            equipment.status
        )}">
            ${formatStatus(
                equipment.status
            )}
        </span>
        `;


    document.getElementById(
        "infoMaintenance"
    ).textContent =
        formatDate(
            equipment.last_maintenance_date
        );


    // Health score

    const health =
        calculateHealthScore(
            equipment
        );


    renderHealthScore(
        health
    );

}


// =========================================
// HEALTH SCORE
// =========================================

function calculateHealthScore(
    equipment
) {

    let score = 100;


    const breakdown = [];


    // =========================================
    // 1. CONDITION
    // =========================================

    let conditionPenalty = 0;


    if (
        equipment.condition ===
        "baik"
    ) {

        conditionPenalty = 0;

    }

    else if (
        equipment.condition ===
        "cukup"
    ) {

        conditionPenalty = 20;

    }

    else if (
        equipment.condition ===
        "buruk"
    ) {

        conditionPenalty = 40;

    }


    score -=
        conditionPenalty;


    breakdown.push({

        label:
            "Kondisi Equipment",

        value:
            conditionPenalty,

        description:
            equipment.condition === "baik"
                ? "Kondisi equipment baik."
                : equipment.condition === "cukup"
                    ? "Equipment dalam kondisi cukup."
                    : "Equipment berada dalam kondisi buruk."

    });


    // =========================================
    // 2. EQUIPMENT AGE
    // =========================================

    const currentYear =
        new Date()
            .getFullYear();


    let agePenalty = 0;

    let ageDescription =
        "Equipment masih relatif baru.";


    if (
        equipment.purchase_year
    ) {

        const age =
            currentYear -
            Number(
                equipment.purchase_year
            );


        if (age <= 2) {

            agePenalty = 0;

        }

        else if (age <= 5) {

            agePenalty = 10;

            ageDescription =
                "Equipment berusia 3–5 tahun.";

        }

        else if (age <= 8) {

            agePenalty = 20;

            ageDescription =
                "Equipment berusia 6–8 tahun.";

        }

        else {

            agePenalty = 30;

            ageDescription =
                "Equipment berusia lebih dari 8 tahun.";

        }

    }


    score -=
        agePenalty;


    breakdown.push({

        label:
            "Usia Equipment",

        value:
            agePenalty,

        description:
            ageDescription

    });


    // =========================================
    // 3. MAINTENANCE
    // =========================================

    let maintenancePenalty = 0;

    let maintenanceDescription =
        "Maintenance masih relatif baru.";


    if (
        equipment.last_maintenance_date
    ) {

        const lastMaintenance =
            new Date(
                equipment.last_maintenance_date
            );


        const today =
            new Date();


        const difference =
            today.getTime() -
            lastMaintenance.getTime();


        const days =
            Math.floor(
                difference /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );


        if (days <= 90) {

            maintenancePenalty = 0;

        }

        else if (days <= 180) {

            maintenancePenalty = 5;

            maintenanceDescription =
                "Maintenance terakhir 3–6 bulan lalu.";

        }

        else if (days <= 365) {

            maintenancePenalty = 10;

            maintenanceDescription =
                "Maintenance terakhir 6–12 bulan lalu.";

        }

        else {

            maintenancePenalty = 20;

            maintenanceDescription =
                "Equipment belum di-maintenance lebih dari 1 tahun.";

        }

    }

    else {

        maintenancePenalty = 20;

        maintenanceDescription =
            "Belum terdapat data maintenance.";

    }


    score -=
        maintenancePenalty;


    breakdown.push({

        label:
            "Maintenance",

        value:
            maintenancePenalty,

        description:
            maintenanceDescription

    });


    // =========================================
    // 4. STATUS
    // =========================================

    let statusPenalty = 0;

    let statusDescription =
        "Equipment aktif.";


    if (
        equipment.status ===
        "aktif"
    ) {

        statusPenalty = 0;

    }

    else if (
        equipment.status ===
        "dalam_perbaikan"
    ) {

        statusPenalty = 15;

        statusDescription =
            "Equipment sedang dalam perbaikan.";

    }

    else if (
        equipment.status ===
        "nonaktif"
    ) {

        statusPenalty = 20;

        statusDescription =
            "Equipment berstatus nonaktif.";

    }


    score -=
        statusPenalty;


    breakdown.push({

        label:
            "Status Equipment",

        value:
            statusPenalty,

        description:
            statusDescription

    });


    // =========================================
    // NORMALIZE
    // =========================================

    score =
        Math.max(
            0,
            Math.min(
                100,
                score
            )
        );


    // =========================================
    // RISK
    // =========================================

    const risk =
        calculateRiskLevel(
            score
        );


    // =========================================
    // RECOMMENDATION
    // =========================================

    const recommendation =
        generateRecommendation(
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


// =========================================
// RISK LEVEL
// =========================================

function calculateRiskLevel(
    score
) {

    if (
        score >= 80
    ) {

        return {

            level:
                "GOOD",

            title:
                "Kondisi Baik",

            description:
                "Equipment berada dalam kondisi yang baik dan dapat digunakan secara normal.",

            className:
                "good"

        };

    }


    if (
        score >= 60
    ) {

        return {

            level:
                "MONITOR",

            title:
                "Perlu Dipantau",

            description:
                "Equipment masih dapat digunakan, tetapi perlu dilakukan pemantauan berkala.",

            className:
                "monitor"

        };

    }


    if (
        score >= 40
    ) {

        return {

            level:
                "WARNING",

            title:
                "Perlu Perhatian",

            description:
                "Equipment memiliki beberapa faktor risiko dan disarankan untuk segera diperiksa.",

            className:
                "warning"

        };

    }


    return {

        level:
            "CRITICAL",

        title:
            "Kondisi Kritis",

        description:
            "Equipment memiliki risiko tinggi dan memerlukan tindakan maintenance segera.",

        className:
            "critical"

    };

}


// =========================================
// RECOMMENDATION
// =========================================

function generateRecommendation(
    score,
    equipment
) {

    if (
        score >= 80
    ) {

        return "Equipment dapat digunakan secara normal. Lakukan pemeriksaan rutin sesuai jadwal maintenance.";

    }


    if (
        score >= 60
    ) {

        return "Lakukan monitoring kondisi equipment dan jadwalkan pemeriksaan berkala untuk mencegah penurunan kondisi.";

    }


    if (
        score >= 40
    ) {

        if (
            equipment.status ===
            "dalam_perbaikan"
        ) {

            return "Prioritaskan proses perbaikan dan lakukan pemeriksaan ulang sebelum equipment digunakan kembali.";

        }


        return "Disarankan melakukan pemeriksaan dan maintenance dalam waktu dekat.";

    }


    return "Segera lakukan pemeriksaan menyeluruh dan maintenance. Pertimbangkan menghentikan penggunaan equipment sampai kondisi dinyatakan aman.";

}


// =========================================
// RENDER HEALTH
// =========================================

function renderHealthScore(
    health
) {

    document.getElementById(
        "healthScore"
    ).textContent =
        health.score;


    // Risk

    const riskBadge =
        document.getElementById(
            "riskBadge"
        );


    riskBadge.textContent =
        health.risk.level;


    riskBadge.className =
        `risk-badge ${health.risk.className}`;


    document.getElementById(
        "riskTitle"
    ).textContent =
        health.risk.title;


    document.getElementById(
        "riskDescription"
    ).textContent =
        health.risk.description;


    // Recommendation

    document.getElementById(
        "recommendationText"
    ).textContent =
        health.recommendation;


    // Breakdown

    renderScoreBreakdown(
        health.breakdown
    );

}


// =========================================
// SCORE BREAKDOWN
// =========================================

function renderScoreBreakdown(
    breakdown
) {

    const container =
        document.getElementById(
            "scoreBreakdown"
        );


    container.innerHTML =
        breakdown
            .map(
                item => `

                <div class="score-item">

                    <div class="score-item-top">

                        <strong>
                            ${item.label}
                        </strong>

                        <span>
                            -${item.value} poin
                        </span>

                    </div>


                    <p>
                        ${item.description}
                    </p>

                </div>

            `
            )
            .join("");

}


// =========================================
// FORMATTERS
// =========================================

function formatCondition(
    condition
) {

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


function getConditionClass(
    condition
) {

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


function formatStatus(
    status
) {

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


function getStatusClass(
    status
) {

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


function formatDate(
    date
) {

    if (!date) {
        return "Belum ada data";
    }


    const parsed =
        new Date(date);


    return parsed.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

}


// =========================================
// ERROR
// =========================================

function showDetailError(
    message
) {

    document.getElementById(
        "detailLoading"
    ).innerHTML = `

        <div class="detail-error">

            <strong>
                Equipment tidak dapat dimuat
            </strong>

            <p>
                ${message}
            </p>

            <a href="equipment.html">
                ← Kembali ke Equipment
            </a>

        </div>

    `;

}


// =========================================
// LOGOUT
// =========================================

document
    .getElementById(
        "logoutButton"
    )
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
// START
// =========================================

initializeDetailPage();