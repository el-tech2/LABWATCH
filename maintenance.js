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
    document.getElementById(
        "maintenanceTableBody"
    );

const maintenanceCount =
    document.getElementById(
        "maintenanceCount"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const maintenanceTypeFilter =
    document.getElementById(
        "maintenanceTypeFilter"
    );

const resetFilterButton =
    document.getElementById(
        "resetFilterButton"
    );

const addMaintenanceButton =
    document.getElementById(
        "addMaintenanceButton"
    );

const maintenanceModal =
    document.getElementById(
        "maintenanceModal"
    );

const maintenanceForm =
    document.getElementById(
        "maintenanceForm"
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

const saveMaintenanceButton =
    document.getElementById(
        "saveMaintenanceButton"
    );

const pageMessage =
    document.getElementById(
        "pageMessage"
    );


// =========================================
// INITIALIZE
// =========================================

async function initializeMaintenancePage() {

    try {

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


        await loadCurrentProfile();

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
            "Gagal memuat halaman maintenance.",
            "error"
        );

    }

}


// =========================================
// LOAD PROFILE
// =========================================

async function loadCurrentProfile() {

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


    const userName =
        document.getElementById(
            "userName"
        );

    const userRole =
        document.getElementById(
            "userRole"
        );

    const userAvatar =
        document.getElementById(
            "userAvatar"
        );


    userName.textContent =
        data.full_name || "User";


    userRole.textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";


    const initials =
        (data.full_name || "U")
            .split(" ")
            .map(
                word =>
                    word
                        .charAt(0)
                        .toUpperCase()
            )
            .join("")
            .substring(
                0,
                2
            );


    userAvatar.textContent =
        initials;

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
        .select(
            "id, code, name"
        )
        .order(
            "code",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Equipment error:",
            error
        );

        throw error;

    }


    allEquipment =
        data || [];


    populateEquipmentSelect();

}


// =========================================
// EQUIPMENT SELECT
// =========================================

function populateEquipmentSelect() {

    const select =
        document.getElementById(
            "equipmentId"
        );


    select.innerHTML = `
        <option value="">
            Pilih Equipment
        </option>
    `;


    allEquipment.forEach(
        item => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                item.id;


            option.textContent =
                `${item.code} - ${item.name}`;


            select.appendChild(
                option
            );

        }
    );

}


// =========================================
// LOAD TECHNICIANS
// =========================================

async function loadTechnicians() {

    const {
        data,
        error
    } = await client
        .from("profiles")
        .select(
            "id, full_name, role"
        )
        .eq(
            "role",
            "technician"
        )
        .order(
            "full_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Technician error:",
            error
        );

        throw error;

    }


    allTechnicians =
        data || [];


    /*
     * Kalau user yang login adalah technician,
     * pastikan dirinya juga tersedia.
     */

    if (
        currentProfile?.role ===
        "technician"
    ) {

        const exists =
            allTechnicians.some(
                technician =>
                    technician.id ===
                    currentUser.id
            );


        if (!exists) {

            allTechnicians.push({
                id:
                    currentUser.id,

                full_name:
                    currentProfile.full_name,

                role:
                    "technician"

            });

        }

    }


    populateTechnicianSelect();

}


// =========================================
// TECHNICIAN SELECT
// =========================================

function populateTechnicianSelect() {

    const select =
        document.getElementById(
            "technicianId"
        );


    select.innerHTML = `
        <option value="">
            Pilih Technician
        </option>
    `;


    allTechnicians.forEach(
        technician => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                technician.id;


            option.textContent =
                technician.full_name;


            select.appendChild(
                option
            );

        }
    );


    /*
     * Jika technician login,
     * otomatis pilih dirinya.
     */

    if (
        currentProfile?.role ===
        "technician"
    ) {

        select.value =
            currentUser.id;

    }

}


// =========================================
// LOAD MAINTENANCE
// =========================================

async function loadMaintenance() {

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
        .order(
            "maintenance_date",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Maintenance error:",
            error
        );

        throw error;

    }


    allMaintenance =
        data || [];


    renderOverview();

}


// =========================================
// RENDER OVERVIEW
// =========================================

function renderOverview() {

    const total =
        allMaintenance.length;


    const now =
        new Date();


    const currentMonth =
        now.getMonth();


    const currentYear =
        now.getFullYear();


    const monthly =
        allMaintenance.filter(
            item => {

                if (
                    !item.maintenance_date
                ) {
                    return false;
                }


                const date =
                    new Date(
                        item.maintenance_date
                    );


                return (
                    date.getMonth() ===
                    currentMonth &&
                    date.getFullYear() ===
                    currentYear
                );

            }
        ).length;


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const upcoming =
        allMaintenance.filter(
            item => {

                if (
                    !item.next_maintenance_date
                ) {
                    return false;
                }


                const nextDate =
                    new Date(
                        item.next_maintenance_date
                    );

                nextDate.setHours(
                    0,
                    0,
                    0,
                    0
                );


                return (
                    nextDate >=
                    today
                );

            }
        ).length;


    const overdue =
        allMaintenance.filter(
            item => {

                if (
                    !item.next_maintenance_date
                ) {
                    return false;
                }


                const nextDate =
                    new Date(
                        item.next_maintenance_date
                    );

                nextDate.setHours(
                    0,
                    0,
                    0,
                    0
                );


                return (
                    nextDate <
                    today
                );

            }
        ).length;


    document.getElementById(
        "totalMaintenance"
    ).textContent =
        total;


    document.getElementById(
        "monthlyMaintenance"
    ).textContent =
        monthly;


    document.getElementById(
        "upcomingMaintenance"
    ).textContent =
        upcoming;


    document.getElementById(
        "overdueMaintenance"
    ).textContent =
        overdue;

}


// =========================================
// FILTER
// =========================================

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const type =
        maintenanceTypeFilter.value;


    const filtered =
        allMaintenance.filter(
            item => {

                const equipmentText =

                    item.equipment?.code ||
                    "";


                const equipmentName =

                    item.equipment?.name ||
                    "";


                const technicianName =

                    item.technician?.full_name ||
                    "";


                const searchableText = [

                    equipmentText,

                    equipmentName,

                    technicianName,

                    item.maintenance_type,

                    item.description,

                    item.result

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesType =
                    !type ||
                    item.maintenance_type ===
                    type;


                return (
                    matchesSearch &&
                    matchesType
                );

            }
        );


    renderMaintenance(
        filtered
    );

}


// =========================================
// RENDER TABLE
// =========================================

function renderMaintenance(
    maintenanceList
) {

    maintenanceCount.textContent =
        `${maintenanceList.length} records`;


    if (
        maintenanceList.length ===
        0
    ) {

        maintenanceTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-empty"
                >

                    <div>

                        <strong>
                            Belum ada maintenance record
                        </strong>

                        <span>
                            Tambahkan histori maintenance equipment.
                        </span>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    maintenanceTableBody.innerHTML =

        maintenanceList
            .map(
                (
                    item,
                    index
                ) => {

                    const equipmentCode =
                        item.equipment?.code ||
                        "-";


                    const equipmentName =
                        item.equipment?.name ||
                        "-";


                    const technicianName =
                        item.technician?.full_name ||
                        "-";


                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>
                                ${formatDate(
                                    item.maintenance_date
                                )}
                            </td>


                            <td>

                                <div class="equipment-name">

                                    <strong>
                                        ${escapeHtml(
                                            equipmentCode
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            equipmentName
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>
                                ${formatMaintenanceType(
                                    item.maintenance_type
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    technicianName
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    item.result ||
                                    "-"
                                )}
                            </td>


                            <td>
                                ${formatDate(
                                    item.next_maintenance_date
                                )}
                            </td>


                            <td>

                                <div class="table-actions">

                                    <button
                                        class="action-button view"
                                        onclick="viewMaintenance('${item.id}')"
                                        title="Lihat"
                                    >
                                        👁
                                    </button>

                                    ${
                                        currentProfile?.role ===
                                        "admin"
                                            ? `

                                                <button
                                                    class="action-button edit"
                                                    onclick="editMaintenance('${item.id}')"
                                                    title="Edit"
                                                >
                                                    ✎
                                                </button>

                                                <button
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

                }
            )
            .join("");

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

function formatDate(
    date
) {

    if (!date) {
        return "-";
    }


    const value =
        new Date(
            `${date}T00:00:00`
        );


    return value.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =========================================
// ADD MODAL
// =========================================

function openAddModal() {

    if (
        currentProfile?.role !==
        "admin" &&
        currentProfile?.role !==
        "technician"
    ) {

        showMessage(
            "Kamu tidak memiliki izin.",
            "error"
        );

        return;

    }


    editingMaintenanceId =
        null;


    modalTitle.textContent =
        "Tambah Maintenance";


    maintenanceForm.reset();


    if (
        currentProfile?.role ===
        "technician"
    ) {

        document.getElementById(
            "technicianId"
        ).value =
            currentUser.id;

    }


    document.getElementById(
        "maintenanceDate"
    ).value =
        getTodayDate();


    saveMaintenanceButton.textContent =
        "Simpan Maintenance";


    maintenanceModal.classList.remove(
        "hidden"
    );

}


// =========================================
// EDIT
// =========================================

function editMaintenance(
    maintenanceId
) {

    if (
        currentProfile?.role !==
        "admin"
    ) {

        showMessage(
            "Hanya Admin yang dapat mengedit maintenance.",
            "error"
        );

        return;

    }


    const item =
        allMaintenance.find(
            record =>
                String(record.id) ===
                String(maintenanceId)
        );


    if (!item) {

        showMessage(
            "Data maintenance tidak ditemukan.",
            "error"
        );

        return;

    }


    editingMaintenanceId =
        item.id;


    modalTitle.textContent =
        "Edit Maintenance";


    document.getElementById(
        "equipmentId"
    ).value =
        item.equipment_id || "";


    document.getElementById(
        "maintenanceDate"
    ).value =
        item.maintenance_date || "";


    document.getElementById(
        "maintenanceType"
    ).value =
        item.maintenance_type || "";


    document.getElementById(
        "technicianId"
    ).value =
        item.technician_id || "";


    document.getElementById(
        "description"
    ).value =
        item.description || "";


    document.getElementById(
        "result"
    ).value =
        item.result || "";


    document.getElementById(
        "nextMaintenanceDate"
    ).value =
        item.next_maintenance_date || "";


    saveMaintenanceButton.textContent =
        "Simpan Perubahan";


    maintenanceModal.classList.remove(
        "hidden"
    );

}


window.editMaintenance =
    editMaintenance;


// =========================================
// VIEW
// =========================================

function viewMaintenance(
    maintenanceId
) {

    const item =
        allMaintenance.find(
            record =>
                String(record.id) ===
                String(maintenanceId)
        );


    if (!item) {
        return;
    }


    const equipment =
        item.equipment?.code ||
        "Equipment";


    alert(

        `Maintenance Record\n\n` +

        `Equipment: ${equipment}\n` +

        `Tanggal: ${
            formatDate(
                item.maintenance_date
            )
        }\n` +

        `Jenis: ${
            formatMaintenanceType(
                item.maintenance_type
            )
        }\n` +

        `Technician: ${
            item.technician?.full_name ||
            "-"
        }\n\n` +

        `Deskripsi:\n${
            item.description ||
            "-"
        }\n\n` +

        `Hasil:\n${
            item.result ||
            "-"
        }\n\n` +

        `Maintenance berikutnya: ${
            formatDate(
                item.next_maintenance_date
            )
        }`

    );

}


window.viewMaintenance =
    viewMaintenance;


// =========================================
// SAVE
// =========================================

async function saveMaintenance(
    event
) {

    event.preventDefault();


    const equipmentId =
        document.getElementById(
            "equipmentId"
        ).value;


    const maintenanceDate =
        document.getElementById(
            "maintenanceDate"
        ).value;


    const maintenanceType =
        document.getElementById(
            "maintenanceType"
        ).value;


    const technicianId =
        document.getElementById(
            "technicianId"
        ).value;


    const description =
        document.getElementById(
            "description"
        ).value
            .trim();


    const result =
        document.getElementById(
            "result"
        ).value
            .trim();


    const nextMaintenanceDate =
        document.getElementById(
            "nextMaintenanceDate"
        ).value;


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


    const maintenanceData = {

        equipment_id:
            equipmentId,

        maintenance_date:
            maintenanceDate,

        maintenance_type:
            maintenanceType,

        technician_id:
            technicianId,

        description:
            description || null,

        result:
            result || null,

        next_maintenance_date:
            nextMaintenanceDate ||
            null

    };


    setSaveLoading(
        true
    );


    try {

        if (
            editingMaintenanceId
        ) {

            const {
                error
            } = await client
                .from(
                    "maintenance_records"
                )
                .update(
                    maintenanceData
                )
                .eq(
                    "id",
                    editingMaintenanceId
                );


            if (error) {
                throw error;
            }


            showMessage(
                "Maintenance berhasil diperbarui.",
                "success"
            );


        } else {

            const {
                error
            } = await client
                .from(
                    "maintenance_records"
                )
                .insert(
                    maintenanceData
                );


            if (error) {
                throw error;
            }


            showMessage(
                "Maintenance berhasil ditambahkan.",
                "success"
            );

        }


        /*
         * Update tanggal maintenance
         * terakhir pada equipment.
         */

        await client
            .from("equipment")
            .update({

                last_maintenance_date:
                    maintenanceDate

            })
            .eq(
                "id",
                equipmentId
            );


        closeModal();


        await loadMaintenance();

        applyFilters();


    } catch (error) {

        console.error(
            "Save maintenance error:",
            error
        );


        showMessage(
            getDatabaseErrorMessage(
                error
            ),
            "error"
        );

    }


    setSaveLoading(
        false
    );

}


// =========================================
// DELETE
// =========================================

async function deleteMaintenance(
    maintenanceId
) {

    if (
        currentProfile?.role !==
        "admin"
    ) {

        showMessage(
            "Hanya Admin yang dapat menghapus maintenance.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            "Apakah kamu yakin ingin menghapus maintenance record ini?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await client
            .from(
                "maintenance_records"
            )
            .delete()
            .eq(
                "id",
                maintenanceId
            );


        if (error) {
            throw error;
        }


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
            getDatabaseErrorMessage(
                error
            ),
            "error"
        );

    }

}


window.deleteMaintenance =
    deleteMaintenance;


// =========================================
// MODAL
// =========================================

function closeModal() {

    maintenanceModal.classList.add(
        "hidden"
    );


    maintenanceForm.reset();


    editingMaintenanceId =
        null;


    modalTitle.textContent =
        "Tambah Maintenance";


    saveMaintenanceButton.textContent =
        "Simpan Maintenance";

}


closeModalButton.addEventListener(
    "click",
    closeModal
);


cancelModalButton.addEventListener(
    "click",
    closeModal
);


maintenanceModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            maintenanceModal
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


maintenanceTypeFilter.addEventListener(
    "change",
    applyFilters
);


resetFilterButton.addEventListener(
    "click",
    function () {

        searchInput.value =
            "";

        maintenanceTypeFilter.value =
            "";

        applyFilters();

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
// FORM
// =========================================

maintenanceForm.addEventListener(
    "submit",
    saveMaintenance
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
// ROLE
// =========================================

function applyRolePermissions() {

    /*
     * Admin dan Technician
     * sama-sama boleh menambah maintenance.
     */

    addMaintenanceButton.style.display =
        "inline-flex";

}


// =========================================
// LOADING
// =========================================

function setSaveLoading(
    loading
) {

    saveMaintenanceButton.disabled =
        loading;


    saveMaintenanceButton.textContent =
        loading
            ? "Menyimpan..."
            : editingMaintenanceId
                ? "Simpan Perubahan"
                : "Simpan Maintenance";

}


// =========================================
// TODAY
// =========================================

function getTodayDate() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

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
        error?.code ===
        "42501"
    ) {

        return "Kamu tidak memiliki izin untuk melakukan tindakan ini.";

    }


    if (
        error?.code ===
        "23503"
    ) {

        return "Data yang dipilih tidak memiliki relasi yang valid.";

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

initializeMaintenancePage();