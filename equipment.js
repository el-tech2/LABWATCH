
// =========================================
// LABWATCH - EQUIPMENT MANAGEMENT
// =========================================

const client = window.supabaseClient;

// GLOBAL VARIABLES
let allEquipment = [];
let currentUser = null;
let currentProfile = null;
let editingEquipmentId = null;

// DOM ELEMENTS
const equipmentTableBody = document.getElementById("equipmentTableBody");
const equipmentCount = document.getElementById("equipmentCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const conditionFilter = document.getElementById("conditionFilter");
const statusFilter = document.getElementById("statusFilter");
const resetFilterButton = document.getElementById("resetFilterButton");
const addEquipmentButton = document.getElementById("addEquipmentButton");
const equipmentModal = document.getElementById("equipmentModal");
const equipmentForm = document.getElementById("equipmentForm");
const modalTitle = document.getElementById("modalTitle");
const closeModalButton = document.getElementById("closeModalButton");
const cancelModalButton = document.getElementById("cancelModalButton");
const saveEquipmentButton = document.getElementById("saveEquipmentButton");
const pageMessage = document.getElementById("pageMessage");

// =========================================
// INITIALIZE
// =========================================

async function initializeEquipmentPage() {
    try {
        const {
            data: { session }
        } = await client.auth.getSession();

        if (!session) {
            window.location.href = "index.html";
            return;
        }

        currentUser = session.user;

        await loadCurrentProfile();
        await loadEquipment();

        populateCategoryFilter();
        applyRolePermissions();

    } catch (error) {
        console.error("Initialization error:", error);
        showMessage("Gagal memuat halaman equipment.", "error");
    }
}

// =========================================
// LOAD CURRENT PROFILE
// =========================================

async function loadCurrentProfile() {
    const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Profile error:", error);
        showMessage("Data profile tidak ditemukan.", "error");
        return;
    }

    currentProfile = data;

    document.getElementById("userName").textContent =
        data.full_name;

    document.getElementById("userRole").textContent =
        data.role === "admin" ? "Administrator" : "Technician";

    const initials = data.full_name
        .split(" ")
        .map(word => word.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);

    document.getElementById("userAvatar").textContent = initials;
}

// =========================================
// ROLE PERMISSION
// =========================================

function applyRolePermissions() {
    if (!currentProfile) return;

    const isAdmin = currentProfile.role === "admin";

    if (!isAdmin) {
        addEquipmentButton.style.display = "none";
    }

    console.log("Current role:", currentProfile.role);
}

// =========================================
// LOAD EQUIPMENT
// =========================================

async function loadEquipment() {
    equipmentTableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-loading">
                Loading equipment...
            </td>
        </tr>
    `;

    const { data, error } = await client
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load equipment error:", error);

        equipmentTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-loading error-text">
                    Gagal mengambil data equipment.
                </td>
            </tr>
        `;

        return;
    }

    allEquipment = data || [];
    renderEquipment(allEquipment);
}

// =========================================
// RENDER EQUIPMENT
// =========================================

function renderEquipment(equipmentList) {
    equipmentCount.textContent =
        `${equipmentList.length} equipment`;

    if (equipmentList.length === 0) {
        equipmentTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    <div>
                        <strong>Tidak ada equipment</strong>
                        <span>Belum ada data yang sesuai dengan filter.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const isAdmin = currentProfile?.role === "admin";

    equipmentTableBody.innerHTML = equipmentList
        .map((item, index) => {
            const actionButtons = `
                <div class="table-actions">
                    <button
                        type="button"
                        class="action-button view"
                        onclick="viewEquipment('${item.id}')"
                        title="Lihat Detail"
                    >
                        👁
                    </button>

                    ${
                        isAdmin
                            ? `
                                <button
                                    type="button"
                                    class="action-button edit"
                                    onclick="editEquipment('${item.id}')"
                                    title="Edit"
                                >
                                    ✎
                                </button>

                                <button
                                    type="button"
                                    class="action-button delete"
                                    onclick="deleteEquipment('${item.id}')"
                                    title="Hapus"
                                >
                                    🗑
                                </button>
                            `
                            : ""
                    }
                </div>
            `;

            return `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        <strong>${escapeHtml(item.code || "-")}</strong>
                    </td>

                    <td>
                        <div class="equipment-name">
                            ${escapeHtml(item.name || "-")}
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(item.category || "-")}
                    </td>

                    <td>
                        <div>${escapeHtml(item.brand || "-")}</div>
                        ${
                            item.model
                                ? `<small>${escapeHtml(item.model)}</small>`
                                : ""
                        }
                    </td>

                    <td>
                        ${escapeHtml(item.lab_location || "-")}
                    </td>

                    <td>
                        <span class="status-badge condition-${getConditionClass(item.condition)}">
                            ${formatCondition(item.condition)}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge status-${getStatusClass(item.status)}">
                            ${formatStatus(item.status)}
                        </span>
                    </td>

                    <td>${actionButtons}</td>
                </tr>
            `;
        })
        .join("");
}

// =========================================
// SEARCH & FILTER
// =========================================

function applyFilters() {
    const search = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const condition = conditionFilter.value;
    const status = statusFilter.value;

    const filtered = allEquipment.filter(item => {
        const searchableText = [
            item.code,
            item.name,
            item.item_type,
            item.brand,
            item.model,
            item.category,
            item.lab_location
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search || searchableText.includes(search);

        const matchesCategory =
            !category || item.category === category;

        const matchesCondition =
            !condition || item.condition === condition;

        const matchesStatus =
            !status || item.status === status;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesCondition &&
            matchesStatus
        );
    });

    renderEquipment(filtered);
}

// =========================================
// CATEGORY FILTER
// =========================================

function populateCategoryFilter() {
    const categories = [
        ...new Set(
            allEquipment
                .map(item => item.category)
                .filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML = `
        <option value="">Semua Kategori</option>
    `;

    categories.forEach(category => {
        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        categoryFilter.appendChild(option);
    });
}

// =========================================
// OPEN ADD MODAL
// =========================================

function openAddModal() {
    if (currentProfile?.role !== "admin") {
        showMessage(
            "Hanya Admin yang dapat menambah equipment.",
            "error"
        );
        return;
    }

    editingEquipmentId = null;

    modalTitle.textContent = "Tambah Equipment";
    saveEquipmentButton.textContent = "Simpan Equipment";

    equipmentForm.reset();

    document.getElementById("equipmentId").value = "";
    document.getElementById("equipmentCode").value = "";

    const equipmentTypeInput =
        document.getElementById("equipmentType");

    equipmentTypeInput.disabled = false;
    equipmentTypeInput.value = "";

    equipmentModal.classList.remove("hidden");
}

// =========================================
// OPEN EDIT MODAL
// =========================================

async function editEquipment(equipmentId) {
    if (currentProfile?.role !== "admin") {
        showMessage(
            "Hanya Admin yang dapat mengedit equipment.",
            "error"
        );
        return;
    }

    const equipment = allEquipment.find(
        item => String(item.id) === String(equipmentId)
    );

    if (!equipment) {
        showMessage("Data equipment tidak ditemukan.", "error");
        return;
    }

    editingEquipmentId = equipment.id;

    modalTitle.textContent = "Edit Equipment";
    saveEquipmentButton.textContent = "Simpan Perubahan";

    document.getElementById("equipmentId").value =
        equipment.id;

    document.getElementById("equipmentCode").value =
        equipment.code || "";

    const equipmentTypeInput =
        document.getElementById("equipmentType");

    equipmentTypeInput.value =
        equipment.item_type || "";

    // Jenis barang tidak dapat diubah saat edit.
    equipmentTypeInput.disabled = true;

    document.getElementById("equipmentName").value =
        equipment.name || "";

    document.getElementById("equipmentCategory").value =
        equipment.category || "";

    document.getElementById("equipmentBrand").value =
        equipment.brand || "";

    document.getElementById("equipmentModel").value =
        equipment.model || "";

    document.getElementById("purchaseYear").value =
        equipment.purchase_year || "";

    document.getElementById("labLocation").value =
        equipment.lab_location || "";

    document.getElementById("equipmentCondition").value =
        equipment.condition || "";

    document.getElementById("equipmentStatus").value =
        equipment.status || "";

    document.getElementById("lastMaintenanceDate").value =
        equipment.last_maintenance_date || "";

    equipmentModal.classList.remove("hidden");
}

window.editEquipment = editEquipment;

// =========================================
// VIEW EQUIPMENT
// =========================================

function viewEquipment(equipmentId) {
    window.location.href =
        `equipment-detail.html?id=${encodeURIComponent(equipmentId)}`;
}

window.viewEquipment = viewEquipment;

// =========================================
// SAVE EQUIPMENT
// =========================================

async function saveEquipment(event) {
    event.preventDefault();

    if (currentProfile?.role !== "admin") {
        showMessage(
            "Kamu tidak memiliki izin untuk mengubah equipment.",
            "error"
        );
        return;
    }

    const itemType =
        document.getElementById("equipmentType").value;

    const name =
        document.getElementById("equipmentName").value.trim();

    const category =
        document.getElementById("equipmentCategory").value.trim();

    const brand =
        document.getElementById("equipmentBrand").value.trim();

    const model =
        document.getElementById("equipmentModel").value.trim();

    const purchaseYearValue =
        document.getElementById("purchaseYear").value;

    const labLocation =
        document.getElementById("labLocation").value.trim();

    const condition =
        document.getElementById("equipmentCondition").value;

    const status =
        document.getElementById("equipmentStatus").value;

    const lastMaintenanceDate =
        document.getElementById("lastMaintenanceDate").value;

    // Validasi input.
    if (
        (!editingEquipmentId && !itemType) ||
        !name ||
        !category ||
        !labLocation ||
        !condition ||
        !status ||
        !purchaseYearValue
    ) {
        showMessage(
            "Semua field wajib diisi, termasuk jenis barang dan tahun pembelian.",
            "error"
        );
        return;
    }

    const purchaseYear = Number(purchaseYearValue);

    if (
        !Number.isInteger(purchaseYear) ||
        purchaseYear < 2000 ||
        purchaseYear > 2100
    ) {
        showMessage(
            "Purchase year harus berupa tahun antara 2000 sampai 2100.",
            "error"
        );
        return;
    }

    // Kode tidak dikirim dari JavaScript.
    // Supabase membuat kode melalui trigger saat INSERT.
    const equipmentData = {
        name,
        category,
        brand: brand || null,
        model: model || null,
        purchase_year: purchaseYear,
        lab_location: labLocation,
        condition,
        status,
        last_maintenance_date: lastMaintenanceDate || null
    };

    setSaveLoading(true);

    try {
        if (editingEquipmentId) {
            // EDIT: code dan item_type tidak diubah.
            const { error } = await client
                .from("equipment")
                .update(equipmentData)
                .eq("id", editingEquipmentId);

            if (error) {
                console.error("Update equipment error:", error);

                showMessage(
                    getDatabaseErrorMessage(error),
                    "error"
                );
                return;
            }

            showMessage(
                "Equipment berhasil diperbarui. Kode inventaris tetap.",
                "success"
            );

        } else {
            // INSERT: item_type dikirim, code dibuat oleh trigger.
            const insertData = {
                ...equipmentData,
                item_type: itemType
            };

            const { data: newEquipment, error } = await client
                .from("equipment")
                .insert(insertData)
                .select("code")
                .single();

            if (error) {
                console.error("Insert equipment error:", error);

                showMessage(
                    getDatabaseErrorMessage(error),
                    "error"
                );
                return;
            }

            showMessage(
                `Equipment berhasil ditambahkan dengan kode ${newEquipment.code}.`,
                "success"
            );
        }

        closeModal();

        await loadEquipment();
        populateCategoryFilter();
        applyFilters();

    } catch (error) {
        console.error("Save equipment error:", error);

        showMessage(
            "Terjadi kesalahan saat menyimpan data equipment.",
            "error"
        );

    } finally {
        setSaveLoading(false);
    }
}
