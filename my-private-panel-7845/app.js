import { setupAddEventForm } from './components/AddEventForm.js';
import { setupManageEvents } from './components/ManageEvents.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Supabase
    const supabaseUrl = 'https://cbqbqncbjxfwrhhgxmjk.supabase.co';
    const supabaseKey = 'sb_publishable_XEBmcn5vcJGWBDO3GH9GRw_f55J9d9_';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Auth guard: check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Tab Switching Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const adminSections = document.querySelectorAll('.admin-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            navBtns.forEach(b => b.classList.remove('active'));
            adminSections.forEach(s => s.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // If manage events section is opened, fetch events
            if (targetId === 'manageEventsSection') {
                document.getElementById('refreshEventsBtn').click();
            }
        });
    });

    // Initialize modules
    setupAddEventForm(supabase);
    setupManageEvents(supabase);
});
