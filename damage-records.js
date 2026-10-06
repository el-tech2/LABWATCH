// =========================================
// LABWATCH - DAMAGE RECORDS
// =========================================

const client = window.supabaseClient;


// =========================================
// GLOBAL
// =========================================

let currentUser = null;
let currentProfile = null;

let allDamageRecords = [];
let allEquipment = [];

let editingDamageId = null;


// =========================================
// DOM
// =========================================

const damageTableBody =
    document.getElementById("damageTableBody");

const recordCount =
    document.getElementById("recordCount");

const searchInput =
    document.getElementById("searchInput");

const severityFilter =
    document.getElementById("severityFilter");

const statusFilter =
    document.getElementById("statusFilter");

const resetFilterButton =
    document.getElementById("resetFilterButton");

const addDamageButton =
    document.getElementById("addDamageButton");

const damageModal =
    document.getElementById("damageModal");

const damageForm =
    document.getElementById("damageForm");

const closeModalButton =
    document.getElementById("closeModalButton");

const cancelModalButton =
    document.getElementById("cancelModalButton");

const saveDamageButton =
    document.getElementById("saveDamageButton");

const pageMessage =
    document.getElementById("pageMessage");


// =========================================
// INITIALIZE
// =========================================

async function initializeDamagePage() {

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

        await loadDamageRecords();

        applyRolePermissions();

    }

    catch (error) {

    console.error(
        "Damage page error:",
        error
    );

    showMessage(
        "Gagal memuat halaman damage records: " +
        (error.message || "Unknown error"),
        "error"
    );

}

}


// =========================================
// PROFILE
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

        return;
    }


    currentProfile = data;


    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");

    const userAvatar =
        document.getElementById("userAvatar");


    userName.textContent =
        data.full_name || "User";


    userRole.textContent =
        data.role === "admin"
            ? "Administrator"
            : "Technician";


    const initials =
        (data.full_name || "User")
            .split(" ")
            .map(word =>
                word.charAt(0).toUpperCase()
            )
            .join("")
            .substring(0, 2);


    userAvatar.textContent =
        initials;

}


// =========================================
// ROLE
// =========================================

function applyRolePermissions() {

    const isAdmin =
        currentProfile?.role === "admin";

    const isTechnician =
        currentProfile?.role === "technician";


    // Admin dan Technician boleh menambahkan damage record
    if (isAdmin || isTechnician) {

        addDamageButton.style.display =
            "inline-flex";

    }

    else {

        addDamageButton.style.display =
            "none";

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
        .select("id, code, name")
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Equipment error:",
            error
        );

        return;
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
        equipment => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                equipment.id;


            option.textContent =
                `${equipment.code} - ${equipment.name}`;


            select.appendChild(
                option
            );

        }
    );

}


// =========================================
// LOAD DAMAGE RECORDS
// =========================================

async function loadDamageRecords() {

    damageTableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="table-loading"
            >
                Loading damage records...
            </td>
        </tr>
    `;


    const {
        data,
        error
    } = await client
        .from("damage_records")
        .select(`
            *,
            equipment (
                id,
                code,
                name
            )
        `)
        .order(
            "damage_date",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Damage records error:",
            error
        );


        damageTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-loading error-text"
                >
                    Gagal mengambil damage records.
                </td>
            </tr>
        `;

        return;
    }


    allDamageRecords =
        data || [];


    renderDamageRecords(
        allDamageRecords
    );

}


// =========================================
// RENDER
// =========================================

function renderDamageRecords(
    records
) {

    recordCount.textContent =
        `${records.length} records`;


    if (records.length === 0) {

        damageTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    <div>

                        <strong>
                            Belum ada damage record
                        </strong>

                        <span>
                            Tambahkan riwayat kerusakan equipment.
                        </span>

                    </div>
                </td>
            </tr>
        `;

        return;
    }


    const isAdmin =
        currentProfile?.role === "admin";


    damageTableBody.innerHTML =
        records
            .map(
                (item, index) => {

                    return `
                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${formatDate(
                                    item.damage_date
                                )}
                            </td>

                            <td>

                                <strong>
                                    ${escapeHtml(
                                        item.equipment?.code || "-"
                                    )}
                                </strong>

                                <br>

                                <small>
                                    ${escapeHtml(
                                        item.equipment?.name || "-"
                                    )}
                                </small>

                            </td>

                            <td>
                                ${escapeHtml(
                                    item.damage_type
                                )}
                            </td>

                            <td>

                                <span
                                    class="status-badge severity-${item.severity}"
                                >
                                    ${formatSeverity(
                                        item.severity
                                    )}
                                </span>

                            </td>

                            <td>

                                <span
                                    class="status-badge damage-status-${item.status}"
                                >
                                    ${formatDamageStatus(
                                        item.status
                                    )}
                                </span>

                            </td>

                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="action-button view"
                                        onclick="viewDamage('${item.id}')"
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
                                                    onclick="editDamage('${item.id}')"
                                                    title="Edit"
                                                >
                                                    ✎
                                                </button>

                                                <button
                                                    type="button"
                                                    class="action-button delete"
                                                    onclick="deleteDamage('${item.id}')"
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
// FILTER
// =========================================

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const severity =
        severityFilter.value;


    const status =
        statusFilter.value;


    const filtered =
        allDamageRecords.filter(
            item => {

                const equipmentText = [

                    item.equipment?.code,

                    item.equipment?.name,

                    item.damage_type,

                    item.description

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    equipmentText.includes(
                        search
                    );


                const matchesSeverity =
                    !severity ||
                    item.severity === severity;


                const matchesStatus =
                    !status ||
                    item.status === status;


                return (
                    matchesSearch &&
                    matchesSeverity &&
                    matchesStatus
                );

            }
        );


    renderDamageRecords(
        filtered
    );

}


// =========================================
// ADD
// =========================================

function openAddModal() {

    if (
        !["admin", "technician"]
            .includes(
                currentProfile?.role
            )
    ) {

        showMessage(
            "Kamu tidak memiliki izin.",
            "error"
        );

        return;
    }


    editingDamageId =
        null;


    damageForm.reset();


    document.getElementById(
        "damageId"
    ).value = "";


    document.getElementById(
        "damageDate"
    ).value =
        new Date()
            .toISOString()
            .split("T")[0];


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Tambah Damage Record";


    saveDamageButton.textContent =
        "Simpan Damage Record";


    damageModal.classList.remove(
        "hidden"
    );

}


// =========================================
// EDIT
// =========================================

function editDamage(
    damageId
) {

    const item =
        allDamageRecords.find(
            record =>
                String(record.id) ===
                String(damageId)
        );


    if (!item) {

        showMessage(
            "Damage record tidak ditemukan.",
            "error"
        );

        return;
    }


    editingDamageId =
        item.id;


    document.getElementById(
        "equipmentId"
    ).value =
        item.equipment_id;


    document.getElementById(
        "damageDate"
    ).value =
        item.damage_date;


    document.getElementById(
        "damageType"
    ).value =
        item.damage_type;


    document.getElementById(
        "severity"
    ).value =
        item.severity;


    document.getElementById(
        "description"
    ).value =
        item.description;


    document.getElementById(
        "actionTaken"
    ).value =
        item.action_taken || "";


    document.getElementById(
        "damageStatus"
    ).value =
        item.status;


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Edit Damage Record";


    saveDamageButton.textContent =
        "Simpan Perubahan";


    damageModal.classList.remove(
        "hidden"
    );

}


window.editDamage =
    editDamage;


// =========================================
// VIEW
// =========================================

function viewDamage(
    damageId
) {

    const item =
        allDamageRecords.find(
            record =>
                String(record.id) ===
                String(damageId)
        );


    if (!item) {
        return;
    }


    alert(
        `Equipment: ${item.equipment?.name || "-"}\n\n` +
        `Tanggal: ${formatDate(item.damage_date)}\n` +
        `Kerusakan: ${item.damage_type}\n` +
        `Severity: ${formatSeverity(item.severity)}\n` +
        `Status: ${formatDamageStatus(item.status)}\n\n` +
        `Deskripsi:\n${item.description || "-"}\n\n` +
        `Tindakan:\n${item.action_taken || "-"}`
    );

}


window.viewDamage =
    viewDamage;


// =========================================
// SAVE
// =========================================

async function saveDamage(
    event
) {

    event.preventDefault();


    const equipmentId =
        document.getElementById(
            "equipmentId"
        ).value;


    const damageDate =
        document.getElementById(
            "damageDate"
        ).value;


    const damageType =
        document.getElementById(
            "damageType"
        ).value
            .trim();


    const severity =
        document.getElementById(
            "severity"
        ).value;


    const description =
        document.getElementById(
            "description"
        ).value
            .trim();


    const actionTaken =
        document.getElementById(
            "actionTaken"
        ).value
            .trim();


    const status =
        document.getElementById(
            "damageStatus"
        ).value;


    if (
        !equipmentId ||
        !damageDate ||
        !damageType ||
        !severity ||
        !description ||
        !status
    ) {

        showMessage(
            "Field yang bertanda * wajib diisi.",
            "error"
        );

        return;
    }


    const damageData = {

        equipment_id:
            equipmentId,

        damage_date:
            damageDate,

        damage_type:
            damageType,

        severity:
            severity,

        description:
            description,

        action_taken:
            actionTaken || null,

        status:
            status

    };


    saveDamageButton.disabled =
        true;


    saveDamageButton.textContent =
        "Menyimpan...";


    try {

        let error;


        if (editingDamageId) {

            ({
                error
            } = await client
                .from("damage_records")
                .update(
                    damageData
                )
                .eq(
                    "id",
                    editingDamageId
                ));

        }

        else {

            ({
                error
            } = await client
                .from("damage_records")
                .insert({

                    ...damageData,

                    reported_by:
                        currentUser.id

                }));

        }


        if (error) {

            console.error(
                "Save damage error:",
                error
            );


            showMessage(
                error.message,
                "error"
            );

            return;
        }


        showMessage(
            editingDamageId
                ? "Damage record berhasil diperbarui."
                : "Damage record berhasil ditambahkan.",
            "success"
        );


        closeModal();


        await loadDamageRecords();

    }

    catch (error) {

        console.error(
            error
        );

        showMessage(
            "Terjadi kesalahan saat menyimpan data.",
            "error"
        );

    }

    finally {

        saveDamageButton.disabled =
            false;

        saveDamageButton.textContent =
            editingDamageId
                ? "Simpan Perubahan"
                : "Simpan Damage Record";

    }

}


// =========================================
// DELETE
// =========================================

async function deleteDamage(
    damageId
) {

    if (
        currentProfile?.role !== "admin"
    ) {

        showMessage(
            "Hanya Admin yang dapat menghapus damage record.",
            "error"
        );

        return;
    }


    const item =
        allDamageRecords.find(
            record =>
                String(record.id) ===
                String(damageId)
        );


    if (!item) {
        return;
    }


    const confirmed =
        confirm(
            `Hapus damage record "${item.damage_type}"?`
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } = await client
        .from("damage_records")
        .delete()
        .eq(
            "id",
            damageId
        );


    if (error) {

        console.error(
            error
        );

        showMessage(
            error.message,
            "error"
        );

        return;
    }


    showMessage(
        "Damage record berhasil dihapus.",
        "success"
    );


    await loadDamageRecords();

}


window.deleteDamage =
    deleteDamage;


// =========================================
// MODAL
// =========================================

function closeModal() {

    damageModal.classList.add(
        "hidden"
    );

    damageForm.reset();

    editingDamageId =
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


damageModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            damageModal
        ) {

            closeModal();

        }

    }
);


// =========================================
// EVENTS
// =========================================

searchInput.addEventListener(
    "input",
    applyFilters
);


severityFilter.addEventListener(
    "change",
    applyFilters
);


statusFilter.addEventListener(
    "change",
    applyFilters
);


resetFilterButton.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        severityFilter.value = "";

        statusFilter.value = "";

        renderDamageRecords(
            allDamageRecords
        );

    }
);


addDamageButton.addEventListener(
    "click",
    openAddModal
);


damageForm.addEventListener(
    "submit",
    saveDamage
);


// =========================================
// LOGOUT
// =========================================

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async () => {

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
// HELPERS
// =========================================

function formatDate(
    date
) {

    if (!date) {
        return "-";
    }


    return new Date(
        date
    ).toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatSeverity(
    severity
) {

    switch (severity) {

        case "ringan":
            return "Ringan";

        case "sedang":
            return "Sedang";

        case "berat":
            return "Berat";

        default:
            return severity || "-";

    }

}


function formatDamageStatus(status) {

    const statusMap = {

        dilaporkan: "Dilaporkan",

        diproses: "Diproses",

        selesai: "Selesai"

    };

    return statusMap[status] || status;

}


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
// START
// =========================================

initializeDamagePage();