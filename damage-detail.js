
const client = window.supabaseClient;

const params = new URLSearchParams(window.location.search);
const damageId = params.get("id");

async function initializeDamageDetail() {

    const loading = document.getElementById("detailLoading");
    const content = document.getElementById("detailContent");
    const errorBox = document.getElementById("detailError");

    try {

        const { data: { session } } = await client.auth.getSession();

        if (!session) {
            window.location.href = "index.html";
            return;
        }

        await loadUserInfo(session.user.id);

        if (!damageId) {
            throw new Error("ID laporan tidak ditemukan.");
        }

        const { data, error } = await client
            .from("damage_records")
            .select(`
                *,
                equipment (
                    id,
                    code,
                    name
                )
            `)
            .eq("id", damageId)
            .single();

        if (error) throw error;

        let technician = null;

        if (data.assigned_to) {

            const { data: profile, error: profileError } = await client
                .from("profiles")
                .select("full_name, role")
                .eq("id", data.assigned_to)
                .maybeSingle();

            if (profileError) throw profileError;

            technician = profile;
        }

        renderDamageDetail(data, technician);

        loading.classList.add("hidden");
        content.classList.remove("hidden");

    } catch (error) {

        console.error("Damage detail error:", error);

        loading.classList.add("hidden");
        errorBox.textContent =
            error.message || "Gagal memuat detail laporan.";

        errorBox.classList.remove("hidden");
    }
}

async function loadUserInfo(userId) {

    const { data, error } = await client
        .from("profiles")
        .select("full_name, role")
        .eq("id", userId)
        .single();

    if (error) throw error;

    document.getElementById("userName").textContent =
        data.full_name || "User";

    document.getElementById("userRole").textContent =
        data.role === "admin" ? "Administrator" : "Technician";

    document.getElementById("userAvatar").textContent =
        getInitials(data.full_name);
}

function renderDamageDetail(item, technician) {

    document.getElementById("detailDamageType").textContent =
        item.damage_type || "-";

    document.getElementById("detailEquipment").textContent =
        `${item.equipment?.code || "-"} - ${item.equipment?.name || "-"}`;

    document.getElementById("detailDate").textContent =
        formatDate(item.damage_date);

    document.getElementById("detailEquipmentName").textContent =
        item.equipment?.name || "-";

    document.getElementById("detailEquipmentCode").textContent =
        item.equipment?.code || "-";

    document.getElementById("detailSeverity").textContent =
        formatSeverity(item.severity);

    document.getElementById("detailStatusText").textContent =
        formatStatus(item.status);

    document.getElementById("detailStatus").textContent =
        formatStatus(item.status);

    document.getElementById("detailAssignedAt").textContent =
        formatDateTime(item.assigned_at);

    document.getElementById("detailDescription").textContent =
        item.description || "-";

    document.getElementById("detailAction").textContent =
        item.action_taken || "Belum ada tindakan penanganan.";

    document.getElementById("detailTechnician").textContent =
        technician?.full_name || "Belum ditugaskan";

    document.getElementById("detailTechnicianRole").textContent =
        technician ? "Technician" : "Laporan belum diambil";

    document.getElementById("technicianAvatar").textContent =
        technician ? getInitials(technician.full_name) : "?";
}

function formatDate(value) {

    if (!value) return "-";

    return new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatDateTime(value) {

    if (!value) return "-";

    return new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatSeverity(value) {

    const values = {
        ringan: "Ringan",
        sedang: "Sedang",
        berat: "Berat"
    };

    return values[value] || "-";
}

function formatStatus(value) {

    const values = {
        dilaporkan: "Dilaporkan",
        diproses: "Diproses",
        selesai: "Selesai"
    };

    return values[value] || value || "-";
}

function getInitials(name) {

    return (name || "User")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);
}

document
    .getElementById("logoutButton")
    .addEventListener("click", async () => {

        const confirmed = confirm("Apakah kamu yakin ingin logout?");

        if (!confirmed) return;

        await client.auth.signOut();

        window.location.href = "index.html";
    });

initializeDamageDetail();
