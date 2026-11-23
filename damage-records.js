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

                                                                                                
                                                ${
                                                    currentProfile?.role === "technician" &&
                                                    item.status === "dilaporkan" &&
                                                    !item.assigned_to
                                                        ? `
                                                            <button
                                                                type="button"
                                                                class="action-button edit"
                                                                onclick="takeDamageReport('${item.id}')"
                                                                title="Ambil Laporan"
                                                            >
                                                                Ambil
                                                            </button>
                                                        `
                                                        : ""
                                                }
                         
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
// TAKE DAMAGE REPORT
// =========================================

async function takeDamageReport(damageId) {

    if (currentProfile?.role !== "technician") {
        showMessage(
            "Hanya Technician yang dapat mengambil laporan.",
            "error"
        );
        return;
    }

    const confirmed = confirm(
        "Apakah kamu yakin ingin mengambil laporan kerusakan ini?"
    );

    if (!confirmed) return;

    try {

        const { data, error } = await client
            .from("damage_records")
            .update({
                assigned_to: currentUser.id,
                assigned_at: new Date().toISOString(),
                status: "diproses"
            })
            .eq("id", damageId)
            .eq("status", "dilaporkan")
            .is("assigned_to", null)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Take report error:", error);

            showMessage(
                "Gagal mengambil laporan: " + error.message,
                "error"
            );
            return;
        }

        if (!data) {
            showMessage(
                "Laporan sudah diambil Technician lain atau statusnya sudah berubah.",
                "error"
            );

            await loadDamageRecords();
            return;
        }

        showMessage(
            "Laporan berhasil diambil. Kamu menjadi Technician penanggung jawab.",
            "success"
        );

        await loadDamageRecords();

    } catch (error) {

        console.error(error);

        showMessage(
            "Terjadi kesalahan saat mengambil laporan.",
            "error"
        );

    }
}

window.takeDamageReport = takeDamageReport;


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
            .incl
