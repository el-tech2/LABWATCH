// =========================================
// LABWATCH - EQUIPMENT MANAGEMENT
// =========================================

const client = window.supabaseClient;


// =========================================
// GLOBAL VARIABLES
// =========================================

let allEquipment = [];

let currentUser = null;

let currentProfile = null;

let editingEquipmentId = null;


// =========================================
// DOM ELEMENTS
// =========================================

const equipmentTableBody =
    document.getElementById(
        "equipmentTableBody"
    );

const equipmentCount =
    document.getElementById(
        "equipmentCount"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const categoryFilter =
    document.getElementById(
        "categoryFilter"
    );

const conditionFilter =
    document.getElementById(
        "conditionFilter"
    );

const statusFilter =
    document.getElementById(
        "statusFilter"
    );

const resetFilterButton =
    document.getElementById(
        "resetFilterButton"
    );

const addEquipmentButton =
    document.getElementById(
        "addEquipmentButton"
    );

const equipmentModal =
    document.getElementById(
        "equipmentModal"
    );

const equipmentForm =
    document.getElementById(
        "equipmentForm"
    );

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const closeModalButton =
    document.getElementById(
        "closeModalButton"
    );

const cancelModalButton =
    document.getElementById(
        "cancelModalButton"
    );

const saveEquipmentButton =
    document.getElementById(
        "saveEquipmentButton"
    );

const pageMessage =
    document.getElementById(
        "pageMessage"
    );


// =========================================
// INITIALIZE
// =========================================

async function initializeEquipmentPage() {

    try {

        // Cek apakah user login
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


        // Ambil profile user
        await loadCurrentProfile();


        // Ambil data equipment
        await loadEquipment();


        // Isi filter category
        populateCategoryFilter();


        // Terapkan role
        applyRolePermissions();


    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        showMessage(
            "Gagal memuat halaman equipment.",
            "error"
        );

    }

}


// =========================================
// LOAD CURRENT PROFILE
// =========================================

async function loadCurrentProfile() {

    const {
        data,
        error
    } = await client
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        showMessage(
            "Data profile tidak ditemukan.",
            "error"
        );

        return;
    }


    currentProfile = data;


    // Nama user
    const userName =
        document.getElementById(
            "userName"
        );

    userName.textContent =
        data.full_name;


    // Role
    const userRole =
        document.getElementById(
            "userRole"
        );

    userRole.textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";


    // Initial avatar
    const initials =
        data.full_name
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
// ROLE PERMISSION
// =========================================

function applyRolePermissions() {

    if (!currentProfile) {
        return;
    }


    const isAdmin =
        currentProfile.role === "admin";


    // Tombol tambah
    if (!isAdmin) {

        addEquipmentButton.style.display =
            "none";
    }


    // Informasi console
    console.log(
        "Current role:",
        currentProfile.role
    );

}


// =========================================
// LOAD EQUIPMENT
// =========================================

async function loadEquipment() {

    equipmentTableBody.innerHTML = `
        <tr>
            <td
                colspan="9"
                class="table-loading"
            >
                Loading equipment...
            </td>
        </tr>
    `;


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
            "Load equipment error:",
            error
        );


        equipmentTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-loading error-text"
                >
                    Gagal mengambil data equipment.
                </td>
            </tr>
        `;


        return;
    }


    allEquipment =
        data || [];


    renderEquipment(
        allEquipment
    );

}


// =========================================
// RENDER EQUIPMENT
// =========================================

// =========================================
// RENDER EQUIPMENT
// =========================================

function renderEquipment(equipmentList) {

    equipmentCount.textContent =
        `${equipmentList.length} equipment`;

    // Jika tidak ada data
    if (equipmentList.length === 0) {

        equipmentTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    <div>
                        <strong>
                            Tidak ada equipment
                        </strong>

                        <span>
                            Belum ada data yang sesuai dengan filter.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    const isAdmin =
        currentProfile?.role === "admin";


    // Render setiap equipment
    equipmentTableBody.innerHTML =
        equipmentList
            .map((item, index) => {

                // ==============================
                // ACTION BUTTON
                // ==============================

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


                // ==============================
                // RETURN TABLE ROW
                // ==============================

                return `
                    <tr>

                        <!-- NO -->
                        <td>
                            ${index + 1}
                        </td>


                        <!-- CODE -->
                        <td>
                            <strong>
                                ${escapeHtml(item.code || "-")}
                            </strong>
                        </td>


                        <!-- EQUIPMENT -->
                        <td>
                            <div class="equipment-name">
                                ${escapeHtml(item.name || "-")}
                            </div>
                        </td>


                        <!-- CATEGORY -->
                        <td>
                            ${escapeHtml(item.category || "-")}
                        </td>


                        <!-- BRAND / MODEL -->
                        <td>
                            <div>
                                ${escapeHtml(item.brand || "-")}
                            </div>

                            ${
                                item.model
                                    ? `
                                        <small>
                                            ${escapeHtml(item.model)}
                                        </small>
                                    `
                                    : ""
                            }
                        </td>


                        <!-- LOCATION -->
                        <td>
                            ${escapeHtml(item.lab_location || "-")}
                        </td>


                        <!-- CONDITION -->
                        <td>
                            <span
                                class="status-badge condition-${getConditionClass(item.condition)}"
                            >
                                ${formatCondition(item.condition)}
                            </span>
                        </td>


                        <!-- STATUS -->
                        <td>
                            <span
                                class="status-badge status-${getStatusClass(item.status)}"
                            >
                                ${formatStatus(item.status)}
                            </span>
                        </td>


                        <!-- ACTION -->
                        <td>
                            ${actionButtons}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


// =========================================
// SEARCH & FILTER
// =========================================

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const category =
        categoryFilter.value;


    const condition =
        conditionFilter.value;


    const status =
        statusFilter.value;


    const filtered =
        allEquipment.filter(
            item => {


                const searchableText = [

                    item.code,

                    item.name,

                    item.brand,

                    item.model,

                    item.category,

                    item.lab_location

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesCategory =
                    !category ||
                    item.category === category;


                const matchesCondition =
                    !condition ||
                    item.condition === condition;


                const matchesStatus =
                    !status ||
                    item.status === status;


                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesCondition &&
                    matchesStatus
                );

            }
        );


    renderEquipment(
        filtered
    );

}


// =========================================
// CATEGORY FILTER
// =========================================

function populateCategoryFilter() {

    const categories =
        [
            ...new Set(
                allEquipment
                    .map(
                        item =>
                            item.category
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    categoryFilter.innerHTML = `
        <option value="">
            Semua Kategori
        </option>
    `;


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category;


            option.textContent =
                category;


            categoryFilter.appendChild(
                option
            );

        }
    );

}


// =========================================
// OPEN ADD MODAL
// =========================================

function openAddModal() {

    if (
        currentProfile?.role !== "admin"
    ) {

        showMessage(
            "Hanya Admin yang dapat menambah equipment.",
            "error"
        );

        return;
    }


    editingEquipmentId =
        null;


    modalTitle.textContent =
        "Tambah Equipment";


    saveEquipmentButton.textContent =
        "Simpan Equipment";


    equipmentForm.reset();


    document.getElementById(
        "equipmentId"
    ).value = "";


    equipmentModal.classList.remove(
        "hidden"
    );

}


// =========================================
// OPEN EDIT MODAL
// =========================================

async function editEquipment(
    equipmentId
) {

    if (
        currentProfile?.role !== "admin"
    ) {

        showMessage(
            "Hanya Admin yang dapat mengedit equipment.",
            "error"
        );

        return;
    }


    const equipment =
        allEquipment.find(
            item =>
                String(item.id) ===
                String(equipmentId)
        );


    if (!equipment) {

        showMessage(
            "Data equipment tidak ditemukan.",
            "error"
        );

        return;
    }


    editingEquipmentId =
        equipment.id;


    modalTitle.textContent =
        "Edit Equipment";


    saveEquipmentButton.textContent =
        "Simpan Perubahan";


    // Isi form

    document.getElementById(
        "equipmentId"
    ).value =
        equipment.id;


    document.getElementById(
        "equipmentCode"
    ).value =
        equipment.code || "";


    document.getElementById(
        "equipmentName"
    ).value =
        equipment.name || "";


    document.getElementById(
        "equipmentCategory"
    ).value =
        equipment.category || "";


    document.getElementById(
        "equipmentBrand"
    ).value =
        equipment.brand || "";


    document.getElementById(
        "equipmentModel"
    ).value =
        equipment.model || "";


    document.getElementById(
        "purchaseYear"
    ).value =
        equipment.purchase_year || "";


    document.getElementById(
        "labLocation"
    ).value =
        equipment.lab_location || "";


    document.getElementById(
        "equipmentCondition"
    ).value =
        equipment.condition || "";


    document.getElementById(
        "equipmentStatus"
    ).value =
        equipment.status || "";


    document.getElementById(
        "lastMaintenanceDate"
    ).value =
        equipment.last_maintenance_date || "";


    equipmentModal.classList.remove(
        "hidden"
    );

}


// Supaya onclick HTML bisa mengakses function
window.editEquipment =
    editEquipment;

function viewEquipment(
    equipmentId
) {

    window.location.href =
        `equipment-detail.html?id=${encodeURIComponent(
            equipmentId
        )}`;

}


window.viewEquipment =
    viewEquipment;


// =========================================
// SAVE EQUIPMENT
// =========================================

async function saveEquipment(
    event
) {

    event.preventDefault();


    if (
        currentProfile?.role !== "admin"
    ) {

        showMessage(
            "Kamu tidak memiliki izin untuk mengubah equipment.",
            "error"
        );

        return;
    }


    // Ambil value

    const code =
        document.getElementById(
            "equipmentCode"
        ).value
            .trim();


    const name =
        document.getElementById(
            "equipmentName"
        ).value
            .trim();


    const category =
        document.getElementById(
            "equipmentCategory"
        ).value
            .trim();


    const brand =
        document.getElementById(
            "equipmentBrand"
        ).value
            .trim();


    const model =
        document.getElementById(
            "equipmentModel"
        ).value
            .trim();


    const purchaseYearValue =
        document.getElementById(
            "purchaseYear"
        ).value;


    const labLocation =
        document.getElementById(
            "labLocation"
        ).value
            .trim();


    const condition =
        document.getElementById(
            "equipmentCondition"
        ).value;


    const status =
        document.getElementById(
            "equipmentStatus"
        ).value;


    const lastMaintenanceDate =
        document.getElementById(
            "lastMaintenanceDate"
        ).value;


    // =========================================
    // VALIDATION
    // =========================================

    if (
        !code ||
        !name ||
        !category ||
        !labLocation ||
        !condition ||
        !status
    ) {

        showMessage(
            "Field yang bertanda * wajib diisi.",
            "error"
        );

        return;
    }


    // Tahun
    let purchaseYear =
        null;


    if (purchaseYearValue) {

        purchaseYear =
            Number(
                purchaseYearValue
            );


        if (
            purchaseYear < 2000 ||
            purchaseYear > 2100
        ) {

            showMessage(
                "Purchase year harus antara 2000 sampai 2100.",
                "error"
            );

            return;
        }

    }


    const equipmentData = {

        code,

        name,

        category,

        brand:
            brand || null,

        model:
            model || null,

        purchase_year:
            purchaseYear,

        lab_location:
            labLocation,

        condition,

        status,

        last_maintenance_date:
            lastMaintenanceDate || null

    };


    setSaveLoading(
        true
    );


    try {


        // =========================================
        // EDIT
        // =========================================

        if (editingEquipmentId) {

            const {
                error
            } = await client
                .from("equipment")
                .update(
                    equipmentData
                )
                .eq(
                    "id",
                    editingEquipmentId
                );


            if (error) {

                console.error(
                    "Update error:",
                    error
                );


                showMessage(
                    getDatabaseErrorMessage(
                        error
                    ),
                    "error"
                );


                setSaveLoading(
                    false
                );

                return;
            }


            showMessage(
                "Equipment berhasil diperbarui.",
                "success"
            );

        }


        // =========================================
        // INSERT
        // =========================================

        else {

            const {
                error
            } = await client
                .from("equipment")
                .insert(
                    equipmentData
                );


            if (error) {

                console.error(
                    "Insert error:",
                    error
                );


                showMessage(
                    getDatabaseErrorMessage(
                        error
                    ),
                    "error"
                );


                setSaveLoading(
                    false
                );

                return;
            }


            showMessage(
                "Equipment berhasil ditambahkan.",
                "success"
            );

        }


        closeModal();


        await loadEquipment();

        populateCategoryFilter();

        applyFilters();


    } catch (error) {

        console.error(
            "Save equipment error:",
            error
        );


        showMessage(
            "Terjadi kesalahan saat menyimpan data.",
            "error"
        );

    }


    setSaveLoading(
        false
    );

}


// =========================================
// DELETE EQUIPMENT
// =========================================

async function deleteEquipment(
    equipmentId
) {

    if (
        currentProfile?.role !== "admin"
    ) {

        showMessage(
            "Hanya Admin yang dapat menghapus equipment.",
            "error"
        );

        return;
    }


    const equipment =
        allEquipment.find(
            item =>
                String(item.id) ===
                String(equipmentId)
        );


    if (!equipment) {
        return;
    }


    const confirmed =
        confirm(
            `Hapus equipment "${equipment.name}" (${equipment.code})?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await client
            .from("equipment")
            .delete()
            .eq(
                "id",
                equipmentId
            );


        if (error) {

            console.error(
                "Delete error:",
                error
            );


            showMessage(
                getDatabaseErrorMessage(
                    error
                ),
                "error"
            );

            return;
        }


        showMessage(
            "Equipment berhasil dihapus.",
            "success"
        );


        await loadEquipment();

        populateCategoryFilter();

        applyFilters();


    } catch (error) {

        console.error(
            "Delete equipment error:",
            error
        );


        showMessage(
            "Terjadi kesalahan saat menghapus equipment.",
            "error"
        );

    }

}


window.deleteEquipment =
    deleteEquipment;


// =========================================
// MODAL CLOSE
// =========================================

function closeModal() {

    equipmentModal.classList.add(
        "hidden"
    );


    equipmentForm.reset();


    editingEquipmentId =
        null;

}


closeModalButton.addEventListener(
    "click",
    closeModal
);


cancelModalButton.addEventListener(
    "click",
    closeModal
);


// Klik area luar modal
equipmentModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            equipmentModal
        ) {

            closeModal();

        }

    }
);


// =========================================
// FILTER EVENTS
// =========================================

searchInput.addEventListener(
    "input",
    applyFilters
);


categoryFilter.addEventListener(
    "change",
    applyFilters
);


conditionFilter.addEventListener(
    "change",
    applyFilters
);


statusFilter.addEventListener(
    "change",
    applyFilters
);


resetFilterButton.addEventListener(
    "click",
    function () {

        searchInput.value = "";

        categoryFilter.value = "";

        conditionFilter.value = "";

        statusFilter.value = "";

        renderEquipment(
            allEquipment
        );

    }
);


// =========================================
// ADD BUTTON
// =========================================

addEquipmentButton.addEventListener(
    "click",
    openAddModal
);


// =========================================
// FORM SUBMIT
// =========================================

equipmentForm.addEventListener(
    "submit",
    saveEquipment
);


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
// UI HELPERS
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


// =========================================
// LOADING BUTTON
// =========================================

function setSaveLoading(
    loading
) {

    if (loading) {

        saveEquipmentButton.disabled =
            true;

        saveEquipmentButton.textContent =
            "Menyimpan...";

    } else {

        saveEquipmentButton.disabled =
            false;

        saveEquipmentButton.textContent =
            editingEquipmentId
                ? "Simpan Perubahan"
                : "Simpan Equipment";

    }

}


// =========================================
// MESSAGE
// =========================================

function showMessage(
    message,
    type
) {

    pageMessage.textContent =
        message;


    pageMessage.className =
        `page-message ${type}`;


    setTimeout(
        () => {

            pageMessage.classList.add(
                "hidden"
            );

        },
        4000
    );

}


// =========================================
// DATABASE ERROR
// =========================================

function getDatabaseErrorMessage(
    error
) {

    if (
        error?.code === "23505"
    ) {

        return "Equipment code sudah digunakan. Gunakan code yang berbeda.";

    }


    if (
        error?.code === "42501"
    ) {

        return "Kamu tidak memiliki izin untuk melakukan tindakan ini.";

    }


    if (
        error?.message
    ) {

        return error.message;

    }


    return "Terjadi kesalahan pada database.";

}


// =========================================
// SECURITY
// =========================================

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================
// START
// =========================================

initializeEquipmentPage();