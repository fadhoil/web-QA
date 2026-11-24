// window.top = aplikasi QA, baik untuk halaman tab maupun iframe bersarang di dalamnya
try { window.top.__qa.patch(window); } catch (e) {}
