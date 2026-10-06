// =========================================
// PROFILE PAGE
// =========================================

let currentUser = null;
let currentProfile = null;


// =========================================
// LOAD PROFILE
// =========================================

async function loadProfile() {

    try {

        // Get current session
        const {
            data: {
                session
            }
        } = await supabaseClient.auth.getSession();


        if (!session) {

            window.location.href = "index.html";

            return;

        }


        currentUser = session.user;


        // Get profile from database
        const {
            data: profile,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();


        if (error) {

            console.error("Profile error:", error);

            throw error;

        }


        currentProfile = profile;


        renderProfile();


    } catch (error) {

        console.error("Gagal memuat profile:", error);

    }

}



// =========================================
// RENDER PROFILE
// =========================================

function renderProfile() {

    if (!currentUser) {
        return;
    }


    // Username
    const username =
        currentProfile?.username ||
        currentProfile?.name ||
        currentUser.email?.split("@")[0] ||
        "User";


    // Role
    const role =
        currentProfile?.role ||
        "user";


    // Email
    const email =
        currentUser.email ||
        "-";


    // Initial
    const initial =
        username
            .charAt(0)
            .toUpperCase();


    // =====================================
    // TOPBAR
    // =====================================

    const userAvatar =
        document.getElementById("userAvatar");

    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");


    if (userAvatar) {

        userAvatar.textContent = initial;

    }


    if (userName) {

        userName.textContent = username;

    }


    if (userRole) {

        userRole.textContent =
            formatRole(role);

    }



    // =====================================
    // PROFILE HEADER
    // =====================================

    const profileAvatar =
        document.getElementById("profileAvatar");

    const profileName =
        document.getElementById("profileName");

    const profileRole =
        document.getElementById("profileRole");


    if (profileAvatar) {

        profileAvatar.textContent = initial;

    }


    if (profileName) {

        profileName.textContent = username;

    }


    if (profileRole) {

        profileRole.textContent =
            formatRole(role);

    }



    // =====================================
    // PROFILE INFORMATION
    // =====================================

    const profileUsername =
        document.getElementById("profileUsername");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileRoleInfo =
        document.getElementById("profileRoleInfo");


    if (profileUsername) {

        profileUsername.textContent =
            username;

    }


    if (profileEmail) {

        profileEmail.textContent =
            email;

    }


    if (profileRoleInfo) {

        profileRoleInfo.textContent =
            formatRole(role);

    }



    // =====================================
    // ACCOUNT ID
    // =====================================

    const userId =
        document.getElementById("userId");


    if (userId) {

        userId.textContent =
            currentUser.id;

    }

}



// =========================================
// FORMAT ROLE
// =========================================

function formatRole(role) {

    const roleMap = {

        admin: "Administrator",

        technician: "Technician",

        user: "User"

    };


    return roleMap[role] || role;

}



// =========================================
// LOGOUT
// =========================================

async function logout() {

    try {

        const {
            error
        } = await supabaseClient.auth.signOut();


        if (error) {

            throw error;

        }


        window.location.href =
            "index.html";


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

}



// =========================================
// BUTTON EVENTS
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadProfile();


        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logout
            );

        }


        const editProfileButton =
            document.getElementById(
                "editProfileButton"
            );


        if (editProfileButton) {

            editProfileButton.addEventListener(
                "click",
                () => {

                    alert(
                        "Fitur Edit Profile akan dibuat pada tahap berikutnya."
                    );

                }
            );

        }


        const changePasswordButton =
            document.getElementById(
                "changePasswordButton"
            );


        if (changePasswordButton) {

            changePasswordButton.addEventListener(
                "click",
                () => {

                    alert(
                        "Fitur ubah password akan dibuat pada tahap berikutnya."
                    );

                }
            );

        }

    }
);