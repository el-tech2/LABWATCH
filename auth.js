// =========================================
// LABWATCH - AUTHENTICATION
// =========================================


// Pastikan Supabase sudah tersedia
const client = window.supabaseClient;


// =========================================
// ELEMENT
// =========================================

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");

const loginButtonText = document.getElementById("loginButtonText");

const loginLoading = document.getElementById("loginLoading");

const messageBox = document.getElementById("message");

const togglePassword =
    document.getElementById("togglePassword");

const forgotPassword =
    document.getElementById("forgotPassword");


// =========================================
// CEK SUPABASE CONFIG
// =========================================

if (
    !client ||
    !client.auth
) {
    console.error(
        "Supabase belum terhubung. Periksa supabase.js"
    );
}


// =========================================
// CHECK SESSION
// =========================================

async function checkSession() {

    try {

        const {
            data: {
                session
            }
        } = await client.auth.getSession();


        if (session) {

            console.log(
                "User sudah login:",
                session.user.email
            );

            // Jika dashboard.html sudah dibuat,
            // aktifkan redirect berikut:

            // window.location.href = "dashboard.html";
        }

    } catch (error) {

        console.error(
            "Gagal mengecek session:",
            error
        );

    }
}


// Jalankan pengecekan session
checkSession();


// =========================================
// LOGIN
// =========================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        // Validasi
        if (!email || !password) {

            showMessage(
                "Email dan password wajib diisi.",
                "error"
            );

            return;
        }


        // Loading
        setLoading(true);

        hideMessage();


        try {

            const {
                data,
                error
            } = await client.auth.signInWithPassword({
                email: email,
                password: password
            });


            if (error) {

                console.error(
                    "Login error:",
                    error
                );

                showMessage(
                    getAuthErrorMessage(error),
                    "error"
                );

                setLoading(false);

                return;
            }


            // Login berhasil
            console.log(
                "Login berhasil:",
                data.user
            );


            showMessage(
                "Login berhasil. Mengarahkan ke dashboard...",
                "success"
            );


            // Redirect setelah berhasil login
            setTimeout(function () {

                window.location.href =
                    "dashboard.html";

            }, 1000);


        } catch (error) {

            console.error(
                "Unexpected error:",
                error
            );

            showMessage(
                "Terjadi kesalahan pada sistem. Silakan coba lagi.",
                "error"
            );

            setLoading(false);
        }

    }
);


// =========================================
// SHOW / HIDE PASSWORD
// =========================================

togglePassword.addEventListener(
    "click",
    function () {

        if (
            passwordInput.type === "password"
        ) {

            passwordInput.type = "text";

            togglePassword.textContent = "🙈";

        } else {

            passwordInput.type = "password";

            togglePassword.textContent = "👁";

        }

    }
);


// =========================================
// FORGOT PASSWORD
// =========================================

forgotPassword.addEventListener(
    "click",
    async function (event) {

        event.preventDefault();


        const email =
            emailInput.value.trim();


        if (!email) {

            showMessage(
                "Masukkan email terlebih dahulu untuk reset password.",
                "info"
            );

            emailInput.focus();

            return;
        }


        try {

            const {
                error
            } = await client.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        window.location.origin +
                        "/reset-password.html"
                }
            );


            if (error) {

                console.error(
                    "Reset password error:",
                    error
                );

                showMessage(
                    getAuthErrorMessage(error),
                    "error"
                );

                return;
            }


            showMessage(
                "Link reset password telah dikirim ke email kamu.",
                "success"
            );


        } catch (error) {

            console.error(error);

            showMessage(
                "Gagal mengirim email reset password.",
                "error"
            );

        }

    }
);


// =========================================
// LOGOUT FUNCTION
// =========================================

async function logout() {

    try {

        const {
            error
        } = await client.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
                error
            );

            return false;
        }


        window.location.href = "index.html";

        return true;


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        return false;
    }
}


// Supaya logout() bisa digunakan
// oleh file JS lainnya
window.logout = logout;


// =========================================
// LOADING STATE
// =========================================

function setLoading(isLoading) {

    if (isLoading) {

        loginButton.disabled = true;

        loginButtonText.classList.add(
            "hidden"
        );

        loginLoading.classList.remove(
            "hidden"
        );

    } else {

        loginButton.disabled = false;

        loginButtonText.classList.remove(
            "hidden"
        );

        loginLoading.classList.add(
            "hidden"
        );

    }

}


// =========================================
// MESSAGE
// =========================================

function showMessage(
    message,
    type = "info"
) {

    messageBox.textContent = message;

    messageBox.className =
        "message " + type;

}


function hideMessage() {

    messageBox.textContent = "";

    messageBox.className =
        "message hidden";

}


// =========================================
// AUTH ERROR HANDLER
// =========================================

function getAuthErrorMessage(error) {

    const message =
        error?.message?.toLowerCase() || "";


    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        return "Email atau password salah.";

    }


    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        return "Email belum dikonfirmasi. Silakan cek inbox email kamu.";

    }


    if (
        message.includes(
            "too many requests"
        )
    ) {

        return "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";

    }


    if (
        message.includes(
            "network"
        )
    ) {

        return "Tidak dapat terhubung ke server. Periksa koneksi internet.";

    }


    return (
        error?.message ||
        "Terjadi kesalahan saat proses autentikasi."
    );

}