
// =========================================
// LABWATCH - MAINTENANCE MANAGEMENT
// =========================================

const client = window.supabaseClient;

// =========================================
// GLOBAL VARIABLES
// =========================================

let allMaintenance = [];
let allEquipment = [];
let allTechnicians = [];

let currentUser = null;
let currentProfile = null;
let editingMaintenanceId = null;

// =========================================
// DOM ELEMENTS
// =========================================

const maintenanceTableBody =
    document.getElementById("maintenanceTableBody");

const maintenanceCount =
    document.getElementById("maintenanceCount");

const searchInput =
    document.getElementById("searchInput");

const maintenanceTypeFilter =
    document.getElementById("maintenanceTypeFilter");

const resetFilterButton =
    document.getElementById("resetFilterButton");

const addMaintenanceButton =
    document.getElementById("addMaintenanceButton");

const maintenanceModal =
    document.getElementById("maintenanceModal");

const maintenanceForm =
    document.getElementById("maintenanceForm");

const modalTitle =
    document.getElementById("modalTitle");

const closeModalButton =
    document.getElementById("closeModalButton");

const cancelModalButton =
    document.getElementById("cancelModalButton");

const saveMaintenanceButton =
    document.getElementById("saveMaintenanceButton");

const pageMessage =
    document.getElementById("pageMessage");

const startedAtInput =
    document.getElementById("startedAt");

const completedAtInput =
    document.getElementById("completedAt");

const equipmentUsableInput =
    document.getElementById("equipmentUsable");

const durationPreview =
    document.getElementById("durationPreview");

// =========================================
// INITIALIZE
// =========================================

async function initializeMaintenancePage() {
    try {
        const {
            data: { session },
            error
        } = await client.auth.getSession();

        if (error) throw error;

        if (!session) {
            window.location.href = "index.html";
            return;
        }

        currentUser = session.user;

        await loadCurrentProfile();

        if (!currentProfile) {
            showMessage(
                "Profile pengguna tidak ditemukan.",
                "error"
            );
            return;
        }

        await loadEquipment();
        await loadTechnicians();
        await loadMaintenance();

        applyRolePermissions();
        renderOverview();
        applyFilters();

    } catch (error) {
        console.error(
            "Maintenance initialization error:",
            error
        );

        showMessage(
            getDatabaseErrorMessage(error),
            "error"
        );
    }
}

// =========================================
// LOAD PROFILE
// =========================================

async function loadCurrentProfile() {
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

    document.getElementById("userName").textContent =
        data.full_name || "User";

    document.getElementById("userRole").textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";

    const initials = (data.full_name || "U")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);

    document.getElementById("userAvatar").textContent =
        initials;
}

// =========================================
// LOAD EQUIPMENT
// =========================================

async function loadEquipment() {
    const { data, error } = await client
        .from("equipment")
        .select("id, code, name")
        .order("code", { ascending: true });

    if (error) {
        console.error("Equipment error:", error);
        throw error;
    }

    allEquipment = data || [];

    populateEquipmentSelect();
}

// =========================================
// EQUIPMENT SELECT
// =========================================

function populateEquipmentSelect() {
    const select = document.getElementById("equipmentId");

    select.innerHTML = `
        <option value="">Pilih Equipment</option>
    `;

    allEquipment.forEach(item => {
        const option = document.createElement("option");

        option.value = item.id;
        option.textContent = `${item.code} - ${item.name}`;

        select.appendChild(option);
    });
}

// =========================================
// LOAD TECHNICIANS
// =========================================

async function loadTechnicians() {
    const { data, error } = await client
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "technician")
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Technician error:", error);
        throw error;
    }

    allTechnicians = data || [];

    // Pastikan teknisi yang sedang login
    // tetap tersedia dalam pilihan.
    if (currentProfile?.role === "technician") {
        const exists = allTechnicians.some(
            technician => technician.id === currentUser.id
        );

        if (!exists) {
            allTechnicians.push({
                id: currentUser.id,
                full_name: currentProfile.full_name,
                role: "technician"
            });
        }
    }

    populateTechnicianSelect();
}

// =========================================
// TECHNICIAN SELECT
// =========================================

function populateTechnicianSelect() {
    const select = document.getElementById("technicianId");

    select.innerHTML = `
        <option value="">Pilih Technician</option>
    `;

    allTechnicians.forEach(technician => {
        const option = document.createElement("option");

        option.value = technician.id;
        option.textContent = technician.full_name;

        select.appendChild(option);
    });

    if (currentProfile?.role === "technician") {
        select.value = currentUser.id;
        select.disabled = true;
    } else {
        select.disabled = false;
    }
}

// =========================================
// LOAD MAINTENANCE
// =========================================

async function loadMaintenance() {
    const { data, error } = await client
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
        .order("maintenance_date", {
            ascending: false
        });

    if (error) {
        console.error("Maintenance error:", error);
        throw error;
    }

    allMaintenance = data || [];

    renderOverview();
}

// =========================================
// RENDER OVERVIEW
// =========================================

function renderOverview() {
    const total = allMaintenance.length;

    const now = new Date();

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthly = allMaintenance.filter(item => {
        if (!item.maintenance_date) return false;

        const parts = item.maintenance_date.split("-");

        return (
            Number(parts[1]) - 1 === currentMonth &&
            Number(parts[0]) === currentYear
        );
    }).length;

    const today = getTodayDate();

    const upcoming = allMaintenance.filter(item => {
        return (
            item.next_maintenance_date &&
            item.next_maintenance_date >= today
        );
    }).length;

    const overdue = allMaintenance.filter(item => {
        return (
            item.next_maintenance_date &&
            item.next_maintenance_date < today
        );
    }).length;

    document.getElementById("totalMaintenance").textContent =
        total;

    document.getElementById("monthlyMaintenance").textContent =
        monthly;

    document.getElementById("upcomingMaintenance").textContent =
        upcoming;

    document.getElementById("overdueMaintenance").textContent =
        overdue;
}


// =========================================
// FILTER
// =========================================

function applyFilters() {
    const search = searchInput.value
        .trim()
        .toLowerCase();

    const type = maintenanceTypeFilter.value;

    const filtered = allMaintenance.filter(item => {
        const searchableText = [
            item.equipment?.code,
            item.equipment?.name,
            item.technician?.full_name,
            item.maintenance_type,
            item.description,
            item.result
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search || searchableText.includes(search);

        const matchesType =
            !type || item.maintenance_type === type;

        return matchesSearch && matchesType;
    });

    renderMaintenance(filtered);
}

// =========================================
// RENDER TABLE
// =========================================

function renderMaintenance(maintenanceList) {
    maintenanceCount.textContent =
        `${maintenanceList.length} records`;

    if (maintenanceList.length === 0) {
        maintenanceTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    <div>
                        <strong>Belum ada maintenance record</strong>
                        <span>
                            Tambahkan histori maintenance equipment.
                        </span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    maintenanceTableBody.innerHTML = maintenanceList
        .map((item, index) => {
            const equipmentCode =
                item.equipment?.code || "-";

            const equipmentName =
                item.equipment?.name || "-";

            const technicianName =
                item.technician?.full_name || "-";

            const duration = getDurationText(item);

            const canEdit =
    currentProfile?.role === "admin" ||
    (
        currentProfile?.role === "technician" &&
        item.technician_id === currentUser.id
    );

const canDelete =
    currentProfile?.role === "admin";

            const equipmentCondition =
                getEquipmentConditionText(item.equipment_usable);

            return `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        ${formatDate(item.maintenance_date)}
                    </td>

                    <td>
                        <div class="equipment-name">
                            <strong>
                                ${escapeHtml(equipmentCode)}
                            </strong>
                            <span>
                                ${escapeHtml(equipmentName)}
                            </span>
                        </div>
                    </td>

                    <td>
                        ${formatMaintenanceType(
                            item.maintenance_type
                        )}
                    </td>

                    <td>
                        ${escapeHtml(technicianName)}
                    </td>

                    <td>
                        ${escapeHtml(duration)}
                    </td>

                    <td>
                        <div>
                            ${escapeHtml(item.result || "-")}
                            <small style="display:block; margin-top:4px;">
                                ${escapeHtml(equipmentCondition)}
                            </small>
                        </div>
                    </td>

                    <td>
                        ${formatDate(
                            item.next_maintenance_date
                        )}
                    </td>

                    <td>
                        <div class="table-actions">

    <button
        type="button"
        class="action-button view"
        onclick="viewMaintenance('${item.id}')"
        title="Lihat"
    >
        👁
    </button>

    ${
        canEdit
            ? `
                <button
                    type="button"
                    class="action-button edit"
                    onclick="editMaintenance('${item.id}')"
                    title="Edit"
                >
                    ✎
                </button>
            `
            : ""
    }

    ${
        canDelete
            ? `
                <button
                    type="button"
                    class="action-button delete"
                    onclick="deleteMaintenance('${item.id}')"
                    title="Hapus"
                >
                    🗑
                </button>
            `
            : ""
    }

</div>
                    </td>
                </tr>
            `;
        })
        .join("");
}

// =========================================
// EQUIPMENT CONDITION TEXT
// =========================================

function getEquipmentConditionText(value) {
    if (value === true) {
        return "Kondisi: Bisa digunakan kembali";
    }

    if (value === false) {
        return "Kondisi: Tidak bisa digunakan";
    }

    return "Kondisi setelah servis: Belum ditentukan";
}

// =========================================
// FORMAT MAINTENANCE TYPE
// =========================================

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

// =========================================
// FORMAT DATE
// =========================================

function formatDate(date) {
    if (!date) return "-";

    const parts = date.split("-");

    if (parts.length !== 3) return "-";

    const value = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return value.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// =========================================
// FORMAT DATE AND TIME
// =========================================

function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

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

// =========================================
// CONVERT DATABASE TIME TO INPUT
// =========================================

function toDateTimeLocal(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const pad = number =>
        String(number).padStart(2, "0");

    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}:` +
        `${pad(date.getSeconds())}`
    );
}

// =========================================
// CONVERT INPUT TO DATABASE TIME
// =========================================

function toDatabaseDateTime(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Format tanggal dan waktu tidak valid.");
    }

    return date.toISOString();
}

// =========================================
// CALCULATE DURATION
// =========================================

function calculateDuration(start, end) {
    if (!start || !end) return null;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (
        Number.isNaN(startTime) ||
        Number.isNaN(endTime) ||
        endTime < startTime
    ) {
        return null;
    }

    let totalSeconds = Math.floor(
        (endTime - startTime) / 1000
    );

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);

    parts.push(`${seconds} detik`);

    return parts.join(" ");
}

// =========================================
// DURATION TEXT
// =========================================

function getDurationText(item) {
    if (!item.started_at) {
        return "Belum tercatat";
    }

    if (!item.completed_at) {
        return "Sedang berlangsung";
    }

    return (
        calculateDuration(
            item.started_at,
            item.completed_at
        ) || "Tidak valid"
    );
}

// =========================================
// UPDATE DURATION PREVIEW
// =========================================

function updateDurationPreview() {
    const startedAt = startedAtInput.value;
    const completedAt = completedAtInput.value;

    if (!startedAt) {
        durationPreview.textContent =
            "Isi waktu mulai terlebih dahulu.";
        return;
    }

    if (!completedAt) {
        durationPreview.textContent =
            "Servis masih berlangsung. Isi waktu selesai jika sudah selesai.";
        return;
    }

    const duration = calculateDuration(
        startedAt,
        completedAt
    );

    if (!duration) {
        durationPreview.textContent =
            "Waktu selesai tidak boleh lebih awal dari waktu mulai.";
        return;
    }

    durationPreview.textContent =
        `Total durasi servis: ${duration}`;
}


// =========================================
// OPEN ADD MODAL
// =========================================

function openAddModal() {
    if (
        currentProfile?.role !== "admin" &&
        currentProfile?.role !== "technician"
    ) {
        showMessage(
            "Kamu tidak memiliki izin.",
            "error"
        );
        return;
    }

    editingMaintenanceId = null;

    modalTitle.textContent = "Tambah Maintenance";

    maintenanceForm.reset();

    const now = new Date();

    const localNow = toDateTimeLocal(now.toISOString());

    document.getElementById("maintenanceDate").value =
        getTodayDate();

    startedAtInput.value = localNow;
    completedAtInput.value = "";

    equipmentUsableInput.value = "";

    startedAtInput.required = true;
    equipmentUsableInput.required = false;

    document.getElementById("equipmentId").disabled = false;
    document.getElementById("maintenanceType").disabled = false;

    document.getElementById("technicianId").disabled =
        currentProfile?.role === "technician";

    if (currentProfile?.role === "technician") {
        document.getElementById("technicianId").value =
            currentUser.id;
    }

    updateDurationPreview();

    saveMaintenanceButton.textContent =
        "Simpan Maintenance";

    maintenanceModal.classList.remove("hidden");
}

// =========================================
// EDIT MAINTENANCE
// =========================================


function editMaintenance(maintenanceId) {
    const item = allMaintenance.find(
        record => String(record.id) === String(maintenanceId)
    );

    if (!item) {
        showMessage(
            "Data maintenance tidak ditemukan.",
            "error"
        );
        return;
    }

    // Admin boleh mengedit semua riwayat.
    // Teknisi hanya boleh mengedit riwayat miliknya.
    const isAdmin =
        currentProfile?.role === "admin";

    const isOwner =
        currentProfile?.role === "technician" &&
        item.technician_id === currentUser.id;

    if (!isAdmin && !isOwner) {
        showMessage(
            "Kamu hanya dapat mengedit maintenance milik sendiri.",
            "error"
        );
        return;
    }

    editingMaintenanceId = item.id;

    modalTitle.textContent = "Edit Maintenance";

    document.getElementById("equipmentId").value =
        item.equipment_id || "";

    document.getElementById("maintenanceDate").value =
        item.maintenance_date || "";

    document.getElementById("maintenanceType").value =
        item.maintenance_type || "";

    document.getElementById("technicianId").value =
        isAdmin
            ? (item.technician_id || "")
            : currentUser.id;

    document.getElementById("description").value =
        item.description || "";

    document.getElementById("result").value =
        item.result || "";

    document.getElementById("nextMaintenanceDate").value =
        item.next_maintenance_date || "";

    startedAtInput.value =
        toDateTimeLocal(item.started_at);

    completedAtInput.value =
        toDateTimeLocal(item.completed_at);

    // Pertahankan data lama yang belum memiliki waktu mulai.
    startedAtInput.required = !item.started_at;

    // Kondisi alat setelah maintenance.
    equipmentUsableInput.value =
        item.equipment_usable === true
            ? "true"
            : item.equipment_usable === false
                ? "false"
                : "";

    equipmentUsableInput.required =
        Boolean(item.completed_at);

    // Teknisi tidak boleh mengganti identitasnya.
    document.getElementById("technicianId").disabled =
        !isAdmin;

    document.getElementById("equipmentId").disabled = false;
    document.getElementById("maintenanceType").disabled = false;

    updateDurationPreview();

    saveMaintenanceButton.textContent =
        "Simpan Perubahan";

    maintenanceModal.classList.remove("hidden");
}

window.editMaintenance = editMaintenance;


// =========================================
// VIEW MAINTENANCE
// =========================================

function viewMaintenance(maintenanceId) {
    const item = allMaintenance.find(
        record => String(record.id) === String(maintenanceId)
    );

    if (!item) return;

    const equipment =
        item.equipment?.code || "Equipment";

    const equipmentName =
        item.equipment?.name || "-";

    const technician =
        item.technician?.full_name || "-";

    const duration = getDurationText(item);

    const equipmentCondition =
        getEquipmentConditionText(item.equipment_usable);

    alert(
        `MAINTENANCE RECORD\n\n` +
        `Equipment: ${equipment}\n` +
        `Nama Barang: ${equipmentName}\n` +
        `Tanggal Maintenance: ${formatDate(item.maintenance_date)}\n` +
        `Jenis: ${formatMaintenanceType(item.maintenance_type)}\n` +
        `Teknisi: ${technician}\n\n` +

        `Waktu Mulai: ${formatDateTime(item.started_at)}\n` +
        `Waktu Selesai: ${formatDateTime(item.completed_at)}\n` +
        `Durasi: ${duration}\n\n` +

        `Deskripsi:\n${item.description || "-"}\n\n` +
        `Hasil:\n${item.result || "-"}\n` +
        `Kondisi Alat: ${equipmentCondition}\n\n` +

        `Maintenance Berikutnya: ${formatDate(item.next_maintenance_date)}`
    );
}

window.viewMaintenance = viewMaintenance;

// =========================================
// SAVE MAINTENANCE
// =========================================

async function saveMaintenance(event) {
    event.preventDefault();

    if (editingMaintenanceId) {
    const editingItem = allMaintenance.find(
        item =>
            String(item.id) ===
            String(editingMaintenanceId)
    );

    const isAdmin =
        currentProfile?.role === "admin";

    const isOwner =
        currentProfile?.role === "technician" &&
        editingItem?.technician_id === currentUser.id;

    if (!isAdmin && !isOwner) {
        showMessage(
            "Kamu tidak memiliki izin mengedit maintenance ini.",
            "error"
        );
        return;
    }
}

    if (
        currentProfile?.role !== "admin" &&
        currentProfile?.role !== "technician"
    ) {
        showMessage(
            "Kamu tidak memiliki izin.",
            "error"
        );
        return;
    }

    const equipmentId =
        document.getElementById("equipmentId").value;

    const maintenanceDate =
        document.getElementById("maintenanceDate").value;

    const maintenanceType =
        document.getElementById("maintenanceType").value;

    const technicianId =
        document.getElementById("technicianId").value;

    const description =
        document.getElementById("description").value.trim();

    const result =
        document.getElementById("result").value.trim();

    const nextMaintenanceDate =
        document.getElementById("nextMaintenanceDate").value;

    const startedAtValue = startedAtInput.value;
    const completedAtValue = completedAtInput.value;

    const equipmentUsableValue =
        equipmentUsableInput.value;

    // Validasi field wajib.
    if (
        !equipmentId ||
        !maintenanceDate ||
        !maintenanceType ||
        !technicianId
    ) {
        showMessage(
            "Field bertanda * wajib diisi.",
            "error"
        );
        return;
    }

    // Catatan baru wajib memiliki waktu mulai.
    if (!editingMaintenanceId && !startedAtValue) {
        showMessage(
            "Waktu mulai servis wajib diisi.",
            "error"
        );
        return;
    }

    // Waktu selesai harus memiliki waktu mulai.
    if (completedAtValue && !startedAtValue) {
        showMessage(
            "Waktu mulai harus diisi sebelum waktu selesai.",
            "error"
        );
        return;
    }

    // Jika servis selesai, kondisi alat wajib ditentukan.
    if (completedAtValue && !equipmentUsableValue) {
        showMessage(
            "Pilih kondisi alat setelah maintenance selesai.",
            "error"
        );
        return;
    }

    // Jika servis belum selesai, kondisi harus kosong.
    if (!completedAtValue && equipmentUsableValue) {
        showMessage(
            "Kosongkan kondisi alat jika servis masih berlangsung.",
            "error"
        );
        return;
    }

    let startedAt = null;
    let completedAt = null;

    try {
        startedAt = toDatabaseDateTime(startedAtValue);
        completedAt = toDatabaseDateTime(completedAtValue);

    } catch (error) {
        showMessage(error.message, "error");
        return;
    }

    // Validasi urutan waktu.
    if (
        startedAt &&
        completedAt &&
        new Date(completedAt) < new Date(startedAt)
    ) {
        showMessage(
            "Waktu selesai tidak boleh lebih awal dari waktu mulai.",
            "error"
        );
        return;
    }

    // Teknisi hanya dapat mencatat dirinya sendiri.
    const selectedTechnicianId =
        currentProfile.role === "technician"
            ? currentUser.id
            : technicianId;

    const maintenanceData = {
        equipment_id: equipmentId,
        maintenance_date: maintenanceDate,
        maintenance_type: maintenanceType,
        technician_id: selectedTechnicianId,
        started_at: startedAt,
        completed_at: completedAt,

        // Simpan hasil kondisi alat.
        equipment_usable: completedAt
            ? equipmentUsableValue === "true"
            : null,

        description: description || null,
        result: result || null,

        next_maintenance_date:
            nextMaintenanceDate || null
    };

    setSaveLoading(true);

    try {
        if (editingMaintenanceId) {
            const { error } = await client
                .from("maintenance_records")
                .update(maintenanceData)
                .eq("id", editingMaintenanceId);

            if (error) throw error;

            showMessage(
                "Maintenance berhasil diperbarui.",
                "success"
            );

        } else {
            const { error } = await client
                .from("maintenance_records")
                .insert(maintenanceData);

            if (error) throw error;

            showMessage(
                "Maintenance berhasil ditambahkan.",
                "success"
            );
        }

        // Perbarui tanggal maintenance terakhir.
        

        closeModal();

        await loadMaintenance();

        applyFilters();

    } catch (error) {
        console.error(
            "Save maintenance error:",
            error
        );

        showMessage(
            getDatabaseErrorMessage(error),
            "error"
        );

    } finally {
        setSaveLoading(false);
    }
}


// =========================================
// DELETE MAINTENANCE
// =========================================

async function deleteMaintenance(maintenanceId) {
    if (currentProfile?.role !== "admin") {
        showMessage(
            "Hanya Admin yang dapat menghapus maintenance.",
            "error"
        );
        return;
    }

    const confirmed = confirm(
        "Apakah kamu yakin ingin menghapus maintenance record ini?"
    );

    if (!confirmed) return;

    try {
        const { error } = await client
            .from("maintenance_records")
            .delete()
            .eq("id", maintenanceId);

        if (error) throw error;

        showMessage(
            "Maintenance berhasil dihapus.",
            "success"
        );

        await loadMaintenance();

        applyFilters();

    } catch (error) {
        console.error(
            "Delete maintenance error:",
            error
        );

        showMessage(
            getDatabaseErrorMessage(error),
            "error"
        );
    }
}

window.deleteMaintenance = deleteMaintenance;

// =========================================
// CLOSE MODAL
// =========================================

function closeModal() {
    maintenanceModal.classList.add("hidden");

    maintenanceForm.reset();

    editingMaintenanceId = null;

    startedAtInput.required = true;
    equipmentUsableInput.required = false;

    document.getElementById("technicianId").disabled =
        currentProfile?.role === "technician";

    document.getElementById("equipmentId").disabled = false;
    document.getElementById("maintenanceType").disabled = false;

    durationPreview.textContent =
        "Durasi akan dihitung otomatis setelah waktu selesai diisi.";

    modalTitle.textContent = "Tambah Maintenance";

    saveMaintenanceButton.textContent =
        "Simpan Maintenance";
}

closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);

maintenanceModal.addEventListener("click", event => {
    if (event.target === maintenanceModal) {
        closeModal();
    }
});

// =========================================
// FILTER EVENTS
// =========================================

searchInput.addEventListener("input", applyFilters);

maintenanceTypeFilter.addEventListener(
    "change",
    applyFilters
);

resetFilterButton.addEventListener("click", () => {
    searchInput.value = "";
    maintenanceTypeFilter.value = "";

    applyFilters();
});

// =========================================
// DURATION PREVIEW EVENTS
// =========================================

startedAtInput.addEventListener(
    "input",
    updateDurationPreview
);

completedAtInput.addEventListener(
    "input",
    () => {
        equipmentUsableInput.required =
            Boolean(completedAtInput.value);

        if (!completedAtInput.value) {
            equipmentUsableInput.value = "";
        }

        updateDurationPreview();
    }
);

// =========================================
// ADD BUTTON
// =========================================

addMaintenanceButton.addEventListener(
    "click",
    openAddModal
);

// =========================================
// FORM SUBMIT
// =========================================

maintenanceForm.addEventListener(
    "submit",
    saveMaintenance
);

// =========================================
// LOGOUT
// =========================================

document
    .getElementById("logoutButton")
    .addEventListener("click", async () => {
        const confirmed = confirm(
            "Apakah kamu yakin ingin logout?"
        );

        if (!confirmed) return;

        await client.auth.signOut();

        window.location.href = "index.html";
    });

// =========================================
// ROLE PERMISSIONS
// =========================================

function applyRolePermissions() {
    // Admin dan Technician boleh menambah maintenance.
    addMaintenanceButton.style.display = "inline-flex";
}

// =========================================
// LOADING
// =========================================

function setSaveLoading(loading) {
    saveMaintenanceButton.disabled = loading;

    saveMaintenanceButton.textContent = loading
        ? "Menyimpan..."
        : editingMaintenanceId
            ? "Simpan Perubahan"
            : "Simpan Maintenance";
}

// =========================================
// TODAY DATE
// =========================================

function getTodayDate() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// =========================================
// MESSAGE
// =========================================

function showMessage(message, type) {
    pageMessage.textContent = message;

    pageMessage.className =
        `page-message ${type}`;

    setTimeout(() => {
        pageMessage.classList.add("hidden");
    }, 4000);
}

// =========================================
// DATABASE ERROR
// =========================================

function getDatabaseErrorMessage(error) {
    if (error?.code === "42501") {
        return "Kamu tidak memiliki izin untuk melakukan tindakan ini.";
    }

    if (error?.code === "23503") {
        return "Data yang dipilih tidak memiliki relasi yang valid.";
    }

    if (error?.code === "23514") {
        return "Waktu selesai tidak boleh lebih awal dari waktu mulai atau kondisi alat belum sesuai.";
    }

    if (error?.message) {
        return error.message;
    }

    return "Terjadi kesalahan pada database.";
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
// START
// =========================================

initializeMaintenancePage();
